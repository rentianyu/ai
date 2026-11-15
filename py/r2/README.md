# r2 — 零依赖的 Cloudflare R2 客户端与上传工具

用系统自带的 `curl --aws-sigv4` 做 SigV4 签名，**不装 boto3**（其闭包约 16MB）。

| 文件 | 作用 |
|---|---|
| [r2s3.py](r2s3.py) | S3 客户端实现，可当库用：`put_object` / `head_object` / `get_object` / `delete_objects` / `list_objects_v2` 分页 |
| [r2_upload.py](r2_upload.py) | 命令行工具：批量/并发上传、自动 Content-Type、生成访问 URL、可选访问性检测 |
| [config.example.json](config.example.json) | 配置模板 |

## 为什么要造这个

只为往 R2 传几个文件就装 botocore 不划算：CI 镜像变大、冷启动变慢、依赖还容易被上游破坏。curl 7.75+ 自带 SigV4 签名能力，光这一条就能覆盖 put/list/get/delete 的全部日常需求。

## 依赖

```bash
curl --version        # 需要 >= 7.75（有 --aws-sigv4）
python3 --version     # 3.8+
```

无第三方 Python 包。

## 配置

```bash
mkdir -p ~/.config/r2-upload
cp config.example.json ~/.config/r2-upload/config.json
chmod 600 ~/.config/r2-upload/config.json
```

```json
{
  "endpoint": "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
  "accessKeyID": "<R2_ACCESS_KEY_ID>",
  "secretAccessKey": "<R2_SECRET_ACCESS_KEY>",
  "bucketName": "my-bucket",
  "uploadPath": "img/",
  "urlPrefix": "https://cdn.example.com",
  "bucketDomains": {
    "my-bucket": "https://cdn.example.com",
    "assets": "https://assets.example.com"
  }
}
```

| 字段 | 必需 | 说明 |
|---|---|---|
| `endpoint` | ✅ | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `accessKeyID` / `secretAccessKey` | ✅ | Dashboard → R2 → Manage R2 API Tokens |
| `bucketName` | ✅ | 默认桶 |
| `uploadPath` | — | 默认上传前缀，如 `img/` |
| `urlPrefix` | — | 默认桶的公开访问域名 |
| `bucketDomains` | — | 桶 → 域名映射，多桶时用 |

配置查找顺序：`R2_CONFIG` → `~/.config/r2-upload/config.json` → 脚本同目录 `config.json`。
环境变量 `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` 优先级最高（适合 CI）。
也支持把凭据单独放一个文件，用 `R2_CREDS_FILE` 指过去，配置文件里就不留明文。

## 当命令行用

```bash
# 单文件
python3 r2_upload.py ./a.png
# → https://cdn.example.com/img/20261025-a1b2c3.png

# 批量并发
python3 r2_upload.py a.png b.jpg c.svg -j 8

# 保留原文件名
python3 r2_upload.py app.user.js --format original

# 指定桶（用 bucketDomains 里配的域名出 URL）
python3 r2_upload.py app.user.js --bucket assets --format original

# 自定义子目录 / 文件名 / Content-Type
python3 r2_upload.py a.png --path blog/2026 --name cover.png --content-type image/png

# 从 URL / Base64 / stdin 上传
python3 r2_upload.py --url https://example.com/x.jpg
python3 r2_upload.py --base64 "$(base64 -w0 x.png)" --ext .png
cat x.png | python3 r2_upload.py - --name shot.png

# 输出控制
python3 r2_upload.py a.png --quiet      # 只打印 URL
python3 r2_upload.py a.png --json       # 结构化结果
python3 r2_upload.py a.png --verify     # 上传后检测 URL 是否可访问
```

`--format` 取值：`auto`（默认，按扩展名判断，图片等走时间戳命名）、`ts-hash`、`ts-hash-name`、`ts`、`ts-ms`、`original`（保留原文件名）。

## 当库用

```python
from r2s3 import load_config, make_client

cfg = load_config()
c = make_client(cfg)

c.put_object(Bucket="my-bucket", Key="a/b.png",
             BodyPath="/tmp/b.png", ContentType="image/png")

for page in c.get_paginator("list_objects_v2").paginate(Bucket="my-bucket", Prefix="a/"):
    for obj in page["Contents"]:
        print(obj["Key"], obj["Size"])
```

`put_object` 的 `BodyPath` 直接喂本地文件路径，不落临时文件、不读进内存——传大文件不会撑爆 RAM。

## 注意

- **R2 的 S3 端点不对外公开访问**。想要可点开的链接，得给桶绑自定义域（或开 r2.dev 公开域名），并把域名填进 `urlPrefix` / `bucketDomains`；不填也能上传，只是输出的 URL 打不开。
- `curl --aws-sigv4` 要求 7.75+，CentOS 7 自带的 7.29 不支持，需装新版或改用 `--verify` 之外的方式。
- 只实现了日常够用的子集：没有 multipart 分片上传（单次 PUT 上限 5GB）、没有 ACL/生命周期管理、没有对象版本。超大文件请用 `rclone` 或 `aws s3 cp`。
- 签名区域固定 `auto`（R2 的要求），换其他 S3 兼容存储需改 `_Client` 里的 `--aws-sigv4` 参数。

## License

MIT，见 [../LICENSE](../LICENSE)。
