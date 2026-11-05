---
name: shellstore-smd
description: 编写、校验、发布 Shell 商店（ShellStore）的 SMD 订阅源。当用户说「写个在线源」「加一批命令到源里」「抓某 App 的 scheme 做成源」「SMD 怎么写」「这个源解析不出来」「发布更新订阅源」时使用。产出是符合 SMD 规范的 Markdown 文件，放在本目录 sources/ 下，推送后自动同步到 https://f.xbta.cc/ai/ShellStore/。不适用于：修改 App 代码（见 ShellStore 仓库）、纯文本清单整理、其他 App 的数据格式。
---

# SMD 订阅源编写规则

SMD 是 **Markdown 的超集**：写起来跟普通 Markdown 一样，只多约定了几行 `@字段` 做结构化描述。
Shell 商店 App 用 `SmdParser` 解析它，解析过程**不抛异常**，认不出的行只记一条告警后跳过。

**配套文档**

| 文件 | 内容 |
|---|---|
| [references/smd-format.md](references/smd-format.md) | 实现级细节：结构识别表、字段落点、类型推断、id 算法、告警清单 |
| [references/pitfalls.md](references/pitfalls.md) | 10 个实战坑，症状 → 原因 → 处理 |
| [tools/Probe.kt](tools/Probe.kt) | 完整校验探针（id 冲突 / 告警 / `@adb` 引号 / 前缀提示） |

写新源前先扫一眼 pitfalls：`check.sh` 能抓语法与 id 类问题，但分类粒度、风险等级、前缀是否冗长这类只能人工判断。

## 一、三层结构（必须遵守）

```
# 源名称            ← 可有可无，建议写
@author 作者        ← 文件级元信息，写在 # 之后、第一个 ## 之前
@version 2026.11.3
@updated 2026-11-03

## 分类名           ← 一级分类，App 的「商店」页按它铺宫格

### 条目标题        ← 一条命令
@type urlscheme
@risk safe

```text
amapuri://commute?clearStack=1&dest=home
```
```

- `###` 也接受列表写法：`- 标题`、`● 标题`、`• 标题`
- `##`、`###` 后面必须有空格，否则不认
- 文件编码必须是 UTF-8

## 二、字段全表

### 文件级（写在第一个 `##` 之前）

| 字段 | 说明 |
|---|---|
| `@author` | 作者署名 |
| `@version` | 版本，建议 `2026.11.3` 这种日期式 |
| `@updated` | 最后更新日期 `2026-11-03` |

### 条目级

| 字段 | 取值 | 说明 |
|---|---|---|
| `@type` | `shell` `script` `urlscheme` `intent` `activity` `service` `broadcast` | 不写会按内容推断（有代码块→shell，有 `@action`→intent，`scheme://`→urlscheme） |
| `@risk` | `safe` `caution` `danger` | **宁可标高不标低** |
| `@need` | `none` `shell` `root` `termux` | 运行条件提示 |
| `@tag` | 任意，空格或逗号分隔 | 多标签 |
| `@desc` | 一行文本 | 简短说明；也可直接写正文段落（会归入 desc） |
| `@param` | `键=标签\|默认值` | 命令体里用 `{键}` 引用，详情页会弹输入框 |
| `@verified` | `2026-11-01` | 最近验证日期 |
| `@adb` | 完整 adb 命令 | 保真写法，非空时优先于命令体 |
| `@example` | 多行（配合缩进续行） | 用法示例 |
| `@doc` / `@link` | 多行 | 补充说明、来源链接 |
| `@pinned` | `true` | 置顶 |

### Intent 族字段（`intent`/`activity`/`service`/`broadcast` 专用）

| 字段 | 说明 |
|---|---|
| `@action` | Intent action，如 `android.settings.WIFI_SETTINGS` |
| `@component` | `包名/类名`，与 action **至少填一个** |
| `@data` | data URI |
| `@mime` | MIME 类型 |
| `@package` | 限定目标包名 |
| `@category` | 可重复，加多个 |
| `@flag` | `NEW_TASK` `CLEAR_TOP`，也接受十六进制 |
| `@extra` | `键:类型=值`，类型 `string`/`bool`/`int`/`long`/`float`/`null`/`string-arr`/`int-arr` |

