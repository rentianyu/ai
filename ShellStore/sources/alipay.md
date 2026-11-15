# 支付宝

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 支付宝（com.eg.android.AlipayGphone）的 alipays:// Scheme 与内部 Activity 入口，共 23 条。
> 全部 safe：只做页面跳转。带参数条目需先填值（如蚂蚁森林好友 ID）。

## 支付宝

### 支付宝_公益
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=2018080260797946'

```text
alipays://platformapi/startapp?appId=2018080260797946
```

### 支付宝_运动
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=2019072565980504'

```text
alipays://platformapi/startapp?appId=2019072565980504
```

### 支付宝_爱心捐赠
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=10000009'

```text
alipays://platformapi/startapp?appId=10000009
```

### 支付宝_月捐
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x10340gmnwstnjqqyyde8'

```text
alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x10340gmnwstnjqqyyde8
```

### 支付宝_一帮一
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x18047t1wpgvm0waqd580'

```text
alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x18047t1wpgvm0waqd580
```

### 支付宝_益起捐
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x12637whyvhnymugpuhfb'

```text
alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x12637whyvhnymugpuhfb
```

### 支付宝_紧急救助
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x16434dy4ptonbmcksf17'

```text
alipays://platformapi/startapp?appId=10000009&url=https://qr.alipay.com/s7x16434dy4ptonbmcksf17
```

### 支付宝_蚂蚁森林
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=60000002'

```text
alipays://platformapi/startapp?appId=60000002
```

### 支付宝_蚂蚁庄园
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=66666674'

```text
alipays://platformapi/startapp?appId=66666674
```

### 支付宝_新冠肺炎疫情
@type intent
@risk safe
@need shell
@component com.eg.android.AlipayGphone/com.alipay.mobile.nebulax.integration.mpaas.activity.NebulaActivity$Lite1
@package com.eg.android.AlipayGphone
@flag 0x10000000
@adb am start -n com.eg.android.AlipayGphone/com.alipay.mobile.nebulax.integration.mpaas.activity.NebulaActivity$Lite1

### 支付宝_阿里巴巴链上公益计划
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=2019080166061464'

```text
alipays://platformapi/startapp?appId=2019080166061464
```

### 支付宝_三小时公益
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=2019052265312523'

```text
alipays://platformapi/startapp?appId=2019052265312523
```

### 支付宝_公益林
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=2019042364288308'

```text
alipays://platformapi/startapp?appId=2019042364288308
```

### 支付宝_我的公益人生
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=2019052265312523&url=https://qr.alipay.com/s7x15660aictpisawdsvt59'

```text
alipays://platformapi/startapp?appId=2019052265312523&url=https://qr.alipay.com/s7x15660aictpisawdsvt59
```

### 支付宝_扫一扫
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=10000007'

```text
alipays://platformapi/startapp?appId=10000007
```

### 支付宝_付款码
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=20000056'

```text
alipays://platformapi/startapp?appId=20000056
```

### 支付宝_收款码
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=20000123'

```text
alipays://platformapi/startapp?appId=20000123
```

### 支付宝_打开
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://'

```text
alipays://
```

### 支付宝_主界面
@type activity
@risk safe
@need shell
@component com.eg.android.AlipayGphone/com.eg.android.AlipayGphone.AlipayLogin
@package com.eg.android.AlipayGphone
@adb am start -n com.eg.android.AlipayGphone/com.eg.android.AlipayGphone.AlipayLogin

### 支付宝_支付有礼
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=2060090000298207'

```text
alipays://platformapi/startapp?appId=2060090000298207
```

### 支付宝_打开指定网址
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=10000009&url=https://baidu.com'

```text
alipays://platformapi/startapp?appId=10000009&url=https://baidu.com
```

### 支付宝_指定的好友蚂蚁森林
@type urlscheme
@risk safe
@need none
@param uid=好友ID|1234567890
@adb am start -d 'alipays://platformapi/startapp?saId=10000007&qrcode=https%3A%2F%2F60000002.h5app.alipay.com%2Fwww%2Fhome.html%3FuserId%3D{uid}'

```text
alipays://platformapi/startapp?saId=10000007&qrcode=https%3A%2F%2F60000002.h5app.alipay.com%2Fwww%2Fhome.html%3FuserId%3D{uid}
```

### 支付宝_会员-领积分
@type urlscheme
@risk safe
@need none
@adb am start -d 'alipays://platformapi/startapp?appId=20000160'

```text
alipays://platformapi/startapp?appId=20000160
```
