# 官方命令库

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04
@doc https://github.com/rentianyu/ShellStore
@desc Android 常用命令、脚本、URL Scheme 与 Intent 的整理。命令环境为设备上的 sh（adb shell / Root / Termux 均可）。带「需 shell」标记的命令需要 adb 或 Shizuku 授权，带「需 root」的需要已 root 的设备。

## 系统信息

### 设备型号
@risk safe
@need none
@tag 设备 型号
@desc 读取只读属性，不需要任何权限。

```sh
getprop ro.product.model
```

### 品牌与制造商
@risk safe
@need none
@tag 设备 品牌

```sh
getprop ro.product.brand && getprop ro.product.manufacturer
```

### 设备代号
@risk safe
@need none
@tag 设备 代号

```sh
getprop ro.product.device
```

### Android 版本
@risk safe
@need none
@tag 版本 系统

```sh
getprop ro.build.version.release
```

### SDK 版本
@risk safe
@need none
@tag 版本 sdk

```sh
getprop ro.build.version.sdk
```

### 安全补丁级别
@risk safe
@need none
@tag 版本 补丁 安全

```sh
getprop ro.build.version.security_patch
```

### 系统指纹
@risk safe
@need none
@tag 版本 指纹
@desc 厂商、机型、版本、编译号合在一起的唯一标识，刷机、报障时常要。

```sh
getprop ro.build.fingerprint
```

### 编译时间
@risk safe
@need none
@tag 版本 编译

```sh
getprop ro.build.date
```

### CPU 架构
@risk safe
@need none
@tag cpu 架构

```sh
getprop ro.product.cpu.abi
```

### 内核信息
@risk safe
@need none
@tag 内核

```sh
uname -a
```

### 开机时长
@risk safe
@need none
@tag 运行 时长
@desc 第一列是秒数，除以 3600 得到小时。

```sh
cat /proc/uptime
```

### 屏幕分辨率
@risk safe
@need shell
@tag 屏幕 分辨率

```sh
wm size
```

### 屏幕密度
@risk safe
@need shell
@tag 屏幕 密度

```sh
wm density
```

### 序列号
@risk safe
@need shell
@tag 设备 序列号
@desc Android 10 起普通应用读不到真实序列号，返回 unknown 属正常。

```sh
getprop ro.serialno
```

### 查看全部属性
@risk safe
@need none
@tag 属性 全部

```sh
getprop | head -n 120
```

### 当前时区
@risk safe
@need shell
@tag 时区 系统
@desc 返回 IANA 时区名，如 Asia/Shanghai；为空表示跟随网络自动获取。

```sh
getprop persist.sys.timezone
```

### 应用编译方式
@risk safe
@need shell
@tag dexopt 编译 aot
@desc 看各 App 的 dex 编译状态（verify/speed/speed-profile），判断是否已被 AOT 优化。

```sh
dumpsys package dexopt | grep -e '^  \[' -e '^      arm'
```

## 文件与存储

### 分区占用
@risk safe
@need none
@tag 存储 分区

```sh
df -h
```

### 指定目录大小
@risk safe
@need shell
@tag 存储 目录 大小
@param dir=目录|/sdcard/Download

```sh
du -sh {dir}
```

### 列出目录
@risk safe
@need shell
@tag 文件 列表
@param dir=目录|/sdcard

```sh
ls -al {dir}
```

### 按名称找文件
@risk safe
@need shell
@tag 文件 查找
@param name=文件名关键词|*.apk
@param dir=搜索起点|/sdcard

```sh
find {dir} -name "{name}" -type f 2>/dev/null | head -n 50
```

### 找大文件
@risk safe
@need root
@tag 文件 大文件 清理
@desc 扫 /data 下大于 100MB 的文件，按体积排序。整盘扫描比较慢。

```sh
find /data -type f -size +100M 2>/dev/null | head -n 30
```

### 看文件开头几行
@risk safe
@need none
@tag 文件 查看
@param file=文件路径|/proc/version

```sh
head -n 20 {file}
```

### 统计行数
@risk safe
@need none
@tag 文件 统计
@param file=文件路径|/proc/cpuinfo

```sh
wc -l {file}
```

### 压缩目录
@risk caution
@need shell
@tag 压缩 tar
@param src=源目录|/sdcard/DCIM
@param dst=输出文件|/sdcard/backup.tar.gz
@desc Android 自带的是 toybox tar，支持 gzip。

```sh
tar -czf {dst} -C {src} .
```

