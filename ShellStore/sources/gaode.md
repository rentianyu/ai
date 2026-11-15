# 高德地图

@author 小贝塔
@version 2026.11.5
@updated 2026-11-05

> 高德地图（com.autonavi.minimap）的 URL Scheme 集合，共 116 条。
> 设备上装了高德地图才能唤起，未安装时系统会提示没有可处理的应用。
> 全部条目为 safe：只做页面跳转，不改数据、不执行系统命令。

## 高德地图

### 高德地图_回家
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://commute?clearStack=1&dest=home'

```text
amapuri://commute?clearStack=1&dest=home
```

### 高德地图_从这里出发
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://route/plan'

```text
amapuri://route/plan
```

### 高德地图_去公司
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://commute?clearStack=1&dest=corp'

```text
amapuri://commute?clearStack=1&dest=corp
```

### 高德地图_点亮城市
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx?path=path://amap_bundle_mine/src/pages/FootprintPage.page.js&data={"from":"scan","cardName":"city"}'

```text
amapuri://ajx?path=path://amap_bundle_mine/src/pages/FootprintPage.page.js&data={"from":"scan","cardName":"city"}
```

### 高德地图_旅游
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://scenicChannel/ScenicPortal?pathid=maintool&atLeastVersion=5.51.50.46'

```text
amapuri://scenicChannel/ScenicPortal?pathid=maintool&atLeastVersion=5.51.50.46
```

### 高德地图_充电站
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E5%85%85%E7%94%B5%E7%AB%99&chinfo=ch_link_mastermap_toolkit_forward&superid=q_72'

```text
amapuri://search/general?keyword=%E5%85%85%E7%94%B5%E7%AB%99&chinfo=ch_link_mastermap_toolkit_forward&superid=q_72
```

### 高德地图_租车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/carservice/protalPage?bizKey=rental&from=mapicontoolbox'

```text
amapuri://c3/carservice/protalPage?bizKey=rental&from=mapicontoolbox
```

### 高德地图_语音包
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://dialect/home?from=jgq'

```text
amapuri://dialect/home?from=jgq
```

### 高德地图_双旦特惠
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3_lowcode/mid_page?pageId=NDjJVlO2&scenario=assembly.yearEndPromotion&page_from=zhutujingangwei&effectiveVersion=16.05.99&atLeastVersion=22.72.10.23&useList2=true&pageVersion=2&bizKey=hotVenue&middlePageVersion=v2&templateId=promotionVenue&preLogin=%7B%22type%22%3A%22quick%22%7D&needLocation=1'

```text
amapuri://c3_lowcode/mid_page?pageId=NDjJVlO2&scenario=assembly.yearEndPromotion&page_from=zhutujingangwei&effectiveVersion=16.05.99&atLeastVersion=22.72.10.23&useList2=true&pageVersion=2&bizKey=hotVenue&middlePageVersion=v2&templateId=promotionVenue&preLogin=%7B%22type%22%3A%22quick%22%7D&needLocation=1
```

### 高德地图_二手车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E4%BA%8C%E6%89%8B%E8%BD%A6&superid=z_87_96&user_geoobj_range=30000'

```text
amapuri://search/general?keyword=%E4%BA%8C%E6%89%8B%E8%BD%A6&superid=z_87_96&user_geoobj_range=30000
```

### 高德地图_我的店铺
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?hide_title=1&url=https%3A%2F%2Fmp.amap.com%2Fgd-h5%2Fmp-mono-shop-mng%2FshopList%3Fpha_manifest%3Dtrue%26redirect%3Damapuri%253A%252F%252Famap_bundle_small_biz%252Fsmall_biz_index%26channelSource%3Djingangwei'

```text
amapuri://webview/amaponline?hide_title=1&url=https%3A%2F%2Fmp.amap.com%2Fgd-h5%2Fmp-mono-shop-mng%2FshopList%3Fpha_manifest%3Dtrue%26redirect%3Damapuri%253A%252F%252Famap_bundle_small_biz%252Fsmall_biz_index%26channelSource%3Djingangwei
```

