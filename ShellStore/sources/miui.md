# 小米

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 小米 / HyperOS 系统入口：小米相册、时钟、便签、日历、手机管家、录屏、截图、护眼等，共 28 条。
> 含 miui.* 广播与 settings 键，部分条目仅 MIUI/HyperOS 生效（原生 Android 会失败）。
> 原素材里「小米录音机_开始录音」标注为非法使用，已剔除。

## 小米

### 小米_打开相册指定图片
@type intent
@risk safe
@need shell
@param path=图片路径|/sdcard/DCIM/Camera/1.jpg
@desc 只支持本地文件路径；部分 ROM 需要相册有对应媒体记录。
@action android.intent.action.MAIN
@component com.miui.gallery/.activity.InternalPhotoPageActivity
@data file://{path}
@adb am start -a android.intent.action.MAIN -d 'file://{path}' -n com.miui.gallery/.activity.InternalPhotoPageActivity

### 小米_拨打电话
@type intent
@risk safe
@need shell
@param number=号码|10086
@desc 直接呼出，不需要点确认；需要电话权限。
@action android.intent.action.CALL
@data tel:{number}
@adb am start -a android.intent.action.CALL -d 'tel:{number}'

### 小米_小爱捷径
@type activity
@risk safe
@need shell
@tag 小爱 捷径
@component com.miui.voiceassist/com.xiaomi.voiceassistant.AiSettings.AiShortcutActivity
@adb am start -n com.miui.voiceassist/com.xiaomi.voiceassistant.AiSettings.AiShortcutActivity

### 小米_手机管家垃圾清理
@type intent
@risk safe
@need shell
@tag 手机管家 清理
@action miui.intent.action.GARBAGE_CLEANUP
@package com.miui.cleanmaster
@adb am start -a miui.intent.action.GARBAGE_CLEANUP -p com.miui.cleanmaster

### 小米_时钟-启动秒表
@type intent
@risk safe
@need shell
@tag 时钟 秒表
@action com.android.deskclock.shortcut.STOP_WATCH
@component com.android.deskclock/.ShortcutTrampolineActivity
@flag 0x1000c000
@adb am start -a com.android.deskclock.shortcut.STOP_WATCH -n com.android.deskclock/.ShortcutTrampolineActivity -f 0x1000c000

### 小米_日历-新建日程
@type intent
@risk safe
@need shell
@tag 日历 日程
@component com.android.cal
@adb am start -n com.android.cal

### 小米_便签-新建便签
@type intent
@risk safe
@need shell
@tag 便签
@action android.intent.action.INSERT_OR_EDIT
@package com.miui.notes
@adb am start -a android.intent.action.INSERT_OR_EDIT -p com.miui.notes

### 小米_便签-新建文字待办
@type intent
@risk safe
@need shell
@tag 便签 待办
@action com.miui.todo.shortcut.action.INSERT_OR_EDIT
@package com.miui.notes
@adb am start -a com.miui.todo.shortcut.action.INSERT_OR_EDIT -p com.miui.notes

### 小米_便签-添加语音待办
@type intent
@risk safe
@need shell
@tag 便签 待办 语音
@action com.miui.todo.shortcut.action.INSERT_OR_EDIT
@package com.miui.notes
@adb am start -a com.miui.todo.shortcut.action.INSERT_OR_EDIT -p com.miui.notes

### 小米_时钟-创建闹钟
@type intent
@risk safe
@need shell
@tag 时钟 闹钟
@action com.android.deskclock.shortcut.NEW_ALARM
@component com.android.deskclock/.ShortcutTrampolineActivity
@flag 0x1000c000
@adb am start -a com.android.deskclock.shortcut.NEW_ALARM -n com.android.deskclock/.ShortcutTrampolineActivity -f 0x1000c000

### 小米_时钟-开始倒计时
@type intent
@risk safe
@need shell
@tag 时钟 倒计时
@desc 打开即开始倒计时，默认 6 分钟。
@action com.android.deskclock.shortcut.START_TIMER
@component com.android.deskclock/.ShortcutTrampolineActivity
@flag 0x1000c000
@adb am start -a com.android.deskclock.shortcut.START_TIMER -n com.android.deskclock/.ShortcutTrampolineActivity -f 0x1000c000

### 小米_设置-屏幕时间管理
@type activity
@risk safe
@need shell
@tag 设置 使用统计
@component com.xiaomi.misettings/.usagestats.UsageStatsMainActivity
@adb am start -n com.xiaomi.misettings/.usagestats.UsageStatsMainActivity

### 小米_安全中心-耗电统计
@type activity
@risk safe
@need shell
@tag 电量 统计
@component com.miui.securitycenter/com.miui.powercenter.batteryhistory.BatteryHistoryDetailActivity
@adb am start -n com.miui.securitycenter/com.miui.powercenter.batteryhistory.BatteryHistoryDetailActivity

### 小米_禅定模式-设置
@type activity
@risk safe
@need shell
@tag 禅定 专注
@component com.xiaomi.misettings/com.xiaomi.misettings.usagestats.focusmode.FocusSettingsActivity
@adb am start -n com.xiaomi.misettings/com.xiaomi.misettings.usagestats.focusmode.FocusSettingsActivity

### 小米_禅定模式-开始
@type activity
@risk safe
@need shell
@tag 禅定 专注
@component com.xiaomi.misettings/com.xiaomi.misettings.usagestats.focusmode.FocusModeTimingActivity
@adb am start -n com.xiaomi.misettings/com.xiaomi.misettings.usagestats.focusmode.FocusModeTimingActivity

