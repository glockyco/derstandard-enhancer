// ==UserScript==
// @name         DerStandard Enhancer
// @namespace    https://github.com/glockyco/derstandard-enhancer
// @version      0.1.7
// @description  Panel für Artikelsuche und Lesefortschritt auf derStandard.at
// @match        https://www.derstandard.at/*
// @match        https://derstandard.at/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js
// @updateURL    https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js
// ==/UserScript==


(function (global) { global.DSUXStyles = ":host {\n  all: initial;\n  --dsux-ink: #202124;\n  --dsux-muted: #5f6368;\n  --dsux-border: #c7c9cc;\n  --dsux-border-strong: #8b8f94;\n  --dsux-surface: #ffffff;\n  --dsux-surface-muted: #f3f4f5;\n  --dsux-accent: #075aa6;\n  --dsux-accent-strong: #064276;\n  --dsux-accent-contrast: #ffffff;\n  --dsux-success: #176b32;\n  --dsux-focus: #0b63ce;\n  --dsux-shadow: 0 0.75rem 2.25rem rgb(0 0 0 / 28%);\n  color: var(--dsux-ink);\n  font-family: system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n  font-size: 16px;\n  line-height: 1.4;\n}\n\n:host [hidden] {\n  display: none !important;\n}\n\n.dsux-launcher {\n  position: fixed;\n  right: 1rem;\n  bottom: 1rem;\n  z-index: 2147483000;\n  display: grid;\n  width: 3.5rem;\n  height: 3.5rem;\n  box-sizing: border-box;\n  place-items: center;\n  padding: 0;\n  border: 2px solid var(--dsux-accent-strong);\n  border-radius: 50%;\n  background: var(--dsux-accent);\n  color: var(--dsux-accent-contrast);\n  box-shadow: 0 0.2rem 0.9rem rgb(0 0 0 / 34%);\n  cursor: pointer;\n  font: inherit;\n  font-size: 1.65rem;\n  font-weight: 700;\n  line-height: 1;\n}\n\n.dsux-launcher:hover {\n  background: var(--dsux-accent-strong);\n}\n\n.dsux-panel {\n  position: fixed;\n  right: 1rem;\n  bottom: calc(1rem + 3.5rem + 0.75rem);\n  z-index: 2147482999;\n  display: flex;\n  width: min(68rem, calc(100vw - 2rem));\n  max-height: min(52rem, calc(100vh - 6rem));\n  box-sizing: border-box;\n  flex-direction: column;\n  overflow: auto;\n  padding: 1.25rem;\n  border: 1px solid var(--dsux-border-strong);\n  border-radius: 0.45rem;\n  background: var(--dsux-surface);\n  color: var(--dsux-ink);\n  box-shadow: var(--dsux-shadow);\n  font: inherit;\n}\n\n.dsux-panel-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  padding-bottom: 0.75rem;\n  border-bottom: 1px solid var(--dsux-border);\n}\n\n.dsux-panel-header h2 {\n  margin: 0;\n  color: var(--dsux-ink);\n  font-size: 1.25rem;\n  line-height: 1.2;\n}\n\n.dsux-close {\n  display: inline-grid;\n  width: 2.25rem;\n  height: 2.25rem;\n  box-sizing: border-box;\n  place-items: center;\n  flex: 0 0 auto;\n  padding: 0;\n  border: 1px solid transparent;\n  border-radius: 0.25rem;\n  background: transparent;\n  color: var(--dsux-ink);\n  cursor: pointer;\n  font: inherit;\n  font-size: 1.55rem;\n  line-height: 1;\n}\n\n.dsux-close:hover {\n  border-color: var(--dsux-border);\n  background: var(--dsux-surface-muted);\n}\n\n.dsux-tabs {\n  display: flex;\n  gap: 0.4rem;\n  margin: 0.85rem 0 1rem;\n  border-bottom: 1px solid var(--dsux-border);\n}\n\n.dsux-tabs button {\n  min-height: 2.4rem;\n  padding: 0.45rem 0.75rem;\n  border: 1px solid transparent;\n  border-bottom: 3px solid transparent;\n  border-radius: 0.25rem 0.25rem 0 0;\n  background: transparent;\n  color: var(--dsux-ink);\n  cursor: pointer;\n  font: inherit;\n  font-size: 0.9rem;\n}\n\n.dsux-tabs button:hover {\n  background: var(--dsux-surface-muted);\n}\n\n.dsux-tabs button[aria-selected=\"true\"] {\n  border-bottom-color: var(--dsux-accent);\n  background: var(--dsux-accent);\n  color: var(--dsux-accent-contrast);\n  font-weight: 700;\n}\n\n.dsux-view {\n  min-width: 0;\n}\n\n.dsux-controls {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) minmax(9rem, auto);\n  gap: 0.6rem;\n  margin-bottom: 0.75rem;\n}\n\n.dsux-controls input,\n.dsux-controls select {\n  width: 100%;\n  min-height: 2.4rem;\n  box-sizing: border-box;\n  padding: 0.45rem 0.6rem;\n  border: 1px solid var(--dsux-border-strong);\n  border-radius: 0.25rem;\n  background: var(--dsux-surface);\n  color: var(--dsux-ink);\n  font: inherit;\n  font-size: 0.9rem;\n}\n\n.dsux-controls input::placeholder {\n  color: var(--dsux-muted);\n  opacity: 1;\n}\n\n.dsux-table {\n  width: 100%;\n  margin: 0.5rem 0 1rem;\n  border-collapse: collapse;\n  table-layout: fixed;\n}\n\n.dsux-table th {\n  padding: 0.4rem 0.5rem;\n  border-bottom: 2px solid var(--dsux-border-strong);\n  color: var(--dsux-muted);\n  font-size: 0.72rem;\n  font-weight: 700;\n  letter-spacing: 0.035em;\n  text-align: left;\n  text-transform: uppercase;\n}\n\n.dsux-table th:nth-child(2) {\n  width: 6.5rem;\n}\n\n.dsux-table th:nth-child(3) {\n  width: 5.25rem;\n  text-align: right;\n}\n\n.dsux-table th:nth-child(4) {\n  width: 4.5rem;\n  text-align: center;\n}\n\n.dsux-table th:nth-child(5) {\n  width: 7rem;\n  text-align: center;\n}\n\n.dsux-table td {\n  padding: 0.6rem 0.5rem;\n  border-bottom: 1px solid var(--dsux-border);\n  color: var(--dsux-ink);\n  font-size: 0.9rem;\n  vertical-align: top;\n}\n\n.dsux-table td:first-child {\n  padding-left: 0;\n}\n\n.dsux-table td:last-child {\n  padding-right: 0;\n}\n\n.dsux-row:hover {\n  background: var(--dsux-surface-muted);\n}\n\n.dsux-title-cell a {\n  color: var(--dsux-accent-strong);\n  font-weight: 700;\n  overflow-wrap: anywhere;\n  text-decoration: underline;\n  text-decoration-thickness: 0.08em;\n  text-underline-offset: 0.12em;\n}\n\n.dsux-title-cell a:hover {\n  color: var(--dsux-accent);\n}\n\n.dsux-row-meta {\n  margin-top: 0.15rem;\n  color: var(--dsux-muted);\n  font-size: 0.76rem;\n}\n\n.dsux-subtitle {\n  margin: 0.25rem 0;\n  color: var(--dsux-muted);\n  font-size: 0.82rem;\n}\n\n.dsux-date-cell {\n  color: var(--dsux-muted);\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n}\n\n.dsux-count-cell {\n  color: var(--dsux-muted);\n  font-variant-numeric: tabular-nums;\n  text-align: right;\n}\n\n.dsux-status-cell {\n  color: var(--dsux-success);\n  font-size: 0.88rem;\n  font-weight: 700;\n  text-align: center;\n}\n\n.dsux-progress {\n  height: 0.35rem;\n  margin-top: 0.45rem;\n  overflow: hidden;\n  border-radius: 999px;\n  background: #d9dde1;\n}\n\n.dsux-progress span {\n  display: block;\n  width: 0;\n  height: 100%;\n  border-radius: inherit;\n  background: var(--dsux-success);\n}\n\n.dsux-actions-cell {\n  white-space: nowrap;\n  text-align: center;\n}\n\n.dsux-row-actions {\n  display: flex;\n  flex-wrap: nowrap;\n  justify-content: center;\n  gap: 0.35rem;\n}\n\n.dsux-icon-button {\n  display: inline-grid;\n  width: 2rem;\n  height: 2rem;\n  box-sizing: border-box;\n  place-items: center;\n  padding: 0;\n  border: 1px solid var(--dsux-border-strong);\n  border-radius: 0.25rem;\n  background: var(--dsux-surface);\n  color: var(--dsux-ink);\n  cursor: pointer;\n  font: inherit;\n  font-size: 1.1rem;\n  line-height: 1;\n}\n\n.dsux-icon-button:hover {\n  border-color: var(--dsux-accent);\n  background: #eaf2fb;\n}\n\n.dsux-icon-button[aria-pressed=\"true\"] {\n  border-color: var(--dsux-accent-strong);\n  background: #dcebf9;\n  color: var(--dsux-accent-strong);\n}\n\n.dsux-table-sort {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: inherit;\n  cursor: pointer;\n  font: inherit;\n  font-size: inherit;\n  font-weight: inherit;\n  letter-spacing: inherit;\n  text-align: inherit;\n  text-transform: inherit;\n  white-space: nowrap;\n}\n\n.dsux-table-sort[data-direction=\"ascending\"],\n.dsux-table-sort[data-direction=\"descending\"] {\n  color: var(--dsux-accent-strong);\n}\n\n.dsux-table-sort[data-direction=\"ascending\"]::after {\n  content: \"↑\";\n}\n\n.dsux-table-sort[data-direction=\"descending\"]::after {\n  content: \"↓\";\n}\n\n.dsux-empty td {\n  padding: 1rem 0;\n  color: var(--dsux-muted);\n}\n\n.dsux-help {\n  padding-top: 0.8rem;\n  border-top: 1px solid var(--dsux-border);\n  color: var(--dsux-muted);\n  font-size: 0.84rem;\n}\n\n.dsux-help strong {\n  color: var(--dsux-ink);\n}\n\n.dsux-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-top: 0.65rem;\n}\n\n.dsux-actions button,\n.dsux-actions label {\n  min-height: 2.35rem;\n  box-sizing: border-box;\n  padding: 0.45rem 0.7rem;\n  border: 1px solid var(--dsux-border-strong);\n  border-radius: 0.25rem;\n  background: var(--dsux-surface);\n  color: var(--dsux-ink);\n  cursor: pointer;\n  font: inherit;\n  font-size: 0.9rem;\n}\n\n.dsux-actions label {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n}\n\n.dsux-actions button:hover,\n.dsux-actions label:hover {\n  border-color: var(--dsux-accent);\n  background: #eaf2fb;\n}\n\n.dsux-actions button:disabled {\n  cursor: not-allowed;\n  opacity: 0.55;\n}\n\n.dsux-actions input[type=\"file\"] {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  overflow: hidden;\n  clip: rect(0 0 0 0);\n  clip-path: inset(50%);\n  white-space: nowrap;\n}\n\n.dsux-article-title {\n  margin: 0;\n  color: var(--dsux-ink);\n  font-size: 1.2rem;\n  line-height: 1.25;\n}\n\n.dsux-reading-controls {\n  display: grid;\n  grid-template-columns: auto minmax(5rem, 1fr) auto;\n  align-items: center;\n  gap: 0.65rem;\n  margin-top: 0.65rem;\n}\n\n.dsux-article-status {\n  margin: 0;\n  color: var(--dsux-ink);\n  font-size: 0.9rem;\n  font-weight: 700;\n  white-space: nowrap;\n}\n\n.dsux-panel .dsux-article-progress {\n  height: 0.7rem;\n  min-height: 0.7rem;\n  margin: 0;\n  overflow: hidden;\n  border: 1px solid #78818a;\n  border-radius: 999px;\n  background: #d9dde1;\n}\n\n.dsux-panel .dsux-article-progress span {\n  display: block;\n  width: 0;\n  min-width: 0.2rem;\n  height: 0.7rem;\n  box-sizing: border-box;\n  border-radius: inherit;\n  background: var(--dsux-success);\n}\n\n.dsux-reading-controls .dsux-actions {\n  flex-wrap: nowrap;\n  margin: 0;\n}\n\n.dsux-panel .dsux-article-progress + .dsux-actions > button {\n  border-color: var(--dsux-accent-strong);\n  background: var(--dsux-accent);\n  color: var(--dsux-accent-contrast);\n  font-weight: 700;\n}\n\n.dsux-panel .dsux-article-progress + .dsux-actions > button:hover {\n  background: var(--dsux-accent-strong);\n}\n.dsux-comment-controls {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem 0.65rem;\n  margin-top: 0.75rem;\n}\n\n.dsux-comment-controls label {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.45rem;\n  color: var(--dsux-ink);\n  font-size: 0.82rem;\n  font-weight: 700;\n}\n\n.dsux-comment-sort {\n  min-height: 2rem;\n  box-sizing: border-box;\n  padding: 0.3rem 0.5rem;\n  border: 1px solid var(--dsux-border-strong);\n  border-radius: 0.25rem;\n  background: var(--dsux-surface);\n  color: var(--dsux-ink);\n  cursor: pointer;\n  font: inherit;\n  font-size: 0.82rem;\n}\n\n.dsux-comment-sort:hover {\n  border-color: var(--dsux-accent);\n}\n\n.dsux-comment-status {\n  margin: 0 0 0 auto;\n  color: var(--dsux-muted);\n  font-size: 0.82rem;\n  font-variant-numeric: tabular-nums;\n}\n\n\n.dsux-outline {\n  margin-top: 1rem;\n  padding-top: 0.75rem;\n  border-top: 1px solid var(--dsux-border);\n}\n\n.dsux-outline > strong {\n  color: var(--dsux-ink);\n}\n\n.dsux-outline ol,\n.dsux-outline ul {\n  margin: 0.45rem 0 0;\n  padding-left: 1.4rem;\n}\n\n.dsux-outline ul {\n  margin-top: 0.15rem;\n  list-style-type: circle;\n}\n\n.dsux-outline li {\n  margin: 0.2rem 0;\n}\n\n.dsux-outline button {\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--dsux-accent-strong);\n  cursor: pointer;\n  font: inherit;\n  overflow-wrap: anywhere;\n  text-align: left;\n  text-decoration: underline;\n  text-underline-offset: 0.12em;\n}\n\n.dsux-toast {\n  position: fixed;\n  right: 5.25rem;\n  bottom: 1rem;\n  z-index: 2147483001;\n  max-width: min(31rem, calc(100vw - 6.5rem));\n  box-sizing: border-box;\n  padding: 0.65rem 0.8rem;\n  border: 1px solid #111;\n  border-radius: 0.35rem;\n  background: #202124;\n  color: #ffffff;\n  box-shadow: 0 0.2rem 0.8rem rgb(0 0 0 / 34%);\n  font: inherit;\n  font-size: 0.9rem;\n}\n.dsux-launcher:focus-visible,\n.dsux-panel button:focus-visible,\n.dsux-panel input:focus-visible,\n.dsux-panel select:focus-visible,\n.dsux-panel a:focus-visible,\n.dsux-panel label:focus-within {\n  outline: 3px solid var(--dsux-focus);\n  outline-offset: 2px;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .dsux-panel,\n  .dsux-launcher,\n  .dsux-toast {\n    scroll-behavior: auto;\n    transition: none;\n  }\n}\n\n@media (max-width: 38rem) {\n  .dsux-panel {\n    right: 0.4rem;\n    bottom: calc(0.75rem + 3.25rem + 0.6rem);\n    left: 0.4rem;\n    width: auto;\n    max-height: calc(100vh - 5.5rem);\n    padding: 0.8rem;\n  }\n\n  .dsux-launcher {\n    right: 0.75rem;\n    bottom: 0.75rem;\n    width: 3.25rem;\n    height: 3.25rem;\n  }\n\n  .dsux-toast {\n    right: 4.75rem;\n    bottom: 0.75rem;\n    max-width: calc(100vw - 5.75rem);\n  }\n\n  .dsux-controls {\n    grid-template-columns: minmax(0, 1fr);\n  }\n\n  .dsux-table th:nth-child(2),\n  .dsux-table td:nth-child(2),\n  .dsux-table th:nth-child(4),\n  .dsux-table td:nth-child(4) {\n    display: none;\n  }\n\n  .dsux-table th:nth-child(3) {\n    width: 6rem;\n  }\n\n  .dsux-table th:nth-child(5) {\n    width: 4.5rem;\n  }\n\n  .dsux-table th,\n  .dsux-table td {\n    padding: 0.45rem 0.3rem;\n  }\n\n  .dsux-row-actions {\n    flex-direction: column;\n    align-items: stretch;\n  }\n\n  .dsux-actions-cell .dsux-icon-button {\n    width: 100%;\n  }\n\n  .dsux-actions {\n    flex-direction: column;\n    align-items: stretch;\n  }\n\n  .dsux-actions button,\n  .dsux-actions label {\n    width: 100%;\n  }\n  .dsux-comment-controls {\n    align-items: stretch;\n  }\n\n  .dsux-comment-controls label {\n    flex: 1 1 100%;\n    align-items: stretch;\n    flex-direction: column;\n  }\n\n  .dsux-comment-status {\n    margin-left: 0;\n  }\n\n}\n\n@media (max-width: 24rem) {\n  .dsux-panel-header h2 {\n    font-size: 1.08rem;\n  }\n\n  .dsux-tabs button {\n    flex: 1 1 0;\n  }\n\n  .dsux-table th:nth-child(3),\n  .dsux-table td:nth-child(3) {\n    display: none;\n  }\n}\n"; }(typeof window !== "undefined" ? window : globalThis));

