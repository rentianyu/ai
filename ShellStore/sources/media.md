# 影音娱乐

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> QQ音乐、哔哩哔哩、MX 播放器、i音乐四个影音 App 的入口，共 13 条。
> 带参数的条目需要填真实 ID：B 站可用视频页网址里的 BV 号/av 号，QQ音乐不需要。
> 全部 safe，只做页面跳转。

## QQ音乐

### QQ音乐_播放本地
@type intent
@risk safe
@need none
@tag qq音乐 快捷
@desc 走 QQ音乐 DispacherActivityForThird 的快捷入口。
@component com.tencent.qqmusic/.third.DispacherActivityForThird
@flag 0x1000c000
@extra shortcutScheme:string=playLocal
@adb am start -n com.tencent.qqmusic/.third.DispacherActivityForThird --es shortcutScheme "playLocal" -f 0x1000c000

### QQ音乐_搜索歌曲
@type intent
@risk safe
@need none
@tag qq音乐 快捷
@desc 走 QQ音乐 DispacherActivityForThird 的快捷入口。
@component com.tencent.qqmusic/.third.DispacherActivityForThird
@flag 0x1000c000
@extra shortcutScheme:string=searchSong
@adb am start -n com.tencent.qqmusic/.third.DispacherActivityForThird --es shortcutScheme "searchSong" -f 0x1000c000

### QQ音乐_听歌识曲
@type intent
@risk safe
@need none
@tag qq音乐 快捷
@desc 走 QQ音乐 DispacherActivityForThird 的快捷入口。
@component com.tencent.qqmusic/.third.DispacherActivityForThird
@flag 0x1000c000
@extra shortcutScheme:string=recognize
@adb am start -n com.tencent.qqmusic/.third.DispacherActivityForThird --es shortcutScheme "recognize" -f 0x1000c000

### QQ音乐_最近播放
@type intent
@risk safe
@need none
@tag qq音乐 快捷
@desc 走 QQ音乐 DispacherActivityForThird 的快捷入口。
@component com.tencent.qqmusic/.third.DispacherActivityForThird
@flag 0x1000c000
@extra shortcutScheme:string=playRecent
@adb am start -n com.tencent.qqmusic/.third.DispacherActivityForThird --es shortcutScheme "playRecent" -f 0x1000c000

## 哔哩哔哩

### 哔哩哔哩_排行榜
@type scheme
@risk safe
@need none
@tag b站 哔哩哔哩
@adb am start -d 'bilibili://rank/rank'

```text
bilibili://rank/rank
```

### 哔哩哔哩_首页
@type activity
@risk safe
@need none
@tag b站 哔哩哔哩
@component com.bilibili.app.in/tv.danmaku.bili.MainActivityV2
@adb am start -n com.bilibili.app.in/tv.danmaku.bili.MainActivityV2

### 哔哩哔哩_分区首页
@type scheme
@risk safe
@need none
@tag b站 哔哩哔哩
@desc tab 可选：推荐 / 直播 / 热门 / 追番 / 影视 / 学习
@adb am start -d 'bilibili://home?tab_name={tab}'

```text
bilibili://home?tab_name={tab}
```

### 哔哩哔哩_指定视频
@type scheme
@risk safe
@need none
@tag b站 哔哩哔哩
@param av=视频av号|BV1xx411c7mD
@adb am start -d 'bilibili://video/{av}'

```text
bilibili://video/{av}
```

### 哔哩哔哩_指定文章
@type scheme
@risk safe
@need none
@tag b站 哔哩哔哩
@param cv=文章cv号|123456
@adb am start -d 'bilibili://article/{cv}'

```text
bilibili://article/{cv}
```

### 哔哩哔哩_搜索
@type scheme
@risk safe
@need none
@tag b站 哔哩哔哩
@param kw=关键词|原神
@adb am start -d 'bilibili://search?keyword={kw}'

```text
bilibili://search?keyword={kw}
```

## MX播放器

### MX播放器_播放网络流
@type activity
@risk safe
@need none
@tag mx 播放器
@param url=视频地址|https://example.com/a.mp4
@desc 直接用播放器打开网络地址。
@component com.mxtech.videoplayer.pro/.ActivityScreen
@extra url:string={url}
@adb am start -n com.mxtech.videoplayer.pro/.ActivityScreen --es url {url}

### MX播放器_播放网络流（Intent 版）
@type intent
@risk safe
@need none
@tag mx 播放器
@param url=视频地址|https://example.com/a.mp4
@desc intent 形式的等价写法；普通版把 @package 改成 com.mxtech.videoplayer.ad。
@package com.mxtech.videoplayer.pro
@data {url}
@adb am start -d '{url}' -p com.mxtech.videoplayer.pro

## i音乐

### i音乐_听歌识曲
@type service
@risk safe
@need shell
@tag i音乐 识曲
@desc vivo/iQOO 自带音乐 App 的识曲入口。
@action com.android.music.START_RECOGNIZE_SONG
@component com.android.bbkmusic/.service.MusicService
@extra start_recognize_song_from:string=START_RECOGNIZE_SONG_FROM_UPSLIDE
@extra start_recognize_song_type:int=0
@adb am start-foreground-service -a com.android.music.START_RECOGNIZE_SONG -n com.android.bbkmusic/.service.MusicService --es start_recognize_song_from START_RECOGNIZE_SONG_FROM_UPSLIDE --ei start_recognize_song_type 0
