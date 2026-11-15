#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
r2_upload.py — Cloudflare R2 通用上传工具（零依赖：curl + SigV4，见 r2s3.py）

支持：
  1. 上传到任意 bucket（--bucket），按配置映射公开访问域名
  2. 来源：本地文件（单个/批量）、远程 URL、Base64、stdin
  3. 自定义远端目录 / 文件名 / Content-Type（默认按扩展名推断）
  4. 批量并发（--jobs，默认 4）
  5. 输出：可读文本 / --quiet 只出 URL / --json
  6. 可选的上传后访问性检测（--verify）

==================================================================
依赖
==================================================================
curl >= 7.75（需要 --aws-sigv4）+ Python 3.8+，无第三方包。
同目录必须有 r2s3.py。

==================================================================
预先填写
==================================================================
~/.config/r2-upload/config.json（或用 R2_CONFIG 指定路径）：
    {
      "endpoint": "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
      "accessKeyID": "...",
      "secretAccessKey": "...",
      "bucketName": "my-bucket",
      "uploadPath": "img/",
      "urlPrefix": "https://cdn.example.com",
      "bucketDomains": {
        "my-bucket": "https://cdn.example.com",
        "assets": "https://assets.example.com"
      }
    }

最少需要 endpoint / accessKeyID / secretAccessKey / bucketName。
urlPrefix 与 bucketDomains 只影响「输出的 URL 好不好用」：
R2 的 S3 端点不对外公开访问，想直链必须绑自定义域或 r2.dev 公开域名。

环境变量 R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET 可覆盖配置。

==================================================================
用法
==================================================================
    python3 r2_upload.py <文件...>
    python3 r2_upload.py a.png b.jpg -j 8            # 并发 8
    python3 r2_upload.py app.user.js --format original   # 保留原文件名
    python3 r2_upload.py --url https://example.com/x.jpg
    python3 r2_upload.py --base64 "<base64>" --ext .png
    cat x.png | python3 r2_upload.py - --name shot.png
    python3 r2_upload.py x.png --json                # 结构化输出
    python3 r2_upload.py x.png --verify              # 上传后检测可访问性

