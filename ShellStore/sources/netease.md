# 网易云音乐

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 网易云音乐（com.netease.cloudmusic）的 orpheus:// Scheme 与 Activity 入口，共 17 条。
> 每日推荐、听歌识曲、私人 FM、指定歌曲/歌单/歌手/MV 等；带 ID 的条目需填真实 ID（歌曲页网址里那串数字）。
> 全部 safe，只做页面跳转。

## 网易云音乐

### 网易云音乐_打开
@type urlscheme
@risk safe
@need none
@adb am start -d 'orpheus://'

```text
orpheus://
```

### 网易云音乐_主界面
@type activity
@risk safe
@need shell
@component com.netease.cloudmusic/.activity.MainActivity
@package com.netease.cloudmusic
@adb am start -n com.netease.cloudmusic/.activity.MainActivity

### 网易云音乐_最近播放
@type activity
@risk safe
@need shell
@component com.netease.cloudmusic/.activity.MyRecentPlayActivity
@package com.netease.cloudmusic
@adb am start -n com.netease.cloudmusic/.activity.MyRecentPlayActivity

### 网易云音乐_每日推荐
@type urlscheme
@risk safe
@need none
@adb am start -d 'orpheus://songrcmd'

```text
orpheus://songrcmd
```

### 网易云音乐_听歌识曲
@type urlscheme
@risk safe
@need none
@adb am start -d 'orpheus://identify'

```text
orpheus://identify
```

### 网易云音乐_本地音乐
@type activity
@risk safe
@need shell
@component com.netease.cloudmusic/.activity.ScanMusicActivity
@package com.netease.cloudmusic
@adb am start -n com.netease.cloudmusic/.activity.ScanMusicActivity

### 网易云音乐_私人FM并播放
@type urlscheme
@risk safe
@need none
@adb am start -d 'orpheus://radio'

```text
orpheus://radio
```

### 网易云音乐_私人FM不播放
@type activity
@risk safe
@need shell
@component com.netease.cloudmusic/.activity.PlayerRadioActivity
@package com.netease.cloudmusic
@adb am start -n com.netease.cloudmusic/.activity.PlayerRadioActivity

### 网易云音乐_Sati空间
@type urlscheme
@risk safe
@need none
@adb am start -d 'orpheus://nm/sati/entry'

```text
orpheus://nm/sati/entry
```

### 网易云音乐_打开指定网址
@type urlscheme
@risk safe
@need none
@param url=目标网址|https://music.163.com
@adb am start -d 'orpheus://openurl?url={url}'

```text
orpheus://openurl?url={url}
```

### 网易云音乐_播放指定歌曲
@type urlscheme
@risk safe
@need none
@param song_id=歌曲ID|1901371647
@adb am start -d 'orpheus://song/{song_id}'

```text
orpheus://song/{song_id}
```

### 网易云音乐_打开指定歌单
@type urlscheme
@risk safe
@need none
@param playlist_id=歌单ID|2884035
@adb am start -d 'orpheus://playlist/{playlist_id}'

```text
orpheus://playlist/{playlist_id}
```

### 网易云音乐_歌手主页
@type urlscheme
@risk safe
@need none
@param artist_id=歌手ID|6452
@adb am start -d 'orpheus://artist/{artist_id}'

```text
orpheus://artist/{artist_id}
```

### 网易云音乐_歌手个人页
@type urlscheme
@risk safe
@need none
@param user_id=用户ID|329440
@adb am start -d 'orpheus://user/{user_id}'

```text
orpheus://user/{user_id}
```

### 网易云音乐_指定MV
@type urlscheme
@risk safe
@need none
@param mv_id=MV ID|1090
@adb am start -d 'orpheus://mv/{mv_id}'

```text
orpheus://mv/{mv_id}
```

### 网易云音乐_发图文
@type urlscheme
@risk safe
@need none
@adb am start -d 'orpheus://pubevent'

```text
orpheus://pubevent
```

### 网易云音乐_播放本地音乐
@type urlscheme
@risk safe
@need none
@adb am start -d 'orpheus://play_local_music'

```text
orpheus://play_local_music
```
