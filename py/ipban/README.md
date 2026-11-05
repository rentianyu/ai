# ipban — 按天统计探测行为的自动封禁

不按「实时失败次数」封（那是 fail2ban 的活），而是每天扫一遍前一天的日志，把「整天都在扫你」的 IP 挑出来一次性封掉。

两者定位不同：

| | fail2ban | ipban |
|---|---|---|
| 触发 | 实时，短时间窗口内失败 N 次 | 每天一次，按整天的行为聚合 |
| 对象 | 撞密码 / 撞接口的 | 慢速扫描器、CMS 探测、批量 404 |
| 效果 | 攻击中止即不再计 | 扫过就永久记住，第二天自动封 |

## 它到底做了什么

三层，缺一层就有漏：

```
原始日志 ──► daily_ban.py ──► ① nft 集合 DROP      （管直连流量）
  nginx access.log              ② nginx deny 名单   （管经 CDN 反代的流量）
  auth.log                      ③ txt 清单 + elements.nft（重启后恢复）
```

第 ② 层是关键：站点经 Cloudflare 之类的 CDN 时，**nft 只能看到 CDN 边缘 IP**，按攻击者真实 IP 写的 nft 规则完全无效，只有 nginx 层按 `real_ip` 还原出的地址做 deny 才拦得住。

## 判定口径

同一 IP 当天满足任一条即封（阈值默认 4，可调）：

| 依据 | 说明 |
|---|---|
| 高置信特征路径命中 | `/.env`、`/.git`、`/wp-login`、`/phpinfo`、`*.php`、`*.sql`、`*.bak` … |
| 非噪声 404 | 排除静态资源（图片/字体/css/js）与业务前缀，避免把正常访客算进去 |
| SSH 认证失败 | `Invalid user`、`Failed password`、`Connection closed by authenticating user` |

## 文件

| 文件 | 作用 |
|---|---|
| [daily_ban.py](daily_ban.py) | 主程序：统计 → 判定 → 封禁 → 持久化 |
| [unban.sh](unban.sh) | 解封单个 IP / 网段（同时清 nft、清单、elements.nft） |
| [nftables.conf.example](nftables.conf.example) | **必看**：blackhole 集合与 input 链的写法 |
| [ipban-daily.service](ipban-daily.service) / [.timer](ipban-daily.timer) | 每天 04:10 跑 `--apply` |
| [ipban-restore.service](ipban-restore.service) | 开机后重放 elements.nft |

## 依赖

```bash
python3 --version     # 3.8+
nft --version         # 必需
nginx -v              # 有站点反代时需要
```

无第三方 Python 包。

## 前置条件（不做则封禁无效）

**1. nftables 里要有两个集合，且在 input 链首部引用**

```nft
set blackhole4 { type ipv4_addr; flags interval; }
set blackhole6 { type ipv6_addr; flags interval; }
ip  saddr @blackhole4 drop
ip6 saddr @blackhole6 drop
```

完整可复制片段见 [nftables.conf.example](nftables.conf.example)（含「不要用 `flush ruleset`」的原因说明）。

**2. nginx 要 include 生成的 deny 文件，并配好 real_ip**

```nginx
# 放在 server 块最前面
include /etc/nginx/conf.d/ipban-deny.conf;

# 让 deny 匹配到真实客户端 IP（以 Cloudflare 为例，段列表按其官方页更新）
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
# ……
real_ip_header CF-Connecting-IP;
```

## 安装

```bash
sudo mkdir -p /opt/ipban /var/log/ipban
sudo cp daily_ban.py unban.sh /opt/ipban/
sudo chmod +x /opt/ipban/unban.sh

# 1) 先手动 dry-run 看几天（重要）
sudo python3 /opt/ipban/daily_ban.py --dry-run
sudo python3 /opt/ipban/daily_ban.py --dry-run --date 2026-10-23

# 2) 确认输出干净（没有误伤正常访客）后再挂定时
sudo cp ipban-daily.service ipban-daily.timer ipban-restore.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ipban-daily.timer ipban-restore.service

# 3) 手动跑一次 apply 验证
sudo python3 /opt/ipban/daily_ban.py --apply
```

## 配置

全部走环境变量，都有默认值。建议写进 `/etc/default/ipban` 并由 systemd `EnvironmentFile=` 加载。

| 变量 | 默认 | 说明 |
|---|---|---|
| `IPBAN_ALLOW_IPS` | 空 | **永久豁免 IP，逗号分隔，务必填自己的固定出口** |
| `IPBAN_ALLOW_NETS` | 空 | 额外豁免网段（内网与 Cloudflare 全段已内置） |
| `IPBAN_THRESHOLD` | `4` | 同一 IP 一天命中几次才封 |
| `IPBAN_DIR` | `/opt/ipban` | 状态目录（banned4/6.txt、elements.nft、banlog.tsv） |
| `IPBAN_LOG_DIR` | `/var/log/ipban` | 运行日志目录 |
| `IPBAN_NGINX_DENY` | `/etc/nginx/conf.d/ipban-deny.conf` | 生成的 nginx deny 文件 |
| `IPBAN_NGINX_LOG` | `/var/log/nginx/*access.log` | 访问日志 glob，逗号分隔多个 |
| `IPBAN_AUTH_LOG` | `/var/log/auth.log` | 认证日志（CentOS 用 `/var/log/secure`） |
| `IPBAN_BIZ_PREFIX` | `/api/,/v1/,/healthz,…` | 业务路径前缀，这些路径的 404 不算探测 |

## 用法

```bash
python3 daily_ban.py --dry-run                    # 只看会封谁（默认就是 dry-run）
python3 daily_ban.py --apply                      # 真的封
python3 daily_ban.py --dry-run --date 2026-10-23  # 指定统计日
python3 daily_ban.py --apply --include-today      # 统计到今天
python3 daily_ban.py --apply --threshold 6        # 临时改阈值
```

输出示例：

```
═══ ipban-daily [DRY-RUN] 统计日 2026-10-24 ═══

【待封禁】3 个 IP
IP                                         依据                   UA
----------------------------------------------------------------------------------------------
45.148.10.86                               特征7次、404×5        Mozilla/5.0 (compatible; Nmap)
...

【豁免】12 个（白名单/本人IP/SSH成功登录过）
  203.0.113.9                                404×6                  → 近30天SSH成功登录
```

## 解封

```bash
sudo /opt/ipban/unban.sh 45.148.10.86      # 单个 IP
sudo /opt/ipban/unban.sh 45.148.10.0/24    # 网段
sudo /opt/ipban/unban.sh                   # 不带参数：列出当前全部封禁
```

## 注意

- **封禁是永久的**（写进 txt 清单，重启由 ipban-restore 重放）。先 `--dry-run` 观察几天再开 `--apply`。
- **`IPBAN_ALLOW_IPS` 必须填自己的出口 IP**，否则一旦你的 IP 触发阈值就把自己关在门外（此时用带外/控制台进去，或直接改 banned4.txt）。
- 白名单会自动豁免「近 30 天 SSH 成功登录过」的来源 IP，动态 IP 用户不必每次重填。
- 大流量站点（百万行日志/天）注意内存：本脚本把目标日期的行读进内存再解析。
- 只统计 `IPBAN_NGINX_LOG` 与 `IPBAN_AUTH_LOG` 覆盖到的日志；用了别的前端代理（Caddy、Traefik）需自己扩展解析函数。

## License

MIT，见 [../LICENSE](../LICENSE)。
