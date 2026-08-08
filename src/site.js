(() => {
  if (typeof window === "undefined") return;

  var SITE_HOST = "derstandard.at";
  var TRACKING_PARAM =
    /^(?:utm_[^=]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_ga|_gl|pk_campaign|pk_kwd|pk_source|ref|rank|referrer|source|cmpid|campaignid|wt_mc)$/i;

  function isSameSite(hostname) {
    var host = String(hostname || "")
      .toLowerCase()
      .replace(/\.$/, "");
    return host === SITE_HOST || host.slice(-(SITE_HOST.length + 1)) === `.${SITE_HOST}`;
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
    parsed.searchParams.forEach((paramValue, paramName) => {
      if (!TRACKING_PARAM.test(paramName)) params.push([paramName, paramValue]);
    });
    parsed.search = "";
    params.forEach((entry) => {
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
    return String(node.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isVisible(node) {
    if (node?.nodeType !== 1 || node.hidden || node.getAttribute("aria-hidden") === "true") return false;
    var view = node.ownerDocument?.defaultView;
    if (view && typeof view.getComputedStyle === "function") {
      var style = view.getComputedStyle(node);
      if (
        style &&
        (style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          style.opacity === "0")
      )
        return false;
    }
    return true;
  }

  function parseCommentCount(value) {
    var node = value && typeof value === "object" && value.nodeType === 1 ? value : null;
    if (node && !isVisible(node)) return null;
    if (typeof value === "number")
      return Number.isFinite(value) && value >= 0 && Math.floor(value) === value ? value : null;
    var raw = node ? textOf(node) : typeof value === "string" ? value : "";
    if (!raw) return null;
    var match = raw.match(/\d[\d\s.,]*/);
    if (!match) return null;
    var token = match[0].trim();
    var following = raw.slice((match.index || 0) + match[0].length);
    if (/^[.,]\d/.test(following)) return null;
    if (
      /[.,\s]/.test(token) &&
      !/^\d+$/.test(token) &&
      !/^\d{1,3}(?:[.,]\d{3})+$/.test(token) &&
      !/^\d{1,3}(?:\s\d{3})+$/.test(token)
    )
      return null;
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
    var base = (doc && (doc.baseURI || doc.URL)) || window.location?.href;
    var candidates = [
      canonical?.getAttribute("href"),
      original && (original.getAttribute("content") || original.getAttribute("data-original-url")),
      doc?.URL,
      window.location?.href,
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = toUrl(candidates[i], base);
      var key = articleKey(candidate?.href);
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
      source: source || "",
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
    var countNode =
      first(article, ".js-forum-postingcount, .article-postingcount, .teaser-postingcount") ||
      first(doc, ".js-forum-postingcount, .article-postingcount, .teaser-postingcount");
    return record(key, title, subtitle, section, publishedAt, parseCommentCount(countNode), "page");
  }

  function isStoryArticle(node) {
    return (
      localName(node) === "article" && /(^|\s)story-article(?:\s|$)/i.test(String(node.getAttribute?.("class") || ""))
    );
  }

  function isInsideStoryArticle(node) {
    var current = node?.parentElement;
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
    var labels = node?.getAttribute?.("aria-labelledby");
    if (!labels) return "";
    var doc = (node.ownerDocument || root) && (node.ownerDocument || root);
    if (!doc || typeof doc.getElementById !== "function") return "";
    var result = [];
    labels.split(/\s+/).forEach((id) => {
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
    if (root.nodeType === 1 && String(root.tagName || "").toLowerCase() === "a" && root.getAttribute("href"))
      anchors.push(root);
    var found = root.querySelectorAll("a[href]");
    for (var i = 0; i < found.length; i += 1) anchors.push(found[i]);

    var articles = [];
    var seen = Object.create(null);
    anchors.forEach((anchor) => {
      if (isInsideStoryArticle(anchor)) return;
      var href = anchor.href || anchor.getAttribute("href");
      var base =
        (anchor.ownerDocument && (anchor.ownerDocument.baseURI || anchor.ownerDocument.URL)) ||
        root.baseURI ||
        root.URL;
      var resolved = toUrl(href, base);
      var key = articleKey(resolved?.href);
      if (!key || seen[key]) return;
      var card = nearestCard(anchor);
      var title = cardTitle(anchor, card, root);
      var dateNode = first(card, "dst-rl-timestamp[date]");
      var countNode = first(card, ".js-forum-postingcount, .article-postingcount, .teaser-postingcount");
      var section = String(
        (card && (card.getAttribute("data-section") || card.getAttribute("data-ressort"))) || ""
      ).trim();
      seen[key] = true;
      articles.push(
        record(
          key,
          title,
          "",
          section,
          dateNode ? String(dateNode.getAttribute("date") || "").trim() : "",
          parseCommentCount(countNode),
          "card"
        )
      );
    });
    return articles;
  }

  function localName(node) {
    return String((node && (node.localName || node.nodeName)) || "")
      .split(":")
      .pop()
      .toLowerCase();
  }

  window.DSUXSite = {
    isArticleUrl: isArticleUrl,
    canonicalUrl: canonicalUrl,
    articleKey: articleKey,
    extractPageArticle: extractPageArticle,
    extractArticles: extractArticles,
    parseCommentCount: parseCommentCount,
  };
})();
