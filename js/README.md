# 油猴脚本

自用油猴脚本合集（Tampermonkey / ScriptCat 通用），持续添加中。

| 脚本 | 功能 | 版本 | 安装 |
|---|---|---|---|
| [文本链接转可点击](text-link-clickable.user.js) | 网页中的纯文本链接自动转为可点击链接 | 2.3 | [安装](https://f.xbta.cc/ai/js/text-link-clickable.user.js) |
| [自动显示网页密码](always-show-password.user.js) | 把网页里的密码输入框自动转为明文显示 | 2.0 | [安装](https://f.xbta.cc/ai/js/always-show-password.user.js) |
| [网页剪藏 → EdgeEver](edgeever-clip.user.js) | 一键把网页正文剪藏到 EdgeEver 笔记（含 Discuz / 飞书适配、图片转存） | 2.0.1 | [安装](https://f.xbta.cc/ai/js/edgeever-clip.user.js) |
| [推送网页标题、网址到 webhook](page-to-webhook.user.js) | 点右下角悬浮钮，把当前页标题 + 时间 + 网址推到 webhook（默认企微，可配钉钉/飞书/任意自定义） | 1.1.3 | [安装](https://f.xbta.cc/ai/js/page-to-webhook.user.js) |

## 说明

- **安装**：脚本管理器「从 URL 安装」→ 填上表「安装」列地址
- **更新**：脚本头已配 `@updateURL` / `@downloadURL`，递增 `@version` 提交后自动提示更新
- **新增脚本**：本目录放入 `<名称>.user.js`，再在上表追加一行即可
- **EdgeEver 剪藏**：脚本内**不含任何令牌或私有地址**，默认值均为占位示例。首次使用请点脚本菜单「⚙️ 设置」，填入你自己的 EdgeEver 站点地址、访问令牌（在 EdgeEver「设置 → 访问令牌」中生成）与目标笔记本 ID

## ⚠️ 风险提示

- **自动显示网页密码（always-show-password）**：该脚本把**所有网站**的密码输入框强制转为**明文永久显示**。请勿在他人可见、被录屏、或共享设备的场景下使用；另外密码框转为明文后，部分浏览器的密码管理器可能不再自动填充该字段。