退出码：0 全部成功，1 有失败（便于脚本/CI 判断）。
"""
import argparse
import base64
import hashlib
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from concurrent.futures import ThreadPoolExecutor

# 中国时间 (UTC+8)，所有时间戳、日志、文件名一律使用本地化时间
CN_TZ = timezone(timedelta(hours=8))

# 访问/下载用的 User-Agent：用浏览器 UA，避免被 Cloudflare 等 CDN 的机器人规则挡掉
# （实测 Python-urllib / 自定义 UA 在 CF 后面会直接 403，导致 --verify 误报不可访问）
UA = os.environ.get("R2_UPLOAD_UA", "Mozilla/5.0 (compatible; r2-upload/4.1)")

# ── 零依赖 S3 客户端（curl + SigV4，替代 boto3，见 r2s3.py）────────
sys.path.insert(0, str(Path(__file__).resolve().parent))
from r2s3 import (make_client as _r2_make_client, load_config as _r2_load_config,
                  ClientError, Config)  # noqa: E402

# ── bucket → 公开访问域名 映射 ────────────────────────────────────
# 写在配置文件的 "bucketDomains" 里，或用 --base-url 单次指定。
# 例：{"my-bucket": "https://cdn.example.com", "assets": "https://assets.example.com"}
BUCKET_DOMAINS = {}


def load_config():
    """配置读取统一走 r2s3.load_config（含环境变量覆盖与 R2_CREDS_FILE 回填）"""
    return _r2_load_config()


def make_client(cfg):
    return _r2_make_client(cfg)


# ── URL 生成 ──────────────────────────────────────────────────────
def url_for(remote_key: str, cfg: dict) -> str:
    """根据 cfg 生成访问 URL。remote_key 已包含 uploadPath 前缀。"""
    prefix = cfg["urlPrefix"].rstrip("/") + "/"
    key = remote_key.lstrip("/")
    if cfg.get("disableBucketPrefixToURL", True):
        return f"{prefix}{key}"
    return f"{prefix}{cfg['bucketName']}/{key}"


# ── 工具函数 ──────────────────────────────────────────────────────
def normalize_upload_path(p: str) -> str:
    if not p:
        return ""
    p = p.strip().strip("/")
    return p + "/" if p else ""


# 扩展名 → Content-Type（自动推断；可用 --content-type 覆盖）
EXT_CTYPE = {
    # 图片
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    ".svg": "image/svg+xml", ".ico": "image/x-icon", ".avif": "image/avif",
    ".tiff": "image/tiff", ".heic": "image/heic",
    # 文档
    ".pdf": "application/pdf", ".epub": "application/epub+zip",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    # 压缩
    ".zip": "application/zip", ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed", ".gz": "application/gzip",
    ".tar": "application/x-tar",
    # 文本 / 代码
    ".txt": "text/plain; charset=utf-8", ".log": "text/plain; charset=utf-8",
    ".ini": "text/plain; charset=utf-8", ".conf": "text/plain; charset=utf-8",
    ".csv": "text/csv; charset=utf-8", ".md": "text/markdown; charset=utf-8",
    ".markdown": "text/markdown; charset=utf-8",
    ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
    ".xml": "application/xml", ".json": "application/json",
    ".yaml": "text/yaml; charset=utf-8", ".yml": "text/yaml; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".scss": "text/x-scss; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".jsx": "text/javascript; charset=utf-8",
    ".ts": "application/typescript; charset=utf-8",
    ".tsx": "application/typescript; charset=utf-8",
    ".py": "text/x-python; charset=utf-8", ".sh": "text/x-shellscript; charset=utf-8",
    ".user.js": "text/javascript; charset=utf-8",
    # 媒体
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".m4a": "audio/mp4", ".flac": "audio/flac",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    # 其它
    ".apk": "application/vnd.android.package-archive",
    ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
}


def guess_ext_and_ctype(filename: str, data: bytes = None) -> tuple:
    name = (filename or "").lower()
    for ext in sorted(EXT_CTYPE, key=len, reverse=True):
        if name.endswith(ext):
            return ext, EXT_CTYPE[ext]
    if data:
        if data[:8] == b"\x89PNG\r\n\x1a\n":
            return ".png", "image/png"
        if data[:3] == b"\xff\xd8\xff":
            return ".jpg", "image/jpeg"
        if data[:6] in (b"GIF87a", b"GIF89a"):
            return ".gif", "image/gif"
        if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            return ".webp", "image/webp"
    return ".bin", "application/octet-stream"


def _exists(client, bucket, key):
    """检测对象是否存在（轻量 head_object）"""
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return False
        raise


# 文档/代码类扩展名（auto 模式下默认 ts-hash-name，带可读文件名）
DOC_EXTS = {
    ".pdf", ".doc", ".docx", ".wps", ".xls", ".xlsx", ".csv",
    ".ppt", ".pptx", ".txt", ".md", ".markdown", ".html", ".htm",
    ".json", ".xml", ".yaml", ".yml", ".epub", ".mobi", ".azw3",
    ".zip", ".rar", ".7z", ".tar", ".gz",
    ".js", ".mjs", ".ts", ".tsx", ".jsx", ".py", ".sh", ".css", ".scss",
    ".conf", ".ini", ".log",
}


def make_remote_name(local_path, custom_name, fmt="auto", ext=".bin",
                     data=None, data_hash=None, client=None, bucket=None, prefix=""):
    """生成远端文件名。fmt: auto / ts-hash / ts-hash-name / ts / ts-ms / original"""
    if custom_name:
        name = custom_name
        if not os.path.splitext(name)[1]:
            name += ext
        return name

    if fmt == "auto":
        src_ext = os.path.splitext(local_path or "")[1].lower() or ext.lower()
        fmt = "ts-hash-name" if src_ext in DOC_EXTS else "ts-hash"

    if fmt == "original" and local_path:
        return os.path.basename(local_path)

    def _hash():
        if data_hash:
            return data_hash[:6]
        if data:
            return hashlib.md5(data).hexdigest()[:6]
        return hashlib.md5(os.urandom(8)).hexdigest()[:6]

    now = datetime.now(CN_TZ)
    if fmt == "ts":
        candidate = now.strftime("%y%m%d%H%M%S") + ext
        if client and bucket and _exists(client, bucket, f"{prefix}{candidate}"):
            candidate = now.strftime("%y%m%d%H%M%S%f")[:15] + ext
        return candidate
    elif fmt == "ts-ms":
        return now.strftime("%y%m%d%H%M%S%f")[:15] + ext
    elif fmt == "ts-hash":
        return now.strftime("%y%m%d-%H%M") + f"-{_hash()}" + ext
    elif fmt == "ts-hash-name":
        stem = os.path.splitext(os.path.basename(local_path or ""))[0] if local_path else ""
        if stem:
            stem = re.sub(r"[\\/:*?\"<>|\s]+", "-", stem).strip("-")
            stem = re.sub(r"[^\w\u4e00-\u9fff.-]", "", stem)
            stem = stem[:30].strip("-")
        if not stem:
            return now.strftime("%y%m%d-%H%M") + f"-{_hash()}" + ext
        return now.strftime("%y%m%d-%H%M") + f"-{_hash()}-{stem}" + ext
    else:
        raise ValueError(f"未知 format: {fmt}")


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def add_cache_buster(url: str, key: str = "v") -> str:
    parsed = urlparse(url)
    qs = dict(parse_qsl(parsed.query, keep_blank_values=True))
    qs[key] = str(int(datetime.now(CN_TZ).timestamp()))
    return urlunparse(parsed._replace(query=urlencode(qs)))


def check_url_accessible(url: str, timeout: int = 8) -> tuple:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ct = r.headers.get("Content-Type", "").split(";")[0].strip()
            ok = (r.status == 200 and (ct.startswith("image/") or ct))
            return (True, ct) if ok else (False, f"HTTP {r.status} | content-type={ct}")
    except Exception as e:
        return False, str(e)


# ── 上传实现 ──────────────────────────────────────────────────────
def _do_upload(client, cfg, key, data=None, content_type=None, body_path=None):
    """统一上传入口；返回实际使用的 content_type。"""
    ct = cfg.get("_ctype_override") or content_type
    extra = {}
    if ct:
        extra["ContentType"] = ct
    if cfg.get("acl"):
        extra["ACL"] = cfg["acl"]
    client.put_object(Bucket=cfg["bucketName"], Key=key,
                      Body=data, BodyPath=body_path, **extra)
    return ct


def _prefix_for(cfg, subdir):
    up = normalize_upload_path(cfg.get("uploadPath", ""))
    sub = f"{subdir.strip().strip('/')}/" if subdir and subdir.strip() else ""
    return f"{up}{sub}".lstrip("/")


def upload_local(client, cfg, local_path, custom_name=None, subdir="", fmt="auto") -> dict:
    p = Path(local_path).expanduser().resolve()
    if not p.exists():
        raise FileNotFoundError(f"本地文件不存在: {local_path}")
    # 流式 md5（用于 ts-hash 命名；不把大文件读进内存）
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    ext, ct = guess_ext_and_ctype(p.name)
    prefix = _prefix_for(cfg, subdir)
    remote_name = make_remote_name(p.name, custom_name, fmt=fmt, ext=ext,
                                   data_hash=h.hexdigest(), client=client,
                                   bucket=cfg["bucketName"], prefix=prefix)
    key = f"{prefix}{remote_name}".lstrip("/")
    size = p.stat().st_size
    ct = _do_upload(client, cfg, key, content_type=ct, body_path=str(p))  # 直传，不落临时文件
    return {"key": key, "url": url_for(key, cfg), "size": size,
            "content_type": ct, "source": str(p)}


def upload_from_url(client, cfg, url, custom_name=None, subdir="", fmt="auto") -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
        ct_header = r.headers.get("Content-Type", "")
    url_filename = url.split("?")[0].split("/")[-1] or "remote"
    ext, ct = guess_ext_and_ctype(url_filename, data)
    if ct_header:
        ct = ct_header.split(";")[0].strip() or ct
    prefix = _prefix_for(cfg, subdir)
    remote_name = make_remote_name(
        url_filename if url_filename != "remote" else None,
        custom_name, fmt=fmt, ext=ext, data=data,
        client=client, bucket=cfg["bucketName"], prefix=prefix)
    key = f"{prefix}{remote_name}".lstrip("/")
    ct = _do_upload(client, cfg, key, data=data, content_type=ct)
    return {"key": key, "url": url_for(key, cfg), "size": len(data),
            "content_type": ct, "source": url}


def upload_base64(client, cfg, b64_data, ext=".png", custom_name=None, subdir="", fmt="auto") -> dict:
    m = re.match(r"data:([\w.+-]+/[\w.+-]+);base64,(.+)", b64_data, re.S)
    if m:
        ct = m.group(1)
        b64 = m.group(2)
        ext = "." + ct.split("/")[1].split("+")[0]
        if ext == ".jpeg":
            ext = ".jpg"
    else:
        b64 = b64_data
        ct = EXT_CTYPE.get(ext.lower(), "application/octet-stream")
    data = base64.b64decode(b64)
    prefix = _prefix_for(cfg, subdir)
    remote_name = make_remote_name(None, custom_name, fmt=fmt, ext=ext, data=data,
                                   client=client, bucket=cfg["bucketName"], prefix=prefix)
    key = f"{prefix}{remote_name}".lstrip("/")
    ct = _do_upload(client, cfg, key, data=data, content_type=ct)
    return {"key": key, "url": url_for(key, cfg), "size": len(data),
            "content_type": ct, "source": "base64"}


def upload_stdin(client, cfg, custom_name=None, subdir="", ext=".png", fmt="auto") -> dict:
    data = sys.stdin.buffer.read()
    if not data:
        raise ValueError("stdin 为空")
    _, ct = guess_ext_and_ctype("x" + ext, data)
    prefix = _prefix_for(cfg, subdir)
    remote_name = make_remote_name(None, custom_name, fmt=fmt, ext=ext, data=data,
                                   client=client, bucket=cfg["bucketName"], prefix=prefix)
    key = f"{prefix}{remote_name}".lstrip("/")
    ct = _do_upload(client, cfg, key, data=data, content_type=ct)
    return {"key": key, "url": url_for(key, cfg), "size": len(data),
            "content_type": ct, "source": "stdin"}


# ── 缓存 404 处理（可选）────────────────────────────────────────────
def verify_and_add_cache_buster(result: dict, cfg: dict) -> dict:
    url = result["url"]
    ok, reason = check_url_accessible(url)
    if ok:
        result["access"] = "ok"
        return result
    cb_url = add_cache_buster(url)
    ok2, reason2 = check_url_accessible(cb_url)
    if ok2:
        result["url"] = cb_url
        result["original_url"] = url
        result["access"] = "cache-buster"
        result["cache_buster_url"] = cb_url
        result["warning"] = f"原 URL 命中缓存 404 ({reason})，已用 cache-buster URL"
        return result
    result["access"] = "failed"
    result["access_error"] = f"原 URL: {reason} | cache-buster: {reason2}"
    result["warning"] = "URL 不可访问！可能是 R2 写失败或反代深层故障"
    return result


# ── 输出格式化 ────────────────────────────────────────────────────
def display_filename(r: dict) -> str:
    return r["key"].split("/")[-1]


def human_print_result(r: dict, index: int = None, total: int = None):
    prefix = f"[{index}/{total}] " if index and total else ""
    url = r["url"]
    fname = display_filename(r)
    print("─" * 50)
    print(f"{prefix}✓ 上传成功")
    print(f"  远端 Key:  {r['key']}")
    print(f"  大小:      {human_size(r['size'])}")
    print(f"  Content-Type: {r['content_type']}")
    print(f"  可点击 (Markdown): [{fname}]({url})")
    print("  可复制 (代码块):")
    print("  ```")
    print(f"  {url}")
    print("  ```")
    if r.get("access") == "cache-buster":
        print(f"  ⚠️  原 URL 命中缓存 404，使用 cache-buster: {r.get('original_url')}")
    elif r.get("access") == "failed":
        print(f"  ❌ URL 不可访问: {r.get('access_error')}")


# ── 主入口 ────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(
        description="R2 通用上传工具 (Cloudflare R2, 零依赖, 支持任意 bucket)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""示例:
  %(prog)s /path/to/image.png                       # 传到配置里的默认 bucket
  %(prog)s app.user.js --bucket assets --format original # 指定 bucket + 保留原名
  %(prog)s a.zip b.pdf -j 8                          # 批量并发
  %(prog)s --url https://example.com/x.jpg
  %(prog)s --base64 "$(pbpaste | base64)" --ext .png
  cat image.png | %(prog)s - --name shot.png
  %(prog)s x.png --json                              # JSON 输出
  %(prog)s x.png --verify                            # 上传后检测可访问性""")
    p.add_argument("source", nargs="*", help="本地文件路径或远程 URL（可多个）")
    p.add_argument("-", dest="stdin", action="store_true", help="从 stdin 读取数据")
    p.add_argument("--url", action="append", default=[], help="远程 URL（可多次指定）")
    p.add_argument("--base64", help="Base64 编码数据")
    p.add_argument("--bucket", help="目标 bucket（默认取配置里的 bucketName）")
    p.add_argument("--base-url", dest="base_url",
                   help="公开访问域名前缀（覆盖 bucketDomains 映射，如 https://cdn.example.com）")
    p.add_argument("--name", help="自定义远端文件名 (不含路径)")
    p.add_argument("--path", default=None,
                   help="远端子目录（默认：默认桶用配置的 uploadPath，其它桶用根目录）")
    p.add_argument("--ext", default=".png", help="base64/stdin 模式下的扩展名 (默认 .png)")
    p.add_argument("--content-type", dest="content_type", help="覆盖自动推断的 Content-Type")
    p.add_argument("--format", default="auto",
                   choices=["auto", "ts-hash", "ts-hash-name", "ts", "ts-ms", "original"],
                   help="远端文件名格式 (默认 auto；original=保留原文件名)")
    p.add_argument("-j", "--jobs", type=int, default=4, help="批量并发数 (默认 4)")
    p.add_argument("--quiet", action="store_true", help="只输出 URL（批量时每行一个）")
    p.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    p.add_argument("--verify", action="store_true", help="上传后检测 URL 可访问性（默认关闭，最快）")
    p.add_argument("--no-verify", dest="no_verify", action="store_true", help="(兼容保留) 跳过检测")
    args = p.parse_args()

    if not (args.source or args.url or args.base64 or args.stdin):
        p.error("需要至少一个上传来源")

    base_cfg = load_config()
    BUCKET_DOMAINS.update(base_cfg.get("bucketDomains") or {})
    cfg = dict(base_cfg)
    base_bucket = base_cfg["bucketName"]

    # 目标桶
    if args.bucket:
        cfg["bucketName"] = args.bucket
    # Content-Type 覆盖
    if args.content_type:
        cfg["_ctype_override"] = args.content_type
    # 远端目录：显式 --path 直接覆盖配置里的 uploadPath（不再与 subdir 叠加）
    if args.path is not None:
        cfg["uploadPath"] = args.path
    elif cfg["bucketName"] != base_bucket:
        cfg["uploadPath"] = ""
    # 公开访问域名
    base = args.base_url or BUCKET_DOMAINS.get(cfg["bucketName"])
    if base:
        cfg["urlPrefix"] = base.rstrip("/")
    else:
        cfg["urlPrefix"] = cfg["endpoint"].rstrip("/") + "/" + cfg["bucketName"]
        cfg["_s3_url"] = True
    cfg["disableBucketPrefixToURL"] = True

    client = make_client(cfg)
    verify = args.verify and not args.no_verify

    # 收集任务
    tasks = []
    fmt = args.format
    for src in args.source:
        if src == "-" or args.stdin:
            tasks.append(("stdin", {"custom_name": args.name, "subdir": "",
                                    "ext": args.ext, "fmt": fmt}, "<stdin>"))
            args.stdin = False
        elif src.startswith("http://") or src.startswith("https://"):
            tasks.append(("url", {"url": src, "custom_name": args.name,
                                  "subdir": "", "fmt": fmt}, src))
        else:
            tasks.append(("local", {"local_path": src, "custom_name": args.name,
                                    "subdir": "", "fmt": fmt}, src))
    for u in args.url:
        tasks.append(("url", {"url": u, "custom_name": args.name,
                              "subdir": "", "fmt": fmt}, u))
    if args.base64:
        tasks.append(("base64", {"b64_data": args.base64, "ext": args.ext,
                                 "custom_name": args.name, "subdir": "",
                                 "fmt": fmt}, "<base64>"))

    def run(task):
        kind, kwargs, label = task
        try:
            if kind == "local":
                r = upload_local(client, cfg, **kwargs)
            elif kind == "url":
                r = upload_from_url(client, cfg, **kwargs)
            elif kind == "base64":
                r = upload_base64(client, cfg, **kwargs)
            else:
                r = upload_stdin(client, cfg, **kwargs)
            r["source"] = label
            if cfg.get("_s3_url"):
                r["url_note"] = "S3 endpoint URL（需签名，非公开域名）"
            if verify:
                r = verify_and_add_cache_buster(r, cfg)
            return ("ok", r, label)
        except ClientError as e:
            return ("err", {"source": label, "error": f"R2 上传失败: {e}",
                            "code": e.response.get("Error", {}).get("Code", "?")}, label)
        except Exception as e:
            return ("err", {"source": label, "error": str(e)}, label)

    # 执行（>1 个任务时并发）
    jobs = max(1, min(args.jobs, len(tasks) or 1))
    if jobs > 1 and len(tasks) > 1:
        with ThreadPoolExecutor(max_workers=jobs) as ex:
            outs = [f.result() for f in [ex.submit(run, t) for t in tasks]]
    else:
        outs = [run(t) for t in tasks]

    results, errors = [], []
    for i, (st, r, label) in enumerate(outs, 1):
        if st == "ok":
            results.append(r)
            if not args.json and not args.quiet:
                total = len(tasks)
                human_print_result(r, i if total > 1 else None, total if total > 1 else None)
        else:
            errors.append(r)
            if not args.json:
                print(f"[{i}/{len(tasks)}] ✗ {label}: {r['error']}", file=sys.stderr)

    if args.json:
        print(json.dumps({"success": len(results), "failed": len(errors),
                          "bucket": cfg["bucketName"], "results": results,
                          "errors": errors}, ensure_ascii=False, indent=2))
    elif args.quiet:
        for r in results:
            print(r["url"])
        for e in errors:
            print(f"# ERROR {e['source']}: {e['error']}", file=sys.stderr)
    elif len(tasks) > 1:
        print("─" * 50)
        print(f"批量上传完成: 成功 {len(results)} / 失败 {len(errors)} / 共 {len(tasks)}")

    sys.exit(0 if not errors else (2 if len(errors) == len(tasks) else 0))


if __name__ == "__main__":
    main()
