#!/bin/sh
# restore.sh —— 准备 aria2-next 下载引擎（本地包/在线下载 + sha256 校验 + 落位）
#
# 用法：
#   sh restore.sh                 # 恢复（幂等，已可用则秒返回）
#   sh restore.sh --force         # 强制重新解压
#   sh restore.sh --quiet         # 只输出路径
#   sh restore.sh --link          # 额外软链到 /usr/local/bin/aria2-next（需 root）
#   eval "$(sh restore.sh --export)"   # 输出 export ARIA2_BIN=...
#
# 恢复顺序：本地已有 → 与脚本同目录的离线包 → 从发布地址下载对应架构的压缩包
set -u

VER=3.0.9
BIN_NAME=aria2-next
ARCH=${ARIA2_ARCH:-$(uname -m)}       # 可用 ARIA2_ARCH 覆盖（给 aarch64 机器或交叉准备用）
case "$ARCH" in
  x86_64|amd64) ASSET="aria2-next-$VER-linux-x86_64" ;;
  aarch64|arm64) ASSET="aria2-next-$VER-linux-aarch64" ;;
  *) ASSET="aria2-next-$VER-linux-$ARCH" ;;
esac

SRC_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
XR="$SRC_DIR/$ASSET.xz"                        # 可选：离线包与脚本放同一目录时优先用本地文件
SUMS="$SRC_DIR/SHA256SUMS"
ARIA2_HOME=${ARIA2_HOME:-${HOME:-/tmp}/.local/share/adl/engine}
TARGET="$ARIA2_HOME/$BIN_NAME"
# 发布地址（可用 ADL_BIN_BASE 换成内网镜像）：引擎压缩包 + 同源 sha256 清单
R2_BASE=${ADL_BIN_BASE:-${R2_BASE:-https://f.xbta.cc/dl/aria2-next}}

FORCE=0; QUIET=0; LINK=0; EXPORTMODE=0
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    --quiet) QUIET=1 ;;
    --link) LINK=1 ;;
    --export) EXPORTMODE=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
  esac
done

say() { [ "$QUIET" = 1 ] || echo "$@" >&2; }
fail() { echo "[restore] 失败: $*" >&2; exit 1; }

expected_sum() {
  [ -f "$SUMS" ] || return 1
  awk -v n="$ASSET" '$2==n || $2=="*"n {print $1}' "$SUMS" | head -1
}

sha_of() { sha256sum "$1" 2>/dev/null | awk '{print $1}'; }

# 1) 已在则直接返回
if [ "$FORCE" = 0 ] && [ -x "$TARGET" ]; then
  V=$("$TARGET" --version 2>/dev/null | head -1)
  case "$V" in
    *"$VER"*)
      if [ "$EXPORTMODE" = 1 ]; then
        echo "export ARIA2_BIN=$TARGET"
      elif [ "$QUIET" = 1 ]; then
        echo "$TARGET"
      else
        say "[restore] 已就绪: $TARGET ($V)"
        echo "$TARGET"
      fi
      exit 0 ;;
  esac
  say "[restore] 现有二进制版本不符（$V），重新部署"
fi

mkdir -p "$ARIA2_HOME" || fail "无法创建 $ARIA2_HOME"

REAL_ARCH=$(uname -m)

# 2) 本地 xz 解压（优先 xz 命令，缺省用 python lzma，避免装包）
deploy_from_xz() {
  src=$1
  [ -f "$src" ] || return 1
  tmp="$TARGET.tmp.$$"
  say "[restore] 解压 $src"
  if command -v xz >/dev/null 2>&1; then
    xz -dc "$src" > "$tmp" || { rm -f "$tmp"; return 1; }
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$src" "$tmp" <<'PYEOF' || { rm -f "$tmp"; return 1; }
import lzma, shutil, sys
with lzma.open(sys.argv[1], 'rb') as f, open(sys.argv[2], 'wb') as o:
    shutil.copyfileobj(f, o)
PYEOF
  else
    return 1
  fi
  chmod 755 "$tmp" || { rm -f "$tmp"; return 1; }
  EXP=$(expected_sum)
  if [ -n "$EXP" ] && [ "$(sha_of "$tmp")" != "$EXP" ]; then
    rm -f "$tmp"; fail "解压后 sha256 与 SHA256SUMS 不一致（EXP=$EXP）"
  fi
  mv -f "$tmp" "$TARGET" || fail "落位失败"
  return 0
}

