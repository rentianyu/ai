#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
weather_dual.py — 彩云天气 · 双城对比 → 两张版式图 → 企业微信群机器人推送

版式 A（对比表）：一个表格里横向并列两个城市，每城两列（今天 / 明天）
版式 B（上下拼接）：两张常规单城图上下叠成一张

适合异地家庭 / 出差场景：一张图同时看两地天气。

==================================================================
依赖
==================================================================
pip install matplotlib pillow
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

2) 城市 A（默认北京）
   WEATHER_CITY    城市名，默认 北京
   CAIYUN_LNG / CAIYUN_LAT   经纬度，默认 116.4074 / 39.9042

3) 城市 B（默认上海）
   WEATHER_CITY2   城市名，默认 上海
   CAIYUN2_LNG / CAIYUN2_LAT 经纬度，默认 121.4737 / 31.2304

4) 企业微信群机器人 Webhook（不填则只出图）
   WEATHER_WEBHOOK  或  WECOM_WEBHOOK
   获取：群聊 → 右上角 ··· → 群机器人 → 添加 → 复制 Webhook 地址

5) 其他（可选）
   PUSH=0              只出图不推送
   OUT_A / OUT_B       两张图的输出路径（默认 /tmp/weather_compare.png、/tmp/weather_stacked.png）
   WEATHER_LOCAL_DIR   离线调试：该目录下有 city1.json / city2.json 时优先读本地
                       彩云 daily 响应（结构：{"status":"ok","result":{"daily":{...}}}）

==================================================================
用法
==================================================================
    export CAIYUN_TOKEN=你的token
    export WECOM_WEBHOOK='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
    # 默认北京 vs 上海
    python3 weather_dual.py
    # 自定义两城
    WEATHER_CITY=北京 CAIYUN_LNG=116.4074 CAIYUN_LAT=39.9042 \
    WEATHER_CITY2=上海 CAIYUN2_LNG=121.4737 CAIYUN2_LAT=31.2304 \
    python3 weather_dual.py

输出：两张图 + 一行日志。企业微信图片消息体上限 2MB。

