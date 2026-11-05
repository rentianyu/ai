# 签到打卡

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 常用 App 的签到 / 打卡 / 领积分入口，共 16 条，按 App 分 7 类。
> 全部 safe：只跳到签到页面，不代替你点签到。带地区的条目注明适用省份。
> 部分活动有地域限制或已过期，打不开就把该条忽略。

## 中国移动

### 中国移动_签到有礼
@type urlscheme
@risk safe
@need none
@adb am start -d 'com.greenpoint://android.mc10086.activity?url=https://h.app.coc.10086.cn/activity/transferXcx/index.html?platform=cmcc&path=pages/qwhdmark/views/home/index&appId=8463803521674337'

```text
com.greenpoint://android.mc10086.activity?url=https://h.app.coc.10086.cn/activity/transferXcx/index.html?platform=cmcc&path=pages/qwhdmark/views/home/index&appId=8463803521674337
```

### 中国移动_签到领话费-广东
@type urlscheme
@risk safe
@need none
@adb am start -d 'com.greenpoint://android.mc10086.activity?url=https://gd.10086.cn/gmccapp/confactpage/checkInNew/index.html?channelId=P00000057578'

```text
com.greenpoint://android.mc10086.activity?url=https://gd.10086.cn/gmccapp/confactpage/checkInNew/index.html?channelId=P00000057578
```

### 中国移动_我的秦币-陕西
@type urlscheme
@risk safe
@need none
@adb am start -d 'com.greenpoint://android.mc10086.activity?url=https://sn.clientaccess.10086.cn/html5/sx/eCoinNew/eCoin.html?channelId=P00000061840&si_n=%E7%A7%A6%E5%B8%81%E4%B8%93%E5%8C%BA'

```text
com.greenpoint://android.mc10086.activity?url=https://sn.clientaccess.10086.cn/html5/sx/eCoinNew/eCoin.html?channelId=P00000061840&si_n=%E7%A7%A6%E5%B8%81%E4%B8%93%E5%8C%BA
```

### 中国移动_天天领奖-陕西
@type urlscheme
@risk safe
@need none
@adb am start -d 'com.greenpoint://android.mc10086.activity?url=https://sn.clientaccess.10086.cn/html5/sx/mobileFoot/index.html?channelId=P00000061842&si_n=%E7%A7%BB%E5%8A%A8%E8%B6%B3%E8%BF%B9'

```text
com.greenpoint://android.mc10086.activity?url=https://sn.clientaccess.10086.cn/html5/sx/mobileFoot/index.html?channelId=P00000061842&si_n=%E7%A7%BB%E5%8A%A8%E8%B6%B3%E8%BF%B9
```

### 中国移动_打开指定网址
@type urlscheme
@risk safe
@need none
@param url=目标网址|https://m.sd.10086.cn/
@adb am start -d 'com.greenpoint://android.mc10086.activity?url={url}'

```text
com.greenpoint://android.mc10086.activity?url={url}
```

## 中国移动云盘

### 中国移动云盘_签到领云朵
@type urlscheme
@risk safe
@need none
@adb am start -d 'mcloud://main/webView?params=eyJ0aXRsZSI6IiIsImxpbmtVcmwiOiJodHRwczovL2NhaXl1bi5mZWl4aW4uMTAwODYuY246NzA3MS9wb3J0YWwvbmV3c2lnbmluL2luZGV4Lmh0bWw/c291cmNlaWQ9MTA5NSZ0b2tlbj0jc3NvVG9rZW4jIn0='

```text
mcloud://main/webView?params=eyJ0aXRsZSI6IiIsImxpbmtVcmwiOiJodHRwczovL2NhaXl1bi5mZWl4aW4uMTAwODYuY246NzA3MS9wb3J0YWwvbmV3c2lnbmluL2luZGV4Lmh0bWw/c291cmNlaWQ9MTA5NSZ0b2tlbj0jc3NvVG9rZW4jIn0=
```

## 联通营业厅

### 联通营业厅_签到
@type urlscheme
@risk safe
@need none
@adb am start -d 'chinaunicom://?open=%7B%22openType%22:%22url%22,%22openUrl%22:%22https://act.10010.com/SigninApp/signin/querySigninActivity.htm%22%7D'

