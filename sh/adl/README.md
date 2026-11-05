# adl —— 多源智能下载器

一个命令搞定「GitHub 大文件龟速、镜像路径对不上、下到一半断了、下完发现是坏包」这四类事。

底层是 [aria2-next](https://github.com/AnInsomniacy/aria2-next)（aria2 的高性能分支），外面套一层「先探测、再下载、后校验」的调度：候选线路当场实测，谁快用谁；没有进度的连接被看门狗掐掉换线路续传；下完按大小 / sha256 / 压缩包真实可解做验收。

- 版本：**1.0.0**
- 运行环境：Linux / macOS，`python3`（仅标准库）+ `curl` + `xz` 或 python3-lzma
- 许可：脚本 MIT，下载引擎遵循其上游许可（GPLv2，见文末）

## 特性

| 能力 | 说明 |
|---|---|
| 镜像改写 | 自动为 GitHub / npm / PyPI / Maven / apt / Go / HuggingFace 等资源生成国内镜像候选 |
| 线路探测 | 下载前并发实测 TTFB、速率、是否支持 Range，按实测结果排序，不靠死表 |
| GitHub 代理池 | 内置 17 条公共代理 + 自建通道，两级探测（16KB 判存活 → 128KB 精测），结果缓存 1 小时 |
| 多源并行 | `--multi-source` 让同组多条线路一起下一份文件，绕开单代理限速 |
| 无进度看门狗 | 连接假死（TCP 通但不给数据）超过阈值即杀掉换线路，保留断点 |
| 断点续传 | 引擎用 state-db 记真实进度，换线路/中断重跑都从断点继续 |
| 错误页识别 | 期望二进制却拿到小体积 `text/html` 直接判失败，不会把 403 页面存成 `.apk` |
| 完成强校验 | 大小比对 / `--sha256` / 自动找同名 `.sha256` / 压缩包真实解包（`--verify-archive`） |
| 空间预检 | 按 `Content-Length` 比对磁盘余量，避免下到一半撑爆 |
| 批量与并发 | `-i urls.txt -j 4`，失败项单独汇总到 `.failed.txt` |
| 其它协议 | BT/磁力、HLS(m3u8)、DASH(mpd)、Metalink 由引擎原生支持 |

## 安装

```sh
curl -fsSL https://f.xbta.cc/ai/sh/adl/install.sh | sh
```

脚本会：下载程序到 `/usr/local/lib/adl`（普通用户为 `~/.local/share/adl`）→ 在 `/usr/local/bin`（或 `~/.local/bin`）放一个 `adl` 启动器 → 拉取下载引擎（约 6MB，sha256 校验）。

自定义位置：

```sh
sh install.sh --prefix /opt/adl --bin /usr/local/bin
ADL_BASE_URL=<你的镜像> sh install.sh      # 换下载源
```

不想装到系统里？直接下三个文件丢进任意目录也能跑：

```sh
mkdir -p ~/adl && cd ~/adl
for f in adl.py mirror.py restore.sh SHA256SUMS; do
  curl -fsSLO "https://f.xbta.cc/ai/sh/adl/$f"
done
ARIA2_HOME=~/adl/engine sh restore.sh      # 准备引擎
python3 adl.py --help
```

要求：`python3`（3.8+，只用标准库）、`curl`、`xz`（缺失时自动用 python 的 `lzma`）。

内网 / 离线部署：把 `aria2-next-3.0.9-<平台>.xz` 与上面几个文件放同一目录，`restore.sh` 会优先用本地包解压；或设 `ADL_BIN_BASE=<你自己的分发地址>` 换成内网镜像。引擎按 `uname -m` 选平台，`ARIA2_ARCH` 可强制指定。
另一台机器要装同一套：`sh <repo>/install.sh` 即可，脚本幂等，引擎版本一致时秒返回。

## 用法

```sh
adl <URL> -o ~/dl                                  # 单文件（自动选最快线路）
adl <github-release-url> --multi-source            # GitHub 大文件，多源并行
adl -i urls.txt -o ~/dl -j 4                       # 批量，4 并发
adl <URL> --sha256 9862deb7...534c                 # 带哈希强校验
adl <URL> --verify-archive                         # 压缩包必须真实可解
adl <URL> --dry-run                                # 只看线路探测结果，不下载
adl magnet:?xt=urn:btih:...                        # BT / 磁力
adl https://x/a.m3u8                               # HLS
adl --version && adl --help
```

URL 清单格式（`#` 开头为注释，第二个字段可指定保存名）：

```
https://example.com/a.tar.gz
https://example.com/b.zip  b-custom-name.zip
```

## 关键参数

| 参数 | 作用 | 默认 |
|---|---|---|
| `-o DIR` | 输出目录 | 当前目录 |
| `-n NAME` | 保存文件名（单任务） | 从 URL 推断 |
| `-j N` | 并发任务数 | 3 |
| `-x N` / `-s N` | 单服务器连接数 / 分片数 | 16 / 16 |
| `--multi-source` | 多源并行（GitHub 代理池） | 关 |
| `--route-tries N` | 最多尝试几条线路 | 3 |
| `--stall-timeout S` | 无进度判死秒数，0 关闭 | 90 |
| `--total-timeout S` | 单任务总时长上限 | 不限 |
| `--max-rate 2M` | 限速 | 不限 |
| `--sha256 HEX` | 强校验哈希 | — |
| `--verify-archive` | 真实解包校验 zip/tar/xz/gz | 关 |
| `--proxy-prefix URL` | 只用指定代理（可多次） | 用代理池 |
| `--no-proxy` | 完全不用代理 | — |
| `--header 'K: V'` | 附加请求头（防盗链） | — |
| `--dry-run` / `--json` | 只探测 / 机器可读输出 | — |
| `--restart` | 清状态重下（默认续传） | — |

辅助工具 `mirror.py`（排查线路用）：

```sh
python3 mirror.py resolve <url> --probe      # 看这个 URL 有哪些候选线路、各自多快
python3 mirror.py probe <url> <url>...       # 直接探测任意 URL
python3 mirror.py rules                      # 打印镜像改写规则表
```

## 工作流程

```
URL ──► 分类(classify) ──► 生成候选(镜像/代理/直连) ──► 并发探测(TTFB/速率/Range/错误页)
                                                              │
                                              排序取前 N 条 ──► 引擎下载(带看门狗)
                                                              │
                                              无进度换线路续传 ──► 完成校验(大小/sha256/解包)
```

镜像改写表只负责「提出候选」，是否可用一律以当场探测为准 —— 镜像同步延迟、路径差异、限流策略随时变，查表直接改写必然踩空。

## 实测参考

| 场景 | 结果 |
|---|---|
| GitHub release 19.2MB（多源并行，容器出口） | 77s，哈希与官方一致 |
| GitHub release 130MB（多源，国内云主机出口） | 244s，均速 548KB/s，自动选中最快的公共代理 |
| Node.js 29.3MB（腾讯镜像，国内云主机出口） | 8s，≈3.7MB/s |
| npm 包（腾讯镜像） | 0.96MB/s（对比某镜像 2.6KB/s、直连 11.5KB/s） |
| 限速 400K 并在 5s 中断 | 中断文件 sha256 错误 → 续传后正确 |
| 404 资源 | 探测阶段即失败，逐条列出线路原因 |
| 看门狗 | 无进度 6s 精确判定停滞并终止 |

> 结论有普适性的一条：**同一个代理在不同网络出口快慢可能差 10 倍**。国内家宽/国内云主机上 `ghfast.top`、`gh-proxy.com` 往往最快，而境外出口上它们可能根本连不上 —— 所以别硬编码某条线路，让探测决定。

## 已知坑（都踩过）

1. **aria2-next v3 对未知参数静默忽略**（不报错，rc=0）。参数名要逐个用 `--help=#all` 核对，`--disk-cache` 这类 v2 参数在 v3 已不存在。
2. **文件大小不能当进度**：默认预分配，中断时文件一开始就已是完整大小。判断完成只认本次日志里的 `Download complete:`。
3. **续传依赖 `--state-dir`**（v3 用 state-db，不是 `.aria2` 控制文件），换输出目录会丢断点。本工具默认把 state 放在输出目录下的 `.aria2dl-state/`。
4. **不要同时用 `--log` 和 stdout 重定向**写同一个文件，两个 writer 会让进度/完成标记读取错位。
5. **无 IPv6 出口的机器**（多数容器/VPS）要给引擎加 `--disable-ipv6`，否则每条连接都先试 v6 白等约 3s（本工具自动判断）。

## 依赖与许可

- 本仓库脚本：MIT，作者 **小贝塔**。
- 下载引擎 **aria2-next 3.0.9**：上游 <https://github.com/AnInsomniacy/aria2-next>，遵循 aria2 的 **GPLv2** 许可。本工具只负责按架构下载并校验其官方发行二进制，不修改其代码；源码与许可证见上游仓库。
- 引擎压缩包与 sha256 清单由本项目发布通道分发，`restore.sh` 每次落盘前都会校验哈希。
