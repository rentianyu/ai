# cloudflare — Cloudflare API 命令行工具

一个 Python 脚本管理 Cloudflare 的常用面：Zones、DNS、Email Routing、Pages（项目 / 部署 / 环境变量 / 自定义域）、Workers（部署 / 自定义域 / 媒体服务）、KV、D1、R2（桶与对象）、Redirect Rules、Analytics。

比 `wrangler` 覆盖面更偏「账号级资源管理」：D1 建库与查表、KV 读写、R2 桶、Pages 环境变量、Workers 自定义域，都是纯 HTTP API 调用，**核心功能零第三方依赖**。

## 依赖

```bash
# 什么都不用装（只用标准库 urllib/json）
# 只有 R2「对象上传 / 下载」用到 boto3，脚本会自动尝试 pip 安装：
pip install boto3
```

Python 3.8+。

## 准备凭据（三选一）

| 方式 | 说明 | 适用 |
|---|---|---|
| A. API Token | 环境变量 `CLOUDFLARE_API_TOKEN` | 推荐，权限可最小化 |
| B. Global API Key | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` | 少数账号级接口只认它（见下） |
| C. 配置文件 | `~/.config/cloudflare-cli/cloudflare.env` | 常驻使用，KEY=value 每行一项 |

也可以用 `CLOUDFLARE_ENV_FILE=/any/path.env` 指向别的文件。

| 变量 | 必需性 | 用途 |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | 账号级命令必需 | 账号 ID（Dashboard 首页右侧） |
| `CLOUDFLARE_API_TOKEN` | 方式 A | API Token |
| `CLOUDFLARE_API_KEY` / `CLOUDFLARE_EMAIL` | 方式 B | Global API Key + 账号邮箱 |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY` / `CLOUDFLARE_R2_ENDPOINT` | 仅 R2 对象操作 | S3 兼容凭据 |
| `CLOUDFLARE_BASE_URL` | 可选 | 默认 `https://api.cloudflare.com/client/v4` |

Token 创建：<https://dash.cloudflare.com/profile/api-tokens>，按命令所需给最小权限（例：只查 DNS 就只给 `Zone > DNS > Read`）。权限不足时脚本会打印「缺哪个权限、去哪补」。

> **Global API Key 的例外**：`workers domains add`（给 Worker 绑自定义域）用 API Token 调用会返回 `10405 Method not allowed for this authentication scheme`，必须换成 Global API Key。

## 用法

```bash
python3 cloudflare.py            # 打印完整命令表
python3 cloudflare.py <command> [args...]
```

### 命令表

| 组 | 子命令 |
|---|---|
| `verify` | 校验当前凭据 |
| `zones` | `list` / `get <zone_id>` / `find <domain>` / `create <domain> [full\|partial]` / `delete <zone_id>` |
| `dns` | `list <zone_id>` / `create <zone_id> <type> <name> <content> [ttl] [proxied] [priority]` / `update ...` / `delete <zone_id> <record_id>` |
| `email` | `<domain>` / `enable` / `disable` / `addresses` / `address add\|delete` / `rules` / `rule add <domain> <from> <to>` / `catchall <domain> [<to>\|drop]` |
| `pages` | `list` / `get <project>` / `domains` / `domain add\|delete` / `env list\|set\|delete` |
| `workers` | `list` / `get` / `delete` / `deploy <name> <script.js>` / `subdomain` / `domains` / `domains add <host> <zone_id> <service> [env]` / `media <name> <r2-bucket>` |
| `kv` | `namespaces` / `keys <ns_id> [prefix]` / `get <ns_id> <key>` / `put <ns_id> <key> <value> [ttl]` / `delete` |
| `d1` | `list` / `create` / `get` / `delete` / `query <db_id> <sql> [--params JSON]` / `file` / `tables` / `export` / `timetravel` / `restore` |
| `r2` | `list` / `create <name> [location]` / `get` / `delete` / `objects <bucket> [prefix]` |
| `redirects` | `list <zone_id>` / `www <zone_id> <domain>` / `delete <zone_id> <rule_id>` |
| `analytics` | `<domain> [days]` / `traffic` / `paths` / `countries` / `status` |

### 示例

```bash
# 找 zone
python3 cloudflare.py zones find example.com

# 加一条 A 记录（代理开启，TTL 自动）
python3 cloudflare.py dns create <zone_id> A www 192.0.2.1 1 true

# Pages 加一个加密环境变量
python3 cloudflare.py pages env set my-project API_KEY <value> production --secret

# D1 查表
python3 cloudflare.py d1 tables <db_id>
python3 cloudflare.py d1 query <db_id> "SELECT name FROM sqlite_master LIMIT 5"

# KV 读写
python3 cloudflare.py kv put <ns_id> greeting hello 3600
python3 cloudflare.py kv get <ns_id> greeting

# 给 Worker 绑自定义域（需要 Global API Key）
python3 cloudflare.py workers domains add app.example.com <zone_id> my-worker production

# 七天流量概况
python3 cloudflare.py analytics example.com 7
```

## 注意

- `delete` / `d1 restore` 是**破坏性**操作：删 zone 不会自动解绑其上的 Worker / Pages 自定义域，会留下孤儿绑定，建议先 `workers domains`、`pages domains` 核对。
- `d1 restore` 基于 timetravel bookmark，先 `d1 timetravel <db_id>` 取可回滚点。
- `r2 objects` 只列对象；上传 / 下载对象需要 S3 凭据 + boto3。
- 退出码 0 成功、非 0 失败，可直接放进 cron / CI。

## 许可

MIT