### 高德地图_代驾
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://sharedtrip/taxi/driving/openDrivingIndex?data={"sourceApplication":"amaptoolbox"}'

```text
amapuri://sharedtrip/taxi/driving/openDrivingIndex?data={"sourceApplication":"amaptoolbox"}
```

### 高德地图_美食
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E7%BE%8E%E9%A3%9F&superid=a_23_96'

```text
amapuri://search/general?keyword=%E7%BE%8E%E9%A3%9F&superid=a_23_96
```

### 高德地图_餐厅订座
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://dining/portalBooking?from=jingang&tracePageId=booking'

```text
amapuri://dining/portalBooking?from=jingang&tracePageId=booking
```

### 高德地图_车主服务
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://tabBarPage?__tab_config=%7B%22name%22%3A%20%22tabs_page_carcenter%22%2C%22ajx_bundles%22%3A%20%5B%22car%22%2C%20%22toolpro%22%5D%2C%22ajxBundles%22%3A%20%5B%22car%22%2C%20%22toolpro%22%5D%2C%22selectedIndex%22%3A%200%7D&from=mapicontoolbox'

```text
amapuri://tabBarPage?__tab_config=%7B%22name%22%3A%20%22tabs_page_carcenter%22%2C%22ajx_bundles%22%3A%20%5B%22car%22%2C%20%22toolpro%22%5D%2C%22ajxBundles%22%3A%20%5B%22car%22%2C%20%22toolpro%22%5D%2C%22selectedIndex%22%3A%200%7D&from=mapicontoolbox
```

### 高德地图_号卡充值
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2Flowcode%2Fh5%2F0nIFVqNP%2Findex.html%3Fgd_from%3Dhaoka&sourceApplication=1&hide_title=0'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2Flowcode%2Fh5%2F0nIFVqNP%2Findex.html%3Fgd_from%3Dhaoka&sourceApplication=1&hide_title=0
```

### 高德地图_新车底价
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/carservice/protalPage?bizKey=auto&isStruct=true&from=shouyejingang'

```text
amapuri://c3/carservice/protalPage?bizKey=auto&isStruct=true&from=shouyejingang
```

### 高德地图_买新能源车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/carservice/protalPage?bizKey=new_car&superid=zhutu'

```text
amapuri://c3/carservice/protalPage?bizKey=new_car&superid=zhutu
```

### 高德地图_秒送
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://sharedtrip/taxi/errands/index?sourceApplication=jgw_amap'

```text
amapuri://sharedtrip/taxi/errands/index?sourceApplication=jgw_amap
```

### 高德地图_高德车市
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/common/standardproducts/selector?categoryId=carBrand&industry=new_car-car_series_detail&page_tactics=11&superid=zhutu'

```text
amapuri://c3/common/standardproducts/selector?categoryId=carBrand&industry=new_car-car_series_detail&page_tactics=11&superid=zhutu
```

### 高德地图_买房租房
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://info/search/house_portal?src=13'

```text
amapuri://info/search/house_portal?src=13
```

### 高德地图_洗车养车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2Flowcode%2Fh5%2FhvdO2m13%2Findex.html%3Fgd_from%3Dzhutuicon&hide_title=1&forbid_show_loading=1&use_net_proxy=1'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2Flowcode%2Fh5%2FhvdO2m13%2Findex.html%3Fgd_from%3Dzhutuicon&hide_title=1&forbid_show_loading=1&use_net_proxy=1
```

### 高德地图_洗牙
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/commonCustomerRetainPage?sceneType=askPrice&sceneTypeParam=%7B%22recallCategory%22%3A%22%E5%8F%A3%E8%85%94%E5%8C%BB%E9%99%A2%7C%E5%8F%A3%E8%85%94%E8%AF%8A%E6%89%80%22%2C%22campaignId%22%3A%2210001795%22%7D&version=v2'

