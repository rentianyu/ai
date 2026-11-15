# 京东

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 京东（com.jingdong.app.mall）的 URL Scheme 集合，共 122 条，全部是 openapp.jdmobile:// 跳转。
> 设备上装了京东才能唤起；未安装时系统会提示没有可处理的应用。
> 全部 safe：只做页面跳转，不改数据、不执行系统命令。

## 京东

### 京东_打开指定网址
@type urlscheme
@risk safe
@need none
@param url=目标网址|https://m.jd.com
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://m.jd.com"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"{url}"}
```

### 京东_保价中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://msitepp-fm.jd.com/rest/priceprophone/priceProPhoneMenu"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://msitepp-fm.jd.com/rest/priceprophone/priceProPhoneMenu"}
```

### 京东_签到返现
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pb.jd.com/2023/check-cash/"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pb.jd.com/2023/check-cash/"}
```

### 京东_充值中心-签到领充值金
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://mypoint.jd.com/predeem"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://mypoint.jd.com/predeem"}
```

### 京东_京东秒杀-签到领京豆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pro.m.jd.com/mall/active/Md9FMi1pJXg2q7qc8CmE9FNYDS4/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pro.m.jd.com/mall/active/Md9FMi1pJXg2q7qc8CmE9FNYDS4/index.html"}
```

### 京东_双签领奖励
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://m.jr.jd.com/integrate/signin/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://m.jr.jd.com/integrate/signin/index.html"}
```

### 京东_东东农场
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://h5.m.jd.com/pb/015686010/Bc9WX7MpCW7nW9QjZ5N3fFeJXMH/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://h5.m.jd.com/pb/015686010/Bc9WX7MpCW7nW9QjZ5N3fFeJXMH/index.html"}
```

### 京东_京东到家-鲜豆当钱花
@type urlscheme
@risk safe
@desc URL 含 # 分段；若 App 解析截断，把 # 编码为 %23 再试
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://daojia.jd.com/taroh5/h5dist/#/pages/tabBar/signIn-t/index?channel=qiandao_indexball"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://daojia.jd.com/taroh5/h5dist/#/pages/tabBar/signIn-t/index?channel=qiandao_indexball"}
```

### 京东_京东超市-游戏-东东超市
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pro.m.jd.com/mall/active/472hYWPS9d6GP7xtJzsWscXepKZf/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pro.m.jd.com/mall/active/472hYWPS9d6GP7xtJzsWscXepKZf/index.html"}
```

### 京东_服饰美妆-首页可领京豆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://h5.m.jd.com/pb/015261870/3X9hjuZtNuRnYJ9TF5ScqZ5n9ZME/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://h5.m.jd.com/pb/015261870/3X9hjuZtNuRnYJ9TF5ScqZ5n9ZME/index.html"}
```

### 京东_京东国际-首页领京豆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://gmart.jd.com/?channelId=331&appId=11&des=dolphin&dolphinId=11"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://gmart.jd.com/?channelId=331&appId=11&des=dolphin&dolphinId=11"}
```

### 京东_京东拍卖-我的领积分
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://mipaimai.jd.com"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://mipaimai.jd.com"}
```

### 京东_拍拍二手-签到有礼
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/3S28janPLYmtFxypu37AYAGgivfp/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/3S28janPLYmtFxypu37AYAGgivfp/index.html"}
```

### 京东_京东五金城
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/4RYbb8NtVAegmT35SuM2N3KKYLWt/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/4RYbb8NtVAegmT35SuM2N3KKYLWt/index.html"}
```

### 京东_京东图书-签到赢好礼
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html"}
```

### 京东_我的爱车-积分签到
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://m-car.jd.com/housekeeper/task?autoSign=true"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://m-car.jd.com/housekeeper/task?autoSign=true"}
```

### 京东_京东医药馆-京豆签到
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/2KMRByvMg6Z2nwDmQ1StFTtKJc81/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://prodev.m.jd.com/mall/active/2KMRByvMg6Z2nwDmQ1StFTtKJc81/index.html"}
```

### 京东_京东保-天天领权益
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://iu.jr.jd.com/insurance/channel/interest"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://iu.jr.jd.com/insurance/channel/interest"}
```

### 京东_摇京豆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://spa.jd.com"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://spa.jd.com"}
```

### 京东_我的-签到领京豆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pro.m.jd.com/mall/active/43mNbs4F53FUMVin65VHVYYKB94f/index.html"}'

```text
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://pro.m.jd.com/mall/active/43mNbs4F53FUMVin65VHVYYKB94f/index.html"}
```

### 京东_频道-京东快递
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://kd.jd.com/express/index.html?source=appMyChannel&collectionId=490"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://kd.jd.com/express/index.html?source=appMyChannel&collectionId=490"}
```

