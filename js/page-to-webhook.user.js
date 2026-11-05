// ==UserScript==
// @name         推送网页标题、网址到 webhook
// @namespace    page-to-webhook
// @version      1.1.3
// @description  点右下角悬浮钮或脚本菜单，把当前网页的标题+网址推送到 webhook（地址可配置，默认按企业微信发送，兼容钉钉/飞书/任意自定义 webhook）
// @author       小贝塔
// @license      MIT
// @updateURL    https://f.xbta.cc/ai/js/page-to-webhook.user.js
// @downloadURL  https://f.xbta.cc/ai/js/page-to-webhook.user.js
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      qyapi.weixin.qq.com
// @connect      oapi.dingtalk.com
// @connect      open.feishu.cn
// @connect      open.larksuite.com
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ============================== 常量 ============================== */
  var K_WEBHOOK = 'wps_webhook';
  var K_TEMPLATE = 'wps_template';
  var K_POS = 'wps_pos';
  var K_HIDDEN = 'wps_hidden';
  var HOST_ID = 'wps-host-9c1f';
  var WECOM_MAX_BYTES = 2000;   // 企微 text 消息 content 上限 2048 字节，留余量
  var SEND_GAP_MS = 3000;       // 本地节流：3 秒内不重复发送
  var ICON_SIZE = 38;

  /* ============================== 存储层 ============================== */
  function getCfg(key, def) {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue(key, def);
    } catch (e) {}
    try {
      var s = window.localStorage.getItem(key);
      return s == null ? def : JSON.parse(s);
    } catch (e2) {}
    return def;
  }

  function setCfg(key, val) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(key, val);
        return;
      }
    } catch (e) {}
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch (e2) {}
  }

  /* ============================== 纯逻辑 ============================== */

  // 中国时间 YYYY-MM-DD HH:mm:ss
  function nowCN() {
    try {
      return new Date()
        .toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
        .replace(/\//g, '-');
    } catch (e) {
      var d = new Date(Date.now() + 8 * 3600 * 1000);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
  }

  function utf8Len(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  function truncateUtf8(s, maxBytes) {
    var n = 0;
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      var w;
      if (c < 0x80) w = 1;
      else if (c < 0x800) w = 2;
      else if (c >= 0xd800 && c <= 0xdbff) w = 4;
      else w = 3;
      if (n + w > maxBytes) break;
      out += s.charAt(i);
      if (w === 4 && i + 1 < s.length) {
        out += s.charAt(i + 1);
        i++;
      }
      n += w;
    }
    return out;
  }

  function jsonEsc(s) {
    return JSON.stringify(String(s)).slice(1, -1);
  }

  function detectKind(url) {
    var u = String(url || '').toLowerCase();
    if (u.indexOf('qyapi.weixin.qq.com') >= 0) return 'wecom';
    if (u.indexOf('oapi.dingtalk.com') >= 0) return 'dingtalk';
    if (u.indexOf('open.feishu.cn') >= 0 || u.indexOf('open.larksuite.com') >= 0) return 'feishu';
    return 'generic';
  }

  // 推送地址归一化：完整 URL / 裸域名 / 企微机器人 key（自动补全）
  function normalizeUrl(raw) {
    var v = String(raw == null ? '' : raw).trim();
    if (!v) throw new Error('推送地址为空，请先在设置里填写');
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return 'https://' + v;
    return 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + encodeURIComponent(v);
  }

  function buildContent(info) {
    return '标题：' + info.title + '\n时间：' + info.time + '\n网址：' + info.url;
  }

  // 企微 text 消息限 2048 字节：第 1 行标题、第 2 行时间、第 3 行网址；
  // 超限时优先保住时间与网址，压缩标题
  function fitWecom(info, maxBytes) {
    var limit = maxBytes || WECOM_MAX_BYTES;
    var head = '标题：';
    var tail = '\n时间：' + info.time + '\n网址：' + info.url;
    var budget = limit - utf8Len(head + tail) - 1;
    if (budget < 8) budget = 8;
    var title = String(info.title || '');
    if (utf8Len(title) > budget) title = truncateUtf8(title, budget) + '…';
    var c = head + title + tail;
    if (utf8Len(c) > limit) c = truncateUtf8(c, limit - 3) + '…';
    return c;
  }

  // 生成请求：{ url, kind, payload }
  function buildRequest(rawUrl, info, tpl) {
    var url = normalizeUrl(rawUrl);
    var kind = detectKind(url);
    var content = kind === 'wecom' ? fitWecom(info, WECOM_MAX_BYTES) : buildContent(info);
    var payload = null;
    var t = String(tpl == null ? '' : tpl).trim();

    if (t) {
      var vars = {
        title: jsonEsc(info.title),
        url: jsonEsc(info.url),
        time: jsonEsc(info.time),
        content: jsonEsc(content)
      };
      var filled = t.replace(/\{\{\s*(title|url|time|content)\s*\}\}/gi, function (m, name) {
        return vars[String(name).toLowerCase()];
      });
      try {
        payload = JSON.parse(filled);
      } catch (e) {
        throw new Error('自定义 JSON 模板不是合法 JSON（' + e.message + '）');
      }
    } else if (kind === 'feishu') {
      payload = { msg_type: 'text', content: { text: content } };
    } else if (kind === 'generic') {
      payload = { title: info.title, url: info.url, time: info.time, content: content };
    } else {
      payload = { msgtype: 'text', text: { content: content } };
    }
    return { url: url, kind: kind, payload: payload };
  }

  // 结果判定：{ ok, msg }
  function judge(kind, status, text) {
    var j = null;
    try { j = JSON.parse(text); } catch (e) {}

    if (status === -1 || status === -2) return { ok: false, msg: String(text || '网络错误') };
    if (status < 200 || status >= 300) {
      return { ok: false, msg: 'HTTP ' + status + (j ? '：' + JSON.stringify(j).slice(0, 200) : '') };
    }
    if (kind === 'wecom' || kind === 'dingtalk') {
      if (!j) return { ok: false, msg: '响应解析失败：' + String(text || '').slice(0, 120) };
      var code = Number(j.errcode);
      if (code === 0) return { ok: true, msg: '' };
      var hint = '';
      if (code === 93000) hint = '（webhook 地址或 key 无效）';
      else if (code === 45009) hint = '（发送太频繁，每分钟上限 20 条）';
      else if (code === 40058) hint = '（参数错误）';
      return { ok: false, msg: 'errcode ' + code + '：' + (j.errmsg || '') + hint };
    }
    if (kind === 'feishu') {
      if (!j) return { ok: false, msg: '响应解析失败：' + String(text || '').slice(0, 120) };
      var fc = j.code !== undefined ? Number(j.code) : (j.StatusCode !== undefined ? Number(j.StatusCode) : 0);
      if (fc === 0) return { ok: true, msg: '' };
      return { ok: false, msg: 'code ' + fc + '：' + (j.msg || j.StatusMessage || '') };
    }
    return { ok: true, msg: '' };
  }

  /* ============================== 网络 ============================== */
  function postJson(url, payload, cb) {
    var body = JSON.stringify(payload);
    if (typeof GM_xmlhttpRequest === 'function') {
      try {
        GM_xmlhttpRequest({
          method: 'POST',
          url: url,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          data: body,
          timeout: 15000,
          onload: function (res) { cb(res.status, res.responseText); },
          onerror: function () { cb(-1, '网络错误（域名不可达或跨域被拦截）'); },
          ontimeout: function () { cb(-2, '请求超时（15s）'); }
        });
        return;
      } catch (e) {}
    }
    if (typeof fetch === 'function') {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body })
        .then(function (r) { return r.text().then(function (t) { cb(r.status, t); }); })
        .catch(function (e) { cb(-1, '网络错误：' + e.message); });
      return;
    }
    cb(-1, '当前环境不支持网络请求');
  }

  /* ============================== UI ============================== */
  var CSS = [
    '.wps-btn{position:fixed;right:18px;bottom:96px;width:' + ICON_SIZE + 'px;height:' + ICON_SIZE + 'px;border-radius:50%;',
    'display:flex;align-items:center;justify-content:center;background:rgba(17,24,39,.66);color:#fff;',
    'border:1px solid rgba(255,255,255,.25);box-shadow:0 4px 16px rgba(0,0,0,.3);cursor:pointer;opacity:.75;',
    'transition:opacity .16s,background .16s,transform .16s;user-select:none;-webkit-user-select:none;touch-action:none;',
    'font:600 15px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;z-index:2147483000}',
    '.wps-btn:hover{opacity:1;background:rgba(7,193,96,.92);transform:scale(1.07)}',
    '.wps-btn.wps-sending{opacity:1;background:rgba(17,24,39,.86)}',
    '.wps-btn.wps-ok{opacity:1;background:rgba(7,193,96,.96)}',
    '.wps-btn.wps-err{opacity:1;background:rgba(224,60,49,.96)}',
    '.wps-btn svg{display:block}',
    '.wps-btn.wps-sending svg,.wps-btn.wps-ok svg,.wps-btn.wps-err svg{display:none}',
    '.wps-spin{display:none;width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;',
    'border-radius:50%;animation:wps-spin .7s linear infinite}',
    '.wps-btn.wps-sending .wps-spin{display:block}',
    '.wps-tick{display:none;font-size:17px;font-weight:700;line-height:1}',
    '.wps-btn.wps-ok .wps-tick,.wps-btn.wps-err .wps-tick{display:block}',
    '@keyframes wps-spin{to{transform:rotate(360deg)}}',
    '.wps-toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);max-width:min(560px,90vw);',
    'background:rgba(17,24,39,.93);color:#fff;padding:9px 16px;border-radius:10px;white-space:pre-wrap;word-break:break-all;',
    'font:13px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;',
    'box-shadow:0 8px 26px rgba(0,0,0,.3);z-index:2147483002;animation:wps-fade .14s ease}',
    '.wps-toast.ok{background:rgba(7,193,96,.96)}',
    '.wps-toast.err{background:rgba(224,60,49,.96)}',
    '.wps-toast.warn{background:rgba(245,158,11,.97);color:#3a2a00}',
    '@keyframes wps-fade{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}',
    '.wps-mask{position:fixed;inset:0;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;',
    'z-index:2147483001;animation:wps-fade2 .12s ease}',
    '@keyframes wps-fade2{from{opacity:0}to{opacity:1}}',
    '.wps-panel{width:min(460px,92vw);background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.3);',
    'padding:20px 22px 16px;box-sizing:border-box;color:#111827;text-align:left;',
    'font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}',
    '.wps-panel h3{margin:0 0 14px;font-size:16px;font-weight:600;line-height:1.4}',
    '.wps-lb{display:block;font-size:12px;color:#6b7280;margin:0 0 6px}',
    '.wps-inp{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;',
    'font-size:12.5px;outline:none;color:#111827;background:#fff;',
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;transition:border-color .15s,box-shadow .15s}',
    '.wps-inp:focus{border-color:#07c160;box-shadow:0 0 0 3px rgba(7,193,96,.16)}',
    '.wps-tip{font-size:12px;color:#9ca3af;margin:8px 0 0;line-height:1.55}',
    '.wps-adv{margin-top:14px;border-top:1px dashed #e5e7eb;padding-top:10px}',
    '.wps-adv summary{cursor:pointer;font-size:12.5px;color:#6b7280;outline:none}',
    '.wps-area{width:100%;box-sizing:border-box;margin-top:8px;height:86px;padding:8px 10px;border:1px solid #d1d5db;',
    'border-radius:8px;font-size:12px;resize:vertical;outline:none;color:#111827;background:#fff;',
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
    '.wps-area:focus{border-color:#07c160;box-shadow:0 0 0 3px rgba(7,193,96,.16)}',
    '.wps-ft{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}',
    '.wps-b{border:0;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;transition:filter .15s}',
    '.wps-b:hover{filter:brightness(.95)}',
    '.wps-b.wps-ghost{background:#f3f4f6;color:#374151}',
    '.wps-b.wps-test{background:#eef6ff;color:#1d6fdc;margin-right:auto}',
    '.wps-b.wps-primary{background:#07c160;color:#fff}'
  ].join('');

  var hostEl = null;
  var shadowRoot = null;
  var btnEl = null;
  var tickEl = null;
  var panelEl = null;
  var toastEl = null;
  var toastTimer = 0;
  var sending = false;
  var lastOkAt = 0;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null) continue;
        if (k === 'style') n.style.cssText = v;
        else if (k === 'text') n.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
        else n.setAttribute(k, v);
      }
    }
    if (kids) {
      for (var i = 0; i < kids.length; i++) if (kids[i]) n.appendChild(kids[i]);
    }
    return n;
  }

  function applyCss(root, css) {
    try {
      if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in root) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        root.adoptedStyleSheets = [sheet];
        return;
      }
    } catch (e) {}
    var st = document.createElement('style');
    st.textContent = css;
    root.appendChild(st);
  }

  function svgIcon() {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', '18');
    s.setAttribute('height', '18');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    var p1 = document.createElementNS(NS, 'path');
    p1.setAttribute('d', 'm22 2-7 20-4-9-9-4Z');
    var p2 = document.createElementNS(NS, 'path');
    p2.setAttribute('d', 'M22 2 11 13');
    s.appendChild(p1);
    s.appendChild(p2);
    return s;
  }

  function setBtnState(state) {
    if (!btnEl) return;
    btnEl.classList.remove('wps-sending', 'wps-ok', 'wps-err');
    if (state) btnEl.classList.add('wps-' + state);
    if (tickEl) tickEl.textContent = state === 'ok' ? '✓' : state === 'err' ? '✕' : '';
  }

  function toast(msg, type) {
    if (!shadowRoot) return;
    if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    toastEl = null;
    clearTimeout(toastTimer);
    var t = el('div', { class: 'wps-toast' + (type ? ' ' + type : '') });
    t.textContent = msg;
    shadowRoot.appendChild(t);
    toastEl = t;
    toastTimer = setTimeout(function () {
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      toastEl = null;
    }, type === 'err' ? 5000 : 2400);
  }

  function collectInfo() {
    var t = String(document.title || '').trim();
    return { title: t || '(无标题)', url: location.href, time: nowCN() };
  }

  /* ---------- 发送 ---------- */
  function sendNow(rawUrl, tpl, info, onDone) {
    var cfg;
    try {
      cfg = buildRequest(rawUrl, info, tpl);
    } catch (e) {
      onDone(false, String((e && e.message) || e));
      return;
    }
    postJson(cfg.url, cfg.payload, function (status, text) {
      var r = judge(cfg.kind, status, text);
      onDone(r.ok, r.msg);
    });
  }

  function doSend() {
    if (sending) return;
    var raw = String(getCfg(K_WEBHOOK, '') || '').trim();
    if (!raw) {
      toast('还没配置推送地址，先填一下', 'warn');
      openPanel(true);
      return;
    }
    var now = Date.now();
    if (now - lastOkAt < SEND_GAP_MS) {
      toast('太快了，' + Math.ceil((SEND_GAP_MS - (now - lastOkAt)) / 1000) + ' 秒后再发', 'warn');
      return;
    }
    sending = true;
    setBtnState('sending');
    sendNow(raw, getCfg(K_TEMPLATE, ''), collectInfo(), function (ok, msg) {
      sending = false;
      if (ok) lastOkAt = Date.now();
      setBtnState(ok ? 'ok' : 'err');
      setTimeout(function () { setBtnState(''); }, 1600);
      toast(ok ? '已推送 ✅' : '推送失败：' + msg, ok ? 'ok' : 'err');
    });
  }

  /* ---------- 设置面板 ---------- */
  function closePanel() {
    if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    panelEl = null;
  }

  function openPanel(first) {
    if (!shadowRoot) return;
    closePanel();

    var input = el('input', {
      class: 'wps-inp',
      type: 'text',
      spellcheck: 'false',
      autocomplete: 'off',
      placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx'
    });
    input.value = String(getCfg(K_WEBHOOK, '') || '');

    var hint = el('div', {
      class: 'wps-tip',
      text: first
        ? '还没配置。填企业微信群机器人的 Webhook 链接；也可以只填机器人 key（自动补全企微地址）；填其它地址则按自定义 webhook 推送。'
        : '支持：企微完整链接 / 企微机器人 key / 钉钉、飞书或任意自定义 webhook。'
    });

    var tplArea = el('textarea', {
      class: 'wps-area',
      spellcheck: 'false',
      placeholder: '{"msg":"{{title}}","link":"{{url}}"}'
    });
    tplArea.value = String(getCfg(K_TEMPLATE, '') || '');

    var adv = el('details', { class: 'wps-adv' }, [
      el('summary', { text: '高级：自定义 JSON 模板（可选）' }),
      tplArea,
      el('div', {
        class: 'wps-tip',
        text: '留空 = 自动识别（企微 / 钉钉 / 飞书 / 通用 {title,url,time,content}）。变量：{{title}} {{url}} {{time}} {{content}}，需写在 JSON 字符串引号内。'
      })
    ]);

    var statusBox = el('div', { class: 'wps-tip' });

    function save() {
      var v = input.value.trim();
      if (!v) {
        statusBox.textContent = '请填写推送地址';
        statusBox.style.color = '#e54d42';
        input.focus();
        return;
      }
      try {
        normalizeUrl(v);
      } catch (e) {
        statusBox.textContent = String((e && e.message) || e);
        statusBox.style.color = '#e54d42';
        return;
      }
      setCfg(K_WEBHOOK, v);
      setCfg(K_TEMPLATE, tplArea.value.trim());
      closePanel();
      toast('设置已保存 ✅', 'ok');
    }

    var btnTest = el('button', {
      class: 'wps-b wps-test',
      type: 'button',
      text: '测试',
      onclick: function () {
        statusBox.style.color = '#6b7280';
        statusBox.textContent = '正在发送测试消息…';
        sendNow(
          input.value,
          tplArea.value,
          { title: '【测试】网页推送脚本', url: location.href, time: nowCN() },
          function (ok, msg) {
            statusBox.textContent = ok ? '测试成功，去群里看看 ✅' : '测试失败：' + msg;
            statusBox.style.color = ok ? '#07a355' : '#e54d42';
          }
        );
      }
    });

    var btnCancel = el('button', { class: 'wps-b wps-ghost', type: 'button', text: '取消', onclick: closePanel });
    var btnSave = el('button', { class: 'wps-b wps-primary', type: 'button', text: '保存', onclick: save });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
    });

    var panel = el('div', { class: 'wps-panel' }, [
      el('h3', { text: '📤 推送设置' }),
      el('label', { class: 'wps-lb', text: '推送地址' }),
      input,
      hint,
      adv,
      statusBox,
      el('div', { class: 'wps-ft' }, [btnTest, btnCancel, btnSave])
    ]);

    var mask = el('div', { class: 'wps-mask' }, [panel]);
    mask.addEventListener('click', function (e) {
      if (e.target === mask) closePanel();
    });

    shadowRoot.appendChild(mask);
    panelEl = mask;
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 30);
  }

  /* ---------- 悬浮钮 ---------- */
  function setPos(x, y) {
    if (!btnEl) return;
    btnEl.style.left = x + 'px';
    btnEl.style.top = y + 'px';
    btnEl.style.right = 'auto';
    btnEl.style.bottom = 'auto';
  }

  function clamp(n, min, max) {
    if (max < min) max = min;
    return Math.max(min, Math.min(max, n));
  }

  function initBtn(root) {
    btnEl = el('div', {
      class: 'wps-btn',
      title: '发送当前页面（拖动可移位）',
      role: 'button',
      'aria-label': '发送当前页面'
    });

    var spin = el('div', { class: 'wps-spin' });
    tickEl = el('span', { class: 'wps-tick' });

    btnEl.appendChild(svgIcon());
    btnEl.appendChild(spin);
    btnEl.appendChild(tickEl);
    root.appendChild(btnEl);

    // 位置
    var saved = getCfg(K_POS, null);
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      setPos(saved.x, saved.y);
    }
    if (getCfg(K_HIDDEN, false)) btnEl.style.display = 'none';

    // 拖拽 + 点击
    var ptr = null;
    btnEl.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var r = btnEl.getBoundingClientRect();
      ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
      try { btnEl.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    btnEl.addEventListener('pointermove', function (e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var dx = e.clientX - ptr.sx;
      var dy = e.clientY - ptr.sy;
      if (!ptr.moved && Math.abs(dx) + Math.abs(dy) > 4) ptr.moved = true;
      if (!ptr.moved) return;
      var x = clamp(ptr.ox + dx, 4, window.innerWidth - ICON_SIZE - 4);
      var y = clamp(ptr.oy + dy, 4, window.innerHeight - ICON_SIZE - 4);
      setPos(x, y);
    });

    btnEl.addEventListener('pointerup', function (e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var moved = ptr.moved;
      ptr = null;
      try { btnEl.releasePointerCapture(e.pointerId); } catch (err) {}
      if (!moved) {
        doSend();
        return;
      }
      var r = btnEl.getBoundingClientRect();
      setCfg(K_POS, { x: Math.round(r.left), y: Math.round(r.top) });
    });

    btnEl.addEventListener('pointercancel', function () { ptr = null; });

    // 窗口尺寸变化时把钮拉回可视区
    window.addEventListener('resize', function () {
      var p = getCfg(K_POS, null);
      if (p && typeof p.x === 'number' && btnEl) {
        setPos(
          clamp(p.x, 4, window.innerWidth - ICON_SIZE - 4),
          clamp(p.y, 4, window.innerHeight - ICON_SIZE - 4)
        );
      }
    });
  }

  function toggleBtn() {
    if (!btnEl) return;
    var hidden = !getCfg(K_HIDDEN, false);
    setCfg(K_HIDDEN, hidden);
    btnEl.style.display = hidden ? 'none' : 'flex';
    toast(hidden ? '悬浮钮已隐藏（菜单里可再打开）' : '悬浮钮已显示', hidden ? 'warn' : 'ok');
  }

  function mount() {
    if (document.getElementById(HOST_ID)) return;
    var parent = document.body || document.documentElement;
    if (!parent) return;
    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    hostEl.style.cssText = 'all:initial;position:fixed;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147483646;';
    parent.appendChild(hostEl);
    shadowRoot = hostEl.attachShadow({ mode: 'open' });
    applyCss(shadowRoot, CSS);
    initBtn(shadowRoot);
  }

  function registerMenus() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    try {
      GM_registerMenuCommand('📤 发送当前页面', function () { doSend(); });
      GM_registerMenuCommand('⚙ 推送设置', function () { openPanel(false); });
      GM_registerMenuCommand('🧪 发送测试消息', function () {
        var raw = String(getCfg(K_WEBHOOK, '') || '').trim();
        if (!raw) {
          toast('还没配置推送地址', 'warn');
          openPanel(true);
          return;
        }
        var cfg;
        try {
          cfg = buildRequest(raw, { title: '【测试】网页推送脚本', url: location.href, time: nowCN() }, getCfg(K_TEMPLATE, ''));
        } catch (e) {
          toast(String((e && e.message) || e), 'err');
          return;
        }
        postJson(cfg.url, cfg.payload, function (status, text) {
          var r = judge(cfg.kind, status, text);
          toast(r.ok ? '测试成功 ✅' : '测试失败：' + r.msg, r.ok ? 'ok' : 'err');
        });
      });
      GM_registerMenuCommand('👁 悬浮钮 显示/隐藏', function () { toggleBtn(); });
    } catch (e) {}
  }

  /* ============================== 启动 ============================== */
  function init() {
    if (typeof document === 'undefined') return;
    try {
      mount();
      registerMenus();
    } catch (e) {
      try { console.warn('[网页推送到企微] 初始化失败：', e); } catch (e2) {}
    }
  }

  init();

  // 供 Node 单测使用（浏览器/脚本猫环境无 module，走不到这里）
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      normalizeUrl: normalizeUrl,
      detectKind: detectKind,
      buildContent: buildContent,
      fitWecom: fitWecom,
      buildRequest: buildRequest,
      utf8Len: utf8Len,
      truncateUtf8: truncateUtf8,
      jsonEsc: jsonEsc,
      judge: judge
    };
  }
})();
