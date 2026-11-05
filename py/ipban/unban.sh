#!/bin/bash
# ipban 解封工具
# 用法：unban.sh <ip或网段>    （状态目录默认 /opt/ipban，可用 IPBAN_DIR 改）
set -u
BASE="${IPBAN_DIR:-/opt/ipban}"
IP="${1:-}"
if [ -z "$IP" ]; then
  echo "用法: $0 <ip或网段>"
  echo "示例: $0 34.151.167.113"
  echo
  echo "当前封禁清单："
  grep -v "^#" "$BASE/banned4.txt" 2>/dev/null | sed 's/^/  [v4] /'
  grep -v "^#" "$BASE/banned6.txt" 2>/dev/null | sed 's/^/  [v6] /'
  exit 1
fi

case "$IP" in
  *:*) SET=blackhole6; F="$BASE/banned6.txt" ;;
  *)   SET=blackhole4; F="$BASE/banned4.txt" ;;
esac

if printf 'delete element inet filter %s { %s }\n' "$SET" "$IP" | nft -f - 2>/dev/null; then
  echo "✓ 已从 nft $SET 移除 $IP"
else
  echo "· $IP 不在 nft $SET 中（或格式有误）"
fi

if [ -f "$F" ]; then
  grep -vxF "$IP" "$F" > "$F.tmp" 2>/dev/null && mv "$F.tmp" "$F"
fi

# 重新生成持久化文件
python3 -c "import sys, os; sys.path.insert(0, os.environ.get('IPBAN_DIR','/opt/ipban')); import daily_ban as d; d.persist({})" 2>/dev/null

printf '%s\tUNBAN\t%s\t手动解封\n' "$(TZ=Asia/Shanghai date '+%F %T')" "$IP" >> "$BASE/banlog.tsv"
echo "✓ 清单与 elements.nft 已同步"
echo "当前 $SET 元素数: $(nft list set inet filter "$SET" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+|[0-9a-f]+:' | wc -l)"