### 京东_频道-借钱
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://mjt.jd.com/jintiao-credit/account/index.html?sysCode=s2&sourceLink=c2&collectionId=325"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://mjt.jd.com/jintiao-credit/account/index.html?sysCode=s2&sourceLink=c2&collectionId=325"}
```

### 京东_频道-爱回收
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://huishou.m.jd.com/?entryid=p004JDshouyeicon&collectionId=339"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://huishou.m.jd.com/?entryid=p004JDshouyeicon&collectionId=339"}
```

### 京东_频道-充值中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://txsm-m.jd.com/?babelChannel=ttt10&collectionId=795"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://txsm-m.jd.com/?babelChannel=ttt10&collectionId=795"}
```

### 京东_频道-京东家政
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3EYmEmYNatvDd2JXLYxH5Rm9hxjJ/index.html?babelChannel=ttt6&collectionId=1169"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3EYmEmYNatvDd2JXLYxH5Rm9hxjJ/index.html?babelChannel=ttt6&collectionId=1169"}
```

### 京东_频道-京东到家
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"channel_name":"from_jdapp","ishidden":true,"transparentenable":false,"des":"jdreactcommon","appname":"JDReactDaoJia","deprecatedVersion":"8.200","param":{"latitude":"","longitude":""},"modulename":"JDReactDaoJia","category":"jump"}'

```text
openapp.jdmobile://virtual?params={"channel_name":"from_jdapp","ishidden":true,"transparentenable":false,"des":"jdreactcommon","appname":"JDReactDaoJia","deprecatedVersion":"8.200","param":{"latitude":"","longitude":""},"modulename":"JDReactDaoJia","category":"jump"}
```

### 京东_频道-京东互医
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=zxys&hy_entry=hos_zxys&collectionId=107"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=zxys&hy_entry=hos_zxys&collectionId=107"}
```

### 京东_频道-护士到家
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=hsdj&babelChannel=ttt1&collectionId=1171"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=hsdj&babelChannel=ttt1&collectionId=1171"}
```

### 京东_频道-京东保
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3i11dVqMyKjD3RdMkj5DsLy4aCur/index.html?collectionId=858"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3i11dVqMyKjD3RdMkj5DsLy4aCur/index.html?collectionId=858"}
```

### 京东_频道-闲置换钱
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://ppjz.m.jd.com/main/personal/center?entryid=p0020035xzgjzzsy&collectionId=484"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://ppjz.m.jd.com/main/personal/center?entryid=p0020035xzgjzzsy&collectionId=484"}
```

### 京东_频道-京东租赁
@type urlscheme
@risk safe
@desc 原素材内层参数引号未转义，此处按 URL 编码修正（%7B%22entrance%22…）
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://mini-app-static.jd.com/apps/mpshare/index.html?category=jump&des=jdmp&vapptype=1&appId=32060CC0A22944F1C172199F831135F2&path=&param=%7B%22entrance%22%3A%22JDAPP_PD_least%22%7D&collectionId=1123"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://mini-app-static.jd.com/apps/mpshare/index.html?category=jump&des=jdmp&vapptype=1&appId=32060CC0A22944F1C172199F831135F2&path=&param=%7B%22entrance%22%3A%22JDAPP_PD_least%22%7D&collectionId=1123"}
```

### 京东_频道-京东延保
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3ppmbV4dHL5jNusoYdN8q5uF4Sg1/index.html?babelChannel=ttt33&collectionId=1126"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3ppmbV4dHL5jNusoYdN8q5uF4Sg1/index.html?babelChannel=ttt33&collectionId=1126"}
```

### 京东_频道-京东房产
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://realestate.m.jd.com/?collectionId=17"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://realestate.m.jd.com/?collectionId=17"}
```

### 京东_频道-京东服务
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://service-home-pro.pf.jd.com/%23%2Fpages%2Findex%2Findex%3Fsource%3D38%3FcollectionId%3D1253?collectionId=1253"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://service-home-pro.pf.jd.com/%23%2Fpages%2Findex%2Findex%3Fsource%3D38%3FcollectionId%3D1253?collectionId=1253"}
```

### 京东_频道-彩票娱乐
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://caipiao.m.jd.com/?collectionId=346"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://caipiao.m.jd.com/?collectionId=346"}
```

### 京东_频道-京东点评
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"JDFluxModule","params":{"fluxType":"page","templateID":"XJI-dianping","hideNavigateBar":"true","scene":"dianping","bizID":"dianping","data":{"pageType":"recommendation","source":"37"}},"category":"jump"}'

```text
openapp.jdmobile://virtual?params={"des":"JDFluxModule","params":{"fluxType":"page","templateID":"XJI-dianping","hideNavigateBar":"true","scene":"dianping","bizID":"dianping","data":{"pageType":"recommendation","source":"37"}},"category":"jump"}
```

### 京东_频道-到家快检
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=djkj&babelChannel=ttt325&collectionId=1135"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=djkj&babelChannel=ttt325&collectionId=1135"}
```

### 京东_频道-酒店
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=hotel&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=13"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=hotel&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=13"}
```

### 京东_频道-火车票
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=train&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=1115"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=train&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=1115"}
```