```text
amapuri://c3/commonCustomerRetainPage?sceneType=askPrice&sceneTypeParam=%7B%22recallCategory%22%3A%22%E5%8F%A3%E8%85%94%E5%8C%BB%E9%99%A2%7C%E5%8F%A3%E8%85%94%E8%AF%8A%E6%89%80%22%2C%22campaignId%22%3A%2210001795%22%7D&version=v2
```

### 高德地图_休闲玩乐
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E4%BC%91%E9%97%B2%E5%A8%B1%E4%B9%90'

```text
amapuri://search/general?keyword=%E4%BC%91%E9%97%B2%E5%A8%B1%E4%B9%90
```

### 高德地图_订酒店
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://hotel/portal/new?superid=b_87&transparent=transparent_query_{"page_from":"portal_page_mainicon"}&readHistoryCity=1'

```text
amapuri://hotel/portal/new?superid=b_87&transparent=transparent_query_{"page_from":"portal_page_mainicon"}&readHistoryCity=1
```

### 高德地图_优惠加油
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/carservice/protalPage?searchType=keyword&keywords=加油站&superid=z_87_96'

```text
amapuri://c3/carservice/protalPage?searchType=keyword&keywords=加油站&superid=z_87_96
```

### 高德地图_近视眼科
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx_poi/CustomConsultAdNew?&data=%7B%22campaignid%22%3A%2262239%22%2C%22from%22%3A%22poipage%22%2C%22tTagClass%22%3A%22%E5%BF%A0%E8%AF%9A%22%7D'

```text
amapuri://ajx_poi/CustomConsultAdNew?&data=%7B%22campaignid%22%3A%2262239%22%2C%22from%22%3A%22poipage%22%2C%22tTagClass%22%3A%22%E5%BF%A0%E8%AF%9A%22%7D
```

### 高德地图_发现好车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/carservice/carservicecenterpage?sourceApplication=dynamicUI&NM_MANAGER_SCHEME_PATH=tabBarPage&from=shouyejingang'

```text
amapuri://c3/carservice/carservicecenterpage?sourceApplication=dynamicUI&NM_MANAGER_SCHEME_PATH=tabBarPage&from=shouyejingang
```

### 高德地图_电影
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=电影&superid=z_91_60'

```text
amapuri://search/general?keyword=电影&superid=z_91_60
```

### 高德地图_丽人
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E4%B8%BD%E4%BA%BA'

```text
amapuri://search/general?keyword=%E4%B8%BD%E4%BA%BA
```

### 高德地图_家电维修
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/commonCustomerRetainPage?sceneType=fullPageLead&sceneTypeParam=%7B%22campaignId%22%3A%2210003248%22%7D'

```text
amapuri://c3/commonCustomerRetainPage?sceneType=fullPageLead&sceneTypeParam=%7B%22campaignId%22%3A%2210003248%22%7D
```

### 高德地图_借钱
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2F2021GaodeAwardlist%2FloanGuidancepage.html%3Fgd_from%3Dgaodetuijian&sourceApplication=1&hide_title=0'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2F2021GaodeAwardlist%2FloanGuidancepage.html%3Fgd_from%3Dgaodetuijian&sourceApplication=1&hide_title=0
```

### 高德地图_医美
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E5%8C%BB%E7%BE%8E'

```text
amapuri://search/general?keyword=%E5%8C%BB%E7%BE%8E
```

### 高德地图_问医生
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Ff.amap.com%2Fnew%2Fredirect%3Ffrom%3Damap%26target%3Dhttps%253A%252F%252Falihealth.taobao.com%252Fpre_treatment%252Ffast%252Finquiry%253FchannelCode%253D%2526instanceId%253D%2526serviceRevealCode%253DhTIXXtHUQd%2526menu_code%253D%2526source%253Dalipay_gaode%2526spm%253Dalipay.alipay_gaode.0.0'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Ff.amap.com%2Fnew%2Fredirect%3Ffrom%3Damap%26target%3Dhttps%253A%252F%252Falihealth.taobao.com%252Fpre_treatment%252Ffast%252Finquiry%253FchannelCode%253D%2526instanceId%253D%2526serviceRevealCode%253DhTIXXtHUQd%2526menu_code%253D%2526source%253Dalipay_gaode%2526spm%253Dalipay.alipay_gaode.0.0
```

