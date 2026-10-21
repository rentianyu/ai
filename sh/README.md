# Shell 脚本

服务器与本地命令行自动化脚本。全部为单文件 **POSIX sh**，除系统自带命令外无外部依赖，可直接阅读与审计、拷走即用。

| 脚本 | 功能 | 版本 | 安装 |
|---|---|---|---|
| [opsq.sh](opsq.sh) | Linux 统一运维查询入口：一个开关 + 一个值，按 端口 / PID / UID / 进程名 / 文件 / 服务 / 定时任务 查全貌，另带笔记本 / 日志检索 / 快照对比 / 自检；参数顺序不限 | 1.7.0 | `curl -fsSL https://f.xbta.cc/ai/sh/install.sh \| sh -s opsq` |

> [install.sh](install.sh) 是通用安装器（不是待安装的脚本），下一个章节说明用法。

---

## 安装器 install.sh

本目录所有脚本共用一个安装器：不带参数时列出菜单让你选，带参数时直接装指定脚本。

```bash
# 交互选择：列出可用脚本，输入序号或名称
curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh

# 直接装指定脚本（推荐，适合脚本化）
curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh -s opsq

# 指定安装路径
curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh -s opsq /usr/local/bin/opsq

# 只看清单，不安装（注意 -- 分隔，否则 --list 会被 sh 自己吃掉）
curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh -s -- --list

# 同上，管道场景的备选写法
curl -fsSL https://f.xbta.cc/ai/sh/install.sh | SH_LIST=1 sh
```

本地有文件时也可以直接跑：

```bash
sh install.sh --list
sh install.sh opsq                       # 装到默认路径
sh install.sh opsq /usr/local/bin/opsq   # 指定路径
sh install.sh win/rpm-centos7.ps1        # 未登记的脚本：按远端文件名直取
```

选项：`-l/--list` 列清单、`-h/--help` 帮助、`-V/--version` 版本、`--base <URL>` 换分发源。
环境变量 `SH_BASE_URL` 可覆盖分发根地址，`SH_LIST=1` 等价于 `--list`。

> 管道调用时注意：`curl ... | sh -s --list` 里的 `--list` 会被 `sh` 当成自己的选项而报 `Illegal option`，
> 正确写法是 `sh -s -- --list`，或直接用 `SH_LIST=1`。

安装行为说明：

- 从 `https://f.xbta.cc/ai/sh/<文件>` 下载，`.sh` 文件先做 `sh -n` 语法校验
- 先写同目录隐藏临时文件再 `mv` 原子替换，不产生半截文件
- 目录不可写时直接报错，不会静默降级到别处
- 非交互环境（CI、`< /dev/null`）不带参数会明确报错，要求指定脚本名，不会误装默认项

---

## opsq.sh

把「先查端口、再查进程、再查服务、再看日志」这几步合成一条命令。核心设计是 **一个开关 + 一个值**，选项少到不用记。

### 安装

```bash
curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh -s opsq
opsq --update        # 已安装的后续更新
```

也可直接下载单文件：`https://f.xbta.cc/ai/sh/opsq.sh`

### 用法

