#!/bin/sh
# opsq - Linux 统一查询入口（POSIX sh，零第三方依赖）
# 一个开关 + 一个值：按 端口 / PID / UID / 用户名 / 进程名 / 文件 / 服务 / 定时任务
# 任一维度，一次输出进程明细、完整命令行、cwd、systemd 归属、监听端口、连接来源、
# 实时带宽与磁盘 IO。
# 兼容 Debian/Ubuntu（完整功能）与 OpenWrt busybox（无 ss 时回退 netstat 与 /proc 解析）。
#
# 作者: 小贝塔
# 许可: MIT
# 仓库: https://github.com/rentianyu/ai
# 分发: https://f.xbta.cc/ai/sh/opsq.sh
# 安装: curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh

VERSION="1.7.0"
LC_ALL=C
export LC_ALL

HZ=$(getconf CLK_TCK 2>/dev/null || echo 100)
UPTIME=$(cut -d' ' -f1 /proc/uptime 2>/dev/null)

have() { command -v "$1" >/dev/null 2>&1; }

# ---- 配置：$OPSQ_DIR/opsq.conf（KEY=VALUE，用 case 解析、不 source，避免配置被写入命令）----
# 支持: NOTE_FILE=笔记路径  LINES=默认条数  BW_N=默认采样秒数  COLOR=0 禁用颜色
OPSQ_DIR="${OPSQ_DIR:-/opt/opsq}"
NOTE_CONF="$OPSQ_DIR/opsq.conf"
NOTE_DEFAULT="$OPSQ_DIR/opsq-note.txt"
NOTE_FILE="${NOTE_FILE:-}"
_cfg_lines=""; _cfg_bw=""
if [ -r "$NOTE_CONF" ]; then
    while IFS= read -r _cl || [ -n "$_cl" ]; do
        case "$_cl" in
            ''|'#'*)                continue ;;
            NOTE_FILE=*)            NOTE_FILE=${_cl#NOTE_FILE=} ;;
            LINES=*)                _cfg_lines=${_cl#LINES=} ;;
            BW_N=*)                 _cfg_bw=${_cl#BW_N=} ;;
            COLOR=0)                NO_COLOR=1 ;;
        esac
    done < "$NOTE_CONF"
fi
[ -n "$_cfg_lines" ] && LINES=$_cfg_lines
[ -n "$_cfg_bw" ]    && BW_N=$_cfg_bw

# 颜色（仅 TTY 且非 JSON 时启用；字段值内的颜色会破坏 printf 对齐，故只用于整行）
if [ -t 1 ] && [ -z "$NO_COLOR" ]; then
    C_RED=$(printf '\033[31m'); C_GRN=$(printf '\033[32m')
    C_YLW=$(printf '\033[33m'); C_CYN=$(printf '\033[36m')
    C_DIM=$(printf '\033[2m');  C_RST=$(printf '\033[0m')
else
    C_RED=''; C_GRN=''; C_YLW=''; C_CYN=''; C_DIM=''; C_RST=''
fi

# 非 root 提示
NONROOT=0
[ "$(id -u 2>/dev/null || echo 0)" != "0" ] && NONROOT=1

# ss 全量结果缓存：一次抓取，多处复用（$$ 在子 shell 中不变，路径稳定）
SS_CACHE="/tmp/.opsq-ss.$$"
trap 'rm -f "$SS_CACHE"' EXIT INT TERM HUP
ss_dump() {
    [ -s "$SS_CACHE" ] || ss -H -tunap 2>/dev/null > "$SS_CACHE"
    printf '%s\n' "$SS_CACHE"
}

# hex 端口 -> 十进制（不依赖 gawk strtonum）
h2d() {
    printf '%d' "0x$1" 2>/dev/null || awk -v h="$1" 'BEGIN{n=0;h=toupper(h);for(i=1;i<=length(h);i++){c=substr(h,i,1);n=n*16+index("0123456789ABCDEF",c)-1}print n}'
}

# /proc/net/{tcp,tcp6,udp,udp6} 中匹配端口的 socket inode 列表
inodes_by_port() {
    _px=$(printf '%04X' "$1" 2>/dev/null) || return 0
    for _f in /proc/net/tcp /proc/net/tcp6 /proc/net/udp /proc/net/udp6; do
        [ -r "$_f" ] || continue
        awk -v h="$_px" 'NR>1 { n=split($2,a,":"); if (toupper(a[n]) == h) print $10 }' "$_f" 2>/dev/null
    done | sort -u
}

# inode -> PID（一次 ls 全部 fd，按目录头跟踪 pid）
pids_by_inodes() {
    ls -l /proc/[0-9]*/fd 2>/dev/null | awk -v ins="$1" '
        BEGIN { n = split(ins, t, "\n"); for (i = 1; i <= n; i++) if (t[i] != "") want[t[i]] = 1 }
        /^\/proc\/[0-9]+\/fd:$/ { p = $0; gsub(/[^0-9]/, "", p); next }
        match($0, /socket:\[[0-9]+\]/) {
            ino = substr($0, RSTART + 8, RLENGTH - 9)
            if (ino in want) print p
        }' | sort -un | tr '\n' ' '
}