### 京东_频道-机票
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=flight&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=1141"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=flight&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=1141"}
```

### 京东_频道-景区门票
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=scenic&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=1148"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://lvxing.jd.com/travel/index?initPath=pages/index/index&sourceValue=APPICON&businessType=scenic&jdreactkey=JDReactTravelChannel&jdreactapp=JDReactTravelChannel&transparentenable=true&jdreactAppendPath=travel/index&collectionId=1148"}
```

### 京东_频道-领券中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/VAjs3vpayA513UwxL5XC4eGBXqY/index.html?babelChannel=ttt21&linkArea=lingquan&mTabId=2LcucMHYX7aXz92Qh7JBHBo6DACH&linkTabId=ed6ac10204357d124ab6d1daa2cdd5a3&linkTopTab=best&has_native=0&collectionId=1092"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/VAjs3vpayA513UwxL5XC4eGBXqY/index.html?babelChannel=ttt21&linkArea=lingquan&mTabId=2LcucMHYX7aXz92Qh7JBHBo6DACH&linkTabId=ed6ac10204357d124ab6d1daa2cdd5a3&linkTopTab=best&has_native=0&collectionId=1092"}
```

### 京东_频道-秒杀
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Md9FMi1pJXg2q7qc8CmE9FNYDS4/index.html?commontitle=no&transparent=1&has_native=0&hybrid_err_view=1&hideNavi=1&actSecTraffic=1&babelChannel=ttt1&mTabId=Md9FMi1pJXg2q7qc8CmE9FNYDS4&linkTag=miaosha&collectionId=1087"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Md9FMi1pJXg2q7qc8CmE9FNYDS4/index.html?commontitle=no&transparent=1&has_native=0&hybrid_err_view=1&hideNavi=1&actSecTraffic=1&babelChannel=ttt1&mTabId=Md9FMi1pJXg2q7qc8CmE9FNYDS4&linkTag=miaosha&collectionId=1087"}
```

### 京东_频道-月黑风高
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/288wUsJsGP2YXwnBaVekVkj3PKRB/index.html?babelChannel=ttt34&has_native=0&jwebprog=0&hybrid_err_view=1&transparent=1&collectionId=1138"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/288wUsJsGP2YXwnBaVekVkj3PKRB/index.html?babelChannel=ttt34&has_native=0&jwebprog=0&hybrid_err_view=1&transparent=1&collectionId=1138"}
```

### 京东_频道-京东校园
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3B6CgwugAyBR67P3MSNhykj5Eqyr/index.html?babelChannel=ttt11&mTabId=3B6CgwugAyBR67P3MSNhykj5Eqyr&collectionId=127"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3B6CgwugAyBR67P3MSNhykj5Eqyr/index.html?babelChannel=ttt11&mTabId=3B6CgwugAyBR67P3MSNhykj5Eqyr&collectionId=127"}
```

### 京东_频道-夺宝岛
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://dbd.m.jd.com/ppdbd/paimai?mTabId=244pVabo1RL3DZeDTJKG3tdHwfKp&linkTabId=216fc05d2c8ec5ac068de9130ffb62f0&collectionId=423"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://dbd.m.jd.com/ppdbd/paimai?mTabId=244pVabo1RL3DZeDTJKG3tdHwfKp&linkTabId=216fc05d2c8ec5ac068de9130ffb62f0&collectionId=423"}
```

### 京东_频道-试用领取
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/G7sQ92vWSBsTHzk4e953qUGWQJ4/index.html?babelChannel=ttt63&has_native=0&father=tj&mTabId=2LcucMHYX7aXz92Qh7JBHBo6DACH&linkTabId=ddf8145746688c1c184e84718d8a65de&collectionId=337"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/G7sQ92vWSBsTHzk4e953qUGWQJ4/index.html?babelChannel=ttt63&has_native=0&father=tj&mTabId=2LcucMHYX7aXz92Qh7JBHBo6DACH&linkTabId=ddf8145746688c1c184e84718d8a65de&collectionId=337"}
```

### 京东_频道-PLUS会员
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://plus.m.jd.com/index?flow_system=appsyicon&collectionId=356"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://plus.m.jd.com/index?flow_system=appsyicon&collectionId=356"}
```

### 京东_频道-京东拍卖
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/244pVabo1RL3DZeDTJKG3tdHwfKp/index.html?babelChannel=ttt18&has_native=0&jwebprog=0&hybrid_err_view=1&transparent=1&collectionId=1104"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/244pVabo1RL3DZeDTJKG3tdHwfKp/index.html?babelChannel=ttt18&has_native=0&jwebprog=0&hybrid_err_view=1&transparent=1&collectionId=1104"}
```

