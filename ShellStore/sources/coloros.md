# ColorOS

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> ColorOS / 一加（OPPO 系）系统入口，共 11 条。
> 磁贴类命令是「点一下控制中心磁贴」，效果等同手动点按，风险标注 caution。
> 仅 ColorOS 14/15 生效，其它 ROM 会失败。

## ColorOS

### ColorOS_一加互传
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.coloros.oshare/com.oplus.oshare.OshareTileService

```text
cmd statusbar click-tile com.coloros.oshare/com.oplus.oshare.OshareTileService
```

### ColorOS_护眼模式
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.oplus.eyeprotect/.services.EyeProtectTileService

```text
cmd statusbar click-tile com.oplus.eyeprotect/.services.EyeProtectTileService
```

### ColorOS_Clash Meta 磁贴
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.github.metacubex.clash.meta/com.github.kr328.clash.TileService

```text
cmd statusbar click-tile com.github.metacubex.clash.meta/com.github.kr328.clash.TileService
```

### ColorOS_唤醒小布
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.heytap.speechassist/.service.SpeechTileService

```text
cmd statusbar click-tile com.heytap.speechassist/.service.SpeechTileService
```

### ColorOS_屏幕录制
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.oplus.screenrecorder/.floatwindow.services.QuickPanelService

```text
cmd statusbar click-tile com.oplus.screenrecorder/.floatwindow.services.QuickPanelService
```

### ColorOS_手机投屏
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.oplus.linker/.synergy.service.TVTileService

```text
cmd statusbar click-tile com.oplus.linker/.synergy.service.TVTileService
```

### ColorOS_连接至 Windows
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.microsoft.appmanager/.quicksettings.WindowsLinkTileService

```text
cmd statusbar click-tile com.microsoft.appmanager/.quicksettings.WindowsLinkTileService
```

### ColorOS_无线反向充电
@type shell
@risk caution
@need shell
@tag coloros 磁贴 statusbar
@desc 等同下拉控制中心点一下该磁贴；部分磁贴需要先添加过。
@adb cmd statusbar click-tile com.oplus.battery/com.oplus.powermanager.wirelesscharg.WirelessReverseControService

```text
cmd statusbar click-tile com.oplus.battery/com.oplus.powermanager.wirelesscharg.WirelessReverseControService
```

### ColorOS_屏幕翻译
@type service
@risk caution
@need none
@tag coloros 服务
@desc 拉起系统屏幕翻译（会读取屏幕内容）。
@action plus.intent.action.GLOBAL_TRANSLATION
@adb am start-foreground-service -a plus.intent.action.GLOBAL_TRANSLATION

### ColorOS_小布识屏
@type service
@risk caution
@need none
@tag coloros 服务
@desc 直接进入小布识屏的全屏 OCR 模式。
@action oplus.intent.action.DIRECT_SIDEBAR_SERVICE
@extra extra_entrance_function:string=full_screen_ocr
@adb am start-foreground-service -a oplus.intent.action.DIRECT_SIDEBAR_SERVICE --es extra_entrance_function full_screen_ocr

### ColorOS_小布执行指令
@type activity
@risk safe
@need shell
@tag coloros 小布 deeplink
@desc 通过 DeepLink 把小布可识别的指令直接发给语音助手执行。
@component com.heytap.speechassist/.deeplink.DeepLinkActivity
@flag 0x10000000
@adb am start -n com.heytap.speechassist/.deeplink.DeepLinkActivity -f 0x10000000