hr()  { printf '%s\n' "================================================================================"; }
sec() {
    _pad=$(printf '%s' '------------------------------------------------------------------------' | cut -c1-$(( 64 - ${#1} )))
    printf '\n%s--[ %s ]%s%s\n' "$C_CYN" "$1" "$_pad" "$C_RST"
}

die() { printf '%sopsq:%s %s\n' "$C_RED" "$C_RST" "$*" >&2; exit 1; }
ok()  { printf '%s%s%s\n' "$C_GRN" "$*" "$C_RST"; }
warn(){ printf '%s%s%s\n' "$C_YLW" "$*" "$C_RST"; }
dim() { printf '%s%s%s\n' "$C_DIM" "$*" "$C_RST"; }

usage() {
cat <<EOF
opsq $VERSION - Linux 统一查询入口（一个开关 + 一个值）

  顺序不限: opsq 8080 -p、opsq -d 5 -b 1234、opsq --json -t 都可以；
  开关后出现的同名串一律按值处理（opsq -n add -p 8080 里的 -p 是笔记内容）。

${C_CYN}[ 查询 ]${C_RST}
  opsq -p 8080         端口    谁在监听 + 连接来源 + 进程全貌
  opsq -p 80,443       批量    端口/PID 逗号分隔一次查多个
  opsq -u 1000         用户    UID 或用户名均可，出档案 + 全部进程 + 端口
  opsq -i 1234         进程    PID 全貌（cmdline/exe/cwd/父子/服务/端口）
  opsq -c nginx        进程名  关键字匹配，表格 + 前 3 个详情
  opsq -f /tmp/x.log   文件    谁打开着它
  opsq -l              一览    当前所有监听端口
  opsq 8080            裸数字  等同 -p 8080

${C_CYN}[ 性能 ]${C_RST}
  opsq -b 1234         带宽    该进程实时 RX/TX（1 秒采样）
  opsq -b              带宽榜  全部进程实时带宽 Top 10
  opsq -b 1234 -d 5    多秒平均 5 秒平均 + 峰值（-d 1..60，秒数用 -d 不用 -n）
  opsq -b --cum        累计榜  按 TCP 累计字节排序（-b <pid> --cum 亦可）
  opsq -io             磁盘IO  全部进程读写排行 Top 10
  opsq -io 689 -d 5    磁盘IO  单进程 5 秒平均读/写

${C_CYN}[ 系统 ]${C_RST}
  opsq -s nginx        服务    systemd 状态 + 进程 + 端口 + 日志尾
  opsq -t              定时任务 systemd timer + crontab（含下次执行时间）
  opsq -t backup       定时任务 单个：调度 + 下次执行 + 上次结果 + 日志
  opsq -r 1.2.3.4      反查    某 IP/域名被本机哪个进程连着
  opsq --audit         巡检    哪些端口对外暴露（含归属服务）

${C_CYN}[ 日志 · 快照 · 自检 ]${C_RST}
  opsq -g 报错          日志    关键词检索（journal/logread/文件回退）
  opsq -g 报错 -s nginx --since 10min --lines 100
  opsq --snapshot save 端口/进程/服务存基线，diff 看变化（list 看摘要）
  opsq --selfcheck     自检    依赖组件、降级档位、运行环境

${C_CYN}[ 笔记本 ]${C_RST}
  opsq -n              查看全部笔记
  opsq -n add 部署完了   记一笔  自动加中国时间时间戳
  opsq -n edit         用编辑器打开笔记（\$EDITOR / vi / nano）
  opsq -n tail 20      最后 20 条
  opsq -n search 报错   关键词搜索（行号:内容）
  opsq -n del 3        删除第 3 行（回显被删内容）
  opsq -n file [路径]   查看/切换笔记文件

${C_CYN}[ 其他 ]${C_RST}
  opsq --json ...      任意命令输出结构化 JSON（可放任意位置）
  opsq --no-color      禁用颜色（也可用 opsq.conf 的 COLOR=0 或环境变量 NO_COLOR）
  opsq --update        从 f.xbta.cc 拉新版本并自替换
  opsq -h / opsq -v    帮助 / 版本

  速记: p=port u=user i=pid c=cmd f=file b=bandwidth io=disk s=service t=timer r=reverse l=list n=note g=log
  各子命令用法: opsq -b -h、opsq -io -h、opsq -g -h、opsq -n -h、opsq --snapshot -h
  示例: opsq -p 60443 --json | jq .conn.top_src
EOF
}

# ------------------------------------------------------------------ 基础取值
# 解析 /proc/PID/stat -> S_STATE S_PPID S_CPU S_RSS_Kb S_ELAPSED s_CMD
read_proc() {
    _pid=$1
    [ -r "/proc/$_pid/stat" ] || return 1
    # 一次 awk 同时取 stat + status，避免逐字段 fork
    _vals=$(awk -v hz="$HZ" -v up="$UPTIME" '
        FILENAME ~ /\/stat$/ {
            line = $0; p = 0
            for (i = length(line); i > 0; i--) if (substr(line, i, 1) == ")") { p = i; break }
            n = split(substr(line, p + 2), f, " ")
            st = f[1]; pp = f[2]; ut = f[12]; stt = f[13]; start = f[20]
            next
        }
        {
            if ($1 == "Uid:") uid = $2
            else if ($1 == "VmRSS:") rss = $2
        }
        END {
            if (start == "") start = 0
            alive = up - start / hz
            if (alive < 0) alive = 0
            cpu = (alive <= 0) ? 0 : (ut + stt) / hz / alive * 100
            printf "%s %s %.1f %s %d %d\n", st, pp, cpu, (uid == "" ? 0 : uid), (rss == "" ? 0 : rss), alive
        }' "/proc/$_pid/stat" "/proc/$_pid/status" 2>/dev/null) || return 1
    set -- $_vals
    [ -n "$1" ] || return 1
    S_STATE=$1; S_PPID=$2; S_CPU=$3; S_USER=$4; S_RSS_Kb=$5; S_ALIVE=$6
    S_ELAPSED=$(_fmt_dur "$S_ALIVE")
    S_CMD=$(tr -s '\000\n\r\t' ' ' < "/proc/$_pid/cmdline" 2>/dev/null)
    S_CMD=${S_CMD% }
    [ -n "$S_CMD" ] || S_CMD="[$(awk '$1=="Name:"{print $2; exit}' "/proc/$_pid/status" 2>/dev/null)]"
    return 0
}

_fmt_dur() {
    awk -v t="$1" 'BEGIN{
        t=int(t)
        d=int(t/86400); t-=d*86400; h=int(t/3600); t-=h*3600; m=int(t/60); s=t-m*60
        if(d>0) printf "%dd%02dh%02dm", d,h,m
        else if(h>0) printf "%dh%02dm", h,m
        else if(m>0) printf "%dm%02ds", m,s
        else printf "%ds", s
    }'
}

# 用户 uid -> 名字
uid2name() { awk -F: -v u="$1" '$3==u{print $1; exit}' /etc/passwd 2>/dev/null; }
name2uid() { awk -F: -v n="$1" '$1==n{print $3; exit}' /etc/passwd 2>/dev/null; }

# PID 的 systemd 服务（cgroup 解析，busybox 环境返回空）
svc_of() {
    awk -F'/' '/\.service/{print $NF; exit}' "/proc/$1/cgroup" 2>/dev/null
}

# PID 占用的 TCP/UDP 端口（输出: State Netid Local Peer）
ports_of_pid() {
    _p=$1
    if have ss; then
        awk -v p="pid=$_p," 'index($0,p){ printf "%s %s %s %s\n", $2, $1, $5, $6 }' "$(ss_dump)"
    else
        _ino=$(ls -l "/proc/$_p/fd" 2>/dev/null | sed -n 's/.*socket:\[\([0-9]*\)\].*/\1/p' | sort -u)
        [ -n "$_ino" ] || return 0
        for _f in /proc/net/tcp /proc/net/tcp6 /proc/net/udp /proc/net/udp6; do
            [ -r "$_f" ] || continue
            awk -v ins="$_ino" -v f="$(basename "$_f")" '
                BEGIN { n = split(ins, t, "\n"); for (i = 1; i <= n; i++) want[t[i]] = 1 }
                function h2d(h,  i, c, n, v) { n = 0; h = toupper(h);
                    for (i = 1; i <= length(h); i++) { c = substr(h, i, 1); v = index("0123456789ABCDEF", c) - 1; n = n * 16 + v }
                    return n }
                NR > 1 && ($10 in want) {
                    n = split($2, a, ":");
                    st = ($4 == "0A") ? "LISTEN" : $4;
                    peer = "*"; n2 = split($3, b, ":");
                    if ($4 != "0A") peer = h2d(b[n2]);
                    printf "%s %s %s:%d %s\n", st, f, "*", h2d(a[n]), peer
                }' "$_f" 2>/dev/null
        done
    fi
}

# ------------------------------------------------------------------ 找 PID
pids_by_port() {
    _port=$1
    if have ss; then
        awk -v P="$_port" '
            {
                hit = 0
                n = split($5, a, ":"); if (a[n] == P) hit = 1
                n = split($6, b, ":"); if (b[n] == P) hit = 1
                if (!hit) next
                s = $0
                while (match(s, /pid=[0-9]+/)) {
                    print substr(s, RSTART+4, RLENGTH-4)
                    s = substr(s, RSTART+RLENGTH)
                }
            }' "$(ss_dump)"
    else
        _ins=$(inodes_by_port "$_port")
        [ -n "$_ins" ] || return 0
        pids_by_inodes "$_ins"
    fi | sort -un | tr '\n' ' '
}

pids_by_uid() {
    awk -v u="$1" '
        FNR == 1 { pid = FILENAME; sub(/.*\/proc\//, "", pid); sub(/\/status$/, "", pid); done = 0 }
        $1 == "Uid:" && !done { if ($2 == u) print pid; done = 1 }
    ' /proc/[0-9]*/status 2>/dev/null | sort -n | tr '\n' ' '
}

pids_by_cmd() {
    # 一次 grep 扫全部 cmdline，比逐进程 fork awk 快一个数量级
    grep -laF -- "$1" /proc/[0-9]*/cmdline 2>/dev/null \
        | sed -e 's|^/proc/||' -e 's|/cmdline$||' \
        | while read -r _p; do
              [ "$_p" = "$$" ] && continue
              [ "$_p" = "$PPID" ] && continue
              printf '%s\n' "$_p"
          done \
        | sort -n | tr '\n' ' '
}

pids_by_file() {
    _target=$(readlink -f "$1" 2>/dev/null || echo "$1")
    if have lsof; then
        lsof -nP -- "$_target" 2>/dev/null | awk 'NR>1{print $2}' | sort -un | tr '\n' ' '
        return
    fi
    for d in /proc/[0-9]*; do
        for fd in "$d"/fd/*; do
            t=$(readlink "$fd" 2>/dev/null) || continue
            [ "$t" = "$_target" ] && { printf '%s ' "${d#/proc/}"; break; }
        done
    done
}

# ------------------------------------------------------------------ 输出
print_proc_table() {
    printf '%s%-7s %-7s %-11s %6s %8s %9s %-2s %s%s\n' "$C_DIM" PID PPID USER CPU% RSS UPTIME S COMMAND "$C_RST"
    printf '%s%-7s %-7s %-11s %6s %8s %9s %-2s %s%s\n' "$C_DIM" ------- ------- ----------- ------ -------- --------- -- ------- "$C_RST"
    for p in $1; do
        read_proc "$p" || continue
        _un=$(uid2name "$S_USER"); [ -n "$_un" ] || _un="$S_USER"
        _rss=$(awk -v k="$S_RSS_Kb" 'BEGIN{ if(k>=1048576) printf "%.1fG", k/1048576; else if(k>=1024) printf "%.0fM", k/1024; else printf "%.0fK", k }')
        _cmd=$(printf '%s' "$S_CMD" | cut -c1-140)
        printf '%-7s %-7s %-11s %6s %8s %9s %-2s %s\n' "$p" "$S_PPID" "$_un" "$S_CPU" "$_rss" "$S_ELAPSED" "$S_STATE" "$_cmd"
    done
}

print_detail() {
    for p in $1; do
        read_proc "$p" || continue
        sec "进程 $p"
        printf '  命令行   : %s\n' "$S_CMD"
        printf '  可执行   : %s\n' "$(readlink "/proc/$p/exe" 2>/dev/null || echo '-')"
        printf '  工作目录 : %s\n' "$(readlink "/proc/$p/cwd" 2>/dev/null || echo '-')"
        printf '  父进程   : %s  %s\n' "$S_PPID" "$( [ -r "/proc/$S_PPID/cmdline" ] && tr '\0' ' ' < "/proc/$S_PPID/cmdline" | cut -c1-80 )"
        printf '  用户     : %s (UID %s)   状态: %s   CPU: %s%%   内存: %sMB   运行: %s\n' \
            "$(uid2name "$S_USER")" "$S_USER" "$S_STATE" "$S_CPU" \
            "$(awk -v k="$S_RSS_Kb" 'BEGIN{printf "%.1f", k/1024}')" "$S_ELAPSED"
        _svc=$(svc_of "$p")
        [ -n "$_svc" ] && printf '  所属服务 : %s\n' "$_svc"
        _kids=$(for k in /proc/[0-9]*; do
                    a=$(awk '$1=="PPid:"{print $2; exit}' "$k/status" 2>/dev/null)
                    [ "$a" = "$p" ] && printf '%s\n' "${k#/proc/}"
                done | sort -n | tr '\n' ' ')
        [ -n "$_kids" ] && printf '  子进程   : %s\n' "$_kids"
        _ports=$(ports_of_pid "$p")
        _listen=$(printf '%s\n' "$_ports" | awk '$1=="LISTEN"{printf "    %-5s %s\n", $2, $3}')
        _nall=$(printf '%s\n' "$_ports" | awk 'NF{n++} END{print n+0}')
        _nlis=$(printf '%s\n' "$_ports" | awk '$1=="LISTEN"{n++} END{print n+0}')
        _ncon=$(( _nall - _nlis ))
        if [ -n "$_listen" ]; then
            printf '  监听端口 :\n%s\n' "$_listen"
        fi
        [ "$_ncon" -gt 0 ] && printf '  活动连接 : %s 条（ESTABLISHED 等非监听）\n' "$_ncon"
        if [ -z "$_listen" ] && [ "$_ncon" -eq 0 ]; then
            printf '  端口     : -\n'
        fi
    done
}

print_user() {
    _uid=$1
    _un=$(uid2name "$_uid")
    sec "用户 $_un (UID $_uid)"
    _line=$(awk -F: -v u="$_uid" '$3==u{print; exit}' /etc/passwd 2>/dev/null)
    if [ -n "$_line" ]; then
        printf '  %-8s %s\n' Home: "$(printf '%s' "$_line" | cut -d: -f6)"
        printf '  %-8s %s\n' Shell: "$(printf '%s' "$_line" | cut -d: -f7)"
    else
        printf '  /etc/passwd 中无此 UID（幽灵用户或容器内）\n'
    fi
    _groups=$(id -Gn "$_uid" 2>/dev/null || true)
    [ -n "$_groups" ] && printf '  %-8s %s\n' Groups: "$_groups"
    _pids=$(pids_by_uid "$_uid")
    _n=$(printf '%s' "$_pids" | wc -w)
    [ "$_n" -eq 0 ] && {
        printf '  %-8s 0 个进程\n' Proc:
        return 0
    }
    # 一次性采集全部进程数据，合计与明细复用同一份
    _dat=$(mktemp) || return 0
    for p in $_pids; do
        read_proc "$p" || continue
        printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$p" "$S_PPID" "$S_USER" "$S_CPU" "$S_RSS_Kb" "$S_ELAPSED" "$S_STATE" "$S_CMD" >> "$_dat"
    done
    _rss=$(awk -F'\t' '{ s += $5 } END { print s + 0 }' "$_dat")
    _cpu=$(awk -F'\t' '{ s += $4 } END { printf "%.1f", s }' "$_dat")
    printf '  %-8s %s 个进程   合计 RSS: %sMB   合计 CPU: %s%%\n' Proc: "$_n" "$((_rss / 1024))" "$_cpu"

    sec "进程明细"
    printf '%-7s %-7s %-11s %6s %8s %9s %-2s %s\n' PID PPID USER CPU% RSS UPTIME S COMMAND
    printf '%-7s %-7s %-11s %6s %8s %9s %-2s %s\n' ------- ------- ----------- ------ -------- --------- -- -------
    awk -F'\t' '
        BEGIN { while ((getline line < "/etc/passwd") > 0) { split(line, a, ":"); nm[a[3]] = a[1] } }
        function hrss(k) {
            if (k >= 1048576) return sprintf("%.1fG", k / 1048576)
            if (k >= 1024) return sprintf("%.0fM", k / 1024)
            return sprintf("%.0fK", k)
        }
        {
            un = ($3 in nm) ? nm[$3] : $3
            cmd = $8; if (length(cmd) > 140) cmd = substr(cmd, 1, 140)
            printf "%-7s %-7s %-11s %6s %8s %9s %-2s %s\n", $1, $2, un, $4, hrss($5), $6, $7, cmd
        }' "$_dat"

    sec "占用的网络端口"
    if have ss; then
        awk -v pids="$_pids" '
            BEGIN { n = split(pids, t, " "); for (i = 1; i <= n; i++) want[t[i]] = 1 }
            $2 != "LISTEN" { next }
            {
                s = $0
                while (match(s, /pid=[0-9]+/)) {
                    p = substr(s, RSTART + 4, RLENGTH - 4)
                    if (p in want) { n2 = split($5, a, ":"); printf "  pid %-7s %-5s %s\n", p, $1, $5 }
                    s = substr(s, RSTART + RLENGTH)
                }
            }' "$(ss_dump)"
    fi
    rm -f "$_dat"
    true
}

# 端口连接统计（ss 优先，busybox 环境回退 netstat；输出 TOTAL/STATE/SRC/LOCAL）
port_conns() {
    if have ss; then
        awk -v P="$1" '
            $1 != "tcp" { next }
            {
                loc = $5; sub(/:[^:]*$/, "", loc); gsub(/^\[/, "", loc); gsub(/\]$/, "", loc)
                if ($2 == "LISTEN") { lcnt[loc]++; next }
                n = split($5, a, ":"); if (a[n] != P) next
                lcnt[loc]++
                total++
                cnt[$2]++
                if ($2 == "ESTAB") {
                    ip = $6; sub(/:[^:]*$/, "", ip); gsub(/^\[/, "", ip); gsub(/\]$/, "", ip)
                    if (ip != "") src[ip]++
                }
            }
            END {
                printf "TOTAL %d\n", total
                for (s in cnt) printf "STATE %s %d\n", s, cnt[s]
                for (i in src) printf "SRC %s %d\n", i, src[i]
                for (l in lcnt) printf "LOCAL %s %d\n", l, lcnt[l]
            }' "$(ss_dump)"
    elif have netstat; then
        netstat -tan 2>/dev/null | awk -v P="$1" '
            NR <= 2 { next }
            {
                n = split($4, a, ":"); if (a[n] != P) next
                loc = $4; sub(/:[^:]*$/, "", loc); lcnt[loc]++
                if ($6 == "LISTEN") next
                total++
                cnt[$6]++
                if ($6 == "ESTABLISHED") {
                    ip = $5; sub(/:[^:]*$/, "", ip)
                    if (ip != "") src[ip]++
                }
            }
            END {
                printf "TOTAL %d\n", total
                for (s in cnt) printf "STATE %s %d\n", s, cnt[s]
                for (i in src) printf "SRC %s %d\n", i, src[i]
                for (l in lcnt) printf "LOCAL %s %d\n", l, lcnt[l]
            }'
    fi
}

# 判断是否对外暴露：有 0.0.0.0 / :: / * 就算
expose_of() {
    awk '
        $1 == "LOCAL" {
            a = $2
            gsub(/^\[/, "", a); gsub(/\]$/, "", a)
            if (a == "0.0.0.0" || a == "::" || a == "*" || a == "") { print "对外可访问"; found = 1; exit }
        }
        END { if (!found) print "仅本机" }'
}

print_port_conns() {
    if ! have ss && ! have netstat; then
        printf '  需要 ss 或 netstat 才能统计连接\n'
        return 0
    fi
    _c=$(port_conns "$1")
    _tot=$(printf '%s\n' "$_c" | awk '$1 == "TOTAL" { print $2 }')
    [ "${_tot:-0}" -gt 0 ] || { dim '  当前无连接建立（仅监听）'; return 0; }
    _states=$(printf '%s\n' "$_c" | awk '$1 == "STATE" { printf "%s%s %s", sep, $2, $3; sep = " / " }')
    printf '  连接数   : %s%s 条%s  (%s)\n' "$C_YLW" "$_tot" "$C_RST" "$_states"
    _exp=$(printf '%s\n' "$_c" | expose_of)
    case "$_exp" in
        对外可访问) printf '  暴露面   : %s%s%s（任何来源可达）\n' "$C_RED" "$_exp" "$C_RST" ;;
        *)          printf '  暴露面   : %s%s%s（仅 127.0.0.1）\n' "$C_GRN" "$_exp" "$C_RST" ;;
    esac
    _src=$(printf '%s\n' "$_c" | awk '$1 == "SRC" { print $3, $2 }' | sort -rn | head -5)
    if [ -n "$_src" ]; then
        _first=1
        printf '%s\n' "$_src" | while read -r _n _ip; do
            if [ "$_first" = 1 ]; then printf '  来源 TOP : %-18s × %s\n' "$_ip" "$_n"; _first=0
            else printf '             %-18s × %s\n' "$_ip" "$_n"; fi
        done
    fi
}

print_port() {
    _port=$1
    _pids=$(pids_by_port "$_port")

    if [ "$JSON" = 1 ]; then
        json_head port "$_port"
        printf '"count":%s,"items":' "$(printf '%s' "$_pids" | wc -w)"
        json_proc_arr "$_pids"
        printf ',"conn":{'
        _c=$(port_conns "$_port")
        _tot=$(printf '%s\n' "$_c" | awk '$1 == "TOTAL" { print $2 }')
        printf '"total":%s,"states":{' "${_tot:-0}"
        _sep=""
        printf '%s\n' "$_c" | awk '$1 == "STATE" { printf "%s\"%s\":%s", sep, $2, $3; sep = "," }'
        printf '},"expose":"%s","top_src":[' "$(printf '%s\n' "$_c" | expose_of)"
        _sep=""
        printf '%s\n' "$_c" | awk '$1 == "SRC" { print $3, $2 }' | sort -rn | head -5 | while read -r _n _ip; do
            printf '{"ip":"%s","conn":%s}' "$(json_esc "$_ip")" "$_n"
        done | paste -sd, - 2>/dev/null || true
        printf ']}}\n'
        return 0
    fi

    sec "端口 $_port"
    if have ss; then
        _l=$(awk -v P="$_port" '($2 == "LISTEN" || ($1 == "udp" && $2 == "UNCONN")) { n = split($5, a, ":"); if (a[n] == P) print }' "$(ss_dump)")
        if [ -n "$_l" ]; then
            printf '  监听状态 :\n'
            printf '%s%s\n' "$C_GRN" "$(printf '%s\n' "$_l" | awk '{printf "    %-5s %-28s ", $1, $5;
                if(match($0,/\(\("[^"]+"/)) printf "%s ", substr($0,RSTART+3,RLENGTH-4)
                if(match($0,/pid=[0-9]+/)) printf "(pid %s)", substr($0,RSTART+4,RLENGTH-4); print ""}')" "$C_RST"
        else
            printf '%s  监听状态 : 未监听（可能空闲，或仅有出向连接）%s\n' "$C_YLW" "$C_RST"
        fi
    else
        _hx=$(printf '%04X' "$_port" 2>/dev/null)
        _ls=$(awk -v h="$_hx" '
            function h2d(x,  i, c, nn, v) { nn = 0; x = toupper(x)
                for (i = 1; i <= length(x); i++) { c = substr(x, i, 1); nn = nn * 16 + index("0123456789ABCDEF", c) - 1 }
                return nn }
            function ip4(x,  i, o) { o = ""; for (i = 7; i >= 1; i -= 2) o = o (i < 7 ? "." : "") h2d(substr(x, i, 2)); return o }
            NR > 1 && $4 == "0A" { n = split($2, a, ":")
                if (toupper(a[n]) == h) { addr = a[1]
                    if (length(addr) == 8) addr = ip4(addr); else addr = "[" addr "]"
                    printf "%s:%d", addr, h2d(a[n]); exit } }' /proc/net/tcp /proc/net/tcp6 2>/dev/null)
        if [ -n "$_ls" ]; then
            printf '  监听状态 : %sLISTEN  %s%s\n' "$C_GRN" "$_ls" "$C_RST"
        else
            printf '%s  监听状态 : 未监听（可能空闲，或仅有出向连接）%s\n' "$C_YLW" "$C_RST"
        fi
    fi

    sec "连接情况"
    print_port_conns "$_port"

    if [ -z "$(printf '%s' "$_pids" | tr -d ' ')" ]; then
        printf '\n%s  占用进程 : 无（权限不足时 root 服务可能不可见，试试 sudo）%s\n' "$C_YLW" "$C_RST"
        return 0
    fi
    sec "关联进程"
    print_proc_table "$_pids"
    _total=$(printf '%s' "$_pids" | wc -w)
    _n=0
    for p in $_pids; do
        _n=$((_n + 1))
        [ "$_n" -gt 3 ] && { printf '\n  ...（共 %s 个进程，仅展示前 3 个详情）\n' "$_total"; break; }
        print_detail "$p"
    done
}

print_list() {
    sec "监听端口一览"
    printf '%s  %-5s %-22s %-8s %s%s\n' "$C_DIM" PROTO 本地地址 PID 进程名 "$C_RST"
    printf '%s  %-5s %-22s %-8s %s%s\n' "$C_DIM" ----- ---------------------- -------- --------- "$C_RST"
    if have ss; then
        awk '$2 == "LISTEN" || ($1 == "udp" && $2 == "UNCONN") {
            n = split($5, a, ":"); port = a[n];
            proc = "-";
            if (match($0, /pid=[0-9]+/)) proc = substr($0, RSTART+4, RLENGTH-4)
            if (match($0, /\(\("[^"]+"/)) nm = substr($0, RSTART+3, RLENGTH-4); else nm = "-"
            printf "  %-5s %-22s %-8s %s\n", $1, $5, proc, nm
        }' "$(ss_dump)" | sort -k2
    elif have netstat; then
        netstat -tunlp 2>/dev/null | awk 'NR > 2 { split($4, a, ":"); n = split($7, b, "/");
            printf "  %-5s %-22s %-8s %s\n", ($1 ~ /udp/ ? "udp" : "tcp"), $4, (n > 1 ? b[1] : "-"), (n > 1 ? b[2] : $7) }' | sort -k2
    else
        printf '  %-6s %s\n' PROTO 本地地址
        for _f in /proc/net/tcp /proc/net/tcp6 /proc/net/udp /proc/net/udp6; do
            [ -r "$_f" ] || continue
            awk -v proto="$(basename "$_f")" '
                function h2d(h,  i, c, nn, v) { nn = 0; h = toupper(h)
                    for (i = 1; i <= length(h); i++) { c = substr(h, i, 1); nn = nn * 16 + index("0123456789ABCDEF", c) - 1 }
                    return nn }
                function ip4(h,  i, o) { o = ""; for (i = 7; i >= 1; i -= 2) o = o (i < 7 ? "." : "") h2d(substr(h, i, 2)); return o }
                NR > 1 && ($4 == "0A" || proto ~ /^udp/) {
                    n = split($2, a, ":"); addr = a[1]
                    if (length(addr) == 8) addr = ip4(addr); else addr = "[" substr(addr, 1, 12) "...]"
                    printf "  %-6s %s:%d\n", proto, addr, h2d(a[n])
                }' "$_f" 2>/dev/null
        done | sort -k2
    fi
}

# 按关键字查进程（表格 + 前 3 个详情）
run_cmd() {
    p=$(pids_by_cmd "$1")
    [ -n "$(printf '%s' "$p" | tr -d ' ')" ] || die "没有匹配 '$1' 的进程"
    print_proc_table "$p"
    _total=$(printf '%s' "$p" | wc -w)
    _n=0
    for _x in $p; do
        _n=$((_n + 1))
        [ "$_n" -gt 3 ] && { printf '\n  ...（共 %s 个进程，仅展示前 3 个详情）\n' "$_total"; break; }
        print_detail "$_x"
    done
}

# -u 参数：纯数字当 UID，否则当用户名
run_user() {
    case "$1" in
        ''|*[!0-9]*) _u=$(name2uid "$1"); [ -n "$_u" ] || die "用户不存在: $1"; print_user "$_u" ;;
        *) print_user "$1" ;;
    esac
}

# ------------------------------------------------------------------ 服务维度
run_service() {
    _q=$1
    have systemctl || die "需要 systemd（systemctl）；无 systemd 时改用 opsq -c $_q"

    _unit=""
    for _c in "$_q" "$_q.service"; do
        if [ "$(systemctl show -p LoadState --value "$_c" 2>/dev/null)" = "loaded" ]; then
            _unit=$_c; break
        fi
    done
    [ -n "$_unit" ] || die "找不到服务: $_q（试试 opsq -c $_q）"

    # 补全为完整 unit 名（如 nginx -> nginx.service）
    _uid_full=$(systemctl show -p Id --value "$_unit" 2>/dev/null)
    [ -n "$_uid_full" ] && _unit=$_uid_full

    _desc=$(systemctl show -p Description --value "$_unit" 2>/dev/null)
    _ap=$(systemctl show -p ActiveState --value "$_unit" 2>/dev/null)
    _sub=$(systemctl show -p SubState --value "$_unit" 2>/dev/null)
    _mp=$(systemctl show -p MainPID --value "$_unit" 2>/dev/null)
    _mem=$(systemctl show -p MemoryCurrent --value "$_unit" 2>/dev/null)
    _nrs=$(systemctl show -p NRestarts --value "$_unit" 2>/dev/null)
    _tasks=$(systemctl show -p TasksCurrent --value "$_unit" 2>/dev/null)
    _since=$(systemctl show -p ActiveEnterTimestamp --value "$_unit" 2>/dev/null)

    case "$_mem" in ''|*[!0-9]*) _mem=0 ;; esac
    case "$_nrs" in ''|*[!0-9]*) _nrs=0 ;; esac
    case "$_tasks" in ''|*[!0-9]*) _tasks=0 ;; esac
    case "$_mp" in ''|*[!0-9]*) _mp=0 ;; esac

    if [ "$JSON" = 1 ]; then
        printf '{"query":{"type":"service","value":"%s"},"time":"%s",' \
            "$(json_esc "$_unit")" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')"
        printf '"service":{"unit":"%s","description":"%s","active":"%s","sub":"%s","main_pid":%s,"since":"%s","memory_bytes":%s,"tasks":%s,"restarts":%s},' \
            "$(json_esc "$_unit")" "$(json_esc "$_desc")" "$_ap" "$_sub" "$_mp" "$(json_esc "$_since")" "$_mem" "$_tasks" "$_nrs"
        printf '"processes":'
        if [ "$_mp" -gt 0 ] 2>/dev/null; then
            json_proc_arr "$_mp"
        else
            printf '[]'
        fi
        printf ',"log":[' 
        timeout 5 journalctl -u "$_unit" -n 10 --no-pager -o short-iso 2>/dev/null | while IFS= read -r _l; do
            printf '"%s",' "$(json_esc "$_l")"
        done | sed 's/,$//'
        printf ']}\n'
        return 0
    fi

    sec "服务 $_unit"
    [ -n "$_desc" ] && printf '  描述     : %s\n' "$_desc"
    case "$_ap" in
        active) _stc=$C_GRN ;;
        failed) _stc=$C_RED ;;
        *)      _stc=$C_YLW ;;
    esac
    printf '  状态     : %s%s (%s)%s' "$_stc" "$_ap" "$_sub" "$C_RST"
    [ -n "$_since" ] && printf '   自 %s' "$_since"
    printf '\n'
    printf '  内存     : %s   Tasks: %s   重启次数: %s\n' "$(fmt_bytes "$_mem")" "$_tasks" "$_nrs"

    if [ "$_mp" -gt 0 ] 2>/dev/null; then
        sec "主进程"
        print_proc_table "$_mp"
        print_detail "$_mp"
        _kids=$(for k in /proc/[0-9]*; do
                    a=$(awk '$1=="PPid:"{print $2; exit}' "$k/status" 2>/dev/null)
                    [ "$a" = "$_mp" ] && printf '%s\n' "${k#/proc/}"
                done | sort -n | tr '\n' ' ')
        [ -n "$_kids" ] && { sec "子进程"; print_proc_table "$_kids"; }
    else
        printf '\n  主进程   : 无（服务未运行）\n'
    fi

    sec "最近日志（10 行）"
    _lg=$(timeout 5 journalctl -u "$_unit" -n 10 --no-pager -o short-iso 2>/dev/null)
    if [ -n "$_lg" ]; then
        printf '%s\n' "$_lg" | cut -c1-160
    else
        printf '  （无日志：journal 无记录，或该服务未写 journal）\n'
    fi
}

# ------------------------------------------------------------------ 定时任务
_human() {
    awk -v s="$1" 'BEGIN{
        if (s < 0) { print "n/a"; exit }
        s = int(s)
        if (s < 60) { printf "%ds", s; exit }
        if (s < 3600) { printf "%dm", int(s/60); exit }
        if (s < 86400) { printf "%dh%02dm", int(s/3600), int((s%3600)/60); exit }
        printf "%dd%02dh", int(s/86400), int((s%86400)/3600) }'
}

_epoch_of() {
    [ -n "$1" ] || return 1
    date -d "$1" +%s 2>/dev/null
}

# crontab 条目：user \t schedule \t command \t source
cron_entries() {
    # 1) 用户 crontab（Debian: /var/spool/cron/crontabs；RHEL: /var/spool/cron；OpenWrt: /etc/crontabs）
    #    注意：部分系统 /var/spool/cron 是 /etc/crontabs 的软链，必须按真实路径去重
    for _f in $(for _c in /var/spool/cron/crontabs/* /var/spool/cron/* /etc/crontabs/*; do
                    [ -f "$_c" ] && { readlink -f "$_c" 2>/dev/null || echo "$_c"; }
                done | sort -u); do
        [ -f "$_f" ] || continue
        _u=$(basename "$_f")
        awk -v u="$_u" -v src="$_f" '
            /^[[:space:]]*$/ { next }
            /^[[:space:]]*#/ { next }
            /^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=/ { next }
            {
                line = $0; sub(/^[ \t]+/, "", line)
                if (substr(line, 1, 1) == "@") {
                    if (!match(line, /^[^ \t]+/)) next
                    sched = substr(line, RSTART, RLENGTH)
                    rest = substr(line, RLENGTH + 1); sub(/^[ \t]+/, "", rest)
                } else {
                    sched = ""; rest = line; ok = 1
                    for (i = 1; i <= 5; i++) {
                        if (!match(rest, /^[^ \t]+/)) { ok = 0; break }
                        f = substr(rest, RSTART, RLENGTH)
                        sched = sched (i > 1 ? " " : "") f
                        rest = substr(rest, RLENGTH + 1)
                        sub(/^[ \t]+/, "", rest)
                    }
                    if (!ok || rest == "") next
                }
                gsub(/\t/, " ", rest)
                printf "%s\t%s\t%s\t%s\n", u, sched, rest, src
            }' "$_f" 2>/dev/null
    done

    # 2) 系统级：/etc/crontab 与 /etc/cron.d/*（多一个 user 字段）
    for _f in /etc/crontab /etc/cron.d/*; do
        [ -f "$_f" ] || continue
        awk -v src="$_f" '
            /^[[:space:]]*$/ { next }
            /^[[:space:]]*#/ { next }
            /^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=/ { next }
            {
                line = $0; sub(/^[ \t]+/, "", line)
                if (substr(line, 1, 1) == "@") {
                    if (!match(line, /^[^ \t]+/)) next
                    sched = substr(line, RSTART, RLENGTH)
                    rest = substr(line, RLENGTH + 1); sub(/^[ \t]+/, "", rest)
                } else {
                    sched = ""; rest = line; ok = 1
                    for (i = 1; i <= 5; i++) {
                        if (!match(rest, /^[^ \t]+/)) { ok = 0; break }
                        f = substr(rest, RSTART, RLENGTH)
                        sched = sched (i > 1 ? " " : "") f
                        rest = substr(rest, RLENGTH + 1)
                        sub(/^[ \t]+/, "", rest)
                    }
                    if (!ok || rest == "") next
                }
                # 系统 crontab 的第 6 段是执行用户
                if (match(rest, /^[^ \t]+/)) {
                    u = substr(rest, RSTART, RLENGTH)
                    rest = substr(rest, RLENGTH + 1); sub(/^[ \t]+/, "", rest)
                } else { u = "root" }
                if (rest == "") next
                gsub(/\t/, " ", rest)
                printf "%s\t%s\t%s\t%s\n", u, sched, rest, src
            }' "$_f" 2>/dev/null
    done

    # 3) run-parts 目录（无时间表达式，由 cron.daily 等驱动）
    for _d in /etc/cron.hourly /etc/cron.daily /etc/cron.weekly /etc/cron.monthly; do
        [ -d "$_d" ] || continue
        for _s in "$_d"/*; do
            [ -f "$_s" ] && [ -x "$_s" ] || continue
            printf "root\t@%s\t%s\t%s\n" "$(basename "$_d" | sed 's/^cron\.//')" "$_s" "$_d"
        done
    done
}

# ------------------------------------------------------------------ cron 下次执行
# 从 stdin 读 cron_entries（user \t schedule \t command \t source），追加第 5 列「下次执行」。
# 分/时先用算术哈希过滤，命中后才做日历判断（strftime），避免逐分钟扫 32 天的开销。
cron_next_calc() {
    TZ=CST-8 awk -F'\t' -v now="$(date +%s)" '
    function fmt_left(sec,   h, m) {
        if (sec < 60) return "1分钟内"
        if (sec < 3600) return int(sec / 60) "分钟后"
        if (sec < 86400) return int(sec / 3600) "小时" int((sec % 3600) / 60) "分后"
        return int(sec / 86400) "天" int((sec % 86400) / 3600) "小时后"
    }
    function build(spec, lo, hi, p,   arr, n, i, a, b, step, s0, e0, j) {
        if (spec == "*") { for (i = lo; i <= hi; i++) F[p i] = 1; return }
        n = split(spec, arr, ",")
        for (i = 1; i <= n; i++) {
            a = arr[i]; step = 1
            if (a ~ /\//) {
                split(a, b, "/"); a = b[1]; step = b[2] + 0
                if (step < 1) step = 1
                if (a == "*") { s0 = lo; e0 = hi }
                else { s0 = a + 0; e0 = hi }
                for (j = s0; j <= e0; j += step) F[p j] = 1
                continue
            }
            if (a ~ /-/) { split(a, b, "-"); s0 = b[1] + 0; e0 = b[2] + 0 }
            else if (a == "*") { s0 = lo; e0 = hi }
            else { s0 = a + 0; e0 = s0 }
            if (e0 < s0) { for (j = s0; j <= hi; j++) F[p j] = 1; for (j = lo; j <= e0; j++) F[p j] = 1 }
            else for (j = s0; j <= e0; j++) F[p j] = 1
        }
    }
    {
        raw = $2
        if (substr(raw, 1, 1) == "@") {
            if (raw == "@reboot") { print $0 "\t@reboot（系统启动时）"; next }
            if (raw == "@hourly")       raw = "0 * * * *"
            else if (raw == "@daily" || raw == "@midnight") raw = "0 0 * * *"
            else if (raw == "@weekly")  raw = "0 0 * * 0"
            else if (raw == "@monthly") raw = "0 0 1 * *"
            else if (raw == "@yearly" || raw == "@annually") raw = "0 0 1 1 *"
            else { print $0 "\t-"; next }
        }
        nf = split(raw, s, " ")
        if (nf != 5) { print $0 "\t-"; next }

        delete F
        dom_star = (s[3] == "*"); dow_star = (s[5] == "*")
        build(s[1], 0, 59, "m")
        build(s[2], 0, 23, "h")
        if (!dom_star) build(s[3], 1, 31, "d")
        if (s[4] != "*") build(s[4], 1, 12, "o")
        if (!dow_star) build(s[5], 0, 7, "w")

        start = now - (now % 60) + 60
        found = 0
        for (i = 0; i < 46080; i++) {           # 上限 32 天
            t = start + i * 60
            lt = t + 28800                       # CST-8
            mi = int(lt / 60) % 60
            if (!(( "m" mi) in F)) continue
            hh = int(lt / 3600) % 24
            if (!(("h" hh) in F)) continue
            mo = strftime("%m", t) + 0
            if (s[4] != "*" && !(("o" mo) in F)) continue
            dd = strftime("%d", t) + 0
            ww = strftime("%w", t) + 0
            if (ww == 0 && (("w7") in F)) ww = 7   # dow 7 与 0 等价
            ok = 1
            if (dom_star && dow_star) ok = 1
            else if (dom_star) ok = (("w" ww) in F)
            else if (dow_star) ok = (("d" dd) in F)
            else ok = (("d" dd) in F) || (("w" ww) in F)   # 日/周同时指定 -> OR
            if (ok) { found = t; break }
        }
        if (found) printf "%s\t%s %s（%s）\n", $0, strftime("%m-%d", found), strftime("%H:%M", found), fmt_left(found - now)
        else printf "%s\t32天内无\n", $0
    }' 2>/dev/null
}

# 单个 crontab 条目查询（按命令/来源关键字匹配）
run_cron_lookup() {
    _kw=$1
    _hit=$(cron_entries 2>/dev/null | sort -u | cron_next_calc | awk -F'\t' -v kw="$_kw" 'index($3, kw) || index($4, kw) || index($1, kw)')
    [ -n "$(printf '%s' "$_hit" | tr -d ' \t\n')" ] || return 1

    if [ "$JSON" = 1 ]; then
        printf '{"query":{"type":"cron","value":"%s"},"time":"%s","count":%s,"items":[' \
            "$(json_esc "$_kw")" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')" \
            "$(printf '%s\n' "$_hit" | awk -F'\t' 'NF { n++ } END { print n + 0 }')"
        printf '%s\n' "$_hit" | awk -F'\t' 'NF {
            cmd = $3; gsub(/\\/, "\\\\", cmd); gsub(/"/, "\\\"", cmd)
            printf "%s{\"user\":\"%s\",\"schedule\":\"%s\",\"command\":\"%s\",\"source\":\"%s\"}", sep, $1, $2, cmd, $4
            sep = ","
        }'
        printf ']}\n'
        return 0
    fi

    sec "crontab 任务 · 匹配 $_kw"
        printf '%s\n' "$_hit" | awk -F'\t' 'NF {
        printf "  用户     : %s\n  来源     : %s\n  调度     : %s\n  下次     : %s\n  命令     : %s\n\n", $1, $4, $2, ($5 == "" ? "-" : $5), $3
    }'

    if have journalctl; then
        _lg=$(timeout 5 journalctl -u cron --no-pager -g "$_kw" -n 10 -o short-iso 2>/dev/null)
        [ -n "$_lg" ] || _lg=$(timeout 5 journalctl --no-pager -g "$_kw" -n 10 -o short-iso 2>/dev/null)
        case "$_lg" in *"No entries"*) _lg="" ;; esac
        if [ -n "$_lg" ]; then
            sec "最近日志（10 行）"
            printf '%s\n' "$_lg" | cut -c1-170
        else
            printf '  日志     : journal 中未找到相关记录（cron 可能未写 journal）\n'
        fi
    fi
    return 0
}

run_timer() {
    _q=$1

    # ---------- 一览 ----------
    if [ -z "$_q" ]; then
        _sys_json="[]"; _sys_n=0
        if have systemctl; then
            _j=$(systemctl list-timers --all --no-pager --output=json 2>/dev/null)
            if [ -n "$_j" ] && have python3; then
                _sys_json=$(printf '%s' "$_j" | python3 -c '
import json, sys, time
d = json.load(sys.stdin)
now = time.time()
items = []
for t in d:
    nxt = int(t["next"] / 1e6) if t.get("next") else 0
    lst = int(t["last"] / 1e6) if t.get("last") else 0
    items.append({
        "unit": t["unit"],
        "activates": t.get("activates", ""),
        "next_epoch": nxt,
        "next": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(nxt)) if nxt else "",
        "last_epoch": lst,
        "last": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(lst)) if lst else "",
        "left_sec": int(nxt - now) if nxt else -1,
        "passed_sec": int(now - lst) if lst else -1,
    })
print(json.dumps(items, ensure_ascii=False))
')
                _sys_n=$(printf '%s' "$_sys_json" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null)
                case "$_sys_n" in ''|*[!0-9]*) _sys_n=0 ;; esac
            else
                _sys_n=$(systemctl list-timers --all --no-pager 2>/dev/null | grep -c '\.timer')
                case "$_sys_n" in ''|*[!0-9]*) _sys_n=0 ;; esac
            fi
        fi

        _cron_raw=$(cron_entries 2>/dev/null | sort -u | cron_next_calc)
        _cron_n=$(printf '%s\n' "$_cron_raw" | awk -F'\t' 'NF { n++ } END { print n + 0 }')

        if [ "$JSON" = 1 ]; then
            printf '{"query":{"type":"timer","value":"all"},"time":"%s","count":%s,"systemd":%s,"crontab":[' \
                "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')" "$((_sys_n + _cron_n))" "${_sys_json:-[]}"
            printf '%s\n' "$_cron_raw" | awk -F'\t' 'NF {
                gsub(/"/, "\\\"", $3)
                printf "%s{\"user\":\"%s\",\"schedule\":\"%s\",\"command\":\"%s\",\"source\":\"%s\"}", sep, $1, $2, $3, $4
                sep = ","
            }'
            printf ']}\n'
            return 0
        fi

        if [ "$_sys_n" -gt 0 ] 2>/dev/null && have python3; then
            sec "systemd timer（$_sys_n 个）"
            printf '%s%-30s %-13s %-9s %-13s %-9s %s%s\n' "$C_DIM" UNIT NEXT LEFT LAST PASSED ACTIVATES "$C_RST"
            printf '%s%-30s %-13s %-9s %-13s %-9s %s%s\n' "$C_DIM" ------------------------------ ------------- --------- ------------- --------- --------------- "$C_RST"
            printf '%s' "${_sys_json}" | python3 -c '
import json, sys, time
d = json.load(sys.stdin)
now = time.time()
def h(s):
    if s < 0: return "n/a"
    s = int(s)
    if s < 60: return "%ds" % s
    if s < 3600: return "%dm" % (s // 60)
    if s < 86400: return "%dh%02dm" % (s // 3600, (s % 3600) // 60)
    return "%dd%02dh" % (s // 86400, (s % 86400) // 3600)
rows = []
for t in d:
    nxt = t["next_epoch"] if t.get("next_epoch") else 0
    lst = t["last_epoch"] if t.get("last_epoch") else 0
    rows.append((nxt if nxt else 9e18, t, nxt, lst))
rows.sort(key=lambda r: r[0])
for _, t, nxt, lst in rows:
    ns = time.strftime("%m-%d %H:%M", time.localtime(nxt)) if nxt else "-"
    ls = time.strftime("%m-%d %H:%M", time.localtime(lst)) if lst else "-"
    nl = h(nxt - now) if nxt else "-"
    pl = h(now - lst) + " ago" if lst else "-"
    print("%-30s %-13s %-9s %-13s %-9s %s" % (t["unit"], ns, nl, ls, pl, t.get("activates", "")))
'
        elif have systemctl; then
            sec "systemd timer"
            systemctl list-timers --all --no-pager 2>/dev/null | cat
        fi

        sec "crontab（$_cron_n 条）"
        if [ "$_cron_n" -eq 0 ]; then
            printf '  （无 crontab 任务）\n'
        else
            printf '  %s%-9s %-14s %-20s %-14s %s%s\n' "$C_DIM" USER SCHEDULE NEXT 来源 COMMAND "$C_RST"
            printf '  %s%-9s %-14s %-20s %-14s %s%s\n' "$C_DIM" --------- -------------- -------------------- -------------- --------------- "$C_RST"
            printf '%s\n' "$_cron_raw" | awk -F'\t' 'NF {
                src = $4
                if (src ~ /crontabs?\//) { n = split(src, a, "/"); src = "crontab:" a[n] }
                else if (src ~ /^\/etc\/cron\.d\//) { sub(/^\/etc\//, "", src) }
                else if (src ~ /^\/etc\/cron\./) { sub(/^\/etc\//, "", src) }
                cmd = $3; if (length(cmd) > 70) cmd = substr(cmd, 1, 70)
                printf "  %-9s %-14s %-20s %-14s %s\n", $1, $2, $5, src, cmd
            }'
        fi
        return 0
    fi

    # ---------- 单个 timer ----------
    _unit=""
    if have systemctl; then
        case "$_q" in
            *.timer)
                [ "$(systemctl show -p LoadState --value "$_q" 2>/dev/null)" = "loaded" ] && _unit=$_q ;;
            *)
                # 优先按 .timer 解析，避免被同名 .service 抢走
                [ "$(systemctl show -p LoadState --value "$_q.timer" 2>/dev/null)" = "loaded" ] && _unit="$_q.timer" ;;
        esac
    fi
    if [ -z "$_unit" ]; then
        run_cron_lookup "$_q" && return 0
        die "找不到定时任务: $_q（systemd timer 与 crontab 均无匹配，opsq -t 看全部）"
    fi
    _uid_full=$(systemctl show -p Id --value "$_unit" 2>/dev/null)
    [ -n "$_uid_full" ] && _unit=$_uid_full

    _sched=$(systemctl show -p TimersCalendar --value "$_unit" 2>/dev/null | sed 's/ *;.*//; s/^{ *//; s/ *}$//')
    _next=$(systemctl show -p NextElapseUSecRealtime --value "$_unit" 2>/dev/null)
    _last=$(systemctl show -p LastTriggerUSec --value "$_unit" 2>/dev/null)
    _tres=$(systemctl show -p Result --value "$_unit" 2>/dev/null)
    _tgt=$(systemctl show -p Unit --value "$_unit" 2>/dev/null)

    _sres=$(systemctl show -p Result --value "$_tgt" 2>/dev/null)
    _sact=$(systemctl show -p ActiveState --value "$_tgt" 2>/dev/null)
    _ssub=$(systemctl show -p SubState --value "$_tgt" 2>/dev/null)
    _sexit=$(systemctl show -p ExecMainStatus --value "$_tgt" 2>/dev/null)
    _send=$(systemctl show -p ExecMainExitTimestamp --value "$_tgt" 2>/dev/null)

    _nxt_e=$(_epoch_of "$_next")
    _lst_e=$(_epoch_of "$_last")
    _now_e=$(date +%s)
    _left=""; _passed=""; _left_sec=0; _passed_sec=0
    if [ -n "$_nxt_e" ]; then
        _left_sec=$((_nxt_e - _now_e))
        _left=$(_human "$_left_sec")
    fi
    if [ -n "$_lst_e" ]; then
        _passed_sec=$((_now_e - _lst_e))
        _passed=$(_human "$_passed_sec")
    fi

    if [ "$JSON" = 1 ]; then
        printf '{"query":{"type":"timer","value":"%s"},"time":"%s",' \
            "$(json_esc "$_unit")" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')"
        printf '"timer":{"unit":"%s","activates":"%s","schedule":"%s","next":"%s","next_epoch":%s,"last":"%s","last_epoch":%s,"left_sec":%s,"passed_sec":%s,"result":"%s"},' \
            "$(json_esc "$_unit")" "$(json_esc "$_tgt")" "$(json_esc "$_sched")" \
            "$(json_esc "$_next")" "${_nxt_e:-0}" "$(json_esc "$_last")" "${_lst_e:-0}" \
            "${_left_sec:-0}" "${_passed_sec:-0}" "$_tres"
        printf '"service":{"unit":"%s","active":"%s","sub":"%s","result":"%s","exit_code":"%s","last_exit":"%s"},' \
            "$(json_esc "$_tgt")" "$_sact" "$_ssub" "$_sres" "${_sexit:-0}" "$(json_esc "$_send")"
        printf '"log":['
        timeout 5 journalctl -u "$_tgt" -n 10 --no-pager -o short-iso 2>/dev/null | while IFS= read -r _l; do
            printf '"%s",' "$(json_esc "$_l")"
        done | sed 's/,$//'
        printf ']}\n'
        return 0
    fi

    sec "定时任务 $_unit"
    printf '  调度     : %s\n' "${_sched:-（不明）}"
    printf '  下次执行 : %s' "${_next:-未知}"
    [ -n "$_left" ] && printf '  （%s 后）' "$_left"
    printf '\n'
    printf '  上次触发 : %s' "${_last:-无记录}"
    [ -n "$_passed" ] && printf '  （%s 前）' "$_passed"
    printf '\n'
    case "$_tres" in
        success) _tc=$C_GRN ;;
        failed)  _tc=$C_RED ;;
        *)       _tc=$C_YLW ;;
    esac
    printf '  Timer 结果: %s%s%s\n' "$_tc" "${_tres:-unknown}" "$C_RST"

    sec "关联服务 ${_tgt:-（无）}"
    case "$_sres" in
        success) _sc=$C_GRN ;;
        failed)  _sc=$C_RED ;;
        *)       _sc=$C_YLW ;;
    esac
    printf '  状态     : %s (%s)   结果: %s%s%s   退出码: %s\n' "${_sact:-unknown}" "${_ssub:-unknown}" \
        "$_sc" "${_sres:-unknown}" "$C_RST" "${_sexit:-n/a}"
    [ -n "$_send" ] && printf '  上次结束 : %s\n' "$_send"

    sec "最近日志（10 行）"
    _lg=$(timeout 5 journalctl -u "$_tgt" -n 10 --no-pager -o short-iso 2>/dev/null)
    if [ -n "$_lg" ]; then
        printf '%s\n' "$_lg" | cut -c1-160
    else
        printf '  （无日志）\n'
    fi
}
run_reverse() {
    have ss || die "反向查询需要 ss（iproute2）"
    _q=$1
    _ips=$(getent ahosts "$_q" 2>/dev/null | awk '{ print $1 }' | awk '!seen[$0]++' | tr '\n' ' ')
    [ -n "$_ips" ] || _ips=$_q

    _rows=$(awk -v ips="$_ips" '
        BEGIN { n = split(ips, t, " "); for (i = 1; i <= n; i++) if (t[i] != "") want[t[i]] = 1 }
        $1 != "tcp" || $2 == "LISTEN" { next }
        {
            la = $5; sub(/:[^:]*$/, "", la); gsub(/^\[/, "", la); gsub(/\]$/, "", la)
            pa = $6; sub(/:[^:]*$/, "", pa); gsub(/^\[/, "", pa); gsub(/\]$/, "", pa)
            if (!((la in want) || (pa in want))) next
            pid = "-"; if (match($0, /pid=[0-9]+/)) pid = substr($0, RSTART + 4, RLENGTH - 4)
            nm = "-"; if (match($0, /\(\("[^"]+"/)) nm = substr($0, RSTART + 3, RLENGTH - 4)
            dir = (pa in want) ? "out" : "in"
            printf "%s %s %s %s %s %s\n", $2, $5, $6, pid, nm, dir
        }' "$(ss_dump)")

    if [ "$JSON" = 1 ]; then
        printf '{"query":{"type":"reverse","value":"%s"},"time":"%s","resolved":"%s","count":%s,"items":[' \
            "$(json_esc "$_q")" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')" "$(json_esc "$_ips")" \
            "$(printf '%s\n' "$_rows" | awk 'NF { n++ } END { print n + 0 }')"
        _sep=""
        printf '%s\n' "$_rows" | awk 'NF {
            printf "%s{\"state\":\"%s\",\"local\":\"%s\",\"peer\":\"%s\",\"pid\":%s,\"comm\":\"%s\",\"direction\":\"%s\"}", sep, $1, $2, $3, ($4 == "-" ? "null" : $4), $5, $6; sep = ","
        }'
        printf ']}\n'
        return 0
    fi

    sec "反向查询 $_q"
    [ "$_ips" != "$_q" ] && printf '  解析     : %s\n' "$_ips"
    if [ -z "$(printf '%s' "$_rows" | tr -d ' ')" ]; then
        printf '  没有找到与该地址相关的连接\n'
        return 0
    fi
    _cnt=$(printf '%s\n' "$_rows" | awk 'NF { n++ } END { print n + 0 }')
    _pids=$(printf '%s\n' "$_rows" | awk '{ if ($4 != "-") print $4 }' | sort -un | tr '\n' ' ')
    printf '  连接数   : %s 条   涉及 %s 个进程\n' "$_cnt" "$(printf '%s' "$_pids" | wc -w)"
    printf '\n  %-11s %-24s %-24s %-8s %s\n' STATE LOCAL PEER PID COMMAND
    printf '  %-11s %-24s %-24s %-8s %s\n' ----------- ------------------------ ------------------------ -------- -------
    printf '%s\n' "$_rows" | head -20 | awk 'NF { printf "  %-11s %-24s %-24s %-8s %s\n", $1, $2, $3, $4, $5 }'
    [ "$_cnt" -gt 20 ] && printf '  ...（仅显示前 20 条，完整数据用 opsq -r %s --json）\n' "$_q"
    if [ -n "$(printf '%s' "$_pids" | tr -d ' ')" ]; then
        sec "相关进程"
        print_proc_table "$_pids"
    fi
}

# ------------------------------------------------------------------ 带宽
# 按进程汇总 TCP socket 累计字节（数据来自 ss -tinp 的 tcp_info）
bw_snapshot() {
    ss -H -tinp state established 2>/dev/null | awk '
        /pid=/ { cur = ""; if (match($0, /pid=[0-9]+/)) cur = substr($0, RSTART + 4, RLENGTH - 4); next }
        cur != "" && /bytes_sent:/ {
            rx = 0; tx = 0
            if (match($0, /bytes_received:[0-9]+/)) rx = substr($0, RSTART + 15, RLENGTH - 15)
            if (match($0, /bytes_sent:[0-9]+/)) tx = substr($0, RSTART + 11, RLENGTH - 11)
            R[cur] += rx; T[cur] += tx; cur = ""
        }
        END { for (p in R) printf "%s %d %d\n", p, R[p], T[p] }'
}

fmt_rate() {
    awk -v b="$1" 'BEGIN{ if (b < 0) b = 0
        if (b >= 1048576) printf "%.2f MB/s", b / 1048576
        else if (b >= 1024) printf "%.0f KB/s", b / 1024
        else printf "%d B/s", b }'
}

fmt_bytes() {
    awk -v b="$1" 'BEGIN{
        if (b >= 1073741824) printf "%.2f GB", b / 1073741824
        else if (b >= 1048576) printf "%.1f MB", b / 1048576
        else if (b >= 1024) printf "%.0f KB", b / 1024
        else printf "%d B", b }'
}

usage_bw() {
cat <<EOF
opsq $VERSION - 带宽统计（采样秒数用 -d，避免与笔记本 -n 冲突）

  opsq -b               全部进程实时带宽 Top 10（1 秒采样）
  opsq -b 1234          单进程实时 RX/TX
  opsq -b 1234 -d 5     5 秒平均 + 峰值（-d 1..60）
  opsq -b --cum         按 TCP 累计字节排行（也支持 opsq -b 1234 --cum）
  opsq -b 1234 -d 10 --json

仅统计 TCP（ss tcp_info 的 bytes_sent/received），UDP 不计入；
累计值随连接关闭清零；需 ss（iproute2）。默认采样秒数可用 opsq.conf 的 BW_N 配置。
EOF
}

run_bw() {
    _tg=""; _n="${BW_N:-1}"; _cum=0
    while [ $# -gt 0 ]; do
        case "$1" in
            -d|--duration)  _n="${2:-}"; shift; [ $# -gt 0 ] && shift ;;
            -d*)            _n=${1#-d}; shift ;;
            --cum|--cumulative) _cum=1; shift ;;
            -n|-n*)  die "-n 已让给笔记本（避免同一开关两种含义），采样秒数改用 -d: opsq -b <pid> -d 5" ;;
            -c)      die "-c 已让给进程名，累计榜改用 --cum: opsq -b --cum" ;;
            -h|--help) usage_bw; return 0 ;;
            -*)      die "未知参数: $1（-b 支持 -d <秒数> 与 --cum，用法: opsq -b -h）" ;;
            *)       _tg=$1; shift ;;
        esac
    done

    case "$_n" in ''|*[!0-9]*) die "-n 需要 1-60 的整数" ;; esac
    { [ "$_n" -ge 1 ] && [ "$_n" -le 60 ]; } || die "-n 需要 1-60 的整数"
    [ -n "$_tg" ] && [ ! -r "/proc/$_tg/stat" ] && die "进程不存在: $_tg"
    have ss || die "带宽统计需要 ss（iproute2）"

    if [ "$_cum" = 1 ]; then _cnt=1; _n=1; else _cnt=$((_n + 1)); fi

    _dir=$(mktemp -d) || die "mktemp 失败"
    _i=0
    while [ "$_i" -lt "$_cnt" ]; do
        bw_snapshot > "$_dir/s$(printf '%02d' "$_i")"
        _i=$((_i + 1))
        [ "$_i" -lt "$_cnt" ] && sleep 1
    done

    # 聚合: pid 平均RX 平均TX 峰值RX 峰值TX 累计RX 累计TX 样本跨度
    _agg=$(awk '
        {
            fn = FILENAME; sub(/.*\/s/, "", fn); idx = fn + 0
            p = $1
            if (!(p in f_idx)) { f_idx[p] = idx; f_r[p] = $2; f_t[p] = $3 }
            if ((p in l_idx) && idx == l_idx[p] + 1) {
                dr = $2 - l_r[p]; dt = $3 - l_t[p]
                if (dr > peak_r[p]) peak_r[p] = dr
                if (dt > peak_t[p]) peak_t[p] = dt
            }
            l_idx[p] = idx; l_r[p] = $2; l_t[p] = $3
        }
        END {
            for (p in l_idx) {
                d = l_idx[p] - f_idx[p]
                if (d < 1) d = 1
                printf "%s %d %d %d %d %d %d %d\n", p, int((l_r[p]-f_r[p])/d), int((l_t[p]-f_t[p])/d),
                       peak_r[p], peak_t[p], l_r[p], l_t[p], d
            }
        }' "$_dir"/s* 2>/dev/null)

    if [ "$JSON" = 1 ]; then
        if [ "$_cum" = 1 ]; then _mode="cumulative"; else _mode="rate"; fi
        if [ -n "$_tg" ]; then
            _line=$(printf '%s\n' "$_agg" | awk -v p="$_tg" '$1 == p')
            [ -n "$_line" ] || _line="$_tg 0 0 0 0 0 0 0"
            set -- $_line
            printf '{"query":{"type":"bw","value":"%s"},"mode":"%s","window_sec":%s,"time":"%s","items":[{"pid":%s,"rx_per_sec":%s,"tx_per_sec":%s,"rx_peak":%s,"tx_peak":%s,"rx_total":%s,"tx_total":%s}]}\n' \
                "$_tg" "$_mode" "$_n" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')" \
                "$1" "$2" "$3" "$4" "$5" "$6" "$7"
        else
            printf '{"query":{"type":"bw","value":"all"},"mode":"%s","window_sec":%s,"time":"%s","items":[' \
                "$_mode" "$_n" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')"
            printf '%s\n' "$_agg" | awk -v cum="$_cum" '
                ($6 + $7 > 0) {
                    printf "%s{\"pid\":%s,\"rx_per_sec\":%s,\"tx_per_sec\":%s,\"rx_peak\":%s,\"tx_peak\":%s,\"rx_total\":%s,\"tx_total\":%s}", sep, $1, $2, $3, $4, $5, $6, $7
                    sep = ","
                }'
            printf ']}\n'
        fi
        rm -rf "$_dir"
        return 0
    fi

    if [ -n "$_tg" ]; then
        read_proc "$_tg"
        if [ "$_cum" = 1 ]; then
            sec "累计流量 · pid $_tg（socket 生命周期）"
        else
            sec "带宽 · pid $_tg（${_n}s 平均）"
        fi
        printf '  进程     : %s\n' "$(printf '%s' "$S_CMD" | cut -c1-100)"
        _line=$(printf '%s\n' "$_agg" | awk -v p="$_tg" '$1 == p')
        [ -n "$_line" ] || _line="$_tg 0 0 0 0 0 0 0"
        set -- $_line
        if [ "$_cum" = 1 ]; then
            printf '  累计 RX  : %s\n' "$(fmt_bytes "$6")"
            printf '  累计 TX  : %s\n' "$(fmt_bytes "$7")"
        else
            printf '  下行 RX  : 平均 %-11s 峰值 %s\n' "$(fmt_rate "$2")" "$(fmt_rate "$4")"
            printf '  上行 TX  : 平均 %-11s 峰值 %s\n' "$(fmt_rate "$3")" "$(fmt_rate "$5")"
            printf '  累计     : 下行 %s / 上行 %s（本次连接生命周期）\n' "$(fmt_bytes "$6")" "$(fmt_bytes "$7")"
        fi
        printf '  说明     : 仅统计 TCP 连接；UDP 无此统计，需 nethogs\n'
    else
        if [ "$_cum" = 1 ]; then
            sec "累计流量排行 · 全部进程（Top 10）"
            _top=$(printf '%s\n' "$_agg" | awk '$6 + $7 > 0 { printf "%d %s %d %d\n", $6 + $7, $1, $6, $7 }' | sort -rn | head -10)
        else
            sec "带宽排行 · 全部进程（${_n}s 平均，Top 10）"
            _top=$(printf '%s\n' "$_agg" | awk '$2 + $3 > 0 { printf "%d %s %d %d\n", $2 + $3, $1, $2, $3 }' | sort -rn | head -10)
        fi
        if [ -z "$(printf '%s' "$_top" | tr -d ' ')" ]; then
            printf '  没有可统计的 TCP 流量\n'
        elif [ "$_cum" = 1 ]; then
            printf '%-7s %-11s %-11s %-11s %s\n' PID USER RX累计 TX累计 COMMAND
            printf '%-7s %-11s %-11s %-11s %s\n' ------- ----------- ----------- ----------- -------
            printf '%s\n' "$_top" | while read -r _tot _p _rx _tx; do
                read_proc "$_p" || continue
                _un=$(uid2name "$S_USER"); [ -n "$_un" ] || _un="$S_USER"
                printf '%-7s %-11s %-11s %-11s %s\n' "$_p" "$_un" "$(fmt_bytes "$_rx")" "$(fmt_bytes "$_tx")" \
                    "$(printf '%s' "$S_CMD" | cut -c1-70)"
            done
        else
            printf '%-7s %-11s %-11s %-11s %s\n' PID USER RX/s TX/s COMMAND
            printf '%-7s %-11s %-11s %-11s %s\n' ------- ----------- ----------- ----------- -------
            printf '%s\n' "$_top" | while read -r _tot _p _rx _tx; do
                read_proc "$_p" || continue
                _un=$(uid2name "$S_USER"); [ -n "$_un" ] || _un="$S_USER"
                printf '%-7s %-11s %-11s %-11s %s\n' "$_p" "$_un" "$(fmt_rate "$_rx")" "$(fmt_rate "$_tx")" \
                    "$(printf '%s' "$S_CMD" | cut -c1-70)"
            done
        fi
        printf '\n  说明: 仅统计 TCP；UDP 流量不计入（需 nethogs）；累计值随连接关闭清零\n'
    fi
    rm -rf "$_dir"
}