### 京东_频道-京喜自营
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2iqSwv1JiDHxAkHAikfU6XAECFmo/index.html?babelChannel=ttt2&collectionId=1081"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2iqSwv1JiDHxAkHAikfU6XAECFmo/index.html?babelChannel=ttt2&collectionId=1081"}
```

### 京东_频道-大牌奥莱
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2aRK8YxJGhgc1gEnXLJPhT6KodXd/index.html?babelChannel=ttt51&collectionId=1028"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2aRK8YxJGhgc1gEnXLJPhT6KodXd/index.html?babelChannel=ttt51&collectionId=1028"}
```

### 京东_频道-省钱卡
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://mcard.jd.com/?cardIdEnc=_vxHkMHQS98=&channel=99&collectionId=1163"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://mcard.jd.com/?cardIdEnc=_vxHkMHQS98=&channel=99&collectionId=1163"}
```

### 京东_频道-黑色星期五
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/JAjtcpqK8RDvB8A4k1ZBgViBKAL/index.html?babelChannel=ttt3&collectionId=1177"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/JAjtcpqK8RDvB8A4k1ZBgViBKAL/index.html?babelChannel=ttt3&collectionId=1177"}
```

### 京东_频道-京东指数
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3XzyjnTW4gbEk1BMxafkjP9QEKRw/index.html?has_native=0&jwebprog=0&hybrid_err_view=1&transparent=1&hideNavi=1&babelChannel=gdpd&collectionId=1147"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3XzyjnTW4gbEk1BMxafkjP9QEKRw/index.html?has_native=0&jwebprog=0&hybrid_err_view=1&transparent=1&hideNavi=1&babelChannel=gdpd&collectionId=1147"}
```

### 京东_频道-新店特惠
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/MdfUo5eixn3idv3q5vGztn26q8D/index.html?babelChannel=ttt14&collectionId=1165"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/MdfUo5eixn3idv3q5vGztn26q8D/index.html?babelChannel=ttt14&collectionId=1165"}
```

### 京东_频道-政府消费券
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Mue8EAzU34wYtHjJfG3PLiKL3UK/index.html?babelChannel=ttt5&collectionId=1158"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Mue8EAzU34wYtHjJfG3PLiKL3UK/index.html?babelChannel=ttt5&collectionId=1158"}
```

### 京东_频道-企业购
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://b.jd.com?babelChannel=ttt33&collectionId=814"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://b.jd.com?babelChannel=ttt33&collectionId=814"}
```

### 京东_频道-超级品类日
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2vMm8pcZtBFE6y2LzXMPxC5uDRxy/index.html?babelChannel=ttt5&has_native=0&collectionId=1182"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2vMm8pcZtBFE6y2LzXMPxC5uDRxy/index.html?babelChannel=ttt5&has_native=0&collectionId=1182"}
```

### 京东_频道-司法拍卖
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pmthr.m.jd.com/dynamic?page=dynamic&appletsCode=judicature_search_home&pageParam=judicature_search_home&transparentenable=true&jdreactkey=JDReactPaimaiIndexThree&jdreactapp=JDReactPaimaiIndexThree&showPartModule=0001&mTabId=244pVabo1RL3DZeDTJKG3tdHwfKp&linkTabId=7d05aafa2b4c022c008c9925d723a6dc&collectionId=16"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pmthr.m.jd.com/dynamic?page=dynamic&appletsCode=judicature_search_home&pageParam=judicature_search_home&transparentenable=true&jdreactkey=JDReactPaimaiIndexThree&jdreactapp=JDReactPaimaiIndexThree&showPartModule=0001&mTabId=244pVabo1RL3DZeDTJKG3tdHwfKp&linkTabId=7d05aafa2b4c022c008c9925d723a6dc&collectionId=16"}
```

### 京东_频道-超级品牌日
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/aTabxik68A1NAR5J3MQtBpznEwe/index.html?babelChannel=ttt5&collectionId=1181"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/aTabxik68A1NAR5J3MQtBpznEwe/index.html?babelChannel=ttt5&collectionId=1181"}
```

### 京东_频道-青绿计划
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/48Zx48k57A8mNYfsc3p7QtyV2DaW/index.html?babelChannel=ttt33&collectionId=1205"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/48Zx48k57A8mNYfsc3p7QtyV2DaW/index.html?babelChannel=ttt33&collectionId=1205"}
```

### 京东_频道-赚红包
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/B2Y13x641hwWfpsoRenCzfbz4jR/index.html?babelChannel=ttt12&lbzd=syic&collectionId=1110"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/B2Y13x641hwWfpsoRenCzfbz4jR/index.html?babelChannel=ttt12&lbzd=syic&collectionId=1110"}
```

### 京东_频道-东东农场
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/42HV4J3Q87B2xFQMJk81PCc1mEs3/index.html?babelChannel=ttt6&ylfj=sybbx&hdFrom=homePage&wegameChannel=1088&collectionId=1088"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/42HV4J3Q87B2xFQMJk81PCc1mEs3/index.html?babelChannel=ttt6&ylfj=sybbx&hdFrom=homePage&wegameChannel=1088&collectionId=1088"}
```