```bash
# 参数顺序不限（全局选项可放任意位置，开关前后的值都能识别）
opsq -p 8080         # 端口：谁在监听 + 连接数 + 来源 IP + 进程全貌
opsq 8080 -p         # 与上面等价
opsq -d 5 -b 1234    # 与 opsq -b 1234 -d 5 等价
opsq -u 1000         # 用户：UID 或用户名均可，档案 + 全部进程 + 占用端口
opsq -i 1234         # 进程：cmdline / exe / cwd / 父子 / systemd 归属 / 端口
opsq -c nginx        # 进程名或命令行关键字，表格 + 前 3 个详情
opsq -f /var/log/x   # 文件：谁打开着它
opsq -b 1234         # 带宽：该进程实时 RX/TX（TCP）
opsq -b              # 带宽排行：全部进程 Top 10
opsq -b 1234 -d 5    # 5 秒平均 + 峰值（秒数用 -d）
opsq -b --cum        # 累计流量排行
opsq -io             # 磁盘 IO 排行（实际落盘字节）
opsq -io 1234 -d 5   # 单进程 IO 5 秒平均
opsq -s nginx        # systemd 服务：状态 + 进程 + 端口 + 日志尾
opsq -t              # 定时任务：systemd timer + crontab 全部列出
opsq -t backup       # 单个任务：调度 + 上次结果 + 日志
opsq -r 1.2.3.4      # 反查：某 IP/域名被本机哪个进程连着
opsq --audit         # 暴露面巡检：哪些端口对外暴露、归属哪个服务
opsq -n              # 笔记本：查看全部笔记
opsq -n add 部署完了  # 记一笔（自动加时间戳）
opsq -n edit         # 用编辑器打开笔记
opsq -n tail 20      # 最后 20 条
opsq -n search 报错   # 关键词搜索（行号:内容）
opsq -n del 3        # 删除第 3 行
opsq -g 报错          # 日志：全局按关键词检索
opsq -g 报错 -s nginx --since 10min --lines 100   # 限定服务 + 时间窗 + 条数
opsq --snapshot save # 快照：保存端口/进程/服务基线
opsq --snapshot diff # 快照：与基线比差异（谁新开、谁消失）
opsq --selfcheck     # 自检：依赖组件、降级档位、运行环境
opsq -p 80,443       # 批量：端口/PID 可逗号分隔一次查多个
opsq --json ...      # 任意命令输出结构化 JSON（位置随意）
```

速记：`p`=port `u`=user `i`=pid `c`=cmd `f`=file `b`=bandwidth `io`=disk io `s`=service `t`=timer `r`=reverse `n`=note `g`=log

各子命令还有独立帮助：`opsq -b -h`、`opsq -io -h`、`opsq -g -h`、`opsq -n -h`、`opsq --snapshot -h`。
颜色支持 `--no-color`、`NO_COLOR` 环境变量与配置 `COLOR=0`，非 TTY / `--json` 下自动无色。

裸数字等价于端口查询：`opsq 8080` = `opsq -p 8080`。

### 输出示例

```
$ opsq -p 8080
--[ 端口 8080 ]----------------------------------------------------
  监听状态 :
    tcp   0.0.0.0:8080                nginx (pid 1234)
--[ 连接情况 ]----------------------------------------------------
  连接数   : 24 条  (ESTAB 20 / TIME-WAIT 4)
  暴露面   : 对外可访问
  来源 TOP : 198.51.100.7       × 12
--[ 关联进程 ]----------------------------------------------------
PID     PPID    USER          CPU%      RSS    UPTIME S  COMMAND
1234    1       www-data       0.3      18M  12d04h01m S  nginx: worker process
--[ 进程 1234 ]----------------------------------------------------
  命令行   : nginx: worker process
  工作目录 : /
  父进程   : 1201  nginx: master process /usr/sbin/nginx
  所属服务 : nginx.service
  监听端口 :
    tcp   0.0.0.0:8080
```

### JSON 输出

所有模式支持 `--json`，统一结构 `{query, time, count, items}`，便于接监控脚本：

```bash
opsq -p 8080 --json | jq '.items[0].service'
opsq --audit --json | jq '.summary'
opsq -t --json | jq '.crontab[] | select(.command | contains("backup"))'
```

### 笔记本

运维过程随手记一条，不用切工具。笔记与配置统一放 `/opt/opsq/`：

| 文件 | 用途 |
|---|---|
| `/opt/opsq/opsq-note.txt` | 笔记正文（默认） |
| `/opt/opsq/opsq.conf` | 配置，记录当前笔记文件路径 |

```bash
opsq -n                   # 查看全部笔记
opsq -n add 部署完了       # 追加一条，自动带时间戳
opsq -n 部署完了           # 同上（简写）
opsq -n edit              # 用 $EDITOR / vi / nano / editor 打开编辑
opsq -n tail 20           # 最后 20 条（默认取 LINES 配置）
opsq -n search 报错        # 关键词搜索，输出「行号:内容」（正则匹配）
opsq -n del 3             # 删除第 3 行，回显被删内容
opsq -n file              # 显示当前笔记文件
opsq -n file /root/x.txt  # 切换到别的笔记文件
```

写入格式：`[2026-10-21 09:04:15] 部署完了`（中国时间，UTC+8）。

**创建前的占用检测**：首次使用会创建笔记文件，若默认路径已被占用会先询问是否换用别的文件：

