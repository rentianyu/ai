# 微信

@author 小贝塔
@version 2026.11.4
@updated 2026-11-04

> 微信（com.tencent.mm）的内部 Activity / Intent 入口，共 53 条。
> 全部 safe：只做页面跳转。带参数的条目需先填参数，如好友微信号、群号。
> 旧版可用标注的语音/视频通话仅 2020 年前版本微信有效。

## 微信

### 微信_主界面
@type activity
@risk safe
@need shell
@component com.tencent.mm/.ui.LauncherUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.ui.LauncherUI

### 微信_扫一扫
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.scanner.ui.BaseScanUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.scanner.ui.BaseScanUI

### 微信_指定好友聊天
@type intent
@risk safe
@need shell
@param wxid=好友微信号|wxid_example
@component com.tencent.mm/.ui.chatting.ChattingUI
@package com.tencent.mm
@extra Chat_Mode:int=1
@extra Chat_User:string={wxid}
@adb am start -n com.tencent.mm/.ui.chatting.ChattingUI --ei Chat_Mode 1 --es Chat_User {wxid}

### 微信_语音通话-旧版可用
@type intent
@risk safe
@need shell
@param wxid=好友微信号|wxid_example
@component com.tencent.mm/.plugin.voip.ui.VideoActivity
@package com.tencent.mm
@extra Voip_VideoCall:bool=false
@extra Voip_User:string={wxid}
@adb am start -n com.tencent.mm/.plugin.voip.ui.VideoActivity --ez Voip_VideoCall false --es Voip_User {wxid}

### 微信_视频通话-旧版可用
@type intent
@risk safe
@need shell
@param wxid=好友微信号|wxid_example
@component com.tencent.mm/.plugin.voip.ui.VideoActivity
@package com.tencent.mm
@extra Voip_VideoCall:bool=true
@extra Voip_User:string={wxid}
@adb am start -n com.tencent.mm/.plugin.voip.ui.VideoActivity --ez Voip_VideoCall true --es Voip_User {wxid}

### 微信_搜索页
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.fts.ui.FTSMainUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.fts.ui.FTSMainUI

### 微信_指定群聊天
@type intent
@risk safe
@need shell
@param group=群号@chatroom|1234567890@chatroom
@component com.tencent.mm/.ui.chatting.ChattingUI
@package com.tencent.mm
@extra Chat_Mode:int=1
@extra Chat_User:string={group}
@adb am start -n com.tencent.mm/.ui.chatting.ChattingUI --ei Chat_Mode 1 --es Chat_User {group}

### 微信_指定公众号
@type intent
@risk safe
@need shell
@param gh=公众号原始ID|gh_6e6a62f4340a
@component com.tencent.mm/.ui.chatting.ChattingUI
@package com.tencent.mm
@extra Chat_User:string={gh}
@adb am start -n com.tencent.mm/.ui.chatting.ChattingUI --es Chat_User {gh}

### 微信_收款码
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.collect.ui.CollectMainUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.collect.ui.CollectMainUI

### 微信_二维码名片
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.setting.ui.setting.SelfQRCodeUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.setting.ui.setting.SelfQRCodeUI

### 微信_我的收藏
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.fav.ui.FavoriteIndexUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.fav.ui.FavoriteIndexUI

### 微信_朋友圈
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.sns.ui.SnsTimeLineUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.sns.ui.SnsTimeLineUI

### 微信_订阅号消息
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.brandservice.ui.timeline.BizTimeLineUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.brandservice.ui.timeline.BizTimeLineUI

### 微信_打开指定网址
@type intent
@risk safe
@need shell
@param url=网址|https://baidu.com
@component com.tencent.mm/.plugin.webview.ui.tools.WebViewUI
@package com.tencent.mm
@extra rawUrl:string={url}
@adb am start -n com.tencent.mm/.plugin.webview.ui.tools.WebViewUI --es rawUrl {url}

### 微信_运动步数排行
@type intent
@risk safe
@need shell
@param nickname=昵称|微信运动
@component com.tencent.mm/.plugin.exdevice.ui.ExdeviceRankInfoUI
@package com.tencent.mm
@extra key_is_latest:bool=true
@extra device_type:int=1
@extra key_only_show_latest_rank:bool=true
@extra app_username:string={nickname}
@extra rank_id:string=#
@adb am start -n com.tencent.mm/.plugin.exdevice.ui.ExdeviceRankInfoUI --ez key_is_latest true --ei device_type 1 --ez key_only_show_latest_rank true --es app_username {nickname} --es rank_id #

### 微信_新的朋友
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.subapp.ui.friend.FMessageConversationUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.subapp.ui.friend.FMessageConversationUI

