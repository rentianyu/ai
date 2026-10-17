# ai

个人开源项目合集。

## 目录

### 油猴脚本 · `js/`

| 脚本 | 功能 | 版本 |
|---|---|---|
| [文本链接转可点击](js/text-link-clickable.user.js) | 网页中的纯文本链接自动转为可点击链接 | 2.3 |
| [自动显示网页密码](js/always-show-password.user.js) | 把网页里的密码输入框自动转为明文显示 | 2.0 |
| [网页剪藏 → EdgeEver](js/edgeever-clip.user.js) | 一键把网页正文剪藏到 EdgeEver 笔记（需自行配置站点与令牌） | 2.0.1 |

安装：脚本管理器（Tampermonkey / ScriptCat）「从 URL 安装」，地址为 `https://f.xbta.cc/ai/js/<文件名>`。
各脚本的功能、配置与风险提示见 [js/README.md](js/README.md)。

### Shell 脚本 · `sh/`

（待补充）

## 仓库说明

- `js/`、`sh/` 下的文件在每次 push 后自动同步到 `https://f.xbta.cc/ai/`（见 `.github/workflows/r2-sync.yml`）
- 同步完成后，仓库提交历史会被压平为单个快照提交

## License

各子项目自带 LICENSE。