# ------------------------------------------------------------------ JSON 输出
json_esc() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/ /g' | tr -d '\r\n'
}

# 单个进程的 JSON 对象
json_proc_obj() {
    _jp=$1
    read_proc "$_jp" || return 1
    _jsvc=$(svc_of "$_jp")
    _jexe=$(readlink "/proc/$_jp/exe" 2>/dev/null)
    _jcwd=$(readlink "/proc/$_jp/cwd" 2>/dev/null)
    _jlp=$(ports_of_pid "$_jp" 2>/dev/null | awk '$1 == "LISTEN" { n = split($3, a, ":"); printf "%s%s", sep, a[n]; sep = "," }')
    printf '{"pid":%s,"ppid":%s,"uid":%s,"user":"%s","state":"%s","cpu_pct":%s,"rss_kb":%s,"uptime_sec":%s,"cmd":"%s","exe":"%s","cwd":"%s","service":"%s","listen_ports":[%s]}' \
        "$_jp" "${S_PPID:-0}" "${S_USER:-0}" "$(json_esc "$(uid2name "${S_USER:-0}")")" "$S_STATE" "${S_CPU:-0}" "${S_RSS_Kb:-0}" "${S_ALIVE:-0}" \
        "$(json_esc "$S_CMD")" "$(json_esc "$_jexe")" "$(json_esc "$_jcwd")" "$(json_esc "$_jsvc")" "$_jlp"
}

