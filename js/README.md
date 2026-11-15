# 油猴脚本

自用油猴脚本合集（Tampermonkey / ScriptCat 通用），持续添加中。

| 脚本 | 功能 | 版本 | 安装 |
|---|---|---|---|
| [文本链接转可点击](text-link-clickable.user.js) | 网页中的纯文本链接自动转为可点击链接 | 2.3.1 | [安装](https://f.xbta.cc/ai/js/text-link-clickable.user.js) |
| [自动显示网页密码](always-show-password.user.js) | 把网页里的密码输入框自动转为明文显示 | 2.0.1 | [安装](https://f.xbta.cc/ai/js/always-show-password.user.js) |
| [网页剪藏 → EdgeEver](edgeever-clip.user.js) | 一键把网页正文剪藏到 EdgeEver 笔记（含 Discuz / 飞书适配、图片转存） | 2.0.4 | [安装](https://f.xbta.cc/ai/js/edgeever-clip.user.js) |
| [推送网页标题、网址到 webhook](page-to-webhook.user.js) | 点右下角悬浮钮，把当前页标题 + 时间 + 网址推到 webhook（默认企微，可配钉钉/飞书/任意自定义） | 1.1.3 | [安装](https://f.xbta.cc/ai/js/page-to-webhook.user.js) |
| [网页剪藏到 Notion](notion-clip.user.js) | 一键把网页正文剪藏到 Notion：Readability 提取 → 自动转 Notion 块，含 Discuz 论坛适配，可存为子页或数据库条目 | 1.0.3 | [安装](https://f.xbta.cc/ai/js/notion-clip.user.js) |
| [cookie 查看](cookie-viewer.user.js) | 点右下角按钮查看并复制当前页 cookie，正确处理值里的等号、空 cookie 与同名项（仅非 HttpOnly） | 1.0.0 | [安装](https://f.xbta.cc/ai/js/cookie-viewer.user.js) |
| [AI 摘要推送](ai-summary-push.user.js) | 点悬浮 AI 按钮：提取正文 → AI 总结 → 按「标题 / 时间 / 网址 / 总结」推送企微群（消息按 2000 字节兜底） | 1.0.0 | [安装](https://f.xbta.cc/ai/js/ai-summary-push.user.js) |

## 说明

- **安装**：脚本管理器「从 URL 安装」→ 填上表「安装」列地址
- **更新**：脚本头已配 `@updateURL` / `@downloadURL`，递增 `@version` 提交后自动提示更新
- **新增脚本**：本目录放入 `<名称>.user.js`，再在上表追加一行；改造/删除脚本时同步更新对应行（功能、版本、安装地址）
- **EdgeEver 剪藏**：脚本内**不含任何令牌或私有地址**，默认值均为占位示例。首次使用请点脚本菜单「⚙️ 设置」，填入你自己的 EdgeEver 站点地址、访问令牌（在 EdgeEver「设置 → 访问令牌」中生成）与目标笔记本 ID
- **cookie 查看**：脚本**不含任何凭据或外联请求**，只读取当前页 `document.cookie`（不联网、不落盘），点击按钮时才读取并写入剪贴板。**只能拿到非 HttpOnly 的 cookie**——HttpOnly 项（常见于登录态）受浏览器安全策略保护，脚本无法读取，需从开发者工具 → Application → Cookies 或 Network 请求头获取。全站注入（`@match *://*/*`）：每页只添加 1 个 0×0 宿主节点 + 1 个悬浮按钮，无定时器、无 `MutationObserver`，可用脚本菜单「显示/隐藏悬浮按钮」关闭。
- **AI 摘要推送**：点悬浮 AI 按钮 → 内联 Readability 提取正文（超 12000 字自动裁剪）→ 调你配置的 OpenAI 兼容接口总结 → 按「标题 / 时间 / 网址 / 总结」推企业微信群机器人。脚本**不含任何凭据**，API Key 只存本机脚本存储；`@connect *` 是因为 AI 接口与 webhook 都由使用者自行填写，脚本实际只向这两类地址发请求。最终消息按 **UTF-8 字节**硬控在 2000 字节内（企微上限 2048），超长时按「网址 > 总结 > 标题」的优先级压缩。
- **上游致谢**：`edgeever-clip.user.js` 内联了 Mozilla Readability v0.6.0（Copyright © Arc90 Inc，Apache License 2.0）、Turndown v7.2.4 与 turndown-plugin-gfm v1.0.2（Copyright © Dom Christie，MIT）、collapse-whitespace（Copyright © 2014 Luc Thevenard，MIT）。脚本内出现的 `lucthevenard@gmail.com` 属于 collapse-whitespace 的上游署名，非本脚本作者信息。

## ⚠️ 风险提示

- **自动显示网页密码（always-show-password）**：该脚本把**所有网站**的密码输入框强制转为**明文永久显示**。请勿在他人可见、被录屏、或共享设备的场景下使用；另外密码框转为明文后，部分浏览器的密码管理器可能不再自动填充该字段。
- **cookie 查看（cookie-viewer）**：按钮点击后会把当前站点的 cookie 写入剪贴板，其中可能包含**登录态凭证**。请勿在投屏、录屏、远程协作场景下点击；复制后如需保留请自行判断接收方是否可信，用完清空剪贴板（公共设备上尤其注意）。
- **AI 摘要推送（ai-summary-push）**：点击按钮会把**当前页正文发送给你配置的第三方 AI 服务**。正文可能包含页面内的个人信息、内部资料，请在可信页面、可信服务商下使用；不确定时先不要点。
