// ==UserScript==
// @name         自动显示网页密码（明文永久显示）
// @namespace    https://github.com/rentianyu/ai
// @version      2.0
// @description  自动将所有网站的密码输入框转为明文显示，支持动态加载、Shadow DOM 与框架重渲染，打开网页自动生效
// @author       编程助手
// @license      MIT
// @match        *://*/*
// @updateURL    https://f.xbta.cc/ai/js/always-show-password.user.js
// @downloadURL  https://f.xbta.cc/ai/js/always-show-password.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==
(function () {
'use strict';

// ====================== 配置 ======================
const OUTLINE  = '1px solid #28a745';  // 明文框描边（用 outline，不改变元素尺寸/布局）
const DEBOUNCE = 120;                  // DOM 批量变更的去抖毫秒数
// ====================================================

/** 把一个密码框转为明文（幂等：已是 text 则不动，避免与页面反复拉锯） */
function reveal(input) {
  if (input.getAttribute('type') === 'password') {
    input.setAttribute('type', 'text');
    input.style.outline = OUTLINE;
  }
}

/** 对 document 根与每个 ShadowRoot 各建立一次监听（同一 observer 可观察多个目标） */
const observer = new MutationObserver(onMutations);
const watched = new WeakSet();

function watch(root) {
  if (watched.has(root)) return;
  watched.add(root);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['type'],   // 只关心 type 变化，开销最小
  });
}

/** 扫描一个节点（或根）：处理自身与后代中的密码框，并穿透 Shadow DOM */
function scan(root) {
  if (!root || !root.querySelectorAll) return;
  if (root.matches && root.matches('input[type="password"]')) reveal(root);
  root.querySelectorAll('input[type="password"]').forEach(reveal);
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      watch(el.shadowRoot);      // 新发现的 ShadowRoot 同样纳入监听
      scan(el.shadowRoot);
    }
  }
}

/** 去抖调度：只扫描受影响的局部节点，不做全文档反复重扫 */
const pending = new Set();
let timer = null;

function schedule(node) {
  pending.add(node);
  if (timer === null) timer = setTimeout(flush, DEBOUNCE);
}

function flush() {
  timer = null;
  const nodes = Array.from(pending);
  pending.clear();
  for (const n of nodes) {
    if (n.isConnected) scan(n);
  }
}

/** 变更回调：① type 被改回 password → 立即纠正；② 新增节点 → 去抖后局部扫描 */
function onMutations(mutations) {
  for (const m of mutations) {
    if (m.type === 'attributes') {
      if (m.target.getAttribute('type') === 'password') reveal(m.target);
      continue;
    }
    for (const n of m.addedNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) schedule(n);
    }
  }
}

// ====================== 初始化 ======================
function init() {
  const root = document.body || document.documentElement;
  if (!root) return;
  watch(root);
  scan(root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
})();
