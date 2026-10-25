# ai

个人自用脚本合集。按脚本类型分目录，每个类型下按项目建子目录，每个项目自带 README。

## 目录树

```
ai/
├── js/                          浏览器用户脚本（Tampermonkey / ScriptCat）
│   ├── text-link-clickable.user.js
│   ├── always-show-password.user.js
│   ├── cookie-viewer.user.js
│   ├── page-to-webhook.user.js
│   ├── ai-summary-push.user.js
│   ├── notion-clip.user.js
│   └── edgeever-clip.user.js
│
├── py/                          Python 命令行工具（多数零第三方依赖）
│   ├── cloudflare/
│   ├── notion/
│   ├── ipban/
│   ├── multi-search/
│   ├── r2/
│   └── weather-card/
│
├── sh/                          POSIX shell（兼容 dash / busybox）
│   ├── opsq/
│   └── install/
│
└── win/                         Windows PowerShell 5.1
    └── rpm-centos7/
```

## 项目一览

### js — 浏览器用户脚本

脚本管理器「从 URL 安装」，地址规则 `https://f.xbta.cc/ai/js/<文件名>`。版本与安装地址见 [js/README.md](js/README.md)。

| 脚本 | 作用 |
|---|---|
| [text-link-clickable.user.js](js/text-link-clickable.user.js) | 纯文本链接自动变可点击，不需要手动复制粘贴 |
| [always-show-password.user.js](js/always-show-password.user.js) | 密码框永久显示明文，省掉点小眼睛 |
| [cookie-viewer.user.js](js/cookie-viewer.user.js) | 查看 / 复制当前站点的 cookie |
| [page-to-webhook.user.js](js/page-to-webhook.user.js) | 一键推送网页标题 + 网址到企业微信 / 钉钉 / 飞书 / 自定义 webhook |
| [ai-summary-push.user.js](js/ai-summary-push.user.js) | 用 AI 摘要正文后推到企微群（自带正文提取） |
| [notion-clip.user.js](js/notion-clip.user.js) | 网页剪藏到 Notion（Readability 提正文 + Markdown 转块，支持论坛与数据库目标） |
| [edgeever-clip.user.js](js/edgeever-clip.user.js) | 网页剪藏到 EdgeEver（含飞书文档解析、图片转存为笔记资源） |

### py — Python 命令行工具

下载对应目录后直接 `python3 <脚本>`，依赖、凭据与用法写在脚本头部注释。总览见 [py/README.md](py/README.md)。

| 项目 | 作用 | 依赖 |
|---|---|---|
| [cloudflare/](py/cloudflare/) | Cloudflare 全功能 CLI：Zones / DNS / Email Routing / Pages / Workers / KV / D1 / R2 / Analytics，出错时给修复提示 | 无（仅 R2 对象操作需 boto3） |
| [notion/](py/notion/) | Notion 页面与块读写：Markdown ⇄ Notion 块、整页树递归导出、逐块改删 | 无 |
| [ipban/](py/ipban/) | 按天统计 Web / SSH 探测行为，达阈值即永久封禁；nft + nginx 双层，含 systemd 单元与 nftables 片段 | 无（系统需 nft / nginx） |
| [multi-search/](py/multi-search/) | 11 个搜索后端的统一 CLI：Tavily / 博查 / 知乎 / GitHub / 脚本猫 / crxsoso / UAPI / TinyFish，支持 `--json` | 无 |
| [r2/](py/r2/) | 零依赖 Cloudflare R2 客户端与上传工具：用 `curl --aws-sigv4` 实现 SigV4，替代 boto3 | 无（需 curl ≥ 7.75） |
| [weather-card/](py/weather-card/) | 彩云天气 → 竖版表格图 → 企业微信群机器人；单城表与双城对比两款版式 | matplotlib（双城另需 Pillow） |

### sh — POSIX shell

一行安装，见 [sh/README.md](sh/README.md)。

| 项目 | 作用 |
|---|---|
| [opsq/](sh/opsq/) | Linux 统一运维查询入口：一个开关 + 一个值查 端口 / PID / UID / 进程名 / 文件 / 服务 / 定时任务，另带笔记本、日志检索、快照对比、自检；参数顺序不限，busybox 自动降级 |
| [install/](sh/install/) | `opsq` 的安装与升级器：列清单 / 交互选择 / 直接安装 / 指定路径 |

```bash
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh -s opsq
```

### win — Windows PowerShell

| 项目 | 作用 |
|---|---|
| [rpm-centos7/](win/rpm-centos7/) | CentOS 7 离线 RPM 包及全部传递依赖下载器：解析镜像 `repodata`，不需要 rpm / yum / WSL，下载完生成 `install.sh` |

## 仓库机制

- `js/`、`win/`、`sh/` 下的文件在每次 push 后自动同步到 `https://f.xbta.cc/ai/`（见 `.github/workflows/r2-sync.yml`），路径与仓库一致
- `py/` 是普通源码目录，不参与该同步，直接从仓库取用
- 目录重构前的旧地址（`ai/sh/opsq.sh`、`ai/sh/install.sh`、`ai/win/rpm-centos7.ps1`）保留为兼容别名，老用户的更新链路不受影响
- 同步完成后，仓库提交历史会压平为单个快照提交

## 约定

- 脚本作者统一署名「小贝塔」
- 每个类型目录下按项目建子目录（`<类型>/<项目>/`：脚本 + 该项目的 README）
- 脚本自包含，不引入 CDN 或外部依赖
- 各项目 README 是该项目的唯一说明入口（功能 / 依赖 / 配置 / 用法）

## License

各目录自带许可证（见该目录的 `LICENSE` 或脚本头部），默认 MIT。