## 三、十一条硬约束

违反这些会出现「解析通过但内容不对」，比报错更难查。

1. **同一分类内标题不能重复**
   条目 id = `hash("分类|标题")`。重复的会互相覆盖，最后只剩一条，且 App 不报错。
   真要两条同名，加后缀区分：`乘车码` / `乘车码（支付宝渠道）`。

2. **`body` 类必须有代码块，Intent 类必须没有代码块**
   `shell` / `script` / `urlscheme` 靠代码块里的内容当命令；
   `intent` / `activity` / `service` / `broadcast` 靠字段构造，代码块会被忽略。

3. **Intent 族必须有 `@action` 或 `@component`**
   两者都空时 `isActionable = false`，详情页不会出现「打开」按钮。

4. **代码块内不做任何解析**
   `@`、`#`、反引号、`$` 全部原样保留。写复杂脚本不用转义，这是 SMD 相对 YAML 的最大优势。

5. **命令体不要写 `adb shell` 前缀**
   解析器会自动剥掉并存进 `origin`。写了不报错，但会重复出现在「原始写法」里。

6. **多行字段必须用缩进续行**
   ```
   @example 示例一
     第二行要缩进
     第三行也要缩进
   ```
   续行只对 `@example` / `@doc` / `@param` 之后的说明生效，中间不能有空行。

7. **`@param` 的值用 `|` 分隔标签与默认值**
   `@param pkg=包名|com.tencent.mm` → 键 `pkg`、显示名「包名」、默认值 `com.tencent.mm`。
   缺 `|` 时整串当标签，没有默认值。

8. **一个文件只写一个 App / 一个主题**
   多源合并时按条目 id 去重，混写会让分类错乱。要多个 App 就多个文件。

9. **一个源只用一个分类，分类名就是软件名**
   如「高德地图」「微信」「支付宝」。App 的分类宫格里一个软件占一格，点进去看这个软件的全部命令。
   单分类超过 200 条时按功能拆成「微信 · 支付」「微信 · 设置」这类带前缀的分类。

10. **标题必须带软件名前缀：`<软件名>_<动作>`**
    如 `高德地图_达人中心`、`微信_扫一扫`、`支付宝_付款码`。
    好处是搜索「高德」能一次命中全部、导出或混排时也认得出归属；分类名同样用软件名，两者保持同一个词。
    动作名控制在 15 字内，别把整条 URL 塞进标题。

11. **风险等级按「会不会改东西」判断**
    - `safe`：只读、只跳转、只是打开页面
    - `caution`：会改设置、会发请求、会写数据
    - `danger`：删数据、卸载、重启、格式化

## 四、URL Scheme 源的写法（最常见的场景）

````markdown
## 快捷入口

### 回家
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://commute?clearStack=1&dest=home'

```text
amapuri://commute?clearStack=1&dest=home
```
````

要点：

- `@type urlscheme`，命令体就是完整 URI
- `@adb` 写 `am start -d '<URI>'`，方便在电脑上复现
- URI 里的 `&` 直接写，代码块内不用转义
- 标题统一 `<软件名>_<动作>` 格式，如 `高德地图_达人中心`（见硬约束 10）

## 五、shell / 脚本源的写法

````markdown
## 设备信息

### 查看 CPU 型号
@type shell
@risk safe
@need shell
@tag 硬件

```sh
getprop ro.soc.model
```
````

- 需要 root 的写 `@need root`，`@risk` 至少 `caution`
- 带参数用 `{占位符}`：

````markdown
### 查看某应用版本
@type shell
@risk safe
@need shell
@param pkg=包名|com.tencent.mm

```sh
dumpsys package {pkg} | grep versionName
```
````

## 六、Intent 源的写法

```markdown
## 系统设置

### 打开 WiFi 设置
@type activity
@risk safe
@need none
@action android.settings.WIFI_SETTINGS
```

- 只有 action 也行；有 component 时优先用 component（更精确）
- 广播类注意 Android 8 之后的隐式广播限制，能指定 `@package` 就指定

## 七、校验

### 方法 A：App 内试

「我的 › 订阅源 › 添加」填本地文件或 URL，能列出条目就算通过。

