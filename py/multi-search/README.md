# multi-search — 统一多源搜索 CLI

一个命令调多个搜索后端，输出统一格式。纯标准库、零依赖、provider 式可扩展，适合塞进脚本、定时任务或 Agent 工具链。

## 已接入（11 个 provider / 25 个子功能）

| provider | 用途 | 凭据 | 备注 |
|---|---|---|---|
| `web` | Tavily 实时检索（含 `--usage` 查额度） | `TAVILY_API_KEY` | 支持 `--answer` `--news` `--days` `--include-domain` `--depth` |
| `extract` | Tavily 从已知 URL 提取正文（1–20 个） | 同上 | 已有链接、只要干净正文 |
| `crawl` | Tavily 从根 URL 爬站 | 同上 | = Map + Extract |
| `map` | Tavily 站点 URL 结构 | 同上 | 只返回 URL 列表 |
| `bocha` | 博查 Web / AI 搜索 | `BOCHA_API_KEY` | `--mode ai` 走 AI 搜索；两者额度独立 |
| `github` | GitHub Search API | `GH_TOKEN` / `GITHUB_TOKEN` | `repos` `code` `issues` `users` `commits` |
| `zhihu` | 知乎开放平台 | `ZHIHU_ACCESS_SECRET` | `search` `global` `hot` `zhida` |
| `scriptcat` | 脚本猫用户脚本搜索 | 免 | 直连常不通，可配 `SCRIPTCAT_PROXY` |
| `crxsoso` | Chrome/Edge/Firefox 扩展 + 微软商店离线包 | 免 | 支持 `--pages` 自动翻页、`--best` 只出最佳匹配 |
| `uapi` | UAPI 聚合平台（搜索 + 110+ 工具接口） | `UAPI_KEY` | `uapi search "q"` / `uapi call <path>` |
| `tinyfish` | TinyFish 免费 Web Search / Fetch | `TINYFISH_API_KEY` | 免费额度较大，适合批量抓取 |

## 依赖

```bash
python3 --version     # 3.8+
# 无第三方包
```

## 配置

只需要按用到的 provider 配环境变量：

```bash
export TAVILY_API_KEY=tvly-xxx        # https://tavily.com
export BOCHA_API_KEY=sk-xxx           # https://open.bochaai.com
export GH_TOKEN=ghp_xxx               # GitHub 只读 PAT 即可
export ZHIHU_ACCESS_SECRET=xxx        # 知乎开放平台
export UAPI_KEY=xxx                   # https://uapis.cn
export TINYFISH_API_KEY=xxx           # https://tinyfish.ai

# 可选：scriptcat.org 连不通时，自建反代（如 Cloudflare Worker）指过去
export SCRIPTCAT_PROXY=https://your-proxy.example.com/scriptcat.org
```

`scriptcat` 与 `crxsoso` 免凭据，clone 下来就能用。

## 用法

```bash
python3 search.py providers           # 列出已接入 provider
python3 search.py cheatsheet          # 意图 → 命令 速查
python3 search.py --help

# 公网检索
python3 search.py web "Python 3.14 新特性"
python3 search.py web "xxx" --news --days 3 --depth advanced --json

# 已知链接抽正文 / 爬站
python3 search.py extract https://example.com/a https://example.com/b
python3 search.py crawl https://docs.example.com
python3 search.py map https://docs.example.com

# 中文语义搜索
python3 search.py bocha "最近发布的国产大模型"
python3 search.py bocha "今天北京天气" --mode ai

# 生态搜索
python3 search.py github repos "cloudflare worker kv" --json
python3 search.py zhihu search "如何学习 Linux 网络"
python3 search.py zhihu hot --limit 20
python3 search.py scriptcat "网盘" --page 2 --sort createtime
python3 search.py crxsoso microsoft "微信" --pages 3 --best

# 免费网页抓取
python3 search.py tinyfish fetch https://example.com --format markdown
```

任意子命令加 `--json` 输出原始 JSON，便于 `jq` 或程序解析。

## 扩展新的搜索后端

1. 在 `search.py` 里写一个 `run_xxx(argv)` 函数（用 `argparse` 解析自己的参数，返回 exit code）
2. 注册进文件底部的 `PROVIDERS` 字典
3. 在 `cheatsheet` 的清单里加一行
4. 再在 `SKILL.md`/README 的 provider 表里补一行

HTTP 请求统一走 `_req(url, method, headers, body)`，返回 `(status, json)`，`status=0` 表示网络层异常。

## 注意

- 各平台限流不同：Tavily 免费额度按次计、博查 web 与 ai 搜索额度独立、GitHub 未认证 60 次/小时（认证后 5000）。
- `scriptcat` 的自动回退只在配了 `SCRIPTCAT_PROXY` 时生效；没有反代则只直连。
- `crxsoso` 翻页的续页字段各商店不同（`nextToken` / `nextPageNo` / `cursor`），已按商店自动选择。
- 输出默认中文友好（时间本地化、字段对齐）；`--json` 保留原始字段不改写。

## License

MIT，见 [../LICENSE](../LICENSE)。