### 解压 tar.gz
@risk caution
@need shell
@tag 解压 tar
@param file=压缩包|/sdcard/backup.tar.gz
@param dir=解压到|/sdcard/restore
@desc 目录要先建好：mkdir -p 目标目录。

```sh
mkdir -p {dir} && tar -xzf {file} -C {dir}
```

### 清理应用缓存目录
@risk caution
@need root
@tag 清理 缓存
@desc 只删 cache 子目录，不动数据目录。删之前建议先强制停止对应应用。

```sh
find /data/data -maxdepth 2 -type d -name cache -exec rm -rf {} + 2>/dev/null
```

### 查看挂载点
@risk safe
@need none
@tag 存储 挂载

```sh
mount | grep -E " /data | /system | /storage "
```

## 网络与连接

### 查看 IP 地址
@risk safe
@need shell
@tag 网络 ip

```sh
ip -4 addr show | grep inet
```

### 查看路由表
@risk safe
@need shell
@tag 网络 路由 网关

```sh
ip route
```

### DNS 服务器
@risk safe
@need none
@tag 网络 dns

```sh
getprop | grep -i "net.dns"
```

### 测连通性
@risk safe
@need shell
@tag 网络 ping
@param host=目标地址|114.114.114.114

```sh
ping -c 4 {host}
```

### 域名解析
@risk safe
@need shell
@tag 网络 dns 解析
@param host=域名|www.baidu.com

```sh
nslookup {host}
```

### ARP 邻居表
@risk safe
@need shell
@tag 网络 arp

```sh
ip neigh
```

### WiFi 连接信息
@risk safe
@need shell
@tag 网络 wifi
@desc 输出里 SSID、频率、信号强度（RSSI）、IP 都在。

```sh
dumpsys wifi | grep -E "SSID|mWifiInfo|Frequency|RSSI" | head -n 10
```

### WiFi 扫描结果
@risk safe
@need shell
@tag 网络 wifi 扫描

```sh
cmd wifi list-scan-results
```

### 流量统计
@risk safe
@need none
@tag 网络 流量

```sh
cat /proc/net/dev
```

### 开关 WiFi
@risk caution
@need root
@tag 网络 wifi 开关
@param state=开关|disable
@desc state 填 enable 或 disable。

```sh
svc wifi {state}
```

### 开关移动数据
@risk caution
@need root
@tag 网络 数据 开关
@param state=开关|disable

```sh
svc data {state}
```

### 飞行模式
@risk caution
@need shell
@tag 网络 飞行模式
@param state=开关|enable
@desc enable 打开飞行模式，disable 关闭。

```sh
cmd connectivity airplane-mode {state}
```

### 开关 NFC
@risk caution
@need shell
@tag 网络 nfc 开关
@param state=开关|enable
@desc state 填 enable 或 disable。

```sh
svc nfc {state}
```

### 开关蓝牙
@risk caution
@need shell
@tag 网络 蓝牙 开关
@param state=开关|enable
@desc state 填 enable 或 disable。Android 13 起蓝牙开关受系统权限限制，部分机型会失败。

```sh
svc bluetooth {state}
```

### USB 连接方式
@risk caution
@need shell
@tag usb mtp ptp rndis
@param mode=方式|mtp
@desc mode 可选 mtp（文件传输）、ptp（相机）、rndis（网络共享）、midi；仅在 USB 已连接时生效。

```sh
svc usb setFunctions {mode}
```

## 应用管理

### 列出第三方应用
@risk safe
@need shell
@tag 应用 列表

```sh
pm list packages -3
```

### 列出系统应用
@risk safe
@need shell
@tag 应用 系统

```sh
pm list packages -s
```

### 搜索包名
@risk safe
@need shell
@tag 应用 搜索
@param kw=关键词|wechat

```sh
pm list packages | grep -i {kw}
```

### 应用详情
@risk safe
@need shell
@tag 应用 详情
@param pkg=包名|com.tencent.mm

```sh
dumpsys package {pkg} | head -n 40
```

### 查看应用版本
@risk safe
@need shell
@tag 应用 版本
@param pkg=包名|com.tencent.mm

```sh
dumpsys package {pkg} | grep -E "versionName|versionCode" | head -n 4
```

### 当前前台界面
@risk safe
@need shell
@tag 应用 前台 activity

```sh
dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity" | head -n 3
```

### 强制停止应用
@risk caution
@need shell
@tag 应用 停止
@param pkg=包名|com.tencent.mm

```sh
am force-stop {pkg}
```

### 启动应用
@risk safe
@need shell
@tag 应用 启动
@param pkg=包名|com.tencent.mm

