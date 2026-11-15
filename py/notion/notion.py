#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
notion.py — Notion 页面 / 块 读写 CLI（Notion REST API，纯标准库）

把 Notion 当 Markdown 仓库用：读整页树导出成 .md、把本地 .md 写成 Notion 块、
逐块改删、新建子页、按官方 markdown 端点一次性取整页。

==================================================================
依赖
==================================================================
Python 3.8+，零第三方依赖（标准库 urllib / json / argparse）。

==================================================================
预先填写
==================================================================
需要一个 Notion Integration Token（Internal Integration），
并在目标页面里把该 Integration 添加为连接（页面右上角 ··· → Connections），
否则 API 一律返回 404 / 无权限。

任选一种方式提供 Token：
1. 环境变量  NOTION_TOKEN=secret_xxx
2. 环境变量  NOTION_CONFIG=/path/to/config.json
3. 配置文件  ~/.config/notion-cli/config.json
   内容：{"token": "secret_xxx", "api_version": "2026-03-11"}
4. 兼容旧位置：脚本上一级目录的 config.json

可选：NOTION_VERSION 覆盖默认的 Notion-Version（默认 2026-03-11）。
Token 创建：https://www.notion.so/my-integrations

==================================================================
子命令
==================================================================
  search <query> [--limit N] [--filter page|database]
  get <id>                                  页面 / 块的元信息
  read <page_or_block_id> [--json] [--depth N] [--no-recursive]
                                            读正文，默认输出 Markdown
  children <block_id> [--json]              子块原始 JSON
  append <block_id> (--text T | --md FILE | --stdin)
                                            追加内容（Markdown 自动转块）
  update-block <block_id> (--text T | --md FILE)
                                            改单个块的文本
  delete-block <block_id>                   删单个块
  create-page --parent <page_id> --title T [--md FILE | --text T]
                                            新建子页面
  update-page <page_id> [--title T] [--md FILE | --text T] [--in-trash]
                                            改标题 / 改正文 / 归档
  archive <page_id>                         归档（= update-page --in-trash）
  md2blocks <file>                          本地预览：Markdown 会生成什么块
  export-tree <page_id> [--title T] [--out DIR] [--zip FILE] [--count] [--overwrite]
                                            递归导出整页树为 Markdown，可打包 zip
  markdown <page_id> [--transcript] [--out FILE] [--json]
                                            官方增强 Markdown 端点，1 次请求读整页

==================================================================
示例
==================================================================
  notion.py search "会议"
  notion.py read 00000000-0000-0000-0000-000000000000
  notion.py append 00000000-0000-0000-0000-000000000000 --md ./draft.md
  notion.py update-block <block_id> --text "改后的内容"
  notion.py export-tree 00000000-0000-0000-0000-000000000000 --out ./export --zip ./export.zip