```text
chinaunicom://?open=%7B%22openType%22:%22url%22,%22openUrl%22:%22https://act.10010.com/SigninApp/signin/querySigninActivity.htm%22%7D
```

### 联通营业厅_转盘抽奖
@type urlscheme
@risk safe
@need none
@adb am start -d 'chinaunicom://?open=%7B%22openUrl%22:%22https://m.client.10010.com/dailylottery/static/textdl/userLogin%22%7D'

```text
chinaunicom://?open=%7B%22openUrl%22:%22https://m.client.10010.com/dailylottery/static/textdl/userLogin%22%7D
```

### 联通营业厅_沃之树
@type urlscheme
@risk safe
@need none
@adb am start -d 'chinaunicom://?open=%7B%22openType%22:%22url%22,%22openUrl%22:%22https://img.client.10010.com/mactivity/woTree/index.html%22%7D'

```text
chinaunicom://?open=%7B%22openType%22:%22url%22,%22openUrl%22:%22https://img.client.10010.com/mactivity/woTree/index.html%22%7D
```

### 联通营业厅_立减金
@type urlscheme
@risk safe
@need none
@adb am start -d 'chinaunicom://?open=%7B%22openType%22:%22url%22,%22openUrl%22:%22https://epay.10010.com/ci-mcss-party-web/clockIn/?bizFrom=226&bizChannelCode=226%22%7D'

```text
chinaunicom://?open=%7B%22openType%22:%22url%22,%22openUrl%22:%22https://epay.10010.com/ci-mcss-party-web/clockIn/?bizFrom=226&bizChannelCode=226%22%7D
```

## 京东金融

### 京东金融_金贴签到
@type urlscheme
@risk safe
@need none
@adb am start -d 'jdmobile://share?jumpType=1&jumpUrl=6859'

```text
jdmobile://share?jumpType=1&jumpUrl=6859
```

### 京东金融_省省卡-领积分
@type urlscheme
@risk safe
@need none
@adb am start -d 'jdmobile://share?jumpType=1&jumpUrl=4797'

```text
jdmobile://share?jumpType=1&jumpUrl=4797
```

### 京东金融_扫一扫
@type urlscheme
@risk safe
@need none
@adb am start -d 'openjdjrapp://com.jd.jrapp/operation/qrscan?jrcontainer=native'

```text
openjdjrapp://com.jd.jrapp/operation/qrscan?jrcontainer=native
```

## 咪咕视频

### 咪咕视频_福利中心-广东移动版
@type urlscheme
@risk safe
@need none
@adb am start -d 'miguvideo://miguvideo?action={"type":"JUMP_H5_BY_WEB_VIEW","params":{"url":"https://m.miguvideo.com/mgs/promotion/subject/province_welfare/prd/index.html?pageId=9e1e1ba9b7a949ed9ed953a95251a3a5"}}'

```text
miguvideo://miguvideo?action={"type":"JUMP_H5_BY_WEB_VIEW","params":{"url":"https://m.miguvideo.com/mgs/promotion/subject/province_welfare/prd/index.html?pageId=9e1e1ba9b7a949ed9ed953a95251a3a5"}}
```

## 王者营地

### 王者营地_签到
@type urlscheme
@risk safe
@need none
@param role=营地角色ID|
@adb am start -d 'smobagamehelper://web?url=https%3A%2F%2Fcamp.qq.com%2Fh5%2Fwebdist%2Fwelfare-center%2Findex.html%3FisNavigationBarHidden%3D1%26mGameId%3D20001%26%23%2Fgame&not_remove_cookie=1&role_id={role}&need_to_add_param_for_normal=1&put_hash_code=1'

```text
smobagamehelper://web?url=https%3A%2F%2Fcamp.qq.com%2Fh5%2Fwebdist%2Fwelfare-center%2Findex.html%3FisNavigationBarHidden%3D1%26mGameId%3D20001%26%23%2Fgame&not_remove_cookie=1&role_id={role}&need_to_add_param_for_normal=1&put_hash_code=1
```

## 奇妙应用

### 奇妙应用_签到
@type activity
@risk safe
@need shell
@component com.magicalstory.AppStore/.user.sign.signActivity
@package com.magicalstory.AppStore
@adb am start -n com.magicalstory.AppStore/.user.sign.signActivity