```sh
monkey -p {pkg} -c android.intent.category.LAUNCHER 1
```

### 清除应用数据
@risk danger
@need shell
@tag 应用 清除 数据
@param pkg=包名|com.example.app
@desc 等价于设置里「清除数据」，聊天记录、登录态全部丢失且不可恢复。

```sh
pm clear {pkg}
```

### 卸载应用
@risk danger
@need shell
@tag 应用 卸载
@param pkg=包名|com.example.app

```sh
pm uninstall {pkg}
```

### 停用系统应用
@risk caution
@need shell
@tag 应用 停用
@param pkg=包名|com.example.bloat
@desc 比卸载安全，随时可 pm enable 恢复。停用错系统组件可能影响开机。

```sh
pm disable-user --user 0 {pkg}
```

### 恢复被停用的应用
@risk safe
@need shell
@tag 应用 启用
@param pkg=包名|com.example.bloat

```sh
pm enable {pkg}
```

### 安装 APK
@risk caution
@need shell
@tag 应用 安装
@param file=APK 路径|/sdcard/Download/app.apk

```sh
pm install -r {file}
```

### 列出设备上所有包名对应启动项
@risk safe
@need shell
@tag 应用 activity 列表

```sh
cmd package resolve-activity --brief com.tencent.mm | tail -n 1
```

### 列出已停用应用
@risk safe
@need shell
@tag 应用 停用

```sh
pm list packages -d
```

### 查应用安装时间
@risk safe
@need shell
@tag 应用 时间
@param pkg=包名|com.tencent.mm
@desc dumpsys 输出很长，这里只保留时间行。

```sh
dumpsys package {pkg} | grep firstInstallTime
```

### 查应用 UID
@risk safe
@need shell
@tag 应用 uid
@param pkg=包名|com.tencent.mm

```sh
dumpsys package {pkg} | grep userId=
```

### 最近任务卡片
@risk safe
@need shell
@tag 应用 最近任务
@desc 列出最近任务栈里的卡片，含任务 id 与包名。

```sh
dumpsys activity recents | grep 'Recent #'
```

### 有窗口的后台应用
@risk safe
@need shell
@tag 应用 窗口 后台
@desc 列出仍持有窗口的 App，可判断谁在后台挂悬浮窗/小窗。

```sh
dumpsys window windows | grep topApp
```

### 前台应用包名
@risk safe
@need shell
@tag 应用 前台 包名
@desc 取当前前台 App 的包名；Android 10+ 建议用 topResumedActivity 那行。

```sh
dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' | head -n 1 | sed -E 's/.* ([a-zA-Z0-9_.]+)\/.*/\1/'
```

### 前台 Activity 全名
@risk safe
@need shell
@tag 应用 前台 activity
@desc 输出形式为 包名/类名，适合配合 am start -n 复现。

```sh
dumpsys window windows | sed -n '/mCurrentFocus/s/.* \([^ ]*\)}.*/\1/p'
```

### 启动应用的后台服务
@risk caution
@need shell
@tag 应用 服务 startservice
@param component=包名/服务类|com.eg.android.AlipayGphone/com.alipay.android.launcher.service.LauncherService
@desc component 填「包名/服务类名」；部分 App 会校验调用方，被拒绝属正常。

```sh
am startservice -n {component}
```

## 权限与安全

### 查看应用的运行时权限
@risk safe
@need shell
@tag 权限 授予
@param pkg=包名|com.tencent.mm

```sh
dumpsys package {pkg} | grep -E "granted=(true|false)" | head -n 30
```

### 授予运行时权限
@risk caution
@need shell
@tag 权限 授予
@param pkg=包名|com.example.app
@param perm=权限|android.permission.CAMERA
@desc 应用需在清单里声明过该权限，否则报错。

```sh
pm grant {pkg} {perm}
```

### 撤销运行时权限
@risk caution
@need shell
@tag 权限 撤销
@param pkg=包名|com.example.app
@param perm=权限|android.permission.CAMERA

```sh
pm revoke {pkg} {perm}
```

### 列出危险权限
@risk safe
@need shell
@tag 权限 危险

```sh
pm list permissions -g -d
```

### 检查 Root
@risk safe
@need none
@tag root 检测

```sh
which su; id
```

### SELinux 状态
@risk safe
@need none
@tag 安全 selinux

```sh
getenforce
```

### 用户证书列表
@risk safe
@need root
@tag 证书 安全

```sh
ls -l /system/etc/security/cacerts | head -n 30
```