### 京东_频道-种豆得豆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4Gck3RiwkxFEyA9ztVmQ2zwqjNRr/index.html?babelChannel=ttt24&source=baibaoxiang&collectionId=482"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4Gck3RiwkxFEyA9ztVmQ2zwqjNRr/index.html?babelChannel=ttt24&source=baibaoxiang&collectionId=482"}
```

### 京东_频道-互动游戏
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3fcyrvLZALNPWCEDRvaZJVrzek8v/index.html?babelChannel=ttt10&jwebprog=0&hybrid_err_view=1&transparent=1&commontitle=no&disablePageSticky=1&collectionId=527"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3fcyrvLZALNPWCEDRvaZJVrzek8v/index.html?babelChannel=ttt10&jwebprog=0&hybrid_err_view=1&transparent=1&commontitle=no&disablePageSticky=1&collectionId=527"}
```

### 京东_频道-欢乐挖宝
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Bkfj1KTXRrTkmpwkQsmRf33WZbC/index.html?babelChannel=ttt2&collectionId=1080"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Bkfj1KTXRrTkmpwkQsmRf33WZbC/index.html?babelChannel=ttt2&collectionId=1080"}
```

### 京东_频道-扭蛋商店
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://h5platform.jd.com/swm-stable/best-lottery/index?activityId=SlbRWDE8_mab-pNf0pArNw&channel=jijianbaibaoxiang&collectionId=1108"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://h5platform.jd.com/swm-stable/best-lottery/index?activityId=SlbRWDE8_mab-pNf0pArNw&channel=jijianbaibaoxiang&collectionId=1108"}
```

### 京东_频道-京东小游戏
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/41D8A8L5aMNPg9TstWamSHnKzj1i/index.html?babelChannel=ttt2&collectionId=345"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/41D8A8L5aMNPg9TstWamSHnKzj1i/index.html?babelChannel=ttt2&collectionId=345"}
```

### 京东_频道-单单返
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4YiRqCY2XNy1LMtiYSZHd9Wbj2Fc/index.html?babelChannel=ttt11&collectionId=1175"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4YiRqCY2XNy1LMtiYSZHd9Wbj2Fc/index.html?babelChannel=ttt11&collectionId=1175"}
```

### 京东_频道-微乐掼蛋
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://miniapp-fe.jd.com/myshare?category=jump&des=jdmp&vapptype=201&appId=3BA89DA9D21DFEBEBC4A3BC87ADB22BF&scene=oygyg6&collectionId=1173"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://miniapp-fe.jd.com/myshare?category=jump&des=jdmp&vapptype=201&appId=3BA89DA9D21DFEBEBC4A3BC87ADB22BF&scene=oygyg6&collectionId=1173"}
```

### 京东_频道-二手手机
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3cH14YvzzeJEicxrjzhz1JqE9jgK/index.html?babelChannel=ttt5&collectionId=1015"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3cH14YvzzeJEicxrjzhz1JqE9jgK/index.html?babelChannel=ttt5&collectionId=1015"}
```

### 京东_频道-拍拍二手
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://prodev.m.jd.com/mall/active/LHGZv1DrGkva1jNpUkKFuNFN6oo/index.html?babelChannel=ttt54&collectionId=372"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://prodev.m.jd.com/mall/active/LHGZv1DrGkva1jNpUkKFuNFN6oo/index.html?babelChannel=ttt54&collectionId=372"}
```

### 京东_频道-京东超市
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3xhqjGH1wMz5FaMgrfYhR22sFvqz/index.html?babelChannel=ttt9&showhead=no&forceCurrentView=1&collectionId=112"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3xhqjGH1wMz5FaMgrfYhR22sFvqz/index.html?babelChannel=ttt9&showhead=no&forceCurrentView=1&collectionId=112"}
```

### 京东_频道-京东生鲜
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4P9a2T9osR9JvtzHVaYTPvsecRtg/index.html?babelChannel=ttt128&collectionId=110"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4P9a2T9osR9JvtzHVaYTPvsecRtg/index.html?babelChannel=ttt128&collectionId=110"}
```

### 京东_频道-零食广场
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4P6FHPYc6G8MYwTcfvVUh2TFVKMb/index.html?collectionId=1134"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4P6FHPYc6G8MYwTcfvVUh2TFVKMb/index.html?collectionId=1134"}
```

### 京东_频道-母婴馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3BbAVGQPDd6vTyHYjmAutXrKAos6/index.html?babelChannel=ttt128&collectionId=87"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3BbAVGQPDd6vTyHYjmAutXrKAos6/index.html?babelChannel=ttt128&collectionId=87"}
```

### 京东_频道-千县名品
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4ALmfmbiWhZJngrTur8ejcRg7pkw/index.html?collectionId=671"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4ALmfmbiWhZJngrTur8ejcRg7pkw/index.html?collectionId=671"}
```