### 方法 B：本地跑解析器（推荐，能看告警）

```bash
# core 在 App 仓库里：app/src/main/java/com/xbta/shellstore/core/
kotlinc <core目录>/*.kt Probe.kt -d /tmp/probe
java -cp /tmp/probe:<kotlin-stdlib.jar> ProbeKt sources/gaode.md
```

`Probe.kt` 最少这几行：

```kotlin
import com.xbta.shellstore.core.SmdParser
import java.io.File

fun main(args: Array<String>) {
    val r = SmdParser.parse(File(args[0]).readText(), "probe", "probe")
    val e = r.source.entries
    println("entries=${e.size} cats=${r.source.categories.size} warnings=${r.warnings.size}")
    println("uniqueIds=${e.map { it.id }.toSet().size}")   // 必须等于 entries
    r.warnings.forEach { println("WARN L${it.line}: ${it.message}") }
}
```

**必查三项**：`warnings = 0`、`uniqueIds == entries`、`types` 分布符合预期。

上面的精简版只打印数字。要**自动判 PASS/FAIL**，用 [tools/Probe.kt](tools/Probe.kt)，它比精简版多查四件事：

```bash
# tools/Probe.kt = 本仓库这份；core 来自 App 仓库
kotlinc <core目录>/*.kt tools/Probe.kt -d /tmp/probe
java -cp /tmp/probe:<kotlin-stdlib.jar> ProbeKt sources/gaode.md
```

```
条目 115 · 分类 1 [高德地图] · 类型 {urlscheme=115} · 告警 0
PASS  条目 115 唯一 · 告警 0
```

会拦下的问题：同分类重复标题（id 冲突）、条目被静默跳过、`@adb` 单引号不配对、标题缺软件名前缀。
退出码非 0 即不通过。

## 八、发布

```
sources/<app>.md   ← 放这里
        ↓ git push main
GitHub Actions：r2-sync.yml（把 ShellStore/ 同步到 R2 file 桶的 ai/ShellStore/ 前缀）
        ↓
https://f.xbta.cc/ai/ShellStore/sources/<app>.md   ← App 里填这个地址
```

- 订阅地址用 `f.xbta.cc`，**不要**用 `raw.githubusercontent.com`（国内经常不通）
- 同步有约 5 分钟缓存（`Cache-Control: max-age=300`），改完等一会儿再在 App 里刷新
- App 里更新源是「比对条目数」判断有没有变化，所以**只改内容不加条目，App 不会提示更新**；
  需要强制刷新时用「订阅源 › 刷新」手动拉

## 九、系列清单 index.md

App「订阅源 › 小贝塔订阅源」那一行读的是 `sources/index.md`——它**本身也是一份 SMD**，
所以能用同一套解析器、同一个 `check.sh` 校验。**新增或删除源时必须同步这个文件**，
否则 App 里看不到（同步之后 App 不用发版）。

````markdown
# 小贝塔订阅源

@author 小贝塔
@version 2026.11.3
@updated 2026-11-03

## 高德地图

### 高德地图
@risk safe
@need none
@desc 高德地图 URL 快捷入口
@count 115

```text
https://f.xbta.cc/ai/ShellStore/sources/gaode.md
```
````

| 项 | 约定 |
|---|---|
| 什么算一个源 | **代码块正文是 http(s) 地址的条目**，其它条目一律忽略 |
| 源名 | 条目标题（`###` 后面那串） |
| 源地址 | 代码块里的 URL。App 认源靠它，**不是** id |
| 条数 | `@count` 字段（未知字段进 `extra`，App 从这里读）；不写就不显示 |
| AI 整理命令库 | 也在清单里，是普通一项（`official.md`）。首次启动会自动启用它 |

清单里不用写 `@type`，解析时按正文推断；`check.sh` 识别到「所有条目正文都是 http 地址」
会自动跳过标题前缀检查。

## 十、现有源

| 文件 | 内容 | 条数 |
|---|---|---|
| `sources/official.md` | 官方源：系统与设备常用命令（10 个分类） | 133 |
| `sources/gaode.md` | 高德地图 URL Scheme（分类「高德地图」，标题 `高德地图_xxx`） | 115 |

新增源时在上表加一行，并保持分类语义清晰。
