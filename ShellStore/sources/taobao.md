# 淘宝

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 淘宝（com.taobao.taobao）的 tbopen:// / taobao:// Scheme，共 12 条。
> 扫一扫、识图、价保、淘金币、菜鸟驿站等入口；打开指定网址时若目标页打不开，把网址做一次 URL 编码。
> 全部 safe，只做页面跳转。

## 淘宝

### 淘宝_扫一扫
@type urlscheme
@risk safe
@need none
@adb am start -d 'taobao://tb.cn/n/scancode'

```text
taobao://tb.cn/n/scancode
```

### 淘宝_识图
@type urlscheme
@risk safe
@need none
@adb am start -d 'taobao://h5.m.taobao.com/tusou/recognizer.html'

```text
taobao://h5.m.taobao.com/tusou/recognizer.html
```

### 淘宝_我的淘宝
@type urlscheme
@risk safe
@need none
@adb am start -d 'taobao://i.taobao.com/my_taobao.htm'

```text
taobao://i.taobao.com/my_taobao.htm
```

### 淘宝_价保中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https://pages.tmall.com/wow/z/marketing-tools/mkt/price-center'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https://pages.tmall.com/wow/z/marketing-tools/mkt/price-center
```

### 淘宝_摇福袋领现金
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=3000000074911405'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=3000000074911405
```

### 淘宝_淘金币
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=3000000084652842'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=3000000084652842
```

### 淘宝_天天领钱
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=3000000089437432'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=3000000089437432
```

### 淘宝_天猫超市-每日签到
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https%3A%2F%2Fpages.tmall.com%2Fwow%2Fan%2Fcs%2Fact%2Fwupr%3Fspm%3Da3204.12691414-newhome.chaoshi-miao-tips.d_top.6ca25885lWNnPK%26wh_pid%3Dprivate-domain%252Fjournalisms-v2'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https%3A%2F%2Fpages.tmall.com%2Fwow%2Fan%2Fcs%2Fact%2Fwupr%3Fspm%3Da3204.12691414-newhome.chaoshi-miao-tips.d_top.6ca25885lWNnPK%26wh_pid%3Dprivate-domain%252Fjournalisms-v2
```

### 淘宝_菜鸟
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=11509317'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https://m.duanqu.com/?_ariver_appid=11509317
```

### 淘宝_菜鸟驿站
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https://pages-fast.m.taobao.com/wow/z/uniapp/1100203/last-mile-fe/m-end-pickup/home'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https://pages-fast.m.taobao.com/wow/z/uniapp/1100203/last-mile-fe/m-end-pickup/home
```

### 淘宝_菜鸟驿站-身份码
@type urlscheme
@risk safe
@need none
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url=https://pages-fast.m.taobao.com/wow/z/uniapp/1100410/last-mile-fe/m-end-identity-code/pickup'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url=https://pages-fast.m.taobao.com/wow/z/uniapp/1100410/last-mile-fe/m-end-identity-code/pickup
```

### 淘宝_打开指定网址
@type urlscheme
@risk safe
@need none
@param url=目标网址|https://m.taobao.com
@adb am start -d 'tbopen://m.taobao.com/tbopen/index.html?h5Url={url}'

```text
tbopen://m.taobao.com/tbopen/index.html?h5Url={url}
```
