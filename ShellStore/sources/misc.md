# 常用小工具

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 小爱同学、FV 悬浮球、Notion、Surfboard、美团、小米社区、AutoJS、MT管理器、TIM、影音与单条 App 的入口，共 35 条。
> 小爱同学与 FV 悬浮球是「动作型」条目：需 Shizuku/adb 触发（need=shell）。
> 原素材里「扫一扫和二维码」页的 3 条（微信付款码、云闪付信用卡还款/乘车码）已分别收在 wechat.md、unionpay.md，这里不重复收录。

## 小爱同学

### 小爱同学_唤醒-前台服务
@type intent
@risk safe
@need shell
@tag 小爱 唤醒
@action android.intent.action.ASSIST
@component com.miui.voiceassist/com.xiaomi.voiceassistant.VoiceService
@adb am start -a android.intent.action.ASSIST -n com.miui.voiceassist/com.xiaomi.voiceassistant.VoiceService

### 小爱同学_唤醒-CTA弹窗
@type intent
@risk safe
@need shell
@tag 小爱 唤醒
@action android.intent.action.ASSIST
@component com.miui.voiceassist/com.xiaomi.voiceassistant.CTAAlertActivity
@adb am start -a android.intent.action.ASSIST -n com.miui.voiceassist/com.xiaomi.voiceassistant.CTAAlertActivity

### 小爱同学_唤醒-主界面
@type intent
@risk safe
@need shell
@tag 小爱 唤醒
@action android.intent.action.ASSIST
@component com.miui.voiceassist/com.xiaomi.voiceassistant.MiuiVoiceAssistActivity
@adb am start -a android.intent.action.ASSIST -n com.miui.voiceassist/com.xiaomi.voiceassistant.MiuiVoiceAssistActivity

### 小爱同学_唤醒-系统语音命令
@type intent
@risk safe
@need shell
@tag 小爱 唤醒
@action android.intent.action.VOICE_COMMAND
@adb am start -a android.intent.action.VOICE_COMMAND

### 小爱同学_识屏
@type intent
@risk safe
@need shell
@tag 小爱 唤醒
@component com.miui.voiceassist/com.xiaomi.voiceassistant.screenrecognition.ScreenRecognitionActivity
@flag 0x10008000
@extra isNeedDelay:bool=true
@adb am start -n com.miui.voiceassist/com.xiaomi.voiceassistant.screenrecognition.ScreenRecognitionActivity --ez isNeedDelay true -f 0x10008000

### 小爱同学_唤醒-长按 Home
@type shell
@risk safe
@need shell
@tag 小爱 唤醒
@adb input keyevent --longpress 5

```text
input keyevent --longpress 5
```

## FV悬浮球

### FV悬浮球_剪贴板
@type intent
@risk safe
@need shell
@tag fv 悬浮球
@desc 打开 FV 的剪贴板插件。
@action com.fooview.android.intent.START_PLUGIN
@component com.fooview.android.fooview/.ShortcutProxyActivity
@extra start_plugin_request:string=clipboard
@adb am start -a com.fooview.android.intent.START_PLUGIN -n com.fooview.android.fooview/.ShortcutProxyActivity --es start_plugin_request clipboard

### FV悬浮球_便签
@type intent
@risk safe
@need shell
@tag fv 悬浮球
@desc 打开 FV 便签插件。
@action com.fooview.android.intent.START_PLUGIN
@component com.fooview.android.fooview/.ShortcutProxyActivity
@extra start_plugin_request:string=note
@adb am start -a com.fooview.android.intent.START_PLUGIN -n com.fooview.android.fooview/.ShortcutProxyActivity --es start_plugin_request note

### FV悬浮球_收藏
@type intent
@risk safe
@need shell
@tag fv 悬浮球
@desc 打开 FV 收藏插件。
@action com.fooview.android.intent.START_PLUGIN
@component com.fooview.android.fooview/.ShortcutProxyActivity
@extra start_plugin_request:string=BOOKMARK
@adb am start -a com.fooview.android.intent.START_PLUGIN -n com.fooview.android.fooview/.ShortcutProxyActivity --es start_plugin_request BOOKMARK

### FV悬浮球_历史记录
@type intent
@risk safe
@need shell
@tag fv 悬浮球
@desc 打开 FV 历史记录插件。
@action com.fooview.android.intent.START_PLUGIN
@component com.fooview.android.fooview/.ShortcutProxyActivity
@extra start_plugin_request:string=HISTORY
@adb am start -a com.fooview.android.intent.START_PLUGIN -n com.fooview.android.fooview/.ShortcutProxyActivity --es start_plugin_request HISTORY