### 高德地图_景点
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=景点&superid=q_87_153'

```text
amapuri://search/general?keyword=景点&superid=q_87_153
```

### 高德地图_加油充电
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E5%8A%A0%E6%B2%B9%E7%AB%99&superid=a_05&searchInputType=btn'

```text
amapuri://search/general?keyword=%E5%8A%A0%E6%B2%B9%E7%AB%99&superid=a_05&searchInputType=btn
```

### 高德地图_超市
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=超市&superid=q_87_167'

```text
amapuri://search/general?keyword=超市&superid=q_87_167
```

### 高德地图_地图小程序
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?from=tools&sourceFrom=amapTools'

```text
amapuri://workInAmap/entryStatic?from=tools&sourceFrom=amapTools
```

### 高德地图_小程序广场
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workinamap/RealCase?from=tools_mywia'

```text
amapuri://workinamap/RealCase?from=tools_mywia
```

### 高德地图_做旅游攻略
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003120001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_TourismStrategy'

```text
amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003120001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_TourismStrategy
```

### 高德地图_做自驾路线
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000046001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Drive'

```text
amapuri://workInAmap/entryStatic?isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000046001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Drive
```

### 高德地图_多地顺路导
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003122001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_ShopTour'

```text
amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003122001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_ShopTour
```

### 高德地图_共享位置
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000072001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Position'

```text
amapuri://workInAmap/entryStatic?isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000072001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Position
```

### 高德地图_记录钓鱼点
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000042001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Fishing'

```text
amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000042001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Fishing
```

### 高德地图_地图管门店
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003124001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_StoreManagement'

```text
amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003124001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_StoreManagement
```

### 高德地图_门店选址
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003128001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_StoreAddress'

```text
amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003128001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_StoreAddress
```

### 高德地图_共享轨迹
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000166001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_guiji'

```text
amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010000166001&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_guiji
```

### 高德地图_地图找客户
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003124003&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Outsidework'

```text
amapuri://workInAmap/entryStatic?&isIgnoreIntro=true&forceIgnoreIntroPage=true&forceAutoCreate=true&templateId=10000001010003124003&sourceScene=10&from=tools_template&sourceFrom=amapTools&utFrom=amapTools_Outsidework
```

### 高德地图_驾车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://routePlan/home?t=0'

```text
amapuri://routePlan/home?t=0
```

### 高德地图_新能源导航
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://routePlan/home?t=12'

```text
amapuri://routePlan/home?t=12
```

### 高德地图_驾车巡航
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://edog/home?from=recommendtool'

```text
amapuri://edog/home?from=recommendtool
```

### 高德地图_货车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://routePlan/home?t=7'

```text
amapuri://routePlan/home?t=7
```

### 高德地图_摩托车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://routePlan/home?t=11'

```text
amapuri://routePlan/home?t=11
```

### 高德地图_公交
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://routePlan/home?t=1&netAcc={"path":"amapservice://amap_bundle_realbus/RequestScheduleService","requestKeys":"basemapRouteNearBus"}'

```text
amapuri://routePlan/home?t=1&netAcc={"path":"amapservice://amap_bundle_realbus/RequestScheduleService","requestKeys":"basemapRouteNearBus"}
```

### 高德地图_实时公交
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://realtimeBus/home?netAcc={"path":"amapservice://amap_bundle_realbus/RequestScheduleService","requestKeys":"busStation"}&from=toolbox'

```text
amapuri://realtimeBus/home?netAcc={"path":"amapservice://amap_bundle_realbus/RequestScheduleService","requestKeys":"busStation"}&from=toolbox
```

