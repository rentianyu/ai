#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""adl.py —— aria2-next 智能下载器（大文件 / 批量 / 多源加速）

设计要点（每一条都对应一个真实坑）：
  · 先探测再下载         —— 候选线路当场实测（TTFB/速率/Range/错误页），不靠死表
  · 无进度看门狗         —— 连接假死时 aria2 自身可能一直挂着，外部强制换线路续传
  · 换线路保续传         —— 保留 state-db，换源后从断点继续而不是重下
  · 错误页识别           —— 代理返回 HTML 403/提示页时判失败，避免把网页存成 .apk/.zip
  · 完成后强校验         —— 大小 / sha256（可自动找伴随 .sha256）/ 压缩包真实可解
  · 空间预检             —— 按 Content-Length 比对磁盘余量，避免下到一半撑爆
  · 批量并发 + 失败清单  —— -i 清单 + -j 并发，失败项单独汇总

典型用法：
  adl <URL> [-o DIR] [-n NAME]
  adl -i urls.txt -o ~/dl -j 4
  adl <github-release-url> --multi-source       # GitHub 走代理池多源并行
  adl magnet:?xt=urn:btih:...                   # BT / 磁力
  adl https://x/a.m3u8                          # HLS（aria2-next 原生支持）
  adl <URL> --dry-run                           # 只看线路探测结果不下

作者：小贝塔   许可：MIT
退出码：0 全部成功 / 1 部分失败 / 2 全部失败 / 3 参数或环境错误
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mirror  # noqa: E402

UA = mirror.UA
DEFAULT_UA = UA
VERSION = "1.0.0"
LOG_DIR = "/tmp/aria2-dl"
PROG_RE = re.compile(r"(\d+(?:\.\d+)?)\s*([KMG]?)i?B\s*/\s*(\d+(?:\.\d+)?)\s*([KMG]?)i?B")
UNIT = {"": 1, "K": 1024, "M": 1024 ** 2, "G": 1024 ** 3}


# ---------------------------------------------------------------- 工具
def human(n):
    n = float(n or 0)
    for u in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return "%.1f%s" % (n, u)
        n /= 1024.0
    return "%.1fPB" % n


def parse_size(s):
    """'1M' / '512K' / '2G' / '1024' -> 字节"""
    if s in (None, "", "0"):
        return 0
    m = re.match(r"^(\d+(?:\.\d+)?)\s*([KMGT]?)i?B?$", str(s).strip(), re.I)
    if not m:
        raise argparse.ArgumentTypeError("无法解析大小: %s" % s)
    return int(float(m.group(1)) * UNIT[m.group(2).upper()])


def sanitize_name(name):
    name = urllib.parse.unquote(name or "")
    name = name.replace("\\", "_").replace("/", "_").replace("\0", "")
    name = re.sub(r'[\r\n\t]+', " ", name).strip()
    return name or None


def name_from_url(url):
    if url.startswith("magnet:"):
        return None
    p = urllib.parse.urlparse(url)
    base = sanitize_name(os.path.basename(p.path))
    if not base or base in (".", ".."):
        return None
    # 代理前缀形如 https://p.xbta.cc/https://github.com/... 时上面已取到末段，无需特殊处理
    return base


def ensure_engine():
    sh = os.path.join(HERE, "restore.sh")
    if not os.path.exists(sh):
        raise SystemExit("[adl] 缺少 restore.sh（应与 adl.py 在同一目录）")
    r = subprocess.run(["sh", sh, "--quiet"], capture_output=True, text=True)
    path = (r.stdout or "").strip().splitlines()
    path = path[-1] if path else ""
    if r.returncode != 0 or not path or not os.path.exists(path):
        raise SystemExit("[dl] aria2-next 恢复失败：\n%s\n%s" % (r.stdout, r.stderr))
    return path