### FV悬浮球_运行自定义任务
@type intent
@risk safe
@need shell
@tag fv 悬浮球
@desc 配合 FV 的 workflow 使用，任务名需与 FV 内一致。
@action com.fooview.android.intent.RUN_WORKFLOW
@component com.fooview.android.fooview/.ShortcutProxyActivity
@extra action:string=FV任务名称
@adb am start -a com.fooview.android.intent.RUN_WORKFLOW -n com.fooview.android.fooview/.ShortcutProxyActivity --es action FV任务名称

## Notion

### Notion_创建分享链接
@type activity
@risk safe
@need shell
@tag notion
@component notion.id/notion.local.id.externalsharing.ExternalSharingActivityV2
@adb am start -n notion.id/notion.local.id.externalsharing.ExternalSharingActivityV2

### Notion_新建页面
@type intent
@risk safe
@need shell
@tag notion
@action android.intent.action.VIEW
@component notion.id/notion.local.id.externalsharing.QuickCaptureActivity
@package notion.id
@flag 0x40810000
@extra target_space_id:string=null
@extra source:string=shortcut
@adb am start -a android.intent.action.VIEW -n notion.id/notion.local.id.externalsharing.QuickCaptureActivity -p notion.id --es target_space_id null --es source shortcut -f 0x40810000

### Notion_发送到桌面
@type intent
@risk safe
@need shell
@tag notion
@action android.intent.action.VIEW
@component notion.id/notion.local.id.widget.config.ShortcutConfigurationActivity
@adb am start -a android.intent.action.VIEW -n notion.id/notion.local.id.widget.config.ShortcutConfigurationActivity

## Surfboard

### Surfboard_启动
@type urlscheme
@risk safe
@need none
@tag surfboard 代理
@adb am start -d 'surfboard:///start'

```text
surfboard:///start
```

### Surfboard_停止
@type urlscheme
@risk safe
@need none
@tag surfboard 代理
@adb am start -d 'surfboard:///stop'

```text
surfboard:///stop
```

### Surfboard_开关切换
@type urlscheme
@risk safe
@need none
@tag surfboard 代理
@adb am start -d 'surfboard:///toggle'

```text
surfboard:///toggle
```

### Surfboard_从链接导入配置
@type urlscheme
@risk safe
@need none
@tag surfboard 代理
@param url=订阅链接（已编码）|https%3A%2F%2Fexample.com%2Fsub
@desc 链接需要先做一次 URL 编码；直接从机场复制通常已是编码态。
@adb am start -d 'surfboard:///install-config?url={url}'

```text
surfboard:///install-config?url={url}
```

## 美团

### 美团_扫一扫
@type urlscheme
@risk safe
@need none
@tag 美团 扫码
@adb am start -d 'imeituan://www.meituan.com/scanQRCode'

```text
imeituan://www.meituan.com/scanQRCode
```

### 美团_付款码
@type urlscheme
@risk safe
@need none
@tag 美团 扫码
@desc 打开美团付款码页面。
@adb am start -d 'imeituan://www.meituan.com/web?url=https://awp.meituan.com/payfe/union-pay-qrcode/index.html'

```text
imeituan://www.meituan.com/web?url=https://awp.meituan.com/payfe/union-pay-qrcode/index.html
```

## 小米社区

### 小米社区_每日积分签到
@type scheme
@risk safe
@need none
@tag 小米社区 签到
@adb am start -d 'mio://web.vip.miui.com/page/info/mio/mio/checkIn?ref=longpressshortcuts'

```text
mio://web.vip.miui.com/page/info/mio/mio/checkIn?ref=longpressshortcuts
```

### 小米社区_拔萝卜金币签到
@type scheme
@risk safe
@need none
@tag 小米社区 签到
@adb am start -d 'mio://web.vip.miui.com/page/info/mio/mio/arrive?ref=longpressshortcuts'

```text
mio://web.vip.miui.com/page/info/mio/mio/arrive?ref=longpressshortcuts
```

### 小米社区_内测中心
@type scheme
@risk safe
@need none
@tag 小米社区 签到
@adb am start -d 'mio://web.vip.miui.com/page/info/mio/mio/internalTest?ref=longpressshortcuts'

```text
mio://web.vip.miui.com/page/info/mio/mio/internalTest?ref=longpressshortcuts
```
## AutoJS

