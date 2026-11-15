#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
daily_ban.py — 每日统计 Web / SSH 探测行为，达阈值就永久封禁

不按「实时失败次数」封（那是 fail2ban 的活），而是每天扫一遍前一天的日志，
把「整天都在扫你」的 IP 挑出来一次性封掉。按特征路径命中，误伤正常访客的概率
远低于按 404 总数硬封。

判定口径（任一条达到阈值即封）：
    高置信特征路径命中  >= THRESHOLD   （/.env、/.git、/wp-login、*.php 等）
    非噪声 404 次数     >= THRESHOLD   （排除静态资源与业务前缀，见 is_noise_404）
    SSH 认证失败次数    >= THRESHOLD   （Invalid user / Failed password / ...）

执行动作（三层，缺一层就有漏）：
    1) nft   —— 加进 blackhole4 / blackhole6 集合，input 链首部 DROP（管直连流量）
    2) nginx —— 生成 deny 名单（管经 CDN 反代的流量：nft 只能看到 CDN 边缘 IP）
    3) 持久化 —— banned4/6.txt + elements.nft，开机由 ipban-restore 重新加载

==================================================================
依赖
==================================================================
Python 3.8+，零第三方依赖。
系统命令：nft（必需）、nginx（有站点反代时需要）、systemctl。

==================================================================
前置条件（先做这两步，否则封禁不生效）
==================================================================
1) nftables 里要有两个具名集合，并在 input 链首部引用：
       set blackhole4 { type ipv4_addr; flags interval; }
       set blackhole6 { type ipv6_addr; flags interval; }
       ip saddr  @blackhole4 drop
       ip6 saddr @blackhole6 drop
   完整片段见本目录 nftables.conf.example。

2) nginx 的 server 块里 include 生成的 deny 文件（放在最前面）：
       include /etc/nginx/conf.d/ipban-deny.conf;
   并配好 real_ip（Cloudflare 等 CDN 段），否则 deny 匹配不到真实客户端 IP。

