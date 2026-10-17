// ==UserScript==
// @name         文本链接转可点击
// @namespace    https://github.com/rentianyu/ai
// @version      2.3
// @description  自动识别网页纯文本HTTP/HTTPS链接并转为可点击链接，无可用性检测，无任何外部依赖
// @author       编程助手
// @match        *://*/*
// @noframes
// @updateURL    https://f.xbta.cc/ai/js/text-link-clickable.user.js
// @downloadURL  https://f.xbta.cc/ai/js/text-link-clickable.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
'use strict';
// ====================== 配置 ======================
const URL_REGEX = /https?:\/\/[^\s<>"'`]+/gi;    // 检测纯文本链接
const URL_TEST = /https?:\/\/[^\s<>"'`]+/i;      // 快速判断（非全局，供 test 用）
const TRAILING_PUNCT = /[,;:!?。，；：！？、]+$/;  // 结尾需剥离的标点
const IGNORE_TAGS = ['SCRIPT','STYLE','NOSCRIPT','A','INPUT','TEXTAREA','BUTTON','SELECT','CODE','PRE'];
// ====================================================
/** URL 是否可用（排除 "http://" 这类无主机的残缺片段） */
function isUsable(url) {
return /^https?:\/\/[^\/\s]/i.test(url);
}
/** 剥离 URL 尾随标点及不成对的右括号，如 "http://a.com, 谢谢" → "http://a.com" */
function cleanUrl(raw) {
let url = raw.replace(TRAILING_PUNCT, '');
while (url.endsWith(')') && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length) {
url = url.slice(0, -1);
}
return url;
}
/** 节点是否位于忽略标签内（含本脚本已生成的 <a>，天然防止自触发死循环） */
function isIgnored(node) {
let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
while (el) {
if (IGNORE_TAGS.includes(el.tagName)) return true;
el = el.parentElement;
}
return false;
}
/** 转换文本节点：普通文本保留，URL 段落变 <a> */
function convertTextNode(textNode) {
const text = textNode.nodeValue;
const parent = textNode.parentNode;
if (!parent) return;
const parts = document.createDocumentFragment();
let last = 0, match;
URL_REGEX.lastIndex = 0;
while ((match = URL_REGEX.exec(text)) !== null) {
const url = cleanUrl(match[0]);
if (!isUsable(url)) continue; // 无效链接，保留为纯文本
if (match.index > last) {
parts.appendChild(document.createTextNode(text.slice(last, match.index)));
}
const a = document.createElement('a');
a.href = url;
a.target = '_blank';
a.rel = 'noopener noreferrer';
a.textContent = url;
parts.appendChild(a);
last = match.index + url.length;
URL_REGEX.lastIndex = last;
}
if (last === 0) return; // 没有有效链接，不动 DOM
if (last < text.length) parts.appendChild(document.createTextNode(text.slice(last)));
parent.replaceChild(parts, textNode);
}
/** 处理节点：文本节点直接转换；元素节点用 TreeWalker 遍历子树 */
function processNode(root) {
if (!root || !root.isConnected) return;
if (root.nodeType === Node.TEXT_NODE) {
if (!isIgnored(root) && root.nodeValue.trim() && URL_TEST.test(root.nodeValue)) {
convertTextNode(root);
}
return;
}
if (root.nodeType !== Node.ELEMENT_NODE) return;
const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
acceptNode(n) {
return (!n.nodeValue.trim() || isIgnored(n)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
}
});
const targets = [];
let n;
while ((n = walker.nextNode())) {
if (URL_TEST.test(n.nodeValue)) targets.push(n);
}
targets.forEach(convertTextNode);
}
// ====================== 动态内容：只扫描新增节点 ======================
const queued = new Set();
let timer = null;
function flush() {
timer = null;
const nodes = Array.from(queued);
queued.clear();
nodes.forEach(processNode);
}
function schedule() {
if (timer === null) timer = setTimeout(flush, 100);
}
const observer = new MutationObserver(muts => {
for (const m of muts) {
if (m.type === 'childList') {
for (const n of m.addedNodes) {
if (n.nodeType === Node.TEXT_NODE) {
if (n.parentElement && n.parentElement.closest('a')) continue; // 跳过自身生成的链接文本
queued.add(n);
} else if (n.nodeType === Node.ELEMENT_NODE) {
if (n.closest && n.closest('a')) continue;
queued.add(n);
}
}
schedule();
} else if (m.type === 'characterData') {
queued.add(m.target);
schedule();
}
}
});
// ====================== 初始化 ======================
if (document.body) {
processNode(document.body);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
})();