# ---------------------------------------------------------------- HTTP 预检
def head_probe(url, timeout=20, ua=DEFAULT_UA, headers=None):
    """拿 Content-Length / Accept-Ranges / Content-Type / Content-Disposition。失败返回 {}"""
    cmd = ["curl", "-sIL", "-A", ua, "--max-time", str(timeout), "--connect-timeout", "10"]
    for h in headers or []:
        cmd += ["-H", h]
    cmd.append(url)
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 5)
    except Exception:                                    # noqa: BLE001
        return {}
    raw = r.stdout or ""
    info = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k, v = k.strip().lower(), v.strip()
        if k == "content-length" and v.isdigit():
            info["size"] = int(v)
        elif k == "accept-ranges":
            info["ranges"] = v.lower() != "none"
        elif k == "content-type":
            info["ctype"] = v
        elif k == "content-disposition":
            m = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^\";]+)"?', v, re.I)
            if m:
                info["filename"] = sanitize_name(m.group(1))
    return info


def available_space(path):
    try:
        return shutil.disk_usage(path).free
    except Exception:                                    # noqa: BLE001
        return 0


# ---------------------------------------------------------------- 校验
def sha256_of(path, limit=None):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(1024 * 1024)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def find_sidecar_hash(path):
    """同目录下 xx.sha256 / xx.sha1 / xx.md5（或 <file>.sha256）里找期望值。"""
    d, base = os.path.dirname(path) or ".", os.path.basename(path)
    for suf in (".sha256", ".sha1", ".md5", ".checksums.sha256", ".sha256sum"):
        for cand in (path + suf, os.path.join(d, base + suf)):
            if os.path.exists(cand) and os.path.getsize(cand) < 200000:
                try:
                    txt = open(cand, encoding="utf-8", errors="ignore").read()
                except Exception:                        # noqa: BLE001
                    continue
                for line in txt.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    m = re.match(r"^([0-9a-fA-F]{32,128})\s+\*?(.+)$", line)
                    if m and (m.group(2).strip() in (base, "*" + base) or m.group(2).endswith(base)):
                        return m.group(1).lower(), cand
                    if re.match(r"^[0-9a-fA-F]{64}$", line):
                        return line.lower(), cand
    return None, None


def verify_archive(path):
    """按扩展名真实解包校验，失败返回错误串。用工具真跑，不看文件头猜。"""
    low = path.lower()
    try:
        if low.endswith(".zip"):
            r = subprocess.run(["unzip", "-tqq", path], capture_output=True, text=True)
            return None if r.returncode == 0 else (r.stdout + r.stderr)[-300:]
        if low.endswith((".tar.gz", ".tgz", ".tar.xz", ".txz", ".tar.bz2", ".tbz2", ".tar")):
            r = subprocess.run(["tar", "-tf", path], capture_output=True, text=True)
            return None if r.returncode == 0 else (r.stdout + r.stderr)[-300:]
        if low.endswith(".xz"):
            r = subprocess.run(["xz", "-t", path], capture_output=True, text=True)
            return None if r.returncode == 0 else (r.stdout + r.stderr)[-300:]
        if low.endswith(".gz"):
            r = subprocess.run(["gzip", "-t", path], capture_output=True, text=True)
            return None if r.returncode == 0 else (r.stdout + r.stderr)[-300:]
        if low.endswith(".7z") and shutil.which("7z"):
            r = subprocess.run(["7z", "t", path], capture_output=True, text=True)
            return None if r.returncode == 0 else (r.stdout + r.stderr)[-300:]
    except Exception as e:                               # noqa: BLE001
        return "校验器异常: %s" % e
    return None          # 非归档类型不校验


# ---------------------------------------------------------------- aria2 执行 + 看门狗
def _last_segment(log_path, tail_bytes=262144):
    """取日志最后一个「=== 时间 ===」段之后的内容（即本次运行）。
    比按 offset 增量读可靠：父进程与子进程共享同一 fd 的写偏移，offset 会错位。"""
    try:
        size = os.path.getsize(log_path)
        with open(log_path, "rb") as f:
            if size > tail_bytes:
                f.seek(size - tail_bytes)
            txt = f.read().decode("utf-8", "ignore")
        idx = txt.rfind("\n=== ")
        return txt[idx:] if idx >= 0 else txt
    except Exception:                                    # noqa: BLE001
        return ""