### 高德地图_步行
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://routePlan/plan?t=2'

```text
amapuri://routePlan/plan?t=2
```

### 高德地图_骑行
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://routePlan/plan?t=3'

```text
amapuri://routePlan/plan?t=3
```

### 高德地图_高德运动
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx_sports_health/SportIndex?route=Sport&from=homeBox'

```text
amapuri://ajx_sports_health/SportIndex?route=Sport&from=homeBox
```

### 高德地图_无网导航
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://videoknowledge/VideoDetailPage?&labelId=2035308100005956644&labelType=20&contentId=1043014100005956651&source=jingangwei'

```text
amapuri://videoknowledge/VideoDetailPage?&labelId=2035308100005956644&labelType=20&contentId=1043014100005956651&source=jingangwei
```

### 高德地图_卫星求救
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://drive/RescuePage'

```text
amapuri://drive/RescuePage
```

### 高德地图_打车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://drive/takeTaxi?sourceApplication=icon_dache'

```text
amapuri://drive/takeTaxi?sourceApplication=icon_dache
```

### 高德地图_助老打车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://sharedtrip/taxi/helpage/openHelpageIndex?sourceApplication=helpageCarry&data=%7B%22sourceApplication%22%3A%22helpageCarry%22%7D'

```text
amapuri://sharedtrip/taxi/helpage/openHelpageIndex?sourceApplication=helpageCarry&data=%7B%22sourceApplication%22%3A%22helpageCarry%22%7D
```

### 高德地图_企业用车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://sharetrip/enterprise/onService?from=AmapEntTaxiEntry'

```text
amapuri://sharetrip/enterprise/onService?from=AmapEntTaxiEntry
```

### 高德地图_火车票机票
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://hkf/HkfPortal?data={"routeType":"flight","from":"jingangwei"}'

```text
amapuri://hkf/HkfPortal?data={"routeType":"flight","from":"jingangwei"}
```

### 高德地图_跑步运动
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx_sports_health/SportIndex?route=SportBeforeNavi&travel_type=6&from=homeBox'

```text
amapuri://ajx_sports_health/SportIndex?route=SportBeforeNavi&travel_type=6&from=homeBox
```

### 高德地图_骑行运动
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx_sports_health/SportIndex?route=SportBeforeNavi&travel_type=7&from=homeBox'

```text
amapuri://ajx_sports_health/SportIndex?route=SportBeforeNavi&travel_type=7&from=homeBox
```

### 高德地图_查公交
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx_realbus/RealBusIndexPage?openSearch=1'

```text
amapuri://ajx_realbus/RealBusIndexPage?openSearch=1
```

### 高德地图_地铁图
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://subway/home'

```text
amapuri://subway/home
```

### 高德地图_乘车码
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://buscard/detailPage?from=gongju'

```text
amapuri://buscard/detailPage?from=gongju
```

### 高德地图_顺风车
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://sharedtrip/hitch/index?sourceApplication=amapjgw'

```text
amapuri://sharedtrip/hitch/index?sourceApplication=amapjgw
```

