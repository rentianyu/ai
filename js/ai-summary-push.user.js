// ==UserScript==
// @name         AI 摘要推送
// @namespace    ai-summary-push
// @version      1.0.0
// @description  点悬浮 AI 按钮，提取当前页正文交给 AI 总结，按「标题 / 时间 / 网址 / 总结」格式推送到企业微信群机器人
// @author       小贝塔
// @license      MIT
// @updateURL    https://f.xbta.cc/ai/js/ai-summary-push.user.js
// @downloadURL  https://f.xbta.cc/ai/js/ai-summary-push.user.js
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

/* 内联依赖（版权归上游作者，非本脚本作者）：
 *   - Mozilla Readability v0.6.0 | Copyright (c) 2010 Arc90 Inc, Apache License 2.0
 *
 * @connect * 的原因：AI 接口地址与企微 webhook 都由用户自行配置，无法预先枚举域名。
 * 脚本只会向这两类地址发请求，不含任何其它外联。
 */

(function () {
  'use strict';

  /* ===== 内联：Mozilla Readability 0.6.0 (Apache-2.0) ===== */
  var Readability = (function () {
    var module = { exports: {} }, exports = module.exports;
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

    return module.exports;
  })();

  /* ===== 纯逻辑：时间 / 字节 / 消息拼装 ===== */
'use strict';

/* ==========================================================================
 * 纯逻辑层：不触碰 DOM，可在 Node 中直接单测
 * ========================================================================== */

/* ---------------- 字节与截断 ---------------- */

function utf8Len(str) {
  var s = str == null ? '' : String(str);
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      if (i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) {
          n += 4;
          i++;
        } else n += 3;
      } else n += 3;
    } else n += 3;
  }
  return n;
}

/** 按 UTF-8 字节截断，不切坏中文/emoji */
function truncateByBytes(str, maxBytes) {
  var s = str == null ? '' : String(str);
  if (maxBytes <= 0) return '';
  var used = 0;
  var i = 0;
  for (; i < s.length; i++) {
    var cp = s.codePointAt ? s.codePointAt(i) : s.charCodeAt(i);
    var w = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (used + w > maxBytes) break;
    used += w;
    if (cp > 0xffff) i++;
  }
  return s.slice(0, i);
}

/** 中间省略保留头尾（用于超长 URL） */
function clipMiddleByBytes(str, maxBytes) {
  var s = str == null ? '' : String(str);
  if (utf8Len(s) <= maxBytes) return s;
  var half = Math.floor((maxBytes - 3) / 2);
  return truncateByBytes(s, half) + '...' + tailByBytes(s, maxBytes - half - 3);
}

function tailByBytes(str, maxBytes) {
  var s = String(str == null ? '' : str);
  if (maxBytes <= 0) return '';
  var used = 0;
  var i = s.length;
  while (i > 0) {
    var cp = s.codePointAt ? s.codePointAt(i - 1) : s.charCodeAt(i - 1);
    var w = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (w === 4 && i >= 2) {
      // 代理对：需要带上低位再判断
      if (used + 4 > maxBytes) break;
      used += 4;
      i -= 2;
      continue;
    }
    if (used + w > maxBytes) break;
    used += w;
    i -= 1;
  }
  return s.slice(i);
}

/** 中文字数（用于向模型约束长度，按码点计） */
function countChars(str) {
  var s = String(str == null ? '' : str);
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      var d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) i++;
    }
    n++;
  }
  return n;
}

/* ---------------- 时间 ---------------- */

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/** 本地时间 YYYY-MM-DD HH:mm:ss */
function formatTime(d) {
  var t = d || new Date();
  return (
    t.getFullYear() +
    '-' +
    pad2(t.getMonth() + 1) +
    '-' +
    pad2(t.getDate()) +
    ' ' +
    pad2(t.getHours()) +
    ':' +
    pad2(t.getMinutes()) +
    ':' +
    pad2(t.getSeconds())
  );
}

/* ---------------- 配置解析 ---------------- */

/** AI 接口地址归一化：补协议、补 /v1/chat/completions */
function resolveApiUrl(raw) {
  var s = String(raw == null ? '' : raw).trim().replace(/\/+$/, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  if (/\/chat\/completions$/i.test(s)) return s;
  if (/\/v\d+$/i.test(s)) return s + '/chat/completions';
  return s + '/v1/chat/completions';
}

/** 企微 webhook 归一化：只填 key 时自动补全地址 */
function resolveWebhook(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[0-9a-zA-Z-]{20,}$/.test(s)) {
    return 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + s;
  }
  return s;
}

