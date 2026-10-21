# ai

个人自用脚本合集，按脚本**类型**分目录维护。所有脚本均为单文件、无外部依赖，可直接阅读与审计。

## 目录（按类型）

| 类型 | 目录 | 适用场景 | 清单 |
|---|---|---|---|
| 用户脚本（Tampermonkey / ScriptCat） | `js/` | 浏览器端网页增强：内容处理、快捷操作、页面信息推送 | [js/README.md](js/README.md) |
| Windows 脚本（PowerShell） | `win/` | Windows 端运维工具：离线包下载、文件批处理等 | [win/README.md](win/README.md) |
| Shell 脚本（POSIX sh） | `sh/` | 服务器与本地命令行自动化 | [sh/README.md](sh/README.md) |

> 本文件只说明仓库包含哪些**类型**的脚本，不列出具体脚本；具体清单、功能与安装地址见各目录下的 README。

## 使用

- **用户脚本**：脚本管理器「从 URL 安装」，地址规则 `https://f.xbta.cc/ai/js/<文件名>`（确切地址见目录 README）
- **Windows 脚本**：`https://f.xbta.cc/ai/win/<文件名>` 下载后直接运行（Windows PowerShell 5.1）
- **Shell 脚本**：直接下载或 `curl` 获取

## 仓库机制

- `js/`、`win/`、`sh/` 下的文件在每次 push 后自动同步到 `https://f.xbta.cc/ai/`（见 `.github/workflows/r2-sync.yml`）
- 同步完成后，仓库提交历史会压平为单个快照提交
- **每次新增、改名、删除或更新脚本，都要同步更新所在目录的 README**（清单 / 功能 / 版本 / 安装地址）

## 约定

- 脚本作者统一署名「小贝塔」
- 脚本自包含，不引入 CDN 或外部依赖
- 目录 README 是该目录脚本的唯一清单入口

## License

各脚本自带许可证（见脚本头或所在目录的 LICENSE）。
