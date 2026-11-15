// ==UserScript==
// @name         网页剪藏 → EdgeEver
// @name:zh-CN   网页剪藏 → EdgeEver
// @namespace    https://github.com/rentianyu/ai
// @version      2.0.4
// @license      MIT
// @homepageURL  https://github.com/rentianyu/ai
// @supportURL   https://github.com/rentianyu/ai/issues
// @updateURL    https://f.xbta.cc/ai/js/edgeever-clip.user.js
// @downloadURL  https://f.xbta.cc/ai/js/edgeever-clip.user.js
// @description  一键把当前网页正文剪藏到 EdgeEver，保留标题/段落/列表/表格/引用/代码/图片等排版；内置 Discuz 论坛与飞书云文档（docx/wiki）适配；可将正文图片转存进笔记（解决飞书等防盗链图片打不开）
// @author       小贝塔
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

/* ================================================================
 *  网页剪藏 → EdgeEver   单文件用户脚本（脚本猫 / Tampermonkey 通用）
 *  内联依赖（无需联网加载 CDN）——以下版权与许可归上游作者，非本脚本作者：
 *    - Mozilla Readability v0.6.0   | Copyright (c) 2010 Arc90 Inc, Apache License 2.0
 *    - Turndown v7.2.4              | Copyright (c) Dom Christie, MIT
 *    - turndown-plugin-gfm v1.0.2   | Copyright (c) Dom Christie, MIT
 *    - collapse-whitespace          | Copyright (c) 2014 Luc Thevenard <lucthevenard@gmail.com>, MIT
 *    （上述 Luc Thevenard 的邮箱是 collapse-whitespace 上游署名，不是本脚本作者的联系方式）
 *  站点适配：
 *    - Discuz 论坛（52pojie 等）—— 取楼主 .t_f 正文
 *    - 飞书云文档（*.feishu.cn / larksuite.com 的 /docx /wiki）——
 *      页面内带登录态调用飞书 client_vars 接口取全量块树 → Markdown（绕开虚拟滚动）
 *  保存：EdgeEver REST  POST {SITE}/api/v1/memos（SITE 在脚本菜单「⚙️ 设置」中配置）
 * ================================================================ */