# 一组进程的 JSON 数组
json_proc_arr() {
    _sep=""
    printf '['
    for _p in $1; do
        _o=$(json_proc_obj "$_p" 2>/dev/null) || continue
        [ -n "$_o" ] || continue
        printf '%s%s' "$_sep" "$_o"
        _sep=","
    done
    printf ']'
}

json_head() {
    printf '{"query":{"type":"%s","value":"%s"},"time":"%s",' \
        "$1" "$(json_esc "$2")" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')"
}

# ------------------------------------------------------------------ 磁盘 IO
# 一次 awk 扫全部 /proc/PID/io
io_snapshot() {
    awk -v self="$$" '
        FNR == 1 {
            if (pid != "" && pid != self) printf "%s %d %d\n", pid, r, w
            pid = FILENAME; sub(/.*\/proc\//, "", pid); sub(/\/io$/, "", pid); r = 0; w = 0
        }
        $1 == "read_bytes:" { r = $2 }
        $1 == "write_bytes:" { w = $2 }
        END { if (pid != "" && pid != self) printf "%s %d %d\n", pid, r, w }
    ' /proc/[0-9]*/io 2>/dev/null
}

usage_io() {
cat <<EOF
opsq $VERSION - 磁盘 IO 统计（采样秒数用 -d）

  opsq -io              全部进程读写排行 Top 10（1 秒采样）
  opsq -io 689          单进程实时读/写速率
  opsq -io 689 -d 5     单进程 5 秒平均（-d 1..60）
  opsq -io --json

只统计实际落盘字节（/proc/PID/io 的 read_bytes/write_bytes），走 page cache 的不计入。
EOF
}

run_io() {
    _tg=""; _n="${BW_N:-1}"
    while [ $# -gt 0 ]; do
        case "$1" in
            -d|--duration)  _n="${2:-}"; shift; [ $# -gt 0 ] && shift ;;
            -d*)            _n=${1#-d}; shift ;;
            -n|-n*)  die "-n 已让给笔记本（避免同一开关两种含义），采样秒数改用 -d: opsq -io <pid> -d 5" ;;
            -h|--help) usage_io; return 0 ;;
            -*)      die "未知参数: $1（-io 支持 -d <秒数>，用法: opsq -io -h）" ;;
            *)       _tg=$1; shift ;;
        esac
    done
    case "$_n" in ''|*[!0-9]*) die "-n 需要 1-60 的整数" ;; esac
    { [ "$_n" -ge 1 ] && [ "$_n" -le 60 ]; } || die "-n 需要 1-60 的整数"
    [ -n "$_tg" ] && [ ! -r "/proc/$_tg/io" ] && die "进程不存在或无权读取 IO: $_tg"

    _dir=$(mktemp -d) || die "mktemp 失败"
    _cnt=$((_n + 1))
    _i=0
    while [ "$_i" -lt "$_cnt" ]; do
        io_snapshot > "$_dir/s$(printf '%02d' "$_i")"
        _i=$((_i + 1))
        [ "$_i" -lt "$_cnt" ] && sleep 1
    done

    # pid 平均读 平均写 峰值读 峰值写 累计读 累计写 样本跨度
    _agg=$(awk '
        {
            fn = FILENAME; sub(/.*\/s/, "", fn); idx = fn + 0
            p = $1
            if (!(p in f_idx)) { f_idx[p] = idx; f_r[p] = $2; f_w[p] = $3 }
            if ((p in l_idx) && idx == l_idx[p] + 1) {
                dr = $2 - l_r[p]; dw = $3 - l_w[p]
                if (dr > pr[p]) pr[p] = dr
                if (dw > pw[p]) pw[p] = dw
            }
            l_idx[p] = idx; l_r[p] = $2; l_w[p] = $3
        }
        END {
            for (p in l_idx) {
                d = l_idx[p] - f_idx[p]; if (d < 1) d = 1
                printf "%s %d %d %d %d %d %d %d\n", p, int((l_r[p]-f_r[p])/d), int((l_w[p]-f_w[p])/d),
                       pr[p], pw[p], l_r[p], l_w[p], d
            }
        }' "$_dir"/s* 2>/dev/null)

    if [ "$JSON" = 1 ]; then
        if [ -n "$_tg" ]; then
            _line=$(printf '%s\n' "$_agg" | awk -v p="$_tg" '$1 == p')
            [ -n "$_line" ] || _line="$_tg 0 0 0 0 0 0 0"
            set -- $_line
            printf '{"query":{"type":"io","value":"%s"},"window_sec":%s,"time":"%s","items":[{"pid":%s,"read_per_sec":%s,"write_per_sec":%s,"read_peak":%s,"write_peak":%s,"read_total":%s,"write_total":%s}]}\n' \
                "$_tg" "$_n" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')" \
                "$1" "$2" "$3" "$4" "$5" "$6" "$7"
        else
            printf '{"query":{"type":"io","value":"all"},"window_sec":%s,"time":"%s","items":[' \
                "$_n" "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')"
            printf '%s\n' "$_agg" | awk '($2 + $3 > 0) {
                printf "%s{\"pid\":%s,\"read_per_sec\":%s,\"write_per_sec\":%s,\"read_peak\":%s,\"write_peak\":%s,\"read_total\":%s,\"write_total\":%s}", sep, $1, $2, $3, $4, $5, $6, $7
                sep = ","
            }'
            printf ']}\n'
        fi
        rm -rf "$_dir"
        return 0
    fi

    if [ -n "$_tg" ]; then
        read_proc "$_tg"
        sec "磁盘 IO · pid $_tg（${_n}s 平均）"
        printf '  进程     : %s\n' "$(printf '%s' "$S_CMD" | cut -c1-100)"
        _line=$(printf '%s\n' "$_agg" | awk -v p="$_tg" '$1 == p')
        [ -n "$_line" ] || _line="$_tg 0 0 0 0 0 0 0"
        set -- $_line
        printf '  读取     : 平均 %-11s 峰值 %s\n' "$(fmt_rate "$2")" "$(fmt_rate "$4")"
        printf '  写入     : 平均 %-11s 峰值 %s\n' "$(fmt_rate "$3")" "$(fmt_rate "$5")"
        printf '  累计     : 读 %s / 写 %s（进程启动以来）\n' "$(fmt_bytes "$6")" "$(fmt_bytes "$7")"
        printf '  说明     : 仅为实际落盘字节（read_bytes/write_bytes），不含 page cache 命中\n'
    else
        sec "磁盘 IO 排行 · 全部进程（${_n}s 平均，Top 10）"
        _top=$(printf '%s\n' "$_agg" | awk '($2 + $3 > 0) { printf "%d %s %d %d\n", $2 + $3, $1, $2, $3 }' | sort -rn | head -10)
        if [ -z "$(printf '%s' "$_top" | tr -d ' ')" ]; then
            printf '  当前窗口内没有实际磁盘 IO\n'
        else
            printf '%-7s %-11s %-11s %-11s %s\n' PID USER READ/s WRITE/s COMMAND
            printf '%-7s %-11s %-11s %-11s %s\n' ------- ----------- ----------- ----------- -------
            printf '%s\n' "$_top" | while read -r _tot _p _rd _wr; do
                read_proc "$_p" || continue
                _un=$(uid2name "$S_USER"); [ -n "$_un" ] || _un="$S_USER"
                printf '%-7s %-11s %-11s %-11s %s\n' "$_p" "$_un" "$(fmt_rate "$_rd")" "$(fmt_rate "$_wr")" \
                    "$(printf '%s' "$S_CMD" | cut -c1-70)"
            done
        fi
        printf '\n  说明: 仅统计实际落盘 IO；读文件走 page cache 不计入\n'
    fi
    rm -rf "$_dir"
}