### 电池优化白名单
@risk safe
@need shell
@tag 电池 白名单 后台

```sh
dumpsys deviceidle whitelist
```

### 开发者选项是否开启
@risk safe
@need shell
@tag 设置 开发者

```sh
settings get global development_settings_enabled
```

### 查看已注册账户类型
@risk safe
@need shell
@tag 账户 安全

```sh
dumpsys account | grep -E "Account \{|type=" | head -n 20
```

## 性能与内存

### 内存概况
@risk safe
@need none
@tag 内存

```sh
head -n 8 /proc/meminfo
```

### 内存用量汇总
@risk safe
@need none
@tag 内存 使用率
@desc MemAvailable 才是真正可用的量，别只看 MemFree。

```sh
awk '/MemTotal|MemFree|MemAvailable/ {print $1, int($2/1024)" MB"}' /proc/meminfo
```

### CPU 占用排行
@risk safe
@need shell
@tag cpu 占用

```sh
top -n 1 -b -o %CPU | head -n 20
```

### 进程列表
@risk safe
@need shell
@tag 进程

```sh
ps -A -o PID,RSS,NAME | head -n 40
```

### 单个应用内存
@risk safe
@need shell
@tag 内存 应用
@param pkg=包名|com.tencent.mm

```sh
dumpsys meminfo {pkg}
```

### 全局内存分布
@risk safe
@need shell
@tag 内存 汇总

```sh
dumpsys meminfo | head -n 30
```

### 电池状态
@risk safe
@need shell
@tag 电池

```sh
dumpsys battery
```

### 电池耗电统计
@risk safe
@need shell
@tag 电池 耗电
@desc 输出很长，只取前 60 行。

```sh
dumpsys batterystats --charged | head -n 60
```

### CPU 温度
@risk safe
@need none
@tag 温度 cpu
@desc 数值单位是毫摄氏度，除以 1000 才是摄氏度。

```sh
cat /sys/class/thermal/thermal_zone0/temp
```

### 动画缩放
@risk safe
@need shell
@tag 设置 动画

```sh
settings get global window_animation_scale; settings get global transition_animation_scale; settings get global animator_duration_scale
```

### 关闭动画加速
@risk caution
@need shell
@tag 设置 动画 加速
@desc 三个缩放都设为 0，系统过渡会瞬间完成，主观更快。恢复时把 0 改回 1。

```sh
settings put global window_animation_scale 0; settings put global transition_animation_scale 0; settings put global animator_duration_scale 0
```

## 日志与排查

### 最近日志
@risk safe
@need shell
@tag 日志 logcat

```sh
logcat -d -t 200
```

### 按标签过滤
@risk safe
@need shell
@tag 日志 过滤
@param tag=标签|ActivityManager

```sh
logcat -d -s {tag} -t 200
```

### 只看错误日志
@risk safe
@need shell
@tag 日志 错误

```sh
logcat -d "*:E" -t 200
```

### 清空日志缓冲
@risk caution
@need shell
@tag 日志 清空
@desc 清空后旧日志不可恢复，排查问题前先导出。

```sh
logcat -c
```

### 崩溃墓碑
@risk safe
@need root
@tag 崩溃 tombstone

```sh
ls -lt /data/tombstones | head -n 10
```

### ANR 记录
@risk safe
@need root
@tag anr 崩溃

```sh
ls -lt /data/anr | head -n 10
```

### 内核日志尾部
@risk safe
@need root
@tag 内核 dmesg

```sh
dmesg | tail -n 60
```

### 所有 dumpsys 服务
@risk safe
@need shell
@tag dumpsys 服务

```sh
dumpsys -l
```

### 系统崩溃摘要
@risk safe
@need shell
@tag 崩溃 dropbox

```sh
dumpsys dropbox --print | tail -n 120
```

### 实时日志
@risk safe
@need shell
@tag 日志 实时
@desc 会一直输出，需要手动停止（执行框里点关闭不会中断进程，可用 kill 处理）。

```sh
logcat -v time
```

### 按包名抓日志
@risk safe
@need shell
@tag 日志 logcat 过滤
@param pkg=包名|com.tencent.mm
@desc 只保留含该包名关键字的行；Ctrl+C 结束。需要存储写入权限。

```sh
logcat | grep {pkg} > /sdcard/log-{pkg}.txt
```

### 通知栏当前内容
@risk safe
@need shell
@tag 通知 排查 tickerText
@desc 抓当前通知的 tickerText，Android 11+ 多数通知不再写该字段，可能为空。

```sh
dumpsys notification | grep tickerText | grep -v null
```

