// ==UserScript==
// @name         cookie 查看
// @namespace    cookie-viewer
// @version      1.0.0
// @description  点右下角按钮查看当前页面的 cookie，自动复制到剪贴板；正确处理值里的等号、空 cookie 与同名 cookie
// @author       小贝塔
// @license      MIT
// @updateURL    https://f.xbta.cc/ai/js/cookie-viewer.user.js
// @downloadURL  https://f.xbta.cc/ai/js/cookie-viewer.user.js
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ===== 纯逻辑：解析与格式化 ===== */
'use strict';

/* ==========================================================================
 * 纯逻辑层：不触碰 DOM，可在 Node 中直接单测
 * ========================================================================== */

/**
 * UTF-8 字节数。不能用 String.length：中文 3 字节、emoji 4 字节（代理对）。
 */
function utf8Len(str) {
  var s = str == null ? '' : String(str);
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x80) {
      n += 1;
    } else if (c < 0x800) {
      n += 2;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      if (i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) {
          n += 4;
          i++;
        } else {
          n += 3;
        }
      } else {
        n += 3;
      }
    } else {
      n += 3;
    }
  }
  return n;
}

/**
 * 解析 document.cookie 原始串 → 条目数组。
 *
 * 修掉的硬伤：
 *  1) 只按「第一个 =」切分 —— 值里的 = 不再被截断（base64 padding / JWT）；
 *  2) 空串 / 全是分隔符 → 返回空数组，调用方据此提示，而不是造出 {'': undefined}；
 *  3) 不建对象去重 —— 同名 cookie（不同 path）全部保留，并标 dup 供 UI 提示。
 *
 * @param {string} raw
 * @returns {Array<{name:string,value:string,bare:boolean,dup:boolean,size:number}>}
 */
function parseCookies(raw) {
  var out = [];
  var s = raw == null ? '' : String(raw);
  if (!s) return out;

  var segs = s.split(';');
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i];
    if (!seg) continue;
    var t = seg.replace(/^\s+/, '').replace(/\s+$/, '');
    if (!t) continue;

    var eq = t.indexOf('=');
    var name;
    var value;
    var bare = false;
    if (eq < 0) {
      name = t;
      value = '';
      bare = true;
    } else {
      name = t.slice(0, eq).replace(/\s+$/, '');
      value = t.slice(eq + 1);
    }
    if (!name) continue;

    out.push({
      name: name,
      value: value,
      bare: bare,
      dup: false,
      size: utf8Len(name) + 1 + utf8Len(value),
    });
  }

  var seen = Object.create(null);
  for (var j = 0; j < out.length; j++) seen[out[j].name] = (seen[out[j].name] || 0) + 1;
  for (var k = 0; k < out.length; k++) {
    if (seen[out[k].name] > 1) out[k].dup = true;
  }
  return out;
}

/**
 * 拼成 Cookie 请求头格式：a=1; b=2（无尾部多余分号）
 */
function formatKv(list) {
  var parts = [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    parts.push(c.bare ? c.name : c.name + '=' + c.value);
  }
  return parts.join('; ');
}

/**
 * 统计：条数 + 字节数（含 name=value 的 1 字节等号，不含分隔符，供参考）
 */
function stats(list) {
  var bytes = 0;
  for (var i = 0; i < list.length; i++) bytes += list[i].size;
  return { count: list.length, bytes: bytes, dupNames: dupNames(list) };
}

/**
 * 出现重复的同名 cookie 名（不同 path 会造成这种情况）
 */
function dupNames(list) {
  var n = Object.create(null);
  var out = [];
  for (var i = 0; i < list.length; i++) n[list[i].name] = (n[list[i].name] || 0) + 1;
  for (var k in n) if (n[k] > 1 && out.indexOf(k) === -1) out.push(k);
  return out;
}

/**
 * 人类可读体积：1.2 KB / 836 B
 */
function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

  /* ===== UI 与交互 ===== */
'use strict';

/* ==========================================================================
 * UI / 交互层
 * ========================================================================== */