### 京东_频道-个护馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/NJ1kd1PJWhwvhtim73VPsD1HwY3/index.html?babelChannel=ttt60&collectionId=294"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/NJ1kd1PJWhwvhtim73VPsD1HwY3/index.html?babelChannel=ttt60&collectionId=294"}
```

### 京东_频道-宠物馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2TY2j1yJ9T2QKiQekTpHgvv68HiD/index.html?babelChannel=ttt4&collectionId=98"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2TY2j1yJ9T2QKiQekTpHgvv68HiD/index.html?babelChannel=ttt4&collectionId=98"}
```

### 京东_频道-玩具市集
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2Nw9CkhyTNNKbCzmQrRK2g4YXS8i/index.html?babelChannel=ttt62&collectionId=595"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2Nw9CkhyTNNKbCzmQrRK2g4YXS8i/index.html?babelChannel=ttt62&collectionId=595"}
```

### 京东_频道-中外名酒
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2wL7uXM3xzhMDahJQ6htaietQpNf/index.html?mTabId=2wL7uXM3xzhMDahJQ6htaietQpNf&babelChannel=ttt1&collectionId=99"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2wL7uXM3xzhMDahJQ6htaietQpNf/index.html?mTabId=2wL7uXM3xzhMDahJQ6htaietQpNf&babelChannel=ttt1&collectionId=99"}
```

### 京东_频道-看病买药
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&sourceType=JDAPP_Kingkong_KBGY&collectionId=324"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&sourceType=JDAPP_Kingkong_KBGY&collectionId=324"}
```

### 京东_频道-家庭常备药
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=zphy&babelChannel=ttt1&collectionId=327"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=zphy&babelChannel=ttt1&collectionId=327"}
```

### 京东_频道-医疗器械馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=ylqx&babelChannel=ttt2&collectionId=839"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=ylqx&babelChannel=ttt2&collectionId=839"}
```

### 京东_频道-滋补保健馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=yyjk&babelChannel=ttt13&collectionId=1005"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://jdhm.jd.com/jdhhome/?jdreactkey=JDReactJdhHome&jdreactapp=JDReactJdhHome&rn_transparentenable=true&disableReuse=true&chl=yyjk&babelChannel=ttt13&collectionId=1005"}
```

### 京东_频道-五金城
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4RYbb8NtVAegmT35SuM2N3KKYLWt/index.html?babelChannel=ttt94&collectionId=587"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4RYbb8NtVAegmT35SuM2N3KKYLWt/index.html?babelChannel=ttt94&collectionId=587"}
```

### 京东_频道-元器件
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/AhWKs5fDLsyokTzhEWXDDgubaho/index.html?babelChannel=ttt8&collectionId=1106"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/AhWKs5fDLsyokTzhEWXDDgubaho/index.html?babelChannel=ttt8&collectionId=1106"}
```

### 京东_频道-买车养车
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/dj6us2JJRLMMBb4iDaSK4wxvBMt/index.html?babelChannel=ttt121&mTabId=dj6us2JJRLMMBb4iDaSK4wxvBMt&collectionId=102"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/dj6us2JJRLMMBb4iDaSK4wxvBMt/index.html?babelChannel=ttt121&mTabId=dj6us2JJRLMMBb4iDaSK4wxvBMt&collectionId=102"}
```

### 京东_频道-车管家
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3YuyYxHyTeQ2ehN9pwcTaLwEqeGz/index.html?babelChannel=ttt2&mTabId=dj6us2JJRLMMBb4iDaSK4wxvBMt&collectionId=300"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3YuyYxHyTeQ2ehN9pwcTaLwEqeGz/index.html?babelChannel=ttt2&mTabId=dj6us2JJRLMMBb4iDaSK4wxvBMt&collectionId=300"}
```

### 京东_频道-京东家居馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/FxaS5JGmuJH65DB4HxF7rCRRewb/index.html?babelChannel=ttt32&collectionId=224"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/FxaS5JGmuJH65DB4HxF7rCRRewb/index.html?babelChannel=ttt32&collectionId=224"}
```

### 京东_频道-家装馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/41BQuviAya92UJVSJQ1TGb1LA7wv/index.html?babelChannel=ttt58&collectionId=1016"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/41BQuviAya92UJVSJQ1TGb1LA7wv/index.html?babelChannel=ttt58&collectionId=1016"}
```

### 京东_频道-家电家居
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2H8G6a7JecjqHH3t1ZWSoJjPtziP/index.html?babelChannel=ttt15&hybrid=0&forceCurrentView=1&collectionId=979"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2H8G6a7JecjqHH3t1ZWSoJjPtziP/index.html?babelChannel=ttt15&hybrid=0&forceCurrentView=1&collectionId=979"}
```

### 京东_频道-家电馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/48v7Xzb3FfKt6mKgMaS9EoHrvieE/index.html?babelChannel=ttt15&collectionId=123"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/48v7Xzb3FfKt6mKgMaS9EoHrvieE/index.html?babelChannel=ttt15&collectionId=123"}
```