# ------------------------------------------------------------------ 暴露面巡检
run_audit() {
    if ! have ss && ! have netstat; then
        die "暴露面巡检需要 ss 或 netstat"
    fi

    if have ss; then
        _rows=$(awk '
            $2 == "LISTEN" || ($1 == "udp" && $2 == "UNCONN") {
                pos = 0
                for (i = length($5); i > 0; i--) if (substr($5, i, 1) == ":") { pos = i; break }
                port = substr($5, pos + 1)
                bind = substr($5, 1, pos - 1)
                gsub(/^\[/, "", bind); gsub(/\]$/, "", bind)
                if (bind == "") bind = "::"
                pid = "-"; if (match($0, /pid=[0-9]+/)) pid = substr($0, RSTART+4, RLENGTH-4)
                comm = "-"; if (match($0, /\(\("[^"]+"/)) comm = substr($0, RSTART+3, RLENGTH-4)
                printf "%s %s %s %s %s\n", $1, port, bind, pid, comm
            }' "$(ss_dump)" | sort -k2 -n | awk '!seen[$1" "$2 " " $3]++')
    else
        _rows=$(netstat -tunlp 2>/dev/null | awk '
            NR <= 2 { next }
            {
                proto = ($1 ~ /^udp/ ? "udp" : "tcp")
                if (proto == "tcp" && $6 != "LISTEN") next
                pos = 0
                for (i = length($4); i > 0; i--) if (substr($4, i, 1) == ":") { pos = i; break }
                port = substr($4, pos + 1)
                bind = substr($4, 1, pos - 1)
                gsub(/^\[/, "", bind); gsub(/\]$/, "", bind)
                if (bind == "") bind = "::"
                nx = split($NF, b, "/")
                pid = (nx > 1) ? b[1] : "-"
                comm = (nx > 1) ? b[2] : "-"
                printf "%s %s %s %s %s\n", proto, port, bind, pid, comm
            }' | sort -k2 -n | awk '!seen[$1" "$2 " " $3]++')
    fi

    _exp_n=0; _loc_n=0
    while read -r _pr _po _bd _pd _cm; do
        [ -n "$_pr" ] || continue
        case "$_bd" in
            0.0.0.0|"*"|::|"") _exp_n=$((_exp_n + 1)) ;;
            *) _loc_n=$((_loc_n + 1)) ;;
        esac
    done <<EOF
$_rows
EOF

    if [ "$JSON" = 1 ]; then
        printf '{"query":{"type":"audit","value":"all"},"time":"%s","summary":{"exposed":%s,"local_only":%s},"items":[' \
            "$(TZ=Asia/Shanghai date '+%Y-%m-%dT%H:%M:%S+08:00')" "$_exp_n" "$_loc_n"
        _sep=""
        while read -r _pr _po _bd _pd _cm; do
            [ -n "$_pr" ] || continue
            case "$_bd" in
                0.0.0.0|"*"|::|"") _ex=true ;;
                *) _ex=false ;;
            esac
            _sv="-"
            case "$_pd" in ''|*[!0-9]*) ;; *) _sv=$(svc_of "$_pd") ;; esac
            printf '%s{"proto":"%s","port":%s,"bind":"%s","exposed":%s,"pid":%s,"comm":"%s","service":"%s"}' \
                "$_sep" "$_pr" "$_po" "$(json_esc "$_bd")" "$_ex" \
                "$([ "$_pd" = "-" ] && echo null || echo "$_pd")" "$(json_esc "$_cm")" "$(json_esc "$_sv")"
            _sep=","
        done <<EOF