说明：
- 429 限流自动重试（最多 4 次，按 Retry-After 退避）。
- append 单次上限 100 块，超过会自动分批。
- Markdown 支持标题、列表、待办、引用、分隔线、代码块、行内加粗 / 斜体 / 行内代码 / 链接。
"""
import os
import re
import sys
import json
import time
import argparse
import urllib.request
import urllib.error

BASE = "https://api.notion.com/v1"
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONFIG = os.path.join(os.path.expanduser("~"), ".config", "notion-cli", "config.json")
LEGACY_CONFIG = os.path.join(os.path.dirname(HERE), "config.json")

LANG_MAP = {
    "py": "python", "python": "python", "js": "javascript", "javascript": "javascript",
    "ts": "typescript", "typescript": "typescript", "sh": "shell", "bash": "shell",
    "shell": "shell", "zsh": "shell", "json": "json", "yaml": "yaml", "yml": "yaml",
    "html": "html", "css": "css", "java": "java", "go": "go", "rust": "rust",
    "sql": "sql", "md": "markdown", "markdown": "markdown", "c": "c", "cpp": "c++",
    "c++": "c++", "xml": "xml", "php": "php", "ruby": "ruby", "kotlin": "kotlin",
    "swift": "swift", "dockerfile": "docker", "docker": "docker", "diff": "diff",
}


def die(msg, code=1):
    print("ERROR: " + str(msg), file=sys.stderr)
    sys.exit(code)


def load_cfg():
    cfg = {}
    p = os.environ.get("NOTION_CONFIG") or DEFAULT_CONFIG
    if not os.path.exists(p) and os.path.exists(LEGACY_CONFIG):
        p = LEGACY_CONFIG
    if os.path.exists(p):
        try:
            with open(p, encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception as e:
            die("config.json 解析失败: %s" % e)
    token = os.environ.get("NOTION_TOKEN") or cfg.get("token")
    if not token:
        die("未找到 token：请设置环境变量 NOTION_TOKEN，或写入 ~/.config/notion-cli/config.json")
    version = os.environ.get("NOTION_VERSION") or cfg.get("api_version") or "2026-03-11"
    return token, version


def api(method, path, body=None, retries=4):
    """调用 Notion API；带 429 限流重试。出错返回 {'__error__':True,...}"""
    token, version = load_cfg()
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    last = None
    for _ in range(retries):
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": "Bearer " + token,
            "Notion-Version": version,
            "Content-Type": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                err = json.loads(raw)
            except Exception:
                err = {"code": "http_%s" % e.code, "message": raw[:300]}
            if e.code == 429:
                time.sleep(min(float(e.headers.get("Retry-After", 1)), 5))
                last = err
                continue
            return {"__error__": True, "status": e.code, **err}
        except Exception as e:
            last = {"code": "network", "message": str(e)}
            time.sleep(1)
            continue
    return {"__error__": True, "status": 429, **(last or {"code": "rate_limited", "message": "反复限流"})}


def check(res):
    if isinstance(res, dict) and res.get("__error__"):
        die("Notion API 错误 [%s] %s: %s" % (res.get("status"), res.get("code"), res.get("message")))
    return res


# ---------------- Markdown <-> Blocks ----------------

def seg(content, bold=False, italic=False, code=False, link=None):
    o = {"type": "text", "text": {"content": content}}
    if link:
        o["text"]["link"] = {"url": link}
    ann = {}
    if bold:
        ann["bold"] = True
    if italic:
        ann["italic"] = True
    if code:
        ann["code"] = True
    if ann:
        o["annotations"] = ann
    return o


INLINE_RE = re.compile(r"(\*\*.+?\*\*|__.+?__|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*)")


def parse_inline(text):
    out = []
    pos = 0
    for m in INLINE_RE.finditer(text):
        if m.start() > pos:
            out.append(seg(text[pos:m.start()]))
        tok = m.group(0)
        if tok.startswith("**") or tok.startswith("__"):
            out.append(seg(tok[2:-2], bold=True))
        elif tok.startswith("`"):
            out.append(seg(tok[1:-1], code=True))
        elif tok.startswith("["):
            mm = re.match(r"\[([^\]]+)\]\(([^)]+)\)", tok)
            out.append(seg(mm.group(1), link=mm.group(2)))
        elif tok.startswith("*"):
            out.append(seg(tok[1:-1], italic=True))
        pos = m.end()
    if pos < len(text):
        out.append(seg(text[pos:]))
    return out or [seg("")]


def md_to_blocks(md):
    blocks = []
    lines = md.replace("\r\n", "\n").split("\n")
    i = 0
    while i < len(lines):
        raw = lines[i]
        s = raw.rstrip()
        t = s.strip()
        if t.startswith("```"):
            lang = t[3:].strip().lower().split()[0] if t[3:].strip() else ""
            i += 1
            buf = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            blocks.append({"object": "block", "type": "code", "code": {
                "rich_text": parse_inline("\n".join(buf)),
                "language": LANG_MAP.get(lang, "plain text")}})
            continue
        if not t:
            i += 1
            continue
        m = re.match(r"^(#{1,3})\s+(.*)$", t)
        if m:
            lvl = len(m.group(1))
            key = "heading_%d" % lvl
            blocks.append({"object": "block", "type": key, key: {"rich_text": parse_inline(m.group(2))}})
            i += 1
            continue
        if re.match(r"^(-{3,}|\*{3,}|_{3,})$", t):
            blocks.append({"object": "block", "type": "divider", "divider": {}})
            i += 1
            continue
        m = re.match(r"^[-*+]\s+\[([ xX])\]\s+(.*)$", t)
        if m:
            blocks.append({"object": "block", "type": "to_do", "to_do": {
                "rich_text": parse_inline(m.group(2)), "checked": m.group(1).lower() == "x"}})
            i += 1
            continue
        m = re.match(r"^[-*+]\s+(.*)$", t)
        if m:
            blocks.append({"object": "block", "type": "bulleted_list_item",
                           "bulleted_list_item": {"rich_text": parse_inline(m.group(1))}})
            i += 1
            continue
        m = re.match(r"^\d+[.)]\s+(.*)$", t)
        if m:
            blocks.append({"object": "block", "type": "numbered_list_item",
                           "numbered_list_item": {"rich_text": parse_inline(m.group(1))}})
            i += 1
            continue
        m = re.match(r"^>\s?(.*)$", t)
        if m:
            blocks.append({"object": "block", "type": "quote", "quote": {"rich_text": parse_inline(m.group(1))}})
            i += 1
            continue
        blocks.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": parse_inline(t)}})
        i += 1
    return blocks


def rt_plain(rt):
    return "".join(x.get("plain_text", "") for x in (rt or []))


CONTAINERS = ("bulleted_list_item", "numbered_list_item", "to_do", "toggle", "callout", "quote")


def block_to_md(b, depth=0):
    t = b.get("type")
    data = b.get(t, {}) or {}
    txt = rt_plain(data.get("rich_text"))
    ind = "  " * depth
    if t == "heading_1":
        return ind + "# " + txt
    if t == "heading_2":
        return ind + "## " + txt
    if t == "heading_3":
        return ind + "### " + txt
    if t == "paragraph":
        return ind + txt
    if t == "bulleted_list_item":
        return ind + "- " + txt
    if t == "numbered_list_item":
        return ind + "1. " + txt
    if t == "to_do":
        return ind + ("- [x] " if data.get("checked") else "- [ ] ") + txt
    if t in ("quote", "callout"):
        return ind + "> " + txt
    if t == "toggle":
        return ind + "- " + txt
    if t == "divider":
        return ind + "---"
    if t == "code":
        lang = data.get("language", "")
        fence = "" if lang in ("", "plain text") else lang
        return ind + "```" + fence + "\n" + txt + "\n" + ind + "```"
    if t == "child_page":
        return ind + "📄 " + (b.get("child_page") or {}).get("title", "")
    return (ind + txt) if txt else ""


def get_children(block_id):
    out, cursor = [], None
    while True:
        path = "/blocks/%s/children?page_size=100" % block_id
        if cursor:
            path += "&start_cursor=" + cursor
        r = check(api("GET", path))
        out.extend(r.get("results", []))
        if r.get("has_more"):
            cursor = r.get("next_cursor")
            time.sleep(0.34)
        else:
            break
    return out


def render(block_id, depth=0, lines=None, recursive=True):
    lines = lines if lines is not None else []
    for b in get_children(block_id):
        md = block_to_md(b, depth)
        if md:
            lines.append(md)
        if recursive and b.get("has_children"):
            child_depth = depth + 1 if b.get("type") in CONTAINERS else depth
            render(b["id"], child_depth, lines, recursive)
    return lines


def append_blocks(block_id, blocks):
    total = 0
    for i in range(0, len(blocks), 100):
        batch = blocks[i:i + 100]
        check(api("PATCH", "/blocks/%s/children" % block_id, {"children": batch}))
        total += len(batch)
        if i + 100 < len(blocks):
            time.sleep(0.34)
    return total


def read_text(args):
    if args.text is not None:
        return args.text
    if args.md:
        with open(args.md, encoding="utf-8") as f:
            return f.read()
    if args.stdin:
        return sys.stdin.read()
    die("需要 --text / --md / --stdin 之一")


# ---------------- 命令 ----------------

def item_title(x):
    o = x.get("object")
    if o == "page":
        for v in (x.get("properties") or {}).values():
            if v.get("type") == "title":
                return rt_plain(v.get("title"))
    if o in ("database", "data_source"):
        t = x.get("title") or []
        if isinstance(t, list):
            return rt_plain(t)
    return ""


def cmd_stats(a):
    results, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = check(api("POST", "/search", body))
        results.extend(r.get("results", []))
        if r.get("has_more"):
            cursor = r.get("next_cursor")
            time.sleep(0.34)
        else:
            break
    pages = [x for x in results if x.get("object") == "page"]
    dbs = [x for x in results if x.get("object") in ("database", "data_source")]
    named = [x for x in dbs if item_title(x)]
    if a.json:
        print(json.dumps({
            "total": len(results), "pages": len(pages),
            "databases": len(dbs), "databases_named": len(named),
            "database_list": [{"id": x["id"], "title": item_title(x)} for x in dbs],
        }, ensure_ascii=False, indent=2))
        return results
    print("可见条目总数: %d" % len(results))
    print("  页面 page       : %d" % len(pages))
    print("  数据库 database : %d（其中有名称 %d）" % (len(dbs), len(named)))
    if a.list:
        print("\n数据库清单:")
        for x in dbs:
            print("  - %-40s %s" % ((item_title(x) or "(无标题)")[:40], x["id"]))
    else:
        print("\n  加 --list 可列出全部数据库名称")
    return results


def cmd_search(a):
    body = {"page_size": a.limit}
    if a.query:
        body["query"] = a.query
    if a.filter:
        body["filter"] = {"property": "object", "value": a.filter}
    r = check(api("POST", "/search", body))
    rows = []
    for it in r.get("results", []):
        title = ""
        if it.get("object") == "page":
            for v in (it.get("properties") or {}).values():
                if v.get("type") == "title":
                    title = rt_plain(v.get("title"))
                    break
        elif it.get("object") == "database":
            title = rt_plain((it.get("title") or []))
        rows.append({"id": it.get("id"), "object": it.get("object"), "title": title,
                     "url": it.get("url"), "last_edited": it.get("last_edited_time")})
    if a.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print("命中 %d 项 (has_more=%s)" % (len(rows), r.get("has_more")))
        for x in rows:
            print("  [%s] %s  %s" % (x["object"], x["id"], x["title"]))
    return r


def cmd_get(a):
    r = api("GET", "/pages/" + a.id)
    if r.get("__error__"):
        r2 = api("GET", "/blocks/" + a.id)
        if r2.get("__error__"):
            die("既不是可访问的页面也不是块: %s / %s" % (r.get("code"), r2.get("code")))
        r = r2
    else:
        r = check(r)
    if a.json:
        print(json.dumps(r, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({k: r.get(k) for k in ("object", "id", "url", "created_time",
                                                "last_edited_time", "parent", "in_trash",
                                                "archived") if k in r}, ensure_ascii=False, indent=2))
    return r


def cmd_read(a):
    lines = render(a.id, 0, None, recursive=not a.no_recursive)
    if a.json:
        print(json.dumps(get_children(a.id), ensure_ascii=False, indent=2))
    else:
        print("\n".join(lines))
    return lines


def cmd_children(a):
    kids = get_children(a.id)
    print(json.dumps(kids, ensure_ascii=False, indent=2))
    return kids


def cmd_append(a):
    content = read_text(a)
    blocks = md_to_blocks(content)
    ids = []
    for i in range(0, len(blocks), 100):
        batch = blocks[i:i + 100]
        r = check(api("PATCH", "/blocks/%s/children" % a.id, {"children": batch}))
        ids.extend(x["id"] for x in r.get("results", []))
        if i + 100 < len(blocks):
            time.sleep(0.34)
    if getattr(a, "json", False):
        print(json.dumps({"appended": len(ids), "ids": ids}, ensure_ascii=False, indent=2))
    else:
        print("✓ 已追加 %d 个块到 %s" % (len(ids), a.id))
        for x in ids:
            print("   " + x)
    return ids


def cmd_update_block(a):
    content = read_text(a)
    if not content.strip():
        die("块内容不能为空（Notion 不支持空文本块，需用 delete-block 删除）")
    blk = check(api("GET", "/blocks/" + a.id))
    bt = blk.get("type")
    if bt in ("divider", "child_page", "child_database") or bt not in ("paragraph", "heading_1", "heading_2",
                                                                        "heading_3", "bulleted_list_item",
                                                                        "numbered_list_item", "to_do", "quote",
                                                                        "callout", "toggle", "code"):
        die("该块类型不支持改文本: %s" % bt)
    payload = {bt: {"rich_text": parse_inline(content.strip())}}
    if bt == "to_do":
        payload[bt]["checked"] = blk.get("to_do", {}).get("checked", False)
    if bt == "code":
        payload[bt]["language"] = blk.get("code", {}).get("language", "plain text")
    r = check(api("PATCH", "/blocks/" + a.id, payload))
    print("✓ 已更新块 %s（类型 %s）" % (a.id, bt))
    return r


def cmd_delete_block(a):
    r = check(api("DELETE", "/blocks/" + a.id))
    print("✓ 已删除块 %s (in_trash=%s)" % (a.id, r.get("in_trash")))
    return r


def cmd_create_page(a):
    body = {"parent": {"type": "page_id", "page_id": a.parent},
            "properties": {"title": {"title": [{"text": {"content": a.title}}]}}}
    if a.md or a.text:
        txt = read_text(a)
        blocks = md_to_blocks(txt)
        body["children"] = blocks[:100]
    r = check(api("POST", "/pages", body))
    if (a.md or a.text) and len(md_to_blocks(read_text(a))) > 100:
        append_blocks(r["id"], md_to_blocks(read_text(a))[100:])
    print("✓ 已创建页面: %s" % r.get("url"))
    print("  id: %s" % r.get("id"))
    return r


def cmd_update_page(a):
    body = {}
    if a.in_trash:
        body["in_trash"] = True
    if a.title:
        body["properties"] = {"title": {"title": [{"text": {"content": a.title}}]}}
    if body:
        r = check(api("PATCH", "/pages/" + a.id, body))
        print("✓ 已更新页面 %s" % a.id)
    else:
        r = None
        print("(无变更)")
    if a.md or a.text:
        txt = read_text(a)
        blocks = md_to_blocks(txt)
        old = get_children(a.id)
        for b in old:
            check(api("DELETE", "/blocks/" + b["id"]))
            time.sleep(0.34)
        append_blocks(a.id, blocks)
        print("✓ 正文已替换：删 %d 旧块，写入 %d 新块" % (len(old), len(blocks)))
    return r


def cmd_archive(a):
    r = check(api("PATCH", "/pages/" + a.id, {"in_trash": True}))
    print("✓ 页面已归档（移入回收站，可恢复）: %s" % a.id)
    return r


def cmd_md2blocks(a):
    with open(a.file, encoding="utf-8") as f:
        blocks = md_to_blocks(f.read())
    print(json.dumps(blocks, ensure_ascii=False, indent=2))
    print("// 共 %d 个块" % len(blocks), file=sys.stderr)
    return blocks


# ---------------- 页面树导出（export-tree） ----------------

_ET_CONTAINERS = ("bulleted_list_item", "numbered_list_item", "to_do", "toggle", "callout", "quote")


def _et_safe(name, fallback="untitled"):
    """清理为合法文件名，并截断过长标题。"""
    name = re.sub(r'[\\/:*?"<>|\r\n\t]', "_", (name or "").strip()) or fallback
    name = name.strip(" .")
    return name[:80] or fallback


def _rt_md(rt):
    """rich_text -> Markdown（保留加粗/斜体/删除线/行内代码/链接）。"""
    out = []
    for x in rt or []:
        t = x.get("plain_text", "")
        if not t:
            continue
        a = x.get("annotations") or {}
        if a.get("code"):
            t = "`" + t + "`"
        if a.get("bold"):
            t = "**" + t + "**"
        if a.get("italic"):
            t = "*" + t + "*"
        if a.get("strikethrough"):
            t = "~~" + t + "~~"
        if x.get("href"):
            t = "[" + t + "](" + x["href"] + ")"
        out.append(t)
    return "".join(out)


def _et_block_md(b, depth=0):
    """单块 -> Markdown 行（不含子块）；child_page 返回 None（单独递归处理）。"""
    t = b.get("type")
    d = b.get(t, {}) or {}
    ind = "  " * depth
    txt = _rt_md(d.get("rich_text"))
    if t == "heading_1":
        return "### " + txt          # 降一级，避免与文件标题 H1 冲突
    if t == "heading_2":
        return "#### " + txt
    if t == "heading_3":
        return "##### " + txt
    if t == "paragraph":
        return ind + txt
    if t == "bulleted_list_item":
        return ind + "- " + txt
    if t == "numbered_list_item":
        return ind + "1. " + txt
    if t == "to_do":
        return ind + ("- [x] " if d.get("checked") else "- [ ] ") + txt
    if t in ("quote", "callout"):
        return ind + "> " + txt
    if t == "toggle":
        return ind + "- " + txt
    if t == "divider":
        return ind + "---"
    if t == "code":
        lang = d.get("language", "")
        fence = "" if lang in ("", "plain text") else lang
        return ind + "```" + fence + "\n" + txt + "\n" + ind + "```"
    if t == "child_page":
        return None
    if t == "image":
        u = (d.get("external") or {}).get("url") or (d.get("file") or {}).get("url")
        cap = _rt_md(d.get("caption"))
        return ("![%s](%s)" % (cap or "image", u)) if u else ""
    if t in ("video", "file", "pdf", "audio"):
        u = (d.get("external") or {}).get("url") or (d.get("file") or {}).get("url")
        return ("[%s](%s)" % (_rt_md(d.get("caption")) or t, u)) if u else ""
    if t == "bookmark":
        u = d.get("url")
        return ("[%s](%s)" % (_rt_md(d.get("caption")) or u, u)) if u else ""
    if t == "link_preview":
        u = d.get("url")
        return ("[" + u + "](" + u + ")") if u else ""
    if t == "equation":
        return "$$ " + d.get("expression", "") + " $$"
    if t == "table_row":
        return "| " + " | ".join(_rt_md(c) for c in (d.get("cells") or [])) + " |"
    if t in ("table", "breadcrumb", "unsupported"):
        return ""
    return ind + txt if txt else ""


def _et_render(bid, depth, lines, stats):
    for b in get_children(bid):
        stats["blocks"] += 1
        if b.get("type") == "child_page":
            continue
        line = _et_block_md(b, depth)
        if line:
            lines.append(line)
        if b.get("has_children"):
            cd = depth + 1 if b.get("type") in _ET_CONTAINERS else depth
            _et_render(b["id"], cd, lines, stats)
    return lines


def _et_child_pages(bid):
    return [(b["id"], (b.get("child_page") or {}).get("title", ""))
            for b in get_children(bid) if b.get("type") == "child_page"]


def _et_page_title(pid):
    r = api("GET", "/pages/%s" % pid)
    if not r.get("__error__"):
        for v in (r.get("properties") or {}).values():
            if v.get("type") == "title":
                return rt_plain(v.get("title")) or "untitled"
    return "untitled"


def _et_export_page(pid, title, parent_dir, index, stats):
    os.makedirs(parent_dir, exist_ok=True)
    stats["pages"] += 1
    used = index["names"]
    name = _et_safe(title)
    key = (parent_dir, name)
    if key in used:
        used[key] += 1
        name = "%s (%d)" % (name, used[key])
    else:
        used[key] = 1
    body = _et_render(pid, 0, [], stats)
    subs = _et_child_pages(pid)
    lines = ["# " + (title or "untitled"), ""]
    if subs:
        lines += ["## 子页面", ""]
        lines += ["- [%s](%s/%s.md)" % (st, _et_safe(title), _et_safe(st)) for _id, st in subs]
        lines.append("")
    lines += body
    with open(os.path.join(parent_dir, name + ".md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip() + "\n")
    print("  %-46s %d 段 / %d 子页" % ((title or "")[:44], len(body), len(subs)))
    child_dir = os.path.join(parent_dir, _et_safe(title))
    for sid, st in subs:
        _et_export_page(sid, st, child_dir, index, stats)


def cmd_export_tree(a):
    stats = {"pages": 0, "blocks": 0}
    if a.count:
        n = {"v": 0}

        def walk(pid):
            n["v"] += 1
            for sid, _st in _et_child_pages(pid):
                walk(sid)
        walk(a.id)
        print("页面总数（含根）: %d" % n["v"])
        return
    title = a.title or _et_page_title(a.id)
    out = a.out or os.path.join(os.getcwd(), "notion_export")
    if os.path.isdir(out) and os.listdir(out):
        if not a.overwrite:
            die("输出目录非空：%s（加 --overwrite 覆盖）" % out)
        import shutil
        shutil.rmtree(out)
    os.makedirs(out, exist_ok=True)
    index = {"names": {}}
    body = _et_render(a.id, 0, [], stats)
    subs = _et_child_pages(a.id)
    lines = ["# " + title, ""]
    if subs:
        lines += ["## 子页面", ""]
        lines += ["- [%s](%s/%s.md)" % (st, _et_safe(title), _et_safe(st)) for _id, st in subs]
        lines.append("")
    lines += body
    with open(os.path.join(out, _et_safe(title) + ".md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip() + "\n")
    stats["pages"] += 1
    print("导出根页面：%s（%d 子页）" % (title, len(subs)))
    child_dir = os.path.join(out, _et_safe(title))
    for sid, st in subs:
        _et_export_page(sid, st, child_dir, index, stats)
    mds = sum(len([x for x in fs if x.endswith(".md")]) for _r, _d, fs in os.walk(out))
    print("完成：%d 个 .md（页面 %d / 块 %d）→ %s" % (mds, stats["pages"], stats["blocks"], out))
    if a.zip_path:
        import zipfile
        with zipfile.ZipFile(a.zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for r, _d, fs in os.walk(out):
                for f in sorted(fs):
                    p = os.path.join(r, f)
                    z.write(p, os.path.relpath(p, out))
        print("打包：%s（%d 字节）" % (a.zip_path, os.path.getsize(a.zip_path)))


# ---------------- 官方增强 Markdown 端点（markdown） ----------------

def cmd_markdown(a):
    """GET /v1/pages/{id}/markdown —— 官方 enhanced markdown，1 次请求读整页。"""
    path = "/pages/%s/markdown" % a.id
    if a.transcript:
        path += "?include_transcript=true"
    r = check(api("GET", path))
    md = r.get("markdown", "")
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(md)
        print("已写入：%s（%d 字符）" % (a.out, len(md)), file=sys.stderr)
    if a.json:
        print(json.dumps(r, ensure_ascii=False, indent=2))
    else:
        print(md)
    if r.get("truncated"):
        sys.stderr.write("WARN: 内容被截断（truncated=true），未加载块 %d 个；"
                         "可用 unknown_block_ids 逐个补取\n" % len(r.get("unknown_block_ids") or []))


def build_parser():
    ap = argparse.ArgumentParser(prog="notion.py", description="Notion 文章读写改删 CLI")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add_json(p):
        p.add_argument("--json", action="store_true", help="JSON 输出")

    p = sub.add_parser("search", help="搜索页面/数据库")
    p.add_argument("query", nargs="?", default="")
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--filter", choices=["page", "database"])
    add_json(p)
    p.set_defaults(func=cmd_search)

    p = sub.add_parser("stats", help="统计可见的页面/数据库数量")
    p.add_argument("--list", action="store_true", help="列出全部数据库名称")
    add_json(p)
    p.set_defaults(func=cmd_stats)

    p = sub.add_parser("get", help="页面/块 元信息")
    p.add_argument("id")
    add_json(p)
    p.set_defaults(func=cmd_get)

    p = sub.add_parser("read", help="读正文（Markdown）")
    p.add_argument("id")
    p.add_argument("--no-recursive", action="store_true")
    add_json(p)
    p.set_defaults(func=cmd_read)

    p = sub.add_parser("children", help="子块原始 JSON")
    p.add_argument("id")
    p.set_defaults(func=cmd_children)

    p = sub.add_parser("append", help="追加内容")
    p.add_argument("id")
    p.add_argument("--text")
    p.add_argument("--md")
    p.add_argument("--stdin", action="store_true")
    add_json(p)
    p.set_defaults(func=cmd_append)

    p = sub.add_parser("update-block", help="改单个块文本")
    p.add_argument("id")
    p.add_argument("--text")
    p.add_argument("--md")
    p.add_argument("--stdin", action="store_true")
    p.set_defaults(func=cmd_update_block)

    p = sub.add_parser("delete-block", help="删单个块")
    p.add_argument("id")
    p.set_defaults(func=cmd_delete_block)

    p = sub.add_parser("create-page", help="新建子页面")
    p.add_argument("--parent", required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--md")
    p.add_argument("--text")
    p.add_argument("--stdin", action="store_true")
    p.set_defaults(func=cmd_create_page)

    p = sub.add_parser("update-page", help="改标题/改正文/归档")
    p.add_argument("id")
    p.add_argument("--title")
    p.add_argument("--md")
    p.add_argument("--text")
    p.add_argument("--stdin", action="store_true")
    p.add_argument("--in-trash", action="store_true")
    p.set_defaults(func=cmd_update_page)

    p = sub.add_parser("archive", help="归档页面")
    p.add_argument("id")
    p.set_defaults(func=cmd_archive)

    p = sub.add_parser("md2blocks", help="预览 Markdown -> 块")
    p.add_argument("file")
    p.set_defaults(func=cmd_md2blocks)

    p = sub.add_parser("export-tree", help="递归导出页面树为 Markdown（可选打包 zip）")
    p.add_argument("id", help="根页面 id")
    p.add_argument("--title", help="根页面文件名（默认自动取页面标题）")
    p.add_argument("--out", help="输出目录（默认 ./notion_export）")
    p.add_argument("--zip", dest="zip_path", help="导出后打包为该 zip 路径")
    p.add_argument("--count", action="store_true", help="只统计页面数，不导出")
    p.add_argument("--overwrite", action="store_true", help="输出目录非空时覆盖")
    p.set_defaults(func=cmd_export_tree)

    p = sub.add_parser("markdown", help="官方增强 Markdown 端点，1 次请求读整页")
    p.add_argument("id", help="页面 id")
    p.add_argument("--transcript", action="store_true", help="包含会议记录转写（include_transcript=true）")
    p.add_argument("--out", help="同时把 markdown 写入该文件")
    add_json(p)
    p.set_defaults(func=cmd_markdown)
    return ap


def main():
    ap = build_parser()
    a = ap.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
