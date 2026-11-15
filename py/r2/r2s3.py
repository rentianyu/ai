#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
r2s3.py — Cloudflare R2 的零依赖 S3 客户端（用 curl --aws-sigv4 做 SigV4 签名）

为什么不用 boto3：boto3 + botocore 闭包约 16MB，只为传几个文件不值当，CI 里也拖慢构建。
本文件让系统自带的 curl 负责签名与传输，**零第三方依赖**，200 行可读可改。

暴露 boto3 里最常用的那一小撮接口（覆盖绝大多数场景）：
    client.put_object(Bucket=, Key=, Body=/BodyPath=, ContentType=)
    client.head_object / get_object / delete_objects
    client.get_paginator("list_objects_v2").paginate(Bucket=, Prefix=)
    ClientError（.response["Error"]["Code"]）

特性：
  - Bucket 逐次生效（覆盖构造时的默认桶），同一账号下可操作任意桶
  - put_object 支持 Body(bytes) 或 BodyPath(本地文件，直传、不落临时文件)
  - 一次 PUT 完成，无多余请求

==================================================================
依赖
==================================================================
curl >= 7.75（需要 --aws-sigv4，`curl --version` 自查）+ Python 3.8+

==================================================================
预先填写：配置文件（JSON）
==================================================================
查找顺序：环境变量 R2_CONFIG → ~/.config/r2-upload/config.json → 脚本同目录 config.json

必填：
    {
      "endpoint": "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
      "accessKeyID": "<R2 Access Key ID>",
      "secretAccessKey": "<R2 Secret Access Key>",
      "bucketName": "my-bucket"
    }
可选：
    "urlPrefix": "https://cdn.example.com"   # 公开访问域名（r2_upload 用它拼 URL）
    "uploadPath": "img/"                     # 默认上传前缀

凭据在 Cloudflare Dashboard → R2 → Manage R2 API Tokens 创建。
也可用环境变量覆盖（优先级更高）：
    R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET

==================================================================
当成库用
==================================================================
    from r2s3 import load_config, make_client

    cfg = load_config()
    c = make_client(cfg)
    c.put_object(Bucket="my-bucket", Key="a/b.png",
                 BodyPath="/tmp/b.png", ContentType="image/png")
    for page in c.get_paginator("list_objects_v2").paginate(Bucket="my-bucket", Prefix="a/"):
        for obj in page["Contents"]:
            print(obj["Key"], obj["Size"])