### 高德地图_乘车码（支付宝渠道）
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Frender.alipay.com%2Fp%2Fs%2Fi%3Fscheme%3Dalipays%253A%252F%252Fplatformapi%252Fstartapp%253FappId%253D20002047%2526scene%253Dbus%2526chInfo%253Dgdhlnew%2526alipayAppdonwlaodPlanId%253Dba401e8a04344cd08518a92dc10c3a94%2526backurl%253Damapuri%25253A%25252F%25252Famap%25253FclearStack%25253D0%252526keepStack%25253D1%2526&forbid_show_loading=1&hide_title=0'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Frender.alipay.com%2Fp%2Fs%2Fi%3Fscheme%3Dalipays%253A%252F%252Fplatformapi%252Fstartapp%253FappId%253D20002047%2526scene%253Dbus%2526chInfo%253Dgdhlnew%2526alipayAppdonwlaodPlanId%253Dba401e8a04344cd08518a92dc10c3a94%2526backurl%253Damapuri%25253A%25252F%25252Famap%25253FclearStack%25253D0%252526keepStack%25253D1%2526&forbid_show_loading=1&hide_title=0
```

### 高德地图_收藏夹
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx_favorites/index'

```text
amapuri://ajx_favorites/index
```

### 高德地图_足迹
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx?path=path://amap_bundle_mine/src/pages/FootprintPage.page.js&data={"from":"tool","scene":3,"cardName":"city"}&wvc=true&animation=false'

```text
amapuri://ajx?path=path://amap_bundle_mine/src/pages/FootprintPage.page.js&data={"from":"tool","scene":3,"cardName":"city"}&wvc=true&animation=false
```

### 高德地图_手车互联
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://amapcar/main'

```text
amapuri://amapcar/main
```

### 高德地图_限行查询
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://carRestrict/openRestrictCities?from=toolbox&sourceApplication=Trip'

```text
amapuri://carRestrict/openRestrictCities?from=toolbox&sourceApplication=Trip
```

### 高德地图_互助贡献
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://feedback/publicAsk?sourcepage=185'

```text
amapuri://feedback/publicAsk?sourcepage=185
```

### 高德地图_扫一扫
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://qrscan/mainView?firepage=kit'

```text
amapuri://qrscan/mainView?firepage=kit
```

### 高德地图_写评论
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://mine/comments?tabIndex=1'

```text
amapuri://mine/comments?tabIndex=1
```

### 高德地图_测距
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://measure/home'

```text
amapuri://measure/home
```

### 高德地图_油耗记录
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://footprint/OilWearPage?from=toolbox'

```text
amapuri://footprint/OilWearPage?from=toolbox
```

### 高德地图_通行费助手
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx?path=path://amap_bundle_etc/src/etc/ETCBillDetail.page.js&data=%7b%22from%22%3a%22mainpage%22%7d'

```text
amapuri://ajx?path=path://amap_bundle_etc/src/etc/ETCBillDetail.page.js&data=%7b%22from%22%3a%22mainpage%22%7d
```

### 高德地图_群组
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://AGroup/joinGroup?from=tool'

```text
amapuri://AGroup/joinGroup?from=tool
```

### 高德地图_家人地图
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://WatchFamily/myFamily?from=toolbox'

```text
amapuri://WatchFamily/myFamily?from=toolbox
```

### 高德地图_离线地图
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://offlinemap/home'

```text
amapuri://offlinemap/home
```

### 高德地图_驾驶成就
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx?path=path://amap_bundle_mine/src/pages/FootprintPage.page.js&data={"from":"toolbox","scene":3,"cardName":"driver"}&wvc=true&animation=false'

```text
amapuri://ajx?path=path://amap_bundle_mine/src/pages/FootprintPage.page.js&data={"from":"toolbox","scene":3,"cardName":"driver"}&wvc=true&animation=false
```

### 高德地图_语音助手
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://vui/HelpCenter?selectTab=beginner_guide'

```text
amapuri://vui/HelpCenter?selectTab=beginner_guide
```

### 高德地图_记录足迹
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://footprint/FreeRecord?from=toolbox&showListEntry=1'

```text
amapuri://footprint/FreeRecord?from=toolbox&showListEntry=1
```

### 高德地图_高德扫街榜
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx?path=path://amap_bundle_landing_page/src/new_rank/RankNewPage.page.js&data=%7B%22business%22%3A%22dining%22%2C%22list_tag%22%3A%22%E9%AB%98%E5%BE%B7%E6%89%AB%E8%A1%97%E6%A6%9C%7C%E9%AB%98%E5%BE%B7%E6%89%AB%E8%A1%97%E6%A6%9C%22%2C%22poi_tpl_style%22%3A%225%22%7D'

```text
amapuri://ajx?path=path://amap_bundle_landing_page/src/new_rank/RankNewPage.page.js&data=%7B%22business%22%3A%22dining%22%2C%22list_tag%22%3A%22%E9%AB%98%E5%BE%B7%E6%89%AB%E8%A1%97%E6%A6%9C%7C%E9%AB%98%E5%BE%B7%E6%89%AB%E8%A1%97%E6%A6%9C%22%2C%22poi_tpl_style%22%3A%225%22%7D
```

### 高德地图_停车推荐
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://drive/ParkRadar?sourcePage=mainPage&sourceApplication=MainTool'

```text
amapuri://drive/ParkRadar?sourcePage=mainPage&sourceApplication=MainTool
```

### 高德地图_停车记录
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://drive/ParkingPage?from=toolbox'

```text
amapuri://drive/ParkingPage?from=toolbox
```

### 高德地图_领水果
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2F2021AmapGarden%2Findex.html%3Fgd_from%3Damap_tool&hide_title=1'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2F2021AmapGarden%2Findex.html%3Fgd_from%3Damap_tool&hide_title=1
```