## 快捷跳转

### 拨号
@type urlscheme
@risk safe
@need none
@tag 电话 拨号

```text
tel:10086
```

### 发送短信
@type urlscheme
@risk safe
@need none
@tag 短信

```text
smsto:10086
```

### 打开网页
@type urlscheme
@risk safe
@need none
@tag 浏览器 网页

```text
https://xbta.cc
```

### 写邮件
@type urlscheme
@risk safe
@need none
@tag 邮件

```text
mailto:hello@example.com
```

### 地图查看坐标
@type urlscheme
@risk safe
@need none
@tag 地图 位置

```text
geo:36.1993,117.0876?q=36.1993,117.0876
```

### 应用市场详情页
@type urlscheme
@risk safe
@need none
@tag 市场 应用
@param pkg=包名|com.tencent.mm

```text
market://details?id={pkg}
```

### 微信扫一扫
@type urlscheme
@risk safe
@need none
@tag 微信 扫码

```text
weixin://scanqrcode
```

### 支付宝扫一扫
@type urlscheme
@risk safe
@need none
@tag 支付宝 扫码

```text
alipays://platformapi/startapp?appId=10000011
```

### 打开淘宝
@type urlscheme
@risk safe
@need none
@tag 淘宝

```text
taobao://
```

### 打开高德地图
@type urlscheme
@risk safe
@need none
@tag 高德 地图

```text
androidamap://viewMap?sourceApplication=ShellStore
```

### 系统分享
@type intent
@risk safe
@need none
@tag 分享
@desc 拉起分享面板，分享一段文本。

@action android.intent.action.SEND
@mime text/plain
@extra android.intent.extra.TEXT:string=来自 Shell 商店的分享

### 打开网页（Intent 版）
@type intent
@risk safe
@need none
@tag 浏览器
@desc 与 urlscheme 等价，但可以额外带包名指定浏览器。

@action android.intent.action.VIEW
@data https://xbta.cc
@category android.intent.category.BROWSABLE

## 系统设置页

### 设置首页
@type activity
@risk safe
@need none
@tag 设置

@action android.settings.SETTINGS

### WiFi 设置
@type activity
@risk safe
@need none
@tag 设置 wifi

@action android.settings.WIFI_SETTINGS

### 蓝牙设置
@type activity
@risk safe
@need none
@tag 设置 蓝牙

@action android.settings.BLUETOOTH_SETTINGS

### 应用列表
@type activity
@risk safe
@need none
@tag 设置 应用

@action android.settings.APPLICATION_SETTINGS

### 应用信息页
@type activity
@risk safe
@need none
@tag 设置 应用 详情
@desc 带 package: 前缀的 data，多数 ROM 都能正确落到该应用的信息页。

@action android.settings.APPLICATION_DETAILS_SETTINGS
@data package:com.tencent.mm

### 通知设置
@type activity
@risk safe
@need none
@tag 设置 通知

@action android.settings.NOTIFICATION_SETTINGS

### 电池设置
@type activity
@risk safe
@need none
@tag 设置 电池

@action android.settings.BATTERY_SAVER_SETTINGS

### 电池优化白名单设置
@type activity
@risk safe
@need none
@tag 设置 电池 后台

@action android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS

### 显示设置
@type activity
@risk safe
@need none
@tag 设置 显示

@action android.settings.DISPLAY_SETTINGS

### 声音设置
@type activity
@risk safe
@need none
@tag 设置 声音

@action android.settings.SOUND_SETTINGS

### 存储设置
@type activity
@risk safe
@need none
@tag 设置 存储

@action android.settings.INTERNAL_STORAGE_SETTINGS

### 位置信息
@type activity
@risk safe
@need none
@tag 设置 位置

@action android.settings.LOCATION_SOURCE_SETTINGS

### 安全设置
@type activity
@risk safe
@need none
@tag 设置 安全

@action android.settings.SECURITY_SETTINGS

### 开发者选项
@type activity
@risk safe
@need none
@tag 设置 开发者

@action android.settings.APPLICATION_DEVELOPMENT_SETTINGS

### 无障碍设置
@type activity
@risk safe
@need none
@tag 设置 无障碍

@action android.settings.ACCESSIBILITY_SETTINGS

### 输入法设置
@type activity
@risk safe
@need none
@tag 设置 输入法

@action android.settings.INPUT_METHOD_SETTINGS

### 默认应用设置
@type activity
@risk safe
@need none
@tag 设置 默认应用

@action android.settings.MANAGE_DEFAULT_APPS_SETTINGS

