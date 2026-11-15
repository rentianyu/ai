#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
weather_push.py — 彩云天气 → 两日天气表格图 → 企业微信群机器人推送

版式：竖版单城表（标题 + 两列日期 + 9 行指标），默认 1080x1500 像素，
适合直接发群，手机上不用点开就能读。

==================================================================
依赖
==================================================================
pip install matplotlib
中文字体（二选一）：
    Debian/Ubuntu:  apt install fonts-noto-cjk     （或 fonts-wqy-zenhei）
    CentOS/RHEL:    yum install google-noto-sans-cjk-ttc-fonts
也可用环境变量 FONT_REG / FONT_BOLD 直接指定 .ttf/.ttc 路径。

==================================================================
预先填写
==================================================================
1) 彩云天气 Token（必需）
   申请：https://dashboard.caiyunapp.com/  → 创建应用 → 拿 Token
   环境变量 CAIYUN_TOKEN

2) 位置（按需覆盖，默认北京）
   CAIYUN_LNG / CAIYUN_LAT   经纬度，默认 116.4074 / 39.9042
   WEATHER_CITY              图上的城市名，默认 北京

3) 企业微信群机器人 Webhook（不填则只出图、不推送）
   WEATHER_WEBHOOK  或  WECOM_WEBHOOK
   获取：群聊 → 右上角 ··· → 群机器人 → 添加 → 复制 Webhook 地址

4) 输出路径（可选）
   WEATHER_OUT   默认 /tmp/weather_card.png

建议写进 crontab / systemd timer，每天早晚各跑一次。

==================================================================
用法
==================================================================
    export CAIYUN_TOKEN=你的token
    export WEATHER_CITY=北京 CAIYUN_LNG=116.4074 CAIYUN_LAT=39.9042
    export WECOM_WEBHOOK='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
    python3 weather_push.py

输出：一行日志（时间 | 城市 日期区间 | 图片字节数 | 推送结果）。
企业微信图片消息体上限 2MB，脚本默认 7.2x10 英寸 @150dpi，
如需更高清可调 render() 里的 figsize / dpi（注意体积）。