### 高德地图_送药上门
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://applets/platformapi/startapp?appId=2021002120634069&chInfo=ch_scene__chsub_homepage_toolkit'

```text
amapuri://applets/platformapi/startapp?appId=2021002120634069&chInfo=ch_scene__chsub_homepage_toolkit
```

### 高德地图_电子狗
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://edog/home?from=edog'

```text
amapuri://edog/home?from=edog
```

### 高德地图_钱包卡券
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https://cache.gaode.com/activity/2021GaodeAwardlist/index.html&hide_title=1'

```text
amapuri://webview/amaponline?url=https://cache.gaode.com/activity/2021GaodeAwardlist/index.html&hide_title=1
```

### 高德地图_我的反馈
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx?path=path://amap_bundle_basemap_feedback/src/user_center/pages/BizUserFeedBackList.page.js'

```text
amapuri://ajx?path=path://amap_bundle_basemap_feedback/src/user_center/pages/BizUserFeedBackList.page.js
```

### 高德地图_我的贡献
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ugc/profile?from=mine'

```text
amapuri://ugc/profile?from=mine
```

### 高德地图_小德秒懂
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://videoknowledge/VideoListPage?source=toolbox'

```text
amapuri://videoknowledge/VideoListPage?source=toolbox
```

### 高德地图_我的问答
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://poiAsk/myQuestionAskPage'

```text
amapuri://poiAsk/myQuestionAskPage
```

### 高德地图_商户标注
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx?path=path://amap_bundle_small_biz/src/pages/small_biz_index.page.js&data=%7B%22from%22%3A%22xinzhutu%22%7D'

```text
amapuri://ajx?path=path://amap_bundle_small_biz/src/pages/small_biz_index.page.js&data=%7B%22from%22%3A%22xinzhutu%22%7D
```

### 高德地图_反馈上报
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://reportTrafficEvent/main'

```text
amapuri://reportTrafficEvent/main
```

### 高德地图_我的相册
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://mine/album?from=tool'

```text
amapuri://mine/album?from=tool
```

### 高德地图_高德淘金
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fgxd.amap.com%2F'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fgxd.amap.com%2F
```

### 高德地图_达人中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2F2022infoTalent%2FexchangeIndex.html%3Fgd_from%3Djx&hide_title=1'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fcache.gaode.com%2Factivity%2F2022infoTalent%2FexchangeIndex.html%3Fgd_from%3Djx&hide_title=1
```

### 高德地图_交通号
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https://jiaotonghao2.amap.com/?channel=amap&hide_title=1&hideTitleBar=1'

```text
amapuri://webview/amaponline?url=https://jiaotonghao2.amap.com/?channel=amap&hide_title=1&hideTitleBar=1
```

### 高德地图_车险报价
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://applets/platformapi/startapp?appId=2021003128640568&nbupdate=syncforce&page=pages%2Findex%2Findex%3Furl%3Dhttps%253A%252F%252Frender.alipay.com%252Fp%252Fh5%252Finsauto%252Fwww%252Findex.html%253FforceQuoteByZhiTong%253D1%2526disableJudgeInsure%253D1%2526bizScenario%253Dgaode_toolbox_chexian&chInfo=ch_scene__chsub_homepage_toolkit'