(function () {
  'use strict';

  /* ============================== 配置区 ============================== */
  /* ---------- 默认值（均为占位示例，请在脚本菜单「⚙️ 设置」里改成你自己的） ----------
   *  站点示例    ：https://note.example.com   ← 你的 EdgeEver 部署地址
   *  笔记本示例  ：your-notebook-id           ← 在 EdgeEver 打开该笔记本，从地址栏取 ID
   *  令牌        ：在 EdgeEver「设置 → 访问令牌」中生成（脚本内不保存任何令牌）
   * ---------------------------------------------------------------------------- */
  var DEFAULT_SITE     = '';   // 留空 -> 首次使用会提示先完成设置
  var DEFAULT_NOTEBOOK = '';

  function cfgSite()  { return String(gvRaw('site', DEFAULT_SITE) || '').trim().replace(/\/+$/, ''); }
  function cfgToken() { return String(gvRaw('token', '') || '').trim(); }
  function isConfigured() { return !!(gvRaw('site', '') && gvRaw('token', '') && gvRaw('notebook', '')); }
  var CFG = {
    SITE: cfgSite(),
    API: cfgSite() + '/api/v1/memos',
    TOKEN: cfgToken(),
    NOTEBOOK: gvRaw('notebook', DEFAULT_NOTEBOOK),
    TAGS: gvRaw('tags', []),
    SHOW_BTN: gvRaw('showbtn', true),
    INCLUDE_REPLIES: gvRaw('include_replies', false),
    MIN_CHARS: 120,
    KEEP_IMAGES: true,
    MAX_IMAGES: 60,
    MAX_IMG_BYTES: 12 * 1024 * 1024,
    TIMEOUT: 30000
  };

  /* ============================ 基础工具 ============================ */
  function gvRaw(k, d) { try { var v = GM_getValue(k); return (v === undefined || v === null || v === '') ? d : v; } catch (e) { return d; } }
  function sv(k, v) { try { GM_setValue(k, v); } catch (e) { } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nowStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function absUrl(u, base) { try { return new URL(u, base || document.baseURI).href; } catch (e) { return u; } }
  function shortUrl(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/\/+$/, ''); }
  function stripTags(h) { return String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim(); }
  function cleanTitle(t) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (!t) t = location.hostname + shortUrl(location.pathname);
    return t.length > 200 ? t.slice(0, 200) : t;
  }
  function fmtTime(s) {
    try { var d = new Date(s); if (isNaN(d.getTime())) return s; return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); } catch (e) { return s; }
  }
  function normTitle(s) { return String(s || '').toLowerCase().replace(/[\s\-–—｜|·_:：,，.。!！?？"'“”‘’()（）\[\]【】]/g, ''); }
  function sameTitle(a, b) {
    a = normTitle(a); b = normTitle(b);
    if (!a || !b) return false;
    return a === b || (b.length > 2 && a.indexOf(b) >= 0) || (a.length > 2 && b.indexOf(a) >= 0);
  }
  function stripSiteSuffix(title, site) {
    if (site) {
      var seps = [' | ', ' ｜ ', ' - ', ' – ', ' — ', '|', '｜', '·', '_'];
      for (var i = 0; i < seps.length; i++) {
        var suf = seps[i] + site;
        if (title.length > suf.length && title.slice(-suf.length).toLowerCase() === suf.toLowerCase()) return title.slice(0, title.length - suf.length).trim();
      }
    }
    var m = title.match(/^(.{2,}?)\s*(?:\||｜|\s[-–—]\s)\s*([^|｜]{2,24})$/);
    if (m && normTitle(m[2]).length >= 2) return m[1].trim();
    return title;
  }
  function currentNotebook() { return gvRaw('notebook', DEFAULT_NOTEBOOK); }
  function currentTags() { var t = gvRaw('tags', []); return Array.isArray(t) ? t : []; }
  function includeReplies() { return gvRaw('include_replies', false); }

  /* ====================== 图片 / 链接 / 属性处理 ====================== */
  function pickLargestSrcset(ss) {
    try {
      var best = null, bestW = -1;
      String(ss).split(',').forEach(function (part) {
        var seg = String(part).trim().split(/\s+/);
        if (!seg[0]) return;
        var w = parseFloat(seg[1]) || 0;
        if (seg[1] && /x$/.test(seg[1])) w = parseFloat(seg[1]) * 10000;
        if (w >= bestW) { bestW = w; best = seg[0]; }
      });
      return best;
    } catch (e) { return null; }
  }
  function normalizeImages(root, base) {
    var imgs = root.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!CFG.KEEP_IMAGES) { img.parentNode && img.parentNode.removeChild(img); continue; }
      var cand = img.getAttribute('data-src') || img.getAttribute('data-original') ||
                 img.getAttribute('data-lazy-src') || img.getAttribute('data-lazyload') ||
                 img.getAttribute('data-actualsrc') || img.getAttribute('data-echo') ||
                 img.getAttribute('zoomfile') || img.getAttribute('file') ||
                 img.getAttribute('src');
      var ss = img.getAttribute('srcset') || img.getAttribute('data-srcset');
      if (ss) { var b = pickLargestSrcset(ss); if (b) cand = b; }
      if (cand) img.setAttribute('src', absUrl(cand, base));
      var drop = ['data-src', 'data-original', 'data-lazy-src', 'data-lazyload', 'data-actualsrc',
                  'data-echo', 'zoomfile', 'file', 'w', 'aid', 'srcset', 'data-srcset', 'data-sizes', 'sizes', 'loading', 'decoding'];
      for (var j = 0; j < drop.length; j++) img.removeAttribute(drop[j]);
      if (!img.getAttribute('src')) img.parentNode && img.parentNode.removeChild(img);
    }
  }
  function absolutizeLinks(root, base) {
    var as = root.querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href');
      if (h && !/^(#|javascript:|mailto:|tel:|data:)/i.test(h)) as[i].setAttribute('href', absUrl(h, base));
    }
  }
  function simplifyAttrs(root) {
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var keep = {};
      var want = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'start'];
      var nm = el.nodeName;
      if (nm === 'CODE' || nm === 'PRE') want.push('class');
      for (var w = 0; w < want.length; w++) { if (el.hasAttribute(want[w])) keep[want[w]] = el.getAttribute(want[w]); }
      var names = [];
      for (var a = 0; a < el.attributes.length; a++) names.push(el.attributes[a].name);
      for (var n = 0; n < names.length; n++) el.removeAttribute(names[n]);
      for (var k in keep) el.setAttribute(k, keep[k]);
    }
  }
  function unwrapAll(root, tags) {
    var els = root.querySelectorAll(tags.join(','));
    for (var i = els.length - 1; i >= 0; i--) {
      var el = els[i], p = el.parentNode; if (!p) continue;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
    }
  }
  function stripSelf(root) {
    var s = root.querySelectorAll('#ee-clip-btn,#ee-clip-style,.ee-clip-toast,.ee-clip-btn');
    for (var i = 0; i < s.length; i++) s[i].parentNode && s[i].parentNode.removeChild(s[i]);
  }

  /* ====================== Discuz 论坛帖适配 ====================== */
  function dzCodeToPre(root) {
    var codes = root.querySelectorAll('.blockcode');
    for (var i = 0; i < codes.length; i++) {
      var b = codes[i];
      var lis = b.querySelectorAll('ol li,ul li');
      var text = '';
      if (lis.length) { var arr = []; for (var k = 0; k < lis.length; k++) arr.push(lis[k].textContent); text = arr.join('\n'); }
      else { text = b.textContent || ''; }
      var pre = document.createElement('pre');
      var code = document.createElement('code');
      code.textContent = String(text).replace(/\s+$/, '');
      pre.appendChild(code);
      b.parentNode && b.parentNode.replaceChild(pre, b);
    }
  }
  function cleanFragment(el, base) {
    var c = el.cloneNode(true);
    var junk = c.querySelectorAll(
      '.tip,.pi,.cmt,.rate,.pstatus,.pstl,.psth,.postactions,.a_p,.sign,.pls,.favatar,.toc,.avatar,' +
      '.xg1,.showhide,.pattl dt,script,style,noscript,form,button,input,select,textarea,iframe,svg,nav,link,meta'
    );
    for (var i = 0; i < junk.length; i++) junk[i].parentNode && junk[i].parentNode.removeChild(junk[i]);
    unwrapAll(c, ['ignore_js_op', 'ignore_js_content']);
    dzCodeToPre(c);
    normalizeImages(c, base);
    absolutizeLinks(c, base);
    simplifyAttrs(c);
    return c.innerHTML || '';
  }
  function cleanPostContent(postEl, floor, base) {
    var html = cleanFragment(postEl, base);
    if (floor) {
      var atts = floor.querySelectorAll('.pattl');
      for (var i = 0; i < atts.length; i++) html += cleanFragment(atts[i], base);
    }
    return html;
  }
  function extractDiscuz() {
    var posts = document.querySelectorAll('.t_f[id^="postmessage_"]');
    if (!posts.length) return null;
    var base = document.baseURI;
    var titleEl = document.getElementById('thread_subject');
    var title = titleEl ? titleEl.textContent.trim() : (document.title || '');
    var list = includeReplies() ? Array.prototype.slice.call(posts) : [posts[0]];

    var parts = [];
    for (var i = 0; i < list.length; i++) {
      var postEl = list[i];
      var floor = postEl.closest ? (postEl.closest('div[id^="post_"]') || postEl.closest('table[id^="pid"]')) : null;
      if (i > 0) parts.push('<p><strong>▍回复 ' + i + '</strong></p>');
      parts.push(cleanPostContent(postEl, floor, base));
    }

    var byline = '', published = '';
    var firstFloor = list[0].closest ? (list[0].closest('div[id^="post_"]') || list[0].closest('table[id^="pid"]')) : null;
    if (firstFloor) {
      var nm = firstFloor.querySelector('.authi .xw1,.pls .xw1,.xw1');
      var tm = firstFloor.querySelector('.authi em');
      byline = nm ? nm.textContent.trim() : '';
      published = tm ? String(tm.textContent).replace(/^[\s\S]*?发表于\s*/, '').replace(/\s+/g, ' ').trim() : '';
    }
    return { title: title, byline: byline, siteName: location.hostname, published: published, html: parts.join('\n') };
  }

  /* ====================== 飞书云文档适配 ====================== */
  var FEISHU_HOST_RE = /\.(feishu\.cn|larksuite\.com|larkoffice\.com|feishu\.net)$/i;
  function isFeishuDoc() {
    if (!FEISHU_HOST_RE.test(location.hostname)) return false;
    return /\/(docx|wiki|docs)\/[A-Za-z0-9]+/.test(location.pathname);
  }
  function feishuBaseDomain(host) {
    var known = ['feishu.cn', 'larksuite.com', 'larkoffice.com', 'feishu.net'];
    for (var i = 0; i < known.length; i++) {
      if (host === known[i] || host.slice(-(known[i].length + 1)) === '.' + known[i]) return known[i];
    }
    var labels = host.split('.');
    return labels.length >= 3 ? labels.slice(1).join('.') : host;
  }
  function feishuDriveHost() { return 'internal-api-drive-stream.' + feishuBaseDomain(location.hostname); }

  function feishuGet(path) {
    var url = /^https?:/i.test(path) ? path : (location.origin + path);
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: 'GET', url: url, timeout: 20000,
        headers: { 'Accept': 'application/json' },
        onload: function (r) {
          if (r.status < 200 || r.status >= 300) { reject(new Error('飞书 HTTP ' + r.status)); return; }
          var j; try { j = JSON.parse(r.responseText); } catch (e) { reject(new Error('飞书响应解析失败')); return; }
          if (j.code && j.code !== 0) { reject(new Error('飞书接口 code=' + j.code + (j.msg ? (' ' + j.msg) : ''))); return; }
          resolve(j.data || {});
        },
        onerror: function () { reject(new Error('飞书接口网络错误')); },
        ontimeout: function () { reject(new Error('飞书接口超时')); }
      });
    });
  }
  function feishuFindSpaceId(info, wikiToken) {
    try {
      var data = info || {};
      var nodes = data.nodes || data;
      if (nodes && typeof nodes === 'object') {
        if (nodes[wikiToken] && nodes[wikiToken].space_id != null) return String(nodes[wikiToken].space_id);
        for (var k in nodes) { if (nodes[k] && nodes[k].space_id != null) return String(nodes[k].space_id); }
      }
      if (data.space_id != null) return String(data.space_id);
    } catch (e) { }
    return '';
  }
  function feishuResolve(kind, token) {
    if (kind !== 'wiki') return Promise.resolve({ objToken: token, wikiToken: '', spaceId: '', title: '' });
    var spaceId = '';
    return feishuGet('/space/api/wiki/v2/tree/get_info/?wiki_token=' + encodeURIComponent(token))
      .catch(function () { return {}; })
      .then(function (info) {
        spaceId = feishuFindSpaceId(info, token);
        var q = '?wiki_token=' + encodeURIComponent(token) + (spaceId ? ('&space_id=' + encodeURIComponent(spaceId)) : '');
        return feishuGet('/space/api/wiki/v2/tree/get_node/' + q);
      })
      .then(function (nodeRes) {
        var n = (nodeRes && (nodeRes.node || nodeRes)) || {};
        return { objToken: String(n.obj_token || token), wikiToken: token, spaceId: String(n.space_id || spaceId || ''), title: n.title || '', objType: n.obj_type };
      });
  }
  function feishuChildrenOf(e) {
    if (!e) return null;
    var c = (e.children != null) ? e.children : (e.data && e.data.children);
    if (Array.isArray(c)) return c;
    if (c && typeof c === 'object') { var out = []; for (var k in c) { if (Array.isArray(c[k])) out = out.concat(c[k]); } return out; }
    return null;
  }
  function feishuMergeMap(dst, src) {
    for (var id in src) {
      if (!(id in dst)) { dst[id] = src[id]; continue; }
      var a = dst[id], b = src[id];
      var cb = feishuChildrenOf(b);
      if (cb && b) {
        var ca = feishuChildrenOf(a);
        if (!ca) { ca = []; if (a.children == null) a.children = ca; }
        for (var i = 0; i < cb.length; i++) { if (ca.indexOf(cb[i]) < 0) ca.push(cb[i]); }
      }
    }
  }
  function feishuFetchBlocks(resolved) {
    var id = encodeURIComponent(resolved.objToken);
    var wikiPart = resolved.wikiToken ? ('&wiki_space_id=' + encodeURIComponent(resolved.spaceId || '') + '&container_type=wiki2.0&container_id=' + encodeURIComponent(resolved.wikiToken)) : '';
    var blockMap = {}, sequence = [], seqSeen = {}, skipped = [];
    function addSeq(pd) { var s = pd.block_sequence || []; for (var i = 0; i < s.length; i++) { var x = String(s[i]); if (!seqSeen[x]) { seqSeen[x] = 1; sequence.push(x); } } }
    function u(mode, cursor) { return '/space/api/docx/pages/client_vars?id=' + id + '&mode=' + mode + (cursor ? ('&cursor=' + encodeURIComponent(cursor)) : '') + '&limit=239' + wikiPart; }

    return feishuGet(u(1, '')).then(function (first) {
      feishuMergeMap(blockMap, first.block_map || {});
      addSeq(first);
      (first.skip_blocks || []).forEach(function (s) { skipped.push(String(s)); });
      var cursor = first.cursor || '', hasMore = !!first.has_more, guard = 0;
      function nextPage() {
        if (!hasMore || !cursor || guard >= 30) return Promise.resolve();
        guard++;
        return feishuGet(u(1, cursor)).then(function (pd) {
          var map = pd.block_map || {}, fresh = 0;
          for (var k in map) { if (!(k in blockMap)) fresh++; }
          if (fresh <= 0) { hasMore = false; return; }
          feishuMergeMap(blockMap, map); addSeq(pd);
          (pd.skip_blocks || []).forEach(function (s) { skipped.push(String(s)); });
          hasMore = !!pd.has_more; cursor = pd.cursor || '';
          return nextPage();
        });
      }
      return nextPage();
    }).then(function () {
      var uniq = {}, list = [];
      skipped.forEach(function (x) { if (!uniq[x]) { uniq[x] = 1; list.push(x); } });
      var chain = Promise.resolve();
      list.slice(0, 40).forEach(function (bid) {
        chain = chain.then(function () {
          return feishuGet('/space/api/docx/pages/client_vars?id=' + id + '&mode=4&block_id=' + encodeURIComponent(bid) + '&limit=239' + wikiPart)
            .then(function (sd) { feishuMergeMap(blockMap, sd.block_map || {}); addSeq(sd); })
            .catch(function () { });
        });
      });
      return chain;
    }).then(function () { return { block_map: blockMap, block_sequence: sequence }; });
  }
  function feishuBuildTree(data, objToken) {
    var rawMap = data.block_map || {}, seq = data.block_sequence || [], map = {};
    function typeOf(e) { return String((e.data && e.data.type) || e.type || 'unknown'); }
    var id;
    for (id in rawMap) {
      var e = rawMap[id] || {}, ch = feishuChildrenOf(e) || [];
      map[id] = { id: id, type: typeOf(e), parentId: (e.parent_id || (e.data && e.data.parent_id) || null), children: ch.map(String), data: e.data || {}, raw: e };
    }
    var rootId = null;
    for (id in map) { if (map[id].type === 'page') { rootId = id; break; } }
    if (!rootId && map[objToken]) rootId = objToken;
    if (!rootId) { for (id in map) { if (!map[id].parentId) { rootId = id; break; } } }
    var order = [];
    if (rootId && map[rootId] && map[rootId].children.length) {
      order = map[rootId].children.filter(function (x) { return map[x]; });
      var inOrder = {}; order.forEach(function (x) { inOrder[x] = 1; });
      (seq.length ? seq : Object.keys(map)).forEach(function (x) { if (!inOrder[x] && map[x] && map[x].parentId === rootId) { inOrder[x] = 1; order.push(x); } });
    } else if (seq.length) {
      order = seq.filter(function (x) { return map[x] && x !== rootId; });
    } else {
      order = Object.keys(map).filter(function (x) { return x !== rootId; });
    }
    return { map: map, order: order };
  }
  /* apool / attributed text 解码 */
  function feishuToLines(v) {
    if (v == null) return [];
    if (typeof v === 'string') return [v];
    return Object.keys(v).sort(function (a, b) { return Number(a) - Number(b); }).map(function (k) { return v[k] == null ? '' : v[k]; });
  }
  function feishuUsableUrl(u) { return /^(https?:|mailto:|tel:|\/)/i.test((u || '').trim()); }
  function feishuDecodeLink(val) {
    if (!val) return val;
    try { var d = decodeURIComponent(val); var m = d.match(/https?:\/\/[^\s"']+/); return m ? m[0] : d; } catch (e) { return val; }
  }
  function feishuMakeNode(text, attrNums, numToAttrib) {
    var node = { text: text };
    for (var i = 0; i < attrNums.length; i++) {
      var pair = numToAttrib[String(attrNums[i])];
      if (!pair) continue;
      var key = String(pair[0] || '').toLowerCase(), val = pair[1];
      if (key.indexOf('bold') >= 0) node.bold = true;
      else if (key.indexOf('italic') >= 0) node.italic = true;
      else if (key.indexOf('strike') >= 0) node.strike = true;
      else if (key.indexOf('inline') >= 0 && key.indexOf('code') >= 0) node.inlineCode = true;
      else if (key === 'code' || key.indexOf('codeinline') >= 0) node.inlineCode = true;
      else if (key.indexOf('equation') >= 0) node.equation = val;
      else if (key.indexOf('inline-component') >= 0 || key.indexOf('inline_component') >= 0) {
        try {
          var comp = JSON.parse(val), dd = (comp && comp.data) || {};
          var ttl = String(dd.title || dd.name || '').trim();
          if (ttl) node.text = ttl;
          var u = feishuDecodeLink(String(dd.raw_url || dd.url || dd.link || ''));
          if (feishuUsableUrl(u)) node.link = u;
        } catch (e) { }
      }
      else if (!/(^|[-_])id$/.test(key) && (key.indexOf('link') >= 0 || key.indexOf('href') >= 0 || key.indexOf('url') >= 0)) {
        var lu = feishuDecodeLink(val);
        if (feishuUsableUrl(lu)) node.link = lu;
      }
    }
    return node;
  }
  function feishuDecodeLine(text, attribs, numToAttrib) {
    if (!attribs) return text ? [{ text: text }] : [];
    var nodes = [], idx = 0, pending = [];
    var re = /(\*[0-9a-z]+|\|[0-9a-z]+|\+[0-9a-z]+|=[0-9a-z]+|-[0-9a-z]+)/g, m;
    while ((m = re.exec(attribs))) {
      var op = m[0], code = op[0], num = op.slice(1);
      if (code === '*') pending.push(parseInt(num, 36));
      else if (code === '+') { var len = parseInt(num, 36); var chunk = text.slice(idx, idx + len); idx += len; if (chunk) nodes.push(feishuMakeNode(chunk, pending, numToAttrib)); pending = []; }
      else if (code !== '|') pending = [];
    }
    if (idx < text.length) nodes.push({ text: text.slice(idx) });
    return nodes;
  }
  function feishuDecodeText(textData) {
    var data = textData || {};
    var iat = data.initialAttributedTexts || {};
    var numToAttrib = (data.apool && data.apool.numToAttrib) || {};
    var texts = feishuToLines(iat.text), attribs = feishuToLines(iat.attribs);
    var out = [];
    for (var i = 0; i < texts.length; i++) {
      if (i > 0) out.push({ text: '\n' });
      out = out.concat(feishuDecodeLine(texts[i], attribs[i] || '', numToAttrib));
    }
    var merged = [];
    for (var j = 0; j < out.length; j++) {
      var n = out[j], last = merged[merged.length - 1];
      if (last && !last.link && !n.link && !last.equation && !n.equation && last.bold === n.bold && last.italic === n.italic && last.strike === n.strike && last.inlineCode === n.inlineCode) last.text += n.text;
      else merged.push({ text: n.text, bold: n.bold, italic: n.italic, strike: n.strike, inlineCode: n.inlineCode, link: n.link, equation: n.equation });
    }
    return merged;
  }
  function feishuRenderInline(nodes) {
    return (nodes || []).map(function (n) {
      var t = n.text;
      if (t === '\n') return '  \n';
      if (n.equation) return '$' + String(n.equation).trim() + '$';
      if (n.inlineCode) return '`' + String(t).replace(/`/g, '\\`') + '`';
      if (n.bold) t = '**' + t + '**';
      if (n.italic) t = '*' + t + '*';
      if (n.strike) t = '~~' + t + '~~';
      if (n.link) t = '[' + t + '](' + n.link + ')';
      return t;
    }).join('');
  }
  function feishuPlain(nodes) { return (nodes || []).map(function (n) { return n.equation || n.text; }).join(''); }
  function feishuTextOf(block) { var d = block.data || {}; return feishuDecodeText(d.text || d); }

  function feishuRenderListItem(block, depth, ctx) {
    var indent = new Array(depth + 1).join('  ');
    var marker = block.type === 'ordered' ? '1.' : (block.type === 'todo' ? ((block.data && block.data.done) ? '- [x]' : '- [ ]') : '-');
    var out = [indent + marker + ' ' + feishuRenderInline(feishuTextOf(block))];
    for (var i = 0; i < block.children.length; i++) {
      var c = ctx.map[block.children[i]];
      if (!c) continue;
      if (c.type === 'bullet' || c.type === 'ordered' || c.type === 'todo' || c.type === 'toggle') { out.push(feishuRenderListItem(c, depth + 1, ctx)); ctx.seen[c.id] = 1; }
      else {
        var s = feishuRender(c, depth + 1, ctx);
        if (s && s.trim()) out.push(s.split('\n').map(function (l) { return new Array(depth + 2).join('  ') + l; }).join('\n'));
      }
    }
    return out.join('\n');
  }
  function feishuRender(block, depth, ctx) {
    if (!block || ctx.seen[block.id]) return '';
    ctx.seen[block.id] = 1;
    var t = block.type, d = block.data || {};
    function children() {
      var out = [];
      for (var i = 0; i < block.children.length; i++) {
        var c = ctx.map[block.children[i]];
        if (c) { var s = feishuRender(c, depth, ctx); if (s && s.trim()) out.push(s); }
      }
      return out.join('\n\n');
    }
    function self() { return feishuRenderInline(feishuTextOf(block)); }

    if (t === 'bullet' || t === 'ordered' || t === 'todo' || t === 'toggle') return feishuRenderListItem(block, depth, ctx);
    if (t === 'page' || t === 'grid' || t === 'grid_column' || t === 'quote_container') return children();
    if (t === 'text') return self();
    if (t.indexOf('heading') === 0) { var lv = Math.min(Number(d.level || (t.match(/heading(\d)/) || [])[1]) || 1, 6); return (new Array(lv + 1).join('#')) + ' ' + self(); }
    if (t === 'quote') return self().split('\n').map(function (l) { return '> ' + l; }).join('\n');
    if (t === 'code') { var lang = String(d.language || (d.code && d.code.language) || ''); return '```' + lang + '\n' + feishuPlain(feishuTextOf(block)) + '\n```'; }
    if (t === 'equation') return '$$\n' + feishuPlain(feishuTextOf(block)) + '\n$$';
    if (t === 'divider') return '---';
    if (t === 'image') {
      var img = d.image || {}, tok = String(img.token || '');
      if (!tok) return '';
      var iurl = 'https://' + feishuDriveHost() + '/space/api/box/stream/download/v2/cover/' + encodeURIComponent(tok) +
        '/?fallback_source=1&height=2560&mount_node_token=' + encodeURIComponent(block.id) + '&mount_point=docx_image&policy=equal&width=2560';
      return '![' + (img.name || 'image') + '](' + iurl + ')';
    }
    if (t === 'callout') return children() || self();
    if (t === 'sheet') return '> 〔内嵌表格 ' + (d.token || '') + '〕';
    if (t === 'whiteboard' || t === 'board') return '> 〔画板〕';
    if (t === 'file' || t === 'attachment') { var f = d.file || {}; return '📎 ' + (f.name || '附件'); }
    var s2 = self(), c2 = children();
    return [s2, c2].filter(function (x) { return x && x.trim(); }).join('\n\n');
  }
  function extractFeishu() {
    if (!isFeishuDoc()) return Promise.resolve(null);
    var m = location.pathname.match(/\/(docx|wiki|docs)\/([A-Za-z0-9]+)/);
    if (!m) return Promise.resolve(null);
    var kind = m[1] === 'docs' ? 'docx' : m[1], token = m[2];
    return feishuResolve(kind, token).then(function (resolved) {
      var ot = Number(resolved.objType);
      if (ot === 3 || ot === 8 || /^(sht|bas)/i.test(resolved.objToken)) return null; // 电子表格/多维表格
      return feishuFetchBlocks(resolved).then(function (data) {
        var tree = feishuBuildTree(data, resolved.objToken);
        if (!tree.order.length) return null;
        var ctx = { map: tree.map, seen: {} }, parts = [];
        for (var i = 0; i < tree.order.length; i++) {
          var s = feishuRender(tree.map[tree.order[i]], 0, ctx);
          if (s && s.trim()) parts.push(s);
        }
        var md = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
        if (!md) return null;
        var title = String(resolved.title || document.title || '').replace(/\s*[-–—|｜]\s*(飞书云文档|Lark|Feishu|飞书).*$/i, '').trim();
        return { title: title, md: md, byline: '', siteName: location.hostname, published: '' };
      });
    });
  }

  /* ====================== 通用正文提取 ====================== */
  function extractGeneric() {
    var base = document.baseURI;
    var title = document.title || '', byline = '', siteName = location.hostname, published = '';
    var html = '', art = null;
    try {
      var clone = document.cloneNode(true);
      stripSelf(clone);
      normalizeImages(clone, base);
      absolutizeLinks(clone, base);
      art = new Readability(clone, { charThreshold: CFG.MIN_CHARS, keepClasses: true }).parse();
    } catch (e) { art = null; }

    if (art && art.content && stripTags(art.content).length >= CFG.MIN_CHARS) {
      title = art.title || title; byline = art.byline || ''; siteName = art.siteName || siteName;
      published = art.publishedTime || ''; html = art.content;
    } else {
      var node = document.querySelector('article,main,[role="main"],#article,#content,.article,.post,.entry-content,.post-content,.article-content') || document.body || document.documentElement;
      var c2 = node.cloneNode(true);
      stripSelf(c2); normalizeImages(c2, base); absolutizeLinks(c2, base);
      var junk = c2.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,iframe,svg,button');
      for (var i = 0; i < junk.length; i++) junk[i].parentNode && junk[i].parentNode.removeChild(junk[i]);
      html = c2.innerHTML || '';
    }
    return { title: title, byline: byline, siteName: siteName, published: published, html: html };
  }

  /* ====================== HTML → Markdown ====================== */
  function addTableRules(svc) {
    svc.addRule('mdTableCell', {
      filter: ['th', 'td'],
      replacement: function (content, node) {
        var idx = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
        var prefix = idx === 0 ? '| ' : ' ';
        return prefix + String(content).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim() + ' |';
      }
    });
    svc.addRule('mdTableRow', { filter: 'tr', replacement: function (content) { return '\n' + content; } });
    svc.addRule('mdTableSection', { filter: ['thead', 'tbody', 'tfoot'], replacement: function (content) { return content; } });
    svc.addRule('mdTable', {
      filter: function (node) { return node.nodeName === 'TABLE'; },
      replacement: function (content) {
        var lines = String(content).split('\n').filter(function (l) { return /\|/.test(l); });
        if (!lines.length) return '';
        var cols = (lines[0].match(/\|/g) || []).length - 1;
        if (cols < 1) return '\n\n' + lines.join('\n') + '\n\n';
        var border = '|' + new Array(cols + 1).join(' --- |');
        lines.splice(1, 0, border);
        return '\n\n' + lines.join('\n') + '\n\n';
      }
    });
  }

  var _td = null;
  function turndownService() {
    if (_td) return _td;
    var svc = new TurndownService({
      headingStyle: 'atx', hr: '---', bulletListMarker: '-',
      codeBlockStyle: 'fenced', fence: '```',
      emDelimiter: '*', strongDelimiter: '**', linkStyle: 'inlined'
    });
    try {
      svc.use(turndownPluginGfm.strikethrough);
      svc.use(turndownPluginGfm.taskListItems);
      svc.use(turndownPluginGfm.highlightedCodeBlock);
    } catch (e) { }
    addTableRules(svc);
    svc.addRule('fencedCodeWithLang', {
      filter: function (node) { return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE'; },
      replacement: function (content, node) {
        var code = node.firstChild;
        var cls = code.getAttribute('class') || '';
        var m = cls.match(/(?:language|lang|highlight-source)-([\w+#.-]+)/i);
        var lang = m ? m[1] : '';
        var text = code.textContent.replace(/\n+$/, '');
        return '\n\n```' + lang + '\n' + text + '\n```\n\n';
      }
    });
    _td = svc;
    return svc;
  }

  function buildMarkdown(a) {
    var body;
    if (a && a.md != null) { body = String(a.md); }
    else { try { body = turndownService().turndown(a.html); } catch (e) { body = stripTags(a.html); } }
    body = String(body).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();

    var lines = body.split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    if (lines.length && /^#{1,6}\s+/.test(lines[0])) {
      var h = lines[0].replace(/^#{1,6}\s+/, '').trim();
      if (sameTitle(h, cleanTitle(a.title))) {
        lines.shift();
        while (lines.length && !lines[0].trim()) lines.shift();
        body = lines.join('\n').trim();
      }
    }

    var title = stripSiteSuffix(cleanTitle(a.title), a.siteName);
    var meta = [];
    if (a.byline) meta.push('作者：' + String(a.byline).replace(/^\s*作者\s*[:：]?\s*/, ''));
    if (a.siteName && a.siteName !== location.hostname) meta.push('站点：' + a.siteName);
    meta.push('来源：[' + shortUrl(location.href) + '](' + location.href + ')');
    if (a.published) meta.push('发布时间：' + fmtTime(a.published));
    meta.push('剪藏：' + nowStr());
    var metaBlock = meta.map(function (m) { return '> ' + m; }).join('\n');

    return '# ' + title + '\n\n' + metaBlock + '\n\n---\n\n' + body + '\n';
  }

  /* ====================== 保存到 EdgeEver ====================== */
  function wantUploadImages() { return gvRaw('upload_images', true) !== false; }

  function eeRequest(opt) {
    return new Promise(function (resolve, reject) {
      var headers = { 'Accept': 'application/json', 'Authorization': 'Bearer ' + CFG.TOKEN };
      if (opt.headers) { for (var k in opt.headers) headers[k] = opt.headers[k]; }
      var req = {
        method: opt.method || 'GET', url: opt.url, timeout: opt.timeout || CFG.TIMEOUT, headers: headers,
        onload: function (r) {
          if (r.status >= 200 && r.status < 300) { resolve(r); return; }
          var msg = 'HTTP ' + r.status;
          try { var j = JSON.parse(r.responseText); if (j && j.error && j.error.message) msg += ' ' + j.error.message; } catch (e) { }
          if (r.status === 401 || r.status === 403) msg = '令牌无效或无权限（' + msg + '）';
          reject(new Error(msg));
        },
        onerror: function () { reject(new Error('网络错误，无法连接 ' + (CFG.SITE || 'EdgeEver 站点'))); },
        ontimeout: function () { reject(new Error('请求超时')); }
      };
      if (opt.data != null) req.data = opt.data;
      if (opt.responseType) req.responseType = opt.responseType;
      GM_xmlhttpRequest(req);
    });
  }
  function parseJson(r) { try { return JSON.parse(r.responseText) || {}; } catch (e) { return {}; } }

  function saveMemo(title, md) {
    if (!CFG.TOKEN) return Promise.reject(new Error('尚未设置 Token（脚本菜单 → ⚙️ 设置）'));
    if (!CFG.NOTEBOOK) return Promise.reject(new Error('尚未设置目标笔记本 ID（脚本菜单 → ⚙️ 设置）'));
    return eeRequest({
      method: 'POST', url: CFG.API, headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ notebookId: currentNotebook(), title: cleanTitle(title), contentMarkdown: md, tags: currentTags() })
    }).then(function (r) { var j = parseJson(r); return j.memo || j; });
  }

  /* --------- 图片转存：正文图片 → 下载 → 上传为笔记资源 → 回填正文 --------- */
  function extractImageRefs(md) {
    var refs = [], n = 0;
    if (!wantUploadImages()) return { md: md, refs: refs };
    var out = String(md).replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, function (full, alt, url) {
      if (refs.length >= CFG.MAX_IMAGES) return full;
      if (CFG.SITE && url.indexOf(CFG.SITE) === 0) return full;   // 已是本站资源，无需转存
      var key = 'EEIMGPH' + (n++) + 'X';
      refs.push({ key: key, url: url, alt: alt || '' });
      return '![' + alt + '](' + key + ')';
    });
    return { md: out, refs: refs };
  }
  function guessImageName(alt, mime, url) {
    var extMap = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/avif': '.avif', 'image/bmp': '.bmp', 'image/svg+xml': '.svg' };
    if (alt && alt.length <= 60 && /\.[a-z0-9]{2,5}$/i.test(alt)) return alt;
    var ext = extMap[mime] || '';
    if (!ext) { var m = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(?:$|[?#])/i.exec(url); ext = m ? ('.' + m[1].toLowerCase().replace('jpeg', 'jpg')) : '.png'; }
    return 'image' + ext;
  }
  function fetchImage(url) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: 'GET', url: url, timeout: 30000, responseType: 'arraybuffer',
        headers: { 'Accept': 'image/*,*/*;q=0.8' },
        onload: function (r) {
          if (r.status >= 200 && r.status < 300 && r.response && r.response.byteLength) {
            var ct = '', m = /content-type:\s*([^\r\n;]+)/i.exec(r.responseHeaders || '');
            if (m) ct = m[1].trim().toLowerCase();
            resolve({ buf: r.response, type: ct });
          } else { reject(new Error('HTTP ' + r.status)); }
        },
        onerror: function () { reject(new Error('网络错误')); },
        ontimeout: function () { reject(new Error('超时')); }
      });
    });
  }
  function uploadImageResource(memoId, filename, mime, buf) {
    var fd = new FormData();
    fd.append('file', new Blob([buf], { type: mime || 'application/octet-stream' }), filename || 'image');
    return eeRequest({ method: 'POST', url: CFG.API + '/' + encodeURIComponent(memoId) + '/resources', data: fd, timeout: 90000 })
      .then(function (r) { return parseJson(r).resource || {}; });
  }
  function replaceMemoMd(memoId, md) {
    return eeRequest({ method: 'POST', url: CFG.API + '/' + encodeURIComponent(memoId) + '/edit-sessions', headers: { 'Content-Type': 'application/json' }, data: '{}' })
      .then(function (r) {
        var es = parseJson(r).editSession || {};
        if (!es.id) throw new Error('无法开启编辑会话');
        return eeRequest({
          method: 'PATCH', url: CFG.API + '/' + encodeURIComponent(memoId), headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ editSessionId: es.id, expectedRevision: es.baseRevision, expectedContentHash: es.baseContentHash, contentMarkdown: md })
        });
      });
  }
  function transferImages(memoId, refs, md, onProgress) {
    var finalMd = md, ok = 0, fail = 0, chain = Promise.resolve();
    refs.forEach(function (ref, i) {
      chain = chain.then(function () {
        if (onProgress) onProgress(i + 1, refs.length);
        var ph = '![' + ref.alt + '](' + ref.key + ')';
        return fetchImage(ref.url).then(function (img) {
          if (img.buf.byteLength > CFG.MAX_IMG_BYTES) throw new Error('图片过大 ' + Math.round(img.buf.byteLength / 1048576) + 'MB');
          return uploadImageResource(memoId, guessImageName(ref.alt, img.type, ref.url), img.type, img.buf);
        }).then(function (res) {
          var u = /^https?:/i.test(res.url || '') ? res.url : (CFG.SITE + (res.url || ''));
          if (!u) throw new Error('无返回地址');
          finalMd = finalMd.replace(ph, '![' + (ref.alt || 'image') + '](' + u + ')');
          ok++;
        }).catch(function () {
          fail++;
          finalMd = finalMd.replace(ph, '![' + (ref.alt || 'image') + '](' + ref.url + ')');
        });
      });
    });
    return chain.then(function () { return { md: finalMd, ok: ok, fail: fail }; });
  }

  /* ====================== UI ====================== */
  var CSS = [
    '.ee-clip-btn{position:fixed;right:14px;bottom:96px;z-index:2147483646;width:44px;height:44px;border-radius:50%;',
    'background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.3);',
    'cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;opacity:.9;transition:transform .12s,opacity .2s;}',
    '.ee-clip-btn:hover{opacity:1;}.ee-clip-btn:active{transform:scale(.9);}',
    '.ee-clip-btn svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;}',
    '.ee-clip-btn.ee-busy{opacity:.6;}',
    '.ee-clip-toast{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:2147483647;max-width:86vw;',
    'background:rgba(17,22,28,.95);color:#fff;font-size:14px;line-height:1.55;padding:10px 14px;border-radius:10px;',
    'box-shadow:0 5px 18px rgba(0,0,0,.4);word-break:break-all;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '.ee-clip-toast a{color:#5eead4;text-decoration:none;margin-left:10px;white-space:nowrap;}'
  ].join('');

  function ensureStyle() {
    if (document.getElementById('ee-clip-style')) return;
    var s = document.createElement('style'); s.id = 'ee-clip-style'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  var toastEl = null, toastTimer = null;
  function toast(msg, ms, url) {
    ensureStyle();
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'ee-clip-toast'; (document.body || document.documentElement).appendChild(toastEl); }
    toastEl.textContent = '';
    var span = document.createElement('span'); span.textContent = msg; toastEl.appendChild(span);
    if (url) { var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '打开'; toastEl.appendChild(a); }
    toastEl.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    if (ms > 0) toastTimer = setTimeout(function () { if (toastEl) toastEl.style.display = 'none'; }, ms);
  }

  function clampBtn(btn) {
    var r = btn.getBoundingClientRect();
    var l = Math.min(Math.max(0, r.left), Math.max(0, window.innerWidth - r.width));
    var t = Math.min(Math.max(0, r.top), Math.max(0, window.innerHeight - r.height));
    btn.style.left = l + 'px'; btn.style.top = t + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto';
  }

  function createButton() {
    if (document.getElementById('ee-clip-btn')) return;
    ensureStyle();
    var btn = document.createElement('div');
    btn.id = 'ee-clip-btn'; btn.className = 'ee-clip-btn';
    btn.setAttribute('title', '剪藏到 EdgeEver');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16l-6-3.6L6 20z"/><path d="M12 8.2v5.6M9.2 11h5.6"/></svg>';

    var savedPos = gvRaw('btnpos', null);
    if (savedPos && savedPos.l != null) { btn.style.left = savedPos.l + 'px'; btn.style.top = savedPos.t + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto'; }

    var dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    btn.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
      var r = btn.getBoundingClientRect(); ox = r.left; oy = r.top;
      try { btn.setPointerCapture(e.pointerId); } catch (err) { }
      e.preventDefault();
    });
    btn.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) moved = true;
      if (moved) { btn.style.left = (ox + dx) + 'px'; btn.style.top = (oy + dy) + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto'; }
    });
    function endDrag() { if (!dragging) return; dragging = false; if (moved) { clampBtn(btn); sv('btnpos', { l: parseFloat(btn.style.left), t: parseFloat(btn.style.top) }); } }
    btn.addEventListener('pointerup', function () { var wasClick = dragging && !moved; endDrag(); if (wasClick) clip(); });
    btn.addEventListener('pointercancel', endDrag);

    (document.body || document.documentElement).appendChild(btn);
    clampBtn(btn);
  }

  /* ====================== 主流程 ====================== */
  var busy = false;
  function clip() {
    if (busy) return;
    busy = true;
    var btn = document.getElementById('ee-clip-btn');
    if (btn) btn.classList.add('ee-busy');
    function done() { busy = false; if (btn) btn.classList.remove('ee-busy'); }

    var pextract;
    try {
      if (isFeishuDoc()) {
        toast('⏳ 正在读取飞书文档…', 0);
        pextract = extractFeishu().then(function (a) { return a || extractGeneric(); });
      } else {
        pextract = Promise.resolve(extractDiscuz() || extractGeneric());
      }
    } catch (e) { done(); toast('❌ 提取正文失败：' + e.message, 5000); return; }

    pextract.then(function (article) {
      var md;
      try { md = buildMarkdown(article); } catch (e) { done(); toast('❌ 转换失败：' + e.message, 5000); return; }
      var ex = extractImageRefs(md);
      toast('⏳ 正在保存…', 0);
      return saveMemo(stripSiteSuffix(cleanTitle(article.title), article.siteName), ex.md).then(function (memo) {
        var memoId = memo && (memo.id || memo.memoId);
        var nbId = (memo && memo.notebookId) || currentNotebook();
        function finish(extra) {
          done();
          toast('✅ 已剪藏到「' + nbId + '」（' + md.length + ' 字' + (extra || '') + '）', 5000, CFG.SITE + '/');
        }
        if (!ex.refs.length || !memoId) { finish(''); return; }
        toast('⏳ 正在转存图片 0/' + ex.refs.length + '…', 0);
        return transferImages(memoId, ex.refs, ex.md, function (i, t) { toast('⏳ 正在转存图片 ' + i + '/' + t + '…', 0); })
          .then(function (r) {
            return replaceMemoMd(memoId, r.md).then(
              function () { finish('，图片 ' + r.ok + '/' + ex.refs.length + (r.fail ? ('（' + r.fail + ' 张失败，保留原链）') : '')); },
              function (e2) { finish('，图片已上传但正文回填失败：' + e2.message); }
            );
          });
      });
    }).catch(function (err) {
      done();
      toast('❌ 剪藏失败：' + err.message, 6000);
      console.error('[EdgeEver剪藏]', err);
    });
  }

  /* ====================== 菜单命令 ====================== */
  /* ---------- ⚙️ 设置：站点 / Token / 笔记本（存 GM_setValue，代码内不含任何令牌） ---------- */
  function maskToken(t) { return t ? '…' + String(t).slice(-4) : '(未设置)'; }

  function openSettings() {
    var s = prompt('EdgeEver 站点地址（示例：https://note.example.com）：', cfgSite());
    if (s === null) return;
    s = s.trim().replace(/\/+$/, '');
    if (s) sv('site', s);

    var t = prompt('API Token（当前 ' + maskToken(cfgToken()) + '；留空保持不变）\n在 EdgeEver 的「设置 → 访问令牌」中生成：', '');
    if (t === null) return;
    t = t.trim();
    if (t) sv('token', t);

    var nb = gvRaw('notebook', '');
    var ans = prompt('目标笔记本 ID（示例：your-notebook-id）：', nb);
    if (ans === null) return;
    ans = ans.trim();
    if (ans) sv('notebook', ans);

    toast('✅ 设置已保存，刷新页面后生效', 4000);
  }

  function initMenu() {
    try {
      GM_registerMenuCommand('📥 剪藏当前页面', clip);
      GM_registerMenuCommand('📓 设置目标笔记本', function () {
        var ans = prompt('输入目标笔记本 ID（示例：your-notebook-id）：', gvRaw('notebook', ''));
        if (ans === null) return;
        var nid = ans.trim();
        if (nid) { sv('notebook', nid); toast('目标笔记本已设为：' + nid, 3000); }
      });
      GM_registerMenuCommand('🏷️ 设置标签(逗号分隔)', function () {
        var ans = prompt('输入标签，英文逗号分隔（留空清除）：', currentTags().join(','));
        if (ans === null) return;
        sv('tags', ans.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
        toast('标签已设置：' + (currentTags().join('、') || '无'), 3000);
      });
      GM_registerMenuCommand('🔁 论坛帖：剪藏时' + (includeReplies() ? '含回复' : '仅楼主') + '（点击切换）', function () {
        var v = !includeReplies(); sv('include_replies', v);
        toast('论坛帖剪藏：' + (v ? '含全部回复' : '仅楼主正文'), 3000);
      });
      GM_registerMenuCommand('🖼️ 剪藏时转存图片到 EdgeEver（当前：' + (wantUploadImages() ? '开' : '关') + '，点击切换）', function () {
        var v = !wantUploadImages(); sv('upload_images', v);
        toast('图片转存：' + (v ? '开（图片下载后存进 EdgeEver）' : '关（保留原图链接）'), 3000);
      });
      GM_registerMenuCommand('⚙️ 设置（站点 / Token / 笔记本）', openSettings);
      GM_registerMenuCommand('👁️ 显示/隐藏浮动按钮', function () {
        var v = !gvRaw('showbtn', true); sv('showbtn', v);
        var b = document.getElementById('ee-clip-btn');
        if (v && !b) createButton();
        if (!v && b) b.remove();
        toast(v ? '已显示浮动按钮' : '已隐藏浮动按钮', 2500);
      });
    } catch (e) { }
  }

  /* ====================== 初始化 ====================== */
  function init() {
    try {
      if (gvRaw('showbtn', true)) createButton();
      initMenu();
      if (!isConfigured()) {
        setTimeout(function () { toast('⚠️ 请先点脚本菜单「⚙️ 设置」：填写站点、Token 与笔记本 ID', 9000); }, 1200);
      }
    } catch (e) { console.error('[EdgeEver剪藏] init', e); }
  }

/* ===================================================================
 *  内联依赖库（Readability / Turndown / turndown-plugin-gfm）
 * =================================================================== */
/*
 * Copyright (c) 2010 Arc90 Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This code is heavily based on Arc90's readability.js (1.7.1) script
 * available at: http://code.google.com/p/arc90labs-readability
 */

/**
 * Public constructor.
 * @param {HTMLDocument} doc     The document to parse.
 * @param {Object}       options The options object.
 */
function Readability(doc, options) {
  // In some older versions, people passed a URI as the first argument. Cope:
  if (options && options.documentElement) {
    doc = options;
    options = arguments[2];
  } else if (!doc || !doc.documentElement) {
    throw new Error(
      "First argument to Readability constructor should be a document object."
    );
  }
  options = options || {};

  this._doc = doc;
  this._docJSDOMParser = this._doc.firstChild.__JSDOMParser__;
  this._articleTitle = null;
  this._articleByline = null;
  this._articleDir = null;
  this._articleSiteName = null;
  this._attempts = [];
  this._metadata = {};

  // Configurable options
  this._debug = !!options.debug;
  this._maxElemsToParse =
    options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE;
  this._nbTopCandidates =
    options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES;
  this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD;
  this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(
    options.classesToPreserve || []
  );
  this._keepClasses = !!options.keepClasses;
  this._serializer =
    options.serializer ||
    function (el) {
      return el.innerHTML;
    };
  this._disableJSONLD = !!options.disableJSONLD;
  this._allowedVideoRegex = options.allowedVideoRegex || this.REGEXPS.videos;
  this._linkDensityModifier = options.linkDensityModifier || 0;

  // Start with all flags set
  this._flags =
    this.FLAG_STRIP_UNLIKELYS |
    this.FLAG_WEIGHT_CLASSES |
    this.FLAG_CLEAN_CONDITIONALLY;

  // Control whether log messages are sent to the console
  if (this._debug) {
    let logNode = function (node) {
      if (node.nodeType == node.TEXT_NODE) {
        return `${node.nodeName} ("${node.textContent}")`;
      }
      let attrPairs = Array.from(node.attributes || [], function (attr) {
        return `${attr.name}="${attr.value}"`;
      }).join(" ");
      return `<${node.localName} ${attrPairs}>`;
    };
    this.log = function () {
      if (typeof console !== "undefined") {
        let args = Array.from(arguments, arg => {
          if (arg && arg.nodeType == this.ELEMENT_NODE) {
            return logNode(arg);
          }
          return arg;
        });
        args.unshift("Reader: (Readability)");
        // eslint-disable-next-line no-console
        console.log(...args);
      } else if (typeof dump !== "undefined") {
        /* global dump */
        var msg = Array.prototype.map
          .call(arguments, function (x) {
            return x && x.nodeName ? logNode(x) : x;
          })
          .join(" ");
        dump("Reader: (Readability) " + msg + "\n");
      }
    };
  } else {
    this.log = function () {};
  }
}

Readability.prototype = {
  FLAG_STRIP_UNLIKELYS: 0x1,
  FLAG_WEIGHT_CLASSES: 0x2,
  FLAG_CLEAN_CONDITIONALLY: 0x4,

  // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,

  // Max number of nodes supported by this parser. Default: 0 (no limit)
  DEFAULT_MAX_ELEMS_TO_PARSE: 0,

  // The number of top candidates to consider when analysing how
  // tight the competition is among candidates.
  DEFAULT_N_TOP_CANDIDATES: 5,

  // Element tags to score by default.
  DEFAULT_TAGS_TO_SCORE: "section,h2,h3,h4,h5,h6,p,td,pre"
    .toUpperCase()
    .split(","),

  // The default number of chars an article must have in order to return a result
  DEFAULT_CHAR_THRESHOLD: 500,

  // All of the regular expressions in use within readability.
  // Defined up here so we don't instantiate them repeatedly in loops.
  REGEXPS: {
    // NOTE: These two regular expressions are duplicated in
    // Readability-readerable.js. Please keep both copies in sync.
    unlikelyCandidates:
      /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
    okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,

    positive:
      /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
    negative:
      /-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|footer|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|widget/i,
    extraneous:
      /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
    byline: /byline|author|dateline|writtenby|p-author/i,
    replaceFonts: /<(\/?)font[^>]*>/gi,
    normalize: /\s{2,}/g,
    videos:
      /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
    shareElements: /(\b|_)(share|sharedaddy)(\b|_)/i,
    nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
    prevLink: /(prev|earl|old|new|<|«)/i,
    tokenize: /\W+/g,
    whitespace: /^\s*$/,
    hasContent: /\S$/,
    hashUrl: /^#.+/,
    srcsetUrl: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,
    b64DataUrl: /^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,
    // Commas as used in Latin, Sindhi, Chinese and various other scripts.
    // see: https://en.wikipedia.org/wiki/Comma#Comma_variants
    commas: /\u002C|\u060C|\uFE50|\uFE10|\uFE11|\u2E41|\u2E34|\u2E32|\uFF0C/g,
    // See: https://schema.org/Article
    jsonLdArticleTypes:
      /^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/,
    // used to see if a node's content matches words commonly used for ad blocks or loading indicators
    adWords:
      /^(ad(vertising|vertisement)?|pub(licité)?|werb(ung)?|广告|Реклама|Anuncio)$/iu,
    loadingWords:
      /^((loading|正在加载|Загрузка|chargement|cargando)(…|\.\.\.)?)$/iu,
  },

  UNLIKELY_ROLES: [
    "menu",
    "menubar",
    "complementary",
    "navigation",
    "alert",
    "alertdialog",
    "dialog",
  ],

  DIV_TO_P_ELEMS: new Set([
    "BLOCKQUOTE",
    "DL",
    "DIV",
    "IMG",
    "OL",
    "P",
    "PRE",
    "TABLE",
    "UL",
  ]),

  ALTER_TO_DIV_EXCEPTIONS: ["DIV", "ARTICLE", "SECTION", "P", "OL", "UL"],

  PRESENTATIONAL_ATTRIBUTES: [
    "align",
    "background",
    "bgcolor",
    "border",
    "cellpadding",
    "cellspacing",
    "frame",
    "hspace",
    "rules",
    "style",
    "valign",
    "vspace",
  ],

  DEPRECATED_SIZE_ATTRIBUTE_ELEMS: ["TABLE", "TH", "TD", "HR", "PRE"],

  // The commented out elements qualify as phrasing content but tend to be
  // removed by readability when put into paragraphs, so we ignore them here.
  PHRASING_ELEMS: [
    // "CANVAS", "IFRAME", "SVG", "VIDEO",
    "ABBR",
    "AUDIO",
    "B",
    "BDO",
    "BR",
    "BUTTON",
    "CITE",
    "CODE",
    "DATA",
    "DATALIST",
    "DFN",
    "EM",
    "EMBED",
    "I",
    "IMG",
    "INPUT",
    "KBD",
    "LABEL",
    "MARK",
    "MATH",
    "METER",
    "NOSCRIPT",
    "OBJECT",
    "OUTPUT",
    "PROGRESS",
    "Q",
    "RUBY",
    "SAMP",
    "SCRIPT",
    "SELECT",
    "SMALL",
    "SPAN",
    "STRONG",
    "SUB",
    "SUP",
    "TEXTAREA",
    "TIME",
    "VAR",
    "WBR",
  ],

  // These are the classes that readability sets itself.
  CLASSES_TO_PRESERVE: ["page"],

  // These are the list of HTML entities that need to be escaped.
  HTML_ESCAPE_MAP: {
    lt: "<",
    gt: ">",
    amp: "&",
    quot: '"',
    apos: "'",
  },

  /**
   * Run any post-process modifications to article content as necessary.
   *
   * @param Element
   * @return void
   **/
  _postProcessContent(articleContent) {
    // Readability cannot open relative uris so we convert them to absolute uris.
    this._fixRelativeUris(articleContent);

    this._simplifyNestedElements(articleContent);

    if (!this._keepClasses) {
      // Remove classes.
      this._cleanClasses(articleContent);
    }
  },

  /**
   * Iterates over a NodeList, calls `filterFn` for each node and removes node
   * if function returned `true`.
   *
   * If function is not passed, removes all the nodes in node list.
   *
   * @param NodeList nodeList The nodes to operate on
   * @param Function filterFn the function to use as a filter
   * @return void
   */
  _removeNodes(nodeList, filterFn) {
    // Avoid ever operating on live node lists.
    if (this._docJSDOMParser && nodeList._isLiveNodeList) {
      throw new Error("Do not pass live node lists to _removeNodes");
    }
    for (var i = nodeList.length - 1; i >= 0; i--) {
      var node = nodeList[i];
      var parentNode = node.parentNode;
      if (parentNode) {
        if (!filterFn || filterFn.call(this, node, i, nodeList)) {
          parentNode.removeChild(node);
        }
      }
    }
  },

  /**
   * Iterates over a NodeList, and calls _setNodeTag for each node.
   *
   * @param NodeList nodeList The nodes to operate on
   * @param String newTagName the new tag name to use
   * @return void
   */
  _replaceNodeTags(nodeList, newTagName) {
    // Avoid ever operating on live node lists.
    if (this._docJSDOMParser && nodeList._isLiveNodeList) {
      throw new Error("Do not pass live node lists to _replaceNodeTags");
    }
    for (const node of nodeList) {
      this._setNodeTag(node, newTagName);
    }
  },

  /**
   * Iterate over a NodeList, which doesn't natively fully implement the Array
   * interface.
   *
   * For convenience, the current object context is applied to the provided
   * iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return void
   */
  _forEachNode(nodeList, fn) {
    Array.prototype.forEach.call(nodeList, fn, this);
  },

  /**
   * Iterate over a NodeList, and return the first node that passes
   * the supplied test function
   *
   * For convenience, the current object context is applied to the provided
   * test function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The test function.
   * @return void
   */
  _findNode(nodeList, fn) {
    return Array.prototype.find.call(nodeList, fn, this);
  },

  /**
   * Iterate over a NodeList, return true if any of the provided iterate
   * function calls returns true, false otherwise.
   *
   * For convenience, the current object context is applied to the
   * provided iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return Boolean
   */
  _someNode(nodeList, fn) {
    return Array.prototype.some.call(nodeList, fn, this);
  },

  /**
   * Iterate over a NodeList, return true if all of the provided iterate
   * function calls return true, false otherwise.
   *
   * For convenience, the current object context is applied to the
   * provided iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return Boolean
   */
  _everyNode(nodeList, fn) {
    return Array.prototype.every.call(nodeList, fn, this);
  },

  _getAllNodesWithTag(node, tagNames) {
    if (node.querySelectorAll) {
      return node.querySelectorAll(tagNames.join(","));
    }
    return [].concat.apply(
      [],
      tagNames.map(function (tag) {
        var collection = node.getElementsByTagName(tag);
        return Array.isArray(collection) ? collection : Array.from(collection);
      })
    );
  },

  /**
   * Removes the class="" attribute from every element in the given
   * subtree, except those that match CLASSES_TO_PRESERVE and
   * the classesToPreserve array from the options object.
   *
   * @param Element
   * @return void
   */
  _cleanClasses(node) {
    var classesToPreserve = this._classesToPreserve;
    var className = (node.getAttribute("class") || "")
      .split(/\s+/)
      .filter(cls => classesToPreserve.includes(cls))
      .join(" ");

    if (className) {
      node.setAttribute("class", className);
    } else {
      node.removeAttribute("class");
    }

    for (node = node.firstElementChild; node; node = node.nextElementSibling) {
      this._cleanClasses(node);
    }
  },

  /**
   * Tests whether a string is a URL or not.
   *
   * @param {string} str The string to test
   * @return {boolean} true if str is a URL, false if not
   */
  _isUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  },
  /**
   * Converts each <a> and <img> uri in the given element to an absolute URI,
   * ignoring #ref URIs.
   *
   * @param Element
   * @return void
   */
  _fixRelativeUris(articleContent) {
    var baseURI = this._doc.baseURI;
    var documentURI = this._doc.documentURI;
    function toAbsoluteURI(uri) {
      // Leave hash links alone if the base URI matches the document URI:
      if (baseURI == documentURI && uri.charAt(0) == "#") {
        return uri;
      }

      // Otherwise, resolve against base URI:
      try {
        return new URL(uri, baseURI).href;
      } catch (ex) {
        // Something went wrong, just return the original:
      }
      return uri;
    }

    var links = this._getAllNodesWithTag(articleContent, ["a"]);
    this._forEachNode(links, function (link) {
      var href = link.getAttribute("href");
      if (href) {
        // Remove links with javascript: URIs, since
        // they won't work after scripts have been removed from the page.
        if (href.indexOf("javascript:") === 0) {
          // if the link only contains simple text content, it can be converted to a text node
          if (
            link.childNodes.length === 1 &&
            link.childNodes[0].nodeType === this.TEXT_NODE
          ) {
            var text = this._doc.createTextNode(link.textContent);
            link.parentNode.replaceChild(text, link);
          } else {
            // if the link has multiple children, they should all be preserved
            var container = this._doc.createElement("span");
            while (link.firstChild) {
              container.appendChild(link.firstChild);
            }
            link.parentNode.replaceChild(container, link);
          }
        } else {
          link.setAttribute("href", toAbsoluteURI(href));
        }
      }
    });

    var medias = this._getAllNodesWithTag(articleContent, [
      "img",
      "picture",
      "figure",
      "video",
      "audio",
      "source",
    ]);

    this._forEachNode(medias, function (media) {
      var src = media.getAttribute("src");
      var poster = media.getAttribute("poster");
      var srcset = media.getAttribute("srcset");

      if (src) {
        media.setAttribute("src", toAbsoluteURI(src));
      }

      if (poster) {
        media.setAttribute("poster", toAbsoluteURI(poster));
      }

      if (srcset) {
        var newSrcset = srcset.replace(
          this.REGEXPS.srcsetUrl,
          function (_, p1, p2, p3) {
            return toAbsoluteURI(p1) + (p2 || "") + p3;
          }
        );

        media.setAttribute("srcset", newSrcset);
      }
    });
  },

  _simplifyNestedElements(articleContent) {
    var node = articleContent;

    while (node) {
      if (
        node.parentNode &&
        ["DIV", "SECTION"].includes(node.tagName) &&
        !(node.id && node.id.startsWith("readability"))
      ) {
        if (this._isElementWithoutContent(node)) {
          node = this._removeAndGetNext(node);
          continue;
        } else if (
          this._hasSingleTagInsideElement(node, "DIV") ||
          this._hasSingleTagInsideElement(node, "SECTION")
        ) {
          var child = node.children[0];
          for (var i = 0; i < node.attributes.length; i++) {
            child.setAttributeNode(node.attributes[i].cloneNode());
          }
          node.parentNode.replaceChild(child, node);
          node = child;
          continue;
        }
      }

      node = this._getNextNode(node);
    }
  },

  /**
   * Get the article title as an H1.
   *
   * @return string
   **/
  _getArticleTitle() {
    var doc = this._doc;
    var curTitle = "";
    var origTitle = "";

    try {
      curTitle = origTitle = doc.title.trim();

      // If they had an element with id "title" in their HTML
      if (typeof curTitle !== "string") {
        curTitle = origTitle = this._getInnerText(
          doc.getElementsByTagName("title")[0]
        );
      }
    } catch (e) {
      /* ignore exceptions setting the title. */
    }

    var titleHadHierarchicalSeparators = false;
    function wordCount(str) {
      return str.split(/\s+/).length;
    }

    // If there's a separator in the title, first remove the final part
    if (/ [\|\-\\\/>»] /.test(curTitle)) {
      titleHadHierarchicalSeparators = / [\\\/>»] /.test(curTitle);
      let allSeparators = Array.from(origTitle.matchAll(/ [\|\-\\\/>»] /gi));
      curTitle = origTitle.substring(0, allSeparators.pop().index);

      // If the resulting title is too short, remove the first part instead:
      if (wordCount(curTitle) < 3) {
        curTitle = origTitle.replace(/^[^\|\-\\\/>»]*[\|\-\\\/>»]/gi, "");
      }
    } else if (curTitle.includes(": ")) {
      // Check if we have an heading containing this exact string, so we
      // could assume it's the full title.
      var headings = this._getAllNodesWithTag(doc, ["h1", "h2"]);
      var trimmedTitle = curTitle.trim();
      var match = this._someNode(headings, function (heading) {
        return heading.textContent.trim() === trimmedTitle;
      });

      // If we don't, let's extract the title out of the original title string.
      if (!match) {
        curTitle = origTitle.substring(origTitle.lastIndexOf(":") + 1);

        // If the title is now too short, try the first colon instead:
        if (wordCount(curTitle) < 3) {
          curTitle = origTitle.substring(origTitle.indexOf(":") + 1);
          // But if we have too many words before the colon there's something weird
          // with the titles and the H tags so let's just use the original title instead
        } else if (wordCount(origTitle.substr(0, origTitle.indexOf(":"))) > 5) {
          curTitle = origTitle;
        }
      }
    } else if (curTitle.length > 150 || curTitle.length < 15) {
      var hOnes = doc.getElementsByTagName("h1");

      if (hOnes.length === 1) {
        curTitle = this._getInnerText(hOnes[0]);
      }
    }

    curTitle = curTitle.trim().replace(this.REGEXPS.normalize, " ");
    // If we now have 4 words or fewer as our title, and either no
    // 'hierarchical' separators (\, /, > or ») were found in the original
    // title or we decreased the number of words by more than 1 word, use
    // the original title.
    var curTitleWordCount = wordCount(curTitle);
    if (
      curTitleWordCount <= 4 &&
      (!titleHadHierarchicalSeparators ||
        curTitleWordCount !=
          wordCount(origTitle.replace(/[\|\-\\\/>»]+/g, "")) - 1)
    ) {
      curTitle = origTitle;
    }

    return curTitle;
  },

  /**
   * Prepare the HTML document for readability to scrape it.
   * This includes things like stripping javascript, CSS, and handling terrible markup.
   *
   * @return void
   **/
  _prepDocument() {
    var doc = this._doc;

    // Remove all style tags in head
    this._removeNodes(this._getAllNodesWithTag(doc, ["style"]));

    if (doc.body) {
      this._replaceBrs(doc.body);
    }

    this._replaceNodeTags(this._getAllNodesWithTag(doc, ["font"]), "SPAN");
  },

  /**
   * Finds the next node, starting from the given node, and ignoring
   * whitespace in between. If the given node is an element, the same node is
   * returned.
   */
  _nextNode(node) {
    var next = node;
    while (
      next &&
      next.nodeType != this.ELEMENT_NODE &&
      this.REGEXPS.whitespace.test(next.textContent)
    ) {
      next = next.nextSibling;
    }
    return next;
  },

  /**
   * Replaces 2 or more successive <br> elements with a single <p>.
   * Whitespace between <br> elements are ignored. For example:
   *   <div>foo<br>bar<br> <br><br>abc</div>
   * will become:
   *   <div>foo<br>bar<p>abc</p></div>
   */
  _replaceBrs(elem) {
    this._forEachNode(this._getAllNodesWithTag(elem, ["br"]), function (br) {
      var next = br.nextSibling;

      // Whether 2 or more <br> elements have been found and replaced with a
      // <p> block.
      var replaced = false;

      // If we find a <br> chain, remove the <br>s until we hit another node
      // or non-whitespace. This leaves behind the first <br> in the chain
      // (which will be replaced with a <p> later).
      while ((next = this._nextNode(next)) && next.tagName == "BR") {
        replaced = true;
        var brSibling = next.nextSibling;
        next.remove();
        next = brSibling;
      }

      // If we removed a <br> chain, replace the remaining <br> with a <p>. Add
      // all sibling nodes as children of the <p> until we hit another <br>
      // chain.
      if (replaced) {
        var p = this._doc.createElement("p");
        br.parentNode.replaceChild(p, br);

        next = p.nextSibling;
        while (next) {
          // If we've hit another <br><br>, we're done adding children to this <p>.
          if (next.tagName == "BR") {
            var nextElem = this._nextNode(next.nextSibling);
            if (nextElem && nextElem.tagName == "BR") {
              break;
            }
          }

          if (!this._isPhrasingContent(next)) {
            break;
          }

          // Otherwise, make this node a child of the new <p>.
          var sibling = next.nextSibling;
          p.appendChild(next);
          next = sibling;
        }

        while (p.lastChild && this._isWhitespace(p.lastChild)) {
          p.lastChild.remove();
        }

        if (p.parentNode.tagName === "P") {
          this._setNodeTag(p.parentNode, "DIV");
        }
      }
    });
  },

  _setNodeTag(node, tag) {
    this.log("_setNodeTag", node, tag);
    if (this._docJSDOMParser) {
      node.localName = tag.toLowerCase();
      node.tagName = tag.toUpperCase();
      return node;
    }

    var replacement = node.ownerDocument.createElement(tag);
    while (node.firstChild) {
      replacement.appendChild(node.firstChild);
    }
    node.parentNode.replaceChild(replacement, node);
    if (node.readability) {
      replacement.readability = node.readability;
    }

    for (var i = 0; i < node.attributes.length; i++) {
      replacement.setAttributeNode(node.attributes[i].cloneNode());
    }
    return replacement;
  },

  /**
   * Prepare the article node for display. Clean out any inline styles,
   * iframes, forms, strip extraneous <p> tags, etc.
   *
   * @param Element
   * @return void
   **/
  _prepArticle(articleContent) {
    this._cleanStyles(articleContent);

    // Check for data tables before we continue, to avoid removing items in
    // those tables, which will often be isolated even though they're
    // visually linked to other content-ful elements (text, images, etc.).
    this._markDataTables(articleContent);

    this._fixLazyImages(articleContent);

    // Clean out junk from the article content
    this._cleanConditionally(articleContent, "form");
    this._cleanConditionally(articleContent, "fieldset");
    this._clean(articleContent, "object");
    this._clean(articleContent, "embed");
    this._clean(articleContent, "footer");
    this._clean(articleContent, "link");
    this._clean(articleContent, "aside");

    // Clean out elements with little content that have "share" in their id/class combinations from final top candidates,
    // which means we don't remove the top candidates even they have "share".

    var shareElementThreshold = this.DEFAULT_CHAR_THRESHOLD;

    this._forEachNode(articleContent.children, function (topCandidate) {
      this._cleanMatchedNodes(topCandidate, function (node, matchString) {
        return (
          this.REGEXPS.shareElements.test(matchString) &&
          node.textContent.length < shareElementThreshold
        );
      });
    });

    this._clean(articleContent, "iframe");
    this._clean(articleContent, "input");
    this._clean(articleContent, "textarea");
    this._clean(articleContent, "select");
    this._clean(articleContent, "button");
    this._cleanHeaders(articleContent);

    // Do these last as the previous stuff may have removed junk
    // that will affect these
    this._cleanConditionally(articleContent, "table");
    this._cleanConditionally(articleContent, "ul");
    this._cleanConditionally(articleContent, "div");

    // replace H1 with H2 as H1 should be only title that is displayed separately
    this._replaceNodeTags(
      this._getAllNodesWithTag(articleContent, ["h1"]),
      "h2"
    );

    // Remove extra paragraphs
    this._removeNodes(
      this._getAllNodesWithTag(articleContent, ["p"]),
      function (paragraph) {
        // At this point, nasty iframes have been removed; only embedded video
        // ones remain.
        var contentElementCount = this._getAllNodesWithTag(paragraph, [
          "img",
          "embed",
          "object",
          "iframe",
        ]).length;
        return (
          contentElementCount === 0 && !this._getInnerText(paragraph, false)
        );
      }
    );

    this._forEachNode(
      this._getAllNodesWithTag(articleContent, ["br"]),
      function (br) {
        var next = this._nextNode(br.nextSibling);
        if (next && next.tagName == "P") {
          br.remove();
        }
      }
    );

    // Remove single-cell tables
    this._forEachNode(
      this._getAllNodesWithTag(articleContent, ["table"]),
      function (table) {
        var tbody = this._hasSingleTagInsideElement(table, "TBODY")
          ? table.firstElementChild
          : table;
        if (this._hasSingleTagInsideElement(tbody, "TR")) {
          var row = tbody.firstElementChild;
          if (this._hasSingleTagInsideElement(row, "TD")) {
            var cell = row.firstElementChild;
            cell = this._setNodeTag(
              cell,
              this._everyNode(cell.childNodes, this._isPhrasingContent)
                ? "P"
                : "DIV"
            );
            table.parentNode.replaceChild(cell, table);
          }
        }
      }
    );
  },

  /**
   * Initialize a node with the readability object. Also checks the
   * className/id for special names to add to its score.
   *
   * @param Element
   * @return void
   **/
  _initializeNode(node) {
    node.readability = { contentScore: 0 };

    switch (node.tagName) {
      case "DIV":
        node.readability.contentScore += 5;
        break;

      case "PRE":
      case "TD":
      case "BLOCKQUOTE":
        node.readability.contentScore += 3;
        break;

      case "ADDRESS":
      case "OL":
      case "UL":
      case "DL":
      case "DD":
      case "DT":
      case "LI":
      case "FORM":
        node.readability.contentScore -= 3;
        break;

      case "H1":
      case "H2":
      case "H3":
      case "H4":
      case "H5":
      case "H6":
      case "TH":
        node.readability.contentScore -= 5;
        break;
    }

    node.readability.contentScore += this._getClassWeight(node);
  },

  _removeAndGetNext(node) {
    var nextNode = this._getNextNode(node, true);
    node.remove();
    return nextNode;
  },

  /**
   * Traverse the DOM from node to node, starting at the node passed in.
   * Pass true for the second parameter to indicate this node itself
   * (and its kids) are going away, and we want the next node over.
   *
   * Calling this in a loop will traverse the DOM depth-first.
   *
   * @param {Element} node
   * @param {boolean} ignoreSelfAndKids
   * @return {Element}
   */
  _getNextNode(node, ignoreSelfAndKids) {
    // First check for kids if those aren't being ignored
    if (!ignoreSelfAndKids && node.firstElementChild) {
      return node.firstElementChild;
    }
    // Then for siblings...
    if (node.nextElementSibling) {
      return node.nextElementSibling;
    }
    // And finally, move up the parent chain *and* find a sibling
    // (because this is depth-first traversal, we will have already
    // seen the parent nodes themselves).
    do {
      node = node.parentNode;
    } while (node && !node.nextElementSibling);
    return node && node.nextElementSibling;
  },

  // compares second text to first one
  // 1 = same text, 0 = completely different text
  // works the way that it splits both texts into words and then finds words that are unique in second text
  // the result is given by the lower length of unique parts
  _textSimilarity(textA, textB) {
    var tokensA = textA
      .toLowerCase()
      .split(this.REGEXPS.tokenize)
      .filter(Boolean);
    var tokensB = textB
      .toLowerCase()
      .split(this.REGEXPS.tokenize)
      .filter(Boolean);
    if (!tokensA.length || !tokensB.length) {
      return 0;
    }
    var uniqTokensB = tokensB.filter(token => !tokensA.includes(token));
    var distanceB = uniqTokensB.join(" ").length / tokensB.join(" ").length;
    return 1 - distanceB;
  },

  /**
   * Checks whether an element node contains a valid byline
   *
   * @param node {Element}
   * @param matchString {string}
   * @return boolean
   */
  _isValidByline(node, matchString) {
    var rel = node.getAttribute("rel");
    var itemprop = node.getAttribute("itemprop");
    var bylineLength = node.textContent.trim().length;

    return (
      (rel === "author" ||
        (itemprop && itemprop.includes("author")) ||
        this.REGEXPS.byline.test(matchString)) &&
      !!bylineLength &&
      bylineLength < 100
    );
  },

  _getNodeAncestors(node, maxDepth) {
    maxDepth = maxDepth || 0;
    var i = 0,
      ancestors = [];
    while (node.parentNode) {
      ancestors.push(node.parentNode);
      if (maxDepth && ++i === maxDepth) {
        break;
      }
      node = node.parentNode;
    }
    return ancestors;
  },

  /***
   * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
   *         most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
   *
   * @param page a document to run upon. Needs to be a full document, complete with body.
   * @return Element
   **/
  /* eslint-disable-next-line complexity */
  _grabArticle(page) {
    this.log("**** grabArticle ****");
    var doc = this._doc;
    var isPaging = page !== null;
    page = page ? page : this._doc.body;

    // We can't grab an article if we don't have a page!
    if (!page) {
      this.log("No body found in document. Abort.");
      return null;
    }

    var pageCacheHtml = page.innerHTML;

    while (true) {
      this.log("Starting grabArticle loop");
      var stripUnlikelyCandidates = this._flagIsActive(
        this.FLAG_STRIP_UNLIKELYS
      );

      // First, node prepping. Trash nodes that look cruddy (like ones with the
      // class name "comment", etc), and turn divs into P tags where they have been
      // used inappropriately (as in, where they contain no other block level elements.)
      var elementsToScore = [];
      var node = this._doc.documentElement;

      let shouldRemoveTitleHeader = true;

      while (node) {
        if (node.tagName === "HTML") {
          this._articleLang = node.getAttribute("lang");
        }

        var matchString = node.className + " " + node.id;

        if (!this._isProbablyVisible(node)) {
          this.log("Removing hidden node - " + matchString);
          node = this._removeAndGetNext(node);
          continue;
        }

        // User is not able to see elements applied with both "aria-modal = true" and "role = dialog"
        if (
          node.getAttribute("aria-modal") == "true" &&
          node.getAttribute("role") == "dialog"
        ) {
          node = this._removeAndGetNext(node);
          continue;
        }

        // If we don't have a byline yet check to see if this node is a byline; if it is store the byline and remove the node.
        if (
          !this._articleByline &&
          !this._metadata.byline &&
          this._isValidByline(node, matchString)
        ) {
          // Find child node matching [itemprop="name"] and use that if it exists for a more accurate author name byline
          var endOfSearchMarkerNode = this._getNextNode(node, true);
          var next = this._getNextNode(node);
          var itemPropNameNode = null;
          while (next && next != endOfSearchMarkerNode) {
            var itemprop = next.getAttribute("itemprop");
            if (itemprop && itemprop.includes("name")) {
              itemPropNameNode = next;
              break;
            } else {
              next = this._getNextNode(next);
            }
          }
          this._articleByline = (itemPropNameNode ?? node).textContent.trim();
          node = this._removeAndGetNext(node);
          continue;
        }

        if (shouldRemoveTitleHeader && this._headerDuplicatesTitle(node)) {
          this.log(
            "Removing header: ",
            node.textContent.trim(),
            this._articleTitle.trim()
          );
          shouldRemoveTitleHeader = false;
          node = this._removeAndGetNext(node);
          continue;
        }

        // Remove unlikely candidates
        if (stripUnlikelyCandidates) {
          if (
            this.REGEXPS.unlikelyCandidates.test(matchString) &&
            !this.REGEXPS.okMaybeItsACandidate.test(matchString) &&
            !this._hasAncestorTag(node, "table") &&
            !this._hasAncestorTag(node, "code") &&
            node.tagName !== "BODY" &&
            node.tagName !== "A"
          ) {
            this.log("Removing unlikely candidate - " + matchString);
            node = this._removeAndGetNext(node);
            continue;
          }

          if (this.UNLIKELY_ROLES.includes(node.getAttribute("role"))) {
            this.log(
              "Removing content with role " +
                node.getAttribute("role") +
                " - " +
                matchString
            );
            node = this._removeAndGetNext(node);
            continue;
          }
        }

        // Remove DIV, SECTION, and HEADER nodes without any content(e.g. text, image, video, or iframe).
        if (
          (node.tagName === "DIV" ||
            node.tagName === "SECTION" ||
            node.tagName === "HEADER" ||
            node.tagName === "H1" ||
            node.tagName === "H2" ||
            node.tagName === "H3" ||
            node.tagName === "H4" ||
            node.tagName === "H5" ||
            node.tagName === "H6") &&
          this._isElementWithoutContent(node)
        ) {
          node = this._removeAndGetNext(node);
          continue;
        }

        if (this.DEFAULT_TAGS_TO_SCORE.includes(node.tagName)) {
          elementsToScore.push(node);
        }

        // Turn all divs that don't have children block level elements into p's
        if (node.tagName === "DIV") {
          // Put phrasing content into paragraphs.
          var p = null;
          var childNode = node.firstChild;
          while (childNode) {
            var nextSibling = childNode.nextSibling;
            if (this._isPhrasingContent(childNode)) {
              if (p !== null) {
                p.appendChild(childNode);
              } else if (!this._isWhitespace(childNode)) {
                p = doc.createElement("p");
                node.replaceChild(p, childNode);
                p.appendChild(childNode);
              }
            } else if (p !== null) {
              while (p.lastChild && this._isWhitespace(p.lastChild)) {
                p.lastChild.remove();
              }
              p = null;
            }
            childNode = nextSibling;
          }

          // Sites like http://mobile.slate.com encloses each paragraph with a DIV
          // element. DIVs with only a P element inside and no text content can be
          // safely converted into plain P elements to avoid confusing the scoring
          // algorithm with DIVs with are, in practice, paragraphs.
          if (
            this._hasSingleTagInsideElement(node, "P") &&
            this._getLinkDensity(node) < 0.25
          ) {
            var newNode = node.children[0];
            node.parentNode.replaceChild(newNode, node);
            node = newNode;
            elementsToScore.push(node);
          } else if (!this._hasChildBlockElement(node)) {
            node = this._setNodeTag(node, "P");
            elementsToScore.push(node);
          }
        }
        node = this._getNextNode(node);
      }

      /**
       * Loop through all paragraphs, and assign a score to them based on how content-y they look.
       * Then add their score to their parent node.
       *
       * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
       **/
      var candidates = [];
      this._forEachNode(elementsToScore, function (elementToScore) {
        if (
          !elementToScore.parentNode ||
          typeof elementToScore.parentNode.tagName === "undefined"
        ) {
          return;
        }

        // If this paragraph is less than 25 characters, don't even count it.
        var innerText = this._getInnerText(elementToScore);
        if (innerText.length < 25) {
          return;
        }

        // Exclude nodes with no ancestor.
        var ancestors = this._getNodeAncestors(elementToScore, 5);
        if (ancestors.length === 0) {
          return;
        }

        var contentScore = 0;

        // Add a point for the paragraph itself as a base.
        contentScore += 1;

        // Add points for any commas within this paragraph.
        contentScore += innerText.split(this.REGEXPS.commas).length;

        // For every 100 characters in this paragraph, add another point. Up to 3 points.
        contentScore += Math.min(Math.floor(innerText.length / 100), 3);

        // Initialize and score ancestors.
        this._forEachNode(ancestors, function (ancestor, level) {
          if (
            !ancestor.tagName ||
            !ancestor.parentNode ||
            typeof ancestor.parentNode.tagName === "undefined"
          ) {
            return;
          }

          if (typeof ancestor.readability === "undefined") {
            this._initializeNode(ancestor);
            candidates.push(ancestor);
          }

          // Node score divider:
          // - parent:             1 (no division)
          // - grandparent:        2
          // - great grandparent+: ancestor level * 3
          if (level === 0) {
            var scoreDivider = 1;
          } else if (level === 1) {
            scoreDivider = 2;
          } else {
            scoreDivider = level * 3;
          }
          ancestor.readability.contentScore += contentScore / scoreDivider;
        });
      });

      // After we've calculated scores, loop through all of the possible
      // candidate nodes we found and find the one with the highest score.
      var topCandidates = [];
      for (var c = 0, cl = candidates.length; c < cl; c += 1) {
        var candidate = candidates[c];

        // Scale the final candidates score based on link density. Good content
        // should have a relatively small link density (5% or less) and be mostly
        // unaffected by this operation.
        var candidateScore =
          candidate.readability.contentScore *
          (1 - this._getLinkDensity(candidate));
        candidate.readability.contentScore = candidateScore;

        this.log("Candidate:", candidate, "with score " + candidateScore);

        for (var t = 0; t < this._nbTopCandidates; t++) {
          var aTopCandidate = topCandidates[t];

          if (
            !aTopCandidate ||
            candidateScore > aTopCandidate.readability.contentScore
          ) {
            topCandidates.splice(t, 0, candidate);
            if (topCandidates.length > this._nbTopCandidates) {
              topCandidates.pop();
            }
            break;
          }
        }
      }

      var topCandidate = topCandidates[0] || null;
      var neededToCreateTopCandidate = false;
      var parentOfTopCandidate;

      // If we still have no top candidate, just use the body as a last resort.
      // We also have to copy the body node so it is something we can modify.
      if (topCandidate === null || topCandidate.tagName === "BODY") {
        // Move all of the page's children into topCandidate
        topCandidate = doc.createElement("DIV");
        neededToCreateTopCandidate = true;
        // Move everything (not just elements, also text nodes etc.) into the container
        // so we even include text directly in the body:
        while (page.firstChild) {
          this.log("Moving child out:", page.firstChild);
          topCandidate.appendChild(page.firstChild);
        }

        page.appendChild(topCandidate);

        this._initializeNode(topCandidate);
      } else if (topCandidate) {
        // Find a better top candidate node if it contains (at least three) nodes which belong to `topCandidates` array
        // and whose scores are quite closed with current `topCandidate` node.
        var alternativeCandidateAncestors = [];
        for (var i = 1; i < topCandidates.length; i++) {
          if (
            topCandidates[i].readability.contentScore /
              topCandidate.readability.contentScore >=
            0.75
          ) {
            alternativeCandidateAncestors.push(
              this._getNodeAncestors(topCandidates[i])
            );
          }
        }
        var MINIMUM_TOPCANDIDATES = 3;
        if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
          parentOfTopCandidate = topCandidate.parentNode;
          while (parentOfTopCandidate.tagName !== "BODY") {
            var listsContainingThisAncestor = 0;
            for (
              var ancestorIndex = 0;
              ancestorIndex < alternativeCandidateAncestors.length &&
              listsContainingThisAncestor < MINIMUM_TOPCANDIDATES;
              ancestorIndex++
            ) {
              listsContainingThisAncestor += Number(
                alternativeCandidateAncestors[ancestorIndex].includes(
                  parentOfTopCandidate
                )
              );
            }
            if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
              topCandidate = parentOfTopCandidate;
              break;
            }
            parentOfTopCandidate = parentOfTopCandidate.parentNode;
          }
        }
        if (!topCandidate.readability) {
          this._initializeNode(topCandidate);
        }

        // Because of our bonus system, parents of candidates might have scores
        // themselves. They get half of the node. There won't be nodes with higher
        // scores than our topCandidate, but if we see the score going *up* in the first
        // few steps up the tree, that's a decent sign that there might be more content
        // lurking in other places that we want to unify in. The sibling stuff
        // below does some of that - but only if we've looked high enough up the DOM
        // tree.
        parentOfTopCandidate = topCandidate.parentNode;
        var lastScore = topCandidate.readability.contentScore;
        // The scores shouldn't get too low.
        var scoreThreshold = lastScore / 3;
        while (parentOfTopCandidate.tagName !== "BODY") {
          if (!parentOfTopCandidate.readability) {
            parentOfTopCandidate = parentOfTopCandidate.parentNode;
            continue;
          }
          var parentScore = parentOfTopCandidate.readability.contentScore;
          if (parentScore < scoreThreshold) {
            break;
          }
          if (parentScore > lastScore) {
            // Alright! We found a better parent to use.
            topCandidate = parentOfTopCandidate;
            break;
          }
          lastScore = parentOfTopCandidate.readability.contentScore;
          parentOfTopCandidate = parentOfTopCandidate.parentNode;
        }

        // If the top candidate is the only child, use parent instead. This will help sibling
        // joining logic when adjacent content is actually located in parent's sibling node.
        parentOfTopCandidate = topCandidate.parentNode;
        while (
          parentOfTopCandidate.tagName != "BODY" &&
          parentOfTopCandidate.children.length == 1
        ) {
          topCandidate = parentOfTopCandidate;
          parentOfTopCandidate = topCandidate.parentNode;
        }
        if (!topCandidate.readability) {
          this._initializeNode(topCandidate);
        }
      }

      // Now that we have the top candidate, look through its siblings for content
      // that might also be related. Things like preambles, content split by ads
      // that we removed, etc.
      var articleContent = doc.createElement("DIV");
      if (isPaging) {
        articleContent.id = "readability-content";
      }

      var siblingScoreThreshold = Math.max(
        10,
        topCandidate.readability.contentScore * 0.2
      );
      // Keep potential top candidate's parent node to try to get text direction of it later.
      parentOfTopCandidate = topCandidate.parentNode;
      var siblings = parentOfTopCandidate.children;

      for (var s = 0, sl = siblings.length; s < sl; s++) {
        var sibling = siblings[s];
        var append = false;

        this.log(
          "Looking at sibling node:",
          sibling,
          sibling.readability
            ? "with score " + sibling.readability.contentScore
            : ""
        );
        this.log(
          "Sibling has score",
          sibling.readability ? sibling.readability.contentScore : "Unknown"
        );

        if (sibling === topCandidate) {
          append = true;
        } else {
          var contentBonus = 0;

          // Give a bonus if sibling nodes and top candidates have the example same classname
          if (
            sibling.className === topCandidate.className &&
            topCandidate.className !== ""
          ) {
            contentBonus += topCandidate.readability.contentScore * 0.2;
          }

          if (
            sibling.readability &&
            sibling.readability.contentScore + contentBonus >=
              siblingScoreThreshold
          ) {
            append = true;
          } else if (sibling.nodeName === "P") {
            var linkDensity = this._getLinkDensity(sibling);
            var nodeContent = this._getInnerText(sibling);
            var nodeLength = nodeContent.length;

            if (nodeLength > 80 && linkDensity < 0.25) {
              append = true;
            } else if (
              nodeLength < 80 &&
              nodeLength > 0 &&
              linkDensity === 0 &&
              nodeContent.search(/\.( |$)/) !== -1
            ) {
              append = true;
            }
          }
        }

        if (append) {
          this.log("Appending node:", sibling);

          if (!this.ALTER_TO_DIV_EXCEPTIONS.includes(sibling.nodeName)) {
            // We have a node that isn't a common block level element, like a form or td tag.
            // Turn it into a div so it doesn't get filtered out later by accident.
            this.log("Altering sibling:", sibling, "to div.");

            sibling = this._setNodeTag(sibling, "DIV");
          }

          articleContent.appendChild(sibling);
          // Fetch children again to make it compatible
          // with DOM parsers without live collection support.
          siblings = parentOfTopCandidate.children;
          // siblings is a reference to the children array, and
          // sibling is removed from the array when we call appendChild().
          // As a result, we must revisit this index since the nodes
          // have been shifted.
          s -= 1;
          sl -= 1;
        }
      }

      if (this._debug) {
        this.log("Article content pre-prep: " + articleContent.innerHTML);
      }
      // So we have all of the content that we need. Now we clean it up for presentation.
      this._prepArticle(articleContent);
      if (this._debug) {
        this.log("Article content post-prep: " + articleContent.innerHTML);
      }

      if (neededToCreateTopCandidate) {
        // We already created a fake div thing, and there wouldn't have been any siblings left
        // for the previous loop, so there's no point trying to create a new div, and then
        // move all the children over. Just assign IDs and class names here. No need to append
        // because that already happened anyway.
        topCandidate.id = "readability-page-1";
        topCandidate.className = "page";
      } else {
        var div = doc.createElement("DIV");
        div.id = "readability-page-1";
        div.className = "page";
        while (articleContent.firstChild) {
          div.appendChild(articleContent.firstChild);
        }
        articleContent.appendChild(div);
      }

      if (this._debug) {
        this.log("Article content after paging: " + articleContent.innerHTML);
      }

      var parseSuccessful = true;

      // Now that we've gone through the full algorithm, check to see if
      // we got any meaningful content. If we didn't, we may need to re-run
      // grabArticle with different flags set. This gives us a higher likelihood of
      // finding the content, and the sieve approach gives us a higher likelihood of
      // finding the -right- content.
      var textLength = this._getInnerText(articleContent, true).length;
      if (textLength < this._charThreshold) {
        parseSuccessful = false;
        // eslint-disable-next-line no-unsanitized/property
        page.innerHTML = pageCacheHtml;

        this._attempts.push({
          articleContent,
          textLength,
        });

        if (this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) {
          this._removeFlag(this.FLAG_STRIP_UNLIKELYS);
        } else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
          this._removeFlag(this.FLAG_WEIGHT_CLASSES);
        } else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
          this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY);
        } else {
          // No luck after removing flags, just return the longest text we found during the different loops
          this._attempts.sort(function (a, b) {
            return b.textLength - a.textLength;
          });

          // But first check if we actually have something
          if (!this._attempts[0].textLength) {
            return null;
          }

          articleContent = this._attempts[0].articleContent;
          parseSuccessful = true;
        }
      }

      if (parseSuccessful) {
        // Find out text direction from ancestors of final top candidate.
        var ancestors = [parentOfTopCandidate, topCandidate].concat(
          this._getNodeAncestors(parentOfTopCandidate)
        );
        this._someNode(ancestors, function (ancestor) {
          if (!ancestor.tagName) {
            return false;
          }
          var articleDir = ancestor.getAttribute("dir");
          if (articleDir) {
            this._articleDir = articleDir;
            return true;
          }
          return false;
        });
        return articleContent;
      }
    }
  },

  /**
   * Converts some of the common HTML entities in string to their corresponding characters.
   *
   * @param str {string} - a string to unescape.
   * @return string without HTML entity.
   */
  _unescapeHtmlEntities(str) {
    if (!str) {
      return str;
    }

    var htmlEscapeMap = this.HTML_ESCAPE_MAP;
    return str
      .replace(/&(quot|amp|apos|lt|gt);/g, function (_, tag) {
        return htmlEscapeMap[tag];
      })
      .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, function (_, hex, numStr) {
        var num = parseInt(hex || numStr, hex ? 16 : 10);

        // these character references are replaced by a conforming HTML parser
        if (num == 0 || num > 0x10ffff || (num >= 0xd800 && num <= 0xdfff)) {
          num = 0xfffd;
        }

        return String.fromCodePoint(num);
      });
  },

  /**
   * Try to extract metadata from JSON-LD object.
   * For now, only Schema.org objects of type Article or its subtypes are supported.
   * @return Object with any metadata that could be extracted (possibly none)
   */
  _getJSONLD(doc) {
    var scripts = this._getAllNodesWithTag(doc, ["script"]);

    var metadata;

    this._forEachNode(scripts, function (jsonLdElement) {
      if (
        !metadata &&
        jsonLdElement.getAttribute("type") === "application/ld+json"
      ) {
        try {
          // Strip CDATA markers if present
          var content = jsonLdElement.textContent.replace(
            /^\s*<!\[CDATA\[|\]\]>\s*$/g,
            ""
          );
          var parsed = JSON.parse(content);

          if (Array.isArray(parsed)) {
            parsed = parsed.find(it => {
              return (
                it["@type"] &&
                it["@type"].match(this.REGEXPS.jsonLdArticleTypes)
              );
            });
            if (!parsed) {
              return;
            }
          }

          var schemaDotOrgRegex = /^https?\:\/\/schema\.org\/?$/;
          var matches =
            (typeof parsed["@context"] === "string" &&
              parsed["@context"].match(schemaDotOrgRegex)) ||
            (typeof parsed["@context"] === "object" &&
              typeof parsed["@context"]["@vocab"] == "string" &&
              parsed["@context"]["@vocab"].match(schemaDotOrgRegex));

          if (!matches) {
            return;
          }

          if (!parsed["@type"] && Array.isArray(parsed["@graph"])) {
            parsed = parsed["@graph"].find(it => {
              return (it["@type"] || "").match(this.REGEXPS.jsonLdArticleTypes);
            });
          }

          if (
            !parsed ||
            !parsed["@type"] ||
            !parsed["@type"].match(this.REGEXPS.jsonLdArticleTypes)
          ) {
            return;
          }

          metadata = {};

          if (
            typeof parsed.name === "string" &&
            typeof parsed.headline === "string" &&
            parsed.name !== parsed.headline
          ) {
            // we have both name and headline element in the JSON-LD. They should both be the same but some websites like aktualne.cz
            // put their own name into "name" and the article title to "headline" which confuses Readability. So we try to check if either
            // "name" or "headline" closely matches the html title, and if so, use that one. If not, then we use "name" by default.

            var title = this._getArticleTitle();
            var nameMatches = this._textSimilarity(parsed.name, title) > 0.75;
            var headlineMatches =
              this._textSimilarity(parsed.headline, title) > 0.75;

            if (headlineMatches && !nameMatches) {
              metadata.title = parsed.headline;
            } else {
              metadata.title = parsed.name;
            }
          } else if (typeof parsed.name === "string") {
            metadata.title = parsed.name.trim();
          } else if (typeof parsed.headline === "string") {
            metadata.title = parsed.headline.trim();
          }
          if (parsed.author) {
            if (typeof parsed.author.name === "string") {
              metadata.byline = parsed.author.name.trim();
            } else if (
              Array.isArray(parsed.author) &&
              parsed.author[0] &&
              typeof parsed.author[0].name === "string"
            ) {
              metadata.byline = parsed.author
                .filter(function (author) {
                  return author && typeof author.name === "string";
                })
                .map(function (author) {
                  return author.name.trim();
                })
                .join(", ");
            }
          }
          if (typeof parsed.description === "string") {
            metadata.excerpt = parsed.description.trim();
          }
          if (parsed.publisher && typeof parsed.publisher.name === "string") {
            metadata.siteName = parsed.publisher.name.trim();
          }
          if (typeof parsed.datePublished === "string") {
            metadata.datePublished = parsed.datePublished.trim();
          }
        } catch (err) {
          this.log(err.message);
        }
      }
    });
    return metadata ? metadata : {};
  },

  /**
   * Attempts to get excerpt and byline metadata for the article.
   *
   * @param {Object} jsonld — object containing any metadata that
   * could be extracted from JSON-LD object.
   *
   * @return Object with optional "excerpt" and "byline" properties
   */
  _getArticleMetadata(jsonld) {
    var metadata = {};
    var values = {};
    var metaElements = this._doc.getElementsByTagName("meta");

    // property is a space-separated list of values
    var propertyPattern =
      /\s*(article|dc|dcterm|og|twitter)\s*:\s*(author|creator|description|published_time|title|site_name)\s*/gi;

    // name is a single value
    var namePattern =
      /^\s*(?:(dc|dcterm|og|twitter|parsely|weibo:(article|webpage))\s*[-\.:]\s*)?(author|creator|pub-date|description|title|site_name)\s*$/i;

    // Find description tags.
    this._forEachNode(metaElements, function (element) {
      var elementName = element.getAttribute("name");
      var elementProperty = element.getAttribute("property");
      var content = element.getAttribute("content");
      if (!content) {
        return;
      }
      var matches = null;
      var name = null;

      if (elementProperty) {
        matches = elementProperty.match(propertyPattern);
        if (matches) {
          // Convert to lowercase, and remove any whitespace
          // so we can match below.
          name = matches[0].toLowerCase().replace(/\s/g, "");
          // multiple authors
          values[name] = content.trim();
        }
      }
      if (!matches && elementName && namePattern.test(elementName)) {
        name = elementName;
        if (content) {
          // Convert to lowercase, remove any whitespace, and convert dots
          // to colons so we can match below.
          name = name.toLowerCase().replace(/\s/g, "").replace(/\./g, ":");
          values[name] = content.trim();
        }
      }
    });

    // get title
    metadata.title =
      jsonld.title ||
      values["dc:title"] ||
      values["dcterm:title"] ||
      values["og:title"] ||
      values["weibo:article:title"] ||
      values["weibo:webpage:title"] ||
      values.title ||
      values["twitter:title"] ||
      values["parsely-title"];

    if (!metadata.title) {
      metadata.title = this._getArticleTitle();
    }

    const articleAuthor =
      typeof values["article:author"] === "string" &&
      !this._isUrl(values["article:author"])
        ? values["article:author"]
        : undefined;

    // get author
    metadata.byline =
      jsonld.byline ||
      values["dc:creator"] ||
      values["dcterm:creator"] ||
      values.author ||
      values["parsely-author"] ||
      articleAuthor;

    // get description
    metadata.excerpt =
      jsonld.excerpt ||
      values["dc:description"] ||
      values["dcterm:description"] ||
      values["og:description"] ||
      values["weibo:article:description"] ||
      values["weibo:webpage:description"] ||
      values.description ||
      values["twitter:description"];

    // get site name
    metadata.siteName = jsonld.siteName || values["og:site_name"];

    // get article published time
    metadata.publishedTime =
      jsonld.datePublished ||
      values["article:published_time"] ||
      values["parsely-pub-date"] ||
      null;

    // in many sites the meta value is escaped with HTML entities,
    // so here we need to unescape it
    metadata.title = this._unescapeHtmlEntities(metadata.title);
    metadata.byline = this._unescapeHtmlEntities(metadata.byline);
    metadata.excerpt = this._unescapeHtmlEntities(metadata.excerpt);
    metadata.siteName = this._unescapeHtmlEntities(metadata.siteName);
    metadata.publishedTime = this._unescapeHtmlEntities(metadata.publishedTime);

    return metadata;
  },

  /**
   * Check if node is image, or if node contains exactly only one image
   * whether as a direct child or as its descendants.
   *
   * @param Element
   **/
  _isSingleImage(node) {
    while (node) {
      if (node.tagName === "IMG") {
        return true;
      }
      if (node.children.length !== 1 || node.textContent.trim() !== "") {
        return false;
      }
      node = node.children[0];
    }
    return false;
  },

  /**
   * Find all <noscript> that are located after <img> nodes, and which contain only one
   * <img> element. Replace the first image with the image from inside the <noscript> tag,
   * and remove the <noscript> tag. This improves the quality of the images we use on
   * some sites (e.g. Medium).
   *
   * @param Element
   **/
  _unwrapNoscriptImages(doc) {
    // Find img without source or attributes that might contains image, and remove it.
    // This is done to prevent a placeholder img is replaced by img from noscript in next step.
    var imgs = Array.from(doc.getElementsByTagName("img"));
    this._forEachNode(imgs, function (img) {
      for (var i = 0; i < img.attributes.length; i++) {
        var attr = img.attributes[i];
        switch (attr.name) {
          case "src":
          case "srcset":
          case "data-src":
          case "data-srcset":
            return;
        }

        if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
          return;
        }
      }

      img.remove();
    });

    // Next find noscript and try to extract its image
    var noscripts = Array.from(doc.getElementsByTagName("noscript"));
    this._forEachNode(noscripts, function (noscript) {
      // Parse content of noscript and make sure it only contains image
      if (!this._isSingleImage(noscript)) {
        return;
      }
      var tmp = doc.createElement("div");
      // We're running in the document context, and using unmodified
      // document contents, so doing this should be safe.
      // (Also we heavily discourage people from allowing script to
      // run at all in this document...)
      // eslint-disable-next-line no-unsanitized/property
      tmp.innerHTML = noscript.innerHTML;

      // If noscript has previous sibling and it only contains image,
      // replace it with noscript content. However we also keep old
      // attributes that might contains image.
      var prevElement = noscript.previousElementSibling;
      if (prevElement && this._isSingleImage(prevElement)) {
        var prevImg = prevElement;
        if (prevImg.tagName !== "IMG") {
          prevImg = prevElement.getElementsByTagName("img")[0];
        }

        var newImg = tmp.getElementsByTagName("img")[0];
        for (var i = 0; i < prevImg.attributes.length; i++) {
          var attr = prevImg.attributes[i];
          if (attr.value === "") {
            continue;
          }

          if (
            attr.name === "src" ||
            attr.name === "srcset" ||
            /\.(jpg|jpeg|png|webp)/i.test(attr.value)
          ) {
            if (newImg.getAttribute(attr.name) === attr.value) {
              continue;
            }

            var attrName = attr.name;
            if (newImg.hasAttribute(attrName)) {
              attrName = "data-old-" + attrName;
            }

            newImg.setAttribute(attrName, attr.value);
          }
        }

        noscript.parentNode.replaceChild(tmp.firstElementChild, prevElement);
      }
    });
  },

  /**
   * Removes script tags from the document.
   *
   * @param Element
   **/
  _removeScripts(doc) {
    this._removeNodes(this._getAllNodesWithTag(doc, ["script", "noscript"]));
  },

  /**
   * Check if this node has only whitespace and a single element with given tag
   * Returns false if the DIV node contains non-empty text nodes
   * or if it contains no element with given tag or more than 1 element.
   *
   * @param Element
   * @param string tag of child element
   **/
  _hasSingleTagInsideElement(element, tag) {
    // There should be exactly 1 element child with given tag
    if (element.children.length != 1 || element.children[0].tagName !== tag) {
      return false;
    }

    // And there should be no text nodes with real content
    return !this._someNode(element.childNodes, function (node) {
      return (
        node.nodeType === this.TEXT_NODE &&
        this.REGEXPS.hasContent.test(node.textContent)
      );
    });
  },

  _isElementWithoutContent(node) {
    return (
      node.nodeType === this.ELEMENT_NODE &&
      !node.textContent.trim().length &&
      (!node.children.length ||
        node.children.length ==
          node.getElementsByTagName("br").length +
            node.getElementsByTagName("hr").length)
    );
  },

  /**
   * Determine whether element has any children block level elements.
   *
   * @param Element
   */
  _hasChildBlockElement(element) {
    return this._someNode(element.childNodes, function (node) {
      return (
        this.DIV_TO_P_ELEMS.has(node.tagName) ||
        this._hasChildBlockElement(node)
      );
    });
  },

  /***
   * Determine if a node qualifies as phrasing content.
   * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
   **/
  _isPhrasingContent(node) {
    return (
      node.nodeType === this.TEXT_NODE ||
      this.PHRASING_ELEMS.includes(node.tagName) ||
      ((node.tagName === "A" ||
        node.tagName === "DEL" ||
        node.tagName === "INS") &&
        this._everyNode(node.childNodes, this._isPhrasingContent))
    );
  },

  _isWhitespace(node) {
    return (
      (node.nodeType === this.TEXT_NODE &&
        node.textContent.trim().length === 0) ||
      (node.nodeType === this.ELEMENT_NODE && node.tagName === "BR")
    );
  },

  /**
   * Get the inner text of a node - cross browser compatibly.
   * This also strips out any excess whitespace to be found.
   *
   * @param Element
   * @param Boolean normalizeSpaces (default: true)
   * @return string
   **/
  _getInnerText(e, normalizeSpaces) {
    normalizeSpaces =
      typeof normalizeSpaces === "undefined" ? true : normalizeSpaces;
    var textContent = e.textContent.trim();

    if (normalizeSpaces) {
      return textContent.replace(this.REGEXPS.normalize, " ");
    }
    return textContent;
  },

  /**
   * Get the number of times a string s appears in the node e.
   *
   * @param Element
   * @param string - what to split on. Default is ","
   * @return number (integer)
   **/
  _getCharCount(e, s) {
    s = s || ",";
    return this._getInnerText(e).split(s).length - 1;
  },

  /**
   * Remove the style attribute on every e and under.
   * TODO: Test if getElementsByTagName(*) is faster.
   *
   * @param Element
   * @return void
   **/
  _cleanStyles(e) {
    if (!e || e.tagName.toLowerCase() === "svg") {
      return;
    }

    // Remove `style` and deprecated presentational attributes
    for (var i = 0; i < this.PRESENTATIONAL_ATTRIBUTES.length; i++) {
      e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[i]);
    }

    if (this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.includes(e.tagName)) {
      e.removeAttribute("width");
      e.removeAttribute("height");
    }

    var cur = e.firstElementChild;
    while (cur !== null) {
      this._cleanStyles(cur);
      cur = cur.nextElementSibling;
    }
  },

  /**
   * Get the density of links as a percentage of the content
   * This is the amount of text that is inside a link divided by the total text in the node.
   *
   * @param Element
   * @return number (float)
   **/
  _getLinkDensity(element) {
    var textLength = this._getInnerText(element).length;
    if (textLength === 0) {
      return 0;
    }

    var linkLength = 0;

    // XXX implement _reduceNodeList?
    this._forEachNode(element.getElementsByTagName("a"), function (linkNode) {
      var href = linkNode.getAttribute("href");
      var coefficient = href && this.REGEXPS.hashUrl.test(href) ? 0.3 : 1;
      linkLength += this._getInnerText(linkNode).length * coefficient;
    });

    return linkLength / textLength;
  },

  /**
   * Get an elements class/id weight. Uses regular expressions to tell if this
   * element looks good or bad.
   *
   * @param Element
   * @return number (Integer)
   **/
  _getClassWeight(e) {
    if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
      return 0;
    }

    var weight = 0;

    // Look for a special classname
    if (typeof e.className === "string" && e.className !== "") {
      if (this.REGEXPS.negative.test(e.className)) {
        weight -= 25;
      }

      if (this.REGEXPS.positive.test(e.className)) {
        weight += 25;
      }
    }

    // Look for a special ID
    if (typeof e.id === "string" && e.id !== "") {
      if (this.REGEXPS.negative.test(e.id)) {
        weight -= 25;
      }

      if (this.REGEXPS.positive.test(e.id)) {
        weight += 25;
      }
    }

    return weight;
  },

  /**
   * Clean a node of all elements of type "tag".
   * (Unless it's a youtube/vimeo video. People love movies.)
   *
   * @param Element
   * @param string tag to clean
   * @return void
   **/
  _clean(e, tag) {
    var isEmbed = ["object", "embed", "iframe"].includes(tag);

    this._removeNodes(this._getAllNodesWithTag(e, [tag]), function (element) {
      // Allow youtube and vimeo videos through as people usually want to see those.
      if (isEmbed) {
        // First, check the elements attributes to see if any of them contain youtube or vimeo
        for (var i = 0; i < element.attributes.length; i++) {
          if (this._allowedVideoRegex.test(element.attributes[i].value)) {
            return false;
          }
        }

        // For embed with <object> tag, check inner HTML as well.
        if (
          element.tagName === "object" &&
          this._allowedVideoRegex.test(element.innerHTML)
        ) {
          return false;
        }
      }

      return true;
    });
  },

  /**
   * Check if a given node has one of its ancestor tag name matching the
   * provided one.
   * @param  HTMLElement node
   * @param  String      tagName
   * @param  Number      maxDepth
   * @param  Function    filterFn a filter to invoke to determine whether this node 'counts'
   * @return Boolean
   */
  _hasAncestorTag(node, tagName, maxDepth, filterFn) {
    maxDepth = maxDepth || 3;
    tagName = tagName.toUpperCase();
    var depth = 0;
    while (node.parentNode) {
      if (maxDepth > 0 && depth > maxDepth) {
        return false;
      }
      if (
        node.parentNode.tagName === tagName &&
        (!filterFn || filterFn(node.parentNode))
      ) {
        return true;
      }
      node = node.parentNode;
      depth++;
    }
    return false;
  },

  /**
   * Return an object indicating how many rows and columns this table has.
   */
  _getRowAndColumnCount(table) {
    var rows = 0;
    var columns = 0;
    var trs = table.getElementsByTagName("tr");
    for (var i = 0; i < trs.length; i++) {
      var rowspan = trs[i].getAttribute("rowspan") || 0;
      if (rowspan) {
        rowspan = parseInt(rowspan, 10);
      }
      rows += rowspan || 1;

      // Now look for column-related info
      var columnsInThisRow = 0;
      var cells = trs[i].getElementsByTagName("td");
      for (var j = 0; j < cells.length; j++) {
        var colspan = cells[j].getAttribute("colspan") || 0;
        if (colspan) {
          colspan = parseInt(colspan, 10);
        }
        columnsInThisRow += colspan || 1;
      }
      columns = Math.max(columns, columnsInThisRow);
    }
    return { rows, columns };
  },

  /**
   * Look for 'data' (as opposed to 'layout') tables, for which we use
   * similar checks as
   * https://searchfox.org/mozilla-central/rev/f82d5c549f046cb64ce5602bfd894b7ae807c8f8/accessible/generic/TableAccessible.cpp#19
   */
  _markDataTables(root) {
    var tables = root.getElementsByTagName("table");
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      var role = table.getAttribute("role");
      if (role == "presentation") {
        table._readabilityDataTable = false;
        continue;
      }
      var datatable = table.getAttribute("datatable");
      if (datatable == "0") {
        table._readabilityDataTable = false;
        continue;
      }
      var summary = table.getAttribute("summary");
      if (summary) {
        table._readabilityDataTable = true;
        continue;
      }

      var caption = table.getElementsByTagName("caption")[0];
      if (caption && caption.childNodes.length) {
        table._readabilityDataTable = true;
        continue;
      }

      // If the table has a descendant with any of these tags, consider a data table:
      var dataTableDescendants = ["col", "colgroup", "tfoot", "thead", "th"];
      var descendantExists = function (tag) {
        return !!table.getElementsByTagName(tag)[0];
      };
      if (dataTableDescendants.some(descendantExists)) {
        this.log("Data table because found data-y descendant");
        table._readabilityDataTable = true;
        continue;
      }

      // Nested tables indicate a layout table:
      if (table.getElementsByTagName("table")[0]) {
        table._readabilityDataTable = false;
        continue;
      }

      var sizeInfo = this._getRowAndColumnCount(table);

      if (sizeInfo.columns == 1 || sizeInfo.rows == 1) {
        // single colum/row tables are commonly used for page layout purposes.
        table._readabilityDataTable = false;
        continue;
      }

      if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
        table._readabilityDataTable = true;
        continue;
      }
      // Now just go by size entirely:
      table._readabilityDataTable = sizeInfo.rows * sizeInfo.columns > 10;
    }
  },

  /* convert images and figures that have properties like data-src into images that can be loaded without JS */
  _fixLazyImages(root) {
    this._forEachNode(
      this._getAllNodesWithTag(root, ["img", "picture", "figure"]),
      function (elem) {
        // In some sites (e.g. Kotaku), they put 1px square image as base64 data uri in the src attribute.
        // So, here we check if the data uri is too short, just might as well remove it.
        if (elem.src && this.REGEXPS.b64DataUrl.test(elem.src)) {
          // Make sure it's not SVG, because SVG can have a meaningful image in under 133 bytes.
          var parts = this.REGEXPS.b64DataUrl.exec(elem.src);
          if (parts[1] === "image/svg+xml") {
            return;
          }

          // Make sure this element has other attributes which contains image.
          // If it doesn't, then this src is important and shouldn't be removed.
          var srcCouldBeRemoved = false;
          for (var i = 0; i < elem.attributes.length; i++) {
            var attr = elem.attributes[i];
            if (attr.name === "src") {
              continue;
            }

            if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
              srcCouldBeRemoved = true;
              break;
            }
          }

          // Here we assume if image is less than 100 bytes (or 133 after encoded to base64)
          // it will be too small, therefore it might be placeholder image.
          if (srcCouldBeRemoved) {
            var b64starts = parts[0].length;
            var b64length = elem.src.length - b64starts;
            if (b64length < 133) {
              elem.removeAttribute("src");
            }
          }
        }

        // also check for "null" to work around https://github.com/jsdom/jsdom/issues/2580
        if (
          (elem.src || (elem.srcset && elem.srcset != "null")) &&
          !elem.className.toLowerCase().includes("lazy")
        ) {
          return;
        }

        for (var j = 0; j < elem.attributes.length; j++) {
          attr = elem.attributes[j];
          if (
            attr.name === "src" ||
            attr.name === "srcset" ||
            attr.name === "alt"
          ) {
            continue;
          }
          var copyTo = null;
          if (/\.(jpg|jpeg|png|webp)\s+\d/.test(attr.value)) {
            copyTo = "srcset";
          } else if (/^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(attr.value)) {
            copyTo = "src";
          }
          if (copyTo) {
            //if this is an img or picture, set the attribute directly
            if (elem.tagName === "IMG" || elem.tagName === "PICTURE") {
              elem.setAttribute(copyTo, attr.value);
            } else if (
              elem.tagName === "FIGURE" &&
              !this._getAllNodesWithTag(elem, ["img", "picture"]).length
            ) {
              //if the item is a <figure> that does not contain an image or picture, create one and place it inside the figure
              //see the nytimes-3 testcase for an example
              var img = this._doc.createElement("img");
              img.setAttribute(copyTo, attr.value);
              elem.appendChild(img);
            }
          }
        }
      }
    );
  },

  _getTextDensity(e, tags) {
    var textLength = this._getInnerText(e, true).length;
    if (textLength === 0) {
      return 0;
    }
    var childrenLength = 0;
    var children = this._getAllNodesWithTag(e, tags);
    this._forEachNode(
      children,
      child => (childrenLength += this._getInnerText(child, true).length)
    );
    return childrenLength / textLength;
  },

  /**
   * Clean an element of all tags of type "tag" if they look fishy.
   * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
   *
   * @return void
   **/
  _cleanConditionally(e, tag) {
    if (!this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
      return;
    }

    // Gather counts for other typical elements embedded within.
    // Traverse backwards so we can remove nodes at the same time
    // without effecting the traversal.
    //
    // TODO: Consider taking into account original contentScore here.
    this._removeNodes(this._getAllNodesWithTag(e, [tag]), function (node) {
      // First check if this node IS data table, in which case don't remove it.
      var isDataTable = function (t) {
        return t._readabilityDataTable;
      };

      var isList = tag === "ul" || tag === "ol";
      if (!isList) {
        var listLength = 0;
        var listNodes = this._getAllNodesWithTag(node, ["ul", "ol"]);
        this._forEachNode(
          listNodes,
          list => (listLength += this._getInnerText(list).length)
        );
        isList = listLength / this._getInnerText(node).length > 0.9;
      }

      if (tag === "table" && isDataTable(node)) {
        return false;
      }

      // Next check if we're inside a data table, in which case don't remove it as well.
      if (this._hasAncestorTag(node, "table", -1, isDataTable)) {
        return false;
      }

      if (this._hasAncestorTag(node, "code")) {
        return false;
      }

      // keep element if it has a data tables
      if (
        [...node.getElementsByTagName("table")].some(
          tbl => tbl._readabilityDataTable
        )
      ) {
        return false;
      }

      var weight = this._getClassWeight(node);

      this.log("Cleaning Conditionally", node);

      var contentScore = 0;

      if (weight + contentScore < 0) {
        return true;
      }

      if (this._getCharCount(node, ",") < 10) {
        // If there are not very many commas, and the number of
        // non-paragraph elements is more than paragraphs or other
        // ominous signs, remove the element.
        var p = node.getElementsByTagName("p").length;
        var img = node.getElementsByTagName("img").length;
        var li = node.getElementsByTagName("li").length - 100;
        var input = node.getElementsByTagName("input").length;
        var headingDensity = this._getTextDensity(node, [
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
        ]);

        var embedCount = 0;
        var embeds = this._getAllNodesWithTag(node, [
          "object",
          "embed",
          "iframe",
        ]);

        for (var i = 0; i < embeds.length; i++) {
          // If this embed has attribute that matches video regex, don't delete it.
          for (var j = 0; j < embeds[i].attributes.length; j++) {
            if (this._allowedVideoRegex.test(embeds[i].attributes[j].value)) {
              return false;
            }
          }

          // For embed with <object> tag, check inner HTML as well.
          if (
            embeds[i].tagName === "object" &&
            this._allowedVideoRegex.test(embeds[i].innerHTML)
          ) {
            return false;
          }

          embedCount++;
        }

        var innerText = this._getInnerText(node);

        // toss any node whose inner text contains nothing but suspicious words
        if (
          this.REGEXPS.adWords.test(innerText) ||
          this.REGEXPS.loadingWords.test(innerText)
        ) {
          return true;
        }

        var contentLength = innerText.length;
        var linkDensity = this._getLinkDensity(node);
        var textishTags = ["SPAN", "LI", "TD"].concat(
          Array.from(this.DIV_TO_P_ELEMS)
        );
        var textDensity = this._getTextDensity(node, textishTags);
        var isFigureChild = this._hasAncestorTag(node, "figure");

        // apply shadiness checks, then check for exceptions
        const shouldRemoveNode = () => {
          const errs = [];
          if (!isFigureChild && img > 1 && p / img < 0.5) {
            errs.push(`Bad p to img ratio (img=${img}, p=${p})`);
          }
          if (!isList && li > p) {
            errs.push(`Too many li's outside of a list. (li=${li} > p=${p})`);
          }
          if (input > Math.floor(p / 3)) {
            errs.push(`Too many inputs per p. (input=${input}, p=${p})`);
          }
          if (
            !isList &&
            !isFigureChild &&
            headingDensity < 0.9 &&
            contentLength < 25 &&
            (img === 0 || img > 2) &&
            linkDensity > 0
          ) {
            errs.push(
              `Suspiciously short. (headingDensity=${headingDensity}, img=${img}, linkDensity=${linkDensity})`
            );
          }
          if (
            !isList &&
            weight < 25 &&
            linkDensity > 0.2 + this._linkDensityModifier
          ) {
            errs.push(
              `Low weight and a little linky. (linkDensity=${linkDensity})`
            );
          }
          if (weight >= 25 && linkDensity > 0.5 + this._linkDensityModifier) {
            errs.push(
              `High weight and mostly links. (linkDensity=${linkDensity})`
            );
          }
          if ((embedCount === 1 && contentLength < 75) || embedCount > 1) {
            errs.push(
              `Suspicious embed. (embedCount=${embedCount}, contentLength=${contentLength})`
            );
          }
          if (img === 0 && textDensity === 0) {
            errs.push(
              `No useful content. (img=${img}, textDensity=${textDensity})`
            );
          }

          if (errs.length) {
            this.log("Checks failed", errs);
            return true;
          }

          return false;
        };

        var haveToRemove = shouldRemoveNode();

        // Allow simple lists of images to remain in pages
        if (isList && haveToRemove) {
          for (var x = 0; x < node.children.length; x++) {
            let child = node.children[x];
            // Don't filter in lists with li's that contain more than one child
            if (child.children.length > 1) {
              return haveToRemove;
            }
          }
          let li_count = node.getElementsByTagName("li").length;
          // Only allow the list to remain if every li contains an image
          if (img == li_count) {
            return false;
          }
        }
        return haveToRemove;
      }
      return false;
    });
  },

  /**
   * Clean out elements that match the specified conditions
   *
   * @param Element
   * @param Function determines whether a node should be removed
   * @return void
   **/
  _cleanMatchedNodes(e, filter) {
    var endOfSearchMarkerNode = this._getNextNode(e, true);
    var next = this._getNextNode(e);
    while (next && next != endOfSearchMarkerNode) {
      if (filter.call(this, next, next.className + " " + next.id)) {
        next = this._removeAndGetNext(next);
      } else {
        next = this._getNextNode(next);
      }
    }
  },

  /**
   * Clean out spurious headers from an Element.
   *
   * @param Element
   * @return void
   **/
  _cleanHeaders(e) {
    let headingNodes = this._getAllNodesWithTag(e, ["h1", "h2"]);
    this._removeNodes(headingNodes, function (node) {
      let shouldRemove = this._getClassWeight(node) < 0;
      if (shouldRemove) {
        this.log("Removing header with low class weight:", node);
      }
      return shouldRemove;
    });
  },

  /**
   * Check if this node is an H1 or H2 element whose content is mostly
   * the same as the article title.
   *
   * @param Element  the node to check.
   * @return boolean indicating whether this is a title-like header.
   */
  _headerDuplicatesTitle(node) {
    if (node.tagName != "H1" && node.tagName != "H2") {
      return false;
    }
    var heading = this._getInnerText(node, false);
    this.log("Evaluating similarity of header:", heading, this._articleTitle);
    return this._textSimilarity(this._articleTitle, heading) > 0.75;
  },

  _flagIsActive(flag) {
    return (this._flags & flag) > 0;
  },

  _removeFlag(flag) {
    this._flags = this._flags & ~flag;
  },

  _isProbablyVisible(node) {
    // Have to null-check node.style and node.className.includes to deal with SVG and MathML nodes.
    return (
      (!node.style || node.style.display != "none") &&
      (!node.style || node.style.visibility != "hidden") &&
      !node.hasAttribute("hidden") &&
      //check for "fallback-image" so that wikimedia math images are displayed
      (!node.hasAttribute("aria-hidden") ||
        node.getAttribute("aria-hidden") != "true" ||
        (node.className &&
          node.className.includes &&
          node.className.includes("fallback-image")))
    );
  },

  /**
   * Runs readability.
   *
   * Workflow:
   *  1. Prep the document by removing script tags, css, etc.
   *  2. Build readability's DOM tree.
   *  3. Grab the article content from the current dom tree.
   *  4. Replace the current DOM tree with the new one.
   *  5. Read peacefully.
   *
   * @return void
   **/
  parse() {
    // Avoid parsing too large documents, as per configuration option
    if (this._maxElemsToParse > 0) {
      var numTags = this._doc.getElementsByTagName("*").length;
      if (numTags > this._maxElemsToParse) {
        throw new Error(
          "Aborting parsing document; " + numTags + " elements found"
        );
      }
    }

    // Unwrap image from noscript
    this._unwrapNoscriptImages(this._doc);

    // Extract JSON-LD metadata before removing scripts
    var jsonLd = this._disableJSONLD ? {} : this._getJSONLD(this._doc);

    // Remove script tags from the document.
    this._removeScripts(this._doc);

    this._prepDocument();

    var metadata = this._getArticleMetadata(jsonLd);
    this._metadata = metadata;
    this._articleTitle = metadata.title;

    var articleContent = this._grabArticle();
    if (!articleContent) {
      return null;
    }

    this.log("Grabbed: " + articleContent.innerHTML);

    this._postProcessContent(articleContent);

    // If we haven't found an excerpt in the article's metadata, use the article's
    // first paragraph as the excerpt. This is used for displaying a preview of
    // the article's content.
    if (!metadata.excerpt) {
      var paragraphs = articleContent.getElementsByTagName("p");
      if (paragraphs.length) {
        metadata.excerpt = paragraphs[0].textContent.trim();
      }
    }

    var textContent = articleContent.textContent;
    return {
      title: this._articleTitle,
      byline: metadata.byline || this._articleByline,
      dir: this._articleDir,
      lang: this._articleLang,
      content: this._serializer(articleContent),
      textContent,
      length: textContent.length,
      excerpt: metadata.excerpt,
      siteName: metadata.siteName || this._articleSiteName,
      publishedTime: metadata.publishedTime,
    };
  },
};