```
笔记文件 /opt/opsq/opsq-note.txt 已存在（1 行）。
是否换用别的文件？[y/N] y
新笔记文件路径: /root/my-note.txt
已记录 -> /root/my-note.txt
```

非交互环境（脚本、管道、CI）不会卡在提示上，直接沿用默认路径。换文件也可事后用
`opsq -n file <路径>` 手动指定，选择会记入 `opsq.conf`，之后不再询问。
目录可用环境变量 `OPSQ_DIR` 整体改到别处。

### 参数顺序与去重

**顺序不限**：入口先剥离全局选项（`--json`、`--no-color`），再扫描出第一个功能开关，
把开关前面的参数挪到后面重新分发——因此：

```bash
opsq 8080 -p              # 等同 opsq -p 8080
opsq -d 5 -b 1234         # 等同 opsq -b 1234 -d 5
opsq --json -t            # 全局选项可在任意位置
opsq 测试条目 -n add       # 等同 opsq -n add 测试条目
```

一旦锁定功能开关，之后出现的同名串一律按**值**处理：`opsq -n add -p 8080` 里的
`-p` 是笔记内容，不会被当成端口查询。

**开关不重复**（一个开关只有一种含义，短选项只在一处生效）：

| 开关 | 归属 | 说明 |
|---|---|---|
| `-n` | 仅笔记本 | `-b`/`-io` 的采样秒数改为 `-d` |
| `-c` | 仅进程名查询 | `-b` 的累计榜改为 `--cum` |
| `--lines` | 日志条数 | 去掉与 `-l` 易混的 `-L` |
| `-s` | 服务 / 日志限定服务 | 两处语义相同，均为「服务」 |

> **破坏性变更（v1.7.0）**：`opsq -b 1234 -n 5` → `opsq -b 1234 -d 5`、
> `opsq -b -c` → `opsq -b --cum`、`opsq -g x -L 5` → `--lines 5`。
> 旧写法不会静默出错，会直接报错并给出新写法。

### 日志检索 `-g`

```bash
opsq -g 报错                       # 全局按关键词（扩展正则）
opsq -g 报错 -s nginx              # 只看某个服务
opsq -g 报错 --since 10min         # 时间窗（journalctl --since 语法）
opsq -g 报错 --lines 100           # 返回条数（默认取 LINES 配置）
opsq -g -s nginx                   # 关键词可省：服务最近日志
opsq -g 报错 --file /var/log/x.log # 指定日志文件
```

日志源优先级：`--file` > `journalctl` > `logread`（OpenWrt/busybox）> `/var/log/{syslog,messages,kern.log}`。
关键词按 `journalctl -g` / `grep -E` 的扩展正则语义。

### 快照对比 `--snapshot`

谁新开的端口、谁起的进程、哪个服务没了——用基线对比一目了然：

```bash
opsq --snapshot save   # 保存当前 端口/进程/服务 为基线（上一份留为 base.prev.txt）
opsq --snapshot diff   # 当前 vs 基线：新增了什么、消失了什么
opsq --snapshot list   # 基线摘要（构成 + 保存时间）
```

典型流程：变更前 `save`，变更后 `diff`。基线文件在 `$OPSQ_DIR/snap/base.txt`。

- 记录维度：`PORT <地址> <进程>` / `PROC <进程名>` / `SVC <服务名>`
- 与系统无关的**工具进程不入快照**（脚本自身子进程、管道里的 `grep`/`tail` 等），避免 `opsq --snapshot diff | grep xxx` 把 grep 自己算成"新增进程"
- 后台启动的真实业务进程正常纳入

### 自检 `--selfcheck`

```bash
opsq --selfcheck
opsq --selfcheck --json | jq .grade
```

输出依赖组件状态（ss / netstat / lsof / systemctl / journalctl / logread / python3 / curl / /proc / 笔记目录）、
运行环境（系统、架构、身份、配置文件）与**功能档位**（完整功能 / 降级原因）——降级时立刻知道是缺哪个组件。

### 配置文件

`$OPSQ_DIR/opsq.conf`（默认 `/opt/opsq/opsq.conf`），`KEY=VALUE` 格式，按行解析、**不 source**（配置被改也不会导致命令执行）：

