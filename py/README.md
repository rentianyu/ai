# py — Python 命令行工具

自用的命令行工具集，一个项目一个目录，每个目录自带 README。

| 项目 | 功能 | 额外依赖 | 目录 |
|---|---|---|---|
| **cloudflare** | Cloudflare 全功能 CLI：DNS / Email Routing / Pages / Workers / KV / D1 / R2 / Analytics | 无（仅 R2 对象操作需 boto3） | [cloudflare/](cloudflare/) |
| **notion** | Notion 页面与块的读写：Markdown ⇄ Notion 块、整页树导出、逐块改删 | 无 | [notion/](notion/) |
| **weather-card** | 彩云天气 → 竖版表格图 → 企业微信群机器人（单城 / 双城对比） | matplotlib（双城另需 Pillow） | [weather-card/](weather-card/) |
| **ipban** | 按天统计 Web / SSH 探测行为，达阈值即永久封禁（nft + nginx 双层） | 无（系统需 nft / nginx） | [ipban/](ipban/) |
| **multi-search** | 11 个搜索后端的统一 CLI：Tavily / 博查 / 知乎 / GitHub / 脚本猫 / crxsoso / UAPI / TinyFish … | 无 | [multi-search/](multi-search/) |
| **r2** | 零依赖 R2 客户端与上传工具：用 curl 实现 SigV4，替代 boto3 | 无（需 curl ≥ 7.75） | [r2/](r2/) |

## 通用约定

- **凭据不落盘在脚本里**：一律走环境变量或 `~/.config/<tool>/`，脚本只读不写。
- **每个脚本头部就是完整文档**：依赖、需要预先填什么、用法、示例都在文件开头的 docstring 里，`python3 <脚本>` 不带参数会打印帮助。
- **失败要能被 cron 发现**：非 0 退出码表示失败。
- 只用标准库能做的就不引第三方包；必须引的会在 README 和脚本头注明。

## 环境

Python 3.8+。多数脚本可在 Debian / Ubuntu / 容器 / 路由器（需装 Python）上直接跑。

## 许可

MIT