if (typeof module === "object") {
  /* eslint-disable-next-line no-redeclare */
  /* global module */
  module.exports = Readability;
}

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.TurndownService = factory());
})(this, (function () { 'use strict';

  function extend(destination) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) destination[key] = source[key];
      }
    }
    return destination;
  }
  function repeat(character, count) {
    return Array(count + 1).join(character);
  }
  function trimLeadingNewlines(string) {
    return string.replace(/^\n*/, '');
  }
  function trimTrailingNewlines(string) {
    // avoid match-at-end regexp bottleneck, see #370
    var indexEnd = string.length;
    while (indexEnd > 0 && string[indexEnd - 1] === '\n') indexEnd--;
    return string.substring(0, indexEnd);
  }
  function trimNewlines(string) {
    return trimTrailingNewlines(trimLeadingNewlines(string));
  }
  var blockElements = ['ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS', 'CENTER', 'DD', 'DIR', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV', 'NOFRAMES', 'NOSCRIPT', 'OL', 'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'];
  function isBlock(node) {
    return is(node, blockElements);
  }
  var voidElements = ['AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'];
  function isVoid(node) {
    return is(node, voidElements);
  }
  function hasVoid(node) {
    return has(node, voidElements);
  }
  var meaningfulWhenBlankElements = ['A', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TH', 'TD', 'IFRAME', 'SCRIPT', 'AUDIO', 'VIDEO'];
  function isMeaningfulWhenBlank(node) {
    return is(node, meaningfulWhenBlankElements);
  }
  function hasMeaningfulWhenBlank(node) {
    return has(node, meaningfulWhenBlankElements);
  }
  function is(node, tagNames) {
    return tagNames.indexOf(node.nodeName) >= 0;
  }
  function has(node, tagNames) {
    return node.getElementsByTagName && tagNames.some(function (tagName) {
      return node.getElementsByTagName(tagName).length;
    });
  }
  var markdownEscapes = [[/\\/g, '\\\\'], [/\*/g, '\\*'], [/^-/g, '\\-'], [/^\+ /g, '\\+ '], [/^(=+)/g, '\\$1'], [/^(#{1,6}) /g, '\\$1 '], [/`/g, '\\`'], [/^~~~/g, '\\~~~'], [/\[/g, '\\['], [/\]/g, '\\]'], [/^>/g, '\\>'], [/_/g, '\\_'], [/^(\d+)\. /g, '$1\\. ']];
  function escapeMarkdown(string) {
    return markdownEscapes.reduce(function (accumulator, escape) {
      return accumulator.replace(escape[0], escape[1]);
    }, string);
  }

  var rules = {};
  rules.paragraph = {
    filter: 'p',
    replacement: function (content) {
      return '\n\n' + content + '\n\n';
    }
  };
  rules.lineBreak = {
    filter: 'br',
    replacement: function (content, node, options) {
      return options.br + '\n';
    }
  };
  rules.heading = {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: function (content, node, options) {
      var hLevel = Number(node.nodeName.charAt(1));
      if (options.headingStyle === 'setext' && hLevel < 3) {
        var underline = repeat(hLevel === 1 ? '=' : '-', content.length);
        return '\n\n' + content + '\n' + underline + '\n\n';
      } else {
        return '\n\n' + repeat('#', hLevel) + ' ' + content + '\n\n';
      }
    }
  };
  rules.blockquote = {
    filter: 'blockquote',
    replacement: function (content) {
      content = trimNewlines(content).replace(/^/gm, '> ');
      return '\n\n' + content + '\n\n';
    }
  };
  rules.list = {
    filter: ['ul', 'ol'],
    replacement: function (content, node) {
      var parent = node.parentNode;
      if (parent.nodeName === 'LI' && parent.lastElementChild === node) {
        return '\n' + content;
      } else {
        return '\n\n' + content + '\n\n';
      }
    }
  };
  rules.listItem = {
    filter: 'li',
    replacement: function (content, node, options) {
      var prefix = options.bulletListMarker + '   ';
      var parent = node.parentNode;
      if (parent.nodeName === 'OL') {
        var start = parent.getAttribute('start');
        var index = Array.prototype.indexOf.call(parent.children, node);
        prefix = (start ? Number(start) + index : index + 1) + '.  ';
      }
      var isParagraph = /\n$/.test(content);
      content = trimNewlines(content) + (isParagraph ? '\n' : '');
      content = content.replace(/\n/gm, '\n' + ' '.repeat(prefix.length)); // indent
      return prefix + content + (node.nextSibling ? '\n' : '');
    }
  };
  rules.indentedCodeBlock = {
    filter: function (node, options) {
      return options.codeBlockStyle === 'indented' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },
    replacement: function (content, node, options) {
      return '\n\n    ' + node.firstChild.textContent.replace(/\n/g, '\n    ') + '\n\n';
    }
  };
  rules.fencedCodeBlock = {
    filter: function (node, options) {
      return options.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },
    replacement: function (content, node, options) {
      var className = node.firstChild.getAttribute('class') || '';
      var language = (className.match(/language-(\S+)/) || [null, ''])[1];
      var code = node.firstChild.textContent;
      var fenceChar = options.fence.charAt(0);
      var fenceSize = 3;
      var fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');
      var match;
      while (match = fenceInCodeRegex.exec(code)) {
        if (match[0].length >= fenceSize) {
          fenceSize = match[0].length + 1;
        }
      }
      var fence = repeat(fenceChar, fenceSize);
      return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
    }
  };
  rules.horizontalRule = {
    filter: 'hr',
    replacement: function (content, node, options) {
      return '\n\n' + options.hr + '\n\n';
    }
  };
  rules.inlineLink = {
    filter: function (node, options) {
      return options.linkStyle === 'inlined' && node.nodeName === 'A' && node.getAttribute('href');
    },
    replacement: function (content, node) {
      var href = escapeLinkDestination(node.getAttribute('href'));
      var title = escapeLinkTitle(cleanAttribute(node.getAttribute('title')));
      var titlePart = title ? ' "' + title + '"' : '';
      return '[' + content + '](' + href + titlePart + ')';
    }
  };
  rules.referenceLink = {
    filter: function (node, options) {
      return options.linkStyle === 'referenced' && node.nodeName === 'A' && node.getAttribute('href');
    },
    replacement: function (content, node, options) {
      var href = escapeLinkDestination(node.getAttribute('href'));
      var title = cleanAttribute(node.getAttribute('title'));
      if (title) title = ' "' + escapeLinkTitle(title) + '"';
      var replacement;
      var reference;
      switch (options.linkReferenceStyle) {
        case 'collapsed':
          replacement = '[' + content + '][]';
          reference = '[' + content + ']: ' + href + title;
          break;
        case 'shortcut':
          replacement = '[' + content + ']';
          reference = '[' + content + ']: ' + href + title;
          break;
        default:
          var id = this.references.length + 1;
          replacement = '[' + content + '][' + id + ']';
          reference = '[' + id + ']: ' + href + title;
      }
      this.references.push(reference);
      return replacement;
    },
    references: [],
    append: function (options) {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = []; // Reset references
      }
      return references;
    }
  };
  rules.emphasis = {
    filter: ['em', 'i'],
    replacement: function (content, node, options) {
      if (!content.trim()) return '';
      return options.emDelimiter + content + options.emDelimiter;
    }
  };
  rules.strong = {
    filter: ['strong', 'b'],
    replacement: function (content, node, options) {
      if (!content.trim()) return '';
      return options.strongDelimiter + content + options.strongDelimiter;
    }
  };
  rules.code = {
    filter: function (node) {
      var hasSiblings = node.previousSibling || node.nextSibling;
      var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;
      return node.nodeName === 'CODE' && !isCodeBlock;
    },
    replacement: function (content) {
      if (!content) return '';
      content = content.replace(/\r?\n|\r/g, ' ');
      var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? ' ' : '';
      var delimiter = '`';
      var matches = content.match(/`+/gm) || [];
      while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + '`';
      return delimiter + extraSpace + content + extraSpace + delimiter;
    }
  };
  rules.image = {
    filter: 'img',
    replacement: function (content, node) {
      var alt = escapeMarkdown(cleanAttribute(node.getAttribute('alt')));
      var src = escapeLinkDestination(node.getAttribute('src') || '');
      var title = cleanAttribute(node.getAttribute('title'));
      var titlePart = title ? ' "' + escapeLinkTitle(title) + '"' : '';
      return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
    }
  };
  function cleanAttribute(attribute) {
    return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
  }
  function escapeLinkDestination(destination) {
    var escaped = destination.replace(/([<>()])/g, '\\$1');
    return escaped.indexOf(' ') >= 0 ? '<' + escaped + '>' : escaped;
  }
  function escapeLinkTitle(title) {
    return title.replace(/"/g, '\\"');
  }

  /**
   * Manages a collection of rules used to convert HTML to Markdown
   */

  function Rules(options) {
    this.options = options;
    this._keep = [];
    this._remove = [];
    this.blankRule = {
      replacement: options.blankReplacement
    };
    this.keepReplacement = options.keepReplacement;
    this.defaultRule = {
      replacement: options.defaultReplacement
    };
    this.array = [];
    for (var key in options.rules) this.array.push(options.rules[key]);
  }
  Rules.prototype = {
    add: function (key, rule) {
      this.array.unshift(rule);
    },
    keep: function (filter) {
      this._keep.unshift({
        filter: filter,
        replacement: this.keepReplacement
      });
    },
    remove: function (filter) {
      this._remove.unshift({
        filter: filter,
        replacement: function () {
          return '';
        }
      });
    },
    forNode: function (node) {
      if (node.isBlank) return this.blankRule;
      var rule;
      if (rule = findRule(this.array, node, this.options)) return rule;
      if (rule = findRule(this._keep, node, this.options)) return rule;
      if (rule = findRule(this._remove, node, this.options)) return rule;
      return this.defaultRule;
    },
    forEach: function (fn) {
      for (var i = 0; i < this.array.length; i++) fn(this.array[i], i);
    }
  };
  function findRule(rules, node, options) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (filterValue(rule, node, options)) return rule;
    }
    return undefined;
  }
  function filterValue(rule, node, options) {
    var filter = rule.filter;
    if (typeof filter === 'string') {
      if (filter === node.nodeName.toLowerCase()) return true;
    } else if (Array.isArray(filter)) {
      if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
    } else if (typeof filter === 'function') {
      if (filter.call(rule, node, options)) return true;
    } else {
      throw new TypeError('`filter` needs to be a string, array, or function');
    }
  }

  /**
   * The collapseWhitespace function is adapted from collapse-whitespace
   * by Luc Thevenard.
   *
   * The MIT License (MIT)
   *
   * Copyright (c) 2014 Luc Thevenard <lucthevenard@gmail.com>
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /**
   * collapseWhitespace(options) removes extraneous whitespace from an the given element.
   *
   * @param {Object} options
   */
  function collapseWhitespace(options) {
    var element = options.element;
    var isBlock = options.isBlock;
    var isVoid = options.isVoid;
    var isPre = options.isPre || function (node) {
      return node.nodeName === 'PRE';
    };
    if (!element.firstChild || isPre(element)) return;
    var prevText = null;
    var keepLeadingWs = false;
    var prev = null;
    var node = next(prev, element, isPre);
    while (node !== element) {
      if (node.nodeType === 3 || node.nodeType === 4) {
        // Node.TEXT_NODE or Node.CDATA_SECTION_NODE
        var text = node.data.replace(/[ \r\n\t]+/g, ' ');
        if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === ' ') {
          text = text.substr(1);
        }

        // `text` might be empty at this point.
        if (!text) {
          node = remove(node);
          continue;
        }
        node.data = text;
        prevText = node;
      } else if (node.nodeType === 1) {
        // Node.ELEMENT_NODE
        if (isBlock(node) || node.nodeName === 'BR') {
          if (prevText) {
            prevText.data = prevText.data.replace(/ $/, '');
          }
          prevText = null;
          keepLeadingWs = false;
        } else if (isVoid(node) || isPre(node)) {
          // Avoid trimming space around non-block, non-BR void elements and inline PRE.
          prevText = null;
          keepLeadingWs = true;
        } else if (prevText) {
          // Drop protection if set previously.
          keepLeadingWs = false;
        }
      } else {
        node = remove(node);
        continue;
      }
      var nextNode = next(prev, node, isPre);
      prev = node;
      node = nextNode;
    }
    if (prevText) {
      prevText.data = prevText.data.replace(/ $/, '');
      if (!prevText.data) {
        remove(prevText);
      }
    }
  }

  /**
   * remove(node) removes the given node from the DOM and returns the
   * next node in the sequence.
   *
   * @param {Node} node
   * @return {Node} node
   */
  function remove(node) {
    var next = node.nextSibling || node.parentNode;
    node.parentNode.removeChild(node);
    return next;
  }

  /**
   * next(prev, current, isPre) returns the next node in the sequence, given the
   * current and previous nodes.
   *
   * @param {Node} prev
   * @param {Node} current
   * @param {Function} isPre
   * @return {Node}
   */
  function next(prev, current, isPre) {
    if (prev && prev.parentNode === current || isPre(current)) {
      return current.nextSibling || current.parentNode;
    }
    return current.firstChild || current.nextSibling || current.parentNode;
  }

  /*
   * Set up window for Node.js
   */

  var root = typeof window !== 'undefined' ? window : {};

  /*
   * Parsing HTML strings
   */

  function canParseHTMLNatively() {
    var Parser = root.DOMParser;
    var canParse = false;

    // Adapted from https://gist.github.com/1129031
    // Firefox/Opera/IE throw errors on unsupported types
    try {
      // WebKit returns null on unsupported types
      if (new Parser().parseFromString('', 'text/html')) {
        canParse = true;
      }
    } catch (e) {}
    return canParse;
  }
  function createHTMLParser() {
    var Parser = function () {};
    {
      if (shouldUseActiveX()) {
        Parser.prototype.parseFromString = function (string) {
          var doc = new window.ActiveXObject('htmlfile');
          doc.designMode = 'on'; // disable on-page scripts
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      } else {
        Parser.prototype.parseFromString = function (string) {
          var doc = document.implementation.createHTMLDocument('');
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      }
    }
    return Parser;
  }
  function shouldUseActiveX() {
    var useActiveX = false;
    try {
      document.implementation.createHTMLDocument('').open();
    } catch (e) {
      if (root.ActiveXObject) useActiveX = true;
    }
    return useActiveX;
  }
  var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();

  function RootNode(input, options) {
    var root;
    if (typeof input === 'string') {
      var doc = htmlParser().parseFromString(
      // DOM parsers arrange elements in the <head> and <body>.
      // Wrapping in a custom element ensures elements are reliably arranged in
      // a single element.
      '<x-turndown id="turndown-root">' + input + '</x-turndown>', 'text/html');
      root = doc.getElementById('turndown-root');
    } else {
      root = input.cloneNode(true);
    }
    collapseWhitespace({
      element: root,
      isBlock: isBlock,
      isVoid: isVoid,
      isPre: options.preformattedCode ? isPreOrCode : null
    });
    return root;
  }
  var _htmlParser;
  function htmlParser() {
    _htmlParser = _htmlParser || new HTMLParser();
    return _htmlParser;
  }
  function isPreOrCode(node) {
    return node.nodeName === 'PRE' || node.nodeName === 'CODE';
  }

  function Node(node, options) {
    node.isBlock = isBlock(node);
    node.isCode = node.nodeName === 'CODE' || node.parentNode.isCode;
    node.isBlank = isBlank(node);
    node.flankingWhitespace = flankingWhitespace(node, options);
    return node;
  }
  function isBlank(node) {
    return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
  }
  function flankingWhitespace(node, options) {
    if (node.isBlock || options.preformattedCode && node.isCode) {
      return {
        leading: '',
        trailing: ''
      };
    }
    var edges = edgeWhitespace(node.textContent);

    // abandon leading ASCII WS if left-flanked by ASCII WS
    if (edges.leadingAscii && isFlankedByWhitespace('left', node, options)) {
      edges.leading = edges.leadingNonAscii;
    }

    // abandon trailing ASCII WS if right-flanked by ASCII WS
    if (edges.trailingAscii && isFlankedByWhitespace('right', node, options)) {
      edges.trailing = edges.trailingNonAscii;
    }
    return {
      leading: edges.leading,
      trailing: edges.trailing
    };
  }
  function edgeWhitespace(string) {
    var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
    return {
      leading: m[1],
      // whole string for whitespace-only strings
      leadingAscii: m[2],
      leadingNonAscii: m[3],
      trailing: m[4],
      // empty for whitespace-only strings
      trailingNonAscii: m[5],
      trailingAscii: m[6]
    };
  }
  function isFlankedByWhitespace(side, node, options) {
    var sibling;
    var regExp;
    var isFlanked;
    if (side === 'left') {
      sibling = node.previousSibling;
      regExp = / $/;
    } else {
      sibling = node.nextSibling;
      regExp = /^ /;
    }
    if (sibling) {
      if (sibling.nodeType === 3) {
        isFlanked = regExp.test(sibling.nodeValue);
      } else if (options.preformattedCode && sibling.nodeName === 'CODE') {
        isFlanked = false;
      } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
        isFlanked = regExp.test(sibling.textContent);
      }
    }
    return isFlanked;
  }

  var reduce = Array.prototype.reduce;
  function TurndownService(options) {
    if (!(this instanceof TurndownService)) return new TurndownService(options);
    var defaults = {
      rules: rules,
      headingStyle: 'setext',
      hr: '* * *',
      bulletListMarker: '*',
      codeBlockStyle: 'indented',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      br: '  ',
      preformattedCode: false,
      blankReplacement: function (content, node) {
        return node.isBlock ? '\n\n' : '';
      },
      keepReplacement: function (content, node) {
        return node.isBlock ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML;
      },
      defaultReplacement: function (content, node) {
        return node.isBlock ? '\n\n' + content + '\n\n' : content;
      }
    };
    this.options = extend({}, defaults, options);
    this.rules = new Rules(this.options);
  }
  TurndownService.prototype = {
    /**
     * The entry point for converting a string or DOM node to Markdown
     * @public
     * @param {String|HTMLElement} input The string or DOM node to convert
     * @returns A Markdown representation of the input
     * @type String
     */

    turndown: function (input) {
      if (!canConvert(input)) {
        throw new TypeError(input + ' is not a string, or an element/document/fragment node.');
      }
      if (input === '') return '';
      var output = process.call(this, new RootNode(input, this.options));
      return postProcess.call(this, output);
    },
    /**
     * Add one or more plugins
     * @public
     * @param {Function|Array} plugin The plugin or array of plugins to add
     * @returns The Turndown instance for chaining
     * @type Object
     */

    use: function (plugin) {
      if (Array.isArray(plugin)) {
        for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
      } else if (typeof plugin === 'function') {
        plugin(this);
      } else {
        throw new TypeError('plugin must be a Function or an Array of Functions');
      }
      return this;
    },
    /**
     * Adds a rule
     * @public
     * @param {String} key The unique key of the rule
     * @param {Object} rule The rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    addRule: function (key, rule) {
      this.rules.add(key, rule);
      return this;
    },
    /**
     * Keep a node (as HTML) that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    keep: function (filter) {
      this.rules.keep(filter);
      return this;
    },
    /**
     * Remove a node that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    remove: function (filter) {
      this.rules.remove(filter);
      return this;
    },
    /**
     * Escapes Markdown syntax
     * @public
     * @param {String} string The string to escape
     * @returns A string with Markdown syntax escaped
     * @type String
     */

    escape: function (string) {
      return escapeMarkdown(string);
    }
  };

  /**
   * Reduces a DOM node down to its Markdown string equivalent
   * @private
   * @param {HTMLElement} parentNode The node to convert
   * @returns A Markdown representation of the node
   * @type String
   */

  function process(parentNode) {
    var self = this;
    return reduce.call(parentNode.childNodes, function (output, node) {
      node = new Node(node, self.options);
      var replacement = '';
      if (node.nodeType === 3) {
        replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
      } else if (node.nodeType === 1) {
        replacement = replacementForNode.call(self, node);
      }
      return join(output, replacement);
    }, '');
  }

  /**
   * Appends strings as each rule requires and trims the output
   * @private
   * @param {String} output The conversion output
   * @returns A trimmed version of the ouput
   * @type String
   */

  function postProcess(output) {
    var self = this;
    this.rules.forEach(function (rule) {
      if (typeof rule.append === 'function') {
        output = join(output, rule.append(self.options));
      }
    });
    return output.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '');
  }

  /**
   * Converts an element node to its Markdown equivalent
   * @private
   * @param {HTMLElement} node The node to convert
   * @returns A Markdown representation of the node
   * @type String
   */

  function replacementForNode(node) {
    var rule = this.rules.forNode(node);
    var content = process.call(this, node);
    var whitespace = node.flankingWhitespace;
    if (whitespace.leading || whitespace.trailing) content = content.trim();
    return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
  }

  /**
   * Joins replacement to the current output with appropriate number of new lines
   * @private
   * @param {String} output The current conversion output
   * @param {String} replacement The string to append to the output
   * @returns Joined output
   * @type String
   */

  function join(output, replacement) {
    var s1 = trimTrailingNewlines(output);
    var s2 = trimLeadingNewlines(replacement);
    var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
    var separator = '\n\n'.substring(0, nls);
    return s1 + separator + s2;
  }

  /**
   * Determines whether an input can be converted
   * @private
   * @param {String|HTMLElement} input Describe this parameter
   * @returns Describe what it returns
   * @type String|Object|Array|Boolean|Number
   */

  function canConvert(input) {
    return input != null && (typeof input === 'string' || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
  }

  return TurndownService;

}));

var turndownPluginGfm = (function (exports) {
'use strict';

var highlightRegExp = /highlight-(?:text|source)-([a-z0-9]+)/;

function highlightedCodeBlock (turndownService) {
  turndownService.addRule('highlightedCodeBlock', {
    filter: function (node) {
      var firstChild = node.firstChild;
      return (
        node.nodeName === 'DIV' &&
        highlightRegExp.test(node.className) &&
        firstChild &&
        firstChild.nodeName === 'PRE'
      )
    },
    replacement: function (content, node, options) {
      var className = node.className || '';
      var language = (className.match(highlightRegExp) || [null, ''])[1];

      return (
        '\n\n' + options.fence + language + '\n' +
        node.firstChild.textContent +
        '\n' + options.fence + '\n\n'
      )
    }
  });
}

function strikethrough (turndownService) {
  turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: function (content) {
      return '~' + content + '~'
    }
  });
}

var indexOf = Array.prototype.indexOf;
var every = Array.prototype.every;
var rules = {};

rules.tableCell = {
  filter: ['th', 'td'],
  replacement: function (content, node) {
    return cell(content, node)
  }
};

rules.tableRow = {
  filter: 'tr',
  replacement: function (content, node) {
    var borderCells = '';
    var alignMap = { left: ':--', right: '--:', center: ':-:' };

    if (isHeadingRow(node)) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var border = '---';
        var align = (
          node.childNodes[i].getAttribute('align') || ''
        ).toLowerCase();

        if (align) border = alignMap[align] || border;

        borderCells += cell(border, node.childNodes[i]);
      }
    }
    return '\n' + content + (borderCells ? '\n' + borderCells : '')
  }
};