### 京东_频道-设计家
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3Pca9e8b3PYKHCEyf6ZkXB3HvAL6/index.html?babelChannel=ttt8&collectionId=1186"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3Pca9e8b3PYKHCEyf6ZkXB3HvAL6/index.html?babelChannel=ttt8&collectionId=1186"}
```

### 京东_频道-家具馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/UfTGu5CiZAwA1WsxApZK8bf4w3U/index.html?babelChannel=ttt26&collectionId=1168"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/UfTGu5CiZAwA1WsxApZK8bf4w3U/index.html?babelChannel=ttt26&collectionId=1168"}
```

### 京东_频道-厨房用品
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/FEtAd86BW8TpiRKshRZX8PPEjpo/index.html?babelChannel=ttt137&collectionId=1176"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/FEtAd86BW8TpiRKshRZX8PPEjpo/index.html?babelChannel=ttt137&collectionId=1176"}
```

### 京东_频道-京东图书
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3u1Q7ZjCfQKrRb52c623WNf3Cjz5/index.html?collectionId=92"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3u1Q7ZjCfQKrRb52c623WNf3Cjz5/index.html?collectionId=92"}
```

### 京东_频道-电子教育
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4ZJ33KDLjorci3yTeGfmBBGFuhZY/index.html?babelChannel=ttt36&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1116"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4ZJ33KDLjorci3yTeGfmBBGFuhZY/index.html?babelChannel=ttt36&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1116"}
```

### 京东_频道-文具三点半
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/LVGabVektWEhYzpn2eYmxznF7TC/index.html?babelChannel=ttt125&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1086"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/LVGabVektWEhYzpn2eYmxznF7TC/index.html?babelChannel=ttt125&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1086"}
```

### 京东_频道-装机大师
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2PwrQpaPntHCpRRMU8j8CPJAwnLk/index.html?babelChannel=ttt63&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1100"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2PwrQpaPntHCpRRMU8j8CPJAwnLk/index.html?babelChannel=ttt63&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1100"}
```

### 京东_频道-手机数码
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/8tHNdJLcqwqhkLNA8hqwNRaNu5f/index.html?babelChannel=ttt65&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=450"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/8tHNdJLcqwqhkLNA8hqwNRaNu5f/index.html?babelChannel=ttt65&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=450"}
```

### 京东_频道-赚话费
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://prodev.m.jd.com/mall/active/eEcYM32eezJB7YX4SBihziJCiGV/index.html?collectionId=602"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://prodev.m.jd.com/mall/active/eEcYM32eezJB7YX4SBihziJCiGV/index.html?collectionId=602"}
```

### 京东_频道-电脑馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/31XPWPTonxJ9e5YoQ85HS7z8XNYQ/index.html?babelChannel=ttt127&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=91"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/31XPWPTonxJ9e5YoQ85HS7z8XNYQ/index.html?babelChannel=ttt127&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=91"}
```

### 京东_频道-手机馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Y9FVe619hMoajzqpxky1CQQJAkk/index.html?babelChannel=ttt112&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1007"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/Y9FVe619hMoajzqpxky1CQQJAkk/index.html?babelChannel=ttt112&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1007"}
```

### 京东_频道-配件馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2GxAwsimbvmrjpZyjp3XfP3huqKA/index.html?babelChannel=ttt58&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1044"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2GxAwsimbvmrjpZyjp3XfP3huqKA/index.html?babelChannel=ttt58&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1044"}
```

### 京东_频道-京补合约
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2z3JUgUQU3mR936PYv4WDXuSmVUD/index.html?babelChannel=ttt7&collectionId=1073"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2z3JUgUQU3mR936PYv4WDXuSmVUD/index.html?babelChannel=ttt7&collectionId=1073"}
```

### 京东_频道-游戏电竞
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/bvNYnFjp84WgX5sufkKehdv84zq/index.html?babelChannel=ttt94&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=473"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/bvNYnFjp84WgX5sufkKehdv84zq/index.html?babelChannel=ttt94&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=473"}
```

### 京东_频道-AI装备馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3skw64E2o8zoGcqm41gsewXHgdvR/index.html?babelChannel=ttt62&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1189"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3skw64E2o8zoGcqm41gsewXHgdvR/index.html?babelChannel=ttt62&mTabId=8tHNdJLcqwqhkLNA8hqwNRaNu5f&collectionId=1189"}
```

### 京东_频道-全球购
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/31Uc4WHxxTYHSvUFBugmfk75LVUh/index.html?collectionId=331"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/31Uc4WHxxTYHSvUFBugmfk75LVUh/index.html?collectionId=331"}
```