$_rows
EOF
        printf ']}\n'
        return 0
    fi

    sec "暴露面巡检"
    printf '  对外监听 : %s%s 个%s     仅本机 : %s%s 个%s\n' "$C_YLW" "$_exp_n" "$C_RST" "$C_GRN" "$_loc_n" "$C_RST"

    sec "对外暴露的端口（0.0.0.0 / :: / *）"
    printf '  %s%-5s %-6s %-16s %-8s %-11s %s%s\n' "$C_DIM" PROTO PORT BIND PID 进程 服务 "$C_RST"
    printf '  %s%-5s %-6s %-16s %-8s %-11s %s%s\n' "$C_DIM" ----- ------ ---------------- -------- ----------- ------------------ "$C_RST"
    while read -r _pr _po _bd _pd _cm; do
        [ -n "$_pr" ] || continue
        case "$_bd" in
            0.0.0.0|"*"|::|"") ;;
            *) continue ;;
        esac
        _sv="-"
        case "$_pd" in ''|*[!0-9]*) ;; *) _sv=$(svc_of "$_pd"); [ -n "$_sv" ] || _sv="-" ;; esac
            printf '%s  %-5s %-6s %-16s %-8s %-11s %s%s\n' "$C_YLW" "$_pr" "$_po" "$_bd" "$_pd" "$_cm" "$_sv" "$C_RST"
    done <<EOF
$_rows
EOF

    sec "仅监听本机（安全）"
    printf '  %-5s %-6s %-16s %-8s %s\n' PROTO PORT BIND PID 进程
    printf '  %-5s %-6s %-16s %-8s %s\n' ----- ------ ---------------- -------- -----------
    while read -r _pr _po _bd _pd _cm; do
        [ -n "$_pr" ] || continue
        case "$_bd" in
            0.0.0.0|"*"|::|"") continue ;;
        esac
        printf '  %-5s %-6s %-16s %-8s %s\n' "$_pr" "$_po" "$_bd" "$_pd" "$_cm"
    done <<EOF
$_rows
EOF
    printf '\n  提示: 对外暴露的端口应确认是否必要；应用类服务优先绑 127.0.0.1 + 反代\n'
}

# ------------------------------------------------------------------ 自更新
run_update() {
    _url="${OPSQ_URL:-https://f.xbta.cc/ai/sh/opsq.sh}"
    have curl || die "更新需要 curl"
    _tmp=$(mktemp) || die "mktemp 失败"
    if ! curl -fsSL --max-time 30 "$_url" -o "$_tmp" 2>/dev/null; then
        rm -f "$_tmp"
        die "下载失败: $_url（网络不通或地址变更）"
    fi
    if ! sh -n "$_tmp" 2>/dev/null; then
        rm -f "$_tmp"
        die "下载内容未通过语法校验，已放弃替换"
    fi
    _new=$(grep '^VERSION=' "$_tmp" | head -1 | sed 's/^VERSION="\(.*\)"$/\1/')
    [ -n "$_new" ] || { rm -f "$_tmp"; die "无法识别版本号"; }
    if [ "$_new" = "$VERSION" ]; then
        ok "已是最新版本 $VERSION"
        rm -f "$_tmp"
        return 0
    fi
    _self=$(readlink -f "$0" 2>/dev/null)
    [ -n "$_self" ] || _self=$0
    _dir=$(dirname "$_self")
    _newf="$_dir/.opsq.new.$$"
    cp "$_tmp" "$_newf" 2>/dev/null || { rm -f "$_tmp"; die "写入 $_dir 失败（需要 root？）"; }
    chmod 755 "$_newf"
    mv -f "$_newf" "$_self" || { rm -f "$_newf"; die "替换失败"; }
    rm -f "$_tmp"
    ok "已更新: $VERSION -> $_new（$_self）"
}

# ------------------------------------------------------------------ 笔记本
# 笔记文件与配置：OPSQ_DIR / NOTE_CONF / NOTE_DEFAULT / NOTE_FILE 已在脚本头部读配置时定义

note_ts() { TZ=CST-8 date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date '+%Y-%m-%d %H:%M:%S'; }

# 从配置读 NOTE_FILE（按 KEY=VALUE 解析，不 source，避免配置被写入命令）
note_load_conf() {
    [ -r "$NOTE_CONF" ] || return 0
    _v=$(awk -F= '/^[ \t]*NOTE_FILE=/{sub(/^[^=]*=/,""); gsub(/^["'"'"' ]+|["'"'"' ]+$/,""); print; exit}' "$NOTE_CONF" 2>/dev/null)
    [ -n "$_v" ] && NOTE_FILE=$_v
}

note_save_conf() {
    mkdir -p "$OPSQ_DIR" 2>/dev/null || die "无法创建目录 $OPSQ_DIR（需要 root？）"
    _tmp="$NOTE_CONF.tmp.$$"
    # 合并更新：保留 LINES / BW_N / COLOR / 注释等其他配置项，只刷新 OPSQ_DIR 与 NOTE_FILE，
    # 否则每次记笔记都会把用户的其他配置冲掉
    if [ -r "$NOTE_CONF" ]; then
        awk '/^[ \t]*(OPSQ_DIR|NOTE_FILE)=/ { next } { print }' "$NOTE_CONF" > "$_tmp" 2>/dev/null
    else
        ( : > "$_tmp" ) 2>/dev/null
    fi
    printf 'OPSQ_DIR=%s\nNOTE_FILE=%s\n' "$OPSQ_DIR" "$NOTE_FILE" >> "$_tmp" 2>/dev/null \
        || { rm -f "$_tmp"; die "无法写入 $NOTE_CONF"; }
    mv -f "$_tmp" "$NOTE_CONF" || { rm -f "$_tmp"; die "无法写入 $NOTE_CONF"; }
}

# 确保笔记文件所在目录与文件存在（子 shell 包裹重定向，避免 dash 下特殊内建命令失败中止脚本）
note_ensure_file() {
    _nd=$(dirname "$NOTE_FILE")
    [ -d "$_nd" ] || mkdir -p "$_nd" 2>/dev/null || die "无法创建目录 $_nd（需要 root？）"
    [ -e "$NOTE_FILE" ] && return 0
    ( : > "$NOTE_FILE" ) 2>/dev/null || die "无法创建 $NOTE_FILE（需要 root？）"
}

# 确定笔记文件并确保存在；创建前检测目标文件是否已存在，已存在则询问是否换用别的文件
note_init() {
    note_load_conf
    [ -n "$NOTE_FILE" ] && [ -e "$NOTE_FILE" ] && return 0
    if [ -z "$NOTE_FILE" ]; then
        NOTE_FILE=$NOTE_DEFAULT
        # 创建前检测：默认文件已存在 -> 询问是否换别的文件（非交互直接沿用）
        if [ -e "$NOTE_FILE" ] && [ -t 0 ] && [ -t 1 ]; then
            printf '笔记文件 %s 已存在（%s 行）。\n' "$NOTE_FILE" "$(wc -l < "$NOTE_FILE" 2>/dev/null | tr -d ' ')" >&2
            printf '是否换用别的文件？[y/N] ' >&2
            read -r _ans || _ans=""
            case "$_ans" in
                y|Y|yes|YES|Yes)
                    printf '新笔记文件路径: ' >&2
                    read -r _newp || _newp=""
                    [ -n "$_newp" ] || die "未输入路径，已取消"
                    NOTE_FILE=$_newp ;;
            esac
        fi
    fi
    note_save_conf
    note_ensure_file
}

note_add() {
    [ $# -gt 0 ] || die "用法: opsq -n add <内容>"
    note_init
    printf '[%s] %s\n' "$(note_ts)" "$*" >> "$NOTE_FILE" 2>/dev/null || die "写入 $NOTE_FILE 失败"
    if [ "$JSON" = 1 ]; then
        printf '{"ok":true,"file":"%s","text":"%s"}\n' "$(json_esc "$NOTE_FILE")" "$(json_esc "$*")"
    else
        ok "已记录 -> $NOTE_FILE"
    fi
}

note_list() {
    note_load_conf
    [ -n "$NOTE_FILE" ] || NOTE_FILE=$NOTE_DEFAULT
    if [ ! -e "$NOTE_FILE" ]; then
        if [ "$JSON" = 1 ]; then
            printf '{"file":"%s","count":0,"notes":[]}\n' "$(json_esc "$NOTE_FILE")"
        else
            warn "暂无笔记: $NOTE_FILE"
            dim  "用 opsq -n add <内容> 新增一条。"
        fi
        return 0
    fi
    _cnt=$(wc -l < "$NOTE_FILE" 2>/dev/null | tr -d ' ')
    if [ "$JSON" = 1 ]; then
        printf '{"file":"%s","count":%s,"notes":[' "$(json_esc "$NOTE_FILE")" "${_cnt:-0}"
        _sep=""
        while IFS= read -r _ln || [ -n "$_ln" ]; do
            printf '%s"%s"' "$_sep" "$(json_esc "$_ln")"; _sep=","
        done < "$NOTE_FILE"
        printf ']}\n'
    else
        sec "笔记 $NOTE_FILE"
        cat "$NOTE_FILE"
        printf '\n%s共 %s 条%s\n' "$C_DIM" "${_cnt:-0}" "$C_RST"
    fi
}

note_edit() {
    note_init
    _ed="${EDITOR:-}"
    if [ -n "$_ed" ] && ! have "$_ed"; then _ed=""; fi
    if [ -z "$_ed" ]; then
        for _c in vi vim nano editor; do
            have "$_c" && { _ed=$_c; break; }
        done
    fi
    [ -n "$_ed" ] || die "未找到编辑器，请设置 \$EDITOR（如 vi / nano）"
    "$_ed" "$NOTE_FILE"
    printf '已编辑: %s\n' "$NOTE_FILE"
}

note_file() {
    if [ $# -eq 0 ]; then
        note_load_conf
        printf '笔记文件: %s\n配置文件: %s\n' "${NOTE_FILE:-$NOTE_DEFAULT}" "$NOTE_CONF"
        return 0
    fi
    case "$1" in
        -h|--help) usage_note; return 0 ;;
    esac
    NOTE_FILE=$1
    note_save_conf
    note_ensure_file
    ok "笔记文件已切换: $NOTE_FILE"
}

note_tail() {
    _tn=${1:-${LINES:-10}}
    case "$_tn" in ''|*[!0-9]*) die "用法: opsq -n tail [条数]" ;; esac
    note_load_conf
    [ -n "$NOTE_FILE" ] || NOTE_FILE=$NOTE_DEFAULT
    [ -e "$NOTE_FILE" ] || die "暂无笔记: $NOTE_FILE"
    _total=$(wc -l < "$NOTE_FILE" 2>/dev/null | tr -d ' ')
    _got=$(tail -n "$_tn" "$NOTE_FILE" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$JSON" = 1 ]; then
        printf '{"file":"%s","total":%s,"count":%s,"notes":[' "$(json_esc "$NOTE_FILE")" "${_total:-0}" "${_got:-0}"
        tail -n "$_tn" "$NOTE_FILE" 2>/dev/null | while IFS= read -r _l || [ -n "$_l" ]; do
            printf '%s"%s"' "$_sp" "$(json_esc "$_l")"; _sp=","
        done
        printf ']}\n'
    else
        sec "笔记 · 最后 $_tn 条（共 ${_total:-0} 条）"
        tail -n "$_tn" "$NOTE_FILE" 2>/dev/null
    fi
}

note_search() {
    [ $# -gt 0 ] || die "用法: opsq -n search <关键词>"
    _kw="$*"
    note_load_conf
    [ -n "$NOTE_FILE" ] || NOTE_FILE=$NOTE_DEFAULT
    [ -e "$NOTE_FILE" ] || die "暂无笔记: $NOTE_FILE"
    _hit=$(grep -n -E -- "$_kw" "$NOTE_FILE" 2>/dev/null)
    _n=$(printf '%s\n' "$_hit" | awk 'NF' | wc -l | tr -d ' ')
    if [ "$JSON" = 1 ]; then
        printf '{"file":"%s","keyword":"%s","count":%s,"items":[' "$(json_esc "$NOTE_FILE")" "$(json_esc "$_kw")" "${_n:-0}"
        printf '%s\n' "$_hit" | awk 'NF' | while IFS= read -r _l; do
            _ln=${_l%%:*}; _tx=${_l#*:}
            printf '%s{"line":%s,"text":"%s"}' "$_sp" "${_ln:-0}" "$(json_esc "$_tx")"; _sp=","
        done
        printf ']}\n'
    else
        sec "笔记搜索 · 关键词[$_kw]"
        if [ -z "$_hit" ]; then
            warn "  （无匹配，关键词按正则匹配）"
        else
            printf '%s\n' "$_hit"
            printf '\n%s共 %s 条（行号:内容）%s\n' "$C_DIM" "${_n:-0}" "$C_RST"
        fi
    fi
}

note_del() {
    _ln=$1
    case "$_ln" in ''|*[!0-9]*) die "用法: opsq -n del <行号>" ;; esac
    note_load_conf
    [ -n "$NOTE_FILE" ] || NOTE_FILE=$NOTE_DEFAULT
    [ -e "$NOTE_FILE" ] || die "暂无笔记: $NOTE_FILE"
    _total=$(wc -l < "$NOTE_FILE" 2>/dev/null | tr -d ' ')
    [ "$_ln" -ge 1 ] 2>/dev/null || die "行号需 >= 1"
    [ "$_ln" -le "${_total:-0}" ] 2>/dev/null || die "行号超出范围（共 ${_total:-0} 行，用 opsq -n 看行号）"
    _line=$(sed -n "${_ln}p" "$NOTE_FILE" 2>/dev/null)
    _tmp="$NOTE_FILE.tmp.$$"
    awk -v n="$_ln" 'NR != n' "$NOTE_FILE" > "$_tmp" 2>/dev/null || { rm -f "$_tmp"; die "删除失败（写入 $NOTE_FILE）"; }
    mv -f "$_tmp" "$NOTE_FILE" || { rm -f "$_tmp"; die "替换失败（$NOTE_FILE）"; }
    _left=$(( _total - 1 ))
    if [ "$JSON" = 1 ]; then
        printf '{"ok":true,"file":"%s","line":%s,"text":"%s","left":%s}\n' \
            "$(json_esc "$NOTE_FILE")" "$_ln" "$(json_esc "$_line")" "${_left:-0}"
    else
        ok "已删除第 $_ln 行（剩 ${_left:-0} 条）"
        printf '  %s被删内容: %s%s\n' "$C_DIM" "$_line" "$C_RST"
    fi
}

usage_note() {
cat <<EOF
opsq $VERSION - 笔记本

  opsq -n               查看全部笔记
  opsq -n add <内容>     追加一条（自动加时间戳）
  opsq -n <内容>         同上（简写）
  opsq -n edit          用编辑器打开（\$EDITOR / vi / nano / editor）
  opsq -n file          显示当前笔记文件
  opsq -n file <路径>    切换到别的笔记文件
  opsq -n tail [N]       最后 N 条（默认 ${LINES:-10}）
  opsq -n search <关键词> 关键词搜索，输出「行号:内容」
  opsq -n del <行号>     删除指定行（会回显被删内容）

  笔记文件 ${NOTE_FILE:-$NOTE_DEFAULT}
  配置文件   $NOTE_CONF
  首次使用会创建笔记文件；若默认路径已存在，将询问是否换用别的文件。

  配置文件 $NOTE_CONF（KEY=VALUE，不执行）：
    NOTE_FILE=路径   笔记文件        LINES=50      日志/笔记默认条数
    BW_N=5           -b/-io 默认秒数  COLOR=0      禁用颜色
EOF
}

run_note() {
    _sub="${1:-}"
    case "$_sub" in
        "")               note_list ;;
        -h|--help|help)   usage_note ;;
        list|ls|show)     note_list ;;
        add|a)            shift; note_add "$@" ;;
        edit|e|ed)        note_edit ;;
        file|path)        shift; note_file "$@" ;;
        tail|last)        shift; note_tail "${1:-}" ;;
        search|find|grep) shift; note_search "$@" ;;
        del|rm|delete)    shift; note_del "${1:-}" ;;
        *)                note_add "$@" ;;
    esac
}

