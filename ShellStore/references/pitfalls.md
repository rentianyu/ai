# 踩过的坑

> 11 个实际踩过的坑：症状 → 原因 → 处理。格式细节见 [smd-format.md](smd-format.md)，
> 编写规则见 [../SKILL.md](../SKILL.md)。

按「症状 → 原因 → 处理」组织。都是实际做源时遇到的。

## 1. 条目少了，但不报错

**症状**：源里写了 120 条，App 只显示 110 条，没有任何错误提示。

**原因**：同一分类下标题重复。id = `hash(分类|标题)`，重复的会互相覆盖，`Map` 式去重后只剩一条。

**处理**：

```bash
# 查重复标题
grep '^### ' sources/xxx.md | sort | uniq -d
```

同名不同内容时加后缀区分：`乘车码` / `乘车码（支付宝渠道）`。

`check.sh` 会打印 `uniqueIds` 和 `entries`，两者不等就是这个原因。

---

## 2. 条目在，但点执行/打开没反应

**症状**：卡片正常显示，点「执行」或「打开」没有任何反应，也没有报错。

**原因**：`body` 类条目（shell / script / urlscheme）**没写代码块**。
解析器拿不到可执行内容时会**直接跳过这条**，并记一条告警
`条目「xxx」缺少可执行内容，已跳过`——所以它在列表里根本不存在，不是「显示为空」。

**处理**：确认有 ` ```` ```sh ```` ` / ` ```text ` 包住内容。`check.sh` 的告警数不为 0 就是这类问题，
它会直接把「已跳过」的条目名列出来。

---

## 3. Intent 条目的代码块被无视

**症状**：`activity` 条目里写了代码块，以为是命令，实际触发时用的是字段。

**原因**：Intent 族（intent/activity/service/broadcast）只认字段，代码块不参与构造；
`@action` 与 `@component` 都空时会被判定「缺少可执行内容」并**整条跳过**。

**处理**：Intent 族用 `@action` / `@component` 等字段，不要写代码块；要写等价 adb 命令用 `@adb`。

---

## 4. `@adb` 里的单引号把命令截断

**症状**：`@adb am start -d 'amapuri://xxx'` 在详情页显示不全，或复制出来少一半。

**原因**：URI 自身含单引号时，与包裹引号冲突。

**处理**：写源时检查 scheme 里是否含 `'`。含的话改用双引号或不加引号。
`check.sh` 会扫这个问题（`@adb am start -d '...'` 内部的引号）。

---

## 5. 改了内容，App 却不提示更新

**症状**：源文件改了、`f.xbta.cc` 上也是新的，但 App 里一直显示旧内容。

**原因（两层）**：

1. **App 判断更新比对的是「条目数」**，只改内容不加条目 → `countChanged = false` → 不提示
2. R2 有 `Cache-Control: max-age=300` 边缘缓存，约 5 分钟才过期

**处理**：
- 等 5 分钟，或在 App 里「我的 › 订阅源 › 刷新」手动拉
- 加条目/删条目会触发更新提示

---

## 6. 推上去了，但 f.xbta.cc 上没有文件

**症状**：GitHub 仓库里能看到 `ShellStore/sources/xxx.md`，`https://f.xbta.cc/ai/ShellStore/...` 返回 404。

**原因**：`r2-sync.yml` 的同步范围没包含这个目录。原来只同步 `js/ win/ sh/`，
加 `ShellStore/` 时必须改**三处**：

```yaml
paths:
  - 'ShellStore/**'          # ① 触发条件

find js win sh ShellStore -type f      # ② 上传
for dir in js win sh ShellStore; do    # ③ 删除同步
```

漏了 ③ 会导致仓库删了文件、R2 上还留着。

---

## 7. Notion 素材里大量重复

**症状**：从 Notion 页面生成的源，条目数比预期多，且末尾一段与开头重复。

**处理**：`gen_from_notion.py` 已按 `(标题, URI)` 去重；仍有重复说明标题不同但内容相同，
需要人工判断合并。

---

## 8. 标题太长被截断

**症状**：卡片上标题显示为 `高德地图_工具_双旦特惠…`。

**原因**：早期素材保留了 `工具_` 中间层，加上软件名前缀后过长。

**处理**：统一成 `<软件名>_<动作>` 一层前缀，动作名 ≤ 15 字。
`高德地图_工具_双旦特惠` → `高德地图_双旦特惠`。

---

## 9. 高风险命令没有标 danger

**症状**：`rm -rf`、`mkfs`、`pm uninstall` 类条目显示为「安全」，卡片上点执行直接跑了。

**处理**：写源时逐条看风险等级。判定标准：

| 等级 | 标准 |
|---|---|
| safe | 只读、只跳转、只打开页面 |
| caution | 会改设置、会发请求、会写数据 |
| danger | 删数据、卸载、重启、格式化 |

App 侧对 `danger` 有二次确认（受设置开关控制），但前提是源里标对了。

---

## 10. 校验脚本找不到 kotlinc

**症状**：`check.sh` 报 `kotlinc not found`。

**处理**：

```bash
# 需要一套 kotlinc：JDK 17 + Kotlin 编译器
# 可从 Maven 中央仓库拉 kotlin-compiler 与 kotlin-stdlib，或用本机 Android 工程里的构建环境
```

或者干脆跳过本地校验，直接在 App 里试导入——但那样只能看「能不能解析」，
看不到 `uniqueIds` 是否等于 `entries`，查不出静默丢条目。

> 探针 `Probe.kt` 在 `../tools/`，`check.sh` 在 skill 的 `scripts/`；App 仓库（`rentianyu/ShellStore`）只有 `core/` 源码。

---

## 11. 刚推完，线上还是旧内容

**症状**：`push` 成功、Actions 也绿了，`curl` 拿到的还是旧版本，md5 对不上；偶尔还返回 0 字节。

**原因**：R2 边缘缓存 `Cache-Control: max-age=300`，最多 5 分钟。

**处理**：

```bash
curl -s "https://f.xbta.cc/ai/ShellStore/sources/x.md?cb=$RANDOM" | md5sum
```

| 穿透缓存后 | 结论 |
|---|---|
| 一致 | 已发布成功，只是边缘没刷新，等 5 分钟 |
| 仍不一致 | Actions 没跑完/没跑，查 `r2-sync.yml` 的 `paths`、`find`、删除同步三处 |
| 空（0 字节） | 通常是正在覆盖写入，隔 15 秒重试一次再判断 |

**别拿「不一致」直接判定发布失败**——这是最容易误报的一类。2026-11-03 实测：刚推完立刻比 md5 报不一致，
等 90 秒再比就一致了。