| 键 | 作用 | 示例 |
|---|---|---|
| `NOTE_FILE` | 笔记文件路径 | `NOTE_FILE=/root/便签.txt` |
| `LINES` | `-g` 与 `-n tail` 默认条数 | `LINES=50` |
| `BW_N` | `-b` / `-io` 默认采样秒数（1-60） | `BW_N=5` |
| `COLOR=0` | 禁用颜色（等价 `NO_COLOR=1`） | `COLOR=0` |

笔记操作会**合并更新**配置（只刷新 `OPSQ_DIR`/`NOTE_FILE`），不会冲掉其它键。

### 定时任务的下次执行时间

`opsq -t` 的 crontab 列表带 `NEXT` 列，单条查询（`opsq -t <关键字>`）也有「下次」行：

```
  USER      SCHEDULE       NEXT                 来源         COMMAND
  root      @daily         10-22 00:00（14小时4分后） cron.daily  /etc/cron.daily/apt-compat
```

支持 `*`、`a-b`、`*/n`、逗号列表、`@daily/@hourly/@weekly/@monthly/@yearly/@reboot`、
英文周名（`sun`）、日/周同时指定的 OR 语义。分/时先用算术哈希过滤、命中后才查日历，16 条 cron 约 0.06s。
扫描窗口 32 天，超出显示「32天内无」（如 `0 0 29 2 *`）。

### 兼容性

| 环境 | 状态 |
|---|---|
| Debian / Ubuntu（systemd + iproute2） | 完整功能 |
| OpenWrt / busybox（无 systemd、无 ss） | 核心功能：`-p -i -c -u -f -l -t -io -g --audit --snapshot -n` 可用（自动回退 netstat 与 `/proc` 解析；`-g` 走 `logread` 或 `/var/log`）；`-b`（带宽）与 `-r`（反查）依赖 `ss`，会明确提示 |

### 依赖

全部为系统自带命令，无第三方包：

- **必须**：`/proc` 文件系统、`awk`、`sed`、`grep`、`sort`、`tr`、`cut`、`mktemp`
- **强烈建议**：`ss`（iproute2）—— 端口与连接查询最快最准；缺失时自动回退 `netstat` 或直接解析 `/proc/net/{tcp,tcp6,udp,udp6}`
- **可选**：`lsof`（加速文件查询）、`systemctl`（服务与 timer 查询）、`journalctl`/`logread`（`-g` 日志源）、`python3`（timer 一览的 JSON 解析）、`curl`（`--update`）

### 实现要点

- 性能：`ss` 全量结果缓存到单个临时文件复用；进程遍历用一次 `awk` 扫 `/proc/*/status`；进程名匹配用一次 `grep -laF` 扫 `/proc/*/cmdline`。120 进程环境下 `-c` 约 0.03s、`-u root` 约 0.4s、`-t` 约 0.09s。
- 带宽与 IO 用两次采样求差（间隔 1 秒），`-n N` 取 N 秒平均与峰值。
- 临时文件均带 `$$` 后缀并在 `trap EXIT` 中清理，不残留。
- 只读工具：除 `--update` 替换自身与 `-n` 写笔记文件外，不修改系统任何状态。
- 笔记本：路径选择按 KEY=VALUE 解析 `opsq.conf`（不 source，避免配置被写入命令）；建文件用子 shell 包裹重定向（`(: > file)`），否则 dash/busybox 下特殊内建命令重定向失败会中止整个脚本。
- 快照进程采集用**单 awk** 完成（不走 `| sort | sed` 并发管道，会扫到自身子进程造成 save/diff 时序噪声），并按「父 PID + 工具白名单」排除自身与管道兄弟。
- 日志检索用 `set --` 构造 journalctl 参数（不拼接字符串，避免关键词/服务名注入）。

### 已知边界

- `-b` 只统计 TCP（`ss -tinp` 的 tcp_info），UDP 无此统计；累计值随连接关闭清零。
- `-io` 只统计实际落盘字节，走 page cache 的读取不计入。
- `-t` 的 crontab 下次执行时间为 32 天窗口内计算，超窗（如每年一次）显示「32天内无」；systemd timer 由 systemctl 给出精确时间。
- 非 root 运行时他人进程与 socket 信息可能不可见，会给出提示。
- `-n` 在非 root 下若 `/opt/opsq` 不可写会明确报错，可用 `OPSQ_DIR` 或 `opsq -n file <路径>` 改到可写位置。

## License

MIT，见 [LICENSE](LICENSE)。