数据来源：彩云天气 API v2.6 daily 接口（免费额度足够个人每日数次调用）。
"""
import os, json, time, hashlib, base64, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from matplotlib.font_manager import FontProperties

# ---------- config ----------
TOKEN   = os.environ.get("CAIYUN_TOKEN", "")
LNG, LAT = os.environ.get("CAIYUN_LNG", "116.4074"), os.environ.get("CAIYUN_LAT", "39.9042")
CITY    = os.environ.get("WEATHER_CITY", "北京")
WEBHOOK = os.environ.get("WECOM_WEBHOOK", "")
OUT     = os.environ.get("WEATHER_OUT", "/tmp/weather_card.png")
CN = timezone(timedelta(hours=8))

# ---------- fonts ----------
def pick(cands):
    for p in cands:
        if os.path.exists(p):
            return p
    return None

REG = pick([
    "/usr/local/share/fonts/custom/NotoSansSC-Regular.ttf",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
])
BOLD = pick([
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]) or REG

REG = os.environ.get("FONT_REG") or REG
BOLD = os.environ.get("FONT_BOLD") or BOLD or REG
if not REG:
    raise SystemExit("未找到中文字体：请安装 fonts-noto-cjk（或 fonts-wqy-zenhei），"
                     "或用环境变量 FONT_REG / FONT_BOLD 指定字体文件路径")
reg, bold = FontProperties(fname=REG), FontProperties(fname=BOLD)

# ---------- palette ----------
INK, SUB, LINE, ALT = "#16202B", "#8892A0", "#DCE4EE", "#F2F6FC"
ACC, ORANGE, GOOD, TITLE, LABEL = "#0A6BF0", "#E8590C", "#12B76A", "#1A2430", "#3A5570"

SKY = {
    "CLEAR_DAY": "晴", "CLEAR_NIGHT": "晴", "PARTLY_CLOUDY_DAY": "多云", "PARTLY_CLOUDY_NIGHT": "多云",
    "CLOUDY": "阴", "LIGHT_HAZE": "轻度雾霾", "MODERATE_HAZE": "中度雾霾", "HEAVY_HAZE": "重度雾霾",
    "LIGHT_RAIN": "小雨", "MODERATE_RAIN": "中雨", "HEAVY_RAIN": "大雨", "STORM_RAIN": "暴雨",
    "FOG": "雾", "LIGHT_SNOW": "小雪", "MODERATE_SNOW": "中雪", "HEAVY_SNOW": "大雪",
    "STORM_SNOW": "暴雪", "DUST": "浮尘", "SAND": "沙尘", "WIND": "大风",
}
DIRS = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"]
WEEK = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]


def wind_scale(kmh):
    ms = kmh / 3.6
    for lv, hi in enumerate([0.3, 1.5, 3.3, 5.4, 7.9, 10.7, 13.8, 17.1, 20.7, 24.4, 28.4, 32.6]):
        if ms <= hi:
            return lv
    return 12


def aqi_level(chn):
    if chn <= 50: return "优"
    if chn <= 100: return "良"
    if chn <= 150: return "轻度污染"
    if chn <= 200: return "中度污染"
    if chn <= 300: return "重度污染"
    return "严重污染"


def fetch():
    url = (f"https://api.caiyunapp.com/v2.6/{TOKEN}/{LNG},{LAT}/daily"
           f"?dailysteps=3&alert=true&unit=metric")
    with urllib.request.urlopen(url, timeout=20) as r:
        d = json.load(r)
    if d.get("status") != "ok":
        raise RuntimeError(f"caiyun status={d.get('status')} {d.get('error')}")
    return d["result"]["daily"]


def build(daily):
    dates, rows = [], []
    for i in range(2):
        dt = datetime.fromisoformat(daily["astro"][i]["date"]).astimezone(CN)
        dates.append((f"{dt.month}/{dt.day}", WEEK[dt.weekday()]))
    g = lambda k: daily[k]

    day_sky = [SKY.get(g("skycon_08h_20h")[i]["value"], "—") for i in range(2)]
    night_sky = [SKY.get(g("skycon_20h_32h")[i]["value"], "—") for i in range(2)]
    rows.append(("白天 / 夜间", f"{day_sky[0]} / {night_sky[0]}", f"{day_sky[1]} / {night_sky[1]}", "rain"))

    tmax = [round(g("temperature")[i]["max"]) for i in range(2)]
    tmin = [round(g("temperature")[i]["min"]) for i in range(2)]
    rows.append(("气温", f"{tmax[0]}° / {tmin[0]}°", f"{tmax[1]}° / {tmin[1]}°", "key"))

    p = [g("precipitation")[i]["probability"] for i in range(2)]
    rows.append(("降水概率", f"{p[0]}%", f"{p[1]}%", "rain"))

    pr = [round(g("precipitation")[i]["avg"], 1) for i in range(2)]
    rows.append(("降水量", f"{pr[0]} mm", f"{pr[1]} mm", "n"))

    hu = [round(g("humidity")[i]["avg"] * 100) for i in range(2)]
    rows.append(("相对湿度", f"{hu[0]}%", f"{hu[1]}%", "n"))

    w = []
    for i in range(2):
        avg = g("wind")[i]["avg"]
        d = DIRS[int((avg["direction"] % 360 + 22.5) // 45) % 8]
        w.append(f"{d} {wind_scale(avg['speed'])} 级")
    rows.append(("风向 / 风力", w[0], w[1], "n"))

    uv = [g("life_index")["ultraviolet"][i]["desc"] for i in range(2)]
    rows.append(("紫外线", uv[0], uv[1], "n"))

    aqi = [round(g("air_quality")["aqi"][i]["avg"]["chn"]) for i in range(2)]
    rows.append(("空气质量", f"{aqi_level(aqi[0])} · {aqi[0]}", f"{aqi_level(aqi[1])} · {aqi[1]}", "good"))

    sr = [f"{g('astro')[i]['sunrise']['time']} / {g('astro')[i]['sunset']['time']}" for i in range(2)]
    rows.append(("日出 / 日落", sr[0], sr[1], "n"))
    return dates, rows


def render(dates, rows):
    fig = plt.figure(figsize=(7.2, 10.0), dpi=150)
    fig.patch.set_facecolor("white")
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

    ax.text(0.5, 0.936, f"{CITY} · 天气预报", fontproperties=bold,
            fontsize=34, color=TITLE, ha="center", va="center")

    x0, x1, x2, x3 = 0.075, 0.30, 0.6275, 0.955
    c1, c2 = 0.4975, 0.7575
    top, bottom = 0.801, 0.040
    rh = (top - bottom) / len(rows)

    ax.text(c1, 0.855, dates[0][0], fontproperties=bold, fontsize=26, color=INK, ha="center", va="center")
    ax.text(c2, 0.855, dates[1][0], fontproperties=bold, fontsize=26, color=INK, ha="center", va="center")
    ax.text(c1, 0.821, dates[0][1], fontproperties=reg, fontsize=13, color=SUB, ha="center", va="center")
    ax.text(c2, 0.821, dates[1][1], fontproperties=reg, fontsize=13, color=SUB, ha="center", va="center")
    ax.plot([x0, x3], [0.803, 0.803], color=TITLE, lw=1.8, solid_capstyle="butt")

    for j, (lab, v1, v2, st) in enumerate(rows):
        yc = top - rh * (j + 0.5)
        yb = top - rh * (j + 1)
        if j % 2 == 1:
            ax.add_patch(Rectangle((x0, yb), x3 - x0, rh, facecolor=ALT, edgecolor="none"))
        ax.text((x0 + x1) / 2, yc, lab, fontproperties=reg, fontsize=19.5, color=LABEL, ha="center", va="center")
        vc = {"rain": ACC, "good": GOOD, "key": ORANGE}.get(st, INK)
        vfp = reg if st == "n" else bold
        for cx, val in ((c1, v1), (c2, v2)):
            ax.text(cx, yc, val, fontproperties=vfp, fontsize=21, color=vc, ha="center", va="center")
        if j < len(rows) - 1:
            ax.plot([x0, x3], [yb, yb], color=LINE, lw=1.0, solid_capstyle="butt")
    ax.plot([x0, x3], [bottom, bottom], color=LINE, lw=1.0, solid_capstyle="butt")

    fig.savefig(OUT, facecolor="white")
    plt.close(fig)


def push_image(path):
    if not WEBHOOK:
        raise RuntimeError("WECOM_WEBHOOK empty")
    with open(path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode()
    md5 = hashlib.md5(data).hexdigest()
    body = json.dumps({"msgtype": "image", "image": {"base64": b64, "md5": md5}}).encode()
    req = urllib.request.Request(WEBHOOK, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.load(r)
    return resp


def main():
    daily = fetch()
    dates, rows = build(daily)
    render(dates, rows)
    size = os.path.getsize(OUT)
    resp = push_image(OUT) if WEBHOOK else "skip (WECOM_WEBHOOK empty)"
    print(time.strftime("%Y-%m-%d %H:%M:%S"), f"| {CITY} {dates[0][0]}-{dates[1][0]} | img={size}B | wecom={resp}")


if __name__ == "__main__":
    main()
