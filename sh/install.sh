#!/bin/sh
# ai/sh 通用脚本安装器
#
#   curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh              # 交互选择
#   curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh -s opsq      # 直接装指定脚本
#   sh install.sh --list                                            # 查看清单
#   sh install.sh opsq /usr/local/bin/opsq                          # 指定安装路径
#
# 作者: 小贝塔
# 许可: MIT
# 仓库: https://github.com/rentianyu/ai

VERSION="1.0.0"
BASE="${SH_BASE_URL:-https://f.xbta.cc/ai/sh}"

# 脚本清单：名称|说明|远端文件名|默认安装路径
# 新增脚本时在下面加一行，并在 sh/README.md 补上清单条目
SCRIPTS='opsq|Linux 统一运维查询入口（端口 / 进程 / 服务 / 定时任务）|opsq.sh|/usr/local/bin/opsq'

die() { printf '错误: %s\n' "$*" >&2; exit 1; }

usage() {
    cat <<EOF
ai/sh 安装器 v$VERSION

用法:
  install.sh [选项] [脚本名] [安装路径]

选项:
  -l, --list       列出可用脚本，不安装
  -h, --help       显示本帮助
  -V, --version    显示版本
  --base <URL>     自定义分发根地址（默认 $BASE）

示例:
  curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh
  curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh -s opsq
  curl -fsSL https://f.xbta.cc/ai/sh/install.sh | sh -s -- --list
  sh install.sh opsq /usr/local/bin/opsq

注意:
  管道调用时，以 - 开头的参数会被 sh 自己吃掉，需写成 sh -s -- --list

环境变量:
  SH_BASE_URL      覆盖分发根地址
  SH_LIST=1        列出清单后退出（管道场景的备选写法）
EOF
}

show_list() {
    printf '可用脚本（%s）：\n\n' "$BASE"
    while IFS='|' read -r _n _d _f _p; do
        [ -n "$_n" ] || continue
        printf '  %-10s %s\n' "$_n" "$_d"
        printf '  %-10s 文件 %s，默认路径 %s\n\n' "" "$_f" "$_p"
    done <<EOF
$SCRIPTS
EOF
}

# 交互选择：菜单走 stderr，stdout 只输出选中的脚本名
choose() {
    printf '可用脚本：\n' >&2
    _i=0
    while IFS='|' read -r _n _d _f _p; do
        [ -n "$_n" ] || continue
        _i=$((_i + 1))
        printf '  %d) %-10s %s\n' "$_i" "$_n" "$_d" >&2
    done <<EOF
$SCRIPTS
EOF
    printf '\n请输入序号或名称（回车默认 1，q 退出）: ' >&2
    if [ -t 0 ]; then
        read -r _a || _a=""
    elif ( : </dev/tty ) 2>/dev/null; then
        read -r _a </dev/tty || { printf '\n' >&2; die "读取输入失败，请直接指定脚本名：sh install.sh <脚本名>"; }
    else
        printf '\n' >&2
        die "当前不是交互终端，请直接指定脚本名：sh install.sh <脚本名>（或 --list 查看清单）"
    fi

    case "$_a" in
        q|Q|quit|exit) return 2 ;;
        "") _a=1 ;;
    esac

    case "$_a" in
        *[!0-9]*)
            _r=$(printf '%s\n' "$SCRIPTS" | awk -F'|' -v n="$_a" '$1 == n { print $1; exit }')
            [ -n "$_r" ] || die "没有名为 $_a 的脚本（--list 查看清单）"
            printf '%s' "$_r"
            ;;
        *)
            _r=$(printf '%s\n' "$SCRIPTS" | awk -F'|' -v i="$_a" 'NR == i { print $1; exit }')
            [ -n "$_r" ] || die "序号超出范围: $_a"
            printf '%s' "$_r"
            ;;
    esac
}

do_install() {
    _name=$1
    _dest_arg=$2

    _line=$(printf '%s\n' "$SCRIPTS" | awk -F'|' -v n="$_name" '$1 == n')
    if [ -n "$_line" ]; then
        _file=$(printf '%s' "$_line" | cut -d'|' -f3)
        _dest=$(printf '%s' "$_line" | cut -d'|' -f4)
    else
        # 未登记的名字：按远端文件名直接尝试
        case "$_name" in
            */* | *.*) _file=$_name ;;
            *)         _file="$_name.sh" ;;
        esac
        _dest="/usr/local/bin/$(basename "$_name" .sh)"
    fi
    [ -n "$_dest_arg" ] && _dest=$_dest_arg

    _url="$BASE/$_file"
    printf '下载 %s\n' "$_url"

    _tmp=$(mktemp) || die "mktemp 失败"
    trap 'rm -f "$_tmp"' EXIT INT TERM
    curl -fsSL --max-time 60 "$_url" -o "$_tmp" 2>/dev/null || die "下载失败: $_url"

    case "$_file" in
        *.sh) sh -n "$_tmp" 2>/dev/null || die "语法校验未通过，已放弃安装" ;;
    esac

    _dir=$(dirname "$_dest")
    [ -d "$_dir" ] || die "目录不存在: $_dir"
    [ -w "$_dir" ] || die "无写权限: $_dir（用 sudo 重跑，或在命令末尾指定可写路径）"

    _new="$_dir/.$(basename "$_dest").new.$$"
    cp "$_tmp" "$_new" || die "写入失败: $_new"
    chmod 755 "$_new"
    mv -f "$_new" "$_dest" || { rm -f "$_new"; die "替换失败"; }

    printf '已安装: %s\n' "$_dest"
    "$_dest" -v 2>/dev/null || true
    printf '更新方式: %s --update（若脚本支持）\n' "$(basename "$_dest")"
}

# 管道场景下不方便传 --list 时的备选：SH_LIST=1
[ "${SH_LIST:-}" = "1" ] && { show_list; exit 0; }

# ---- 参数解析 ----
_script=""
_dest=""
while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help)     usage; exit 0 ;;
        -l|--list)     show_list; exit 0 ;;
        -V|--version)  printf 'install.sh %s\n' "$VERSION"; exit 0 ;;
        --base)        [ -n "$2" ] || die "--base 需要 URL"; BASE=$2; shift 2 ;;
        -*)            die "未知选项: $1（-h 查看帮助）" ;;
        *)
            if [ -z "$_script" ]; then
                _script=$1
            elif [ -z "$_dest" ]; then
                _dest=$1
            else
                die "多余参数: $1"
            fi
            shift ;;
    esac
done

if [ -z "$_script" ]; then
    _script=$(choose)
    _rc=$?
    [ "$_rc" -eq 2 ] && exit 0
    [ "$_rc" -ne 0 ] && exit 1
fi

do_install "$_script" "$_dest"
