#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
search.py — 统一多源搜索 CLI（纯标准库 / 零依赖 / 可扩展）

一个命令调多个搜索后端，输出统一格式：默认可读文本，加 --json 给程序解析。
适合塞进脚本、定时任务或 Agent 工具链，不用为每个平台记一套参数。

==================================================================
已接入 provider
==================================================================
    web        <query> [--usage]          Tavily 实时检索 / 查额度
    extract    <url>...                   Tavily 从已知 URL 提取正文（1–20 个）
    crawl      <url>                      Tavily 从根 URL 爬站（Map + Extract）
    map        <url>                      Tavily 站点 URL 结构（只列 URL）
    bocha      <query> [--mode ai]        博查 Web / AI 搜索
    github     <type> <query>             GitHub Search API
               type ∈ repos | code | issues | users | commits
    zhihu      <sub> ...                  知乎开放平台
               sub ∈ search | global | hot | zhida
    scriptcat  <query> [--page N]         脚本猫用户脚本搜索（免凭据）
    crxsoso    <store> <query>            Chrome/Edge/Firefox 扩展、微软商店离线包（免凭据）
    uapi       search "q" | call <path>   UAPI 聚合平台
    tinyfish   search|fetch ...           TinyFish 免费 Web Search / Fetch

==================================================================
预先填写（只填用得到的）
==================================================================
    TAVILY_API_KEY        tavily.com            web / extract / crawl / map
    BOCHA_API_KEY         open.bochaai.com      bocha（注意 web 与 ai 搜索额度独立）
    GH_TOKEN              只读 PAT 即可          github（也认 GITHUB_TOKEN）
    ZHIHU_ACCESS_SECRET   知乎开放平台           zhihu
    UAPI_KEY              uapis.cn              uapi
    TINYFISH_API_KEY      tinyfish.ai           tinyfish
    SCRIPTCAT_PROXY       可选                   scriptcat 直连不通时的自建反代前缀

免凭据即可用：scriptcat、crxsoso。

==================================================================
通用
==================================================================
    python3 search.py providers      # 列出已接入的 provider
    python3 search.py cheatsheet     # 意图 → 命令 速查
    python3 search.py --help
    任意子命令加 --json              # 输出原始 JSON

