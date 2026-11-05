#!/bin/sh
# selftest.sh —— 本 skill 的回归自检（改完脚本跑一次，别靠记忆判断有没有坏）
# 用法: sh selftest.sh [--offline]
set -u
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SRC_DIR=$HERE
OFFLINE=0
[ "${1:-}" = "--offline" ] && OFFLINE=1
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; }
T=/tmp/aria2dl-selftest
rm -rf "$T"; mkdir -p "$T"

echo "== 1. 恢复引擎 =="
BIN=$(sh "$HERE/restore.sh" --quiet 2>/dev/null | tail -1)
if [ -x "$BIN" ] && "$BIN" --version 2>/dev/null | head -1 | grep -q 3.0.9; then
  ok "二进制可执行且版本正确 ($BIN)"
else
  bad "二进制不可用: $BIN"; echo "自检中止"; exit 1
fi

echo "== 2. 与 v3 参数不一致的参数会被静默忽略（防回归检查） =="
if "$BIN" --help=#all 2>/dev/null | grep -q -- '--state-dir'; then
  ok "v3 参数表含 --state-dir（续传依赖它）"
else
  bad "v3 参数表变化，需重新核对参数名"
fi

echo "== 2.5 GitHub 代理池 =="
CNT=$(python3 -c "import sys; sys.path.insert(0,'$HERE'); import mirror; print(len(mirror.GH_PROXIES))" 2>/dev/null)
if [ "${CNT:-0}" -ge 16 ]; then
  ok "代理池 $CNT 条（含自建）"
else
  bad "代理池仅 ${CNT:-0} 条，应 >=16"
fi

echo "== 3. 镜像候选与探测 =="
if [ "$OFFLINE" = 1 ]; then
  echo "  (offline 跳过)"
else
  N=$(python3 "$HERE/mirror.py" resolve "https://registry.npmjs.org/express/-/express-4.18.2.tgz" 2>/dev/null | head -1)
  case "$N" in
    类型:\ npm*) ok "npm URL 正确归类并生成候选" ;;
    *) bad "归类异常: $N" ;;
  esac
fi

echo "== 4. 小文件下载 + 自动校验 =="
if [ "$OFFLINE" = 1 ]; then
  echo "  (offline 跳过)"
else
  OUT=$(python3 "$HERE/adl.py" "https://nodejs.org/dist/v22.11.0/SHASUMS256.txt" -o "$T" --quiet 2>&1)
  if [ -f "$T/SHASUMS256.txt" ] && [ "$(wc -c < "$T/SHASUMS256.txt")" -gt 1000 ]; then
    ok "小文件下载成功 ($(wc -c < "$T/SHASUMS256.txt") B)"
  else
    bad "小文件下载失败: $OUT"
  fi

  echo "== 5. 404 快速失败 =="
  OUT=$(python3 "$HERE/adl.py" "https://github.com/AnInsomniacy/aria2-next/releases/download/v0.0.0-nope/x.bin" -o "$T" 2>&1)
  if echo "$OUT" | grep -q "所有线路不可用"; then
    ok "404 被识别为线路不可用"
  else
    bad "404 未正确识别: $(echo "$OUT" | tail -2)"
  fi
fi

echo "== 6. 看门狗（无进度 5s 内中止） =="
python3 - "$HERE" "$T" <<'PYEOF'
import sys, time, os
sys.path.insert(0, sys.argv[1])
import adl
os.makedirs(sys.argv[2], exist_ok=True)
t0 = time.time()
r = adl.run_aria2('sleep', ['30'], sys.argv[2] + '/wd.log', sys.argv[2] + '/wd.bin',
                 stall_timeout=5, quiet=True)
cost = time.time() - t0
sys.exit(0 if (r['stalled'] and cost < 12) else 1)
PYEOF
[ $? -eq 0 ] && ok "看门狗在阈值内判定停滞" || bad "看门狗未生效"

echo "== 7. 下载器自检（--dry-run 不落盘） =="
if [ "$OFFLINE" = 1 ]; then
  echo "  (offline 跳过)"
else
  OUT=$(python3 "$HERE/adl.py" "https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz" -o "$T" --dry-run 2>&1)
  echo "$OUT" | grep -q "OK" && ok "dry-run 输出正常" || bad "dry-run 异常"
fi

printf '\n合计: \033[32m%d 通过\033[0m, \033[31m%d 失败\033[0m\n' "$PASS" "$FAIL"
rm -rf "$T"
[ "$FAIL" -eq 0 ]