命令行上传（批量 / 并发 / 自动 Content-Type / 生成 URL）用同目录的 r2_upload.py。
"""
import base64
import hashlib
import json
import os
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

def _config_candidates():
    """配置文件候选路径，按优先级排序"""
    out = []
    if os.environ.get("R2_CONFIG"):
        out.append(Path(os.environ["R2_CONFIG"]))
    out.append(Path(os.path.expanduser("~/.config/r2-upload/config.json")))
    out.append(Path(__file__).resolve().parent / "config.json")
    return out


class Config:  # boto3 Config 的兼容占位（签名版本固定 s3v4）
    def __init__(self, **kw):
        pass


class ClientError(Exception):
    """模拟 botocore.exceptions.ClientError：.response["Error"]["Code"]"""
    def __init__(self, resp):
        self.response = resp
        super().__init__(str(resp))


def load_config():
    """读配置：R2_CONFIG → ~/.config/r2-upload/config.json → 脚本同目录 config.json

    环境变量优先于文件（便于 CI 与临时覆盖，不必把密钥写进文件）。
    """
    cfg_path = next((p for p in _config_candidates() if p.exists()), None)
    if cfg_path is None:
        raise SystemExit("找不到配置文件：请设置 R2_CONFIG，或写入 ~/.config/r2-upload/config.json"
                         "（字段见脚本头部说明）")
    with open(cfg_path, encoding="utf-8") as f:
        cfg = json.load(f)

    for env_key, cfg_key in (("R2_ENDPOINT", "endpoint"),
                             ("R2_ACCESS_KEY_ID", "accessKeyID"),
                             ("R2_SECRET_ACCESS_KEY", "secretAccessKey"),
                             ("R2_BUCKET", "bucketName")):
        if os.environ.get(env_key):
            cfg[cfg_key] = os.environ[env_key]

    # 可选：把凭据单独放一个文件（600 权限单管），配置文件里就不留明文
    creds_path = os.environ.get("R2_CREDS_FILE")
    if creds_path and os.path.exists(creds_path):
        with open(creds_path, encoding="utf-8") as f:
            creds = json.load(f)
        for k in ("accessKeyID", "secretAccessKey", "endpoint"):
            if not cfg.get(k) and creds.get(k):
                cfg[k] = creds[k]

    for k in ("endpoint", "accessKeyID", "secretAccessKey"):
        if not cfg.get(k):
            raise SystemExit("配置缺少必填字段 %s（见脚本头部说明）" % k)
    cfg.setdefault("bucketName", "")
    return cfg


def _parse_lm(s):
    if not s:
        return None
    s = s.strip()
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except ValueError:
        return datetime.now(timezone.utc)


def _xmlesc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _local(tag):
    return tag.rsplit("}", 1)[-1]


class _Paginator:
    def __init__(self, client):
        self.c = client

    def paginate(self, Bucket=None, Prefix=""):
        token = None
        while True:
            qs = "list-type=2&max-keys=1000"
            if Prefix:
                qs += "&prefix=" + quote(Prefix, safe="")
            if token:
                qs += "&continuation-token=" + quote(token, safe="")
            code, data = self.c._req("GET", self.c._url(qs=qs, bucket=Bucket))
            if code != 200:
                raise ClientError({"Error": {"Code": str(code),
                                             "Message": data[:300].decode("utf-8", "ignore")}})
            root = ET.fromstring(data)
            contents, trunc, token = [], None, None
            for el in root:
                n = _local(el.tag)
                if n == "Contents":
                    rec = {}
                    for c in el:
                        rec[_local(c.tag)] = (c.text or "")
                    contents.append({
                        "Key": rec.get("Key", ""),
                        "Size": int(rec.get("Size") or 0),
                        "LastModified": _parse_lm(rec.get("LastModified")),
                    })
                elif n == "IsTruncated":
                    trunc = el.text
                elif n == "NextContinuationToken":
                    token = el.text
            yield {"Contents": contents}
            if trunc != "true" or not token:
                break


class _Client:
    def __init__(self, cfg):
        self.cfg = cfg
        self.ep = cfg["endpoint"].rstrip("/")
        self.bucket = cfg["bucketName"]
        self._auth = ["--aws-sigv4", "aws:amz:auto:s3", "--user",
                      "%s:%s" % (cfg["accessKeyID"], cfg["secretAccessKey"])]

    def _url(self, key=None, qs="", bucket=None):
        u = "%s/%s" % (self.ep, bucket or self.bucket)
        if key is not None:
            u += "/" + quote(key, safe="/~")
        if qs:
            u += "?" + qs
        return u

    def _req(self, method, url, headers=None, body_path=None):
        out = tempfile.NamedTemporaryFile(delete=False)
        out.close()
        cmd = ["curl", "-sS", "-o", out.name, "-w", "%{http_code}",
               "-X", method] + self._auth + ["--url", url]
        for h in (headers or []):
            cmd += ["-H", h]
        if body_path:
            cmd += ["--data-binary", "@" + body_path]
        r = subprocess.run(cmd, capture_output=True, text=True)
        data = b""
        try:
            with open(out.name, "rb") as f:
                data = f.read()
        finally:
            os.unlink(out.name)
        if r.returncode != 0:
            raise ClientError({"Error": {"Code": "CurlError",
                                         "Message": r.stderr.strip() or "curl 执行失败"}})
        return int((r.stdout or "0").strip() or 0), data

    # ── 对外 API ─────────────────────────────────────────────
    def put_object(self, Bucket=None, Key=None, Body=None, BodyPath=None,
                   ContentType=None, ACL=None, **kw):
        headers = []
        if ContentType:
            headers.append("Content-Type: " + ContentType)
        if ACL:
            headers.append("x-amz-acl: " + ACL)
        tmpname = None
        if BodyPath is not None:
            path = BodyPath                      # 直传：curl 直接从本地文件读
        else:
            tmp = tempfile.NamedTemporaryFile(delete=False)
            tmp.write(Body if Body is not None else b"")
            tmp.close()
            path = tmpname = tmp.name
        try:
            code, data = self._req("PUT", self._url(Key, bucket=Bucket), headers, path)
        finally:
            if tmpname:
                os.unlink(tmpname)
        if code not in (200, 201):
            raise ClientError({"Error": {"Code": str(code),
                                         "Message": data[:300].decode("utf-8", "ignore")}})
        return {"ResponseMetadata": {"HTTPStatusCode": code}}

    def head_object(self, Bucket=None, Key=None, **kw):
        code, data = self._req("HEAD", self._url(Key, bucket=Bucket))
        if code != 200:
            raise ClientError({"Error": {"Code": str(code), "Message": "head failed"}})
        return {"ResponseMetadata": {"HTTPStatusCode": code}}

    def get_paginator(self, name):
        if name != "list_objects_v2":
            raise ValueError("仅支持 list_objects_v2")
        return _Paginator(self)

    def delete_objects(self, Bucket=None, Delete=None, **kw):
        objs = (Delete or {}).get("Objects", [])
        if not objs:
            return {"Deleted": []}
        body = "<Delete>" + "".join(
            "<Object><Key>%s</Key></Object>" % _xmlesc(o["Key"]) for o in objs) + "</Delete>"
        b = body.encode("utf-8")
        md5 = base64.b64encode(hashlib.md5(b).digest()).decode()
        tmp = tempfile.NamedTemporaryFile(delete=False)
        tmp.write(b)
        tmp.close()
        try:
            code, data = self._req("POST", self._url(qs="delete", bucket=Bucket),
                                   ["Content-MD5: " + md5,
                                    "Content-Type: application/xml"], tmp.name)
        finally:
            os.unlink(tmp.name)
        if code not in (200, 204):
            raise ClientError({"Error": {"Code": str(code),
                                         "Message": data[:300].decode("utf-8", "ignore")}})
        return {"Deleted": [{"Key": o["Key"]} for o in objs]}


def make_client(cfg):
    """按 cfg（含 endpoint/accessKeyID/secretAccessKey/bucketName）构造客户端。"""
    return _Client(cfg)