# ------------------------------------------------------------------ 日志检索
# 日志源优先级：--file 指定文件 > journalctl > logread(OpenWrt) > /var/log/*
_lg_svc_filter() { if [ -n "$_lg_svc" ]; then grep -F -- "$_lg_svc" 2>/dev/null; else cat; fi; }
_lg_kw_filter()  { if [ -n "$_lg_kw" ];  then grep -E -- "$_lg_kw" 2>/dev/null;  else cat; fi; }

usage_log() {
cat <<EOF
opsq $VERSION - 日志检索

  opsq -g <关键词>            全局日志按关键词检索
  opsq -g <关键词> -s nginx   只看某个 systemd 服务
  opsq -g <关键词> --since 10min    时间窗（journalctl --since 语法）
  opsq -g <关键词> --lines 100      返回条数（默认 ${LINES:-50}）
  opsq -g -s nginx            服务最近日志（关键词可省）
  opsq -g <关键词> --file /var/log/x.log   指定日志文件
  opsq -g <关键词> --json     机器可读输出

日志源优先级: --file > journalctl > logread(OpenWrt/busybox) > /var/log/{syslog,messages,kern.log}
关键词为扩展正则（journalctl -g 与 grep -E 同语义）。
EOF
}

run_log() {
    _lg_kw=""; _lg_svc=""; _lg_since=""; _lg_lines="${LINES:-50}"; _lg_file=""; _kwset=0
    while [ $# -gt 0 ]; do
        case "$1" in
            -s|--service|--unit) [ $# -ge 2 ] || die "-s 需要服务名"; _lg_svc="$2"; shift; shift ;;
            --since)  [ $# -ge 2 ] || die "--since 需要时间表达式，如 10min / today"; _lg_since="$2"; shift; shift ;;
            --lines)  [ $# -ge 2 ] || die "--lines 需要整数"; _lg_lines="$2"; shift; shift ;;
            -L)       die "短选项已统一，行数改用 --lines: opsq -g 关键词 --lines 100" ;;
            --file)   [ $# -ge 2 ] || die "--file 需要日志文件路径"; _lg_file="$2"; shift; shift ;;
            -h|--help|help) usage_log; return 0 ;;
            -*) die "未知选项: $1（用法见 opsq -g -h）" ;;
            *) if [ "$_kwset" = 0 ]; then _lg_kw="$1"; _kwset=1; else _lg_kw="$_lg_kw $1"; fi; shift ;;
        esac
    done
    case "$_lg_lines" in ''|*[!0-9]*) die "--lines 需要 1-10000 的整数" ;; esac

    # 选日志源
    _lg_src=""
    if [ -n "$_lg_file" ]; then
        [ -r "$_lg_file" ] || die "日志文件不可读: $_lg_file"
        _lg_src="file:$_lg_file"
    elif have journalctl; then
        _lg_src="journal"
    elif have logread; then
        _lg_src="logread"
    else
        for _f in /var/log/syslog /var/log/messages /var/log/kern.log; do
            [ -r "$_f" ] && { _lg_file=$_f; _lg_src="file:$_f"; break; }
        done
    fi
    [ -n "$_lg_src" ] || die "没有可用日志源（journalctl / logread / /var/log 均无）"

    if [ "$_lg_src" = "journal" ]; then
        # 用 set -- 构造参数，避免变量拼接注入
        set -- journalctl --no-pager -o short-iso -n "$_lg_lines"
        [ -n "$_lg_svc" ]   && set -- "$@" -u "$_lg_svc"
        [ -n "$_lg_since" ] && set -- "$@" --since "$_lg_since"
        [ -n "$_lg_kw" ]    && set -- "$@" -g "$_lg_kw"
        _lg_out=$(timeout 8 "$@" 2>/dev/null)
        _lg_rc=$?
        if [ "$_lg_rc" = 124 ]; then die "journalctl 超时（8s），日志量过大时请缩小 --lines 或时间窗"; fi
        if [ -z "$_lg_out" ] && [ "$_lg_rc" -ge 1 ] 2>/dev/null && [ "$_lg_rc" -ne 1 ]; then
            # journalctl 非"无匹配"错误（如权限/不存在的 unit）
            _lg_err=$(timeout 8 journalctl --no-pager -n 1 2>&1 >/dev/null)
            case "$_lg_err" in *permission*|*Permission*) die "journalctl 权限不足（试试 sudo）" ;; esac
        fi
    elif [ "$_lg_src" = "logread" ]; then
        _lg_out=$(logread 2>/dev/null | _lg_svc_filter | _lg_kw_filter | tail -n "$_lg_lines")
    else
        _lg_out=$(cat "$_lg_file" 2>/dev/null | _lg_svc_filter | _lg_kw_filter | tail -n "$_lg_lines")
    fi

    if [ "$JSON" = 1 ]; then
        json_head log "${_lg_kw:-${_lg_svc:-all}}"
        printf '"source":"%s","lines":%s,"items":[' "$(json_esc "$_lg_src")" "${_lg_lines}"
        printf '%s\n' "$_lg_out" | awk 'NF' | while IFS= read -r _l; do
            printf '%s"%s"' "$_sp" "$(json_esc "$_l")"; _sp=","
        done
        printf ']}\n'
        return 0
    fi

    _n=$(printf '%s\n' "$_lg_out" | awk 'NF' | wc -l | tr -d ' ')
    _desc="${_lg_lines} 条"
    _filt=""
    [ -n "$_lg_svc" ] && _filt=" $_lg_svc"
    [ -n "$_lg_kw" ] && _filt="$_filt 关键词[$_lg_kw]"
    [ -n "$_lg_since" ] && _filt="$_filt 自[$_lg_since]"
    sec "日志 · $_lg_src$_filt"
    if [ -z "$_lg_out" ]; then
        warn "  （无匹配日志）"
        printf '  %s提示: 关键词为正则；无 journalctl 时回退文件日志，可用 --file 指定%s\n' "$C_DIM" "$C_RST"
    else
        printf '%s\n' "$_lg_out"
        printf '\n%s命中 %s 条（上限 %s）%s\n' "$C_DIM" "$_n" "$_lg_lines" "$C_RST"
    fi
}

# ------------------------------------------------------------------ 快照对比
SNAP_DIR="$OPSQ_DIR/snap"
SNAP_BASE="$SNAP_DIR/base.txt"

# 生成当前状态清单：PORT <addr> <comm> / PROC <comm> / SVC <name>
snap_gen() {
    if have ss; then
        awk '$2 == "LISTEN" || ($1 == "udp" && $2 == "UNCONN") {
            comm = "-"; if (match($0, /\(\(\"[^\"]+\"/)) comm = substr($0, RSTART + 3, RLENGTH - 4)
            printf "PORT\t%s\t%s\n", $5, comm
        }' "$(ss_dump)" | sort -u
    elif have netstat; then
        netstat -lntup 2>/dev/null | awk 'NR > 2 && $1 ~ /^(tcp|udp)/ {
            comm = "-"; if (NF >= 7) { comm = $NF; sub(/^.*\//, "", comm) }
            printf "PORT\t%s\t%s\n", $4, comm
        }' | sort -u
    else
        _px=$(awk 'NR > 1 && ($4 == "0A" || $4 == "07") { n = split($2, a, ":"); print $1, a[n] }' \
              /proc/net/tcp /proc/net/tcp6 2>/dev/null | sort -u | cut -d" " -f2)
        for _pp in $_px; do printf 'PORT\t:%s\t-\n' "$(h2d "$_pp" 2>/dev/null || echo "?")"; done
    fi
    # 单 awk 内部去重（不走 `| sort | sed`，并发管道会扫到自身子进程造成 save/diff 时序噪声）。
    # 同时排除两类「工具进程」，否则 `opsq --snapshot diff | grep xxx` 会把 grep 算成新增进程：
    #   spp  = 本脚本自身 shell PID -> 它的直接子进程（awk/ss/timeout/journalctl…）
    #   sppp = 调用本脚本的父 shell -> 同父的管道兄弟，仅当 comm 在工具白名单内才排除，
    #          后台启动的真实业务进程（如 python/nginx）不在白名单，保留。
    awk -v spp="$$" -v sppp="$PPID" '
    BEGIN {
        tool["tail"]=1; tool["head"]=1; tool["grep"]=1; tool["sed"]=1; tool["awk"]=1
        tool["sort"]=1; tool["cat"]=1; tool["less"]=1; tool["more"]=1; tool["tr"]=1
        tool["cut"]=1; tool["uniq"]=1; tool["wc"]=1; tool["ps"]=1; tool["jq"]=1
        tool["tee"]=1; tool["nl"]=1; tool["column"]=1; tool["bat"]=1; tool["xargs"]=1
        tool["paste"]=1; tool["comm"]=1; tool["sha256sum"]=1; tool["md5sum"]=1
        tool["lsof"]=1; tool["timeout"]=1; tool["stdbuf"]=1; tool["env"]=1
    }
    {
        line = $0; p = 0
        for (i = length(line); i > 0; i--) if (substr(line, i, 1) == ")") { p = i; break }
        s = index(line, "(")
        if (s > 0 && p > s) {
            c = substr(line, s + 1, p - s - 1)
            # 内核线程族归一：kworker/2:0-events -> kworker（同一 PID 复用后 comm 后缀会变，
            # 不归一的话每次 diff 都会互报增减）。用户态进程名一般不含 "/"，不受影响。
            if (index(c, "/") > 0) c = substr(c, 1, index(c, "/") - 1)
            n2 = split(substr(line, p + 2), f, " ")
            pp = f[2]
            if (pp == spp) next
            if (pp == sppp && (c in tool)) next
            if (!(c in seen)) { seen[c] = 1; order[++n] = c }
        }
    } END { for (i = 1; i <= n; i++) print "PROC\t" order[i] }' /proc/[0-9]*/stat 2>/dev/null
    if have systemctl; then
        systemctl list-units --type=service --state=active --no-legend --no-pager 2>/dev/null \
            | awk '{ print $1 }' | sed 's/^/SVC\t/'
    fi
}

usage_snap() {
cat <<EOF
opsq $VERSION - 端口/进程/服务快照与差异对比

  opsq --snapshot save    保存当前状态为基线（覆盖上一份，上一份留为 base.prev.txt）
  opsq --snapshot         同 save
  opsq --snapshot diff    当前状态 vs 基线：新增了什么、消失了什么
  opsq --snapshot list    查看基线摘要
  opsq --snapshot --json  机器可读输出

基线文件: $SNAP_BASE
典型用法: 先 opsq --snapshot save，做一次操作/变更，再 opsq --snapshot diff 看影响面。
EOF
}

snap_summary() {
    # $1 = 文件，输出 "N 端口 / M 进程 / K 服务"
    awk -F'\t' '$1=="PORT"{p++} $1=="PROC"{c++} $1=="SVC"{s++} END{printf "%s/%s/%s", p+0, c+0, s+0}' "$1" 2>/dev/null
}

snap_save() {
    mkdir -p "$SNAP_DIR" 2>/dev/null || die "无法创建 $SNAP_DIR（需要 root？）"
    [ -f "$SNAP_BASE" ] && cp -f "$SNAP_BASE" "$SNAP_DIR/base.prev.txt" 2>/dev/null
    _tmp="$SNAP_BASE.tmp.$$"
    snap_gen > "$_tmp" 2>/dev/null
    [ -s "$_tmp" ] || { rm -f "$_tmp"; die "快照生成为空（进程不可见？）"; }
    mv -f "$_tmp" "$SNAP_BASE" || die "写入 $SNAP_BASE 失败"
    _sum=$(snap_summary "$SNAP_BASE"); IFS=/; set -- $_sum; unset IFS
    if [ "$JSON" = 1 ]; then
        printf '{"ok":true,"file":"%s","ports":%s,"procs":%s,"svcs":%s}\n' \
            "$(json_esc "$SNAP_BASE")" "${1:-0}" "${2:-0}" "${3:-0}"
    else
        ok "已保存基线: ${1:-0} 端口 / ${2:-0} 进程 / ${3:-0} 服务 -> $SNAP_BASE"
    fi
}

snap_diff() {
    [ -f "$SNAP_BASE" ] || die "还没有基线，先执行: opsq --snapshot save"
    _now="$SNAP_DIR/.now.$$"
    snap_gen > "$_now" 2>/dev/null
    [ -s "$_now" ] || { rm -f "$_now"; die "当前状态生成为空"; }
    # 新增 = 现在有、基线没有；消失 = 基线有、现在没有
    _add=$(awk -F'\t' 'NR==FNR{a[$0]=1;next} !($0 in a){print}' "$SNAP_BASE" "$_now")
    _del=$(awk -F'\t' 'NR==FNR{a[$0]=1;next} !($0 in a){print}' "$_now" "$SNAP_BASE")
    rm -f "$_now"
    _na=$(printf '%s\n' "$_add" | awk 'NF' | wc -l | tr -d ' ')
    _nd=$(printf '%s\n' "$_del" | awk 'NF' | wc -l | tr -d ' ')

    if [ "$JSON" = 1 ]; then
        json_head snapshot "diff"
        printf '"base":"%s","added":{"count":%s,"items":[' "$(json_esc "$SNAP_BASE")" "${_na:-0}"
        printf '%s\n' "$_add" | awk 'NF' | while IFS= read -r _l; do
            printf '%s"%s"' "$_sp" "$(json_esc "$_l")"; _sp=","
        done
        printf ']},"removed":{"count":%s,"items":[' "${_nd:-0}"
        _sp=""
        printf '%s\n' "$_del" | awk 'NF' | while IFS= read -r _l; do
            printf '%s"%s"' "$_sp" "$(json_esc "$_l")"; _sp=","
        done
        printf ']}}\n'
        return 0
    fi

    if [ "${_na:-0}" -eq 0 ] && [ "${_nd:-0}" -eq 0 ]; then
        ok "与基线一致：无变化（$SNAP_BASE）"
        return 0
    fi
    _print_group() {
        # $1=标题 $2=内容
        [ -n "$(printf '%s' "$2" | tr -d ' \n')" ] || return 0
        sec "$1"
        printf '%s\n' "$2" | awk -F'\t' 'NF>=2 {
            t = $1; rest = $0; sub(/^[^\t]*\t/, "", rest)
            if (t == "PORT")   printf "  %-5s %s\n", "[端口]", rest
            else if (t == "PROC") printf "  %-5s %s\n", "[进程]", rest
            else if (t == "SVC")  printf "  %-5s %s\n", "[服务]", rest
            else printf "  %s\n", rest
        }'
    }
    _print_group "新增（现在有、基线没有） $_na 项" "$_add"
    _print_group "消失（基线有、现在没有） $_nd 项" "$_del"
    printf '\n%s基线: %s（opsq --snapshot save 可刷新）%s\n' "$C_DIM" "$SNAP_BASE" "$C_RST"
}

snap_list() {
    [ -f "$SNAP_BASE" ] || die "还没有基线，先执行: opsq --snapshot save"
    _sum=$(snap_summary "$SNAP_BASE"); IFS=/; set -- $_sum; unset IFS
    _mtime=$(TZ=Asia/Shanghai date -r "$SNAP_BASE" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || stat -c %y "$SNAP_BASE" 2>/dev/null | cut -c1-19)
    if [ "$JSON" = 1 ]; then
        printf '{"file":"%s","time":"%s","ports":%s,"procs":%s,"svcs":%s}\n' \
            "$(json_esc "$SNAP_BASE")" "${_mtime:-}" "${1:-0}" "${2:-0}" "${3:-0}"
    else
        printf '基线文件 : %s\n保存时间 : %s\n状态构成 : %s 端口 / %s 进程 / %s 服务\n' \
            "$SNAP_BASE" "${_mtime:-未知}" "${1:-0}" "${2:-0}" "${3:-0}"
        [ -f "$SNAP_DIR/base.prev.txt" ] && printf '上一份   : %s\n' "$SNAP_DIR/base.prev.txt"
    fi
}

run_snapshot() {
    _sub="${1:-save}"
    case "$_sub" in
        -h|--help|help) usage_snap ;;
        save|snap|"")   snap_save ;;
        diff|d)         snap_diff ;;
        list|ls|info)   snap_list ;;
        *) die "未知子命令: $_sub（opsq --snapshot -h）" ;;
    esac
}