/* ---------------- Prompt ---------------- */

function buildPrompt(o) {
  var n = o.maxChars || 500;
  return (
    '请准确总结下面这个网页的正文内容。\n' +
    '要求：\n' +
    '1. 只依据给出的正文，不臆造、不补充正文之外的信息；\n' +
    '2. 抓主要事实、结论与关键数据，忽略导航、广告、评论区噪声；\n' +
    '3. 输出纯文本一段话：不要 markdown、不要小标题、不要列表符号、不要重复网页标题；\n' +
    '4. 长度不超过 ' +
    n +
    ' 个中文字符，越简洁越好；\n' +
    '5. 若正文是论坛/社区帖子，说明帖子主题与主要讨论内容。\n\n' +
    '网页标题：' +
    (o.title || '(无)') +
    '\n\n网页正文：\n' +
    o.content
  );
}

function buildMessages(o) {
  return [
    {
      role: 'system',
      content: '你是网页内容摘要助手，只输出简洁、准确、不外推的中文摘要正文。',
    },
    { role: 'user', content: buildPrompt(o) },
  ];
}

/* ---------------- 响应解析 ---------------- */

function parseAiResponse(json) {
  if (!json || typeof json !== 'object') return { error: '接口返回为空或不是 JSON' };
  if (json.error) {
    var em = json.error && json.error.message ? json.error.message : String(json.error);
    return { error: '接口报错：' + em };
  }
  var ch = json.choices && json.choices[0];
  if (!ch) return { error: '响应里没有 choices 字段' };
  var msg = ch.message || {};
  var content = String(msg.content == null ? '' : msg.content).trim();
  var reasoning = String(
    msg.reasoning_content || msg.reasoning || msg.reasoningContent || ''
  ).trim();
  if (!content && reasoning) {
    return { error: '模型只返回了思考过程（content 为空），请换非推理模型或调大 max_tokens' };
  }
  if (!content) return { error: '模型返回内容为空' };
  return { content: content, reasoning: reasoning };
}

var WECOM_ERR = {
  93000: 'webhook 地址无效（机器人可能已被删除）',
  45009: '该机器人发送频率超限（20 条/分钟）',
  40058: '内容超过 2048 字节上限',
  40008: '消息格式不合法',
  41001: '缺少 access_token（webhook 地址不完整）',
};

function judgeWecom(json) {
  if (!json || typeof json !== 'object') return { ok: false, msg: '企微返回空响应' };
  if (json.errcode === 0) return { ok: true, msg: 'ok' };
  var base = WECOM_ERR[json.errcode] || '企微返回错误';
  return {
    ok: false,
    msg: base + '（errcode ' + json.errcode + (json.errmsg ? '：' + json.errmsg : '') + '）',
  };
}

/* ---------------- 摘要清洗 ---------------- */