rules.table = {
  // Only convert tables with a heading row.
  // Tables with no heading row are kept using `keep` (see below).
  filter: function (node) {
    return node.nodeName === 'TABLE' && isHeadingRow(node.rows[0])
  },

  replacement: function (content) {
    // Ensure there are no blank lines
    content = content.replace('\n\n', '\n');
    return '\n\n' + content + '\n\n'
  }
};

rules.tableSection = {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: function (content) {
    return content
  }
};

// A tr is a heading row if:
// - the parent is a THEAD
// - or if its the first child of the TABLE or the first TBODY (possibly
//   following a blank THEAD)
// - and every cell is a TH
function isHeadingRow (tr) {
  var parentNode = tr.parentNode;
  return (
    parentNode.nodeName === 'THEAD' ||
    (
      parentNode.firstChild === tr &&
      (parentNode.nodeName === 'TABLE' || isFirstTbody(parentNode)) &&
      every.call(tr.childNodes, function (n) { return n.nodeName === 'TH' })
    )
  )
}

function isFirstTbody (element) {
  var previousSibling = element.previousSibling;
  return (
    element.nodeName === 'TBODY' && (
      !previousSibling ||
      (
        previousSibling.nodeName === 'THEAD' &&
        /^\s*$/i.test(previousSibling.textContent)
      )
    )
  )
}

function cell (content, node) {
  var index = indexOf.call(node.parentNode.childNodes, node);
  var prefix = ' ';
  if (index === 0) prefix = '| ';
  return prefix + content + ' |'
}

function tables (turndownService) {
  turndownService.keep(function (node) {
    return node.nodeName === 'TABLE' && !isHeadingRow(node.rows[0])
  });
  for (var key in rules) turndownService.addRule(key, rules[key]);
}

function taskListItems (turndownService) {
  turndownService.addRule('taskListItems', {
    filter: function (node) {
      return node.type === 'checkbox' && node.parentNode.nodeName === 'LI'
    },
    replacement: function (content, node) {
      return (node.checked ? '[x]' : '[ ]') + ' '
    }
  });
}

function gfm (turndownService) {
  turndownService.use([
    highlightedCodeBlock,
    strikethrough,
    tables,
    taskListItems
  ]);
}

exports.gfm = gfm;
exports.highlightedCodeBlock = highlightedCodeBlock;
exports.strikethrough = strikethrough;
exports.tables = tables;
exports.taskListItems = taskListItems;

return exports;

}({}));


  /* ============================== 启动 ============================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();