### 微信_群聊
@type activity
@risk safe
@need shell
@component com.tencent.mm/.ui.contact.ChatroomContactUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.ui.contact.ChatroomContactUI

### 微信_标签
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.label.ui.ContactLabelManagerUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.label.ui.ContactLabelManagerUI

### 微信_公众号
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.brandservice.ui.BrandServiceIndexUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.brandservice.ui.BrandServiceIndexUI

### 微信_视频号
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.finder.ui.FinderHomeAffinityUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.finder.ui.FinderHomeAffinityUI

### 微信_直播
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.finder.nearby.newlivesquare.FinderLiveSquareNewEntranceUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.finder.nearby.newlivesquare.FinderLiveSquareNewEntranceUI

### 微信_摇一摇
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.shake.ui.ShakeReportUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.shake.ui.ShakeReportUI

### 微信_看一看
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.topstory.ui.home.TopStoryHomeUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.topstory.ui.home.TopStoryHomeUI

### 微信_搜一搜
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.webview.ui.tools.fts.FTSSOSHomeWebViewUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.webview.ui.tools.fts.FTSSOSHomeWebViewUI

### 微信_附近
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.finder.nearby.NearbyUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.finder.nearby.NearbyUI

### 微信_购物
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandUI1
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandUI1

### 微信_游戏
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.game.ui.chat_tab.GameWebTabUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.game.ui.chat_tab.GameWebTabUI

### 微信_小程序
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandLauncherUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandLauncherUI

### 微信_附件小程序
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandPluginUI1
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandPluginUI1

### 微信_我的订单
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandPluginUI4
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandPluginUI4

### 微信_我的小程序
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandLauncherFolderUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandLauncherFolderUI

### 微信_发状态
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.textstatus.ui.TextStatusDoWhatActivity
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.textstatus.ui.TextStatusDoWhatActivity

### 微信_朋友的状态
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.textstatus.ui.TextStatusOtherTopicFriendsActivity
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.textstatus.ui.TextStatusOtherTopicFriendsActivity

### 微信_服务
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.mall.ui.MallIndexUIv2
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.mall.ui.MallIndexUIv2

### 微信_收付款
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.offline.ui.WalletOfflineCoinPurseUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.offline.ui.WalletOfflineCoinPurseUI

### 微信_钱包
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.mall.ui.MallWalletUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.mall.ui.MallWalletUI

### 微信_二维码收款
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.collect.ui.WalletCollectQrCodeUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.collect.ui.WalletCollectQrCodeUI

### 微信_赞赏码
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.collect.reward.ui.QrRewardMainUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.collect.reward.ui.QrRewardMainUI

### 微信_群收款
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.aa.ui.AAEntranceUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.aa.ui.AAEntranceUI

### 微信_面对面红包
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.luckymoney.f2f.ui.LuckyMoneyF2FQRCodeUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.luckymoney.f2f.ui.LuckyMoneyF2FQRCodeUI

### 微信_向银行卡或手机号转账
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.remittance.mobile.ui.BankMobileRemittanceChooseUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.remittance.mobile.ui.BankMobileRemittanceChooseUI

### 微信_手机充值
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandUI2
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandUI2

### 微信_生活缴费
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandUI3
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandUI3

### 微信_医疗健康
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.appbrand.ui.AppBrandUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.appbrand.ui.AppBrandUI

### 微信_卡包
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.card.ui.v3.CardHomePageV3UI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.card.ui.v3.CardHomePageV3UI

### 微信_会员卡
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.card.ui.v3.VipCardListUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.card.ui.v3.VipCardListUI

### 微信_券和礼品卡
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.card.ui.v4.CouponAndGiftCardListV4UI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.card.ui.v4.CouponAndGiftCardListV4UI

### 微信_票证
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.card.ui.v2.CardTicketListUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.card.ui.v2.CardTicketListUI

### 微信_表情
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.emoji.ui.v2.EmojiStoreV2UI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.emoji.ui.v2.EmojiStoreV2UI

### 微信_运动排行榜
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.exdevice.ui.ExdeviceRankInfoUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.exdevice.ui.ExdeviceRankInfoUI

### 微信_来电铃声
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.ringtone.ui.RingtoneSettingsUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.ringtone.ui.RingtoneSettingsUI

### 微信_发起群聊
@type activity
@risk safe
@need shell
@component com.tencent.mm/.ui.mvvm.MvvmSelectContactUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.ui.mvvm.MvvmSelectContactUI

### 微信_添加好友
@type activity
@risk safe
@need shell
@component com.tencent.mm/.plugin.subapp.ui.pluginapp.AddMoreFriendsUI
@package com.tencent.mm
@adb am start -n com.tencent.mm/.plugin.subapp.ui.pluginapp.AddMoreFriendsUI