function cleanSummary(raw) {
  var s = String(raw == null ? '' : raw);
  s = s.replace(/\r\n?/g, '\n');
  // 去掉 markdown 结构符号
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/^\s*[-*+•]\s+/gm, '');
  s = s.replace(/^\s*\d+[.、)]\s+/gm, '');
  s = s.replace(/`([^`]*)`/g, '$1');
  // 去掉模型爱加的前缀
  s = s.replace(/^\s*(总结|摘要|正文摘要|内容摘要)\s*[:：]\s*/i, '');
  // 换行折成单空格，保持「总结：一句话」形态
  s = s.replace(/\s*\n+\s*/g, ' ');
  s = s.replace(/[ \t\u00a0]+/g, ' ');
  return s.trim();
}

/* ---------------- 最终消息 ---------------- */

/**
 * 拼企微 text 消息正文，按 UTF-8 字节硬控在 maxBytes 内（默认 2000，留 48 字节余量）。
 * 优先级：网址完整 > 总结主体 > 标题（标题过长先压标题，再压网址，最后才动总结）。
 */
function buildMessage(o) {
  var maxBytes = o.maxBytes || 2000;
  var time = o.time || formatTime(new Date());
  var title = String(o.title || '（无标题）').replace(/\s+/g, ' ').trim();
  var url = String(o.url || '').trim();
  var summary = String(o.summary || '').trim();

  function compose(t, u, s) {
    return '标题：' + t + '\n时间：' + time + '\n网址：' + u + '\n总结：' + s;
  }

  title = truncateByBytes(title, 240);

  var MIN_SUM = 240; // 至少留 240 字节给总结（约 80 个中文字）
  var budget = maxBytes - utf8Len(compose(title, url, ''));

  if (budget < MIN_SUM) {
    title = truncateByBytes(title, 120) + '…';
    budget = maxBytes - utf8Len(compose(title, url, ''));
  }
  if (budget < MIN_SUM) {
    title = truncateByBytes(title, 60) + '…';
    budget = maxBytes - utf8Len(compose(title, url, ''));
  }
  if (budget < MIN_SUM) {
    url = clipMiddleByBytes(url, 400);
    budget = maxBytes - utf8Len(compose(title, url, ''));
  }
  if (budget < 0) budget = 0;

  var body = truncateByBytes(summary, budget);
  if (body.length < summary.length) {
    var core = truncateByBytes(body.replace(/[\s，。、；：]+$/, ''), Math.max(0, budget - 3));
    body = core + '…';
  }

  var out = compose(title, url, body);
  var guard = 0;
  while (utf8Len(out) > maxBytes && guard++ < 6) {
    var over = utf8Len(out) - maxBytes;
    if (body) {
      body = truncateByBytes(body, Math.max(0, utf8Len(body) - over));
      out = compose(title, url, body);
    } else if (utf8Len(url) > 20) {
      url = clipMiddleByBytes(url, Math.max(20, utf8Len(url) - over));
      out = compose(title, url, body);
    } else {
      title = truncateByBytes(title, Math.max(4, utf8Len(title) - over));
      out = compose(title, url, body);
      break;
    }
  }
  return out;
}

/* ---------------- 正文清洗（与 DOM 解耦，仅处理文本） ---------------- */

function normalizeText(raw) {
  var s = String(raw == null ? '' : raw);
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(/[\u200b-\u200d\ufeff]/g, '');
  s = s.replace(/[ \t\u00a0]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function trimForModel(text, maxChars) {
  var t = normalizeText(text);
  var limit = maxChars || 12000;
  if (countChars(t) <= limit) return t;
  return truncateByBytes(t, limit * 3); // 按 3 字节/字保守截
}

  /* ===== UI 与流程 ===== */
'use strict';

/* ==========================================================================
 * UI / 流程层
 * ========================================================================== */

;(function () {
  var CFG_KEY = 'ai-summary-push.cfg';
  var HOST_ID = 'ai-summary-push-host';
  var BTN_TEXT = 'AI';
  var MAX_PAGE_CHARS = 12000;
  var MSG_MAX_BYTES = 2000;

  var cfg = null;
  var host = null;
  var root = null;
  var btn = null;
  var tickEl = null;
  var spinEl = null;
  var glyphEl = null;
  var panelEl = null;
  var toastEl = null;
  var toastTimer = null;
  var ptr = null;
  var busy = false;

  var DEFAULTS = {
    apiUrl: '',
    apiKey: '',
    model: '',
    webhook: '',
    maxChars: 500,
    pos: null,
    hidden: false,
  };

  /* ---------------------------- 配置 ---------------------------- */

  function loadCfg() {
    var out = {};
    for (var k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k];
    var raw = null;
    try {
      if (typeof GM_getValue === 'function') raw = GM_getValue(CFG_KEY, null);
    } catch (e) {}
    if (!raw) {
      try {
        raw = localStorage.getItem(CFG_KEY);
      } catch (e) {}
    }
    if (raw) {
      try {
        var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (o && typeof o === 'object') for (var key in out) if (o[key] !== undefined) out[key] = o[key];
      } catch (e) {}
    }
    out.maxChars = parseInt(out.maxChars, 10) || 500;
    return out;
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

  function configured() {
    return !!(cfg.apiUrl && cfg.apiKey && cfg.model && cfg.webhook);
  }

  /* ---------------------------- 样式 ---------------------------- */

  var CSS = [
    '.btn{position:fixed;right:18px;bottom:152px;width:44px;height:44px;border-radius:50%;display:flex;',
    'align-items:center;justify-content:center;background:linear-gradient(140deg,#4f46e5,#1e293b);color:#fff;',
    'border:1px solid rgba(255,255,255,.22);box-shadow:0 4px 16px rgba(30,41,59,.42);cursor:pointer;',
    'font:700 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;letter-spacing:.4px;',
    'opacity:.86;transition:opacity .16s,background .16s,transform .16s;user-select:none;-webkit-user-select:none;',
    'touch-action:none;z-index:2147483000}',
    '.btn:hover{opacity:1;transform:scale(1.05)}',
    '.btn.busy{opacity:1;background:linear-gradient(140deg,#6366f1,#334155)}',
    '.btn.ok{opacity:1;background:linear-gradient(140deg,#16a34a,#15803d)}',
    '.btn.err{opacity:1;background:linear-gradient(140deg,#dc2626,#991b1b)}',
    '.btn.busy .glyph,.btn.ok .glyph,.btn.err .glyph{display:none}',
    '.spin{display:none;width:18px;height:18px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;',
    'border-radius:50%;animation:asp .7s linear infinite}',
    '.btn.busy .spin{display:block}',
    '.tick{display:none;font-size:17px;font-weight:700;line-height:1}',
    '.btn.ok .tick,.btn.err .tick{display:block}',
    '@keyframes asp{to{transform:rotate(360deg)}}',
    '.toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);max-width:min(600px,92vw);',
    'background:rgba(17,24,39,.95);color:#fff;padding:9px 16px;border-radius:10px;',
    'font:13px/1.55 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;',
    'box-shadow:0 8px 26px rgba(0,0,0,.3);z-index:2147483002;white-space:pre-wrap;word-break:break-word}',
    '.toast.ok{background:rgba(22,163,74,.96)}',
    '.toast.err{background:rgba(220,38,38,.96)}',
    '.toast.warn{background:rgba(245,158,11,.97);color:#3a2a00}',
    '.mask{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.42);display:flex;',
    'align-items:center;justify-content:center;z-index:2147483001;padding:14px;box-sizing:border-box}',
    '.panel{width:min(480px,100%);max-height:88vh;overflow:auto;box-sizing:border-box;background:#fff;',
    'border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.3);padding:20px 22px 16px;color:#111827;',
    'font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;text-align:left}',
    '.panel h3{margin:0 0 4px;font-size:16px;font-weight:600}',
    '.sub{margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.5}',
    '.lb{display:block;font-size:12px;color:#6b7280;margin:11px 0 5px}',
    '.inp{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;',
    'font-size:12.5px;outline:none;font-family:ui-monospace,Menlo,Consolas,monospace;color:#111827;background:#fff}',
    '.inp::placeholder{color:#b6bcc6}',
    '.inp:focus{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.15)}',
    '.tip{font-size:11.5px;color:#9ca3af;margin:5px 0 0;line-height:1.5}',
    '.ft{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}',
    '.b{height:34px;padding:0 16px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#374151;',
    'font-size:13px;cursor:pointer;font-family:inherit}',
    '.b:hover{background:#f9fafb}',
    '.b.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}',
    '.b.pri:hover{background:#4338ca}',
    '@media (max-width:640px){',
    '.btn{right:14px;bottom:calc(150px + env(safe-area-inset-bottom,0px));width:42px;height:42px;font-size:13px}',
    '.panel{padding:16px 16px 12px;border-radius:12px}',
    '.b{height:40px;font-size:14px;flex:1 1 0}',
    '.ft{flex-wrap:wrap}',
    '}',
    '@media (prefers-color-scheme:dark){',
    '.panel{background:#1f2937;color:#e5e7eb}',
    '.panel h3{color:#f3f4f6}',
    '.lb{color:#9ca3af}',
    '.inp{background:#111827;border-color:#374151;color:#e5e7eb}',
    '.b{background:#374151;border-color:#4b5563;color:#e5e7eb}',
    '.b.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}',
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

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs)
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null) continue;
        if (k === 'style') n.style.cssText = v;
        else if (k === 'text') n.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function')
          n.addEventListener(k.slice(2).toLowerCase(), v);
        else n.setAttribute(k, v);
      }
    if (kids) for (var i = 0; i < kids.length; i++) if (kids[i]) n.appendChild(kids[i]);
    return n;
  }

  /* ---------------------------- toast / 按钮态 ---------------------------- */

  function toast(msg, kind, ms) {
    if (!root) return;
    if (!toastEl) {
      toastEl = el('div', { class: 'toast' });
      root.appendChild(toastEl);
    }
    toastEl.className = 'toast' + (kind ? ' ' + kind : '');
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(
      function () {
        if (toastEl) toastEl.style.display = 'none';
        toastTimer = null;
      },
      ms || 5000
    );
  }

  function setBtn(kind) {
    if (!btn) return;
    btn.className = 'btn' + (kind ? ' ' + kind : '');
    if (kind === 'ok') tickEl.textContent = '\u2713';
    else if (kind === 'err') tickEl.textContent = '\u2715';
  }

  /* ---------------------------- 网络 ---------------------------- */

  function request(opts) {
    return new Promise(function (resolve, reject) {
      var done = false;
      function fin(fn, v) {
        if (done) return;
        done = true;
        fn(v);
      }
      var payload = JSON.stringify(opts.body);
      try {
        if (typeof GM_xmlhttpRequest === 'function') {
          GM_xmlhttpRequest({
            method: opts.method || 'POST',
            url: opts.url,
            headers: opts.headers || {},
            data: payload,
            timeout: opts.timeout || 60000,
            onload: function (res) {
              fin(resolve, { status: res.status, text: res.responseText || '' });
            },
            onerror: function () {
              fin(reject, new Error('网络错误（地址不可达或被拦截）'));
            },
            ontimeout: function () {
              fin(reject, new Error('请求超时'));
            },
            onabort: function () {
              fin(reject, new Error('请求被取消'));
            },
          });
          return;
        }
      } catch (e) {}
      fetch(opts.url, {
        method: opts.method || 'POST',
        headers: opts.headers || {},
        body: payload,
      }).then(
        function (r) {
          r.text().then(function (t) {
            fin(resolve, { status: r.status, text: t });
          }, function () {
            fin(reject, new Error('读取响应失败'));
          });
        },
        function () {
          fin(reject, new Error('网络错误'));
        }
      );
    });
  }

  function parseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function callAi(messages, maxTokens) {
    var url = resolveApiUrl(cfg.apiUrl);
    return request({
      url: url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + cfg.apiKey,
      },
      body: {
        model: cfg.model,
        messages: messages,
        temperature: 0.3,
        max_tokens: maxTokens || 2000,
      },
      timeout: 90000,
    }).then(function (res) {
      var json = parseJson(res.text);
      if (res.status < 200 || res.status >= 300) {
        var detail = (json && json.error && (json.error.message || json.error)) || res.text.slice(0, 180);
        throw new Error('AI 接口 HTTP ' + res.status + '：' + detail);
      }
      var r = parseAiResponse(json);
      if (r.error) {
        var err = new Error(r.error);
        err.needsMoreTokens = true;
        throw err;
      }
      return r;
    });
  }

  function pushWecom(webhook, content) {
    return request({
      url: webhook,
      headers: { 'Content-Type': 'application/json' },
      body: { msgtype: 'text', text: { content: content } },
      timeout: 20000,
    }).then(function (res) {
      var json = parseJson(res.text);
      if (!json) throw new Error('企微返回非 JSON（HTTP ' + res.status + '）');
      var j = judgeWecom(json);
      if (!j.ok) throw new Error(j.msg);
      return json;
    });
  }

  /* ---------------------------- 正文提取 ---------------------------- */

  function pickText() {
    var best = '';
    try {
      if (typeof Readability === 'function') {
        var art = new Readability(document.cloneNode(true), { charThreshold: 200 }).parse();
        if (art && art.textContent) best = art.textContent;
      }
    } catch (e) {}
    if (countChars(best) < 200) {
      var node = document.querySelector('article, main, [itemprop="articleBody"]');
      var t = '';
      try {
        t = (node && (node.innerText || node.textContent)) || '';
        if (countChars(t) < 200) t = (document.body && document.body.innerText) || '';
      } catch (e) {}
      if (countChars(t) > countChars(best)) best = t;
    }
    return normalizeText(best);
  }

  /* ---------------------------- 主流程 ---------------------------- */

  function run() {
    if (busy) return;
    if (!configured()) {
      openPanel(true);
      toast('请先填写 AI 接口、Key、模型与企微 webhook', 'warn', 4000);
      return;
    }

    var title = (document.title || '').trim() || location.hostname;
    var url = location.href;
    var text = trimForModel(pickText(), MAX_PAGE_CHARS);
    var n = countChars(text);

    if (n < 80) {
      setBtn('err');
      setTimeout(function () { setBtn(''); }, 1600);
      toast('当前页正文只有 ' + n + ' 字，无法总结', 'err', 5000);
      return;
    }

    busy = true;
    setBtn('busy');
    toast('正在提取正文（' + n + ' 字）并请求 AI…', '', 4000);

    var messages = buildMessages({ title: title, content: text, maxChars: cfg.maxChars });

    callAi(messages, 2000)
      .catch(function (e) {
        // 推理模型把额度用在 reasoning 上时，放大 max_tokens 再试一次
        if (e && e.needsMoreTokens) return callAi(messages, 5000);
        throw e;
      })
      .then(function (r) {
        var summary = cleanSummary(r.content);
        if (countChars(summary) < 10) throw new Error('AI 返回的摘要过短');
        var msg = buildMessage({
          title: title,
          url: url,
          time: formatTime(new Date()),
          summary: summary,
          maxBytes: MSG_MAX_BYTES,
        });
        return pushWecom(resolveWebhook(cfg.webhook), msg).then(function () {
          return { msg: msg, summary: summary };
        });
      })
      .then(function (o) {
        busy = false;
        setBtn('ok');
        setTimeout(function () { setBtn(''); }, 2200);
        toast(
          '已推送到企微 · 摘要 ' + countChars(o.summary) + ' 字 · 全文 ' + utf8Len(o.msg) + ' 字节',
          'ok',
          6000
        );
      })
      .catch(function (e) {
        busy = false;
        setBtn('err');
        setTimeout(function () { setBtn(''); }, 2600);
        toast('失败：' + (e && e.message ? e.message : e), 'err', 10000);
      });
  }

  /* ---------------------------- 设置面板 ---------------------------- */

  function closePanel() {
    if (panelEl) {
      try {
        panelEl.parentNode.removeChild(panelEl);
      } catch (e) {}
      panelEl = null;
    }
  }

  function openPanel(first) {
    closePanel();
    var inputs = {};

    function field(key, label, placeholder, tip) {
      var box = el('div');
      box.appendChild(el('label', { class: 'lb', text: label }));
      var inp = el('input', { class: 'inp', type: 'text', placeholder: placeholder });
      inp.value = cfg[key] == null ? '' : String(cfg[key]);
      inputs[key] = inp;
      box.appendChild(inp);
      if (tip) box.appendChild(el('p', { class: 'tip', text: tip }));
      return box;
    }

    var panel = el('div', { class: 'panel' });
    panel.appendChild(el('h3', { text: 'AI 摘要推送设置' }));
    panel.appendChild(
      el('p', {
        class: 'sub',
        text: '点右下角 AI 按钮：提取当前页正文 → 交给 AI 总结 → 按固定格式推到企业微信群机器人。',
      })
    );
    panel.appendChild(
      field(
        'apiUrl',
        'AI 接口地址',
        'https://api.deepseek.com',
        'OpenAI 兼容接口。填根地址会自动补 /v1/chat/completions，也可直接填完整地址。'
      )
    );
    panel.appendChild(field('apiKey', 'API Key', 'sk-...', '只存在本机脚本存储里，不会外发到别处。'));
    panel.appendChild(field('model', '模型名', 'deepseek-chat', '与接口对应的模型标识。'));
    panel.appendChild(
      field(
        'webhook',
        '企微群机器人 webhook',
        'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
        '可填完整地址，也可只填 key 部分（自动补全）。'
      )
    );
    panel.appendChild(
      field('maxChars', '总结字数上限', '500', '中文字符数上限；最终消息还会按 2000 字节再兜底裁一次。')
    );

    var save = el('button', { class: 'b pri', type: 'button', text: '保存' });
    var cancel = el('button', { class: 'b', type: 'button', text: first ? '取消' : '关闭' });
    var ft = el('div', { class: 'ft' }, [cancel, save]);
    panel.appendChild(ft);

    var mask = el('div', { class: 'mask' }, [panel]);
    mask.addEventListener('click', function (e) {
      if (e.target === mask) closePanel();
    });
    cancel.addEventListener('click', closePanel);
    save.addEventListener('click', function () {
      var next = {
        apiUrl: inputs.apiUrl.value.trim(),
        apiKey: inputs.apiKey.value.trim(),
        model: inputs.model.value.trim(),
        webhook: inputs.webhook.value.trim(),
        maxChars: Math.max(100, Math.min(1500, parseInt(inputs.maxChars.value, 10) || 500)),
        pos: cfg.pos,
        hidden: cfg.hidden,
      };
      var missing = [];
      if (!next.apiUrl) missing.push('接口地址');
      if (!next.apiKey) missing.push('API Key');
      if (!next.model) missing.push('模型名');
      if (!next.webhook) missing.push('webhook');
      if (missing.length) {
        toast('还缺：' + missing.join('、'), 'warn', 4000);
        return;
      }
      cfg = next;
      saveCfg();
      closePanel();
      toast('已保存，点 AI 按钮即可摘要推送', 'ok', 3500);
    });

    root.appendChild(mask);
    panelEl = mask;
    setTimeout(function () {
      try {
        (first ? inputs.apiUrl : inputs.model).focus();
      } catch (e) {}
    }, 30);
  }

  /* ---------------------------- 拖动 / 挂载 ---------------------------- */

  function applyPos(left, top) {
    if (!btn) return;
    var vw = window.innerWidth || 360;
    var vh = window.innerHeight || 640;
    var r = btn.getBoundingClientRect();
    var w = r.width || 44;
    var h = r.height || 44;
    var l = Math.min(Math.max(4, left), Math.max(4, vw - w - 4));
    var t = Math.min(Math.max(4, top), Math.max(4, vh - h - 4));
    btn.style.left = l + 'px';
    btn.style.top = t + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }

  function bindDrag() {
    btn.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      var r = btn.getBoundingClientRect();
      ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
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
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (moved) {
        var r = btn.getBoundingClientRect();
        cfg.pos = { left: Math.round(r.left), top: Math.round(r.top) };
        saveCfg();
      } else run();
    });
    btn.addEventListener('pointercancel', function () {
      ptr = null;
    });
    window.addEventListener('resize', function () {
      if (cfg.pos) applyPos(cfg.pos.left, cfg.pos.top);
    });
  }

  function mount() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    if (document.getElementById(HOST_ID)) return;
    if (window.top !== window.self) return;
    var parent = document.body || document.documentElement;
    if (!parent) {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
      return;
    }

    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText =
      'all:initial;position:fixed;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147483646;';
    parent.appendChild(host);
    root = host.attachShadow({ mode: 'open' });
    applyStyles(root);

    cfg = loadCfg();

    btn = el('div', { class: 'btn', title: 'AI 摘要并推送到企微（拖动可移位）' });
    glyphEl = el('span', { class: 'glyph', text: BTN_TEXT });
    spinEl = el('div', { class: 'spin' });
    tickEl = el('span', { class: 'tick' });
    btn.appendChild(glyphEl);
    btn.appendChild(spinEl);
    btn.appendChild(tickEl);
    if (cfg.hidden) btn.style.display = 'none';
    root.appendChild(btn);
    if (cfg.pos) applyPos(cfg.pos.left, cfg.pos.top);

    bindDrag();

    if (typeof GM_registerMenuCommand === 'function') {
      try {
        GM_registerMenuCommand('AI 摘要并推送', function () {
          run();
        });
        GM_registerMenuCommand('设置', function () {
          openPanel(false);
        });
        GM_registerMenuCommand('显示/隐藏悬浮按钮', function () {
          cfg.hidden = !cfg.hidden;
          saveCfg();
          btn.style.display = cfg.hidden ? 'none' : '';
        });
      } catch (e) {}
    }

    document.addEventListener(
      'keydown',
      function (e) {
        if (panelEl && (e.key === 'Escape' || e.keyCode === 27)) closePanel();
      },
      true
    );

    if (!configured()) {
      setTimeout(function () {
        toast('首次使用：点 AI 按钮填写接口与 webhook', 'warn', 6000);
      }, 800);
    }
  }

  mount();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      utf8Len: utf8Len,
      truncateByBytes: truncateByBytes,
      countChars: countChars,
      formatTime: formatTime,
      resolveApiUrl: resolveApiUrl,
      resolveWebhook: resolveWebhook,
      buildMessages: buildMessages,
      parseAiResponse: parseAiResponse,
      judgeWecom: judgeWecom,
      cleanSummary: cleanSummary,
      buildMessage: buildMessage,
      normalizeText: normalizeText,
      trimForModel: trimForModel,
    };
  }
})();

})();