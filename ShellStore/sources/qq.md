# QQ

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> QQ（com.tencent.mobileqq）的 mqqapi:// Scheme 与 Activity 入口，共 15 条。
> 指定好友/群聊天、资料卡、空间动态、打卡、扫一扫等；带 uin 的条目需填对方 QQ 号。
> 原素材里「指定频道界面」一条只有网址、没有 scheme，已剔除。
> 全部 safe，只做页面跳转。

## QQ

### QQ_打开QQ
@type urlscheme
@risk safe
@need none
@adb am start -d 'mqq://'

```text
mqq://
```

### QQ_个人名片
@type urlscheme
@risk safe
@need none
@adb am start -d 'mqqapi://card/show_pslcard'

```text
mqqapi://card/show_pslcard
```

### QQ_指定好友聊天
@type urlscheme
@risk safe
@need none
@param uin=好友QQ号|10001
@adb am start -d 'mqqwpa://im/chat?chat_type=wpa&uin={uin}'

```text
mqqwpa://im/chat?chat_type=wpa&uin={uin}
```

### QQ_指定群聊天
@type urlscheme
@risk safe
@need none
@param group=群号|100000000
@adb am start -d 'mqqwpa://im/chat?chat_type=group&uin={group}'

```text
mqqwpa://im/chat?chat_type=group&uin={group}
```

### QQ_好友动态
@type urlscheme
@risk safe
@need none
@adb am start -d 'mqqapi://qzone/activefeed?src_type=app'

```text
mqqapi://qzone/activefeed?src_type=app
```

### QQ_个人空间
@type urlscheme
@risk safe
@need none
@adb am start -d 'mqqapi://qzone/open_homepage'

```text
mqqapi://qzone/open_homepage
```

### QQ_指定资料卡
@type urlscheme
@risk safe
@need none
@param uin=QQ号|10001
@adb am start -d 'mqqapi://userprofile/friend_profile_card?src_type=web&version=1.0&source=2&uin={uin}'

```text
mqqapi://userprofile/friend_profile_card?src_type=web&version=1.0&source=2&uin={uin}
```

### QQ_加好友搜索
@type urlscheme
@risk safe
@need none
@adb am start -d 'mqqapi://contact/search_might_know'

```text
mqqapi://contact/search_might_know
```

### QQ_主界面
@type activity
@risk safe
@need shell
@component com.tencent.mobileqq/.activity.SplashActivity
@package com.tencent.mobileqq
@adb am start -n com.tencent.mobileqq/.activity.SplashActivity

### QQ_内打开指定网址
@type intent
@risk safe
@need shell
@param url=目标网址|http://baidu.com
@component com.tencent.mobileqq/.activity.QQBrowserActivity
@package com.tencent.mobileqq
@extra url:string={url}
@adb am start -n com.tencent.mobileqq/.activity.QQBrowserActivity --es url {url}

### QQ_打卡界面
@type intent
@risk safe
@need shell
@component com.tencent.mobileqq/.activity.QQBrowserActivity
@package com.tencent.mobileqq
@extra url:string=https://ti.qq.com/signin/public/index.html?_wv=1090532257
@adb am start -n com.tencent.mobileqq/.activity.QQBrowserActivity --es url https://ti.qq.com/signin/public/index.html?_wv=1090532257

### QQ_我的收藏
@type intent
@risk safe
@need shell
@component com.tencent.mobileqq/cooperation.qqfav.QfavPluginProxyActivity
@package com.tencent.mobileqq
@extra pluginsdk_pluginName:string=qqfav.apk
@extra pluginsdk_pluginpath:string=/data/data/com.tencent.mobileqq/app_installed_plugin/qqfav.apk
@extra userQqResources:int=1
@extra pluginsdk_pluginLocation:string=qqfav.apk
@extra pluginsdk_launchActivity:string=com.qqfav.activity.FavoritesListActivity
@adb am start -n com.tencent.mobileqq/cooperation.qqfav.QfavPluginProxyActivity --es pluginsdk_pluginName qqfav.apk --es pluginsdk_pluginpath /data/data/com.tencent.mobileqq/app_installed_plugin/qqfav.apk --ei userQqResources 1 --es pluginsdk_pluginLocation qqfav.apk --es pluginsdk_launchActivity com.qqfav.activity.FavoritesListActivity

### QQ_我的文件
@type activity
@risk safe
@need shell
@component com.tencent.mobileqq/.filemanager.activity.fileassistant.FileAssistantActivity
@package com.tencent.mobileqq
@adb am start -n com.tencent.mobileqq/.filemanager.activity.fileassistant.FileAssistantActivity

### QQ_点赞界面
@type intent
@risk safe
@need shell
@component com.tencent.mobileqq/.activity.VisitorsActivity
@package com.tencent.mobileqq
@extra extra_show_rank:bool=true
@adb am start -n com.tencent.mobileqq/.activity.VisitorsActivity --ez extra_show_rank true

### QQ_扫一扫
@type activity
@risk safe
@need shell
@component com.tencent.mobileqq/com.tencent.biz.qrcode.activity.ScannerActivity
@package com.tencent.mobileqq
@adb am start -n com.tencent.mobileqq/com.tencent.biz.qrcode.activity.ScannerActivity
