#!/bin/sh
# install.sh —— adl 一键安装（aria2-next 引擎随装随下，sha256 校验）
#
# 用法：
#   curl -fsSL https://f.xbta.cc/ai/sh/adl/install.sh | sh
#   sh install.sh                       # 本地执行
#   sh install.sh --prefix /opt/adl     # 指定安装目录
#   ADL_HOME=/opt/adl ADL_BIN_DIR=/usr/local/bin sh install.sh
#
# 环境变量：
#   ADL_HOME       安装目录（默认 root: /usr/local/lib/adl，普通用户: ~/.local/share/adl）
#   ADL_BIN_DIR    命令落位目录（默认 root: /usr/local/bin，普通用户: ~/.local/bin）
#   ADL_BASE_URL   文件下载源（默认 https://f.xbta.cc/ai/sh/adl）
set -eu

BASE=${ADL_BASE_URL:-https://f.xbta.cc/ai/sh/adl}
IS_ROOT=0
if [ "$(id -u)" = 0 ]; then IS_ROOT=1; fi

if [ "$IS_ROOT" = 1 ]; then
  PREFIX=${ADL_HOME:-/usr/local/lib/adl}
  BIN=${ADL_BIN_DIR:-/usr/local/bin}
else
  PREFIX=${ADL_HOME:-${HOME:-$PWD}/.local/share/adl}
  BIN=${ADL_BIN_DIR:-${HOME:-$PWD}/.local/bin}
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) PREFIX=${2:?--prefix 需要目录参数}; shift 2 ;;
    --bin) BIN=${2:?--bin 需要目录参数}; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

FILES="adl.py mirror.py restore.sh selftest.sh SHA256SUMS"
echo "[adl] 安装到 $PREFIX（命令 -> $BIN/adl）"
mkdir -p "$PREFIX" "$BIN" || { echo "[adl] 无法创建目录，试试 sudo 或 --prefix 指定可写目录" >&2; exit 1; }

fetch() {  # fetch <url> <dest>
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --max-time 120 --retry 3 --retry-delay 2 -A "Mozilla/5.0" -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -T 120 -O "$2" "$1"
  else
    python3 - "$1" "$2" <<'PYEOF'
import sys, urllib.request
req = urllib.request.Request(sys.argv[1], headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=120) as r, open(sys.argv[2], "wb") as f:
    f.write(r.read())
PYEOF
  fi
}

for f in $FILES; do
  printf '  - %-14s ' "$f"
  if fetch "$BASE/$f" "$PREFIX/.$f.part"; then
    mv -f "$PREFIX/.$f.part" "$PREFIX/$f" && echo "ok"
  else
    echo "失败"; rm -f "$PREFIX/.$f.part"
    echo "[adl] 下载 $BASE/$f 失败，检查网络或换源：ADL_BASE_URL=<镜像> sh install.sh" >&2
    exit 1
  fi
done
chmod 755 "$PREFIX/adl.py" "$PREFIX/restore.sh"

# 启动器（固定路径，避免符号链接解析歧义）
cat > "$PREFIX/adl" <<EOF
#!/bin/sh
# adl 启动器（install.sh 生成）
ARIA2_HOME=\${ARIA2_HOME:-$PREFIX/engine}
export ARIA2_HOME
exec python3 "$PREFIX/adl.py" "\$@"
EOF
chmod 755 "$PREFIX/adl"
ln -sf "$PREFIX/adl" "$BIN/adl"

# 引擎：装到 $PREFIX/engine，已存在则秒返回
echo "[adl] 准备下载引擎（首次约 6MB，从发布地址取，sha256 校验）"
ARIA2_HOME="$PREFIX/engine" sh "$PREFIX/restore.sh" --quiet >/dev/null ||
  { echo "[adl] 引擎准备失败，可重跑：ARIA2_HOME=$PREFIX/engine sh $PREFIX/restore.sh" >&2; exit 1; }

echo "[adl] 完成：$("$BIN/adl" --version 2>/dev/null || echo 'adl 已安装')"
case ":$PATH:" in
  *":$BIN:"*) : ;;
  *) echo "[adl] 提示：$BIN 不在 PATH，请加入 shell 配置，例如 echo 'export PATH=\"$BIN:\$PATH\"' >> ~/.profile" ;;
esac
echo "[adl] 试一下：adl https://github.com/o/r/releases/download/v1/a.tar.gz -o ~/dl --multi-source"
