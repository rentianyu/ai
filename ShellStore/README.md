# Shell 商店 · 订阅源

给 [Shell 商店](https://github.com/rentianyu/ShellStore) App 用的在线命令源（SMD 格式）。
写规则见 **[SKILL.md](SKILL.md)**，这里是给人和 AI 看的导览。

## 目录

```
ShellStore/
├── SKILL.md           SMD 编写规则（结构 / 字段 / 硬约束 / 校验 / 发布）
├── README.md          本文件
├── references/        深入材料，写源卡住时查
│   ├── smd-format.md  解析器实现细节：怎么识别、字段落点、id 算法、告警
│   └── pitfalls.md    10 个实战坑，症状 → 原因 → 处理
├── tools/
│   └── Probe.kt       完整校验探针，自动判 PASS/FAIL
└── sources/           实际的数据源，一个 App 一份
    ├── index.md       「小贝塔订阅源」清单：本身就是一份 SMD，列着可选的源
    ├── official.md    AI 整理命令库（Android 常用命令），206 条
    ├── gaode.md       高德地图 URL Scheme，116 条
    ├── jd.md          京东 openapp.jdmobile 跳转协议，122 条
    ├── unionpay.md    云闪付 URL Scheme，21 条
    ├── wechat.md      微信内部 Activity / Intent，53 条
    ├── alipay.md      支付宝 Scheme / Activity，23 条
    ├── douyin.md      抖音 snssdk1128 Scheme，28 条
    ├── signin.md      签到打卡聚合，7 个 App 16 条
    ├── taobao.md      淘宝 Scheme，12 条
    ├── netease.md     网易云音乐 Scheme / Activity，17 条
    ├── coolapk.md     酷安 Scheme / Activity，18 条
    ├── qq.md          QQ Scheme / Activity，15 条
    ├── miui.md        小米 / HyperOS 系统入口，28 条
    ├── misc.md        小爱 / FV / Notion / Surfboard / 美团 / MT / TIM 等，35 条
    ├── coloros.md     ColorOS / 一加系统入口，11 条
    └── media.md       QQ音乐 / 哔哩哔哩 / MX播放器 / i音乐，13 条
```

## 在 App 里用

「我的 › 订阅源 › 添加 › 在线源」，填下面的地址：

| 源 | 订阅地址 | 条数 |
|---|---|---|
| AI 整理命令库 | `https://f.xbta.cc/ai/ShellStore/sources/official.md` | 206 |
| 高德地图 | `https://f.xbta.cc/ai/ShellStore/sources/gaode.md` | 116 |
| 京东 | `https://f.xbta.cc/ai/ShellStore/sources/jd.md` | 122 |
| 云闪付 | `https://f.xbta.cc/ai/ShellStore/sources/unionpay.md` | 21 |
| 微信 | `https://f.xbta.cc/ai/ShellStore/sources/wechat.md` | 53 |
| 支付宝 | `https://f.xbta.cc/ai/ShellStore/sources/alipay.md` | 23 |
| 抖音 | `https://f.xbta.cc/ai/ShellStore/sources/douyin.md` | 28 |
| 签到打卡 | `https://f.xbta.cc/ai/ShellStore/sources/signin.md` | 16 |
| 淘宝 | `https://f.xbta.cc/ai/ShellStore/sources/taobao.md` | 12 |
| 网易云音乐 | `https://f.xbta.cc/ai/ShellStore/sources/netease.md` | 17 |
| 酷安 | `https://f.xbta.cc/ai/ShellStore/sources/coolapk.md` | 18 |
| QQ | `https://f.xbta.cc/ai/ShellStore/sources/qq.md` | 15 |
| 小米 | `https://f.xbta.cc/ai/ShellStore/sources/miui.md` | 28 |
| 常用小工具 | `https://f.xbta.cc/ai/ShellStore/sources/misc.md` | 35 |
| ColorOS | `https://f.xbta.cc/ai/ShellStore/sources/coloros.md` | 11 |
| 影音娱乐 | `https://f.xbta.cc/ai/ShellStore/sources/media.md` | 13 |

一个源一个地址，可以同时启用多个，条目会合并显示。

App 的「订阅源 › 小贝塔订阅源」会自动列出清单里登记的源（读 `sources/index.md`，
它本身就是一份 SMD），按需单独开启，不用手动填地址。首次启动会自动启用其中的
AI 整理命令库，其余的自己去开。

> 用 `f.xbta.cc` 而不是 `raw.githubusercontent.com` —— 后者国内经常连不上。

## 加一个新源

1. 在 `sources/` 下新建 `<app>.md`，按 [SKILL.md](SKILL.md) 的三层结构写；
   遇到「解析不出来 / 条目莫名少了」先查 [references/pitfalls.md](references/pitfalls.md)
2. 本地校验（`warnings = 0`、`uniqueIds == entries`）
3. push 到 `main`
4. 等 Actions 跑完（约 1 分钟），地址就是 `https://f.xbta.cc/ai/ShellStore/sources/<app>.md`
5. 在这个 README 的表格里加一行

## 源的两类写法

| | App 型源（gaode / jd / wechat / qq …） | 功能型源（official / signin） |
|---|---|---|
| 分类 | 一个源一个分类，分类名 = 软件名 | 可多分类：official 按功能分（系统信息 / 网络与连接 / 系统设置页…），signin 按 App 分 |
| 标题 | `软件名_动作`，动作 15 字内 | official 用裸标题（网络与连接下的「开关蓝牙」），signin 用 `软件名_动作` |
| @count | 条目数 | 条目数 |

## 条目写法口径

| 项 | 约定 |
|---|---|
| 类型 | scheme / shell 类：URI 或命令写进代码块；activity / intent / service / broadcast 类：只用 `@action` / `@component` / `@extra` 字段，**不写代码块**（写了会被忽略） |
| 多选值 | `enable/disable`、`0/1`、`0-15` 这类用 `@param` 一条搞定（`svc wifi {state}` + `@param state=开关\|disable`），不要拆成多条 |
| 保真命令 | App 型源每条带 `@adb`（official 的 shell 条目可省）；无 body 的条目 `@adb` 就是执行体，占位符必须保留 `{key}` |
| 风险 | 只跳转 `safe`；改设置 `caution`；改分区 / kill / 重启 `danger` |
| 去重 | 按命令体 / 组件去重，不按标题（同一组件常有两个名字） |

## 分发链路

```
push main
   ↓
.github/workflows/r2-sync.yml（仓库根，同步 ShellStore/ 到 R2）
   ↓
R2 file 桶  ai/ShellStore/...（Cache-Control: max-age=300）
   ↓
https://f.xbta.cc/ai/ShellStore/sources/<app>.md
```

改完约 5 分钟内生效（边缘缓存）。App 判断源有没有更新是比对**条目数**，
只改内容不加条目时不会提示更新，需要手动「刷新」。