### 应用使用情况
@type activity
@risk safe
@need none
@tag 设置 使用统计

@action android.settings.USAGE_ACCESS_SETTINGS

### 日期与时间
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.DATE_SETTINGS

### 语言设置
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.LOCALE_SETTINGS

### 输入法子类型
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.INPUT_METHOD_SUBTYPE_SETTINGS

### 主屏幕设置
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.HOME_SETTINGS

### 屏保
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.DREAM_SETTINGS

### 设备信息
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.DEVICE_INFO_SETTINGS

### 全部应用列表
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.MANAGE_ALL_APPLICATIONS_SETTINGS

### 无线和网络
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.WIRELESS_SETTINGS

### WiFi IP 设置
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.WIFI_IP_SETTINGS

### 账户与同步
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.SYNC_SETTINGS

### WebView 实现
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.WEBVIEW_SETTINGS

### 隐私设置
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.PRIVACY_SETTINGS

### 通知使用权
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS

### 勿扰权限
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS

### 勿扰优先级
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.ZEN_MODE_PRIORITY_SETTINGS

### 护眼模式
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.NIGHT_DISPLAY_SETTINGS

### 未知来源安装
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.MANAGE_UNKNOWN_APP_SOURCES

### 悬浮窗权限
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.action.MANAGE_OVERLAY_PERMISSION

### 修改系统设置权限
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.settings.action.MANAGE_WRITE_SETTINGS

### 拨号盘
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.intent.action.CALL_BUTTON

### 音乐播放器
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.intent.action.MUSIC_PLAYER

### 耗电统计
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.intent.action.POWER_USAGE_SUMMARY

### 语音命令
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.intent.action.VOICE_COMMAND

### 录音机
@type activity
@risk safe
@need none
@tag 设置 页面
@desc 打开对应的系统设置页；部分机型/ROM 没有该页面会提示无法打开。

@action android.provider.MediaStore.RECORD_SOUND

### 私人 DNS
@type activity
@risk safe
@need none
@tag 网络 DNS 隐私
@desc 打开「私人 DNS」所在的网络页。

@action com.android.settings/.Settings$NetworkDashboardActivity

### AGPS 参数设置
@type activity
@risk safe
@need none
@tag 定位 agps
@desc 查看/修改 AGPS 配置，部分机型无此页面。

@action com.android.settings/com.android.settings.AgpsSettings

### 无线装置频道模式
@type activity
@risk safe
@need none
@tag 网络 频段
@desc 切换 2G/3G/4G 频段模式，仅部分机型有，误改可能丢信号。

@action com.android.settings/com.android.settings.BandMode

### Android Beam
@type activity
@risk safe
@need none
@tag nfc 分享
@desc Android 10 起系统已移除 NFC Beam，新机型打开会失败。

@action com.android.settings/com.android.settings.Settings$AndroidBeamSettingsActivity

### 内存用量
@type activity
@risk safe
@need none
@tag 内存 设置
@desc 系统内存占用概览页。

@action com.android.settings/com.android.settings.Settings$MemorySettingsActivity

### 应用内存用量排行
@type activity
@risk safe
@need none
@tag 内存 应用 排行
@desc 按内存占用排序的应用列表。

@action com.android.settings/com.android.settings.Settings$AppMemoryUsageActivity

### 通知日志
@type activity
@risk safe
@need none
@tag 通知 日志
@desc 查看历史通知记录，排查「通知不弹/被拦截」时有用。

@action com.android.settings/com.android.settings.Settings$NotificationStationActivity

### 原生通知设置
@type activity
@risk safe
@need none
@tag 通知 权限
@desc 原生 Android 的通知配置页。

@action com.android.settings/com.android.settings.Settings$ConfigureNotificationSettingsActivity

### 多用户
@type activity
@risk safe
@need none
@tag 多用户 账户
@desc 管理第二用户/访客，部分 ROM 已移除。

@action com.android.settings/com.android.settings.Settings$UserSettingsActivity

### 手机信息 RadioInfo
@type activity
@risk safe
@need none
@tag 网络 信号 工程
@desc 工程模式：看信号强度、锁定网络类型，误改会影响通话与数据。

@action com.android.settings/com.android.settings.RadioInfo

### 热点设置
@type activity
@risk safe
@need none
@tag 网络 热点
@desc 热点与网络共享设置页。

@action com.android.settings/.TetherSettings

## 系统设置开关

### 触摸小白点
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=显示点按反馈，0=关闭。录屏演示操作时常用。

```sh
settings put system show_touches {state}
```