==================================================================
预先填写 / 可调项（环境变量，均有默认值）
==================================================================
    IPBAN_ALLOW_IPS     永久豁免 IP，逗号分隔，默认空
                        ← 务必填自己的固定出口 IP / 办公出口，否则可能把自己封了
    IPBAN_ALLOW_NETS    额外豁免网段，逗号分隔（内网与 Cloudflare 段已内置）
    IPBAN_THRESHOLD     阈值，默认 4（同一 IP 一天命中几次才封）
    IPBAN_DIR           状态目录，默认 /opt/ipban
    IPBAN_LOG_DIR       日志目录，默认 /var/log/ipban
    IPBAN_NGINX_DENY    生成的 deny 文件，默认 /etc/nginx/conf.d/ipban-deny.conf
    IPBAN_NGINX_LOG     访问日志 glob，逗号分隔，默认 /var/log/nginx/*access.log
    IPBAN_AUTH_LOG      认证日志，逗号分隔，默认 /var/log/auth.log
    IPBAN_BIZ_PREFIX    业务路径前缀（这些路径的 404 不算探测），逗号分隔

==================================================================
用法
==================================================================
    python3 daily_ban.py --dry-run                 # 只统计（默认行为），不落规则
    python3 daily_ban.py --apply                   # 真的封
    python3 daily_ban.py --dry-run --date 2026-10-23    # 指定统计日
    python3 daily_ban.py --apply --include-today   # 统计到今天
    python3 daily_ban.py --apply --threshold 6     # 临时改阈值

建议：先连续几天 --dry-run 看输出是否干净（有没有误伤正常访客），
确认无误再挂 --apply 的 systemd timer。解封用本目录的 unban.sh。

注意：封禁是永久的（写进 txt 清单，重启后由 ipban-restore 重新加载）。
"""
import argparse
import glob
import gzip
import ipaddress
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

CN = timezone(timedelta(hours=8))


def _env(name, default=""):
    return os.environ.get(name, default) or default


def _env_list(name):
    """逗号（或分号）分隔的环境变量 → 列表"""
    raw = os.environ.get(name, "") or ""
    return [x.strip() for x in re.split(r"[,;]", raw) if x.strip()]


BASE = _env("IPBAN_DIR", "/opt/ipban")
BAN4_FILE = f"{BASE}/banned4.txt"
BAN6_FILE = f"{BASE}/banned6.txt"
ELEM_FILE = f"{BASE}/elements.nft"
BANLOG = f"{BASE}/banlog.tsv"
RUNLOG_DIR = _env("IPBAN_LOG_DIR", "/var/log/ipban")
NGINX_DENY = _env("IPBAN_NGINX_DENY", "/etc/nginx/conf.d/ipban-deny.conf")

# 判定阈值：同一 IP 一天命中几次才封（默认 4，可用 IPBAN_THRESHOLD 或 --threshold 改）
THRESHOLD = int(_env("IPBAN_THRESHOLD", "4"))

# ── 白名单（永久豁免）──────────────────────────────────────────────
# 自己填：固定出口 IP / 办公出口 / 监控探针，填错的后果是自己被挡在门外
WL_EXACT = _env_list("IPBAN_ALLOW_IPS")

WL_NETS = [
    # 本机 / 内网 / CGNAT
    "127.0.0.0/8", "::1/128",
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "100.64.0.0/10",
    # Cloudflare 全段：经 CF 回源时 nginx 看到的源地址是这些，绝不能封
    "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "104.16.0.0/13",
    "104.24.0.0/14", "108.162.192.0/18", "131.0.72.0/22", "141.101.64.0/18",
    "162.158.0.0/15", "172.64.0.0/13", "173.245.48.0/20", "188.114.96.0/20",
    "190.93.240.0/20", "197.234.240.0/22", "198.41.128.0/17",
    "2400:cb00::/32", "2405:8100::/32", "2405:b500::/32", "2606:4700::/32",
    "2803:f800::/32", "2a06:98c0::/29", "2c0f:f248::/32",
] + _env_list("IPBAN_ALLOW_NETS")

WL_NETS_PARSED = []
for _n in WL_NETS:
    try:
        WL_NETS_PARSED.append(ipaddress.ip_network(_n, strict=False))
    except ValueError:
        print("[warn] 忽略非法网段: %s" % _n, file=sys.stderr)
WL_EXACT_PARSED = set()
for _x in WL_EXACT:
    try:
        WL_EXACT_PARSED.add(ipaddress.ip_address(_x))
    except ValueError:
        print("[warn] 忽略非法 IP: %s" % _x, file=sys.stderr)

# ── 高置信探测特征（目标站若没有 PHP 运行环境，任何 .php 请求都是探测）─────
FEAT_RE = re.compile(
    r"(/\.env|/\.git|/\.svn|/\.aws|/\.ssh|/\.htaccess|/\.htpasswd|/\.DS_Store"
    r"|/\.bashrc|/\.zshrc|/\.docker|/\.idea|/\.vscode|/config\.json|/credentials"
    r"|/sendgrid\.env|/config\.env|/database\.php|/local\.xml|/settings\.php"
    r"|/config\.php|/env\.php|/wp-login|/wp-admin|wordpress|phpmyadmin|/pma/"
    r"|adminer|xmlrpc\.php|/phpinfo|_profiler|server-status|server-info"
    r"|/actuator|/HNAP|/login\.cgi|/manager/html|/boaform|/solr/|/cgi-bin/"
    r"|proc/self/environ|__vite_rsc|/backup\.|dump\.sql|\.sql$|\.zip$|\.bak$"
    r"|\.old$|\.php)", re.I)

# 静态资源后缀：404 时不计为探测（前端缺图/favicon 属正常访客行为）
STATIC_EXT = frozenset((
    ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".bmp",
    ".css", ".js", ".mjs", ".map", ".woff", ".woff2", ".ttf", ".otf", ".eot",
))
# 站内合法业务前缀：这些路径的 404 属前端 bug/版本不符，不计为探测
# 用 IPBAN_BIZ_PREFIX 覆盖（逗号分隔），例如 "/api/,/v1/,/healthz"
BIZ_PREFIX = tuple(_env_list("IPBAN_BIZ_PREFIX")) or (
    "/api/", "/v1/", "/healthz", "/oauth", "/console", "/static/", "/assets/",
)


def is_noise_404(path):
    """判断某个 404 是否属于「正常访客噪声」而非探测"""
    p = path.split("?")[0].lower()
    if not p or p == "/":
        return False
    for ext in STATIC_EXT:
        if p.endswith(ext):
            return True
    for pre in BIZ_PREFIX:
        if p.startswith(pre.lower()):
            return True
    return False


NGX_LINE = re.compile(
    r'^(?P<ip>[0-9a-fA-F.:]+) \S+ \S+ \[(?P<ts>[^\]]+)\] '
    r'"(?P<method>[A-Z]+) (?P<path>[^ ]*) [^"]*" (?P<status>\d{3}) \S+ '
    r'"(?P<ref>[^"]*)" "(?P<ua>[^"]*)"')
AUTH_TS = re.compile(r"^(\d{4}-\d{2}-\d{2})T")
AUTH_FROM = re.compile(r"from ([0-9a-fA-F.:]+)")
AUTH_ACC = re.compile(r"Accepted (?:publickey|password|keyboard)")


def is_whitelisted(ip_str, ssh_ok_ips):
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True, "非法IP"
    if ip.is_private or ip.is_loopback or ip.is_link_local:
        return True, "私有/环回"
    if ip in WL_EXACT_PARSED:
        return True, "本人固定IP"
    if ip_str in ssh_ok_ips:
        return True, "近30天SSH成功登录"
    for net in WL_NETS_PARSED:
        try:
            if ip in net:
                return True, "预置豁免网段"
        except TypeError:
            continue
    return False, ""


def read_lines(paths, date_str_ngx, date_iso):
    """读取并筛选目标日期的行"""
    out = []
    for p in paths:
        if not os.path.exists(p):
            continue
        opener = gzip.open if p.endswith(".gz") else open
        try:
            with opener(p, "rt", errors="replace") as f:
                for line in f:
                    if date_str_ngx in line or date_iso in line:
                        out.append(line)
        except Exception:
            continue
    return out


def ngx_paths():
    """访问日志：默认 /var/log/nginx/*access.log，含轮转出的 .1 与 .gz"""
    ps = []
    for pat in (_env_list("IPBAN_NGINX_LOG") or ["/var/log/nginx/*access.log"]):
        ps.extend(glob.glob(pat))
        ps.extend(glob.glob(pat + ".1"))
        ps.extend(glob.glob(pat + ".*.gz"))
    return ps


def auth_paths():
    """认证日志：默认 /var/log/auth.log（Debian 系）；CentOS 用 /var/log/secure"""
    ps = []
    for base in (_env_list("IPBAN_AUTH_LOG") or ["/var/log/auth.log"]):
        for p in (base, base + ".1"):
            if os.path.exists(p):
                ps.append(p)
        ps.extend(glob.glob(base + ".*.gz"))
    return ps


def ssh_success_ips(since_days=30):
    """近 N 天成功登录过 SSH 的来源 IP（自动豁免，防本人动态 IP 误封）"""
    since = (datetime.now(CN) - timedelta(days=since_days)).strftime("%Y-%m-%d")
    ips = set()
    for p in auth_paths():
        if not os.path.exists(p):
            continue
        opener = gzip.open if p.endswith(".gz") else open
        try:
            with opener(p, "rt", errors="replace") as f:
                for line in f:
                    m = AUTH_TS.match(line)
                    if not m or m.group(1) < since:
                        continue
                    if AUTH_ACC.search(line):
                        fm = AUTH_FROM.search(line)
                        if fm:
                            ips.add(fm.group(1))
        except Exception:
            continue
    return ips


def collect(day):
    """统计指定日（北京时区）"""
    d = datetime.strptime(day, "%Y-%m-%d")
    ngx_tag = d.strftime("%d/%b/%Y:")       # 23/Oct/2026:
    iso_tag = d.strftime("%Y-%m-%dT")       # 2026-10-23T

    stats = {}   # ip -> dict(feat, n404, ua, samples)

    def rec(ip, key, path=None, ua=None):
        s = stats.setdefault(ip, {"feat": 0, "n404": 0, "ua": "", "samples": []})
        s[key] += 1
        if ua and not s["ua"]:
            s["ua"] = ua
        if path and key == "feat" and len(s["samples"]) < 3:
            s["samples"].append(path)

    # Web 侧
    for line in read_lines(ngx_paths(), ngx_tag, iso_tag):
        m = NGX_LINE.match(line)
        if not m:
            continue
        ip, path, status = m.group("ip"), m.group("path"), int(m.group("status"))
        if FEAT_RE.search(path):
            # 特征路径优先级最高：.php/.env 等即使前缀像业务路径也算探测
            rec(ip, "feat", path=path, ua=m.group("ua"))
        elif status == 404 and not is_noise_404(path):
            # 404 只统计「非静态资源、非站内业务路径」的部分
            rec(ip, "n404", ua=m.group("ua"))

    # SSH 侧
    ssh_stats = {}
    ssh_re = re.compile(r"(Invalid user|Failed password|Connection closed by authenticating user)")
    for line in read_lines(auth_paths(), ngx_tag, iso_tag):
        if not ssh_re.search(line):
            continue
        fm = AUTH_FROM.search(line)
        if not fm:
            continue
        ip = fm.group(1)
        ssh_stats[ip] = ssh_stats.get(ip, 0) + 1

    return stats, ssh_stats


def current_banned():
    b = set()
    for f in (BAN4_FILE, BAN6_FILE):
        if os.path.exists(f):
            with open(f) as fh:
                for line in fh:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        b.add(line)
    return b


def nft_add(ips):
    """用 nft -f - 批处理添加元素（CLI 直接传参的元素分隔符易踩坑）
    只添加尚不存在的元素，重复执行幂等。
    """
    existing4 = set(nft_set_elements("blackhole4"))
    existing6 = set(nft_set_elements("blackhole6"))
    v4 = [i for i in ips if ":" not in i and i not in existing4]
    v6 = [i for i in ips if ":" in i and i not in existing6]
    ok = []
    for setname, group in (("blackhole4", v4), ("blackhole6", v6)):
        if not group:
            continue
        cmd = f"add element inet filter {setname} {{ {', '.join(group)} }}\n"
        r = subprocess.run(["nft", "-f", "-"], input=cmd,
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f"  [nft错误] {setname}: {r.stderr.strip()}")
        else:
            ok.extend(group)
    return ok


def nft_set_elements(setname):
    """读取运行时 set 已有元素（合并进清单，避免 persist 覆盖掉配置写死的条目）"""
    r = subprocess.run(["nft", "list", "set", "inet", "filter", setname],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return []
    m = re.search(r"elements = \{(.*?)\}", r.stdout, re.S)
    if not m:
        return []
    raw = m.group(1).replace("\n", " ").replace("\t", " ")
    out = []
    for x in raw.split(","):
        x = x.strip()
        if not x or x in ("}", "{"):
            continue
        try:
            ipaddress.ip_network(x, strict=False)
            out.append(x)
        except ValueError:
            continue
    return out


def nginx_sync(banned_list):
    """同步 nginx deny 名单。

    为什么必须做：站点若经 CDN / 反代（Cloudflare、Fastly 等），
    nft 层看到的源地址是 CDN 边缘 IP，对攻击者的真实 IP 完全无效。
    只有 nginx 层按 real_ip 还原出的客户端地址做 deny 才拦得住。
    前提是 nginx 已配好 set_real_ip_from + real_ip_header。
    """
    lines = ["# ipban 自动封禁（每日 04:10 由 daily_ban.py 生成，勿手改）"]
    for ip in sorted(banned_list):
        lines.append(f"deny {ip};")
    content = "\n".join(lines) + "\n"

    old = None
    if os.path.exists(NGINX_DENY):
        with open(NGINX_DENY) as f:
            old = f.read()
    if old == content:
        return True

    with open(NGINX_DENY, "w") as f:
        f.write(content)
    chk = subprocess.run(["nginx", "-t"], capture_output=True, text=True)
    if chk.returncode != 0:
        print(f"  [nginx 配置错误，已回滚] {chk.stderr.strip()[:200]}")
        if old is not None:
            with open(NGINX_DENY, "w") as f:
                f.write(old)
        else:
            os.remove(NGINX_DENY)
        return False
    subprocess.run(["systemctl", "reload", "nginx"], capture_output=True)
    return True


def persist(banned_map):
    """把全量封禁写入 banned4/6.txt 与 elements.nft
    合并运行时 set 已有元素，避免覆盖掉 nftables.conf 里写死的条目。
    elements.nft 用 flush+add，保证重复加载幂等。
    """
    os.makedirs(BASE, exist_ok=True)
    all_items = set(banned_map)
    all_items |= set(nft_set_elements("blackhole4"))
    all_items |= set(nft_set_elements("blackhole6"))
    v4 = sorted([i for i in all_items if ":" not in i])
    v6 = sorted([i for i in all_items if ":" in i])
    for path, items in ((BAN4_FILE, v4), (BAN6_FILE, v6)):
        with open(path, "w") as f:
            f.write("# ipban 永久封禁清单（由 daily_ban.py 维护）\n")
            for i in items:
                f.write(i + "\n")
    lines = []
    if v4:
        lines.append("flush set inet filter blackhole4")
        lines.append("add element inet filter blackhole4 { " + ", ".join(v4) + " }")
    if v6:
        lines.append("flush set inet filter blackhole6")
        lines.append("add element inet filter blackhole6 { " + ", ".join(v6) + " }")
    with open(ELEM_FILE, "w") as f:
        f.write("\n".join(lines) + ("\n" if lines else ""))
    # 同步 nginx deny（经 Cloudflare 的攻击只认这一层）
    nginx_sync(all_items)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="执行封禁（默认 dry-run）")
    ap.add_argument("--dry-run", action="store_true", help="只统计不封")
    ap.add_argument("--date", default=None, help="统计日 YYYY-MM-DD，默认昨天")
    ap.add_argument("--include-today", action="store_true", help="统计日改为今天（含至今）")
    ap.add_argument("--threshold", type=int, default=None,
                    help="覆盖阈值（默认取 IPBAN_THRESHOLD，未设则 4）")
    args = ap.parse_args()

    global THRESHOLD
    if args.threshold is not None:
        THRESHOLD = args.threshold

    now = datetime.now(CN)
    day = args.date or (now.strftime("%Y-%m-%d") if args.include_today
                        else (now - timedelta(days=1)).strftime("%Y-%m-%d"))
    mode = "APPLY" if args.apply else "DRY-RUN"

    print(f"═══ ipban-daily [{mode}] 统计日 {day} ═══")
    ssh_ok = ssh_success_ips()
    stats, ssh_stats = collect(day)
    already = current_banned()

    rows, exempt = [], []
    for ip in set(list(stats.keys()) + list(ssh_stats.keys())):
        s = stats.get(ip, {"feat": 0, "n404": 0, "ua": "", "samples": []})
        feat, n404, scnt = s["feat"], s["n404"], ssh_stats.get(ip, 0)
        hit = feat >= THRESHOLD or n404 >= THRESHOLD or scnt >= THRESHOLD
        if not hit:
            continue
        reasons = []
        if feat >= THRESHOLD:
            reasons.append(f"特征{feat}次")
        if n404 >= THRESHOLD:
            reasons.append(f"404×{n404}")
        if scnt >= THRESHOLD:
            reasons.append(f"SSH失败{scnt}次")
        wl, why = is_whitelisted(ip, ssh_ok)
        if wl:
            exempt.append((ip, "、".join(reasons), why))
            continue
        if ip in already:
            continue
        samples = " ".join(s["samples"][:2]) if s["samples"] else ""
        rows.append((ip, "、".join(reasons), s["ua"][:38], samples))

    print(f"\n【待封禁】{len(rows)} 个 IP")
    if rows:
        print(f"{'IP':<42} {'依据':<22} {'UA'}")
        print("-" * 110)
        rows.sort(key=lambda r: r[0])
        for ip, why, ua, samp in rows:
            print(f"{ip:<42} {why:<22} {ua}")
    print(f"\n【豁免】{len(exempt)} 个（白名单/本人IP/SSH成功登录过）")
    for ip, why, w in exempt[:20]:
        print(f"  {ip:<42} {why:<18} → {w}")
    print(f"\n【已在库】{len(already)} 个（跳过）")

    if not args.apply:
        print("\n※ DRY-RUN 未改动任何规则。确认后执行： daily_ban.py --apply")
        return 0

    if not rows:
        print("\n无新增封禁项。")
        return 0

    ips = [r[0] for r in rows]
    ok = nft_add(ips)
    banned_map = dict.fromkeys(already)
    for ip in ok:
        banned_map[ip] = True
    persist(banned_map)

    os.makedirs(RUNLOG_DIR, exist_ok=True)
    ts = now.strftime("%Y-%m-%d %H:%M:%S")
    new_file = not os.path.exists(BANLOG)
    with open(BANLOG, "a") as f:
        if new_file:
            f.write("# 时间\tIP\t依据\tUA\n")
        for ip, why, ua, samp in rows:
            if ip in ok:
                f.write(f"{ts}\t{ip}\t{why}\t{ua}\n")
    print(f"\n✅ 已封禁 {len(ok)} 个 IP（全端口 DROP），累计库内 {len(banned_map)} 条")
    print(f"   清单: {BAN4_FILE} / {BAN6_FILE}")
    print(f"   解封: {BASE}/unban.sh <ip>")
    return 0


if __name__ == "__main__":
    sys.exit(main())
