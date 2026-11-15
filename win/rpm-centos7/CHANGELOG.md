# 变更记录

## 2.0.2 (2026-10-19)

脚本改名为 `rpm-centos7.ps1`（原 `rpmd.ps1`），行为不变：

- 文件名、帮助文本、调用示例、`install.sh` 生成标签同步改名（`[rpm-centos7]`）
- 本地缓存目录改为 `%LOCALAPPDATA%\rpm-centos7\cache`，不再与旧名混用
- **下载地址变更**：`https://f.xbta.cc/ai/win/rpmd.ps1` → `https://f.xbta.cc/ai/win/rpm-centos7.ps1`

## 2.0.1 (2026-10-19)

静态分析（PSScriptAnalyzer 1.25.0）后的收尾修正，行为不变：

- `-NoCache` 显式映射到 `$script:` 作用域，避免跨作用域引用
- `Get-RemoteText` 改为内联重试，删除只被它使用的 `Invoke-Retry`
- `Walk-DepTree` → `Get-DepOrder`、`Build-Indices` → `Build-Index`、`Get-FileOwners` → `Find-FileOwner`（动词与名词单复数规范）
- 3 处有意静默的 `catch` 补 `Write-Verbose`，排查时 `-Verbose` 可见原因

静态检查结论：

| 检查项 | 结果 |
|---|---|
| PowerShell 语法解析（8114 token） | 0 错误 |
| PSScriptAnalyzer 5.1 兼容性（`PSUseCompatibleSyntax` / `Commands` / `Types`，profile `win-48_x64_10.0.17763.0_5.1.17763.316`） | **0 问题** |
| 全规则集剩余告警 | 60 条 `PSAvoidUsingWriteHost`（命令行彩色输出的固有用法）+ 2 条 `PSUseShouldProcessForStateChangingFunctions`（脚本场景不适用） |

## 2.0 (2026-10-19)

### 修复

| # | 问题 | 影响 |
|---|---|---|
| 1 | 仓库顺序压过版本号：`base` 排在 `updates` 前面就永远选 base | 实测 1396 个多候选包名分组中 1395 组选到旧版本。`httpd` 取 `2.4.6-95.el7.centos`（2020 年快照）而不是 `2.4.6-99.el7.centos.1`；`openssl-libs` 取 `1.0.2k-19` 而非 `1.0.2k-26`，跳过 7 个安全版本 |
| 2 | 版本比较用 `[string]::CompareOrdinal` | 同仓库内多版本组 833 个，138 组选错：`bind` 取 `el7_9.9` 而非 `el7_9.16`（`'9' > '1'`）、`kernel` 取 `1160.99.1` 而非 `1160.119.1`。2.0 改为 rpm 版本序（epoch → version → release，分段比较，数字段按数值、字母段按字典序） |
| 3 | `requires` 的 `flags` / `ver` 被完全丢弃 | 三个仓库共 35109 条带约束的依赖（`EQ` 7347、`GE` 3423 等）不参与选包。2.0 让约束参与候选过滤；约束无法满足时放宽为最高版并在输出中提示，不静默漏包 |
| 4 | 下载中断留下半截文件，且 `Test-Path` 判定「已存在」跳过 | 拿到损坏 rpm 却报成功。2.0 改为写 `*.part`、成功才改名，并按 repodata 的 `<size package>` 校验字节数；已存在文件同样校验，不符自动重下 |
| 5 | `-Repo base,updates` 报「未知仓库」 | 数组传给 `[string]` 参数会变成空格连接的 `"base updates"`，而帮助里的示例正是这种写法。2.0 参数改为 `[string[]]`，并按 `[,\s]+` 切分，两种写法都支持 |
| 6 | `-Arch any` 实际只保留 noarch | `$c.Arch -eq 'any'` 恒为假，x86_64 候选全被跳过，最后回退到「第一个候选」。2.0 修正架构池过滤 |
| 7 | 多个 URL 仓库的缓存互相覆盖 | 仓库名取 URL 末段（都是 `x86_64`），`*-primary.xml.gz` 撞名。2.0 用 URL 的 SHA256 前 8 位做仓库名 |
| 8 | `-NoCache` 不覆盖 filelists 缓存 | 文件索引始终复用旧文件。2.0 统一走 `Get-CachedFile` |
| 9 | capability 去 ISA 后缀后回退必定失败 | `ConvertTo-BaseSoName` 得到 `libc.so.6`，但索引的键是 `libc.so.6()(64bit)`，回退分支形同虚设。2.0 在 capability 索引里同时登记基础名 |
| 10 | `%LOCALAPPDATA%` 为空时 `Join-Path` 抛错 | 2.0 回退到 `%TEMP%`，再不行用当前目录 |