### 指针位置
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=屏幕顶部显示触摸坐标，0=关闭。

```sh
settings put system pointer_location {state}
```

### 颜色反转
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=开，0=关。

```sh
settings put secure accessibility_display_inversion_enabled {state}
```

### 全色盲模式
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=开，0=关；具体校正类型在「无障碍 › 颜色校正」里选。

```sh
settings put secure accessibility_display_daltonizer_enabled {state}
```

### 高对比度文字
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=开，0=关。

```sh
settings put secure high_text_contrast_enabled {state}
```

### 强制从右到左布局
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=强制 RTL，0=关闭；调试阿拉伯语等界面用，改完需重启界面。

```sh
settings put global debug.force_rtl {state}
```

### MIUI 优化
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 仅 MIUI/HyperOS：1=开，0=关。关掉会影响部分系统行为。

```sh
settings put secure miui_optimization {state}
```

### 自动旋转屏幕
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=跟随重力自动旋转，0=锁定当前方向。

```sh
settings put system accelerometer_rotation {state}
```

### 屏幕旋转方向
@risk caution
@need shell
@tag 设置 开关
@param angle=方向0-3|1
@desc 0=自然方向，1=90°，2=180°，3=270°。需先把自动旋转关掉才生效。

```sh
settings put system user_rotation {angle}
```

### 自动旋转与方向一起设
@risk caution
@need shell
@tag 设置 开关
@param angle=方向0-3|1
@desc 先锁自动旋转再指定角度，一条命令搞定横竖屏切换。

```sh
settings put system accelerometer_rotation 0; settings put system user_rotation {angle}
```

### 移动数据常开
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=始终开启移动数据，0=关闭。副卡/省电策略下可能被系统覆盖。

```sh
settings put global mobile_data_always_on {state}
```

### 开发者选项开关
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=开启开发者选项，0=关闭。开关本身不等于 USB 调试。

```sh
settings put global development_settings_enabled {state}
```

### USB 调试开关
@risk caution
@need shell
@tag 设置 开关
@param state=开关|1
@desc 1=开，0=关。已连接授权的电脑可继续使用，未授权会被断开。

```sh
settings put global adb_enabled {state}
```

### 深色模式
@risk caution
@need shell
@tag 设置 开关
@param mode=模式|yes
@desc yes=深色，no=浅色，auto=跟随时间/系统。部分 ROM 需要重启界面生效。

```sh
cmd uimode night {mode}
```

### 媒体音量
@risk caution
@need shell
@tag 设置 开关
@param level=音量0-15|8
@desc 取值 0-15，直接写数字。

```sh
settings put system volume_music_speaker {level}
```

### 铃声音量
@risk caution
@need shell
@tag 设置 开关
@param level=音量0-15|8
@desc 取值 0-15。

```sh
settings put system volume_ring_speaker {level}
```

### 闹钟音量
@risk caution
@need shell
@tag 设置 开关
@param level=音量1-15|10
@desc 取值 1-15（0 会被系统抬到 1）。

```sh
settings put system volume_alarm_speaker {level}
```

### 屏幕亮度
@risk caution
@need shell
@tag 设置 开关
@param value=亮度值|200
@desc 取值因 ROM 而异：常见 0-255，小米类机型 7-4095。

```sh
settings put system screen_brightness {value}
```

### 窗口动画缩放
@risk caution
@need shell
@tag 设置 开关
@param scale=倍率|1
@desc 0=关闭动画，1=默认，最大 10。

```sh
settings put global window_animation_scale {scale}
```

### 过渡动画缩放
@risk caution
@need shell
@tag 设置 开关
@param scale=倍率|1
@desc 同窗口动画，0 关闭后切页更干脆。

```sh
settings put global transition_animation_scale {scale}
```

### Animator 时长缩放
@risk caution
@need shell
@tag 设置 开关
@param scale=倍率|1
@desc 同窗口动画，影响属性动画时长。

```sh
settings put global animator_duration_scale {scale}
```

### 无障碍服务开关
@risk caution
@need shell
@tag 无障碍 服务 开关
@param services=服务列表|com.fooview.android.fooview/com.fooview.android.fooview.service.FooAccessibilityService
@desc 多个服务用冒号分隔（包名/类名）；清空会关掉所有无障碍服务，已授权的 App 会失效。

```sh
settings put secure enabled_accessibility_services {services}
```

## 广播与系统操作

### 媒体库扫描单个文件
@type broadcast
@risk safe
@need shell
@tag 广播 媒体 扫描
@desc 发广播让媒体库重新索引指定文件，新下载的图片在相册里不显示时用。

