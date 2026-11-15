#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mirror.py —— 下载源镜像改写与线路探测（零第三方依赖，仅用 python3 标准库 + curl）

职责：
  1) classify(url)   识别 URL 属于哪类资源（github / npm / pypi / maven / apt / go / hf ...）
  2) candidates(url) 基于改写规则表生成候选线路（国内镜像 + 代理前缀 + 直连）
  3) probe(...)      并发实测每条候线的可用性、TTFB、速率、是否支持 Range
  4) best(...)       排序选出最优线路（可返回多源并行组）

为什么不是「查表直接改写」：镜像同步延迟、路径差异、限速策略随时变化，
唯一可靠的判据是当场探测。改写表只负责「提出候选」，探测负责「裁决」。

CLI:
  python3 mirror.py resolve <url> [--probe] [--timeout 12] [--json]
  python3 mirror.py probe <url>...        # 直接探测任意 URL
  python3 mirror.py search <关键词>        # 搜华为云镜像站（需自备 hw_mirrors.py，见 README）
  python3 mirror.py rules                 # 打印改写规则表

作者：小贝塔
"""
import argparse
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

# ---------------------------------------------------------------- 镜像根
HW = "https://repo.huaweicloud.com"
TX = "https://mirrors.cloud.tencent.com"
ALI = "https://mirrors.aliyun.com"
TUNA = "https://mirrors.tuna.tsinghua.edu.cn"

# GitHub 下载代理前缀池（用法统一为 <前缀>/<完整 GitHub URL>，可省略 https://）
# 公共代理按社区口碑列全，实际用哪条由当场探测决定，不迷信排序。
# 2026-11-01 实测（容器出口，release asset 16KB 片段）：boki 29KB/s、h233 23KB/s、at9 16KB/s、
# cors.isteed 10.7KB/s、gh-proxy.com 9KB/s、imciel 8KB/s、vvvv.ee 8KB/s、ghproxy.net 1.4KB/s(TTFB 11.9s)；
# noki/llkk/ghfast/zwy 在该出口不可达（llkk 的 DNS 被污染到 Facebook 段），geekertao/ddlc/idayer 返回 429 限流，
# homeboyc 返回 "blocked"。某个出口不可达 ≠ 用户侧不可达，故全部保留在候选池，由探测淘汰。
# 注：国内家宽/国内云主机上 ghfast.top、gh-proxy.com 往往比列表首条更快，别硬指定。`--no-proxy` 可全关。
GH_PROXIES = [
    ("p.xbta.cc", "https://p.xbta.cc/"),
    ("github.boki.moe", "https://github.boki.moe/"),
    ("gh.h233.eu.org", "https://gh.h233.eu.org/"),
    ("gh-proxy.at9.net", "https://gh-proxy.at9.net/"),
    ("cors.isteed.cc", "https://cors.isteed.cc/"),
    ("gh-proxy.com", "https://gh-proxy.com/"),
    ("ghproxy.imciel.com", "https://ghproxy.imciel.com/"),
    ("proxy.vvvv.ee", "https://proxy.vvvv.ee/"),
    ("ghproxy.net", "https://ghproxy.net/"),
    ("ghfast.top", "https://ghfast.top/"),
    ("gh.noki.icu", "https://gh.noki.icu/"),
    ("gh.llkk.cc", "https://gh.llkk.cc/"),
    ("gh.ddlc.top", "https://gh.ddlc.top/"),
    ("gh.idayer.com", "https://gh.idayer.com/"),
    ("ghfile.geekertao.top", "https://ghfile.geekertao.top/"),
    ("gh.zwy.one", "https://gh.zwy.one/"),
    ("ghproxy.homeboyc.cn", "https://ghproxy.homeboyc.cn/"),
]

# ---------------------------------------------------------------- 规则表
# kind -> 正则；顺序敏感（先匹配先归属）
KIND_RULES = [
    ("github", re.compile(r"^https?://(?:github\.com/[^/]+/[^/]+/(?:releases/download|archive|raw)/"
                          r"|raw\.githubusercontent\.com/|codeload\.github\.com/|gist\.githubusercontent\.com/)")),
    ("huggingface", re.compile(r"^https?://(?:huggingface\.co|hf\.co)/")),
    ("npm", re.compile(r"^https?://(?:registry\.npmjs\.org|registry\.npmjs\.com|registry\.yarnpkg\.com)/")),
    ("pypi", re.compile(r"^https?://(?:files\.pythonhosted\.org|pypi\.python\.org/packages)/")),
    ("maven", re.compile(r"^https?://(?:repo1\.maven\.org|repo\.maven\.apache\.org)/maven2/")),
    ("go", re.compile(r"^https?://(?:go\.dev/dl/|dl\.google\.com/go/|golang\.org/dl/)")),
    ("goproxy", re.compile(r"^https?://proxy\.golang\.org/")),
    ("nodejs", re.compile(r"^https?://nodejs\.org/dist/")),
    ("ubuntu", re.compile(r"^https?://(?:archive|security|ports)\.ubuntu\.com/")),
    ("debian", re.compile(r"^https?://(?:deb|ftp|http|cdn-fastly)\.debian\.org/")),
    ("centos", re.compile(r"^https?://(?:mirror|mirrors)\.[^/]*centos\.org/")),
    ("epel", re.compile(r"^https?://dl\.fedoraproject\.org/pub/epel/")),
    ("alpine", re.compile(r"^https?://dl-cdn\.alpinelinux\.org/")),
    ("arch", re.compile(r"^https?://(?:mirror|mirrors)\.[^/]*archlinux\.org/")),
    ("apache", re.compile(r"^https?://(?:archive|downloads|dlcdn)\.apache\.org/")),
    ("docker", re.compile(r"^https?://(?:registry-1\.docker\.io|registry\.docker\.com)/")),
    ("sourceforge", re.compile(r"^https?://(?:downloads\.sourceforge\.net|sourceforge\.net/projects/[^/]+/files/)")),
    ("generic", re.compile(r"^https?://")),
]

# 各类资源的路径改写：输入 path 部分，产出 (镜像名, 新 URL)
def _rewrites(kind, url):
    out = []
    p = re.sub(r"^https?://[^/]+", "", url)          # 含前导 /
    if kind == "npm":
        out += [("腾讯镜像", TX + "/npm" + p), ("华为镜像", HW + "/repository/npm" + p),
                ("npmmirror", "https://registry.npmmirror.com" + p)]
    elif kind == "pypi":
        # files.pythonhosted.org/packages/... 同时兼容 pypi.python.org/packages/...
        p2 = re.sub(r"^/packages", "/packages", p)
        out += [("腾讯镜像", TX + "/pypi" + p2), ("华为镜像", HW + "/repository/pypi" + p2)]
    elif kind == "maven":
        p2 = p.replace("/maven2", "", 1)
        out += [("腾讯镜像", TX + "/nexus/repository/maven-public" + p2),
                ("华为镜像", HW + "/repository/maven" + p2),
                ("阿里云", ALI + "/repository/public" + p2)]
    elif kind == "go":
        # go.dev/dl/go1.22.5.linux-amd64.tar.gz -> /golang/go1.22.5.linux-amd64.tar.gz
        fn = p.rsplit("/", 1)[-1]
        out += [("华为镜像", HW + "/golang/" + fn), ("阿里云", ALI + "/golang/" + fn)]
    elif kind == "goproxy":
        out += [("华为镜像", HW + "/repository/goproxy" + p), ("腾讯镜像", TX + "/go" + p)]
    elif kind == "nodejs":
        p2 = p.replace("/dist", "", 1)
        out += [("腾讯镜像", TX + "/nodejs-release" + p2), ("华为镜像", HW + "/nodejs" + p2),
                ("清华镜像", TUNA + "/nodejs-release" + p2)]
    elif kind in ("ubuntu", "debian", "centos", "epel", "alpine", "arch"):
        # 各家路径前缀与官方基本一致；centos 官方分散在 mirror.centos.org/centos
        extra = ""
        if kind == "centos" and p.startswith("/centos"):
            extra = ""
        out += [("腾讯镜像", TX + p), ("华为镜像", HW + p), ("阿里云", ALI + p)]
        if extra:
            out.append(("华为镜像", HW + extra))
    elif kind == "apache":
        p2 = re.sub(r"^/(?:apache|dist)", "", p)
        out += [("华为镜像", HW + "/apache" + p2), ("清华镜像", TUNA + "/apache" + p2)]
    elif kind == "huggingface":
        out += [("hf-mirror", "https://hf-mirror.com" + p)]
    elif kind == "docker":
        out += [("腾讯镜像", TX + "/docker-ce" + p)]
    return out


def classify(url):
    for kind, pat in KIND_RULES:
        if pat.search(url):
            return kind
    return "generic"


def candidates(url, use_proxy=True, extra_proxies=None):
    """返回候选线路列表 [{url,label,kind,group}]；group=同内容分组，用于多源并行。"""
    kind = classify(url)
    out = []

    def add(u, label, group):
        if u and u not in [c["url"] for c in out]:
            out.append({"url": u, "label": label, "kind": kind, "group": group})

    if kind == "github":
        proxies = list(GH_PROXIES)
        if use_proxy:
            for label, pre in proxies:
                add(pre + url, label, "github")
        add(url, "直连", "github")
    elif kind == "sourceforge":
        add("https://p.xbta.cc/" + url, "p.xbta.cc(自建)", "sf")
        add(url, "直连", "sf")
    elif kind == "generic":
        if use_proxy:
            add("https://p.xbta.cc/" + url, "p.xbta.cc(自建)", "generic")
        add(url, "直连", "generic")
    else:
        for label, u in _rewrites(kind, url):
            add(u, label, kind)
        add(url, "直连", kind)

    if extra_proxies:
        for pre in extra_proxies:
            add(pre.rstrip("/") + "/" + url, "自定义代理", kind)
    return out


# ---------------------------------------------------------------- 探测
def probe_one(url, timeout=12, probe_bytes=262144, ua=UA, connect_timeout=8):
    """单线路探测：Range GET 前 probe_bytes 字节，返回可用性/速率/是否支持 Range。"""
    cmd = ["curl", "-s", "-o", "/dev/null", "-A", ua, "--max-time", str(timeout),
           "--connect-timeout", str(connect_timeout), "-r", "0-%d" % (probe_bytes - 1),
           "-w", "%{http_code}|%{size_download}|%{time_starttransfer}|%{time_total}|"
                 "%{speed_download}|%{content_type}|%{num_redirects}|%{url_effective}", url]
    t0 = os.times()
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 5)
        raw = (r.stdout or "").strip()
    except Exception as e:                                    # noqa: BLE001
        return {"url": url, "ok": False, "reason": "exec:%s" % e, "speed": 0}
    parts = raw.split("|")
    if len(parts) < 6:
        return {"url": url, "ok": False, "reason": "no-output", "speed": 0}
    code = int(parts[0]) if parts[0].isdigit() else 0
    size = int(parts[1]) if parts[1].isdigit() else 0
    ttfb = float(parts[2]) if parts[2].replace(".", "").isdigit() else 0.0
    total = float(parts[3]) if parts[3].replace(".", "").isdigit() else 0.0
    speed = float(parts[4]) if parts[4].replace(".", "").isdigit() else 0.0
    ctype = parts[5] or ""
    effective = parts[7] if len(parts) > 7 else url
    del t0

    ok = code in (200, 206) and size > 0
    reason = ""
    if code == 0:
        reason = "timeout/connect"
    elif code in (401, 403):
        reason = "http-%d" % code
    elif code == 404:
        reason = "http-404"
    elif code >= 400:
        reason = "http-%d" % code
    # 错误页识别：期望二进制却拿到小体积 HTML
    if ok and size < 65536 and ("text/html" in ctype.lower()):
        ok, reason = False, "html-error-page"
    elif ok and size < 1024 and ctype.lower().startswith("text/"):
        # 极小的文本响应多半是报错（JSON 错误信息等）
        ok, reason = False, "tiny-text(%d)" % size

    return {"url": url, "ok": ok, "code": code, "size": size, "ttfb": round(ttfb, 3),
            "total": round(total, 3), "speed": int(speed), "ctype": ctype,
            "ranges": code == 206, "effective": effective,
            "reason": reason, "probe_bytes": size}


def probe_many(cands, workers=6, timeout=12, ua=UA):
    with ThreadPoolExecutor(max_workers=max(1, min(workers, len(cands) or 1))) as ex:
        res = list(ex.map(lambda c: {**c, **probe_one(c["url"], timeout, ua=ua)}, cands))
    return res


def rank(probed):
    """排序：可用优先。有精确速率就按速率降序；候选多时只做了小样本粗测（coarse），
    此时速率不可比，改按 TTFB 升序（真实速率交给 aria2 的 16 连接去发挥）。"""
    ok = [p for p in probed if p.get("ok")]
    if any(p.get("coarse") for p in ok):
        ok.sort(key=lambda p: (1 if p.get("coarse") else 0, p.get("ttfb", 99)))
    else:
        ok.sort(key=lambda p: (-p.get("speed", 0), p.get("ttfb", 99)))
    bad = [p for p in probed if not p.get("ok")]
    return ok + bad


# ---------------------------------------------------------------- 两级探测（GitHub 代理池专用）
PROBE_CACHE = "/tmp/.aria2dl_ghprobe.json"
PROBE_TTL = 3600          # 探测结果缓存 1 小时：代理波动大，但不必每次下载都全量重测


def _cache_load():
    try:
        return json.load(open(PROBE_CACHE, encoding="utf-8"))
    except Exception:                                    # noqa: BLE001
        return {}


def _cache_save(cache):
    try:
        if len(cache) > 800:                             # 控制体积，丢最旧
            items = sorted(cache.items(), key=lambda kv: kv[1].get("ts", 0))[-600:]
            cache = dict(items)
        json.dump(cache, open(PROBE_CACHE, "w", encoding="utf-8"))
    except Exception:                                    # noqa: BLE001
        pass


def probe_tiered(cands, stage1_bytes=16384, stage1_timeout=4, stage2_bytes=131072,
                 stage2_timeout=12, top=3, workers=8, ua=UA, use_cache=True, max_stage1=10):
    """两级探测，专治「候选多（如 17 个 GitHub 代理）」的场景：

      stage1  取前 max_stage1 条各探 16KB —— 判「通不通 / 限流 / 拒绝 / 错误页」+ TTFB（连接超时只给 4s）
      stage2  仅当存活候选 ≤6 条时，对最快 top 条取 128KB 拿真实速率；
              候选很多时直接按 TTFB 排序即可（aria2 本身会用 16 连接，速率精度不重要），
              这一步能省 12 秒左右
      缓存    成功的 1 小时内复用；失败的只缓存 10 分钟（429/超时多为临时限流）

    为什么不全量测 256KB：17 条 × 256KB ≈ 4MB 探测流量，慢通道各自吃满超时，
    单次下载前的准备时间会被拉到 30 秒以上。
    """
    import time as _t
    now = _t.time()
    cache = _cache_load() if use_cache else {}
    out, need = [], []
    for c in cands:
        hit = cache.get(c["url"]) if use_cache else None
        # 失败项只缓存 10 分钟：429/超时多为临时限流，等太久会一直错过已恢复的线路
        ttl = PROBE_TTL if (hit or {}).get("ok") else 600
        if hit and (now - hit.get("ts", 0)) < ttl:
            merged = dict(c)
            merged.update({k: hit[k] for k in
                           ("ok", "code", "size", "ttfb", "speed", "ranges", "reason", "ctype")
                           if k in hit})
            merged["cached"] = True
            out.append(merged)
        else:
            need.append(c)

    if need:
        probe_list, skipped = need[:max_stage1], need[max_stage1:]
        with ThreadPoolExecutor(max_workers=max(1, min(workers, len(probe_list)))) as ex:
            s1 = list(ex.map(lambda c: {**c, **probe_one(c["url"], stage1_timeout,
                                                         stage1_bytes, ua,
                                                         connect_timeout=3)}, probe_list))
        alive = [p for p in s1 if p.get("ok")]
        alive.sort(key=lambda p: p.get("ttfb", 99))
        if len(alive) <= 4:
            pick = {p["url"] for p in alive[:top]}
            s2 = []
            if pick:
                with ThreadPoolExecutor(max_workers=max(1, min(workers, len(pick)))) as ex:
                    s2 = list(ex.map(lambda p: {**p, **probe_one(p["url"], stage2_timeout,
                                                                 stage2_bytes, ua)},
                                     [p for p in alive if p["url"] in pick]))
        else:
            pick, s2 = set(), []          # 候选多：按 TTFB 排即可，跳过精测省时间
            for p in alive:
                p["coarse"] = True

        for p in s1:
            cache[p["url"]] = {"ts": now, "ok": p.get("ok", False), "code": p.get("code", 0),
                               "size": p.get("size", 0), "ttfb": p.get("ttfb", 0),
                               "speed": p.get("speed", 0), "ranges": p.get("ranges", False),
                               "reason": p.get("reason", ""), "ctype": p.get("ctype", "")}
            if p["url"] in pick:
                continue        # 该项由 stage2 的精确结果取代
            out.append(p)
        for p in s2:
            cache[p["url"]] = {"ts": now, "ok": p.get("ok", False), "code": p.get("code", 0),
                               "size": p.get("size", 0), "ttfb": p.get("ttfb", 0),
                               "speed": p.get("speed", 0), "ranges": p.get("ranges", False),
                               "reason": p.get("reason", ""), "ctype": p.get("ctype", "")}
            out.append(p)
        for c in skipped:
            # 候选超过 max_stage1 的尾部不探测（--gh-proxy 可手工指定，失败时也会按 route-tries 兜到）
            out.append({**c, "ok": False, "code": 0, "size": 0, "ttfb": 99, "speed": 0,
                        "ranges": False, "ctype": "",
                        "reason": "未探测(候选过多，可 --gh-proxy 指定)"})
            # 尾部也要记缓存，否则每次调用都会重测这批（实测让第二次从 0.07s 变成 6s）
            cache[c["url"]] = {"ts": now, "ok": False, "code": 0, "size": 0, "ttfb": 99,
                               "speed": 0, "ranges": False,
                               "reason": "未探测(候选过多)", "ctype": ""}
        if use_cache:
            _cache_save(cache)

    seen, uniq = set(), []
    for p in out:
        if p["url"] in seen:
            continue
        seen.add(p["url"])
        uniq.append(p)
    return rank(uniq)


# ---------------------------------------------------------------- CLI
def _fmt_speed(bps):
    for unit in ("B/s", "KB/s", "MB/s", "GB/s"):
        if bps < 1024:
            return "%.1f %s" % (bps, unit)
        bps /= 1024.0
    return "%.1f TB/s" % bps


def main(argv=None):
    ap = argparse.ArgumentParser(description="镜像候选生成与线路探测")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("resolve", help="生成候选并可选探测")
    p1.add_argument("url")
    p1.add_argument("--probe", action="store_true")
    p1.add_argument("--timeout", type=int, default=12)
    p1.add_argument("--no-proxy", action="store_true")
    p1.add_argument("--json", action="store_true")

    p2 = sub.add_parser("probe", help="探测任意 URL")
    p2.add_argument("urls", nargs="+")
    p2.add_argument("--timeout", type=int, default=12)
    p2.add_argument("--json", action="store_true")

    p3 = sub.add_parser("search", help="搜华为云镜像站（需自备 hw_mirrors.py）")
    p3.add_argument("kw")

    sub.add_parser("rules", help="打印规则表")

    a = ap.parse_args(argv)

    if a.cmd == "rules":
        for kind, _ in KIND_RULES:
            print(kind)
        return 0

    if a.cmd == "search":
        hw = os.environ.get("ADL_HW_MIRRORS") or os.path.expanduser("~/.local/bin/hw_mirrors.py")
        if not os.path.exists(hw):
            print("未找到华为云镜像清单工具；设置 ADL_HW_MIRRORS 指向你本地的 hw_mirrors.py 即可", file=sys.stderr)
            return 2
        return subprocess.call([sys.executable, hw, "search", a.kw])

    if a.cmd == "probe":
        cands = [{"url": u, "label": "-", "kind": classify(u), "group": "-"} for u in a.urls]
        res = probe_many(cands, timeout=a.timeout)
        if a.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            for p in res:
                print("%-14s %-9s %s  ttfb=%ss  %s" % (
                    "OK" if p["ok"] else "FAIL", _fmt_speed(p["speed"]),
                    p["url"][:90], p["ttfb"], p.get("reason", "")))
        return 0

    # resolve
    url = a.url
    cands = candidates(url, use_proxy=not a.no_proxy)
    kind = classify(url)
    if a.probe:
        cands = probe_tiered(cands, stage1_timeout=max(5, a.timeout - 6),
                             stage2_timeout=a.timeout + 3)
    if a.json:
        print(json.dumps({"kind": kind, "candidates": cands}, ensure_ascii=False, indent=2))
    else:
        print("类型: %s  候选: %d" % (kind, len(cands)))
        for i, c in enumerate(cands, 1):
            mark = ""
            if a.probe:
                mark = ("%-9s" % _fmt_speed(c["speed"])) if c.get("ok") else "FAIL     "
            print("%2d. %-16s %s %s" % (i, c["label"], mark, c["url"]))
            if a.probe and not c.get("ok"):
                print("      └ %s" % c.get("reason", ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