if [ "$ARCH" = "$REAL_ARCH" ] || [ -f "$XR" ]; then
  deploy_from_xz "$XR" || say "[restore] 本地无离线包，改从发布地址下载"
fi

# 3) 从发布地址下载（curl 或 python urllib）；失败不致命，继续走 GitHub 兜底
if [ ! -x "$TARGET" ]; then
  URL="$R2_BASE/$ASSET.xz"
  TMPX="$ARIA2_HOME/.$ASSET.part"
  say "[restore] 从 $URL 拉取二进制"
  GOT=0
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --max-time 300 --retry 3 -A "Mozilla/5.0" -o "$TMPX" "$URL" && GOT=1
  else
    python3 - "$URL" "$TMPX" <<'PYEOF' && GOT=1
import sys, urllib.request
req = urllib.request.Request(sys.argv[1], headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=300) as r, open(sys.argv[2], "wb") as f:
    f.write(r.read())
PYEOF
  fi
  if [ "$GOT" = 1 ] && deploy_from_xz "$TMPX"; then
    rm -f "$TMPX"
  else
    rm -f "$TMPX"
    say "[restore] 发布地址不可用，继续尝试 GitHub 直连/代理"
  fi
fi

# 3.5) GitHub 兜底（本地和发布地址都没有该架构的包时使用）
#      release 资产是未压缩原始二进制，直接按 SHA256SUMS 校验
if [ ! -x "$TARGET" ]; then
  say "[restore] 尝试从 GitHub（经代理）拉取 $ASSET"
  GH=https://github.com/AnInsomniacy/aria2-next/releases/download/v$VER/$ASSET
  TMPB="$ARIA2_HOME/.$ASSET.part"
  for PRE in "https://p.xbta.cc/" "https://gh-proxy.com/" "https://ghfast.top/" ""; do
    command -v curl >/dev/null 2>&1 || break
    say "[restore]   通道: ${PRE:-直连}（首次跨架构恢复约 18MB，代理通道可能需 5–15 分钟，进度条见下）"
    if curl -fL --max-time 1800 --retry 3 --retry-delay 3 --connect-timeout 15 -A "Mozilla/5.0" \
         -C - --progress-bar -o "$TMPB" "$PRE$GH"; then
      if [ -n "$(expected_sum)" ] && [ "$(sha_of "$TMPB")" != "$(expected_sum)" ]; then
        say "[restore]   sha256 不符，换下一通道"
        rm -f "$TMPB"; continue
      fi
      chmod 755 "$TMPB" && mv -f "$TMPB" "$TARGET" && say "[restore]   成功"
      break
    fi
    rm -f "$TMPB"
  done
fi

[ -x "$TARGET" ] || fail "部署后仍找不到可执行文件"

# 4) 自检
V=$("$TARGET" --version 2>&1 | head -1)
case "$V" in
  *"$VER"*) : ;;
  *) fail "自检失败：$V" ;;
esac

if [ "$LINK" = 1 ]; then
  ln -sf "$TARGET" /usr/local/bin/aria2-next 2>/dev/null && say "[restore] 已软链 /usr/local/bin/aria2-next"
fi

if [ "$EXPORTMODE" = 1 ]; then
  echo "export ARIA2_BIN=$TARGET"
elif [ "$QUIET" = 1 ]; then
  echo "$TARGET"
else
  say "[restore] 就绪: $TARGET"
  say "[restore] $V"
  echo "$TARGET"
fi