def read_progress(log_path):
    """本次运行已完成字节数（取自 aria2 进度行，单调递增）。
    不能用目标文件大小当进度：aria2-next 会预分配，文件一开始就是完整大小。"""
    best = None
    for m in PROG_RE.finditer(_last_segment(log_path)):
        done = float(m.group(1)) * UNIT[m.group(2).upper()]
        best = done if best is None else max(best, done)
    return best


def is_complete(target, log_path):
    """完成判定：本次运行日志里出现 Download complete。
    不能看文件大小（预分配），也不能依赖 .aria2 控制文件（v3 用 state-dir）。"""
    return "Download complete:" in _last_segment(log_path)


def run_aria2(engine, args, log_path, target, stall_timeout=90, total_timeout=0, quiet=False):
    """运行 aria2 并监控。返回 dict(rc, stalled, seconds, done, complete)"""
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    cmd = [engine] + args
    t0 = time.time()
    with open(log_path, "ab") as lf:
        lf.write(("\n=== %s ===\n%s\n" % (time.strftime("%F %T"), " ".join(cmd))).encode())
        lf.flush()
        proc = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT)
        last_done, last_change, stalled = -1, time.time(), False
        grace = min(20, stall_timeout or 20)      # 启动阶段给足时间出第一条进度
        try:
            while proc.poll() is None:
                time.sleep(2)
                done = read_progress(log_path)
                if done is not None and done > last_done:
                    last_done, last_change = done, time.time()
                elif stall_timeout:
                    idle = time.time() - last_change
                    limit = stall_timeout if last_done > 0 else max(grace, stall_timeout)
                    if idle > limit:
                        stalled = True
                        if not quiet:
                            print("    ! %ds 无新进度（停在 %s），强制换线路" %
                                  (int(idle), human(max(last_done, 0))), flush=True)
                        break
                if total_timeout and (time.time() - t0) > total_timeout:
                    stalled = True
                    if not quiet:
                        print("    ! 超过总时长上限 %ds，中断（进度已保留，可续传）" % total_timeout,
                              flush=True)
                    break
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=10)          # 给 aria2 时间 checkpoint 续传状态
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=5)
    return {"rc": proc.returncode, "stalled": stalled, "seconds": time.time() - t0,
            "done": max(last_done, 0), "complete": is_complete(target, log_path)}


def have_ipv6(timeout=4):
    """多数容器/VPS 无 IPv6 出口时，aria2 每条连接都会先试 IPv6 再回退，白等数秒。
    探测结果缓存 1 小时，命中则加 --disable-ipv6=true 显著提速。"""
    cache = "/tmp/.aria2dl_ipv6"
    try:
        if os.path.exists(cache) and time.time() - os.path.getmtime(cache) < 3600:
            return open(cache).read().strip() == "1"
    except Exception:                                    # noqa: BLE001
        pass
    ok = False
    try:
        r = subprocess.run(["curl", "-6", "-s", "-o", "/dev/null", "--max-time", str(timeout),
                            "-w", "%{http_code}", "https://repo.huaweicloud.com/debian/dists/bookworm/Release"],
                           capture_output=True, text=True, timeout=timeout + 3)
        ok = (r.stdout or "").strip() in ("200", "206")
    except Exception:                                    # noqa: BLE001
        ok = False
    try:
        with open(cache, "w") as f:
            f.write("1" if ok else "0")
    except Exception:                                    # noqa: BLE001
        pass
    return ok


