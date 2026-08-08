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
