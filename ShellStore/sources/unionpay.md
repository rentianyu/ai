# 云闪付

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 云闪付（com.unionpay）的 upwallet:// URL Scheme 集合，共 21 条。
> 设备上装了云闪付才能唤起；未安装时系统会提示没有可处理的应用。
> 全部 safe：只做页面跳转，不改数据、不执行系统命令。

## 云闪付

### 云闪付_扫一扫
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://native/scanCode'

```text
upwallet://native/scanCode
```

### 云闪付_付款码
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://native/codepay'

```text
upwallet://native/codepay
```

### 云闪付_打开指定网址
@type urlscheme
@risk safe
@need none
@param url=目标网址|https://youhui.95516.com/
@adb am start -d 'upwallet://applet?encryptAppId=472741b326b7bb5c&toLink=https://youhui.95516.com/'

```text
upwallet://applet?encryptAppId=472741b326b7bb5c&toLink={url}
```

### 云闪付_银联有礼乐开花
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://applet?encryptAppId=472741b326b7bb5c&toLink=https://benefits.95516.com/upbms-web/customActivities/seasonalPrize/progress/36662'

```text
upwallet://applet?encryptAppId=472741b326b7bb5c&toLink=https://benefits.95516.com/upbms-web/customActivities/seasonalPrize/progress/36662
```

### 云闪付_签到
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://applet?encryptAppId=472741b326b7bb5c&toLink=https://youhui.95516.com/newsign/public/app/index.html'

```text
upwallet://applet?encryptAppId=472741b326b7bb5c&toLink=https://youhui.95516.com/newsign/public/app/index.html
```

### 云闪付_领积点页面
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://applet?encryptAppId=472741b326b7bb5c&toLink=https://cloudvip.95516.com/&partnerId=86e1fc9a2f234b1597cfcaa45c9e9512'

```text
upwallet://applet?encryptAppId=472741b326b7bb5c&toLink=https://cloudvip.95516.com/&partnerId=86e1fc9a2f234b1597cfcaa45c9e9512
```

### 云闪付_余额查询
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rncardbalance'

```text
upwallet://rn/rncardbalance
```

### 云闪付_一键绑卡
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rnbindCard'

```text
upwallet://rn/rnbindCard
```

### 云闪付_卡包
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rncardmanage'

```text
upwallet://rn/rncardmanage
```

### 云闪付_信用卡还款
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rncredit'

```text
upwallet://rn/rncredit
```

### 云闪付_出行
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rnhtmlridingcode'

```text
upwallet://rn/rnhtmlridingcode
```

### 云闪付_账单
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rnmybill'

```text
upwallet://rn/rnmybill
```

### 云闪付_我的红包
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rnmyredenvelope'

```text
upwallet://rn/rnmyredenvelope
```

### 云闪付_我的优惠券
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rncouponmycoupon'

```text
upwallet://rn/rncouponmycoupon
```

### 云闪付_奖励中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rnrewardcenter'

```text
upwallet://rn/rnrewardcenter
```

### 云闪付_选择乘车码
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rnopenridingcode'

```text
upwallet://rn/rnopenridingcode
```

### 云闪付_累计已省
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rntotaldiscount'

```text
upwallet://rn/rntotaldiscount
```

### 云闪付_转账
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rntransfer'

```text
upwallet://rn/rntransfer
```

### 云闪付_优惠中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://rn/rncouponcenter'

```text
upwallet://rn/rncouponcenter
```

### 云闪付_添加银行卡
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://native/addcard'

```text
upwallet://native/addcard
```

### 云闪付_会员中心-领积点
@type urlscheme
@risk safe
@need none
@adb am start -d 'upwallet://applet?encryptAppId=472741b326b7bb5c'

```text
upwallet://applet?encryptAppId=472741b326b7bb5c
```