### 京东_频道-排行榜
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2AtWT3nUsYKt9uXycPVMG8XAM9fA/index.html?siteClient=wh5&siteClientVersion=2.0.0&tabId=1&subTabType=1&queryType=1&pageNum=1&tabType=1&transparent=1&hybrid_err_view=1&jwebprog=0&babelChannel=ttt1&collectionId=355"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2AtWT3nUsYKt9uXycPVMG8XAM9fA/index.html?siteClient=wh5&siteClientVersion=2.0.0&tabId=1&subTabType=1&queryType=1&pageNum=1&tabType=1&transparent=1&hybrid_err_view=1&jwebprog=0&babelChannel=ttt1&collectionId=355"}
```

### 京东_频道-礼品卡
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://o.jd.com/market/marketChannel/index?pageId=2&collectionId=338"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://o.jd.com/market/marketChannel/index?pageId=2&collectionId=338"}
```

### 京东_频道-京东好礼
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3tuyrzceYdNbDk58hVat3fPRosRa/index.html?babelChannel=ttt161&collectionId=1192"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/3tuyrzceYdNbDk58hVat3fPRosRa/index.html?babelChannel=ttt161&collectionId=1192"}
```

### 京东_频道-京东京造
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/WFJKWrVftPmGdDENfVqJU8BCB5c/index.html?babelChannel=ttt48&mTabId=WFJKWrVftPmGdDENfVqJU8BCB5c&useFoldTab=1&collectionId=1058"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/WFJKWrVftPmGdDENfVqJU8BCB5c/index.html?babelChannel=ttt48&mTabId=WFJKWrVftPmGdDENfVqJU8BCB5c&useFoldTab=1&collectionId=1058"}
```

### 京东_频道-新奇集市
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4Va8jNzzHPqgTUhxwiTn9PHyVZCB/index.html?babelChannel=ttt18&mTabId=3ejBfFZtaQMQ4RYpBxHekmm9vyrs&linkTopTab=new&embedMTab=1&linkArea=xinqi&collectionId=1119"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4Va8jNzzHPqgTUhxwiTn9PHyVZCB/index.html?babelChannel=ttt18&mTabId=3ejBfFZtaQMQ4RYpBxHekmm9vyrs&linkTopTab=new&embedMTab=1&linkArea=xinqi&collectionId=1119"}
```

### 京东_频道-超级明星
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/42JPPcGwp3RnsaWBEzDUy5gUDLwL/index.html?babelChannel=ttt5&mTabId=3ejBfFZtaQMQ4RYpBxHekmm9vyrs&collectionId=1206"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/42JPPcGwp3RnsaWBEzDUy5gUDLwL/index.html?babelChannel=ttt5&mTabId=3ejBfFZtaQMQ4RYpBxHekmm9vyrs&collectionId=1206"}
```

### 京东_频道-好面料
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2BUf17BQpG4e6th1BGmdLkzrWnEP/index.html?babelChannel=ttt2&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=1202"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2BUf17BQpG4e6th1BGmdLkzrWnEP/index.html?babelChannel=ttt2&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=1202"}
```

### 京东_频道-服饰美妆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/jgwurvXVswT7VFuX4S5DG2aaK1T/index.html?babelChannel=ttt1&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=842"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/jgwurvXVswT7VFuX4S5DG2aaK1T/index.html?babelChannel=ttt1&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=842"}
```

### 京东_频道-美妆馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2kmaPNrGDNYo1LKwYtRoaSmsgbj6/index.html?mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&babelChannel=ttt179&collectionId=96"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2kmaPNrGDNYo1LKwYtRoaSmsgbj6/index.html?mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&babelChannel=ttt179&collectionId=96"}
```

### 京东_频道-运动户外馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/oKAAQpTfmbKWmL338JdgxNDeWK2/index.html?mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&babelChannel=ttt164&collectionId=30"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/oKAAQpTfmbKWmL338JdgxNDeWK2/index.html?mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&babelChannel=ttt164&collectionId=30"}
```

### 京东_频道-服饰鞋帽
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/32EphPL81Mb6FD4qLCTtYmd31YXr/index.html?mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&babelChannel=ttt189&collectionId=1038"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/32EphPL81Mb6FD4qLCTtYmd31YXr/index.html?mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&babelChannel=ttt189&collectionId=1038"}
```

### 京东_频道-奢品馆
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2bkTvuyAtEZS8bq8i3AKzYq54EqT/index.html?babelChannel=ttt139&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=823"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/2bkTvuyAtEZS8bq8i3AKzYq54EqT/index.html?babelChannel=ttt139&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=823"}
```

### 京东_频道-潮流穿搭
@type urlscheme
@risk safe
@need none
@adb am start -d 'openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4YuYknr4wiV3j4DvVDzjzgFM4RBd/index.html?babelChannel=ttt2&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=1159"}'

```text
openapp.jdmobile://virtual?params={"des":"guanzhu","category":"jump","url":"https://pro.m.jd.com/mall/active/4YuYknr4wiV3j4DvVDzjzgFM4RBd/index.html?babelChannel=ttt2&mTabId=jgwurvXVswT7VFuX4S5DG2aaK1T&collectionId=1159"}
```