@action android.intent.action.MEDIA_SCANNER_SCAN_FILE
@data file:///sdcard/DCIM/Camera/1.jpg

### 通知耳机按键事件
@type broadcast
@risk caution
@need shell
@tag 广播 媒体
@desc 模拟一次媒体按键，部分播放器会响应。keycode 85 是播放/暂停。

@action android.intent.action.MEDIA_BUTTON
@extra android.intent.extra.KEY_EVENT:int=85

### 触发媒体重扫全盘
@risk caution
@need shell
@tag 媒体 扫描 重扫
@desc 通知系统挂载状态变化，媒体库会重扫存储。耗时较长。

```sh
am broadcast -a android.intent.action.MEDIA_MOUNTED -d file:///sdcard
```

### 结束所有后台进程
@risk caution
@need shell
@tag 后台 清理 进程

```sh
am kill-all
```

### 结束指定应用后台
@risk caution
@need shell
@tag 后台 应用
@param pkg=包名|com.example.app

```sh
am kill {pkg}
```

### 重启应用
@risk caution
@need shell
@tag 应用 重启
@param pkg=包名|com.tencent.mm

```sh
am force-stop {pkg}; monkey -p {pkg} -c android.intent.category.LAUNCHER 1
```

### 重启 SystemUI
@risk caution
@need root
@tag 重启 界面
@desc 状态栏、通知栏卡死时用。不重启手机，界面会闪一下恢复。

```sh
pkill -f com.android.systemui
```

### 重启手机
@risk danger
@need root
@tag 重启 设备

```sh
reboot
```

### 关机
@risk danger
@need root
@tag 关机 设备

```sh
reboot -p
```

### 进入 Recovery
@risk danger
@need root
@tag 重启 recovery

```sh
reboot recovery
```

### 屏幕录制
@risk caution
@need shell
@tag 录屏 screenrecord
@param file=输出文件|/sdcard/record.mp4
@desc 默认 180 秒上限，Ctrl+C 或超时结束。Android 14 起部分机型需要显式授权。

```sh
screenrecord --time-limit 30 {file}
```

### 截图
@risk safe
@need shell
@tag 截图
@param file=输出文件|/sdcard/shot.png

```sh
screencap -p {file}
```

### 模拟电源键
@risk caution
@need shell
@tag input 按键 电源

```sh
input keyevent 26
```

### 模拟音量加
@risk safe
@need shell
@tag input 按键 音量

```sh
input keyevent 24
```

### 返回键
@risk safe
@need shell
@tag input 按键 返回

```sh
input keyevent 4
```

### 文本输入
@risk caution
@need shell
@tag input 文本
@param text=要输入的文字|hello
@desc 不支持中文，中文需要借助输入法或 adb 剪贴板方案。

```sh
input text {text}
```
### 停止录屏
@risk caution
@need shell
@tag 录屏 screenrecord 停止
@desc 给 screenrecord 发 SIGINT，使其正常收尾并保存文件。

```sh
kill -2 $(pidof screenrecord)
```

### MIUI 单手模式
@type broadcast
@risk caution
@need none
@tag miui 单手模式 广播
@param mode=模式0默认1左2右|1
@desc 仅 MIUI/HyperOS；0=恢复默认，1=左手模式，2=右手模式。

@action miui.action.handymode.changemode
@extra mode:int={mode}

### 以分屏/小窗启动应用
@risk safe
@need shell
@tag 分屏 小窗 windowingMode
@param mode=模式3分屏5小窗|5
@desc 模式：3=分屏，5=小窗（部分 ROM 还支持 6=自由窗口）；component 写 包名/类名，如 com.coolapk.market/.view.main.MainActivity。

```sh
am start --windowingMode {mode} -n {component}
```

### 小窗打开当前前台应用
@risk safe
@need shell
@tag 小窗 windowingMode 前台
@desc 把当前前台 App 直接以小窗打开；需要系统支持自由窗口（多数 9.0+ 机型可用）。

```sh
am start --windowingMode 5 -n "$(dumpsys activity a | sed -rn 's|.* mResumedActivity.* ([^ ]*/[^ ]*) .*|\1|p' | head -1)"
```

### 输入明天日期
@risk safe
@need shell
@tag 输入 input text 日期
@desc 在光标处输入「明天」的月日.时分，如 1105.0930；注意 % 在 sh 里不需要转义。

```sh
input text $(date -d @$(( $(date +%s) + 86400 )) +%m%d.%H%M)
```

