# weather-card — 彩云天气表格图 + 企业微信推送

把彩云天气的两日预报渲染成**竖版表格图**，直接推到企业微信群机器人。
手机上不用点开、不用点链接，一眼看完 9 项指标。

两个脚本：

| 脚本 | 版式 | 适用 |
|---|---|---|
| `weather_push.py` | 单城竖版表（标题 + 两列日期 + 9 行指标），1080×1500 | 只看一个城市 |
| `weather_dual.py` | A「双城对比表」+ B「两张单城图上下拼成一张」 | 异地两地（家 / 出差）同时看 |

指标：白天/夜间天气、气温、降水概率、降水量、相对湿度、风向风力、紫外线、空气质量、日出日落。

## 依赖

```bash
pip install matplotlib          # 绘图
pip install pillow              # 仅 weather_dual.py 的上下拼接需要

# 中文字体（必需，否则汉字变方块）
apt install fonts-noto-cjk      # Debian / Ubuntu
# 或 apt install fonts-wqy-zenhei
# CentOS/RHEL: yum install google-noto-sans-cjk-ttc-fonts
```

脚本会自动在常见路径里找 Noto / 文泉驿字体；装在别处时用 `FONT_REG` / `FONT_BOLD` 指定文件路径。

## 准备

### 1. 彩云天气 Token（必需）

<https://dashboard.caiyunapp.com/> → 创建应用 → 复制 Token → `CAIYUN_TOKEN`

免费额度对个人每天数次调用绰绰有余。

### 2. 企业微信群机器人（可选，不填则只出图不推送）

群聊 → 右上角 `···` → 群机器人 → 添加 → 复制 Webhook → `WECOM_WEBHOOK`

### 3. 位置

默认北京，改这两个变量即可（城市名只影响标题，坐标决定数据）：

```bash
CAIYUN_LNG=116.4074 CAIYUN_LAT=39.9042 WEATHER_CITY=北京
```

经纬度查询：<https://www.latlong.net/> 或任意地图右键取坐标。

## 用法

### 单城

```bash
export CAIYUN_TOKEN=你的token
export WEATHER_CITY=北京 CAIYUN_LNG=116.4074 CAIYUN_LAT=39.9042
export WECOM_WEBHOOK='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
python3 weather_push.py
```

输出一行日志：`2026-10-25 07:00:03 | 北京 10/25-10/26 | img=130019B | wecom={'errcode': 0, ...}`

### 双城

```bash
export CAIYUN_TOKEN=你的token
export WECOM_WEBHOOK='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'

# 默认北京 vs 上海
python3 weather_dual.py

# 自定义两城
WEATHER_CITY=北京  CAIYUN_LNG=116.4074  CAIYUN_LAT=39.9042 \
WEATHER_CITY2=上海 CAIYUN2_LNG=121.4737 CAIYUN2_LAT=31.2304 \
python3 weather_dual.py
```

### 定时

```cron
# 每天 7:00 单城
0 7 * * *  cd /path/to/weather-card && CAIYUN_TOKEN=xx WECOM_WEBHOOK=xx /usr/bin/python3 weather_push.py >> /var/log/weather.log 2>&1

# 每天 7:10 双城
10 7 * * * cd /path/to/weather-card && CAIYUN_TOKEN=xx WECOM_WEBHOOK=xx /usr/bin/python3 weather_dual.py >> /var/log/weather.log 2>&1
```

systemd timer 同理，`Type=oneshot`。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `CAIYUN_TOKEN` | — | 彩云天气 Token（必需） |
| `CAIYUN_LNG` / `CAIYUN_LAT` | `116.4074` / `39.9042` | 城市 A 坐标（默认北京） |
| `WEATHER_CITY` | `北京` | 城市 A 标题名 |
| `CAIYUN2_LNG` / `CAIYUN2_LAT` | `121.4737` / `31.2304` | 城市 B 坐标（仅 dual，默认上海） |
| `WEATHER_CITY2` | `上海` | 城市 B 标题名（仅 dual） |
| `WECOM_WEBHOOK` / `WEATHER_WEBHOOK` | 空 | 企微机器人地址；为空只出图 |
| `WEATHER_OUT` | `/tmp/weather_card.png` | 单城输出路径 |
| `OUT_A` / `OUT_B` | `/tmp/weather_compare.png`、`/tmp/weather_stacked.png` | dual 两张图路径 |
| `PUSH` | `1` | 设 `0` 只出图不推送 |
| `PUSH_WHICH` | `A` | dual 推哪张：`A` / `B` / `AB` |
| `WEATHER_LOCAL_DIR` | 空 | 离线调试：目录下放 `city1.json` / `city2.json`（彩云 daily 响应原文）即优先读本地 |
| `FONT_REG` / `FONT_BOLD` | 自动探测 | 指定中文字体文件 |

## 注意

- **企微图片消息体上限 2MB**。默认 7.2×10 英寸 @150dpi（≈130KB）足够清晰；调大 dpi 前先算体积。
- 彩云接口一次返回 3 天数据，脚本只画前 2 天。
- 图是白底，深色模式下也清晰；如果你要发朋友圈/打印，直接调 `render()` 里的 `figsize` 与 `dpi`。
- 字体缺失时脚本会直接报错并提示装哪个包，不会静默画成方块。

## 许可

MIT