数据来源：彩云天气 API v2.6 daily 接口。
"""
import os, json, time, hashlib, base64, urllib.request
from datetime import datetime, timezone, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from matplotlib.font_manager import FontProperties
from PIL import Image

# ---------- config ----------
TOKEN    = os.environ.get("CAIYUN_TOKEN", "")
WEBHOOK  = os.environ.get("WECOM_WEBHOOK", "")
PUSH     = os.environ.get("PUSH", "1") not in ("", "0", "false", "False")
LOCALDIR = os.environ.get("WEATHER_LOCAL_DIR", "")
CN = timezone(timedelta(hours=8))

CITY1 = os.environ.get("WEATHER_CITY", "北京")
LNG1  = os.environ.get("CAIYUN_LNG", "116.4074")
LAT1  = os.environ.get("CAIYUN_LAT", "39.9042")

CITY2 = os.environ.get("WEATHER_CITY2", "上海")
LNG2  = os.environ.get("CAIYUN2_LNG", "121.4737")
LAT2  = os.environ.get("CAIYUN2_LAT", "31.2304")

OUT_A = os.environ.get("OUT_A", "/tmp/weather_compare.png")
OUT_B = os.environ.get("OUT_B", "/tmp/weather_stacked.png")
TMP1  = "/tmp/_wc_single1.png"
TMP2  = "/tmp/_wc_single2.png"

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
CITY1_C, CITY2_C = "#0A6BF0", "#E8590C"      # 城市 A 蓝 / 城市 B 橙
CITY1_BG, CITY2_BG = "#EAF2FE", "#FDF1E8"    # 分组底色

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


def fetch(lng, lat):
    url = (f"https://api.caiyunapp.com/v2.6/{TOKEN}/{lng},{lat}/daily"
           f"?dailysteps=3&alert=true&unit=metric")
    with urllib.request.urlopen(url, timeout=20) as r:
        d = json.load(r)
    if d.get("status") != "ok":
        raise RuntimeError(f"caiyun status={d.get('status')} {d.get('error')}")
    return d["result"]["daily"]


def load_daily(fname, lng, lat):
    """优先读本地 JSON（离线调试用），否则联网取数"""
    p = os.path.join(LOCALDIR, fname) if LOCALDIR else ""
    if p and os.path.exists(p):
        with open(p) as f:
            d = json.load(f)
    else:
        d = {"status": "ok", "result": {"daily": fetch(lng, lat)}}
    if d.get("status") != "ok":
        raise RuntimeError(f"{fname} caiyun status={d.get('status')}")
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


def optimize(path):
    """8-bit 调色板压缩（视觉无损）"""
    im = Image.open(path).convert("RGB")
    im = im.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
    im.save(path, optimize=True)


# =================== 版式 B：常规单城图 ===================
def render_single(dates, rows, city, out):
    fig = plt.figure(figsize=(7.2, 10.0), dpi=150)
    fig.patch.set_facecolor("white")
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

    ax.text(0.5, 0.936, f"{city} · 天气预报", fontproperties=bold,
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

    fig.savefig(out, facecolor="white")
    plt.close(fig)
    optimize(out)


# =================== 版式 A：单表对比 ===================
def render_compare(dates1, rows1, dates2, rows2, out):
    # 版式基线（已修好标题与分组标签间距那版）+ 3K 分辨率
    fig = plt.figure(figsize=(12.6, 10.0), dpi=305)   # -> 3843 x 3050 (4K)
    fig.patch.set_facecolor("white")
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

    # 头部四层：主标题 / 城市分组 / 日期 / 星期 —— 纵向留足间距
    ax.text(0.5, 0.945, f"天气预报 · {CITY1} / {CITY2}", fontproperties=bold,
            fontsize=32, color=TITLE, ha="center", va="center")

    xl0, xl1 = 0.040, 0.190          # 行标签列
    xr0, xr1 = 0.190, 0.955          # 数据区（4 列）
    cw = (xr1 - xr0) / 4.0
    cols = [xr0 + cw * (i + 0.5) for i in range(4)]
    c_lab = (xl0 + xl1) / 2
    xmid = xr0 + cw * 2              # 两城分界

    top, bottom = 0.789, 0.040
    rh = (top - bottom) / len(rows1)

    # 城市分组块 + 名称
    ax.add_patch(Rectangle((xr0, 0.865), cw * 2, 0.038, facecolor=CITY1_BG, edgecolor="none"))
    ax.add_patch(Rectangle((xmid, 0.865), cw * 2, 0.038, facecolor=CITY2_BG, edgecolor="none"))
    ax.text(xr0 + cw, 0.884, CITY1, fontproperties=bold, fontsize=21, color=CITY1_C, ha="center", va="center")
    ax.text(xr0 + cw * 3, 0.884, CITY2, fontproperties=bold, fontsize=21, color=CITY2_C, ha="center", va="center")

    # 日期 + 星期
    dd = [dates1[0], dates1[1], dates2[0], dates2[1]]
    for i, (dt, wk) in enumerate(dd):
        ax.text(cols[i], 0.840, dt, fontproperties=bold, fontsize=22, color=INK, ha="center", va="center")
        ax.text(cols[i], 0.808, wk, fontproperties=reg, fontsize=12.5, color=SUB, ha="center", va="center")
    ax.plot([xl0, xr1], [0.789, 0.789], color=TITLE, lw=1.8, solid_capstyle="butt")

    for j, (lab, v1a, v1b, st) in enumerate(rows1):
        yc = top - rh * (j + 0.5)
        yb = top - rh * (j + 1)
        if j % 2 == 1:
            ax.add_patch(Rectangle((xl0, yb), xr1 - xl0, rh, facecolor=ALT, edgecolor="none"))
        ax.text(c_lab, yc, lab, fontproperties=reg, fontsize=18.5, color=LABEL, ha="center", va="center")
        vc = {"rain": ACC, "good": GOOD, "key": ORANGE}.get(st, INK)
        vfp = reg if st == "n" else bold
        vals = [v1a, v1b, rows2[j][1], rows2[j][2]]
        for cx, val in zip(cols, vals):
            ax.text(cx, yc, val, fontproperties=vfp, fontsize=21, color=vc, ha="center", va="center")
        if j < len(rows1) - 1:
            ax.plot([xl0, xr1], [yb, yb], color=LINE, lw=1.0, solid_capstyle="butt")
    ax.plot([xl0, xr1], [bottom, bottom], color=LINE, lw=1.0, solid_capstyle="butt")
    # 两城分隔竖线
    ax.plot([xmid, xmid], [bottom, 0.865], color=LINE, lw=1.2, solid_capstyle="butt")

    fig.savefig(out, facecolor="white")
    plt.close(fig)
    optimize(out)


def stack(top_png, bot_png, out):
    a = Image.open(top_png).convert("RGB")
    b = Image.open(bot_png).convert("RGB")
    w = max(a.width, b.width)
    canvas = Image.new("RGB", (w, a.height + b.height), "white")
    canvas.paste(a, (0, 0))
    canvas.paste(b, (0, a.height))
    canvas = canvas.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
    canvas.save(out, optimize=True)


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
        return json.load(r)


def main():
    d1 = load_daily("city1.json", LNG1, LAT1)
    d2 = load_daily("city2.json", LNG2, LAT2)
    dt1, r1 = build(d1)
    dt2, r2 = build(d2)

    render_compare(dt1, r1, dt2, r2, OUT_A)
    render_single(dt1, r1, CITY1, TMP1)
    render_single(dt2, r2, CITY2, TMP2)
    stack(TMP1, TMP2, OUT_B)

    which = os.environ.get("PUSH_WHICH", "A")
    res = {}
    if PUSH:
        if "A" in which:
            res["A"] = push_image(OUT_A)
        if "B" in which:
            res["B"] = push_image(OUT_B)
    print(time.strftime("%Y-%m-%d %H:%M:%S"),
          f"| {CITY1}/{CITY2} {dt1[0][0]}-{dt1[1][0]}",
          f"| A={os.path.getsize(OUT_A)}B B={os.path.getsize(OUT_B)}B",
          f"| push={res if PUSH else 'skip (PUSH off)'}")


if __name__ == "__main__":
    main()