### AutoJS_运行脚本（专业版）
@type intent
@risk caution
@need none
@tag autojs 脚本
@param script=脚本路径|/sdcard/autojs/签到.js
@desc 运行指定 JS 脚本，脚本需已存在。
@component org.autojs.autojspro/org.autojs.autojs.external.open.RunIntentActivity
@data {script}
@mime application/x-javascript
@adb am start -d '{script}' -n org.autojs.autojspro/org.autojs.autojs.external.open.RunIntentActivity -t application/x-javascript

### AutoJS_运行脚本（免费版）
@type intent
@risk caution
@need none
@tag autojs 脚本
@param script=脚本路径|/sdcard/脚本/名字.js
@desc 运行指定 JS 脚本。
@component org.autojs.autojs/.external.open.RunIntentActivity
@data {script}
@mime application/x-javascript
@adb am start -d '{script}' -n org.autojs.autojs/.external.open.RunIntentActivity -t application/x-javascript
## MT管理器

### MT管理器_打开指定文件
@type intent
@risk safe
@need none
@tag mt管理器 文件
@param file=文件路径|/sdcard/Download/a.txt
@desc 用 MT 的文件编辑器打开指定文件（组件名是 MT 的混淆类名，别改）。
@component bin.mt.plus/l.%DB%9A%DB%A4%DB%98
@data file://{file}
@flag 0x10000000
@adb am start -d 'file://{file}' -n bin.mt.plus/l.%DB%9A%DB%A4%DB%98 -f 0x10000000

### MT管理器_打开指定文件夹
@type activity
@risk safe
@need none
@tag mt管理器 目录
@param path=文件夹路径|/sdcard/Download
@desc 定位到指定目录。
@component bin.mt.plus/.MainLightIcon
@data file://{path}
@adb am start -d 'file://{path}' -n bin.mt.plus/.MainLightIcon
## TIM

### TIM_指定好友聊天
@type intent
@risk safe
@need none
@tag tim 聊天
@param uin=对方QQ号|10001
@desc uintype=0 表示好友。 原素材写的是示例号，已改成参数。
@component com.tencent.tim/com.tencent.mobileqq.activity.ChatActivity
@extra uintype:int=0
@extra uin:string={uin}
@adb am start -n com.tencent.tim/com.tencent.mobileqq.activity.ChatActivity --ei uintype 0 --es uin {uin}

### TIM_指定群聊
@type intent
@risk safe
@need none
@tag tim 聊天
@param uin=群号|100000000
@desc uintype=1 表示群。 原素材写的是示例号，已改成参数。
@component com.tencent.tim/com.tencent.mobileqq.activity.ChatActivity
@extra uintype:int=1
@extra uin:string={uin}
@adb am start -n com.tencent.tim/com.tencent.mobileqq.activity.ChatActivity --ei uintype 1 --es uin {uin}
## 其他

### Google Play_我的下载
@type activity
@risk safe
@need none
@tag googleplay 应用
@desc 打开 Play 商店的「管理应用和设备」页。
@action com.google.android.finsky.VIEW_MY_DOWNLOADS
@adb am start -a com.google.android.finsky.VIEW_MY_DOWNLOADS

### 小红书_关注
@type scheme
@risk safe
@need none
@tag 小红书
@desc 打开小红书关注流。
@adb am start -d 'xhsdiscover://home/follow'

```text
xhsdiscover://home/follow
```

### 京东读书_打开
@type scheme
@risk safe
@need none
@tag 京东读书
@desc 打开京东读书首页。
@adb am start -d 'jdread://'

```text
jdread://
```

### 小米应用商店_软件更新
@type scheme
@risk safe
@need none
@tag 小米 应用商店
@desc 打开应用更新列表。
@adb am start -d 'mimarket://update'

```text
mimarket://update
```

### 钉钉_打卡签到页
@type scheme
@risk safe
@need none
@tag 钉钉 打卡 考勤
@param corpId=企业corpId|ding1234567890
@desc corpId 换成自己企业的（钉钉考勤网页地址里 corpId= 后面那段）。
@adb am start -d 'dingtalk://dingtalkclient/page/link?url=https://attend.dingtalk.com/attend/index.html?corpId={corpId}'

```text
dingtalk://dingtalkclient/page/link?url=https://attend.dingtalk.com/attend/index.html?corpId={corpId}
```

### v2rayNG_启动服务
@type service
@risk caution
@need shell
@tag v2rayng 代理 vpn
@component com.v2ray.ang/.service.V2RayVpnService
@adb am start-foreground-service -n com.v2ray.ang/.service.V2RayVpnService