;(function () {
  var CFG_KEY = 'cookie-viewer.cfg';
  var BTN_TEXT = 'cookie';

  var cfg = null;
  var host = null;
  var root = null;
  var btn = null;
  var mask = null;
  var dlg = null;
  var ta = null;
  var meta = null;
  var copyBtn = null;
  var ptr = null;
  var flashTimer = null;

  var isTouch =
    typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)').matches : false;

  /* ---------------------------- 配置 ---------------------------- */

  function loadCfg() {
    var d = { pos: null, hidden: false };
    try {
      if (typeof GM_getValue === 'function') {
        var raw = GM_getValue(CFG_KEY, null);
        if (raw) {
          var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (o && typeof o === 'object') {
            if (o.pos && typeof o.pos.left === 'number') d.pos = o.pos;
            d.hidden = !!o.hidden;
          }
        }
        return d;
      }
    } catch (e) {}
    try {
      var s = localStorage.getItem(CFG_KEY);
      if (s) {
        var o2 = JSON.parse(s);
        if (o2 && typeof o2 === 'object') {
          if (o2.pos && typeof o2.pos.left === 'number') d.pos = o2.pos;
          d.hidden = !!o2.hidden;
        }
      }
    } catch (e) {}
    return d;
  }

  function saveCfg() {
    var dump;
    try {
      dump = JSON.stringify(cfg);
    } catch (e) {
      return;
    }
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(CFG_KEY, dump);
        return;
      }
    } catch (e) {}
    try {
      localStorage.setItem(CFG_KEY, dump);
    } catch (e) {}
  }

  /* ---------------------------- 样式 ---------------------------- */

  var CSS = [
    ':host{all:initial}',
    '*,*::before,*::after{box-sizing:border-box}',
    '.cv-btn{position:fixed;right:10px;bottom:10px;display:inline-flex;align-items:center;justify-content:center;',
    'min-width:62px;height:40px;padding:0 14px;border:1px solid #d5d5d5;border-radius:8px;background:#fff;color:#333;',
    'font:13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,"PingFang SC","Microsoft YaHei",sans-serif;',
    'letter-spacing:.2px;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;',
    'touch-action:none;box-shadow:0 2px 8px rgba(0,0,0,.14)}',
    '.cv-btn:hover{background:#f7f7f7}',
    '.cv-btn:active{background:#efefef}',
    '.cv-btn.cv-ok{background:#eaf7ed;border-color:#4aa564;color:#1f7a37}',
    '.cv-btn.cv-err{background:#fdecec;border-color:#d9534f;color:#b32b27}',
    '.cv-mask{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.35);display:flex;',
    'align-items:center;justify-content:center;padding:16px;-webkit-tap-highlight-color:transparent}',
    '.cv-dlg{width:560px;max-width:100%;max-height:82vh;display:flex;flex-direction:column;background:#fff;color:#222;',
    'border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3);',
    'font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,"PingFang SC","Microsoft YaHei",sans-serif}',
    '.cv-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 8px 16px}',
    '.cv-title{font-size:15px;font-weight:600;letter-spacing:.3px;color:#222}',
    '.cv-x{width:34px;height:34px;border:0;border-radius:8px;background:transparent;color:#8a8a8a;font-size:18px;',
    'line-height:1;cursor:pointer;font-family:inherit}',
    '.cv-x:hover{background:#f2f2f2;color:#333}',
    '.cv-body{padding:0 16px;flex:1 1 auto;min-height:0;display:flex;overflow:auto}',
    '.cv-ta{width:100%;height:min(46vh,320px);min-height:96px;margin:0;padding:10px 12px;resize:none;',
    'border:1px solid #e4e4e4;border-radius:8px;background:#fafafa;color:#1f2328;',
    'font:12.5px/1.65 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;',
    'white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;overflow:auto;-webkit-overflow-scrolling:touch}',
    '.cv-ta:focus{outline:none;border-color:#b9b9b9;background:#fff}',
    '.cv-ft{display:flex;align-items:center;gap:10px;padding:12px 16px 14px;border-top:1px solid #efefef;margin-top:12px}',
    '.cv-meta{flex:1 1 auto;min-width:0;font-size:12px;line-height:1.45;color:#8a8a8a}',
    '.cv-act{display:flex;gap:8px;margin-left:auto;flex:0 0 auto}',
    '.cv-b{height:34px;padding:0 14px;border-radius:8px;border:1px solid #d5d5d5;background:#fff;color:#333;',
    'font:13px/1 inherit;font-family:inherit;cursor:pointer}',
    '.cv-b:hover{background:#f6f6f6}',
    '.cv-b.cv-pri{background:#2f6fed;border-color:#2f6fed;color:#fff}',
    '.cv-b.cv-pri:hover{background:#2861d4}',
    '@media (max-width:640px){',
    '.cv-btn{right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));height:30px;min-width:50px;padding:0 9px;font-size:12px;border-radius:6px;box-shadow:0 1px 5px rgba(0,0,0,.14)}',
    '.cv-mask{padding:10px}',
    '.cv-dlg{border-radius:10px;max-height:80vh}',
    '.cv-hd{padding:9px 6px 4px 12px}',
    '.cv-title{font-size:13.5px}',
    '.cv-x{width:26px;height:26px;font-size:15px}',
    '.cv-body{padding:0 12px}',
    '.cv-ta{height:min(42vh,240px);min-height:72px;font-size:11.5px;line-height:1.55;padding:8px 10px;border-radius:6px}',
    '.cv-ft{padding:7px 12px 9px;gap:7px;margin-top:7px}',
    '.cv-meta{font-size:10.5px;line-height:1.35}',
    '.cv-b{height:29px;font-size:12px;padding:0 10px;border-radius:6px}',
    '}',
    '@media (max-width:380px){',
    '.cv-btn{height:28px;min-width:46px;font-size:11.5px;padding:0 8px}',
    '.cv-ta{height:min(38vh,200px)}',
    '.cv-b{height:27px;font-size:11.5px}',
    '}',
    '@media (prefers-color-scheme:dark){',
    '.cv-btn{background:#2a2a2a;color:#e8e8e8;border-color:#444;box-shadow:0 2px 10px rgba(0,0,0,.5)}',
    '.cv-btn:hover{background:#333}',
    '.cv-dlg{background:#232323;color:#e6e6e6}',
    '.cv-title{color:#f0f0f0}',
    '.cv-ta{background:#1b1b1b;border-color:#3a3a3a;color:#e6e6e6}',
    '.cv-ta:focus{background:#1f1f1f;border-color:#555}',
    '.cv-ft{border-top-color:#333}',
    '.cv-b{background:#2c2c2c;border-color:#444;color:#e6e6e6}',
    '.cv-b:hover{background:#363636}',
    '.cv-b.cv-pri{background:#2f6fed;border-color:#2f6fed;color:#fff}',
    '.cv-x:hover{background:#333;color:#eee}',
    '}',
  ].join('');

  function applyStyles(shadow) {
    try {
      if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in shadow) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        shadow.adoptedStyleSheets = [sheet];
        return;
      }
    } catch (e) {}
    var st = document.createElement('style');
    st.textContent = CSS;
    shadow.appendChild(st);
  }

  /* ---------------------------- DOM 辅助 ---------------------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------------------------- 剪贴板 ---------------------------- */

  function fallbackCopy(text) {
    var box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
    (document.body || document.documentElement).appendChild(box);
    var ok = false;
    try {
      box.select();
      box.setSelectionRange(0, text.length);
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    try {
      box.parentNode.removeChild(box);
    } catch (e) {}
    return ok;
  }

  function copyText(text, cb) {
    var settled = false;
    function fin(ok) {
      if (settled) return;
      settled = true;
      if (cb) cb(ok);
    }
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, 'text');
        return fin(true);
      }
    } catch (e) {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () {
            fin(true);
          },
          function () {
            fin(fallbackCopy(text));
          }
        );
        return;
      }
    } catch (e) {}
    fin(fallbackCopy(text));
  }

  /* ---------------------------- 位置 / 拖动 ---------------------------- */

  function viewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 360,
      h: window.innerHeight || document.documentElement.clientHeight || 640,
    };
  }

  function applyPos(left, top) {
    if (!btn) return;
    var vp = viewport();
    var r = btn.getBoundingClientRect();
    var w = r.width || 74;
    var h = r.height || 44;
    var l = Math.min(Math.max(4, left), Math.max(4, vp.w - w - 4));
    var t = Math.min(Math.max(4, top), Math.max(4, vp.h - h - 4));
    btn.style.left = l + 'px';
    btn.style.top = t + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }

  function bindDrag() {
    btn.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      var r = btn.getBoundingClientRect();
      ptr = {
        id: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        ox: r.left,
        oy: r.top,
        moved: false,
      };
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (err) {}
      e.preventDefault();
    });

    btn.addEventListener('pointermove', function (e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var dx = e.clientX - ptr.sx;
      var dy = e.clientY - ptr.sy;
      if (!ptr.moved && Math.abs(dx) + Math.abs(dy) > 4) ptr.moved = true;
      if (!ptr.moved) return;
      applyPos(ptr.ox + dx, ptr.oy + dy);
    });

    btn.addEventListener('pointerup', function (e) {
      if (!ptr || (e && e.pointerId !== ptr.id)) return;
      var moved = ptr.moved;
      ptr = null;
      if (moved) {
        var r = btn.getBoundingClientRect();
        cfg.pos = { left: Math.round(r.left), top: Math.round(r.top) };
        saveCfg();
      } else {
        openDialog();
      }
    });

    btn.addEventListener('pointercancel', function () {
      ptr = null;
    });

    window.addEventListener('resize', function () {
      if (cfg.pos) applyPos(cfg.pos.left, cfg.pos.top);
    });
  }

  /* ---------------------------- 弹窗 ---------------------------- */

  function ensureDialog() {
    if (mask) return;
    mask = el('div', 'cv-mask');
    mask.style.display = 'none';

    dlg = el('div', 'cv-dlg');
    var hd = el('div', 'cv-hd');
    var title = el('div', 'cv-title', 'cookie');
    var x = el('button', 'cv-x', '\u2715');
    x.type = 'button';
    x.setAttribute('aria-label', '关闭');
    x.addEventListener('click', closeDialog);
    hd.appendChild(title);
    hd.appendChild(x);

    var body = el('div', 'cv-body');
    ta = el('textarea', 'cv-ta');
    ta.readOnly = true;
    ta.spellcheck = false;
    ta.setAttribute('aria-label', 'cookie 内容');
    body.appendChild(ta);

    var ft = el('div', 'cv-ft');
    meta = el('div', 'cv-meta', '');
    var act = el('div', 'cv-act');
    copyBtn = el('button', 'cv-b', '复制');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', function () {
      var t = ta.value;
      if (!t) return;
      var old = copyBtn.textContent;
      copyText(t, function (ok) {
        copyBtn.textContent = ok ? '已复制 \u2713' : '复制失败';
        setTimeout(function () {
          copyBtn.textContent = old;
        }, 1200);
      });
    });
    var closeBtn = el('button', 'cv-b cv-pri', '关闭');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', closeDialog);
    act.appendChild(copyBtn);
    act.appendChild(closeBtn);
    ft.appendChild(meta);
    ft.appendChild(act);

    dlg.appendChild(hd);
    dlg.appendChild(body);
    dlg.appendChild(ft);
    mask.appendChild(dlg);

    mask.addEventListener('click', function (e) {
      if (e.target === mask) closeDialog();
    });

    root.appendChild(mask);
  }

  function closeDialog() {
    if (mask) mask.style.display = 'none';
  }

  function isOpen() {
    return !!mask && mask.style.display !== 'none';
  }

  function flashBtn(ok) {
    if (!btn) return;
    btn.textContent = ok ? BTN_TEXT + ' \u2713' : BTN_TEXT + ' \u2715';
    btn.className = 'cv-btn ' + (ok ? 'cv-ok' : 'cv-err');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      btn.textContent = BTN_TEXT;
      btn.className = 'cv-btn';
      flashTimer = null;
    }, 1400);
  }

  function readCookieRaw() {
    try {
      return document.cookie || '';
    } catch (e) {
      return '';
    }
  }

  function openDialog() {
    ensureMounted();
    ensureDialog();

    var list = parseCookies(readCookieRaw());
    var st = stats(list);
    var text = formatKv(list);

    ta.value = text;

    if (st.count) {
      var bits = [st.count + ' 条', fmtBytes(st.bytes), '仅非 HttpOnly'];
      if (st.dupNames.length) bits.push('重名 ' + st.dupNames.length + ' 项');
      meta.textContent = bits.join(' \u00b7 ');
    } else {
      meta.textContent = '当前页面没有可读的 cookie（HttpOnly 项脚本读不到）';
      ta.placeholder = '（空）';
    }

    mask.style.display = 'flex';

    if (text) {
      copyText(text, function (ok) {
        flashBtn(ok);
        if (!ok) meta.textContent += ' \u00b7 自动复制失败，请手动复制';
      });
    } else {
      flashBtn(false);
    }

    if (!isTouch) {
      try {
        ta.focus();
        ta.select();
      } catch (e) {}
    }
  }

  /* ---------------------------- 挂载 ---------------------------- */

  function ensureMounted() {
    if (host && !host.isConnected) {
      (document.body || document.documentElement).appendChild(host);
    }
  }

  function bindMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    try {
      GM_registerMenuCommand('查看 cookie', function () {
        ensureMounted();
        openDialog();
      });
      GM_registerMenuCommand('显示/隐藏悬浮按钮', function () {
        cfg.hidden = !cfg.hidden;
        saveCfg();
        ensureMounted();
        if (btn) btn.style.display = cfg.hidden ? 'none' : '';
      });
    } catch (e) {}
  }

  function build() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    if (window.top !== window.self) return; // 与 @noframes 双保险
    if (!document.body && !document.documentElement) {
      document.addEventListener('DOMContentLoaded', build, { once: true });
      return;
    }

    host = document.createElement('div');
    host.style.cssText =
      'all:initial;position:fixed;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147483646;';
    (document.body || document.documentElement).appendChild(host);

    root = host.attachShadow({ mode: 'open' });
    applyStyles(root);

    cfg = loadCfg();

    btn = el('button', 'cv-btn', BTN_TEXT);
    btn.type = 'button';
    btn.title = '查看并复制当前页面 cookie';
    if (cfg.hidden) btn.style.display = 'none';
    root.appendChild(btn);

    if (cfg.pos) applyPos(cfg.pos.left, cfg.pos.top);

    bindDrag();
    bindMenu();

    document.addEventListener(
      'keydown',
      function (e) {
        if (isOpen() && (e.key === 'Escape' || e.keyCode === 27)) {
          closeDialog();
        }
      },
      true
    );
  }

  build();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseCookies: parseCookies,
      formatKv: formatKv,
      stats: stats,
      utf8Len: utf8Len,
      fmtBytes: fmtBytes,
      dupNames: dupNames,
    };
  }
})();

})();