### 变更

- **缓存层合并**：去掉 `<repo>.meta.json` 与 `<repo>-<arch>.idx` 两层缓存，改为「repomd 给出的 href 文件名（含 sha256）直接作为缓存文件名」。命中即用，不需要比对 revision 与 size，也不会跨仓库冲突。副作用：每次运行重新解析 primary.xml，不再复用解析结果。
- **capability 索引按需建立**：只为 `requires` 里出现过的名字建索引。三个仓库的 provides 合计约 145 万条，索引键从 147.9 万降到约 2.4 万。
- **解析循环合并**：路径依赖处理与 BFS 合并进同一个 `while`，去掉原先用 scriptblock + `. $bfs` 自调用的写法。
- **`install.sh` 去掉 `--oldpackage`**：避免把目标机已装的新版本降级；`yum localinstall` 仍保留 `--disablerepo='*'`，缺包时立即报错而不是静默联网补齐。
- **帮助输出**改为单段 here-string；删除 `Write-Head` / `Write-Ok` 两个从未调用的函数、无用的 `Add-Type`、空 `elseif` 分支。
- **映射表精简**：删除 21 条「叶名与包名相同」的冗余条目（`/bin/sed`、`/usr/bin/curl` 等由通用启发式命中），补充 `semanage` / `sestatus` / `restorecon`。
- **`Get-RemoteText` 增加重试**（与下载一致，3 次 + 退避）。

### 新增

- 输出「N 个依赖的版本约束无法满足，已按最高可用版本处理」，把近似判断的结果显式告知
- 下载前/后的大小校验；`.part` 失败清理
- `-Help` 里的仓库与选包策略说明

### 验证

**语法与算法**

- PowerShell 语法解析（`[Parser]::ParseFile`，8107 token）0 错误
- 版本比较：12 组边界用例（`el7_9.9` vs `el7_9.16`、`1160.99.1` vs `1160.119.1`、`2.17-326.el7_9` vs `.3`、`1.10` vs `1.9` 等）与参考 rpmvercmp 实现 0 差异
- 选包：阿里云 base + updates + epel（26520 个 x86_64/noarch 包）的 1463 个多候选分组全部重算，与「理想最新版」0 不一致

**真实运行**（Linux 上的 PowerShell 7.5.6）

| 场景 | 结果 |
|---|---|
| `-s nethogs`（默认三仓库） | 21 包 / 20.4 MB，未解析依赖 0；`glibc` 取 `2.17-326.el7_9.3`、`bash` 取 `4.2.46-35.el7_9`（均为 updates 最新） |
| `-s httpd` | 117 包 / 89.7 MB，目标包为 `httpd-2.4.6-99.el7.centos.1`（updates），未解析 0 |
| `-s telnet -Repo base,updates` | 19 包 / 20.0 MB，选中 `0.17-66.el7`（updates），逗号数组参数不再报错 |
| `-s telnet -Repo base -Arch any` | 正常选中 x86_64 包（`-Arch any` 不再只留 noarch） |
| `-d nethogs` | 下载成功，rpm 校验为 `RPM v3.0 bin i386/x86_64`，自动生成 `install.sh` |
| 重复运行 | 正确显示「已存在」，不重复下载 |
| 人为截断 rpm 后重跑 | 检测到「大小不符」并自动重下，恢复为原始字节数 |
| `-s a -d b` | 正确报错并打印帮助 |
| `-s notexistpkg` | 正确提示未找到 + EPEL 建议 |

未在 Windows PowerShell 5.1 上实机运行；脚本按 5.1 语法编写，兼容性已用 PSScriptAnalyzer 的 5.1 规则集扫描（见上表）。


## 1.0

初始版本。