### 小米_息屏挂机警告弹窗
@type intent
@risk safe
@need shell
@tag 游戏 挂机
@component com.miui.securitycenter/com.miui.gamebooster.ui.GameBoxAlertActivity
@extra intent_gamebox_function_type:string=intent_gamebox_func_type_hangup
@adb am start -n com.miui.securitycenter/com.miui.gamebooster.ui.GameBoxAlertActivity --es intent_gamebox_function_type intent_gamebox_func_type_hangup

### 小米_开启小爱语音唤醒
@type shell
@risk caution
@need shell
@tag 小爱 语音唤醒
@desc 打开「小爱同学」语音唤醒开关并拉起语音服务；部分机型还需要在设置里单独授权。
@adb settings put secure lab_sound_trigger_status 1 && am start-foreground-service com.miui.voiceassist/com.xiaomi.voiceassistant.voiceTrigger.legacy.VoiceTriggerWorkerService

```text
settings put secure lab_sound_trigger_status 1 && am start-foreground-service com.miui.voiceassist/com.xiaomi.voiceassistant.voiceTrigger.legacy.VoiceTriggerWorkerService
```

### 小米_区域截图
@type broadcast
@risk safe
@need none
@tag 截图
@action android.intent.action.CAPTURE_PARTIAL_SCREENSHOT
@adb am broadcast -a android.intent.action.CAPTURE_PARTIAL_SCREENSHOT

### 小米_整屏截图
@type broadcast
@risk safe
@need none
@tag 截图
@action android.intent.action.CAPTURE_PARTIAL_SCREENSHOT
@adb am broadcast -a android.intent.action.CAPTURE_PARTIAL_SCREENSHOT

### 小米_开启省电模式
@type broadcast
@risk caution
@need none
@tag 省电
@action com.miui.intent.action.CHANGE_POWER_SAVE_MODE
@extra POWER_SAVE_MODE_OPEN:bool=true
@adb am broadcast -a com.miui.intent.action.CHANGE_POWER_SAVE_MODE --ez POWER_SAVE_MODE_OPEN true

### 小米_手电筒
@type broadcast
@risk safe
@need none
@tag 手电筒
@param state=开关true/false|true
@desc MIUI/HyperOS 手电筒广播，state 填 true 或 false。
@action miui.intent.action.TOGGLE_TORCH
@extra miui.intent.extra.IS_ENABLE:bool={state}
@adb am broadcast -a miui.intent.action.TOGGLE_TORCH --ez miui.intent.extra.IS_ENABLE true

### 小米_录屏-开始
@type shell
@risk caution
@need shell
@tag 录屏
@adb am startservice -n com.miui.screenrecorder/.service.RecorderService --ez is_start_immediately true --ez need_check_audio_permission true --ez stop_self false

```text
am startservice -n com.miui.screenrecorder/.service.RecorderService --ez is_start_immediately true --ez need_check_audio_permission true --ez stop_self false
```

### 小米_录屏-停止
@type shell
@risk caution
@need shell
@tag 录屏
@adb am startservice -n com.miui.screenrecorder/.service.RecorderService  --ez stop_self true

```text
am startservice -n com.miui.screenrecorder/.service.RecorderService  --ez stop_self true
```

### 小米_护眼模式
@type shell
@risk caution
@need shell
@tag 护眼 显示
@desc settings put system screen_paper_mode_enabled 1/0 控制开关。
@adb settings put system screen_paper_mode_enabled 1

```text
settings put system screen_paper_mode_enabled 1
```

### 小米_色彩模式-高级
@type shell
@risk caution
@need shell
@tag 显示 色彩
@adb settings put system screen_optimize_mode 4

```text
settings put system screen_optimize_mode 4
```

### 小米_极暗模式百分比
@type shell
@risk caution
@need shell
@tag 显示 极暗
@param level=百分比|60
@desc 取值 0-100，60 表示极暗强度 60%。
@adb settings put secure reduce_bright_colors_level {level}

```text
settings put secure reduce_bright_colors_level {level}
```

### 小米_蓝牙耳机设置
@type intent
@risk safe
@need shell
@tag 蓝牙 耳机
@desc 原素材备注：action 后面对应不同耳机动画，具体取值需要自己试。
@action miui.bluetooth.action.HEADSET_SETTINGS
@component com.android.settings/.bluetooth.MiuiHeadsetActivity
@category android.intent.category.DEFAULT
@extra bluetoothaddress:string=${MAC}
@extra MIUI_HEADSET_SUPPORT:string=${HEADSET}
@extra COME_FROM:string=MIUI_BLUETOOTH_SETTINGS
@adb am start -a miui.bluetooth.action.HEADSET_SETTINGS -n com.android.settings/.bluetooth.MiuiHeadsetActivity --es bluetoothaddress ${MAC} --es MIUI_HEADSET_SUPPORT ${HEADSET} --es COME_FROM MIUI_BLUETOOTH_SETTINGS

### 小米_已配对蓝牙设备
@type shell
@risk safe
@need shell
@tag 蓝牙 设备
@adb dumpsys bluetooth_manager | awk '/Bonded devices:/ {flag=1; next} /^$/{flag=0} flag'

```text
dumpsys bluetooth_manager | awk '/Bonded devices:/ {flag=1; next} /^$/{flag=0} flag'
```