# ------------------------------------------------------------------ 自检
run_selfcheck() {
    _rows=""; _nbad=0; _grade="完整功能"
    _NL='
'
    _chk() {
        # _chk <组件> <有无:1/0> <作用> [无则影响>  # 命令替换会吃掉尾部换行，故显式补 $_NL
        if [ "$2" = 1 ]; then
            _rows="${_rows}$(printf '  %-13s %s%-4s%s %s' "$1" "$C_GRN" "OK" "$C_RST" "$3")$_NL"
        else
            _rows="${_rows}$(printf '  %-13s %s%-4s%s %s' "$1" "$C_YLW" "--" "$C_RST" "${4:-未安装：$3}")$_NL"
            _nbad=$((_nbad + 1))
        fi
    }
    have ss         && _a=1 || _a=0
    have netstat    && _b=1 || _b=0
    have lsof       && _c=1 || _c=0
    have systemctl  && _d=1 || _d=0
    have journalctl && _e=1 || _e=0
    have logread    && _f=1 || _f=0
    have python3    && _g=1 || _g=0
    have curl       && _h=1 || _h=0
    [ -r /proc/1/stat ] && _i=1 || _i=0
    if [ -w "$OPSQ_DIR" ] 2>/dev/null || [ ! -e "$OPSQ_DIR" ]; then _j=1; else _j=0; fi

    _chk ss          "$_a" "端口/连接/带宽/快照端口精度"
    _chk netstat     "$_b" "ss 缺失时的端口回退"
    _chk lsof        "$_c" "-f 文件查询加速（缺失走 /proc fd 扫描）"
    _chk systemctl   "$_d" "-s 服务 / -t timer / 快照服务列"
    _chk journalctl  "$_e" "-g 日志检索（journal 源）"
    _chk logread     "$_f" "-g 日志检索（OpenWrt 源）"
    _chk python3     "$_g" "-t systemd timer JSON 解析（缺失只出文本表）"
    _chk curl        "$_h" "--update 自更新"
    _chk /proc       "$_i" "进程/端口基础数据源"
    _chk note-dir     "$_j" "-n 与 --snapshot 写入（$OPSQ_DIR）" "不可写：-n/--snapshot 会失败"

    if [ -f /etc/openwrt_release ]; then
        _grade="OpenWrt/busybox（核心功能，-b/-r 需 ss）"
    elif [ "$_a" = 0 ]; then
        _grade="降级（无 ss：端口走 /proc 或 netstat 回退）"
    elif [ "$_d" = 0 ]; then
        _grade="降级（无 systemd：-s/-t 受限）"
    elif [ "$_nbad" -eq 0 ]; then
        _grade="完整功能"
    else
        _grade="基本完整（部分可选组件缺失）"
    fi

    _os=$(. /etc/os-release 2>/dev/null && printf '%s' "$PRETTY_NAME") || _os=""
    [ -n "$_os" ] || _os=$(uname -s 2>/dev/null || echo unknown)
    _arch=$(uname -m 2>/dev/null || echo unknown)
    _uid=$(id -u 2>/dev/null || echo 0)
    if [ "$_uid" = 0 ]; then _who="root"; else _who="非 root（他人进程/socket 不可见）"; fi

    if [ "$JSON" = 1 ]; then
        json_head selfcheck "all"
        printf '"version":"%s","grade":"%s","os":"%s","arch":"%s","uid":%s,"checks":{' \
            "$VERSION" "$(json_esc "$_grade")" "$(json_esc "$_os")" "$_arch" "${_uid:-0}"
        printf '"ss":%s,"netstat":%s,"lsof":%s,"systemctl":%s,"journalctl":%s,"logread":%s,"python3":%s,"curl":%s,"proc":%s,"opsq_dir":%s}' \
            "$_a" "$_b" "$_c" "$_d" "$_e" "$_f" "$_g" "$_h" "$_i" "$_j"
        printf '}\n'
        return 0
    fi

    sec "opsq 自检 · v$VERSION"
    printf '  %-13s %-4s %s\n' "组件" "状态" "作用 / 缺失影响"
    printf '  %-13s %-4s %s\n' "-------------" "----" "------------------------------------------"
    printf '%s' "$_rows"
    printf '\n  %-13s %s\n' "OS" "$_os · $_arch"
    printf '  %-13s %s\n' "USER" "$_who"
    printf '  %-13s %s\n' "DIR" "$OPSQ_DIR"
    printf '  %-13s %s\n' "CONF" "$NOTE_CONF$([ -f "$NOTE_CONF" ] && echo '（已存在）' || echo '（未创建，首次用笔记时生成）')"
    printf '  %-13s %s%s%s\n' "GRADE" "$C_GRN" "$_grade" "$C_RST"
}

# ------------------------------------------------------------------ 入口
# 先剥离全局选项（可放在任意位置）：--json / --no-color
JSON=0
_newargs=""
for _a in "$@"; do
    case "$_a" in
        --json|-j)  JSON=1 ;;
        --no-color) NO_COLOR=1 ;;
        *) _newargs="${_newargs}
${_a}" ;;
    esac
done
if [ "$JSON" = 1 ] || [ -n "$NO_COLOR" ]; then
    C_RED=''; C_GRN=''; C_YLW=''; C_CYN=''; C_DIM=''; C_RST=''
    set --
    _oifs=$IFS
    IFS='
'
    for _a in $_newargs; do
        [ -n "$_a" ] && set -- "$@" "$_a"
    done
    IFS=$_oifs
fi

[ $# -eq 0 ] && { usage; exit 0; }

# 功能开关扫描：顺序无关——开关可出现在任意位置，值在其前后都行
# （找到第一个开关即停，此后出现的同名串一律按值处理，避免把笔记内容当开关）
opt=""; _oi=0; _fi=0
for _a in "$@"; do
    _oi=$((_oi + 1))
    [ -n "$opt" ] && break
    case "$_a" in
        -h|--help|help|-v|--version|-l|--list|-p|--port|-u|--user|-i|--pid|-c|--cmd|-f|--file|\
        -b|--bw|-io|--io|-s|--service|--svc|-t|--timer|--timers|-r|--reverse|--remote|\
        -n|--note|-g|--log|--grep|--audit|--snapshot|snapshot|snap|--selfcheck|selfcheck|--check|\
        --update|update|list|ls|port|pid|uid|user|cmd|name|service|svc|timer|timers|note|reverse|remote|file)
            opt=$_a; _fi=$_oi ;;
    esac
done

if [ -z "$opt" ]; then
    # 没有开关：裸参数（裸数字 = 端口）
    opt=$1; shift
else
    # 把开关前面的参数逐个挪到末尾，使开关成为 $1（空格安全：逐个 shift + set 追加）
    # 结果 $@ = [开关之后的参数..., 开关之前的值...]，各模块内部循环解析，与顺序无关
    _mv=$((_fi - 1))
    while [ "$_mv" -gt 0 ]; do
        _first=$1
        shift
        set -- "$@" "$_first"
        _mv=$((_mv - 1))
    done
    shift
fi

if [ "$NONROOT" = 1 ]; then
    case "$opt" in
        -h|--help|help|-v|--version|-n|--note|note|-g|--log|--grep|--snapshot|snapshot|snap|--selfcheck|selfcheck|--check) ;;
        *) printf '%s提示: 非 root 运行，他人进程/端口/socket 信息可能不可见（sudo 可获得完整数据）%s\n' "$C_DIM" "$C_RST" >&2 ;;
    esac
fi

case "$opt" in
    -h|--help|help)  usage; exit 0 ;;
    -v|--version)    echo "opsq $VERSION"; exit 0 ;;
    -l|--list)
        if [ "$JSON" = 1 ]; then
            json_head list ""
            printf '"count":0,"items":['
            if have ss; then
                awk '$2 == "LISTEN" || ($1 == "udp" && $2 == "UNCONN") {
                    n = split($5, a, ":"); port = a[n]
                    pid = "null"; if (match($0, /pid=[0-9]+/)) pid = substr($0, RSTART+4, RLENGTH-4)
                    nm = "-"; if (match($0, /\(\("[^"]+"/)) nm = substr($0, RSTART+3, RLENGTH-4)
                    printf "%s{\"proto\":\"%s\",\"local\":\"%s\",\"port\":%s,\"pid\":%s,\"comm\":\"%s\"}", sep, $1, $5, port, pid, nm; sep = ","
                }' "$(ss_dump)"
            fi
            printf ']}\n'
        else
            print_list
        fi ;;
    -p|--port)
        [ -n "$1" ] || die "用法: opsq -p <端口>[,<端口>...]"
        case "$1" in
            *','*)
                for _pt in $(printf '%s' "$1" | tr ',' ' '); do
                    [ -n "$_pt" ] || continue
                    print_port "$_pt"
                done ;;
            *) print_port "$1" ;;
        esac ;;
    -u|--user)
        [ -n "$1" ] || die "用法: opsq -u <UID|用户名>"
        if [ "$JSON" = 1 ]; then
            case "$1" in
                ''|*[!0-9]*) _u=$(name2uid "$1") ;;
                *) _u=$1 ;;
            esac
            [ -n "$_u" ] || die "用户不存在: $1"
            _un=$(uid2name "$_u")
            _grp=$(id -Gn "$_u" 2>/dev/null | tr ' ' ',')
            _home=$(awk -F: -v u="$_u" '$3==u{print $6; exit}' /etc/passwd 2>/dev/null)
            _shell=$(awk -F: -v u="$_u" '$3==u{print $7; exit}' /etc/passwd 2>/dev/null)
            _p=$(pids_by_uid "$_u")
            json_head user "$_u"
            printf '"uid":%s,"user":{"name":"%s","home":"%s","shell":"%s","groups":"%s"},"count":%s,"items":' \
                "$_u" "$(json_esc "$_un")" "$(json_esc "$_home")" "$(json_esc "$_shell")" "$(json_esc "$_grp")" \
                "$(printf '%s' "$_p" | wc -w)"
            json_proc_arr "$_p"
            printf '}\n'
        else
            run_user "$1"
        fi ;;
    -i|--pid)
        [ -n "$1" ] || die "用法: opsq -i <PID>[,<PID>...]"
        for _pt in $(printf '%s' "$1" | tr ',' ' '); do
            [ -n "$_pt" ] || continue
            [ -r "/proc/$_pt/stat" ] || die "进程不存在: $_pt"
            if [ "$JSON" = 1 ]; then
                json_head pid "$_pt"
                printf '"count":1,"items":'
                json_proc_arr "$_pt"
                printf '}\n'
            else
                print_detail "$_pt"
            fi
        done ;;
    -c|--cmd)
        [ -n "$1" ] || die "用法: opsq -c <进程名|关键字>"
        if [ "$JSON" = 1 ]; then
            _p=$(pids_by_cmd "$1")
            json_head cmd "$1"
            printf '"count":%s,"items":' "$(printf '%s' "$_p" | wc -w)"
            json_proc_arr "$_p"
            printf '}\n'
        else
            run_cmd "$1"
        fi ;;
    -s|--service|--svc)
        [ -n "$1" ] || die "用法: opsq -s <服务名>"
        run_service "$1" ;;
    -t|--timer|--timers)
        run_timer "${1:-}" ;;
    -r|--reverse|--remote)
        [ -n "$1" ] || die "用法: opsq -r <IP|域名>"
        run_reverse "$1" ;;
    -f|--file)
        [ -n "$1" ] || die "用法: opsq -f <文件路径>"
        [ -e "$1" ] || die "路径不存在: $1"
        p=$(pids_by_file "$1")
        [ -n "$(printf '%s' "$p" | tr -d ' ')" ] || die "没有进程打开 $1"
        if [ "$JSON" = 1 ]; then
            json_head file "$1"
            printf '"count":%s,"items":' "$(printf '%s' "$p" | wc -w)"
            json_proc_arr "$p"
            printf '}\n'
        else
            sec "打开 $1 的进程"
            print_proc_table "$p"
        fi ;;
    -b|--bw)
        run_bw "$@" ;;
    -io|--io)
        run_io "$@" ;;
    --audit)
        run_audit ;;
    --update|update)
        run_update ;;
    -n|--note|note)
        run_note "$@" ;;
    -g|--log|--grep)
        run_log "$@" ;;
    --snapshot|snapshot|snap)
        run_snapshot "$@" ;;
    --selfcheck|selfcheck|--check)
        run_selfcheck ;;
    # 兼容旧的长写法
    list|ls)
        if [ "$JSON" = 1 ]; then print_list; else print_list; fi ;;
    port)            [ -n "$1" ] || die "用法: opsq -p <端口>"; print_port "$1" ;;
    pid)             [ -n "$1" ] || die "用法: opsq -i <PID>"; print_detail "$1" ;;
    uid)             [ -n "$1" ] || die "用法: opsq -u <UID>"; run_user "$1" ;;
    user)            [ -n "$1" ] || die "用法: opsq -u <用户名>"; run_user "$1" ;;
    cmd|name)        [ -n "$1" ] || die "用法: opsq -c <关键字>"; run_cmd "$1" ;;
    service|svc)     [ -n "$1" ] || die "用法: opsq -s <服务名>"; run_service "$1" ;;
    timer|timers)    run_timer "${1:-}" ;;
    note)            run_note "$@" ;;
    reverse|remote)  [ -n "$1" ] || die "用法: opsq -r <IP|域名>"; run_reverse "$1" ;;
    file)            [ -n "$1" ] || die "用法: opsq -f <路径>"; p=$(pids_by_file "$1"); \
                     [ -n "$(printf '%s' "$p" | tr -d ' ')" ] || die "没有进程打开 $1"; \
                     sec "打开 $1 的进程"; print_proc_table "$p" ;;
    *)
        # 裸数字 = 端口（1-65535）
        case "$opt" in
            ''|*[!0-9]*) die "未知参数: $opt（opsq -h 查看用法）" ;;
            *) if [ "$opt" -ge 1 ] 2>/dev/null && [ "$opt" -le 65535 ]; then
                   print_port "$opt"
               else
                   die "未知参数: $opt（opsq -h 查看用法）"
               fi ;;
        esac ;;
esac