扩展新后端：写一个 run_xxx(argv) 函数，注册进文件底部的 PROVIDERS 字典。
"""
import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse

UA = "multi-search/1.1"
TIMEOUT = 90
TAVILY_BASE = "https://api.tavily.com"
BOCHA_BASE = "https://api.bochaai.com"


def _req(url, method="GET", headers=None, body=None, timeout=TIMEOUT):
    """最小 HTTP 客户端，返回 (status, parsed_json)。status=0 表示网络层异常。"""
    data = json.dumps(body).encode("utf-8") if body is not None else None
    h = {"User-Agent": UA, "Accept": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            j = json.loads(raw)
        except Exception:
            j = {"_raw": raw[:800]}
        return e.code, j
    except Exception as e:  # noqa: BLE001
        return 0, {"_error": f"{type(e).__name__}: {e}"}


def die(msg):
    print(f"错误: {msg}", file=sys.stderr)
    sys.exit(1)


def _tavily_key():
    key = os.environ.get("TAVILY_API_KEY")
    if not key:
        die("缺少环境变量 TAVILY_API_KEY")
    return key


def _tavily_post(path, body, key):
    return _req(TAVILY_BASE + path, method="POST",
                headers={"Authorization": f"Bearer {key}",
                         "Content-Type": "application/json"}, body=body)


def _show_err(st, j, n=700):
    print(f"[HTTP {st}] {json.dumps(j, ensure_ascii=False)[:n]}")


def _clip(s, n):
    return (s or "").strip().replace("\r", "")[:n]


# ---------------------------------------------------------------- provider: web (Tavily search)
def _tavily_usage(key, as_json):
    st, j = _req(TAVILY_BASE + "/usage", headers={"Authorization": f"Bearer {key}"})
    if as_json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j, 600)
        return 1
    k = j.get("key", {}) or {}
    acc = j.get("account", {}) or {}
    lim, used = acc.get("plan_limit"), acc.get("plan_usage")
    rest = (lim - used) if isinstance(lim, int) and isinstance(used, int) else "?"
    print(f"套餐: {acc.get('current_plan')}   额度: {used}/{lim} credits/月   剩余: {rest}")
    print(f"  account 分项: search={acc.get('search_usage')} extract={acc.get('extract_usage')} "
          f"crawl={acc.get('crawl_usage')} map={acc.get('map_usage')} research={acc.get('research_usage')}")
    print(f"  本 Key 已用: {k.get('usage')} (search={k.get('search_usage')})")
    return 0


def run_web(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py web", description="Tavily 实时检索 / 额度查询")
    p.add_argument("query", nargs="?", help="检索词（--usage 时不需要）")
    p.add_argument("--usage", action="store_true", help="查询当前 Key 的额度用量")
    p.add_argument("--max", type=int, default=5, help="结果条数 0-20（默认 5）")
    p.add_argument("--depth", choices=["basic", "advanced", "fast", "ultra-fast"], default="basic",
                   help="basic(1cr)/advanced(2cr)/fast(1cr)/ultra-fast(1cr)")
    p.add_argument("--answer", action="store_true", help="生成综合答案")
    p.add_argument("--topic", choices=["general", "news", "finance"], default=None)
    p.add_argument("--news", action="store_true", help="等价于 --topic news")
    p.add_argument("--days", type=int, default=7, help="新闻模式回溯天数（默认 7）")
    p.add_argument("--time-range", choices=["day", "week", "month", "year"], default=None)
    p.add_argument("--include-domain", action="append", default=[], metavar="D", help="限定域名，可多次")
    p.add_argument("--exclude-domain", action="append", default=[], metavar="D", help="排除域名，可多次")
    p.add_argument("--include-raw", action="store_true", help="结果附带原始正文")
    p.add_argument("--include-images", action="store_true", help="结果附带图片列表")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)

    key = _tavily_key()
    if a.usage:
        return _tavily_usage(key, a.json)
    if not a.query:
        die("缺少检索词 query（或加 --usage 查额度）")

    body = {"query": a.query, "max_results": max(0, min(a.max, 20)),
            "search_depth": a.depth, "include_answer": a.answer}
    topic = "news" if a.news else a.topic
    if topic:
        body["topic"] = topic
    if a.news:
        body["days"] = a.days
    if a.time_range:
        body["time_range"] = a.time_range
    if a.include_domain:
        body["include_domains"] = a.include_domain
    if a.exclude_domain:
        body["exclude_domains"] = a.exclude_domain
    if a.include_raw:
        body["include_raw_content"] = True
    if a.include_images:
        body["include_images"] = True

    st, j = _tavily_post("/search", body, key)
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1

    ans = j.get("answer")
    if ans:
        print("【答案】" + str(ans) + "\n")
    results = j.get("results", [])
    print(f"【结果】{len(results)} 条  (响应 {j.get('response_time', '?')}s)")
    for i, r in enumerate(results, 1):
        print(f"\n{i}. {r.get('title', '')}")
        print(f"   {r.get('url', '')}")
        snip = (r.get("content") or "").strip().replace("\n", " ")
        if snip:
            print(f"   {snip[:300]}")
    return 0


# ---------------------------------------------------------------- provider: extract
def run_extract(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py extract", description="Tavily 从 URL 提取正文")
    p.add_argument("urls", nargs="+", help="一个或多个 URL（最多 20）")
    p.add_argument("--query", default=None, help="按此意图对内容块重排序")
    p.add_argument("--depth", choices=["basic", "advanced"], default="basic",
                   help="basic(每5个URL 1cr)/advanced(每5个URL 2cr)")
    p.add_argument("--format", choices=["markdown", "text"], default="markdown")
    p.add_argument("--chunks-per-source", type=int, default=None, help="1-5（需配合 --query）")
    p.add_argument("--include-images", action="store_true")
    p.add_argument("--chars", type=int, default=500, help="每条正文打印字符数（默认 500，0=全文）")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)
    if len(a.urls) > 20:
        die("单次最多 20 个 URL")

    body = {"urls": a.urls, "extract_depth": a.depth, "format": a.format}
    if a.query:
        body["query"] = a.query
    if a.chunks_per_source:
        body["chunks_per_source"] = a.chunks_per_source
    if a.include_images:
        body["include_images"] = True

    st, j = _tavily_post("/extract", body, _tavily_key())
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1

    results = j.get("results", [])
    failed = j.get("failed_results", [])
    print(f"【成功】{len(results)} 条  【失败】{len(failed)} 条  (响应 {j.get('response_time', '?')}s)")
    for i, r in enumerate(results, 1):
        print(f"\n{i}. {r.get('url')}")
        body_txt = r.get("raw_content") or ""
        print("   " + _clip(body_txt, a.chars).replace("\n", "\n   ") if a.chars else "   " + body_txt)
    for f in failed:
        print(f"\n[失败] {f.get('url')}  → {f.get('error')}")
    return 0


# ---------------------------------------------------------------- provider: crawl
def run_crawl(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py crawl", description="Tavily 爬站（Map+Extract）")
    p.add_argument("url", help="根 URL")
    p.add_argument("--instructions", default=None, help="自然语言指令（指定后映射成本翻倍）")
    p.add_argument("--max-depth", type=int, default=1, help="1-5（默认 1）")
    p.add_argument("--max-breadth", type=int, default=20, help="1-500（默认 20）")
    p.add_argument("--limit", type=int, default=50, help="总页数上限（默认 50）")
    p.add_argument("--select-path", action="append", default=[], metavar="RE", help="仅爬匹配路径（正则，可多次）")
    p.add_argument("--exclude-path", action="append", default=[], metavar="RE", help="排除匹配路径（正则）")
    p.add_argument("--depth", choices=["basic", "advanced"], default="basic", help="提取深度")
    p.add_argument("--format", choices=["markdown", "text"], default="markdown")
    p.add_argument("--chars", type=int, default=300, help="每页打印字符数（默认 300，0=全文）")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)

    body = {"url": a.url, "max_depth": a.max_depth, "max_breadth": a.max_breadth,
            "limit": a.limit, "extract_depth": a.depth, "format": a.format}
    if a.instructions:
        body["instructions"] = a.instructions
    if a.select_path:
        body["select_paths"] = a.select_path
    if a.exclude_path:
        body["exclude_paths"] = a.exclude_path

    st, j = _tavily_post("/crawl", body, _tavily_key())
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1

    results = j.get("results", [])
    print(f"【爬取】{j.get('base_url')} → {len(results)} 页  (响应 {j.get('response_time', '?')}s)")
    for i, r in enumerate(results, 1):
        print(f"\n{i}. {r.get('url')}")
        if a.chars:
            c = _clip(r.get("raw_content") or "", a.chars).replace("\n", " ")
            if c:
                print("   " + c)
    return 0


# ---------------------------------------------------------------- provider: map
def run_map(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py map", description="Tavily 站点 URL 发现")
    p.add_argument("url", help="根 URL")
    p.add_argument("--instructions", default=None, help="自然语言指令（指定后成本翻倍）")
    p.add_argument("--max-depth", type=int, default=1, help="1-5（默认 1）")
    p.add_argument("--max-breadth", type=int, default=20, help="1-500（默认 20）")
    p.add_argument("--limit", type=int, default=50, help="总链接上限（默认 50）")
    p.add_argument("--select-path", action="append", default=[], metavar="RE")
    p.add_argument("--exclude-path", action="append", default=[], metavar="RE")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)

    body = {"url": a.url, "max_depth": a.max_depth, "max_breadth": a.max_breadth, "limit": a.limit}
    if a.instructions:
        body["instructions"] = a.instructions
    if a.select_path:
        body["select_paths"] = a.select_path
    if a.exclude_path:
        body["exclude_paths"] = a.exclude_path

    st, j = _tavily_post("/map", body, _tavily_key())
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1

    results = j.get("results", [])
    print(f"【发现】{j.get('base_url')} → {len(results)} 个 URL  (响应 {j.get('response_time', '?')}s)")
    for i, u in enumerate(results, 1):
        print(f"{i:3d}. {u}")
    return 0


# ---------------------------------------------------------------- provider: bocha（博查）
def run_bocha(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py bocha", description="博查 Web / AI 搜索（env: BOCHA_API_KEY）")
    p.add_argument("query", help="搜索词")
    p.add_argument("--mode", choices=["web", "ai"], default="web",
                   help="web=web-search（关键词）；ai=ai-search（语义+模态卡+AI总结）")
    p.add_argument("--count", type=int, default=10, help="结果数 1-50（默认 10）")
    p.add_argument("--freshness", default="noLimit",
                   help="noLimit/oneDay/oneWeek/oneMonth/oneYear，或 YYYY-MM-DD（范围用 A..B）")
    p.add_argument("--no-summary", action="store_true", help="web 模式：不返回网页长摘要")
    p.add_argument("--no-answer", action="store_true", help="ai 模式：不做大模型总结")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)

    key = os.environ.get("BOCHA_API_KEY")
    if not key:
        die("缺少环境变量 BOCHA_API_KEY")

    path = "/v1/web-search" if a.mode == "web" else "/v1/ai-search"
    body = {"query": a.query, "count": max(1, min(a.count, 50)), "freshness": a.freshness}
    if a.mode == "web":
        body["summary"] = not a.no_summary
    else:
        body["answer"] = not a.no_answer

    st, j = _req(BOCHA_BASE + path, method="POST",
                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                          "Accept": "*/*"}, body=body)
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j, 600)
        return 1

    data = j.get("data") if isinstance(j.get("data"), dict) else j
    wp = data.get("webPages") or {}
    vals = wp.get("value") or []
    msgs = data.get("messages")
    if msgs:
        for m in msgs:
            if m.get("content"):
                print("【AI】" + _clip(str(m.get("content")), 1500) + "\n")
    print(f"【结果】{len(vals)} 条  (总匹配 ~{wp.get('totalEstimatedMatches', '?')})")
    for i, r in enumerate(vals, 1):
        print(f"\n{i}. {r.get('name', '')}")
        print(f"   {r.get('url', '')}")
        meta = " | ".join([str(x) for x in [r.get("siteName"), r.get("datePublished")] if x])
        if meta:
            print(f"   {meta}")
        snip = r.get("summary") or r.get("snippet") or ""
        if snip:
            print("   " + _clip(str(snip).replace("\n", " "), 300))
    cards = data.get("modalCards") or []
    if cards:
        names = ", ".join(str(c.get("type") or c.get("cardType") or "?") for c in cards)
        print(f"\n【模态卡】{len(cards)} 个：{names}")
    return 0


# ---------------------------------------------------------------- provider: github
_GH_SUBTYPES = {
    "repos": "repositories",
    "code": "code",
    "issues": "issues",
    "users": "users",
    "commits": "commits",
}


def run_github(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py github", description="GitHub Search API")
    p.add_argument("type", choices=list(_GH_SUBTYPES))
    p.add_argument("query", help="查询串，支持 GitHub 限定符，如 repo:  language:  stars:>100")
    p.add_argument("--limit", type=int, default=10, help="每页条数 ≤100（默认 10）")
    p.add_argument("--sort", default=None, help="repos: stars|forks|updated；commits: author-date|committer-date")
    p.add_argument("--order", choices=["desc", "asc"], default="desc")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)
    a.limit = max(1, min(a.limit, 100))

    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if a.type == "code" and not token:
        die("GitHub 代码搜索需要认证，请设置 GH_TOKEN")

    params = {"q": a.query, "per_page": a.limit}
    if a.sort:
        params["sort"] = a.sort
        params["order"] = a.order
    url = "https://api.github.com/search/" + _GH_SUBTYPES[a.type] + "?" + urllib.parse.urlencode(params)
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    st, j = _req(url, headers=headers)
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1

    items = j.get("items", [])
    print(f"共 {j.get('total_count', '?')} 条，显示前 {len(items)}：")
    for i, it in enumerate(items, 1):
        if a.type == "repos":
            print(f"\n{i}. {it.get('full_name')}  ★{it.get('stargazers_count')}  {it.get('language') or ''}")
            print(f"   {it.get('html_url')}")
            if it.get("description"):
                print(f"   {it['description'][:200]}")
        elif a.type == "code":
            print(f"\n{i}. {it.get('name')}   @{it.get('repository', {}).get('full_name')}")
            print(f"   {it.get('html_url')}")
        elif a.type == "issues":
            kind = "PR" if "pull_request" in it else "Issue"
            print(f"\n{i}. [{kind}] {it.get('title')}  ({it.get('state')})")
            print(f"   {it.get('html_url')}")
        elif a.type == "users":
            print(f"\n{i}. {it.get('login')}  ({it.get('type')})")
            print(f"   {it.get('html_url')}")
        elif a.type == "commits":
            msg = ((it.get("commit") or {}).get("message") or "").splitlines()
            first = msg[0] if msg else ""
            print(f"\n{i}. {(it.get('sha') or '')[:10]}  {first}")
            print(f"   {it.get('html_url')}")
    return 0


# ---------------------------------------------------------------- provider: zhihu（知乎开放平台）
ZHIHU_BASE = "https://developer.zhihu.com"
_ZHIHU_MODELS = {"fast": "zhida-fast-1p5", "thinking": "zhida-thinking-1p5", "agent": "zhida-agent"}


def _zhihu_req(path, params=None, body=None, method="GET"):
    import time
    key = os.environ.get("ZHIHU_ACCESS_SECRET")
    if not key:
        die("缺少环境变量 ZHIHU_ACCESS_SECRET")
    url = ZHIHU_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = {
        "Authorization": "Bearer " + key,
        "X-Request-Timestamp": str(int(time.time())),
        "Content-Type": "application/json",
    }
    return _req(url, method=method, headers=headers, body=body)


def _zhihu_guard(st, j, as_json):
    if as_json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1
    if isinstance(j, dict) and j.get("Code") not in (None, 0):
        print("【业务错误】Code=%s Message=%s（参考：10001参数 20001鉴权 30001限流/额度 90001内部）"
              % (j.get("Code"), j.get("Message")))
        return 1
    return None


def run_zhihu(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py zhihu", description="知乎开放平台（env: ZHIHU_ACCESS_SECRET）")
    p.add_argument("sub", choices=["search", "global", "hot", "zhida"],
                   help="search=站内搜索 global=全网搜索 hot=热榜 zhida=直答")
    p.add_argument("query", nargs="?", help="检索词 / 直答问题（hot 不需要）")
    p.add_argument("--count", type=int, default=None, help="结果数（search≤10，global≤20）")
    p.add_argument("--limit", type=int, default=10, help="热榜条数 ≤30（默认 10）")
    p.add_argument("--db", choices=["all", "realtime", "static"], default=None, help="仅 global：索引库")
    p.add_argument("--filter", default=None, dest="flt", help="仅 global：高级语法筛选")
    p.add_argument("--model", choices=["fast", "thinking", "agent"], default="fast", help="仅 zhida：档位")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)

    if a.sub == "hot":
        st, j = _zhihu_req("/api/v1/content/hot_list", params={"Limit": max(1, min(a.limit, 30))})
        r = _zhihu_guard(st, j, a.json)
        if r is not None:
            return r
        items = (j.get("Data") or {}).get("Items") or []
        print("【知乎热榜】%d 条" % len(items))
        for i, it in enumerate(items, 1):
            print("\n%d. %s" % (i, it.get("Title", "")))
            print("   " + str(it.get("Url", "")))
            s = (it.get("Summary") or "").strip().replace("\n", " ")
            if s:
                print("   " + _clip(s, 200))
        return 0

    if a.sub == "zhida":
        if not a.query:
            die("zhida 需要问题内容")
        body = {"model": _ZHIHU_MODELS[a.model],
                "messages": [{"role": "user", "content": a.query}], "stream": False}
        st, j = _zhihu_req("/v1/chat/completions", body=body, method="POST")
        if a.json:
            print(json.dumps(j, ensure_ascii=False, indent=2))
            return 0 if st == 200 else 1
        if st != 200:
            _show_err(st, j)
            return 1
        msg = (j.get("choices") or [{}])[0].get("message", {}) or {}
        if msg.get("reasoning_content"):
            print("【思考】" + _clip(str(msg["reasoning_content"]), 500) + "\n")
        print("【回答】" + str(msg.get("content") or ""))
        return 0

    if not a.query:
        die(a.sub + " 需要检索词 query")
    path = "/api/v1/content/zhihu_search" if a.sub == "search" else "/api/v1/content/global_search"
    cap = 10 if a.sub == "search" else 20
    params = {"Query": a.query, "Count": max(1, min(a.count or 10, cap))}
    if a.sub == "global":
        if a.db:
            params["SearchDB"] = a.db
        if a.flt:
            params["Filter"] = a.flt
    st, j = _zhihu_req(path, params=params)
    r = _zhihu_guard(st, j, a.json)
    if r is not None:
        return r
    data = j.get("Data") or {}
    items = data.get("Items") or []
    print("【%s】%d 条" % ("知乎站内搜索" if a.sub == "search" else "全网搜索", len(items)))
    if data.get("EmptyReason"):
        print("  空结果原因：" + str(data.get("EmptyReason")))
    for i, it in enumerate(items, 1):
        print("\n%d. %s  [%s]" % (i, it.get("Title", ""), it.get("ContentType") or "web"))
        print("   " + str(it.get("Url", "")))
        parts = [it.get("AuthorName"), it.get("AuthorBadgeText")]
        if it.get("VoteUpCount") is not None:
            parts.append("赞%s" % it.get("VoteUpCount"))
        if it.get("CommentCount") is not None:
            parts.append("评%s" % it.get("CommentCount"))
        meta = " | ".join([str(x) for x in parts if x])
        if meta:
            print("   " + meta)
        s = (it.get("ContentText") or "").strip().replace("\n", " ")
        if s:
            print("   " + _clip(s, 300))
    return 0


# ---------------------------------------------------------------- provider: scriptcat（脚本猫）
SCRIPTCAT_BASE = "https://scriptcat.org"
# 可选：scriptcat.org 在国内经常连不通，可自建一个反代（如 Cloudflare Worker），
# 用 SCRIPTCAT_PROXY 指过去（形如 https://your-proxy.example.com/scriptcat.org）。
SCRIPTCAT_PROXY = os.environ.get("SCRIPTCAT_PROXY", "").rstrip("/")


def _sc_get(path, params=None):
    """先直连 scriptcat.org；配了 SCRIPTCAT_PROXY 且直连失败时再走反代。"""
    q = ("?" + urllib.parse.urlencode(params)) if params else ""
    last = (0, {})
    bases = [SCRIPTCAT_BASE] + ([SCRIPTCAT_PROXY] if SCRIPTCAT_PROXY else [])
    for base in bases:
        st, j = _req(base + path + q, headers={"Accept": "application/json"})
        if st == 200:
            return st, j
        last = (st, j)
    return last


def run_scriptcat(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py scriptcat", description="ScriptCat（脚本猫）脚本搜索，无需凭据")
    p.add_argument("query", help="搜索关键词")
    p.add_argument("--page", type=int, default=1, help="页码（默认 1）")
    p.add_argument("--sort", default=None, help="排序，如 createtime（默认平台默认）")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)

    params = {"keyword": a.query, "page": max(1, a.page)}
    if a.sort:
        params["sort"] = a.sort
    st, j = _sc_get("/api/v2/scripts", params)
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1
    if isinstance(j, dict) and j.get("code") not in (None, 0):
        print("[业务错误] code=%s msg=%s" % (j.get("code"), j.get("msg")))
        return 1
    data = j.get("data") or {}
    items = data.get("list") or []
    print("【ScriptCat 脚本搜索】命中 %s 个，第 %d 页显示 %d 条" % (data.get("total"), a.page, len(items)))
    for i, it in enumerate(items, 1):
        s = it.get("script") or {}
        mj = s.get("meta_json") or {}
        name = it.get("name") or mj.get("name") or ""
        ver = it.get("version") or s.get("version") or ""
        dl = it.get("total_install")
        today = it.get("today_install")
        desc = it.get("summary") or it.get("description") or mj.get("description") or ""
        if isinstance(desc, list):
            desc = desc[0] if desc else ""
        if isinstance(desc, dict):
            desc = desc.get("zh") or desc.get("en") or ""
        cat = it.get("category") or ""
        tags = it.get("tags")
        if isinstance(tags, list):
            tags = ", ".join((x.get("name") if isinstance(x, dict) else str(x)) for x in tags)
        else:
            tags = tags or ""
        sid = s.get("id") or it.get("id")
        print("\n%d. %s  v%s" % (i, name, ver))
        print("   https://scriptcat.org/zh-CN/script-show-page/%s" % sid)
        meta = " | ".join([x for x in [
            ("作者 " + it.get("username")) if it.get("username") else "",
            ("安装 %s" % dl) if dl is not None else "",
            ("今日 +%s" % today) if today else "",
            ("分类 " + cat) if cat else "",
        ] if x])
        if meta:
            print("   " + meta)
        if desc:
            print("   " + _clip(str(desc).replace("\n", " "), 200))
        if tags:
            print("   标签: " + tags)
    return 0


# ---------------------------------------------------------------- provider: crxsoso（扩展 / 微软商店离线包）
# 逆向依据：知识库《crxsoso接口逆向笔记》——前端把参数 AES-128-CTR 加密成 hex 包成 {"data":"<hex>"} POST。
CRX_KEY = b"lOrd6SqeZpDdGBoY"
CRX_IV = b"RxE86Of9vRkNvfZL"
CRX_API = "https://api.crxsoso.com/search/result?type=%s"
CRX_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
CRX_STORES = {
    "chrome": {"detail": "https://www.crxsoso.com/webstore/detail/%s", "list": "extensionList",
               "id": "crxId", "name": "name", "extra": ("developerName", "activeInstallCount", "averageRating"),
               "payload": {"keyword": None, "page": 1, "size": None, "token": ""}},
    "edge": {"detail": "https://www.crxsoso.com/addon/detail/%s", "list": "extensionList",
             "id": "crxId", "name": "name", "extra": ("developerName", "activeInstallCount", "averageRating"),
             "payload": {"keyword": None, "size": None, "page": 1}},
    "firefox": {"detail": "https://www.crxsoso.com/firefox/detail/%s", "list": "extensionList",
                "id": "crxId", "name": "name", "extra": ("developerName", "activeInstallCount", "averageRating"),
                "payload": {"keyword": None, "size": None, "page": 1}},
    "microsoft": {"detail": "https://www.crxsoso.com/store/detail/%s", "list": "productsList",
                  "id": "productId", "name": "title", "extra": ("displayPrice", "averageRating", "ratingCount"),
                  "payload": {"keyword": None, "size": None, "page": 1, "cursor": ""}},
}


def _crx_sbox():
    p = q = 1
    s = [0] * 256
    while True:
        p = p ^ ((p << 1) & 0xFF) ^ (0x1B if p & 0x80 else 0)
        q ^= (q << 1) & 0xFF
        q ^= (q << 2) & 0xFF
        q ^= (q << 4) & 0xFF
        q &= 0xFF
        if q & 0x80:
            q ^= 0x09
        rot = lambda n: ((q << n) | (q >> (8 - n))) & 0xFF
        s[p] = q ^ rot(1) ^ rot(2) ^ rot(3) ^ rot(4) ^ 0x63
        if p == 1:
            return s


_CRX_SBOX = _crx_sbox()
_CRX_SBOX[0] = 0x63
_CRX_RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36]


def _crx_expand(key):
    w = [list(key[i:i + 4]) for i in range(0, 16, 4)]
    for i in range(4, 44):
        t = w[i - 1][:]
        if i % 4 == 0:
            t = [_CRX_SBOX[t[1]] ^ _CRX_RCON[i // 4 - 1], _CRX_SBOX[t[2]], _CRX_SBOX[t[3]], _CRX_SBOX[t[0]]]
        w.append([a ^ b for a, b in zip(w[i - 4], t)])
    return [b for word in w for b in word]


def _crx_mix(a):
    t = a[0] ^ a[1] ^ a[2] ^ a[3]
    x = lambda b: ((b << 1) ^ 0x1B) & 0xFF if b & 0x80 else b << 1
    return [a[0] ^ t ^ x(a[0] ^ a[1]), a[1] ^ t ^ x(a[1] ^ a[2]),
            a[2] ^ t ^ x(a[2] ^ a[3]), a[3] ^ t ^ x(a[3] ^ a[0])]


def _crx_block(blk, rk):
    s = [blk[i] ^ rk[i] for i in range(16)]
    for rnd in range(1, 11):
        s = [_CRX_SBOX[b] for b in s]
        s = [s[4 * ((c + r) % 4) + r] for c in range(4) for r in range(4)]
        if rnd < 10:
            s = [b for c in range(4) for b in _crx_mix(s[4 * c:4 * c + 4])]
        s = [s[i] ^ rk[16 * rnd + i] for i in range(16)]
    return s


def _crx_ctr(data, rk):
    out = bytearray()
    for i in range((len(data) + 15) // 16):
        ctr = (int.from_bytes(CRX_IV, "big") + i).to_bytes(16, "big")
        out += bytes(a ^ b for a, b in zip(data[i * 16:(i + 1) * 16], _crx_block(list(ctr), rk)))
    return bytes(out)


def crxsoso_enc(obj):
    """JSON -> PKCS7 -> AES-128-CTR -> hex（等价前端 w()）"""
    raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode()
    pad = 16 - len(raw) % 16
    return _crx_ctr(raw + bytes([pad]) * pad, _crx_expand(CRX_KEY)).hex()


def crxsoso_dec(cipher_hex):
    raw = _crx_ctr(bytes.fromhex(cipher_hex), _crx_expand(CRX_KEY))
    pad = raw[-1]
    if 1 <= pad <= 16 and raw[-pad:] == bytes([pad]) * pad:
        raw = raw[:-pad]
    return json.loads(raw.decode("utf-8"))


def _crx_flat(v):
    if isinstance(v, list):
        v = v[0] if v else ""
    if isinstance(v, dict):
        v = v.get("zh") or v.get("en") or ""
    return v or ""


def _crx_build(store, keyword, size, page, token, cursor):
    """按各 store 的字段与顺序构造 payload（None 为 keyword/size 占位符）。"""
    p = dict(CRX_STORES[store]["payload"])
    for k, v in list(p.items()):
        if v is None:
            p[k] = keyword if k == "keyword" else size
    if "page" in p:
        p["page"] = page
    if "token" in p:
        p["token"] = token
    if "cursor" in p:
        p["cursor"] = cursor
    return p


def _crx_post(store, payload):
    return _req(CRX_API % store, method="POST", body={"data": crxsoso_enc(payload)},
                headers={"Content-Type": "application/json; charset=utf-8",
                         "Origin": "https://www.crxsoso.com", "Referer": "https://www.crxsoso.com/",
                         "User-Agent": CRX_UA})


def run_crxsoso(argv):
    import argparse, time
    p = argparse.ArgumentParser(prog="search.py crxsoso",
                                description="crxsoso（Chrome/Edge/Firefox 扩展 + 微软商店）离线包搜索")
    p.add_argument("store", choices=list(CRX_STORES), help="chrome|edge|firefox|microsoft")
    p.add_argument("query", help="搜索关键词")
    p.add_argument("--size", type=int, default=48, help="每页条数（默认 48）")
    p.add_argument("--pages", type=int, default=1, help="连续抓取页数，>1 自动续 token/cursor（默认 1）")
    p.add_argument("--page", type=int, default=1, help="起始页码（默认 1）")
    p.add_argument("--token", default="", help="chrome：起始翻页 token")
    p.add_argument("--cursor", default="", help="microsoft：起始翻页 cursor")
    p.add_argument("--best", action="store_true", help="只输出最佳匹配（全名相等 > 包含 > 首条）")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)

    meta = CRX_STORES[a.store]
    pages = max(1, a.pages)
    page, token, cursor = a.page, a.token, a.cursor
    all_items, raw = [], None
    for i in range(pages):
        payload = _crx_build(a.store, a.query, a.size, page, token, cursor)
        st, j = _crx_post(a.store, payload)
        raw = j
        if st != 200:
            if i == 0:
                _show_err(st, j)
                return 1
            break
        if isinstance(j, dict) and j.get("code") not in (None, 0, 200):
            if i == 0:
                print("[业务错误] code=%s msg=%s（401 请输入关键字 = 密文未解出）" % (j.get("code"), j.get("message")))
                return 1
            break
        data = j.get("data") or {}
        all_items += data.get(meta["list"]) or []
        if i < pages - 1:
            if not data.get("hasMorePages"):
                break
            nxt = data.get("nextPageNo")
            page = nxt if isinstance(nxt, int) else page + 1
            if "token" in meta["payload"]:
                token = data.get("nextToken") or ""
            if "cursor" in meta["payload"]:
                cursor = data.get("cursor") or ""
            time.sleep(0.8)          # 节流（文档建议）

    if a.json:
        print(json.dumps(raw, ensure_ascii=False, indent=2))
        return 0

    items = all_items
    if a.best:
        k = a.query.strip().lower()
        key = lambda e: _crx_flat(e.get(meta["name"])).lower()
        items = ([e for e in all_items if key(e).strip() == k]
                 or [e for e in all_items if k in key(e)]
                 or all_items[:1])

    print("【crxsoso · %s】「%s」共 %d 条%s" % (a.store, a.query, len(items),
          ("（%d 页）" % pages if pages > 1 else "")))
    for i, it in enumerate(items, 1):
        name = _crx_flat(it.get(meta["name"]))
        eid = it.get(meta["id"])
        info = " | ".join([str(it.get(f)) for f in meta["extra"] if it.get(f) not in (None, "")])
        desc = _crx_flat(it.get("description") or it.get("shortDescription") or it.get("summary"))
        print("\n%d. %s" % (i, name))
        if eid:
            print("   " + str(meta["detail"] % eid))
        if info:
            print("   " + info)
        if desc:
            print("   " + _clip(str(desc).replace("\n", " "), 200))
    return 0


# ---------------------------------------------------------------- provider: uapi（UAPI 聚合平台 · uapis.cn）
# 110+ 免费 API（搜索/翻译/图片/网络/游戏/B站/文本/AES…）。Key 走 `Authorization: Bearer`（env: UAPI_KEY，可不填）。
UAPI_BASE = "https://uapis.cn"
UAPI_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def _uapi_headers(json_body=False):
    h = {"User-Agent": UAPI_UA, "Accept": "application/json"}
    if json_body:
        h["Content-Type"] = "application/json"
    k = os.environ.get("UAPI_KEY")
    if k:
        h["Authorization"] = "Bearer " + k
    return h


def _uapi_show_error(j):
    if isinstance(j, dict) and j.get("code") and j.get("code") not in ("SUCCESS",):
        print("[业务错误] code=%s message=%s" % (j.get("code"), j.get("message")))
        return True
    return False


def run_uapi(argv):
    import argparse
    p = argparse.ArgumentParser(prog="search.py uapi",
                                description="UAPI 聚合平台（uapis.cn，110+ 免费接口；env: UAPI_KEY 可选）")
    sub = p.add_subparsers(dest="sub", required=True)

    s = sub.add_parser("search", help="智能网页搜索 /api/v1/search/aggregate")
    s.add_argument("query", help="搜索关键词（中英文）")
    s.add_argument("--site", default=None, help="限定网站（无需 site: 前缀）")
    s.add_argument("--filetype", default=None, help="限定文件类型 pdf/doc/xls…（无需 filetype: 前缀）")
    s.add_argument("--sort", default=None, help="排序方式（如 relevance）")
    s.add_argument("--time-range", default=None, help="时间范围过滤（如 day/week/month/year）")
    s.add_argument("--full", action="store_true", help="抓取页面完整正文（较慢）")
    s.add_argument("--limit", type=int, default=10, help="结果数（默认 10）")
    s.add_argument("--page", type=int, default=1, help="页码（默认 1）")
    s.add_argument("--json", action="store_true")

    c = sub.add_parser("call", help="通用调用任意 uapi 端点（自动带 Bearer）")
    c.add_argument("path", help="端点路径，如 /api/v1/misc/weather")
    c.add_argument("--method", choices=["GET", "POST"], default="GET")
    c.add_argument("--param", action="append", default=[], metavar="K=V", help="query 参数，可多次")
    c.add_argument("--body", default=None, help="POST 的 JSON 字符串")
    c.add_argument("--json", action="store_true")

    a = p.parse_args(argv)

    if a.sub == "search":
        body = {"query": a.query, "limit": a.limit, "page": a.page}
        if a.site:
            body["site"] = a.site
        if a.filetype:
            body["filetype"] = a.filetype
        if a.sort:
            body["sort"] = a.sort
        if a.time_range:
            body["time_range"] = a.time_range
        if a.full:
            body["fetch_full"] = True
        st, j = _req(UAPI_BASE + "/api/v1/search/aggregate", method="POST", body=body,
                     headers=_uapi_headers(True))
        if a.json:
            print(json.dumps(j, ensure_ascii=False, indent=2))
            return 0 if st == 200 else 1
        if st != 200:
            _show_err(st, j)
            return 1
        if _uapi_show_error(j):
            return 1
        res = j.get("results") or []
        print("【UAPI 智能搜索】「%s」共 %s 条，返回 %d 条" % (a.query, j.get("total_results"), len(res)))
        for i, r in enumerate(res, 1):
            print("\n%d. %s" % (i, r.get("title", "")))
            print("   " + str(r.get("url", "")))
            meta = " | ".join([str(x) for x in [r.get("domain"), r.get("publish_time"),
                                                ("score %.2f" % r["score"]) if isinstance(r.get("score"), (int, float)) else ""] if x])
            if meta:
                print("   " + meta)
            sn = (r.get("snippet") or "").strip().replace("\n", " ")
            if sn:
                print("   " + _clip(sn, 300))
        return 0

    # call
    url = UAPI_BASE + a.path
    if a.param:
        kv = []
        for item in a.param:
            if "=" in item:
                k, v = item.split("=", 1)
                kv.append("%s=%s" % (k, urllib.parse.quote(v)))
        if kv:
            url += ("&" if "?" in url else "?") + "&".join(kv)
    body = None
    if a.body:
        try:
            body = json.loads(a.body)
        except Exception as e:
            die("--body 不是合法 JSON：%s" % e)
    st, j = _req(url, method=a.method, body=body, headers=_uapi_headers(a.method == "POST"))
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1
    print(json.dumps(j, ensure_ascii=False, indent=2))
    return 0


# ---------------------------------------------------------------- provider: tinyfish（免费 Web Search / Fetch）
TINYFISH_SEARCH = "https://api.search.tinyfish.ai"
TINYFISH_FETCH = "https://api.fetch.tinyfish.ai"


def _tinyfish_key():
    key = os.environ.get("TINYFISH_API_KEY")
    if not key:
        die("缺少环境变量 TINYFISH_API_KEY")
    return key


def _tinyfish_req(url, method="GET", headers=None, body=None, tries=3):
    """TinyFish 边缘偶发 0/502/503/504，做几次快速重试。"""
    import time
    st, j = 0, {}
    for i in range(tries):
        st, j = _req(url, method=method, headers=headers, body=body)
        if st == 200 or (st != 0 and st < 500):
            return st, j
        if i < tries - 1:
            time.sleep(1.5 * (i + 1))
    return st, j


def run_tinyfish(argv):
    """TinyFish 免费 REST API：search（网页搜索）+ fetch（真实浏览器渲染抓正文）。

    仅封装免费能力（Search / Fetch）；Agent / Browser 为付费，不接入。
    认证：请求头 X-API-Key。Search 免费 ≤12000 次/日，Fetch 免费 ≤1000 URL/日。
    """
    import argparse
    p = argparse.ArgumentParser(prog="search.py tinyfish",
                                description="TinyFish 免费 Web Search / Fetch（env: TINYFISH_API_KEY）")
    sub = p.add_subparsers(dest="sub", required=True)

    s = sub.add_parser("search", help="网页搜索（GET api.search.tinyfish.ai，结构化 JSON）")
    s.add_argument("query", help="搜索词")
    s.add_argument("--page", type=int, default=None, help="页码（默认第 1 页，响应含 page/total_results）")
    s.add_argument("--location", default=None, help="地域代码（如 cn、us）")
    s.add_argument("--language", default=None, help="语言代码（如 zh、en）")
    s.add_argument("--domain-type", choices=["web", "news", "research_paper"], default=None,
                   help="结果类型：news 带 publisher/date，research_paper 带作者/引用")
    s.add_argument("--recency-minutes", type=int, default=None, help="只取最近 N 分钟（1-5256000）")
    s.add_argument("--after-date", default=None, help="起始日期 YYYY-MM-DD")
    s.add_argument("--before-date", default=None, help="结束日期 YYYY-MM-DD")
    s.add_argument("--purpose", default=None, help="搜索意图（提升质量，≤2000 字）")
    s.add_argument("--max", type=int, default=None, help="最多打印条数（默认全部）")
    s.add_argument("--json", action="store_true")

    f = sub.add_parser("fetch", help="抓取 URL 正文（POST api.fetch.tinyfish.ai，含 JS 渲染/反爬）")
    f.add_argument("urls", nargs="+", help="一个或多个 URL（单次最多 10 个）")
    f.add_argument("--format", choices=["markdown", "html", "json"], default="markdown",
                   help="返回格式（默认 markdown；json 返回结构化文档树）")
    f.add_argument("--select", action="append", default=[], metavar="CSS",
                   help="仅取匹配 CSS 选择器的内容（可多次，最多 20）")
    f.add_argument("--exclude", action="append", default=[], metavar="CSS",
                   help="剔除匹配选择器的内容（可多次，最多 20）")
    f.add_argument("--purpose", default=None, help="抓取意图（≤2000 字）")
    f.add_argument("--chars", type=int, default=800, help="每条正文打印字符数（默认 800，0=全文）")
    f.add_argument("--json", action="store_true")

    a = p.parse_args(argv)
    key = _tinyfish_key()

    if a.sub == "search":
        params = {"query": a.query}
        if a.page is not None:
            params["page"] = a.page
        if a.location:
            params["location"] = a.location
        if a.language:
            params["language"] = a.language
        if a.domain_type:
            params["domain_type"] = a.domain_type
        if a.recency_minutes is not None:
            params["recency_minutes"] = a.recency_minutes
        if a.after_date:
            params["after_date"] = a.after_date
        if a.before_date:
            params["before_date"] = a.before_date
        if a.purpose:
            params["purpose"] = a.purpose

        st, j = _tinyfish_req(TINYFISH_SEARCH + "?" + urllib.parse.urlencode(params),
                              headers={"X-API-Key": key})
        if a.json:
            print(json.dumps(j, ensure_ascii=False, indent=2))
            return 0 if st == 200 else 1
        if st != 200:
            _show_err(st, j)
            return 1
        results = j.get("results", []) or []
        if a.max is not None:
            results = results[:max(0, a.max)]
        print("【TinyFish 搜索】%d 条  (total=%s page=%s)"
              % (len(results), j.get("total_results", "?"), j.get("page", "?")))
        for r in results:
            print("\n%s. %s" % (r.get("position", "?"), r.get("title", "")))
            print("   " + str(r.get("url", "")))
            meta = [x for x in (r.get("publisher"), r.get("date")) if x]
            if meta:
                print("   [" + " | ".join(str(x) for x in meta) + "]")
            snip = (r.get("snippet") or "").strip().replace("\n", " ")
            if snip:
                print("   " + _clip(snip, 300))
        return 0

    if len(a.urls) > 10:
        die("单次最多 10 个 URL")
    body = {"urls": a.urls, "format": a.format}
    if a.select:
        body["include_selectors"] = a.select
    if a.exclude:
        body["exclude_selectors"] = a.exclude
    if a.purpose:
        body["purpose"] = a.purpose

    st, j = _tinyfish_req(TINYFISH_FETCH, method="POST", body=body,
                          headers={"X-API-Key": key, "Content-Type": "application/json"})
    if a.json:
        print(json.dumps(j, ensure_ascii=False, indent=2))
        return 0 if st == 200 else 1
    if st != 200:
        _show_err(st, j)
        return 1
    results = j.get("results", []) or []
    errors = j.get("errors", []) or []
    print("【TinyFish 抓取】成功 %d 条  失败 %d 条" % (len(results), len(errors)))
    for i, r in enumerate(results, 1):
        print("\n%d. %s" % (i, r.get("title") or r.get("url")))
        print("   " + str(r.get("final_url") or r.get("url") or ""))
        text = r.get("text")
        if isinstance(text, (dict, list)):
            text = json.dumps(text, ensure_ascii=False)
        text = str(text or "")
        if a.chars:
            text = _clip(text, a.chars)
        print("   " + text.replace("\n", "\n   "))
    for e in errors:
        print("\n[失败] %s → %s" % (e.get("url"), e.get("error")))
    return 0


# ---------------------------------------------------------------- registry（扩展点）
PROVIDERS = {
    "web": ("Tavily 实时检索 / 额度查询", run_web),
    "extract": ("Tavily 从 URL 提取正文", run_extract),
    "crawl": ("Tavily 爬站（Map+Extract）", run_crawl),
    "map": ("Tavily 站点 URL 发现", run_map),
    "bocha": ("博查 Web/AI 搜索", run_bocha),
    "github": ("GitHub Search API", run_github),
    "zhihu": ("知乎开放平台（站内/全网/热榜/直答）", run_zhihu),
    "scriptcat": ("ScriptCat（脚本猫）脚本搜索", run_scriptcat),
    "crxsoso": ("crxsoso（扩展/微软商店离线包搜索）", run_crxsoso),
    "uapi": ("UAPI 聚合平台（uapis.cn 搜索/工具，env: UAPI_KEY）", run_uapi),
    "tinyfish": ("TinyFish 免费 Web Search / Fetch（env: TINYFISH_API_KEY）", run_tinyfish),
}


CHEATSHEET = """multi-search 速查 —— 11 provider / 25 子功能
用法: python3 search.py <provider> <args>   （任意子命令加 --json 出原始 JSON）

  意图 / 触发词                    命令模板                                                  来源
  ------------------------------  --------------------------------------------------------  --------
  联网搜 / 搜一下 / 查最新          web "查询词" [--answer] [--news --days 3] [--max 10]       Tavily
  读这个网页 / 提取正文             extract <url>... [--query 意图] [--chars 0]               Tavily
  爬一下这个站                     crawl <根URL> [--limit 20] [--select-path RE]             Tavily
  这个站有哪些页面 / 列URL          map <根URL> [--limit 100]                                 Tavily
  中文资料 / 国内搜索 / 语义+模态卡  bocha "查询词" [--mode ai] [--count 10]                   博查
  GitHub 项目/代码/issue/用户/提交   github <repos|code|issues|users|commits> "查询串"          GitHub
  知乎内容 / 热榜 / AI 直答         zhihu <search|global|hot|zhida> ...                       知乎
  油猴脚本 / 用户脚本 / 脚本猫       scriptcat "关键词" [--page N] [--sort createtime]         脚本猫
  微软商店离线包 / 扩展 crx 离线包   crxsoso <chrome|edge|firefox|microsoft> "关键词" [--pages N] [--best]  crxsoso
  UAPI 工具 / 网页搜索              uapi search "关键词" [--site S] | uapi call <path> [--param k=v]  uapis.cn
  零成本搜索 / 抓动态页(免费)        tinyfish search "查询词" [--domain-type news] | tinyfish fetch <url>...  TinyFish

  通用: providers 列后端 | <provider> -h 单后端帮助 | 见 SKILL.md 顶部速查表
"""


def _print_cheatsheet():
    print(CHEATSHEET)


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    if args[0] == "providers":
        for k, (desc, _) in PROVIDERS.items():
            print(f"  {k:9s} {desc}")
        return 0
    if args[0] in ("cheatsheet", "cs", "cheat"):
        _print_cheatsheet()
        return 0
    name = args[0]
    if name not in PROVIDERS:
        die(f"未知 provider: {name}（可用: {', '.join(PROVIDERS)}）")
    return PROVIDERS[name][1](args[1:])


if __name__ == "__main__":
    sys.exit(main())