def build_args(opts, url_list, out_dir, out_name, log_path, extra_headers=None, headers=None):
    a = ["--dir=" + out_dir,
         "--continue=true",                       # 断点续传（依赖 .aria2 控制文件）
         "--auto-file-renaming=false",            # 不生成 file.1.zip 这类副本
         "--allow-overwrite=false",
         "--file-allocation=none",                # 尽量让文件按实际增长（aria2-next 仍会预分配）
         "--max-tries=%d" % opts.max_tries,
         "--retry-wait=%d" % opts.retry_wait,
         "--timeout=%d" % opts.timeout,
         "--connect-timeout=%d" % opts.connect_timeout,
         "--user-agent=" + (opts.ua or DEFAULT_UA),
         "--console-log-level=notice",
         "--summary-interval=%d" % (max(1, min(opts.summary, opts.stall_timeout // 3))
                                    if opts.stall_timeout else max(1, opts.summary)),
         # 进度输出间隔必须小于看门狗阈值，否则「还没到下次打印」就会被误判成停滞；
         # 注意：不要再传 --log。<--log 与我们的 stdout 重定向会变成两个 writer 写同一文件，
         # 导致按 offset 增量读进度时错位、完成标记读不到（实测 3 个任务全部误报未完成）。
         "--enable-color=false",
         "--max-file-not-found=3",
         # aria2-next v3 用 state-dir 存续传数据（不是 .aria2 控制文件）；
         # 不显式指定的话状态落在默认位置，换目录/换会话就丢断点。
         "--state-dir=" + os.path.join(out_dir, ".aria2dl-state"),
         "--state-save-interval=5"]
    if not have_ipv6():
        a.append("--disable-ipv6=true")
    if out_name:
        a.append("--out=" + out_name)
    if opts.connections:
        a.append("--max-connection-per-server=%d" % opts.connections)
        a.append("--split=%d" % opts.split)
        a.append("--min-split-size=%dM" % max(1, opts.min_split // (1024 * 1024)))
    if opts.speed_limit:
        a.append("--lowest-speed-limit=%d" % opts.speed_limit)
    if opts.insecure:
        a.append("--check-certificate=false")
    if opts.max_rate:
        a.append("--max-overall-download-limit=%d" % opts.max_rate)
    for h in (headers or []) + (extra_headers or []):
        a.append("--header=" + h)
    if url_list and url_list[0].startswith("magnet:"):
        a += ["--enable-dht=true", "--bt-enable-lpd=true", "--enable-peer-exchange=true",
              "--seed-time=0", "--bt-max-peers=80"]
        if opts.tracker:
            a.append("--bt-tracker=" + opts.tracker)
    a += url_list
    return a


# ---------------------------------------------------------------- 单任务
def download_one(task, opts, engine, idx):
    url, out_dir = task["url"], task["out_dir"]
    res = {"url": url, "ok": False, "file": None, "bytes": 0, "seconds": 0.0,
           "speed": 0, "route": None, "attempts": [], "verify": None, "error": None}
    os.makedirs(out_dir, exist_ok=True)
    log_path = os.path.join(LOG_DIR, "job%02d.log" % idx)

    # 1) 线路解析（磁力/种子不做镜像改写）
    if url.startswith("magnet:") or url.endswith(".torrent"):
        cands = [{"url": url, "label": "BT", "kind": "bt", "group": "bt", "ok": True}]
        kind = "bt"
    else:
        kind = mirror.classify(url)
        cands = mirror.candidates(url, use_proxy=not opts.no_proxy, extra_proxies=opts.proxy_prefix)
        if opts.no_mirror:
            cands = [c for c in cands if c["label"] in ("直连",)] or cands[-1:]
        if not opts.skip_probe:
            # 两级探测：候选多时（GitHub 代理池 16+ 条）先用 16KB 判存活，再对最快几条测速率
            cands = mirror.probe_tiered(cands,
                                        stage1_timeout=max(5, opts.probe_timeout - 6),
                                        stage2_timeout=opts.probe_timeout + 3,
                                        ua=opts.ua or DEFAULT_UA,
                                        use_cache=opts.probe_cache)
    live = [c for c in cands if c.get("ok")]
    if not live:
        # 全部线路探测失败（404 / 超时 / 返回错误页）：不必再逐个重试，直接给出原因
        res["error"] = "所有线路不可用：" + " | ".join(
            "%s(%s)" % (c["label"], c.get("reason") or "?") for c in cands[:4])
        return res

    # 2) 文件名与预检
    out_name = task.get("name") or name_from_url(url)
    head = {}
    if kind != "bt" and not opts.skip_probe:
        head = head_probe(live[0]["url"], ua=opts.ua or DEFAULT_UA, headers=opts.header)
        if not out_name:
            out_name = head.get("filename")
    if not out_name:
        out_name = "download-%d" % int(time.time())
    target = os.path.join(out_dir, out_name)
    res["file"] = target

    if opts.restart:
        for p in (target, target + ".aria2", target + ".aria2dl-meta"):
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:                            # noqa: BLE001
                pass
        st = os.path.join(out_dir, ".aria2dl-state")
        if os.path.isdir(st):
            shutil.rmtree(st, ignore_errors=True)

    expect_size = head.get("size") or 0
    if expect_size:
        free = available_space(out_dir)
        need = int(expect_size * 1.02) + 32 * 1024 * 1024
        if free and free < need:
            res["error"] = "磁盘空间不足：需 %s，剩 %s（%s）" % (human(need), human(free), out_dir)
            return res
    if opts.dry_run:
        res.update({"ok": True, "route": live[0]["label"], "bytes": expect_size,
                    "error": None, "verify": "dry-run"})
        res["plan"] = [{"label": c["label"], "url": c["url"],
                        "speed": c.get("speed", 0)} for c in live[:5]]
        return res

    # 3) 逐线路尝试（失败/停滞换下一线路，保留 .aria2 续传）
    tried = 0
    for c in live:
        if tried >= opts.route_tries:
            break
        tried += 1
        urls = [c["url"]]
        group_ok = [x for x in live if x["group"] == c["group"] and x["url"] != c["url"]]
        if opts.multi_source and kind in ("github", "sourceforge", "generic") and group_ok:
            urls += [x["url"] for x in group_ok[:2]]
        args = build_args(opts, urls, out_dir, out_name, log_path, extra_headers=None,
                          headers=opts.header)
        if not opts.quiet:
            extra = " (+%d 源)" % (len(urls) - 1) if len(urls) > 1 else ""
            print("  → %s%s" % (c["label"], extra), flush=True)
        r = run_aria2(engine, args, log_path, target,
                      stall_timeout=0 if opts.dry_run else opts.stall_timeout,
                      total_timeout=opts.total_timeout, quiet=opts.quiet)
        ok_file = os.path.exists(target) and os.path.getsize(target) > 0
        size_now = os.path.getsize(target) if ok_file else 0
        res["attempts"].append({"route": c["label"], "rc": r["rc"], "stalled": r["stalled"],
                                "done": r["done"], "seconds": round(r["seconds"], 1),
                                "complete": r["complete"]})
        # 完成判定只认「控制文件消失 + Download complete」，不看文件大小
        # （aria2-next 预分配，中断时大小也已等于总量）
        if r["complete"]:
            res.update({"ok": True, "route": c["label"], "bytes": size_now, "seconds": r["seconds"]})
            if expect_size and size_now != expect_size:
                res["ok"] = False
                res["error"] = "已完成但大小不符：期望 %s 实得 %s" % (human(expect_size), human(size_now))
            break
        if not ok_file:
            res["error"] = "未生成文件（rc=%s）" % r["rc"]
        else:
            res["error"] = "未完成：已下 %s / %s（rc=%s, stalled=%s）" % (
                human(r["done"]), human(expect_size) if expect_size else "?", r["rc"], r["stalled"])

    if not res["ok"]:
        res["seconds"] = sum(a["seconds"] for a in res["attempts"])
        return res

    # 4) 强校验
    verify_notes = []
    if expect_size and res["bytes"] != expect_size:
        res["ok"] = False
        res["error"] = "最终大小不符 %s != %s" % (res["bytes"], expect_size)
        return res
    if opts.sha256:
        got = sha256_of(target)
        if got.lower() != opts.sha256.lower():
            res["ok"] = False
            res["error"] = "sha256 不符（期望 %s 实得 %s）" % (opts.sha256, got)
            return res
        verify_notes.append("sha256 ok")
    elif opts.auto_sha:
        exp, src = find_sidecar_hash(target)
        if exp:
            got = sha256_of(target) if len(exp) == 64 else None
            if got and got != exp:
                res["ok"] = False
                res["error"] = "伴随校验文件不符（%s）" % os.path.basename(src or "")
                return res
            verify_notes.append("伴随校验 ok(%s)" % os.path.basename(src or ""))
    if opts.verify_archive:
        err = verify_archive(target)
        if err:
            res["ok"] = False
            res["error"] = "压缩包校验失败：%s" % err
            return res
        verify_notes.append("archive ok")
    res["verify"] = "; ".join(verify_notes) or "size ok"
    res["speed"] = int(res["bytes"] / res["seconds"]) if res["seconds"] else 0
    return res


# ---------------------------------------------------------------- 入口
def load_list(path):
    urls = []
    with open(path, encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            urls.append({"url": parts[0], "name": parts[1] if len(parts) > 1 else None})
    return urls


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="aria2-next 智能下载器：镜像改写 + 线路探测 + 无进度看门狗 + 强校验",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="示例: adl https://github.com/o/r/releases/download/v1/a.apk -o /tmp")
    ap.add_argument("--version", action="version", version="adl %s (aria2-next engine)" % VERSION)
    ap.add_argument("urls", nargs="*", help="下载地址（可多个）；支持 magnet: 与 m3u8/mpd")
    ap.add_argument("-i", "--input", help="URL 清单文件（每行 url [保存名]，# 注释）")
    ap.add_argument("-o", "--out", default=".", help="输出目录（默认当前目录）")
    ap.add_argument("-n", "--name", help="保存文件名（单任务时有效）")
    ap.add_argument("-j", "--jobs", type=int, default=3, help="并发任务数（默认 3）")
    ap.add_argument("-x", "--connections", type=int, default=16, help="单服务器连接数（默认 16）")
    ap.add_argument("-s", "--split", type=int, default=16, help="分片数（默认 16）")
    ap.add_argument("-k", "--min-split", type=parse_size, default=parse_size("1M"), help="最小分片（默认 1M）")
    ap.add_argument("--stall-timeout", type=int, default=90, help="无进度多少秒判定假死并换线路（默认 90，0=关闭）")
    ap.add_argument("--total-timeout", type=int, default=0, help="单任务总时长上限秒（默认 0=不限）")
    ap.add_argument("--probe-timeout", type=int, default=12, help="单线路探测超时（默认 12s）")
    ap.add_argument("--no-probe-cache", dest="probe_cache", action="store_false",
                    help="不复用线路探测缓存（默认缓存 1 小时，避免反复探测被对方限流）")
    ap.add_argument("--probe-cache", dest="probe_cache", action="store_true", default=True,
                    help=argparse.SUPPRESS)
    ap.add_argument("--timeout", type=int, default=20, help="aria2 读超时（默认 20s）")
    ap.add_argument("--connect-timeout", type=int, default=10, help="aria2 连接超时（默认 10s）")
    ap.add_argument("--max-tries", type=int, default=3, help="aria2 每线路重试次数（默认 3）")
    ap.add_argument("--retry-wait", type=int, default=3, help="重试间隔秒（默认 3）")
    ap.add_argument("--route-tries", type=int, default=3, help="最多尝试几条线路（默认 3）")
    ap.add_argument("--speed-limit", type=parse_size, default=0, help="最低速门限，低于则 aria2 断连重试（如 1K）")
    ap.add_argument("--max-rate", type=parse_size, default=0, help="总下载限速（如 5M，0=不限）")
    ap.add_argument("--restart", action="store_true",
                    help="删除残留文件与续传状态后从头下载（默认自动续传）")
    ap.add_argument("--summary", type=int, default=5, help="进度输出间隔秒（默认 5）")
    ap.add_argument("--multi-source", action="store_true", help="同组多条线路一起下（GitHub 类代理多源并行）")
    ap.add_argument("--no-mirror", action="store_true", help="不做镜像改写，只用原地址")
    ap.add_argument("--no-proxy", action="store_true", help="不使用 GitHub 代理前缀")
    ap.add_argument("--proxy-prefix", action="append", help="额外代理前缀（可多次），用法 <前缀>/<完整URL>")
    ap.add_argument("--skip-probe", action="store_true", help="跳过线路探测，直接用首选线路")
    ap.add_argument("--header", action="append", help="附加请求头，如 'Referer: https://x'")
    ap.add_argument("--ua", help="自定义 User-Agent")
    ap.add_argument("--sha256", help="期望的 sha256（下完强校验）")
    ap.add_argument("--auto-sha", action="store_true", default=True, help="自动找伴随 .sha256 校验（默认开）")
    ap.add_argument("--no-auto-sha", dest="auto_sha", action="store_false")
    ap.add_argument("--verify-archive", action="store_true", help="按扩展名真实解包校验 zip/tar/xz/gz")
    ap.add_argument("--insecure", action="store_true", help="跳过 TLS 证书校验")
    ap.add_argument("--tracker", help="BT tracker 列表（逗号分隔）")
    ap.add_argument("--dry-run", action="store_true", help="只探测线路与体积，不下载")
    ap.add_argument("--json", action="store_true", help="输出 JSON 结果")
    ap.add_argument("--quiet", action="store_true", help="静默（只出最终汇总）")
    opts = ap.parse_args(argv)

    tasks = []
    for u in opts.urls:
        tasks.append({"url": u, "out_dir": opts.out,
                      "name": opts.name if len(opts.urls) == 1 else None})
    if opts.input:
        tasks += [{"url": t["url"], "out_dir": opts.out, "name": t["name"]} for t in load_list(opts.input)]
    if not tasks:
        ap.print_help()
        return 3

    engine = ensure_engine()
    os.makedirs(LOG_DIR, exist_ok=True)
    t0 = time.time()
    if not opts.quiet:
        print("引擎: %s" % subprocess.run([engine, "--version"], capture_output=True, text=True)
              .stdout.splitlines()[0])
        print("任务: %d 个  并发: %d  输出: %s" % (len(tasks), opts.jobs, opts.out))

    results = [None] * len(tasks)

    def work(i_t):
        i, t = i_t
        try:
            r = download_one(t, opts, engine, i)
        except Exception as e:                           # noqa: BLE001
            r = {"url": t["url"], "ok": False, "error": "异常: %s" % e, "file": None,
                 "bytes": 0, "seconds": 0, "speed": 0, "route": None, "attempts": [], "verify": None}
        results[i] = r
        if not opts.quiet:
            tag = "OK  " if r["ok"] else "FAIL"
            print("[%d/%d] %s %s  %s  %s  %s" % (
                i + 1, len(tasks), tag,
                os.path.basename(r.get("file") or t["url"])[:48],
                human(r.get("bytes", 0)),
                ("%.0fs" % r.get("seconds", 0)),
                r.get("route") or ""), flush=True)
            if r.get("error"):
                print("        └ %s" % r["error"], flush=True)

    with ThreadPoolExecutor(max_workers=max(1, opts.jobs)) as ex:
        list(ex.map(work, list(enumerate(tasks))))

    ok_n = sum(1 for r in results if r["ok"])
    elapsed = time.time() - t0
    total_bytes = sum(r.get("bytes", 0) for r in results)

    if opts.json:
        print(json.dumps({"ok": ok_n, "total": len(results), "seconds": round(elapsed, 1),
                          "bytes": total_bytes, "results": results}, ensure_ascii=False, indent=2))
    else:
        print("\n汇总: %d/%d 成功  %s  %.0fs  均速 %s" % (
            ok_n, len(results), human(total_bytes), elapsed,
            human(total_bytes / elapsed) if elapsed else "-"))
        fails = [r for r in results if not r["ok"]]
        for r in fails:
            print("  失败: %s -> %s" % (r["url"][:100], r.get("error")))
        if fails and opts.out:
            fl = os.path.join(opts.out, ".failed.txt")
            try:
                with open(fl, "w", encoding="utf-8") as f:
                    for r in fails:
                        f.write("%s\t%s\n" % (r["url"], r.get("error", "")))
                print("  失败清单: %s" % fl)
            except Exception:                            # noqa: BLE001
                pass
    return 0 if ok_n == len(results) else (1 if ok_n else 2)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n已中断（保留 .aria2 控制文件，可续传）", file=sys.stderr)
        sys.exit(130)
