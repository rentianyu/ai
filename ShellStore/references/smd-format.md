# SMD 格式与解析器行为

> 本文是 SMD 的**实现级细节**：结构怎么被识别、字段落到哪个属性、id 怎么算、
> 什么情况下条目会被静默丢弃。上层的编写规则与流程见 [../SKILL.md](../SKILL.md)，
> 踩过的坑见 [pitfalls.md](pitfalls.md)。

与 App 源码 `app/src/main/java/com/xbta/shellstore/core/SmdParser.kt` 的实际实现对齐。规则改了要同步这里。

## 一、结构识别

| 写法 | 识别为 | 备注 |
|---|---|---|
| `# 名称` | 文件标题 | 只取第一个；可省略 |
| `## 分类` | 分类 | 后面必须有空格 |
| `### 标题` | 条目 | 同上 |
| `- 标题` / `● 标题` / `• 标题` | 条目 | 列表写法，等价 `###` |
| ` ```` ```sh ```` / ` ```text ` | 条目正文 | 内容**不做任何解析** |
| 行首缩进的非空行 | 续行 | 接到上一条 `@param` 的说明或 `@example` 的多行值 |
| 其他正文行 | 当前条目的 `desc` | 会拼进描述 |

`#` 的判定有例外：`# ` 开头但**不是** `## ` 才算文件标题。

## 二、文件级字段

写在第一个 `##` 之前：

| 字段 | 示例 |
|---|---|
| `@author` | 小贝塔 |
| `@version` | 2026.11.3 |
| `@updated` | 2026-11-03 |

## 三、条目级字段

| 字段 | 取值 | 落到 | 说明 |
|---|---|---|---|
| `@type` | shell / script / urlscheme / intent / activity / service / broadcast | `type` | 缺失时按内容推断 |
| `@risk` | safe / caution / danger | `risk` | |
| `@need` | none / shell / root / termux | `need` | |
| `@tag` | 空格或逗号分隔 | `tags` | |
| `@desc` | 一行 | `desc` | |
| `@param` | `键=标签\|默认值` | `params` | 命令体用 `{键}` 引用 |
| `@verified` | 2026-11-01 | `verifiedAt` | |
| `@adb` | 完整 adb 命令 | `adb` | 非空时优先于命令体 |
| `@example` | 可多行 | `example` | |
| `@doc` / `@link` | 可多行 | `doc` | |
| `@pinned` | true / false | `pinned` | |
| `@x.*` 与未知字段 | 任意 | `extra` | 原样保留，不丢 |

### 类型推断（不写 `@type` 时）

```
有 @action 或 @component  → intent 族（按 risk 等再细分，默认 intent）
代码块内容以 xxx:// 开头   → urlscheme
有其他代码块              → shell
```

**别依赖推断**，显式写 `@type` 更保险。

## 四、Intent 族字段

`intent` / `activity` / `service` / `broadcast` 用字段而不是代码块：

| 字段 | 说明 |
|---|---|
| `@action` | 如 `android.settings.WIFI_SETTINGS` |
| `@component` | `包名/类名` |
| `@data` | data URI |
| `@mime` | MIME |
| `@package` | 限定包名 |
| `@category` | 可重复 |
| `@flag` | `NEW_TASK` / `CLEAR_TOP` / 十六进制 |
| `@extra` | `键:类型=值`，类型 string / bool / int / long / float / null / string-arr / int-arr |

`@action` 与 `@component` 至少一个，否则 `isActionable = false`，详情页不出现触发按钮。

## 五、命令体的清洗规则

| 输入 | 处理 |
|---|---|
| 以 `adb shell ` 开头 | 剥掉，原文存进 `origin` |
| 含 `su -c` | `need` 自动标 `root` |
| 代码块未闭合 | 丢弃该段 + 一条告警 |

## 六、参数与占位符

```markdown
### 高德地图_搜索关键词
@type urlscheme
@param kw=关键词|充电站

```text
amapuri://search/general?keyword={kw}
```
```

- 参数值支持续行补充说明
- 详情页按 `param` 顺序生成输入框，默认值预填
- 卡片上执行/打开用的是**默认值**，要改值得进详情页

## 七、id 与去重

```
id = hash("分类名|标题").toUInt().toString(16).padStart(8,'0')
```

不含 sourceId → **多源合并时同分类同标题会去重成一条**。

代价：
- 同源内标题重复 = 内容互相覆盖（最后一条赢）
- 改标题 = 新 id，已收藏的旧条目会显示「源已失效」

## 八、解析告警（`ParseWarning`）

不会中断解析，但 `check.sh` 会把它们列出来。常见来源：

| 告警 | 原因 |
|---|---|
| 无法识别的元信息行 | `@` 开头但格式不对（如 `@` 后面直接中文） |
| `@param` 缺少键名 | 写成 `@param =值` |
| `@extra` 缺少「=」 | 写成 `@extra key:string` |
| 代码块未闭合 | 少了结尾的 ` ``` ` |

**目标始终是 0 条告警。**

## 九、系列清单文件（index.md）

SMD 还有一种用法：**用一份 SMD 当「源清单」**，列出多个可单独启用的源。

````markdown
## 高德地图

### 高德地图
@desc 高德地图 URL 快捷入口
@count 115

```text
https://f.xbta.cc/ai/ShellStore/sources/gaode.md
```
````

- 识别规则：**代码块正文是 `http(s)://` 地址的条目**就是一条源，其它条目忽略
- 源名取标题，地址取正文，`@count` 走 `extra`（未知字段一律进 extra，天然装得下）
- 这类文件不需要 `@type`，解析器按正文推断成 urlscheme，不会产生告警
- 它同时是一份合法 SMD，能被普通导入流程预览，`check.sh` 会跳过标题前缀检查
