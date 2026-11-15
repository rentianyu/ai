# 抖音

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 抖音（com.ss.android.ugc.aweme）的 snssdk1128:// URL Scheme 集合，共 28 条。
> 带参数条目需先填值：分享链接到浏览器打开，问号前的串就是要找的值。
> 全部 safe，只做页面跳转。

## 抖音

### 抖音_打开抖音
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://'

```text
snssdk1128://
```

### 抖音_指定人界面
@type urlscheme
@risk safe
@need none
@param uid=用户主页值|
@adb am start -d 'snssdk1128://user/profile/'

```text
snssdk1128://user/profile/{uid}
```

### 抖音_指定作品
@type urlscheme
@risk safe
@need none
@param aweme_id=作品ID|
@adb am start -d 'snssdk1128://aweme/detail/'

```text
snssdk1128://aweme/detail/{aweme_id}
```

### 抖音_指定直播间
@type urlscheme
@risk safe
@need none
@param room_id=直播间ID|
@adb am start -d 'snssdk1128://live?room_id='

```text
snssdk1128://live?room_id={room_id}
```

### 抖音_打开指定网址
@type urlscheme
@risk safe
@need none
@param url=完整网址|https://www.douyin.com
@adb am start -d 'snssdk1128://webview?url=https://www.douyin.com'

```text
snssdk1128://webview?url={url}
```

### 抖音_热搜词榜
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://search/trending'

```text
snssdk1128://search/trending
```

### 抖音_热搜视频榜
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://search/trending?type=1'

```text
snssdk1128://search/trending?type=1
```

### 抖音_热搜音乐榜
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://search/trending?type=2'

```text
snssdk1128://search/trending?type=2
```

### 抖音_正能量榜
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://search/trending?type=3'

```text
snssdk1128://search/trending?type=3
```

### 抖音_明星榜
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://search/trending?type=4'

```text
snssdk1128://search/trending?type=4
```

### 抖音_挑战详情
@type urlscheme
@risk safe
@need none
@param cid=话题ID|
@adb am start -d 'snssdk1128://challenge/detail/'

```text
snssdk1128://challenge/detail/{cid}
```

### 抖音_音乐详情
@type urlscheme
@risk safe
@need none
@param mid=音乐ID|
@adb am start -d 'snssdk1128://music/detail/'

```text
snssdk1128://music/detail/{mid}
```

### 抖音_poi详情页
@type urlscheme
@risk safe
@need none
@param poi_id=POI ID|
@adb am start -d 'snssdk1128://poi/detail?id='

```text
snssdk1128://poi/detail?id={poi_id}
```

### 抖音_转发详情页
@type urlscheme
@risk safe
@need none
@param fid=转发ID|
@adb am start -d 'snssdk1128://forward/detail/'

```text
snssdk1128://forward/detail/{fid}
```

### 抖音_团购
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://land_tab?tabid=homepage_groupon'

```text
snssdk1128://land_tab?tabid=homepage_groupon
```

### 抖音_商城
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://mall/xtab'

```text
snssdk1128://mall/xtab
```

### 抖音_关注
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://land_tab?tabid=homepage_follow'

```text
snssdk1128://land_tab?tabid=homepage_follow
```

### 抖音_同城
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://nearby/'

```text
snssdk1128://nearby/
```

### 抖音_附近团购
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://nearby/enter_nearby_with_undertake?page_type=1'

```text
snssdk1128://nearby/enter_nearby_with_undertake?page_type=1
```

### 抖音_精选
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://land_tab?tabid=homepage_mediumvideo'

```text
snssdk1128://land_tab?tabid=homepage_mediumvideo
```

### 抖音_直播
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://land_tab?tabid=homepage_tablive'

```text
snssdk1128://land_tab?tabid=homepage_tablive
```

### 抖音_热点
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://land_tab?tabid=homepage_pad_hot'

```text
snssdk1128://land_tab?tabid=homepage_pad_hot
```

### 抖音_经验
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://land_tab?tabid=homepage_hangout'

```text
snssdk1128://land_tab?tabid=homepage_hangout
```

### 抖音_短剧
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://playlet_center'

```text
snssdk1128://playlet_center
```

### 抖音_ai搜索
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://search/aigc'

```text
snssdk1128://search/aigc
```

### 抖音_日常
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://aweme/closefriends/splash'

```text
snssdk1128://aweme/closefriends/splash
```

### 抖音_朋友
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://aweme/familiar'

```text
snssdk1128://aweme/familiar
```

### 抖音_消息
@type urlscheme
@risk safe
@need none
@adb am start -d 'snssdk1128://land_tab?tabid=homepage_notification'

```text
snssdk1128://land_tab?tabid=homepage_notification
```