(function () {
  "use strict";

  if (typeof window === "undefined") return;

  var SITE_HOST = "derstandard.at";
  var TRACKING_PARAM = /^(?:utm_[^=]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_ga|_gl|pk_campaign|pk_kwd|pk_source|ref|rank|referrer|source|cmpid|campaignid|wt_mc)$/i;

  function isSameSite(hostname) {
    var host = String(hostname || "").toLowerCase().replace(/\.$/, "");
    return host === SITE_HOST || host.slice(-(SITE_HOST.length + 1)) === "." + SITE_HOST;
  }

  function toUrl(value, base) {
    if (value instanceof URL) return new URL(value.href);
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      return new URL(value.trim(), base || undefined);
    } catch (_) {
      return null;
    }
  }

  function canonicalFromUrl(value) {
    var parsed = toUrl(value);
    if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:") || !isSameSite(parsed.hostname)) {
      return "";
    }

    parsed.protocol = "https:";
    parsed.hostname = SITE_HOST;
    parsed.username = "";
    parsed.password = "";
    parsed.port = "";
    parsed.hash = "";
    var params = [];
    parsed.searchParams.forEach(function (paramValue, paramName) {
      if (!TRACKING_PARAM.test(paramName)) params.push([paramName, paramValue]);
    });
    parsed.search = "";
    params.forEach(function (entry) {
      parsed.searchParams.append(entry[0], entry[1]);
    });
    return parsed.href;
  }

  function articlePath(pathname) {
    var path = String(pathname || "");
    return /^\/story\/[^/?#]+(?:\/[^?#]*)?$/i.test(path) || /^\/jetzt\/livebericht\/[^/?#]+(?:\/[^?#]*)?$/i.test(path);
  }

  function isArticleUrl(value) {
    var canonical = canonicalFromUrl(value);
    if (!canonical) return false;
    var parsed = toUrl(canonical);
    return !!parsed && articlePath(parsed.pathname);
  }

  function canonicalUrl(value) {
    return canonicalFromUrl(value);
  }

  function articleKey(value) {
    var canonical = canonicalFromUrl(value);
    var parsed = canonical ? toUrl(canonical) : null;
    if (!parsed || !articlePath(parsed.pathname)) return "";
    parsed.search = "";
    return parsed.href;
  }


  function textOf(node) {
    if (!node) return "";
    return String(node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isVisible(node) {
    if (!node || node.nodeType !== 1 || node.hidden || node.getAttribute("aria-hidden") === "true") return false;
    var view = node.ownerDocument && node.ownerDocument.defaultView;
    if (view && typeof view.getComputedStyle === "function") {
      var style = view.getComputedStyle(node);
      if (style && (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0")) return false;
    }
    return true;
  }

  function parseCommentCount(value) {
    var node = value && typeof value === "object" && value.nodeType === 1 ? value : null;
    if (node && !isVisible(node)) return null;
    if (typeof value === "number") return Number.isFinite(value) && value >= 0 && Math.floor(value) === value ? value : null;
    var raw = node ? textOf(node) : typeof value === "string" ? value : "";
    if (!raw) return null;
    var match = raw.match(/\d[\d\s.,]*/);
    if (!match) return null;
    var token = match[0].trim();
    var following = raw.slice((match.index || 0) + match[0].length);
    if (/^[.,]\d/.test(following)) return null;
    if (/[.,\s]/.test(token) && !/^\d+$/.test(token) && !/^\d{1,3}(?:[.,]\d{3})+$/.test(token) && !/^\d{1,3}(?:\s\d{3})+$/.test(token)) return null;
    var digits = token.replace(/[^0-9]/g, "");
    if (!digits) return null;
    var parsed = Number(digits);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  function first(root, selector) {
    return root && typeof root.querySelector === "function" ? root.querySelector(selector) : null;
  }


  function pageUrl(doc) {
    var canonical = first(doc, 'link[rel~="canonical"]');
    var original = first(doc, "meta[data-original-url]");
    var base = (doc && (doc.baseURI || doc.URL)) || (window.location && window.location.href);
    var candidates = [
      canonical && canonical.getAttribute("href"),
      original && (original.getAttribute("content") || original.getAttribute("data-original-url")),
      doc && doc.URL,
      window.location && window.location.href
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = toUrl(candidates[i], base);
      var key = articleKey(candidate && candidate.href);
      if (key) return key;
    }
    return "";
  }

  function record(key, title, subtitle, section, publishedAt, commentCount, source) {
    return {
      key: key,
      url: key,
      title: title || "",
      subtitle: subtitle || "",
      section: section || "",
      publishedAt: publishedAt || "",
      commentCount: commentCount == null ? null : commentCount,
      source: source || ""
    };
  }

  function extractPageArticle(doc) {
    if (!doc || typeof doc.querySelector !== "function") return null;
    var key = pageUrl(doc);
    var article = first(doc, "article.story-article");
    if (!key || !article) return null;

    var title = textOf(first(article, "h1.article-title"));
    var subtitle = textOf(first(article, ".article-subtitle"));
    var section = textOf(first(article, "h2.article-kicker"));
    var dateNode = first(article, ".article-pubdate");
    var timestampNode = first(dateNode, "dst-rl-timestamp[date]");
    var publishedAt = timestampNode
      ? String(timestampNode.getAttribute("date") || "").trim()
      : dateNode
        ? String(dateNode.getAttribute("date") || textOf(dateNode)).trim()
        : "";
    var countNode = first(article, ".js-forum-postingcount, .article-postingcount, .teaser-postingcount") || first(doc, ".js-forum-postingcount, .article-postingcount, .teaser-postingcount");
    return record(key, title, subtitle, section, publishedAt, parseCommentCount(countNode), "page");
  }

  function isStoryArticle(node) {
    return localName(node) === "article" && /(^|\s)story-article(?:\s|$)/i.test(String(node.getAttribute && node.getAttribute("class") || ""));
  }

  function isInsideStoryArticle(node) {
    var current = node && node.parentElement;
    while (current) {
      if (isStoryArticle(current)) return true;
      current = current.parentElement;
    }
    return false;
  }

  function nearestCard(anchor) {
    if (!anchor) return null;
    if (typeof anchor.closest === "function") {
      var card = anchor.closest('[aria-labelledby], [class*="teaser"], li');
      if (card) return card;
      card = anchor.closest("article");
      if (card) return card;
    }
    return anchor.parentElement || anchor;
  }

  function findLabelledTitle(node, root) {
    var labels = node && node.getAttribute && node.getAttribute("aria-labelledby");
    if (!labels) return "";
    var doc = (node.ownerDocument || root) && (node.ownerDocument || root);
    if (!doc || typeof doc.getElementById !== "function") return "";
    var result = [];
    labels.split(/\s+/).forEach(function (id) {
      if (!id) return;
      var labelled = doc.getElementById(id);
      if (labelled) result.push(textOf(labelled));
    });
    return result.join(" ").trim();
  }

  function cardTitle(anchor, card, root) {
    var title = findLabelledTitle(anchor, root);
    if (title) return title;
    title = textOf(first(card, "h3.teaser-title"));
    if (title) return title;
    title = findLabelledTitle(card, root);
    if (title) return title;
    return String(anchor.getAttribute("aria-label") || anchor.getAttribute("title") || "").trim();
  }

  function extractArticles(root) {
    if (!root || typeof root.querySelectorAll !== "function") return [];
    var anchors = [];
    if (root.nodeType === 1 && String(root.tagName || "").toLowerCase() === "a" && root.getAttribute("href")) anchors.push(root);
    var found = root.querySelectorAll("a[href]");
    for (var i = 0; i < found.length; i += 1) anchors.push(found[i]);

    var articles = [];
    var seen = Object.create(null);
    anchors.forEach(function (anchor) {
      if (isInsideStoryArticle(anchor)) return;
      var href = anchor.href || anchor.getAttribute("href");
      var base = (anchor.ownerDocument && (anchor.ownerDocument.baseURI || anchor.ownerDocument.URL)) || root.baseURI || root.URL;
      var resolved = toUrl(href, base);
      var key = articleKey(resolved && resolved.href);
      if (!key || seen[key]) return;
      var card = nearestCard(anchor);
      var title = cardTitle(anchor, card, root);
      var dateNode = first(card, "dst-rl-timestamp[date]");
      var countNode = first(card, ".js-forum-postingcount, .article-postingcount, .teaser-postingcount");
      var section = String((card && (card.getAttribute("data-section") || card.getAttribute("data-ressort"))) || "").trim();
      seen[key] = true;
      articles.push(record(key, title, "", section, dateNode ? String(dateNode.getAttribute("date") || "").trim() : "", parseCommentCount(countNode), "card"));
    });
    return articles;
  }

  function localName(node) {
    return String(node && (node.localName || node.nodeName) || "").split(":").pop().toLowerCase();
  }

  function childByName(node, names) {
    if (!node) return null;
    var wanted = Object.create(null);
    names.forEach(function (name) { wanted[name] = true; });
    for (var child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && wanted[localName(child)]) return child;
    }
    var descendants = node.getElementsByTagName ? node.getElementsByTagName("*") : [];
    for (var i = 0; i < descendants.length; i += 1) {
      if (wanted[localName(descendants[i])]) return descendants[i];
    }
    return null;
  }

  function childText(node, names) {
    return textOf(childByName(node, names));
  }

  function extractRss(text, feedUrl) {
    if (typeof text !== "string" || !text.trim()) return [];
    var Parser = window.DOMParser;
    if (typeof Parser !== "function") return [];
    var xml;
    try {
      xml = new Parser().parseFromString(text, "application/xml");
    } catch (_) {
      return [];
    }
    if (!xml || typeof xml.getElementsByTagName !== "function") return [];
    var nodes = xml.getElementsByTagName("item");
    if (!nodes.length) {
      var all = xml.getElementsByTagName("*");
      var items = [];
      for (var i = 0; i < all.length; i += 1) if (localName(all[i]) === "item") items.push(all[i]);
      nodes = items;
    }
    var output = [];
    var seen = Object.create(null);
    for (var index = 0; index < nodes.length; index += 1) {
      var item = nodes[index];
      var linkNode = childByName(item, ["link"]);
      var href = linkNode && (linkNode.getAttribute("href") || textOf(linkNode));
      if (!href) {
        var guid = childByName(item, ["guid"]);
        href = guid && textOf(guid);
      }
      var key = articleKey(toUrl(href, feedUrl || "") || href);
      if (!key || seen[key]) continue;
      var title = childText(item, ["title"]);
      var date = childText(item, ["pubdate", "date", "published", "updated"]);
      seen[key] = true;
      output.push(record(key, title, "", "", date, null, "rss"));
    }
    return output;
  }

  window.DSUXSite = {
    isArticleUrl: isArticleUrl,
    canonicalUrl: canonicalUrl,
    articleKey: articleKey,
    extractPageArticle: extractPageArticle,
    extractArticles: extractArticles,
    extractRss: extractRss,
    parseCommentCount: parseCommentCount
  };
}());


(function (root) {
  "use strict";

  var STORAGE_KEY = "derstandard-enhancer-state";
  var LEGACY_KEYS = ["dsux-state-v1", "derstandard-userscript-state"];
  var MAX_ENTRIES = 500;
  var MAX_URL_LENGTH = 2048;
  var MAX_TITLE_LENGTH = 500;
  var MAX_PREF_LENGTH = 40;
  var COMMENT_MODES = { native: true, positive: true, negative: true, total: true };
  var DISCOVERY_SORTS = { date: true, comments: true };
  var lastClock = 0;

  function emptyMap() {
    return Object.create(null);
  }

  function emptyState() {
    return {
      version: 2,
      visited: emptyMap(),
      saved: emptyMap(),
      ignored: emptyMap(),
      progress: emptyMap(),
      prefs: {
        commentSort: "native",
        discoverySort: "",
        discoverySortAscending: false
      }
    };
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasOwn(value, key) {
    return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);
  }

  function rawText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function text(value, limit) {
    return rawText(value).slice(0, limit);
  }

  function finiteNumber(value) {
    return typeof value === "number" && isFinite(value) ? value : null;
  }

  function progressValue(value) {
    var number = finiteNumber(value);
    if (number === null) return null;
    return Math.max(0, Math.min(1, number));
  }

  function timestamp(value) {
    var number = finiteNumber(value);
    return number === null || number < 0 ? null : number;
  }

  function noteTime(value) {
    if (value !== null && value > lastClock) lastClock = value;
  }

  function now() {
    var value = finiteNumber(Date.now());
    if (value === null || value < 0) value = 0;
    if (value <= lastClock) value = lastClock + 1;
    lastClock = value;
    return value;
  }

  function storage() {
    try {
      if (root && root.localStorage) return root.localStorage;
    } catch (error) {
      // localStorage may be disabled or inaccessible.
    }
    return null;
  }

  function urlConstructor() {
    try {
      if (root && typeof root.URL === "function") return root.URL;
    } catch (error) {
      // URL may be unavailable on a test host.
    }
    try {
      if (typeof URL === "function") return URL;
    } catch (error) {
      // URL may be unavailable in an old browser.
    }
    return null;
  }

  function isArticleHost(hostname) {
    var host = String(hostname || "").toLowerCase().replace(/\.$/, "");
    return host === "derstandard.at" || host.slice(-(".derstandard.at".length)) === ".derstandard.at";
  }

  function isArticlePath(pathname) {
    var path = String(pathname || "");
    return /^\/story\/[^/?#]+(?:\/[^?#]*)?$/i.test(path) || /^\/jetzt\/livebericht\/[^/?#]+(?:\/[^/?#]*)?$/i.test(path);
  }

  function normalizeCanonical(value, requireArticlePath) {
    var raw = rawText(value);
    if (!raw) return "";
    var Constructor = urlConstructor();
    if (Constructor) {
      try {
        var parsed = new Constructor(raw);
        if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !isArticleHost(parsed.hostname) || (requireArticlePath && !isArticlePath(parsed.pathname))) return "";
        parsed.protocol = "https:";
        parsed.hostname = "derstandard.at";
        parsed.username = "";
        parsed.password = "";
        parsed.port = "";
        parsed.search = "";
        parsed.hash = "";
        var canonical = parsed.href;
        return canonical.length <= MAX_URL_LENGTH ? canonical : "";
      } catch (error) {
        return "";
      }
    }
    var noQuery = raw.split("#")[0].split("?")[0];
    if (!/^https?:\/\/([^/?#]+)(\/[^?#]*)?$/i.test(noQuery)) return "";
    if (noQuery.slice(0, 7).toLowerCase() === "http://") noQuery = "https://" + noQuery.slice(7);
    var hostMatch = noQuery.match(/^https:\/\/([^/?#]+)(\/.*)?$/i);
    if (!hostMatch || !isArticleHost(hostMatch[1]) || (requireArticlePath && !isArticlePath(hostMatch[2] || "/"))) return "";
    noQuery = "https://derstandard.at" + (hostMatch[2] || "/");
    return noQuery.length <= MAX_URL_LENGTH ? noQuery : "";
  }

  function keyFor(value) {
    var candidate = isRecord(value) ? value.key || value.url : value;
    if (typeof candidate !== "string" || !rawText(candidate)) return "";
    var canonical = "";
    var site = null;
    var hasArticleKey = false;
    try {
      site = root && root.DSUXSite;
      hasArticleKey = !!(site && typeof site.articleKey === "function");
      if (hasArticleKey) canonical = site.articleKey(rawText(candidate));
    } catch (error) {
      canonical = "";
    }
    if (hasArticleKey) {
      if (typeof canonical !== "string" || !rawText(canonical)) return "";
      return normalizeCanonical(canonical, false);
    }
    return normalizeCanonical(candidate, true);
  }


  function mapEntries(value) {
    if (Array.isArray(value)) {
      return value.map(function (entry) {
        if (Array.isArray(entry) && entry.length > 1) return [entry[0], entry[1]];
        return [isRecord(entry) ? entry.key || entry.url : "", entry];
      });
    }
    if (!isRecord(value)) return [];
    return Object.keys(value).map(function (key) { return [key, value[key]]; });
  }

  function sortAndBound(map, timeField) {
    var keys = Object.keys(map);
    keys.sort(function (left, right) {
      var leftTime = map[left][timeField];
      var rightTime = map[right][timeField];
      if (rightTime !== leftTime) return rightTime - leftTime;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    var bounded = emptyMap();
    keys.slice(0, MAX_ENTRIES).forEach(function (key) { bounded[key] = map[key]; });
    return bounded;
  }

  function putRecord(map, ties, key, value, timeField, tie) {
    var existing = map[key];
    if (!existing || value[timeField] > existing[timeField] || (value[timeField] === existing[timeField] && tie < ties[key])) {
      map[key] = value;
      ties[key] = tie;
      noteTime(value[timeField]);
    }
  }

  function progressCandidate(item, fallbackTime) {
    var value = null;
    var updatedAt = null;
    if (typeof item === "number") {
      value = progressValue(item);
    } else if (isRecord(item)) {
      if (hasOwn(item, "value")) value = progressValue(item.value);
      else if (hasOwn(item, "progress")) value = progressValue(item.progress);
      updatedAt = timestamp(item.updatedAt);
      if (updatedAt === null) updatedAt = timestamp(item.progressUpdatedAt);
      if (updatedAt === null) updatedAt = timestamp(item.visitedAt);
    }
    if (value === null) return null;
    if (updatedAt === null) updatedAt = fallbackTime === null || fallbackTime === undefined ? 0 : fallbackTime;
    return { value: value, updatedAt: updatedAt };
  }

  function putProgress(map, ties, key, value, tie) {
    var existing = map[key];
    if (!existing || value.updatedAt > existing.updatedAt || (value.updatedAt === existing.updatedAt && tie < ties[key])) {
      map[key] = value;
      ties[key] = tie;
      noteTime(value.updatedAt);
    }
  }

  function sourceState(input) {
    if (!isRecord(input)) return null;
    var known = hasOwn(input, "version") || hasOwn(input, "visited") || hasOwn(input, "saved") || hasOwn(input, "ignored") || hasOwn(input, "progress") || hasOwn(input, "readingProgress") || hasOwn(input, "history") || hasOwn(input, "bookmarks") || hasOwn(input, "prefs") || hasOwn(input, "preferences");
    if (!known && isRecord(input.state)) return input.state;
    return input;
  }

  function sanitizeState(input) {
    var source = sourceState(input) || emptyState();
    var output = emptyState();
    var visited = emptyMap();
    var visitedTies = emptyMap();
    var visitedTimes = emptyMap();
    var saved = emptyMap();
    var savedTies = emptyMap();
    var ignored = emptyMap();
    var ignoredTies = emptyMap();
    var progress = emptyMap();
    var progressTies = emptyMap();

    mapEntries(hasOwn(source, "visited") ? source.visited : source.history).forEach(function (pair) {
      var item = pair[1];
      var object = isRecord(item) ? item : null;
      var key = keyFor(pair[0]);
      if (!key && object) key = keyFor(object.key || object.url);
      if (!key) return;
      var visitedAt = object ? timestamp(object.visitedAt) : null;
      if (visitedAt === null) visitedAt = 0;
      var title = object ? text(object.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH);
      var record = { url: key, title: title, visitedAt: visitedAt };
      var tie = rawText(pair[0]) + "\u0000" + title + "\u0000" + key;
      putRecord(visited, visitedTies, key, record, "visitedAt", tie);
      if (visitedTimes[key] === undefined || visitedAt > visitedTimes[key]) visitedTimes[key] = visitedAt;
    });

    mapEntries(hasOwn(source, "saved") ? source.saved : source.bookmarks).forEach(function (pair) {
      var item = pair[1];
      var object = isRecord(item) ? item : null;
      var key = keyFor(pair[0]);
      if (!key && object) key = keyFor(object.key || object.url);
      if (!key) return;
      var savedAt = object ? timestamp(object.savedAt) : null;
      if (savedAt === null) savedAt = 0;
      var title = object ? text(object.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH);
      var record = { url: key, title: title, savedAt: savedAt };
      var tie = rawText(pair[0]) + "\u0000" + title + "\u0000" + key;
      putRecord(saved, savedTies, key, record, "savedAt", tie);
    });

    mapEntries(source.ignored).forEach(function (pair) {
      var item = pair[1];
      var object = isRecord(item) ? item : null;
      var key = keyFor(pair[0]);
      if (!key && object) key = keyFor(object.key || object.url);
      if (!key) return;
      var ignoredAt = object ? timestamp(object.ignoredAt) : null;
      if (ignoredAt === null) ignoredAt = 0;
      var title = object ? text(object.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH);
      var record = { url: key, title: title, ignoredAt: ignoredAt };
      var tie = rawText(pair[0]) + "\u0000" + title + "\u0000" + key;
      putRecord(ignored, ignoredTies, key, record, "ignoredAt", tie);
    });

    function collectProgress(raw, kind) {
      mapEntries(raw).forEach(function (pair) {
        var key = keyFor(pair[0]);
        var object = isRecord(pair[1]) ? pair[1] : null;
        if (!key && object) key = keyFor(object.key || object.url);
        if (!key) return;
        var fallbackTime = visitedTimes[key] === undefined ? 0 : visitedTimes[key];
        var candidate = progressCandidate(pair[1], fallbackTime);
        if (!candidate) return;
        var tie = rawText(pair[0]) + "\u0000" + kind + "\u0000" + String(candidate.value);
        putProgress(progress, progressTies, key, candidate, tie);
      });
    }

    collectProgress(hasOwn(source, "progress") ? source.progress : null, "progress");
    collectProgress(source.readingProgress, "readingProgress");

    mapEntries(hasOwn(source, "visited") ? source.visited : source.history).forEach(function (pair) {
      var object = isRecord(pair[1]) ? pair[1] : null;
      if (!object) return;
      var key = keyFor(pair[0]);
      if (!key) key = keyFor(object.key || object.url);
      if (!key) return;
      var nestedTime = timestamp(object.visitedAt);
      var candidate = progressCandidate(object.progress, nestedTime === null ? 0 : nestedTime);
      if (!candidate) return;
      var tie = rawText(pair[0]) + "\u0000visited\u0000" + String(candidate.value);
      putProgress(progress, progressTies, key, candidate, tie);
    });

    output.visited = sortAndBound(visited, "visitedAt");
    output.saved = sortAndBound(saved, "savedAt");
    output.ignored = sortAndBound(ignored, "ignoredAt");
    output.progress = sortAndBound(progress, "updatedAt");

    var prefs = isRecord(source.prefs) ? source.prefs : isRecord(source.preferences) ? source.preferences : null;
    if (prefs) {
      var commentSort = text(prefs.commentSort, MAX_PREF_LENGTH);
      if (COMMENT_MODES[commentSort]) output.prefs.commentSort = commentSort;
      var discoverySort = text(prefs.discoverySort, MAX_PREF_LENGTH);
      if (discoverySort === "" || DISCOVERY_SORTS[discoverySort]) output.prefs.discoverySort = discoverySort;
      if (typeof prefs.discoverySortAscending === "boolean") output.prefs.discoverySortAscending = prefs.discoverySortAscending;
    }
    return output;
  }

  function touchStateTimes(value) {
    var maps = [value && value.visited, value && value.saved, value && value.ignored];
    var fields = ["visitedAt", "savedAt", "ignoredAt"];
    maps.forEach(function (map, index) {
      if (!isRecord(map)) return;
      Object.keys(map).forEach(function (key) { noteTime(timestamp(map[key] && map[key][fields[index]])); });
    });
    if (value && isRecord(value.progress)) Object.keys(value.progress).forEach(function (key) { noteTime(timestamp(value.progress[key] && value.progress[key].updatedAt)); });
  }

  function cloneState(value) {
    return sanitizeState(value);
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableStringify(value[key]);
    }).join(",") + "}";
  }

  function statesEqual(left, right) {
    return stableStringify(left) === stableStringify(right);
  }

  function futureVersion(input) {
    var source = sourceState(input);
    if (!source || !hasOwn(source, "version")) return false;
    return typeof source.version !== "number" || !isFinite(source.version) || source.version > 2 || source.version < 1;
  }

  function writeState(store, value) {
    if (!store) return false;
    var serialized = stableStringify(value);
    try {
      store.setItem(STORAGE_KEY, serialized);
      return store.getItem(STORAGE_KEY) === serialized;
    } catch (error) {
      return false;
    }
  }

  function readDurable() {
    var store = storage();
    if (!store) return { ok: false, state: null, error: "storage-unavailable" };
    var currentRaw = null;
    var sourceRaw = null;
    var sourceKey = STORAGE_KEY;
    try {
      currentRaw = store.getItem(STORAGE_KEY);
      sourceRaw = currentRaw;
      if (sourceRaw === null) {
        for (var index = 0; index < LEGACY_KEYS.length; index += 1) {
          sourceRaw = store.getItem(LEGACY_KEYS[index]);
          if (sourceRaw !== null) {
            sourceKey = LEGACY_KEYS[index];
            break;
          }
        }
      }
    } catch (error) {
      return { ok: false, state: null, error: "storage-read-failed" };
    }
    if (sourceRaw === null) return { ok: true, state: emptyState() };

    var parsed = null;
    try { parsed = JSON.parse(sourceRaw); } catch (error) { parsed = null; }
    if (futureVersion(parsed)) return { ok: false, state: null, error: "unsupported-version" };
    var normalized = sanitizeState(parsed);
    var serialized = stableStringify(normalized);
    var needsMigration = sourceKey !== STORAGE_KEY || sourceRaw !== serialized;
    if (needsMigration) {
      if (!writeState(store, normalized)) return { ok: false, state: null, error: "storage-write-failed" };
      LEGACY_KEYS.forEach(function (legacyKey) {
        try {
          if (typeof store.removeItem === "function") store.removeItem(legacyKey);
        } catch (error) {
          // A successful current-key write is the durable migration boundary.
        }
      });
    }
    touchStateTimes(normalized);
    return { ok: true, state: normalized };
  }

  var state = emptyState();
  var lastDurableState = cloneState(state);
  var loaded = false;
  var listeners = [];
  var storageListenerAttached = false;

  function notify() {
    listeners.slice().forEach(function (listener) {
      var snapshot = cloneState(state);
      try { listener(snapshot); } catch (error) { /* subscriber errors are isolated */ }
    });
  }

  function load() {
    var result = readDurable();
    if (result.ok) {
      state = cloneState(result.state);
      lastDurableState = cloneState(state);
      loaded = true;
    } else if (!loaded) {
      state = cloneState(lastDurableState);
      loaded = true;
    }
    return cloneState(state);
  }

  function ensureLoaded() {
    if (!loaded) load();
  }

  function result(ok, changed, error) {
    return {
      ok: ok,
      changed: changed,
      state: cloneState(state),
      error: error || null
    };
  }

  function beginMutation() {
    var previous = state;
    var durable = readDurable();
    if (!durable.ok) return { ok: false, error: durable.error, externalChanged: false };
    state = cloneState(durable.state);
    lastDurableState = cloneState(state);
    loaded = true;
    return { ok: true, externalChanged: !statesEqual(previous, state) };
  }

  function failMutation(context, error) {
    if (context && context.externalChanged) notify();
    return result(false, false, error);
  }

  function runMutation(validate, apply) {
    var context = beginMutation();
    if (!context.ok) return result(false, false, context.error);
    if (validate && !validate()) return failMutation(context, "invalid-input");
    var next = cloneState(state);
    apply(next);
    next = sanitizeState(next);
    var changed = !statesEqual(next, state);
    if (!changed) {
      if (context.externalChanged) notify();
      return result(true, false, null);
    }
    if (!writeState(storage(), next)) return failMutation(context, "storage-write-failed");
    state = cloneState(next);
    lastDurableState = cloneState(state);
    touchStateTimes(state);
    notify();
    return result(true, true, null);
  }

  function setPreferences(patch) {
    var keys = ["commentSort", "discoverySort", "discoverySortAscending"];
    return runMutation(function () {
      if (!isRecord(patch)) return false;
      var found = false;
      for (var index = 0; index < keys.length; index += 1) if (hasOwn(patch, keys[index])) found = true;
      return found;
    }, function (next) {
      var commentSort = text(patch.commentSort, MAX_PREF_LENGTH);
      var discoverySort = text(patch.discoverySort, MAX_PREF_LENGTH);
      if (hasOwn(patch, "commentSort") && COMMENT_MODES[commentSort]) next.prefs.commentSort = commentSort;
      if (hasOwn(patch, "discoverySort") && (discoverySort === "" || DISCOVERY_SORTS[discoverySort])) next.prefs.discoverySort = discoverySort;
      if (hasOwn(patch, "discoverySortAscending") && typeof patch.discoverySortAscending === "boolean") next.prefs.discoverySortAscending = patch.discoverySortAscending;
    });
  }

  function markVisited(url, title) {
    var key = keyFor(url);
    return runMutation(function () { return !!key; }, function (next) {
      var current = next.visited[key];
      next.visited[key] = {
        url: key,
        title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : current ? current.title : "",
        visitedAt: now()
      };
    });
  }

  function setProgress(url, value) {
    var key = keyFor(url);
    var progress = progressValue(value);
    return runMutation(function () { return !!key && progress !== null; }, function (next) {
      next.progress[key] = { value: progress, updatedAt: now() };
    });
  }

  function toggleSaved(url, title) {
    var key = keyFor(url);
    return runMutation(function () { return !!key; }, function (next) {
      if (next.saved[key]) delete next.saved[key];
      else next.saved[key] = { url: key, title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : "", savedAt: now() };
    });
  }

  function toggleIgnored(url, title) {
    var key = keyFor(url);
    return runMutation(function () { return !!key; }, function (next) {
      if (next.ignored[key]) delete next.ignored[key];
      else next.ignored[key] = { url: key, title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : "", ignoredAt: now() };
    });
  }

  function clearVisited() {
    return runMutation(null, function (next) { next.visited = emptyMap(); });
  }

  function importSummary(value) {
    return {
      visited: Object.keys(value.visited).length,
      saved: Object.keys(value.saved).length,
      ignored: Object.keys(value.ignored).length,
      progress: Object.keys(value.progress).length
    };
  }

  function hasMeaningfulData(value) {
    return Object.keys(value.visited).length > 0 || Object.keys(value.saved).length > 0 || Object.keys(value.ignored).length > 0 || Object.keys(value.progress).length > 0 || value.prefs.commentSort !== "native" || value.prefs.discoverySort !== "" || value.prefs.discoverySortAscending !== false;
  }

  function prepareImport(json) {
    var parsed = json;
    if (typeof json === "string") {
      try { parsed = JSON.parse(json); } catch (error) { return { ok: false, error: "invalid-json", state: null, summary: null }; }
    }
    if (!isRecord(parsed)) return { ok: false, error: "invalid-import", state: null, summary: null };
    var source = sourceState(parsed);
    if (!source || futureVersion(source)) return { ok: false, error: "unsupported-version", state: null, summary: null };
    var recognized = hasOwn(source, "version") || hasOwn(source, "visited") || hasOwn(source, "saved") || hasOwn(source, "ignored") || hasOwn(source, "progress") || hasOwn(source, "readingProgress") || hasOwn(source, "history") || hasOwn(source, "bookmarks") || hasOwn(source, "prefs") || hasOwn(source, "preferences");
    if (!recognized) return { ok: false, error: "unrelated-import", state: null, summary: null };
    var normalized = sanitizeState(source);
    if (!hasMeaningfulData(normalized)) return { ok: false, error: "empty-import", state: null, summary: null };
    return { ok: true, error: null, state: cloneState(normalized), summary: importSummary(normalized) };
  }

  function validPrepared(value) {
    return isRecord(value) && value.version === 2 && isRecord(value.visited) && isRecord(value.saved) && isRecord(value.ignored) && isRecord(value.progress) && isRecord(value.prefs) && hasMeaningfulData(sanitizeState(value));
  }

  function importPrepared(prepared) {
    var context = beginMutation();
    if (!context.ok) return result(false, false, context.error);
    if (!validPrepared(prepared)) return failMutation(context, "invalid-prepared-import");
    var next = sanitizeState(prepared);
    if (statesEqual(next, state)) {
      if (context.externalChanged) notify();
      return result(true, false, null);
    }
    if (!writeState(storage(), next)) return failMutation(context, "storage-write-failed");
    state = cloneState(next);
    lastDurableState = cloneState(state);
    touchStateTimes(state);
    notify();
    return result(true, true, null);
  }

  function exportJson() {
    ensureLoaded();
    return stableStringify(cloneState(state));
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return function () {};
    listeners.push(callback);
    return function unsubscribe() {
      var index = listeners.indexOf(callback);
      if (index !== -1) listeners.splice(index, 1);
    };
  }

  function onStorageEvent(event) {
    if (!event || event.key !== STORAGE_KEY) return;
    var next;
    if (event.newValue === null) next = emptyState();
    else {
      if (typeof event.newValue !== "string") return;
      var parsed;
      try { parsed = JSON.parse(event.newValue); } catch (error) { return; }
      if (futureVersion(parsed)) return;
      next = sanitizeState(parsed);
    }
    if (statesEqual(next, state)) return;
    state = cloneState(next);
    lastDurableState = cloneState(state);
    loaded = true;
    touchStateTimes(state);
    notify();
  }

  function disconnect() {
    if (!storageListenerAttached) return;
    try {
      if (root && typeof root.removeEventListener === "function") root.removeEventListener("storage", onStorageEvent);
    } catch (error) {
      // Listener removal is best effort on partial test hosts.
    }
    storageListenerAttached = false;
  }

  if (root && typeof root.addEventListener === "function") {
    try {
      root.addEventListener("storage", onStorageEvent);
      storageListenerAttached = true;
    } catch (error) {
      storageListenerAttached = false;
    }
  }

  root.DSUXStorage = {
    load: load,
    setPreferences: setPreferences,
    markVisited: markVisited,
    setProgress: setProgress,
    toggleSaved: toggleSaved,
    toggleIgnored: toggleIgnored,
    clearVisited: clearVisited,
    prepareImport: prepareImport,
    importPrepared: importPrepared,
    exportJson: exportJson,
    subscribe: subscribe,
    disconnect: disconnect
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);


(function (global) {
  'use strict';

  if (!global) {
    return;
  }

  var mode = 'native';
  var changeHandler = null;
  var documentObserver = null;
  var shadowObservers = [];
  var retryTimer = null;
  var retryAttempts = 0;
  var currentRecord = null;
  var lastNotification = null;
  var active = false;

  function normalizeMode(value) {
    return value === 'positive' || value === 'negative' || value === 'total'
      ? value
      : 'native';
  }

  function notify(count, available) {
    var payload = {
      count: count,
      mode: mode,
      available: available
    };
    var signature = String(count) + '|' + String(mode) + '|' + String(available);
    if (signature === lastNotification) {
      return;
    }
    lastNotification = signature;
    if (typeof changeHandler === 'function') {
      try {
        changeHandler(payload);
      } catch (_) {
        // A consumer callback must not interfere with comment observation.
      }
    }
  }

  function parseRating(node, attribute) {
    if (!node || typeof node.getAttribute !== 'function') {
      return 0;
    }
    var raw;
    try {
      raw = node.getAttribute(attribute);
    } catch (_) {
      return 0;
    }
    if (typeof raw !== 'string') {
      return 0;
    }
    raw = raw.trim();
    if (!/^[+]?\d+$/.test(raw)) {
      return 0;
    }
    var value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  function visible(node) {
    if (!node || typeof node.getAttribute !== 'function') {
      return false;
    }
    try {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      var style = node.getAttribute('style') || '';
      if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(style)) {
        return false;
      }
    } catch (_) {
      return false;
    }
    return true;
  }

  function visibleRating(node, attribute) {
    if (!node) {
      return null;
    }
    var logs = [];
    try {
      if (typeof node.querySelectorAll === 'function') {
        logs = Array.prototype.slice.call(node.querySelectorAll('dst-posting--ratinglog'));
      } else if (typeof node.querySelector === 'function') {
        var log = node.querySelector('dst-posting--ratinglog');
        if (log) {
          logs = [log];
        }
      }
    } catch (_) {
      return null;
    }
    for (var i = 0; i < logs.length; i += 1) {
      if (!visible(logs[i])) {
        continue;
      }
      var candidates = [logs[i]];
      try {
        var descendants = logs[i].querySelectorAll('[' + attribute + ']');
        for (var j = 0; j < descendants.length; j += 1) {
          candidates.push(descendants[j]);
        }
      } catch (_) {
        // The rating log itself is still a valid candidate.
      }
      for (var k = 0; k < candidates.length; k += 1) {
        if (!visible(candidates[k])) {
          continue;
        }
        var raw = candidates[k].getAttribute(attribute);
        if (typeof raw === 'string' && /^[+]?\d+$/.test(raw.trim())) {
          var value = Number(raw.trim());
          if (Number.isFinite(value)) {
            return value;
          }
        }
      }
    }
    return null;
  }

  function ratings(node) {
    var positive = visibleRating(node, 'positiveratings');
    var negative = visibleRating(node, 'negativeratings');
    if (positive === null) {
      positive = parseRating(node, 'positiveratings');
    }
    if (negative === null) {
      negative = parseRating(node, 'negativeratings');
    }
    return {
      positive: positive,
      negative: negative,
      total: positive + negative
    };
  }

  function findMain(root) {
    if (!root || typeof root.querySelector !== 'function') {
      return null;
    }
    try {
      return root.querySelector('section#forum main.forum--main');
    } catch (_) {
      return null;
    }
  }

  function discoverMain() {
    var doc = global.document;
    if (!doc || typeof doc.querySelectorAll !== 'function') {
      return null;
    }

    var hosts;
    try {
      hosts = doc.querySelectorAll('dst-forum');
    } catch (_) {
      return null;
    }

    for (var i = 0; i < hosts.length; i += 1) {
      var shadow;
      try {
        shadow = hosts[i].shadowRoot;
      } catch (_) {
        shadow = null;
      }
      if (!shadow) {
        continue;
      }
      attachShadowObserver(shadow);
      var main = findMain(shadow);
      if (main) {
        return main;
      }
    }
    return null;
  }

  function attachShadowObserver(shadow) {
    for (var i = 0; i < shadowObservers.length; i += 1) {
      if (shadowObservers[i].shadow === shadow) {
        return;
      }
    }

    if (typeof global.MutationObserver !== 'function') {
      return;
    }

    var observer;
    try {
      observer = new global.MutationObserver(function () {
        refresh();
      });
      observer.observe(shadow, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['positiveratings', 'negativeratings', 'style', 'hidden', 'aria-hidden']
      });
      shadowObservers.push({ shadow: shadow, observer: observer });
    } catch (_) {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    }
  }

  function collectNodes(main) {
    if (!main || typeof main.querySelectorAll !== 'function') {
      return [];
    }
    try {
      return Array.prototype.slice.call(
        main.querySelectorAll("dst-posting[data-level='0']")
      );
    } catch (_) {
      return [];
    }
  }

  function indexOfNode(nodes, node) {
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i] === node) {
        return i;
      }
    }
    return -1;
  }

  function synchronizeNativeOrder(record, nodes, preserveBaseline) {
    if (mode === 'native' && !preserveBaseline) {
      record.nativeOrder = nodes.slice();
      return;
    }
    var order = record.nativeOrder;
    for (var i = 0; i < nodes.length; i += 1) {
      if (indexOfNode(order, nodes[i]) === -1) {
        order.push(nodes[i]);
      }
    }
  }

  function compareNodes(a, b, sortMode) {
    var ar = ratings(a.node);
    var br = ratings(b.node);
    var av = sortMode === 'positive' ? ar.positive : sortMode === 'negative' ? ar.negative : ar.total;
    var bv = sortMode === 'positive' ? br.positive : sortMode === 'negative' ? br.negative : br.total;
    if (av !== bv) {
      return bv - av;
    }
    var ai = a.nativeIndex < 0 ? Number.MAX_SAFE_INTEGER : a.nativeIndex;
    var bi = b.nativeIndex < 0 ? Number.MAX_SAFE_INTEGER : b.nativeIndex;
    if (ai !== bi) {
      return ai - bi;
    }
    return a.position - b.position;
  }

  function reorderGroup(parent, nodes, desired) {
    var unchanged = true;
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i] !== desired[i]) {
        unchanged = false;
        break;
      }
    }
    if (unchanged || !parent || typeof parent.insertBefore !== 'function') {
      return;
    }

    // Keep non-posting children in their exact slots while replacing the posting slots.
    var children = Array.prototype.slice.call(parent.childNodes || []);
    var postingSet = [];
    for (var j = 0; j < nodes.length; j += 1) {
      postingSet.push(nodes[j]);
    }
    var anchors = [];
    var nextNonPosting = null;
    for (var k = children.length - 1; k >= 0; k -= 1) {
      if (indexOfNode(postingSet, children[k]) === -1) {
        nextNonPosting = children[k];
      } else {
        anchors[k] = nextNonPosting;
      }
    }

    var fragment;
    var doc = global.document;
    if (doc && typeof doc.createDocumentFragment === 'function') {
      fragment = doc.createDocumentFragment();
      for (var m = 0; m < nodes.length; m += 1) {
        fragment.appendChild(nodes[m]);
      }
    } else {
      for (var n = 0; n < nodes.length; n += 1) {
        parent.removeChild(nodes[n]);
      }
    }

    var targetIndex = 0;
    for (var p = 0; p < children.length; p += 1) {
      if (indexOfNode(postingSet, children[p]) !== -1) {
        parent.insertBefore(desired[targetIndex], anchors[p] || null);
        targetIndex += 1;
      }
    }
  }

  function applyOrder(record, nodes, requestedMode) {
    if (!record || !nodes.length) {
      return;
    }

    var orderMode = requestedMode || mode;
    var entries = [];
    for (var i = 0; i < nodes.length; i += 1) {
      entries.push({
        node: nodes[i],
        nativeIndex: indexOfNode(record.nativeOrder, nodes[i]),
        position: i
      });
    }

    var groups = [];
    for (var j = 0; j < entries.length; j += 1) {
      var parent = entries[j].node.parentNode;
      if (!parent) {
        continue;
      }
      var group = null;
      for (var g = 0; g < groups.length; g += 1) {
        if (groups[g].parent === parent) {
          group = groups[g];
          break;
        }
      }
      if (!group) {
        group = { parent: parent, entries: [] };
        groups.push(group);
      }
      group.entries.push(entries[j]);
    }

    for (var h = 0; h < groups.length; h += 1) {
      var groupEntries = groups[h].entries;
      var current = [];
      for (var c = 0; c < groupEntries.length; c += 1) {
        current.push(groupEntries[c].node);
      }
      var desired = groupEntries.slice().sort(function (a, b) {
        if (orderMode === 'native') {
          var ai = a.nativeIndex < 0 ? Number.MAX_SAFE_INTEGER : a.nativeIndex;
          var bi = b.nativeIndex < 0 ? Number.MAX_SAFE_INTEGER : b.nativeIndex;
          return ai - bi || a.position - b.position;
        }
        return compareNodes(a, b, orderMode);
      }).map(function (entry) {
        return entry.node;
      });
      // The selector returns document order, which is the native/current order.
      reorderGroup(groups[h].parent, current, desired);
    }
  }

  function restoreNativeOrder(record) {
    if (!record || !record.main) {
      return;
    }
    applyOrder(record, collectNodes(record.main), 'native');
  }


  function scheduleRetry() {
    if (
      !active ||
      currentRecord ||
      retryTimer !== null ||
      retryAttempts >= 40 ||
      typeof global.setTimeout !== 'function'
    ) {
      return;
    }
    retryAttempts += 1;
    retryTimer = global.setTimeout(function () {
      retryTimer = null;
      refresh();
      if (active && !currentRecord) {
        scheduleRetry();
      }
    }, 250);
  }

  function refresh(preserveBaseline) {
    if (!active) {
      return;
    }
    var main = discoverMain();
    if (main !== (currentRecord && currentRecord.main)) {
      currentRecord = main ? { main: main, nativeOrder: [] } : null;
    }

    if (!currentRecord) {
      notify(0, false);
      scheduleRetry();
      return;
    }

    if (retryTimer !== null && typeof global.clearTimeout === 'function') {
      global.clearTimeout(retryTimer);
      retryTimer = null;
    }
    var nodes = collectNodes(currentRecord.main);
    synchronizeNativeOrder(currentRecord, nodes, preserveBaseline);
    applyOrder(currentRecord, nodes);
    notify(nodes.length, true);
  }

  function init(onChange) {
    disconnect();
    active = true;
    retryAttempts = 0;
    changeHandler = typeof onChange === 'function' ? onChange : null;
    lastNotification = null;
    var doc = global.document;
    if (doc && typeof global.MutationObserver === 'function') {
      try {
        documentObserver = new global.MutationObserver(function () {
          refresh();
        });
        documentObserver.observe(doc.documentElement || doc, {
          childList: true,
          subtree: true
        });
      } catch (_) {
        documentObserver = null;
      }
    }
    refresh();
  }

  function sort(nextMode) {
    var previousMode = mode;
    mode = normalizeMode(nextMode);
    if (active) {
      refresh(mode === 'native' && previousMode !== 'native');
    }
    return mode;
  }

  function currentMode() {
    return mode;
  }

  function disconnect() {
    if (currentRecord) {
      try {
        restoreNativeOrder(currentRecord);
      } catch (_) {
        // A detached or partially torn-down forum must not block cleanup.
      }
    }
    if (documentObserver && typeof documentObserver.disconnect === 'function') {
      documentObserver.disconnect();
    }
    documentObserver = null;
    for (var j = 0; j < shadowObservers.length; j += 1) {
      if (shadowObservers[j].observer && typeof shadowObservers[j].observer.disconnect === 'function') {
        shadowObservers[j].observer.disconnect();
      }
    }
    shadowObservers = [];
    if (retryTimer !== null && typeof global.clearTimeout === 'function') {
      global.clearTimeout(retryTimer);
    }
    retryTimer = null;
    retryAttempts = 0;
    currentRecord = null;
    active = false;
    changeHandler = null;
    lastNotification = null;
  }

  global.DSUXComments = {
    init: init,
    sort: sort,
    currentMode: currentMode,
    disconnect: disconnect
  };
}(typeof window !== 'undefined' ? window : null));


(function (global) {
  "use strict";

  if (!global || !global.document || !global.document.documentElement) return;
  if (global.__DSUXEnhancerController) return;

  var doc = global.document;
  var storage = global.DSUXStorage;
  var site = global.DSUXSite;
  var comments = global.DSUXComments;
  if (!storage || !site || !comments) return;

  global.__DSUXEnhancerController = true;

  var model = {
    activeTab: "discover",
    panelOpen: false,
    snapshot: null,
    routeIdentity: "",
    routeKey: "",
    pageArticle: null,
    pageItems: [],
    resumeKey: "",
    resumeValue: 0,
    resumeEntry: -1,
    query: "",
    filter: "all",
    sort: "",
    sortAscending: false,
    outline: [],
    generation: 0,
    routeEntry: 0,
    markedEntry: 0,
    scanTimer: null,
    progressTimer: null,
    toastTimer: null,
    exportTimer: null,
    exportUrl: null,
    routePollTimer: null,
    observer: null,
    unsubscribe: null,
    commentsActive: false,
    commentsIdentity: "",
    commentAvailable: false,
    commentCount: 0,
    lastError: "",
    destroyed: false
  };

  function own(map, key) {
    return !!(map && key && Object.prototype.hasOwnProperty.call(map, key));
  }

  function text(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }

  function finite(value) {
    return typeof value === "number" && isFinite(value) ? value : null;
  }

  function clamp(value, minimum, maximum) {
    var number = finite(value);
    if (number === null) return minimum;
    return Math.max(minimum, Math.min(maximum, number));
  }

  function percent(value) {
    return Math.round(clamp(value, 0, 1) * 100);
  }

  function dateValue(value) {
    var parsed = Date.parse(value || "");
    return isNaN(parsed) ? null : parsed;
  }

  function dateText(value) {
    var raw = text(value);
    if (!raw) return "—";
    var parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return raw.slice(0, 40);
    try {
      return new Intl.DateTimeFormat("de-AT", { dateStyle: "medium" }).format(parsed);
    } catch (_) {
      return parsed.toLocaleDateString("de-AT");
    }
  }

  function articleKey(value) {
    try {
      return site.articleKey(value) || "";
    } catch (_) {
      return "";
    }
  }

  function canonicalUrl(value) {
    try {
      return site.canonicalUrl(value) || "";
    } catch (_) {
      return "";
    }
  }

  function copyRecord(value, fallbackKey, source) {
    var raw = value && typeof value === "object" ? value : {};
    var key = articleKey(raw.key || raw.url || fallbackKey);
    if (!key) return null;
    return {
      key: key,
      url: key,
      title: text(raw.title),
      subtitle: text(raw.subtitle),
      section: text(raw.section),
      publishedAt: text(raw.publishedAt),
      commentCount: finite(raw.commentCount) === null ? null : Math.max(0, Math.floor(raw.commentCount)),
      source: source || text(raw.source)
    };
  }

  function normalizeCommentMode(value) {
    return value === "positive" || value === "negative" || value === "total" ? value : "native";
  }

  function applySortPreference(snapshot) {
    var prefs = snapshot && snapshot.prefs || {};
    var sort = prefs.discoverySort;
    model.sort = sort === "date" || sort === "comments" ? sort : "";
    model.sortAscending = !!model.sort && prefs.discoverySortAscending === true;
    model.commentSort = normalizeCommentMode(prefs.commentSort);
  }

  model.snapshot = storage.load();
  applySortPreference(model.snapshot);

  function applyMutationResult(result, successMessage, failureMessage) {
    if (!result || result.ok !== true) {
      model.lastError = result && result.error ? String(result.error) : "mutation_failed";
      showToast(failureMessage || "Änderung konnte nicht gespeichert werden.");
      return false;
    }
    if (result.state && typeof result.state === "object") {
      model.snapshot = result.state;
      applySortPreference(model.snapshot);
    }
    if (successMessage) showToast(successMessage);
    return true;
  }

  function progressFor(key) {
    var record = model.snapshot.progress && model.snapshot.progress[key];
    var value = record && typeof record === "object" ? record.value : null;
    return clamp(value, 0, 1);
  }

  function isRead(key) {
    return own(model.snapshot.visited, key);
  }

  function isSaved(key) {
    return own(model.snapshot.saved, key);
  }

  function isIgnored(key) {
    return own(model.snapshot.ignored, key);
  }


  function make(tag, className, label) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function button(label, className) {
    var node = make("button", className, label);
    node.type = "button";
    return node;
  }

  var fallbackStyle = ":host{all:initial}.dsux-launcher,.dsux-panel,.dsux-toast{box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}.dsux-launcher{position:fixed;z-index:2147483000;right:1rem;bottom:1rem;width:3.5rem;height:3.5rem;border:0;border-radius:50%;background:#1b1b1b;color:#fff;cursor:pointer;font-size:1.7rem;line-height:1}.dsux-panel{position:fixed;z-index:2147482999;right:1rem;bottom:5.25rem;width:min(96vw,68rem);max-height:min(84vh,52rem);overflow:auto;padding:1rem;border:1px solid #555;background:#fff;color:#1b1b1b;box-shadow:0 5px 30px #0005}.dsux-panel-header{display:flex;align-items:center;justify-content:space-between}.dsux-panel-header h2{margin:0}.dsux-tabs,.dsux-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0}.dsux-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(8rem,auto);gap:.5rem}.dsux-controls input,.dsux-controls select,.dsux-actions button,.dsux-tabs button{font:inherit;padding:.4rem}.dsux-table{width:100%;border-collapse:collapse}.dsux-table th,.dsux-table td{padding:.45rem;border-bottom:1px solid #ccc;text-align:left;vertical-align:top}.dsux-actions-cell{display:flex;gap:.3rem}.dsux-progress{height:.25rem;margin-top:.35rem;background:#ddd;border-radius:99px;overflow:hidden}.dsux-progress span{display:block;height:100%;background:#17621b}.dsux-toast{position:fixed;z-index:2147483001;right:1rem;bottom:1rem;padding:.65rem .8rem;background:#222;color:#fff}.dsux-empty,.dsux-status{color:#555}.dsux-outline ol{padding-left:1.5rem}.dsux-outline button{border:0;background:transparent;color:#0645ad;cursor:pointer;text-align:left}.dsux-panel button:focus-visible,.dsux-panel input:focus-visible,.dsux-panel select:focus-visible,.dsux-launcher:focus-visible{outline:3px solid #005fcc;outline-offset:2px}@media (max-width:38rem){.dsux-panel{right:.4rem;left:.4rem;width:auto}.dsux-table th:nth-child(2),.dsux-table td:nth-child(2){display:none}}";
  fallbackStyle += ".dsux-actions-cell{display:table-cell}.dsux-row-actions{display:flex;flex-wrap:nowrap;justify-content:center;gap:.35rem}.dsux-table-sort{display:inline-flex;align-items:center;gap:.25rem;white-space:nowrap}.dsux-table-sort[data-direction=ascending]::after{content:'↑'}.dsux-table-sort[data-direction=descending]::after{content:'↓'}.dsux-outline{margin-top:1rem}";
  fallbackStyle += ".dsux-reading-controls{display:grid;grid-template-columns:auto minmax(5rem,1fr) auto;align-items:center;gap:.65rem;margin-top:.65rem}.dsux-reading-controls .dsux-actions,.dsux-article-status,.dsux-panel .dsux-article-progress{margin:0}";
  fallbackStyle += ".dsux-comment-controls{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-top:.75rem}.dsux-comment-controls label{display:flex;align-items:center;gap:.4rem;font-size:.85rem;font-weight:700}.dsux-comment-sort{min-height:2rem;padding:.25rem .45rem}.dsux-comment-status{margin:0 0 0 auto;font-size:.82rem}";

  var host = doc.createElement("div");
  var shadow;
  try {
    shadow = host.attachShadow({ mode: "open" });
  } catch (_) {
    global.__DSUXEnhancerController = false;
    return;
  }
  doc.documentElement.appendChild(host);

  var style = make("style");
  var configuredStyle = String(global.DSUXStyles || "");
  style.textContent = configuredStyle.trim() ? configuredStyle : fallbackStyle;
  shadow.appendChild(style);

  var launcher = button("✦", "dsux-launcher");
  launcher.setAttribute("aria-label", "DerStandard Enhancer öffnen");
  launcher.setAttribute("title", "DerStandard Enhancer öffnen");
  launcher.setAttribute("aria-expanded", "false");
  shadow.appendChild(launcher);

  var panel = make("section", "dsux-panel");
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "DerStandard Enhancer");
  shadow.appendChild(panel);

  var header = make("div", "dsux-panel-header");
  header.appendChild(make("h2", "", "DerStandard Enhancer"));
  var closeButton = button("×", "dsux-close");
  closeButton.setAttribute("aria-label", "Schließen");
  closeButton.setAttribute("title", "Schließen");
  header.appendChild(closeButton);
  panel.appendChild(header);

  var tabs = make("nav", "dsux-tabs");
  tabs.setAttribute("aria-label", "Enhancer-Bereiche");
  var discoverTab = button("Entdecken");
  discoverTab.setAttribute("data-tab", "discover");
  var articleTab = button("Artikel");
  articleTab.setAttribute("data-tab", "article");
  tabs.appendChild(discoverTab);
  tabs.appendChild(articleTab);
  panel.appendChild(tabs);

  var discoverView = make("div", "dsux-view");
  var articleView = make("div", "dsux-view");
  panel.appendChild(discoverView);
  panel.appendChild(articleView);

  var controls = make("div", "dsux-controls");
  var search = make("input");
  search.type = "search";
  search.placeholder = "Titel oder Bereich suchen";
  search.setAttribute("aria-label", "Titel oder Bereich suchen");
  var filter = make("select");
  filter.setAttribute("aria-label", "Artikel filtern");
  [["all", "Alle"], ["unread", "Ungelesen"], ["read", "Gelesen"], ["saved", "Gespeichert"], ["ignored", "Ignoriert"]].forEach(function (entry) {
    var option = make("option", "", entry[1]);
    option.value = entry[0];
    filter.appendChild(option);
  });
  controls.appendChild(search);
  controls.appendChild(filter);
  discoverView.appendChild(controls);

  var discoverStatus = make("p", "dsux-status");
  discoverStatus.setAttribute("role", "status");
  discoverStatus.setAttribute("aria-live", "polite");
  discoverView.appendChild(discoverStatus);

  var table = make("table", "dsux-table");
  table.setAttribute("aria-label", "Artikelübersicht");
  var thead = make("thead");
  var headingRow = make("tr");
  ["Artikel", "Datum", "Kommentare", "Status", "Aktionen"].forEach(function (label) {
    var th = make("th", "", label);
    th.scope = "col";
    headingRow.appendChild(th);
  });
  thead.appendChild(headingRow);
  table.appendChild(thead);
  var dateHeader = headingRow.children[1];
  var commentHeader = headingRow.children[2];
  var dateSort = button("Datum", "dsux-table-sort");
  var commentSort = button("Kommentare", "dsux-table-sort");
  dateHeader.textContent = "";
  commentHeader.textContent = "";
  dateHeader.appendChild(dateSort);
  commentHeader.appendChild(commentSort);
  var list = make("tbody");
  list.setAttribute("aria-live", "polite");
  dateSort.setAttribute("data-sort", "date");
  commentSort.setAttribute("data-sort", "comments");
  table.appendChild(list);
  discoverView.appendChild(table);

  var help = make("div", "dsux-help");
  help.appendChild(make("strong", "", "Lokale Daten"));
  help.appendChild(make("br"));
  help.appendChild(doc.createTextNode("Besuche, Fortschritt, Lesezeichen und ignorierte Artikel bleiben in diesem Browser."));
  var dataActions = make("div", "dsux-actions");
  var exportButton = button("Daten exportieren");
  var importLabel = make("label", "", "Daten importieren");
  var importInput = make("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.setAttribute("aria-label", "JSON-Daten importieren");
  importLabel.appendChild(importInput);
  var clearButton = button("Verlauf löschen");
  dataActions.appendChild(exportButton);
  dataActions.appendChild(importLabel);
  dataActions.appendChild(clearButton);
  help.appendChild(dataActions);
  discoverView.appendChild(help);

  var articleTitle = make("h3", "dsux-article-title");
  articleView.appendChild(articleTitle);
  var readingControls = make("div", "dsux-reading-controls");
  var articleStatus = make("p", "dsux-article-status");
  articleStatus.setAttribute("role", "status");
  readingControls.appendChild(articleStatus);
  var articleProgress = make("div", "dsux-progress dsux-article-progress");
  articleProgress.setAttribute("role", "progressbar");
  articleProgress.setAttribute("aria-label", "Lesefortschritt");
  articleProgress.setAttribute("aria-valuemin", "0");
  articleProgress.setAttribute("aria-valuemax", "100");
  var articleFill = make("span");
  articleProgress.appendChild(articleFill);
  readingControls.appendChild(articleProgress);
  var articleActions = make("div", "dsux-actions");
  var resumeButton = button("Fortsetzen");
  articleActions.appendChild(resumeButton);
  readingControls.appendChild(articleActions);
  articleView.appendChild(readingControls);
  var commentControls = make("div", "dsux-comment-controls");
  var commentLabel = make("label");
  commentLabel.appendChild(make("span", "", "Kommentare sortieren"));
  var commentSortSelect = make("select", "dsux-comment-sort");
  [["native", "Originalreihenfolge"], ["positive", "Meiste positive Bewertungen"], ["negative", "Meiste negative Bewertungen"], ["total", "Meiste Bewertungen insgesamt"]].forEach(function (entry) {
    var option = make("option", "", entry[1]);
    option.value = entry[0];
    commentSortSelect.appendChild(option);
  });
  commentLabel.appendChild(commentSortSelect);
  commentControls.appendChild(commentLabel);
  var commentStatus = make("p", "dsux-comment-status");
  commentStatus.setAttribute("role", "status");
  commentStatus.setAttribute("aria-live", "polite");
  commentControls.appendChild(commentStatus);
  articleView.appendChild(commentControls);
  var outline = make("section", "dsux-outline");
  outline.appendChild(make("strong", "", "Übersicht"));
  var outlineList = make("ol");
  outline.appendChild(outlineList);
  articleView.appendChild(outline);

  var toast = make("div", "dsux-toast");
  toast.hidden = true;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  shadow.appendChild(toast);

  function currentArticle() {
    var article = model.pageArticle;
    if (!article || !article.key || !model.routeKey || article.key !== model.routeKey || routeIdentity() !== model.routeIdentity) return null;
    return article;
  }

  function currentKey() {
    var article = currentArticle();
    return model.routeKey || article && article.key || "";
  }

  function combinedItems() {
    var result = [];
    var seen = Object.create(null);

    function append(value, source, fallbackKey) {
      var item = copyRecord(value, fallbackKey || value && (value.key || value.url), source);
      if (!item) return;
      var existing = seen[item.key];
      if (existing) {
        if (!existing.title && item.title) existing.title = item.title;
        if (!existing.subtitle && item.subtitle) existing.subtitle = item.subtitle;
        if (!existing.section && item.section) existing.section = item.section;
        if (!existing.publishedAt && item.publishedAt) existing.publishedAt = item.publishedAt;
        if (existing.commentCount === null && item.commentCount !== null) existing.commentCount = item.commentCount;
        return;
      }
      seen[item.key] = item;
      result.push(item);
    }

    append(model.pageArticle, "page");
    model.pageItems.forEach(function (item) { append(item, "card"); });
    ["visited", "saved", "ignored"].forEach(function (field) {
      var records = model.snapshot[field] || {};
      Object.keys(records).forEach(function (key) {
        append(records[key], field, key);
      });
    });
    Object.keys(model.snapshot.progress || {}).forEach(function (key) {
      append(null, "progress", key);
    });

    if (!model.sort) return result;

    result.sort(function (left, right) {
      var leftValue;
      var rightValue;
      if (model.sort === "comments") {
        leftValue = finite(left.commentCount);
        rightValue = finite(right.commentCount);
      } else {
        leftValue = dateValue(left.publishedAt);
        rightValue = dateValue(right.publishedAt);
      }
      if (leftValue === null && rightValue === null) return 0;
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      return model.sortAscending ? leftValue - rightValue : rightValue - leftValue;
    });
    return result;
  }

  function showToast(message) {
    if (model.destroyed) return;
    toast.textContent = message;
    toast.hidden = false;
    if (model.toastTimer !== null) global.clearTimeout(model.toastTimer);
    model.toastTimer = global.setTimeout(function () {
      model.toastTimer = null;
      if (!model.destroyed) toast.hidden = true;
    }, 3200);
  }

  function renderStatus(total, shown) {
    if (!total) {
      discoverStatus.textContent = "Keine Artikel verfügbar.";
    } else if (!shown) {
      discoverStatus.textContent = "Keine passenden Artikel.";
    } else {
      discoverStatus.textContent = shown + " von " + total + " Artikel" + (total === 1 ? "" : "n");
    }
  }

  function restorePanelScroll(scrollTop) {
    var routeEntry = model.routeEntry;
    panel.scrollTop = scrollTop;
    var restore = function () {
      if (!model.destroyed && model.panelOpen && model.routeEntry === routeEntry) panel.scrollTop = scrollTop;
    };
    if (typeof global.requestAnimationFrame === "function") global.requestAnimationFrame(restore);
    else global.setTimeout(restore, 0);
  }

  function renderRow(item) {
    var key = item.key;
    var row = make("tr", "dsux-row");
    var titleCell = make("td", "dsux-title-cell");
    var link = make("a", "", item.title || key);
    link.href = key;
    titleCell.appendChild(link);
    if (item.section) titleCell.appendChild(make("div", "dsux-row-meta", item.section));
    if (item.subtitle) titleCell.appendChild(make("div", "dsux-subtitle", item.subtitle));
    var value = progressFor(key);
    if (value > 0) {
      var progress = make("div", "dsux-progress");
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-label", "Lesefortschritt");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      progress.setAttribute("aria-valuenow", String(percent(value)));
      var fill = make("span");
      fill.style.width = percent(value) + "%";
      progress.appendChild(fill);
      titleCell.appendChild(progress);
    }
    row.appendChild(titleCell);
    row.appendChild(make("td", "dsux-date-cell", dateText(item.publishedAt)));
    row.appendChild(make("td", "dsux-count-cell", item.commentCount === null ? "—" : String(item.commentCount)));
    var status = make("td", "dsux-status-cell");
    if (isRead(key)) {
      status.textContent = value >= 0.99 ? "✓" : percent(value) + "%";
      status.setAttribute("aria-label", value >= 0.99 ? "Gelesen" : "Lesefortschritt " + percent(value) + "%");
    }
    row.appendChild(status);

    var actions = make("td", "dsux-actions-cell");
    var actionGroup = make("div", "dsux-row-actions");
    var save = button(isSaved(key) ? "★" : "☆", "dsux-save dsux-icon-button");
    save.setAttribute("aria-pressed", isSaved(key) ? "true" : "false");
    save.setAttribute("aria-label", (isSaved(key) ? "Lesezeichen entfernen: " : "Speichern: ") + (item.title || key));
    save.setAttribute("title", isSaved(key) ? "Lesezeichen entfernen" : "Speichern");
    save.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var result = storage.toggleSaved(key, item.title || "");
      if (!applyMutationResult(result)) return;
      renderDiscovery();
      showToast(isSaved(key) ? "Gespeichert" : "Lesezeichen entfernt");
    });
    actionGroup.appendChild(save);

    var ignore = button(isIgnored(key) ? "↩" : "⊘", "dsux-ignore dsux-icon-button");
    ignore.setAttribute("aria-pressed", isIgnored(key) ? "true" : "false");
    ignore.setAttribute("aria-label", (isIgnored(key) ? "Wiederherstellen: " : "Ignorieren: ") + (item.title || key));
    ignore.setAttribute("title", isIgnored(key) ? "Wiederherstellen" : "Ignorieren");
    ignore.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var scrollTop = panel.scrollTop;
      var result = storage.toggleIgnored(key, item.title || "");
      if (!applyMutationResult(result)) return;
      renderDiscovery();
      restorePanelScroll(scrollTop);
      showToast(isIgnored(key) ? "Artikel ignoriert" : "Artikel wiederhergestellt");
    });
    actionGroup.appendChild(ignore);
    actions.appendChild(actionGroup);
    row.appendChild(actions);
    return row;
  }

  function renderDiscovery() {
    if (model.destroyed) return;
    search.value = model.query;
    filter.value = model.filter;
    var dateDirection = model.sort === "date" ? (model.sortAscending ? "ascending" : "descending") : "none";
    var commentDirection = model.sort === "comments" ? (model.sortAscending ? "ascending" : "descending") : "none";
    dateSort.setAttribute("data-direction", dateDirection);
    commentSort.setAttribute("data-direction", commentDirection);
    dateSort.setAttribute("aria-label", "Datum sortieren, aktuell " + (dateDirection === "none" ? "Standardsortierung" : dateDirection === "ascending" ? "aufsteigend" : "absteigend"));
    commentSort.setAttribute("aria-label", "Kommentare sortieren, aktuell " + (commentDirection === "none" ? "Standardsortierung" : commentDirection === "ascending" ? "aufsteigend" : "absteigend"));
    dateHeader.setAttribute("aria-sort", dateDirection);
    commentHeader.setAttribute("aria-sort", commentDirection);

    while (list.firstChild) list.removeChild(list.firstChild);
    var query = text(model.query).toLocaleLowerCase();
    var all = combinedItems();
    var result = all.filter(function (item) {
      var ignored = isIgnored(item.key);
      if (model.filter === "ignored" ? !ignored : ignored) return false;
      if (model.filter === "read" && !isRead(item.key)) return false;
      if (model.filter === "unread" && isRead(item.key)) return false;
      if (model.filter === "saved" && !isSaved(item.key)) return false;
      if (query && [item.title, item.subtitle, item.section, item.publishedAt, item.key].join(" ").toLocaleLowerCase().indexOf(query) === -1) return false;
      return true;
    });
    renderStatus(all.length, result.length);
    if (!result.length) {
      var emptyRow = make("tr", "dsux-empty");
      var emptyCell = make("td", "", model.filter === "ignored" ? "Keine ignorierten Artikel." : "Keine passenden Artikel.");
      emptyCell.colSpan = 5;
      emptyRow.appendChild(emptyCell);
      list.appendChild(emptyRow);
    } else {
      result.forEach(function (item) { list.appendChild(renderRow(item)); });
    }
  }

  function updateTabs() {
    var available = !!currentArticle();
    articleTab.hidden = !available;
    discoverTab.hidden = false;
    if (!available && model.activeTab === "article") model.activeTab = "discover";
    discoverTab.setAttribute("aria-selected", model.activeTab === "discover" ? "true" : "false");
    articleTab.setAttribute("aria-selected", model.activeTab === "article" ? "true" : "false");
    discoverView.hidden = model.activeTab !== "discover";
    articleView.hidden = model.activeTab !== "article";
  }
  function renderComments() {
    var article = currentArticle();
    commentControls.hidden = !article;
    if (!article) return;
    commentSortSelect.value = model.commentSort;
    if (!model.commentAvailable) {
      commentStatus.textContent = "Kommentare derzeit nicht verfügbar.";
      return;
    }
    commentStatus.textContent = model.commentCount === 1
      ? "1 Kommentar verfügbar."
      : model.commentCount + " Kommentare verfügbar.";
  }

  function stopComments() {
    if (!model.commentsActive) return;
    model.commentsActive = false;
    model.commentsIdentity = "";
    model.commentAvailable = false;
    model.commentCount = 0;
    comments.disconnect();
  }

  function onCommentsChange(payload, identity) {
    if (model.destroyed || !model.commentsActive || model.commentsIdentity !== identity || model.routeIdentity !== identity || !currentArticle()) return;
    var state = payload && typeof payload === "object" ? payload : {};
    model.commentAvailable = state.available === true;
    model.commentCount = finite(state.count) === null ? 0 : Math.max(0, Math.floor(state.count));
    if (model.panelOpen && model.activeTab === "article") renderComments();
  }

  function syncCommentsLifecycle() {
    var article = currentArticle();
    if (!article) {
      stopComments();
      return;
    }
    var identity = model.routeIdentity;
    if (model.commentsActive && model.commentsIdentity === identity) return;
    stopComments();
    model.commentsActive = true;
    model.commentsIdentity = identity;
    model.commentAvailable = false;
    model.commentCount = 0;
    comments.sort(model.commentSort);
    comments.init(function (payload) {
      onCommentsChange(payload, identity);
    });
  }


  function outlineEntries() {
    model.outline = [];
    var article = doc.querySelector("article.story-article");
    var body = article && (article.querySelector(".article-body, .article-content, [data-testid='article-body']") || article);
    if (!body) return model.outline;
    var headings = body.querySelectorAll("h2,h3,h4");
    for (var index = 0; index < headings.length; index += 1) {
      var heading = headings[index];
      var label = text(heading.textContent);
      if (label) model.outline.push({ node: heading, label: label, level: Number(String(heading.tagName).slice(1)) || 2 });
    }
    return model.outline;
  }

  function prefersReducedMotion() {
    try {
      return typeof global.matchMedia === "function" && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  function renderOutline() {
    while (outlineList.firstChild) outlineList.removeChild(outlineList.firstChild);
    var entries = outlineEntries();
    outline.hidden = !entries.length;
    var stack = [{ level: 1, item: null, list: outlineList }];
    entries.forEach(function (entry) {
      var level = Math.max(2, Math.min(4, Number(entry.level) || 2));
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      var parent = stack[stack.length - 1];
      if (!parent.list) {
        parent.list = make("ol");
        parent.item.appendChild(parent.list);
      }
      var item = make("li");
      var jump = button(entry.label);
      jump.addEventListener("click", function () {
        if (entry.node && typeof entry.node.scrollIntoView === "function") {
          entry.node.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        }
      });
      item.appendChild(jump);
      parent.list.appendChild(item);
      stack.push({ level: level, item: item, list: null });
    });
  }

  function renderArticle() {
    var article = currentArticle();
    if (!article) {
      articleTitle.textContent = "";
      articleStatus.textContent = "Auf einer Artikelseite stehen Fortschritt, Fortsetzen und Übersicht zur Verfügung.";
      articleProgress.hidden = true;
      articleActions.hidden = true;
      outline.hidden = true;
      commentControls.hidden = true;
      return;
    }
    articleTitle.textContent = article.title || "Artikel";
    var key = currentKey() || article.key;
    var value = progressFor(key);
    articleStatus.textContent = percent(value) + "% gelesen";
    articleProgress.hidden = false;
    articleProgress.setAttribute("aria-valuenow", String(percent(value)));
    articleFill.style.width = percent(value) + "%";
    articleActions.hidden = false;
    var target = model.resumeKey === key ? model.resumeValue : 0;
    resumeButton.disabled = !(target > 0.01 && target < 0.99);
    resumeButton.setAttribute("aria-label", resumeButton.disabled ? "Kein gespeicherter Fortsetzpunkt" : "Fortsetzen");
    renderComments();
    renderOutline();
  }

  function render() {
    updateTabs();
    renderDiscovery();
    renderArticle();
  }

  function focusWithoutScroll(node) {
    if (!node || typeof node.focus !== "function") return;
    try {
      node.focus({ preventScroll: true });
    } catch (_) {
      node.focus();
    }
  }

  function setOpen(open) {
    var next = !!open;
    var changed = next !== model.panelOpen;
    model.panelOpen = next;
    panel.hidden = !model.panelOpen;
    launcher.setAttribute("aria-expanded", model.panelOpen ? "true" : "false");
    if (model.panelOpen) {
      render();
      if (changed) focusWithoutScroll(closeButton);
    } else if (changed) {
      focusWithoutScroll(launcher);
    }
  }

  function setTab(name) {
    if (name === "article" && currentArticle()) model.activeTab = "article";
    else model.activeTab = "discover";
    updateTabs();
    if (model.panelOpen && model.activeTab === "article") renderArticle();
  }

  function articleBounds() {
    var article = doc.querySelector("article.story-article");
    if (!article) return null;
    var body = article.querySelector(".article-body, .article-content, [data-testid='article-body']") || article;
    var rect = body.getBoundingClientRect();
    var scrollTop = finite(global.pageYOffset) !== null ? global.pageYOffset : doc.documentElement.scrollTop || 0;
    var start = rect.top + scrollTop;
    var end = rect.bottom + scrollTop;
    var forum = doc.querySelector("#forum, dst-forum");
    if (forum) {
      var forumTop = forum.getBoundingClientRect().top + scrollTop;
      if (forumTop > start) end = forumTop;
    }
    return { start: start, end: end };
  }

  function progressNow() {
    var bounds = articleBounds();
    if (!bounds) return 0;
    var range = bounds.end - bounds.start;
    if (range <= 0) return 0;
    var scrollTop = finite(global.pageYOffset) !== null ? global.pageYOffset : doc.documentElement.scrollTop || 0;
    var viewportBottom = scrollTop + (finite(global.innerHeight) === null ? 0 : global.innerHeight);
    return clamp((viewportBottom - bounds.start) / range, 0, 1);
  }

  function clearProgressTimer() {
    if (model.progressTimer !== null) {
      global.clearTimeout(model.progressTimer);
      model.progressTimer = null;
    }
  }

  function onScroll() {
    var key = currentKey();
    if (!key || !currentArticle() || model.destroyed || routeIdentity() !== model.routeIdentity) return;
    clearProgressTimer();
    var capturedKey = key;
    var capturedIdentity = model.routeIdentity;
    var capturedGeneration = model.generation;
    model.progressTimer = global.setTimeout(function () {
      model.progressTimer = null;
      if (model.destroyed || model.generation !== capturedGeneration || currentKey() !== capturedKey || routeIdentity() !== capturedIdentity) return;
      var value = progressNow();
      if (value === progressFor(capturedKey)) return;
      applyMutationResult(storage.setProgress(capturedKey, value));
    }, 250);
  }

  function resumeReading() {
    var key = currentKey();
    var article = currentArticle();
    if (!article || article.key !== model.routeKey || !key || model.resumeKey !== key) return;
    var value = clamp(model.resumeValue, 0, 1);
    if (!(value > 0.01 && value < 0.99)) {
      showToast("Kein gespeicherter Fortsetzpunkt");
      return;
    }
    var bounds = articleBounds();
    if (!bounds || typeof global.scrollTo !== "function") {
      showToast("Kein gespeicherter Fortsetzpunkt");
      return;
    }
    var viewport = finite(global.innerHeight) === null ? 0 : global.innerHeight;
    var target = bounds.start + value * Math.max(0, bounds.end - bounds.start) - viewport;
    var max = Math.max(0, (doc.documentElement.scrollHeight || 0) - viewport);
    target = clamp(target, 0, max);
    try {
      global.scrollTo({ top: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    } catch (_) {
      showToast("Fortsetzen nicht verfügbar");
      return;
    }
    model.resumeKey = "";
    model.resumeValue = 0;
    model.resumeEntry = model.routeEntry;
    if (model.panelOpen) renderArticle();
  }

  function routeIdentity() {
    var href = global.location && global.location.href || doc.URL || "";
    return articleKey(href) || canonicalUrl(href) || href;
  }

  function invalidateRoute(identity, force) {
    var changed = identity !== model.routeIdentity;
    if (!changed && !force) return false;
    model.routeIdentity = identity;
    model.routeKey = articleKey(global.location && global.location.href || doc.URL || "");
    model.generation += 1;
    clearProgressTimer();
    if (changed) {
      stopComments();
      model.routeEntry += 1;
      model.pageArticle = null;
      model.pageItems = [];
      model.resumeKey = "";
      model.resumeValue = 0;
      model.resumeEntry = -1;
    }
    return true;
  }

  function scheduleScan() {
    if (model.destroyed) return;
    if (model.scanTimer !== null) global.clearTimeout(model.scanTimer);
    model.scanTimer = global.setTimeout(function () {
      model.scanTimer = null;
      scan();
    }, 120);
  }

  function markCurrentVisited() {
    var key = model.routeKey;
    var article = currentArticle();
    if (!key || !article || article.key !== key || model.markedEntry === model.routeEntry) return;
    var result = storage.markVisited(key, article.title || "");
    if (applyMutationResult(result)) model.markedEntry = model.routeEntry;
  }

  function scan() {
    if (model.destroyed) return;
    model.generation += 1;
    invalidateRoute(routeIdentity(), false);
    var generation = model.generation;
    var page = null;
    var items = [];
    try { page = site.extractPageArticle(doc); } catch (_) { page = null; }
    try { items = site.extractArticles(doc) || []; } catch (_) { items = []; }
    if (model.destroyed || generation > model.generation) return;
    var pageRecord = copyRecord(page, page && page.key, "page");
    model.pageArticle = pageRecord && model.routeKey && pageRecord.key === model.routeKey ? pageRecord : null;
    model.pageItems = [];
    items.forEach(function (item) {
      var copy = copyRecord(item, item && (item.key || item.url), "card");
      if (copy) model.pageItems.push(copy);
    });
    var article = currentArticle();
    var key = article && article.key === model.routeKey ? model.routeKey : "";
    if (!key) {
      if (model.resumeEntry !== model.routeEntry) {
        model.resumeKey = "";
        model.resumeValue = 0;
        model.resumeEntry = -1;
      }
    } else if (model.resumeEntry !== model.routeEntry) {
      model.resumeKey = key;
      model.resumeValue = progressFor(key);
      model.resumeEntry = model.routeEntry;
    }
    syncCommentsLifecycle();
    markCurrentVisited();
    updateTabs();
    if (model.panelOpen) render();
  }

  function startRoutePolling() {
    if (model.destroyed || model.routePollTimer !== null) return;
    model.routePollTimer = global.setTimeout(pollRoute, 250);
  }

  function pollRoute() {
    model.routePollTimer = null;
    if (model.destroyed) return;
    if (invalidateRoute(routeIdentity(), false)) scheduleScan();
    startRoutePolling();
  }

  function onRouteEvent() {
    if (invalidateRoute(routeIdentity(), true)) scheduleScan();
  }

  function onStorageChange(next) {
    if (model.destroyed) return;
    if (!next || typeof next !== "object") return;
    var previousCommentSort = model.commentSort;
    model.snapshot = next;
    applySortPreference(model.snapshot);
    if (model.commentsActive && model.commentSort !== previousCommentSort) comments.sort(model.commentSort);
    if (model.panelOpen) render();
  }

  function onLauncherClick() { setOpen(!model.panelOpen); }
  function onCloseClick() { setOpen(false); }
  function onTabClick(event) { setTab(event.currentTarget.getAttribute("data-tab")); }
  function onSearchInput() { model.query = search.value || ""; renderDiscovery(); }
  function onFilterChange() { model.filter = filter.value || "all"; renderDiscovery(); }
  function cycleSort(field) {
    if (model.sort !== field) {
      model.sort = field;
      model.sortAscending = false;
    } else if (!model.sortAscending) {
      model.sortAscending = true;
    } else {
      model.sort = "";
      model.sortAscending = false;
    }
    var result = storage.setPreferences({
      discoverySort: model.sort,
      discoverySortAscending: model.sortAscending
    });
    if (!applyMutationResult(result)) applySortPreference(model.snapshot);
    if (model.panelOpen) renderDiscovery();
  }
  function onDateSort() { cycleSort("date"); }
  function onCommentSort() { cycleSort("comments"); }
  function onResumeClick() { resumeReading(); }
  function onCommentOrderChange() {
    var previousMode = model.commentSort;
    var mode = normalizeCommentMode(commentSortSelect.value);
    try {
      mode = normalizeCommentMode(comments.sort(mode));
    } catch (_) {
      commentSortSelect.value = previousMode;
      showToast("Kommentarsortierung nicht verfügbar");
      return;
    }
    model.commentSort = mode;
    commentSortSelect.value = mode;
    var result = storage.setPreferences({ commentSort: mode });
    if (!applyMutationResult(result, null, "Kommentarsortierung konnte nicht gespeichert werden.")) {
      model.commentSort = normalizeCommentMode(model.snapshot && model.snapshot.prefs && model.snapshot.prefs.commentSort);
      comments.sort(model.commentSort);
      commentSortSelect.value = model.commentSort;
    }
    renderComments();
  }


  function onExportClick() {
    if (typeof global.Blob !== "function" || !global.URL || typeof global.URL.createObjectURL !== "function") {
      showToast("Export nicht verfügbar");
      return;
    }
    var blob = new global.Blob([storage.exportJson()], { type: "application/json" });
    if (model.exportUrl && global.URL && typeof global.URL.revokeObjectURL === "function") global.URL.revokeObjectURL(model.exportUrl);
    var url = global.URL.createObjectURL(blob);
    model.exportUrl = url;
    var download = make("a");
    download.href = url;
    download.download = "derstandard-enhancer-daten.json";
    shadow.appendChild(download);
    download.click();
    shadow.removeChild(download);
    if (model.exportTimer !== null) global.clearTimeout(model.exportTimer);
    model.exportTimer = global.setTimeout(function () {
      model.exportTimer = null;
      if (global.URL && typeof global.URL.revokeObjectURL === "function") global.URL.revokeObjectURL(url);
      if (model.exportUrl === url) model.exportUrl = null;
    }, 0);
    showToast("Daten exportiert");
  }

  function onImportChange() {
    var file = importInput.files && importInput.files[0];
    if (!file) return;
    if (file.size > 1048576) {
      model.lastError = "file_too_large";
      showToast("Import abgelehnt: Datei zu groß");
      importInput.value = "";
      return;
    }
    if (typeof global.FileReader !== "function") return;
    var reader = new global.FileReader();
    reader.onload = function () {
      if (model.destroyed) return;
      var prepared;
      try {
        prepared = storage.prepareImport(reader.result);
      } catch (_) {
        prepared = { ok: false, error: "invalid_import" };
      }
      if (!prepared || prepared.ok !== true) {
        model.lastError = prepared && prepared.error ? String(prepared.error) : "invalid_import";
        showToast("Import abgelehnt: ungültige JSON-Daten");
      } else {
        var result = storage.importPrepared(prepared.state);
        if (applyMutationResult(result, "Daten importiert", "Import konnte nicht gespeichert werden.")) render();
      }
      importInput.value = "";
    };
    reader.readAsText(file);
  }
  function onClearClick() {
    var result = storage.clearVisited();
    if (applyMutationResult(result, "Besuchsverlauf gelöscht")) render();
  }

  function onKeydown(event) {
    if (event.key === "Escape" && model.panelOpen) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!event.altKey || !event.shiftKey) return;
    var key = String(event.key || "").toLowerCase();
    if (key === "o") {
      event.preventDefault();
      setOpen(!model.panelOpen);
    } else if (key === "r") {
      event.preventDefault();
      setOpen(true);
      setTab("article");
      resumeReading();
    }
  }

  function teardown() {
    if (model.destroyed) return;
    model.destroyed = true;
    model.generation += 1;
    if (model.scanTimer !== null) global.clearTimeout(model.scanTimer);
    if (model.progressTimer !== null) global.clearTimeout(model.progressTimer);
    if (model.toastTimer !== null) global.clearTimeout(model.toastTimer);
    if (model.exportTimer !== null) global.clearTimeout(model.exportTimer);
    if (model.exportUrl && global.URL && typeof global.URL.revokeObjectURL === "function") global.URL.revokeObjectURL(model.exportUrl);
    if (model.routePollTimer !== null) global.clearTimeout(model.routePollTimer);
    if (model.observer && typeof model.observer.disconnect === "function") model.observer.disconnect();
    if (typeof model.unsubscribe === "function") model.unsubscribe();
    stopComments();
    if (typeof storage.disconnect === "function") storage.disconnect();
    launcher.removeEventListener("click", onLauncherClick);
    closeButton.removeEventListener("click", onCloseClick);
    discoverTab.removeEventListener("click", onTabClick);
    articleTab.removeEventListener("click", onTabClick);
    search.removeEventListener("input", onSearchInput);
    filter.removeEventListener("change", onFilterChange);
    dateSort.removeEventListener("click", onDateSort);
    commentSort.removeEventListener("click", onCommentSort);
    resumeButton.removeEventListener("click", onResumeClick);
    commentSortSelect.removeEventListener("change", onCommentOrderChange);
    exportButton.removeEventListener("click", onExportClick);
    importInput.removeEventListener("change", onImportChange);
    clearButton.removeEventListener("click", onClearClick);
    global.removeEventListener("scroll", onScroll);
    global.removeEventListener("popstate", onRouteEvent);
    global.removeEventListener("hashchange", onRouteEvent);
    doc.removeEventListener("keydown", onKeydown);
    if (host.parentNode) host.parentNode.removeChild(host);
    global.__DSUXEnhancerController = false;
    global.DSUXEnhancerTeardown = null;
  }

  launcher.addEventListener("click", onLauncherClick);
  closeButton.addEventListener("click", onCloseClick);
  discoverTab.addEventListener("click", onTabClick);
  articleTab.addEventListener("click", onTabClick);
  search.addEventListener("input", onSearchInput);
  filter.addEventListener("change", onFilterChange);
  dateSort.addEventListener("click", onDateSort);
  commentSort.addEventListener("click", onCommentSort);
  resumeButton.addEventListener("click", onResumeClick);
  commentSortSelect.addEventListener("change", onCommentOrderChange);
  exportButton.addEventListener("click", onExportClick);
  importInput.addEventListener("change", onImportChange);
  clearButton.addEventListener("click", onClearClick);
  global.addEventListener("scroll", onScroll, { passive: true });
  global.addEventListener("popstate", onRouteEvent);
  global.addEventListener("hashchange", onRouteEvent);
  doc.addEventListener("keydown", onKeydown);

  if (typeof global.MutationObserver === "function") {
    model.observer = new global.MutationObserver(function () { scheduleScan(); });
    model.observer.observe(doc.documentElement, { childList: true, subtree: true });
  }
  model.unsubscribe = storage.subscribe(onStorageChange);
  global.DSUXEnhancerTeardown = teardown;
  scan();
  startRoutePolling();
}(typeof window !== "undefined" ? window : null));