```text
amapuri://applets/platformapi/startapp?appId=2021003128640568&nbupdate=syncforce&page=pages%2Findex%2Findex%3Furl%3Dhttps%253A%252F%252Frender.alipay.com%252Fp%252Fh5%252Finsauto%252Fwww%252Findex.html%253FforceQuoteByZhiTong%253D1%2526disableJudgeInsure%253D1%2526bizScenario%253Dgaode_toolbox_chexian&chInfo=ch_scene__chsub_homepage_toolkit
```

### 高德地图_拍图赚赏金
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://feedback/publicAskMapOperation?sourcePage=185'

```text
amapuri://feedback/publicAskMapOperation?sourcePage=185
```

### 高德地图_献血
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://search/general?keyword=%E7%8C%AE%E8%A1%80&superid=a_87'

```text
amapuri://search/general?keyword=%E7%8C%AE%E8%A1%80&superid=a_87
```

### 高德地图_发热门诊
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://ajx_plague_map/FeverClinicsPage?from=tool'

```text
amapuri://ajx_plague_map/FeverClinicsPage?from=tool
```

### 高德地图_合成烟花
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fline.amap.com%2F2023PointsMall%2Findex.html%3Fgd_from%3Djingangyanhua&sourceApplication=jingangyanhua&hide_title=1'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fline.amap.com%2F2023PointsMall%2Findex.html%3Fgd_from%3Djingangyanhua&sourceApplication=jingangyanhua&hide_title=1
```

### 高德地图_养车必囤
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://c3/carservice/protalPage?bizKey=washCarProduct&superid=z_87_96_29'

```text
amapuri://c3/carservice/protalPage?bizKey=washCarProduct&superid=z_87_96_29
```

### 高德地图_电动车投屏
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://bleconnect/main'

```text
amapuri://bleconnect/main
```

### 高德地图_3D车标
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://dialect/home?tab=carlogo&from=jgq'

```text
amapuri://dialect/home?tab=carlogo&from=jgq
```

### 高德地图_游戏中心
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fline.amap.com%2F2023PointsMall%2Findex.html%3Fgd_from%3Djingang&sourceApplication=jingang&hide_title=1'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fline.amap.com%2F2023PointsMall%2Findex.html%3Fgd_from%3Djingang&sourceApplication=jingang&hide_title=1
```

### 高德地图_高德公益
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fc1-pha.amap.com%2F2024PublicGoodAct%2Findex.html%3Fgd_from%3Djingang&sourceApplication=jingang&hide_title=1'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fc1-pha.amap.com%2F2024PublicGoodAct%2Findex.html%3Fgd_from%3Djingang&sourceApplication=jingang&hide_title=1
```

### 高德地图_天天领福利
@type urlscheme
@risk safe
@need none
@adb am start -d 'amapuri://webview/amaponline?url=https%3A%2F%2Fc3-pha.amap.com%2F2025ActFissionSite%2Findex.html%3FareaId%3Damap_ugliebiansite_00001%26gd_from%3Djingang&sourceApplication=jingang&hide_title=0'

```text
amapuri://webview/amaponline?url=https%3A%2F%2Fc3-pha.amap.com%2F2025ActFissionSite%2Findex.html%3FareaId%3Damap_ugliebiansite_00001%26gd_from%3Djingang&sourceApplication=jingang&hide_title=0
```

### 高德地图_搜索自定义关键词
@type urlscheme
@risk safe
@need none
@param kw=关键词|马栏山
@desc 在高德内搜索任意关键词，结果列表页。关键词建议 URL 编码后再填，纯中文也能识别。
@adb am start -d 'amapuri://search/general?keyword={kw}'

```text
amapuri://search/general?keyword={kw}
```
