# 酷安

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 酷安（com.coolapk.market）的 coolmarket:// Scheme 与 Activity 入口，共 18 条。
> 通知、看看号、应用集、话题、软件更新、下载管理、扫一扫等；带 ID 的条目需填真实 ID。
> 全部 safe，只做页面跳转。

## 酷安

### 酷安_打开
@type urlscheme
@risk safe
@need none
@adb am start -d 'coolmarket://'

```text
coolmarket://
```

### 酷安_打开指定用户
@type urlscheme
@risk safe
@need none
@param uid=用户ID|1000000
@adb am start -d 'coolmarket://u/{uid}'

```text
coolmarket://u/{uid}
```

### 酷安_打开指定帖子
@type urlscheme
@risk safe
@need none
@param feed_id=动态ID|10000000
@adb am start -d 'coolmarket://feed/{feed_id}'

```text
coolmarket://feed/{feed_id}
```

### 酷安_搜索
@type urlscheme
@risk safe
@need none
@adb am start -d 'coolmarket://com.coolapk.market/search'

```text
coolmarket://com.coolapk.market/search
```

### 酷安_酷图
@type urlscheme
@risk safe
@need none
@adb am start -d 'coolmarket://com.coolapk.market/page?url=V9_HOME_TAB_COOLPIC&title=%E9%85%B7%E5%9B%BE'

```text
coolmarket://com.coolapk.market/page?url=V9_HOME_TAB_COOLPIC&title=%E9%85%B7%E5%9B%BE
```

### 酷安_主界面
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.main.MainActivity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.main.MainActivity

### 酷安_通知
@type intent
@risk safe
@need shell
@component com.coolapk.market/.view.notification.NotificationActivity
@package com.coolapk.market
@extra tab:int=0
@adb am start -n com.coolapk.market/.view.notification.NotificationActivity --ei tab 0

### 酷安_打开指定看看号
@type intent
@risk safe
@need shell
@param dyh_id=看看号ID|1000
@component com.coolapk.market/.view.dyhv8.DyhDetailActivity
@package com.coolapk.market
@extra DYH_EDITOR:bool=true
@extra DYH_ID:string={dyh_id}
@adb am start -n com.coolapk.market/.view.dyhv8.DyhDetailActivity --ez DYH_EDITOR true --es DYH_ID {dyh_id}

### 酷安_打开指定应用集
@type intent
@risk safe
@need shell
@param album_id=应用集ID|1000000
@component com.coolapk.market/.view.album.albumv8.AlbumDetailActivity
@package com.coolapk.market
@extra ALBUM_ID:string={album_id}
@adb am start -n com.coolapk.market/.view.album.albumv8.AlbumDetailActivity --es ALBUM_ID {album_id}

### 酷安_打开指定话题
@type intent
@risk safe
@need shell
@param topic=话题名|酷安夜话
@component com.coolapk.market/.view.node.DynamicNodePageActivity
@package com.coolapk.market
@extra LOADER_NAME:string=LOADER_TOPIC
@extra TOPIC_TITLE:string={topic}
@adb am start -n com.coolapk.market/.view.node.DynamicNodePageActivity --es LOADER_NAME LOADER_TOPIC --es TOPIC_TITLE {topic}

### 酷安_我的应用集
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.album.UserAlbumListActivity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.album.UserAlbumListActivity

### 酷安_软件更新
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.appmanager.UpgradeManagerActivity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.appmanager.UpgradeManagerActivity

### 酷安_下载管理
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.appmanager.DownloadManagerActivity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.appmanager.DownloadManagerActivity

### 酷安_扫一扫
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.photo.QRCodeActivity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.photo.QRCodeActivity

### 酷安_我的关注
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.user.UserFollowAppActivity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.user.UserFollowAppActivity

### 酷安_分享到酷安
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.feedv8.ShareFeedV8Activity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.feedv8.ShareFeedV8Activity

### 酷安_订阅的看看号列表
@type activity
@risk safe
@need shell
@component com.coolapk.market/.view.dyhv8.DyhListActivity
@package com.coolapk.market
@adb am start -n com.coolapk.market/.view.dyhv8.DyhListActivity

### 酷安_搜索指定内容
@type intent
@risk safe
@need shell
@param keyword=关键词|酷安
@component com.coolapk.market/.view.search.SuperSearchResultActivity
@package com.coolapk.market
@extra keyword:string={keyword}
@extra searchType:string=all
@extra returnType:string=all
@adb am start -n com.coolapk.market/.view.search.SuperSearchResultActivity --es keyword {keyword} --es searchType all --es returnType all
