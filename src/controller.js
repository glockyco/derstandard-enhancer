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
    scope: "page",
    sort: "",
    sortAscending: false,
    outline: [],
    generation: 0,
    routeEntry: 0,
    markedEntry: 0,
    discoveryDirty: true,
    scanTimer: null,
    progressTimer: null,
    progressPending: null,
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
    pendingImport: null,
    clearPending: false,
    importReader: null,
    importGeneration: 0,
    openTrigger: null,
    readingFocusTarget: null,
    readingFocusAdded: false,
    readingFocusBlur: null,
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

  function renderStorageState() {
    if (!model.destroyed) renderData();
  }

  function setStorageError(error) {
    model.lastError = error ? String(error) : "storage-operation-failed";
    renderStorageState();
  }

  function storageResult(operation, fallbackError) {
    try {
      return operation();
    } catch (_) {
      return { ok: false, error: fallbackError || "storage-operation-failed" };
    }
  }

  function applyMutationResult(result, successMessage, failureMessage) {
    if (!result || result.ok !== true) {
      setStorageError(result && result.error ? result.error : "mutation-failed");
      showToast(failureMessage || "Änderung konnte nicht gespeichert werden.");
      return false;
    }
    model.lastError = "";
    renderStorageState();
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
  fallbackStyle += ".dsux-data-view .dsux-help{border-top:0}.dsux-import-preview,.dsux-clear-confirmation,.dsux-storage-error{margin-top:.75rem;padding:.75rem;border:1px solid #8b8f94}.dsux-storage-error{color:#8b1e14}.dsux-import-summary{display:grid;grid-template-columns:auto auto;justify-content:start;gap:.25rem 1rem}.dsux-import-summary dt{font-weight:700}.dsux-import-summary dd{margin:0}";
  fallbackStyle += ".dsux-launcher{width:7rem;height:auto;min-height:3.25rem;padding:.65rem .9rem;border-radius:.45rem;font-size:.95rem;font-weight:700}.dsux-toast{right:8.75rem;max-width:min(31rem,calc(100vw - 9.75rem));pointer-events:none}.dsux-controls{grid-template-columns:minmax(0,1fr) minmax(9rem,auto) minmax(9rem,auto)}.dsux-control-field{display:grid;gap:.2rem}.dsux-control-label,.dsux-shortcuts{font-size:.82rem}.dsux-shortcuts{padding-top:.7rem;border-top:1px solid #ccc}@media(max-width:38rem){.dsux-launcher{right:.75rem;width:7rem}.dsux-toast{right:8.35rem;max-width:calc(100vw - 9.1rem)}.dsux-controls{grid-template-columns:minmax(0,1fr)}}";

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

  var launcher = button("Entdecken", "dsux-launcher");
  launcher.setAttribute("aria-label", "Entdecken – DerStandard Enhancer öffnen");
  launcher.setAttribute("title", "Entdecken – DerStandard Enhancer öffnen");
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "dsux-panel");
  shadow.appendChild(launcher);

  var panel = make("section", "dsux-panel");
  panel.id = "dsux-panel";
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
  tabs.setAttribute("role", "tablist");
  var discoverTab = button("Entdecken");
  discoverTab.id = "dsux-tab-discover";
  discoverTab.setAttribute("data-tab", "discover");
  discoverTab.setAttribute("role", "tab");
  discoverTab.setAttribute("aria-controls", "dsux-view-discover");
  var articleTab = button("Artikel");
  articleTab.id = "dsux-tab-article";
  articleTab.setAttribute("data-tab", "article");
  articleTab.setAttribute("role", "tab");
  articleTab.setAttribute("aria-controls", "dsux-view-article");
  var dataTab = button("Daten");
  dataTab.id = "dsux-tab-data";
  dataTab.setAttribute("data-tab", "data");
  dataTab.setAttribute("role", "tab");
  dataTab.setAttribute("aria-controls", "dsux-view-data");
  tabs.appendChild(discoverTab);
  tabs.appendChild(articleTab);
  tabs.appendChild(dataTab);
  panel.appendChild(tabs);

  var discoverView = make("div", "dsux-view");
  discoverView.id = "dsux-view-discover";
  discoverView.setAttribute("role", "tabpanel");
  discoverView.setAttribute("aria-labelledby", "dsux-tab-discover");
  var articleView = make("div", "dsux-view");
  articleView.id = "dsux-view-article";
  articleView.setAttribute("role", "tabpanel");
  articleView.setAttribute("aria-labelledby", "dsux-tab-article");
  var dataView = make("div", "dsux-view dsux-data-view");
  dataView.id = "dsux-view-data";
  dataView.setAttribute("role", "tabpanel");
  dataView.setAttribute("aria-labelledby", "dsux-tab-data");
  panel.appendChild(discoverView);
  panel.appendChild(articleView);
  panel.appendChild(dataView);

  var controls = make("div", "dsux-controls");
  var searchLabel = make("label", "dsux-control-field");
  searchLabel.appendChild(make("span", "dsux-control-label", "Suche"));
  var search = make("input");
  search.type = "search";
  search.placeholder = "Titel oder Bereich suchen";
  search.setAttribute("aria-label", "Titel oder Bereich suchen");
  searchLabel.appendChild(search);
  var scopeLabel = make("label", "dsux-control-field");
  scopeLabel.appendChild(make("span", "dsux-control-label", "Quelle"));
  var scope = make("select", "dsux-scope");
  scope.setAttribute("aria-label", "Artikelquelle");
  [["page", "Aktuelle Seite"], ["local", "Meine Artikel"]].forEach(function (entry) {
    var option = make("option", "", entry[1]);
    option.value = entry[0];
    scope.appendChild(option);
  });
  scopeLabel.appendChild(scope);
  var filterLabel = make("label", "dsux-control-field");
  filterLabel.appendChild(make("span", "dsux-control-label", "Status"));
  var filter = make("select");
  filter.setAttribute("aria-label", "Artikel filtern");
  [["all", "Alle"], ["unread", "Ungelesen"], ["read", "Gelesen"], ["saved", "Gespeichert"], ["ignored", "Ignoriert"]].forEach(function (entry) {
    var option = make("option", "", entry[1]);
    option.value = entry[0];
    filter.appendChild(option);
  });
  filterLabel.appendChild(filter);
  controls.appendChild(searchLabel);
  controls.appendChild(scopeLabel);
  controls.appendChild(filterLabel);
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
  dateSort.setAttribute("data-sort", "date");
  commentSort.setAttribute("data-sort", "comments");
  table.appendChild(list);
  discoverView.appendChild(table);

  var storageError = make("p", "dsux-storage-error");
  storageError.hidden = true;
  storageError.setAttribute("role", "alert");
  storageError.setAttribute("aria-live", "assertive");
  dataView.appendChild(storageError);

  var help = make("div", "dsux-help");
  help.appendChild(make("strong", "", "Lokale Daten"));
  help.appendChild(make("p", "", "Besuche, Fortschritte, Lesezeichen und ignorierte Artikel bleiben in diesem Browser."));
  var dataActions = make("div", "dsux-actions");
  var exportButton = button("Daten exportieren");
  var importLabel = make("label", "", "JSON-Datei auswählen");
  var importInput = make("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.setAttribute("aria-label", "Lokale Daten aus einer JSON-Datei vorbereiten");
  importLabel.appendChild(importInput);
  var clearButton = button("Verlauf löschen");
  dataActions.appendChild(exportButton);
  dataActions.appendChild(importLabel);
  dataActions.appendChild(clearButton);
  help.appendChild(dataActions);
  dataView.appendChild(help);

  var importPreview = make("section", "dsux-import-preview");
  importPreview.hidden = true;
  importPreview.setAttribute("aria-label", "Importvorschau");
  importPreview.appendChild(make("strong", "", "Importvorschau"));
  importPreview.appendChild(make("p", "", "Der Import ersetzt alle lokalen Daten."));
  var importSummary = make("dl", "dsux-import-summary");
  var importVisited = make("dd");
  var importSaved = make("dd");
  var importIgnored = make("dd");
  var importProgress = make("dd");
  [["Besuche", importVisited], ["Lesezeichen", importSaved], ["Ignorierte", importIgnored], ["Fortschritte", importProgress]].forEach(function (entry) {
    importSummary.appendChild(make("dt", "", entry[0]));
    importSummary.appendChild(entry[1]);
  });
  importPreview.appendChild(importSummary);
  var importActions = make("div", "dsux-actions dsux-confirm-actions");
  var importCancelButton = button("Abbrechen", "dsux-import-cancel");
  var importConfirmButton = button("Import bestätigen", "dsux-import-confirm dsux-danger-button");
  importActions.appendChild(importCancelButton);
  importActions.appendChild(importConfirmButton);
  importPreview.appendChild(importActions);
  dataView.appendChild(importPreview);

  var clearConfirmation = make("section", "dsux-clear-confirmation");
  clearConfirmation.hidden = true;
  clearConfirmation.setAttribute("aria-label", "Löschen bestätigen");
  clearConfirmation.appendChild(make("strong", "", "Verlauf wirklich löschen?"));
  clearConfirmation.appendChild(make("p", "", "Nur der Besuchsverlauf wird gelöscht. Fortschritte, Lesezeichen und ignorierte Artikel bleiben erhalten."));
  var clearActions = make("div", "dsux-actions dsux-confirm-actions");
  var clearCancelButton = button("Abbrechen", "dsux-clear-cancel");
  var clearConfirmButton = button("Endgültig löschen", "dsux-clear-confirm dsux-danger-button");
  clearActions.appendChild(clearCancelButton);
  clearActions.appendChild(clearConfirmButton);
  clearConfirmation.appendChild(clearActions);
  dataView.appendChild(clearConfirmation);

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

  var shortcutHelp = make("p", "dsux-shortcuts", "Tastatur: Alt+Shift+O öffnet oder schließt den Enhancer · Alt+Shift+R setzt das Lesen auf Artikelseiten fort · Esc schließt den Enhancer");
  panel.appendChild(shortcutHelp);

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

  function mergeRecord(existing, item) {
    if (!existing.title && item.title) existing.title = item.title;
    if (!existing.subtitle && item.subtitle) existing.subtitle = item.subtitle;
    if (!existing.section && item.section) existing.section = item.section;
    if (!existing.publishedAt && item.publishedAt) existing.publishedAt = item.publishedAt;
    if (existing.commentCount === null && item.commentCount !== null) existing.commentCount = item.commentCount;
  }

  function assembleSource(entries) {
    var result = [];
    var seen = Object.create(null);
    entries.forEach(function (entry) {
      var value = entry && entry.value;
      var item = copyRecord(value, entry && entry.fallbackKey || value && (value.key || value.url), entry && entry.source);
      if (!item) return;
      if (seen[item.key]) {
        mergeRecord(seen[item.key], item);
        return;
      }
      seen[item.key] = item;
      result.push(item);
    });
    return result;
  }

  function pageSourceItems() {
    var entries = [];
    if (model.pageArticle) entries.push({ value: model.pageArticle, source: "page" });
    model.pageItems.forEach(function (item) {
      entries.push({ value: item, source: "card" });
    });
    return assembleSource(entries);
  }

  function localSourceItems() {
    var entries = [];
    ["visited", "saved", "ignored"].forEach(function (field) {
      var records = model.snapshot[field] || {};
      Object.keys(records).forEach(function (key) {
        entries.push({ value: records[key], fallbackKey: key, source: field });
      });
    });
    Object.keys(model.snapshot.progress || {}).forEach(function (key) {
      entries.push({ value: null, fallbackKey: key, source: "progress" });
    });
    return assembleSource(entries);
  }

  function ensureDiscovery() {
    if (model.destroyed || !model.panelOpen || !model.discoveryDirty) return;
    var generation = model.generation;
    var items = [];
    try { items = site.extractArticles(doc) || []; } catch (_) { items = []; }
    if (model.destroyed || generation !== model.generation) return;
    model.pageItems = [];
    items.forEach(function (item) {
      var copy = copyRecord(item, item && (item.key || item.url), "card");
      if (copy) model.pageItems.push(copy);
    });
    model.discoveryDirty = false;
  }

  function discoveryItems() {
    var result = model.scope === "local" ? localSourceItems() : pageSourceItems();
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

  function captureDiscoveryFocus() {
    var active = shadow.activeElement;
    if (!active || !list.contains(active)) return null;
    var action = active.getAttribute && active.getAttribute("data-action");
    var key = active.getAttribute && active.getAttribute("data-key");
    if (!action || !key) return null;
    var row = active;
    while (row && row.parentNode !== list) row = row.parentNode;
    var rowIndex = 0;
    if (row && row.parentNode === list) {
      for (var index = 0; index < list.children.length; index += 1) {
        if (list.children[index] === row) {
          rowIndex = index;
          break;
        }
      }
    }
    return { action: action, key: key, rowIndex: rowIndex, scrollTop: panel.scrollTop };
  }

  function restoreDiscoveryFocus(state) {
    if (!state || !model.panelOpen) return;
    var nodes = list.querySelectorAll("[data-action][data-key]");
    var sameAction = [];
    var exact = null;
    for (var index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      if (node.getAttribute("data-action") !== state.action) continue;
      sameAction.push(node);
      if (node.getAttribute("data-key") === state.key) exact = node;
    }
    var target = exact;
    if (!target && sameAction.length) target = sameAction[Math.min(state.rowIndex, sameAction.length - 1)];
    focusWithoutScroll(target || search);
    restorePanelScroll(state.scrollTop);
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
    save.setAttribute("data-action", "save");
    save.setAttribute("data-key", key);
    save.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var result = storageResult(function () { return storage.toggleSaved(key, item.title || ""); });
      if (!applyMutationResult(result)) return;
      showToast(isSaved(key) ? "Gespeichert" : "Lesezeichen entfernt");
    });
    actionGroup.appendChild(save);

    var ignore = button(isIgnored(key) ? "↩" : "⊘", "dsux-ignore dsux-icon-button");
    ignore.setAttribute("aria-pressed", isIgnored(key) ? "true" : "false");
    ignore.setAttribute("aria-label", (isIgnored(key) ? "Wiederherstellen: " : "Ignorieren: ") + (item.title || key));
    ignore.setAttribute("title", isIgnored(key) ? "Wiederherstellen" : "Ignorieren");
    ignore.setAttribute("data-action", "ignore");
    ignore.setAttribute("data-key", key);
    ignore.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var scrollTop = panel.scrollTop;
      var result = storageResult(function () { return storage.toggleIgnored(key, item.title || ""); });
      if (!applyMutationResult(result)) return;
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
    var focusState = captureDiscoveryFocus();
    search.value = model.query;
    scope.value = model.scope;
    filter.value = model.filter;
    var dateDirection = model.sort === "date" ? (model.sortAscending ? "ascending" : "descending") : "none";
    var commentDirection = model.sort === "comments" ? (model.sortAscending ? "ascending" : "descending") : "none";
    dateSort.setAttribute("data-direction", dateDirection);
    commentSort.setAttribute("data-direction", commentDirection);
    dateSort.setAttribute("aria-label", "Datum sortieren, aktuell " + (dateDirection === "none" ? "Standardsortierung" : dateDirection === "ascending" ? "aufsteigend" : "absteigend"));
    commentSort.setAttribute("aria-label", "Kommentare sortieren, aktuell " + (commentDirection === "none" ? "Standardsortierung" : commentDirection === "ascending" ? "aufsteigend" : "absteigend"));
    dateHeader.setAttribute("aria-sort", dateDirection);
    ensureDiscovery();

    while (list.firstChild) list.removeChild(list.firstChild);
    var query = text(model.query).toLocaleLowerCase();
    var all = discoveryItems();
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
    restoreDiscoveryFocus(focusState);
  }
  function storageErrorMessage(error) {
    var messages = {
      "file-too-large": "Die Datei ist größer als 1 MiB und wurde nicht gelesen.",
      "file-read-failed": "Die Datei konnte nicht gelesen werden.",
      "file-reader-unavailable": "Dateien können in diesem Browser nicht gelesen werden.",
      "invalid-json": "Die Datei enthält kein gültiges JSON.",
      "invalid-import": "Die Datei enthält keine gültigen Enhancer-Daten.",
      "unrelated-import": "Die Datei enthält keine erkennbaren Enhancer-Daten.",
      "empty-import": "Die Datei enthält keine importierbaren Daten.",
      "unsupported-version": "Diese Datenversion wird nicht unterstützt.",
      "invalid-prepared-import": "Der vorbereitete Import ist nicht mehr gültig.",
      "storage-unavailable": "Der lokale Speicher ist nicht verfügbar.",
      "storage-read-failed": "Lokale Daten konnten nicht gelesen werden.",
      "storage-write-failed": "Lokale Daten konnten nicht gespeichert werden.",
      "export-unavailable": "Der Datenexport ist in diesem Browser nicht verfügbar.",
      "export-failed": "Die Daten konnten nicht exportiert werden.",
      "prepare-import-failed": "Die Importdatei konnte nicht geprüft werden.",
      "import-failed": "Die Daten konnten nicht importiert werden.",
      "clear-visited-failed": "Der Besuchsverlauf konnte nicht gelöscht werden.",
      "mutation-failed": "Die Änderung konnte nicht gespeichert werden.",
      "storage-operation-failed": "Der lokale Speichervorgang ist fehlgeschlagen."
    };
    return messages[error] || "Der lokale Speichervorgang ist fehlgeschlagen.";
  }

  function renderData() {
    if (model.destroyed || !storageError) return;
    storageError.hidden = !model.lastError;
    storageError.textContent = model.lastError ? storageErrorMessage(model.lastError) : "";
    var pending = model.pendingImport;
    importPreview.hidden = !pending;
    if (pending) {
      var summary = pending.summary || {};
      importVisited.textContent = String(finite(summary.visited) === null ? 0 : Math.max(0, Math.floor(summary.visited)));
      importSaved.textContent = String(finite(summary.saved) === null ? 0 : Math.max(0, Math.floor(summary.saved)));
      importIgnored.textContent = String(finite(summary.ignored) === null ? 0 : Math.max(0, Math.floor(summary.ignored)));
      importProgress.textContent = String(finite(summary.progress) === null ? 0 : Math.max(0, Math.floor(summary.progress)));
    }
    clearConfirmation.hidden = !model.clearPending;
  }


  function updateTabs() {
    var available = !!currentArticle();
    var focused = shadow.activeElement;
    var articleFocusWillHide = !available && !!focused && (focused === articleTab || articleView.contains(focused));
    articleTab.hidden = !available;
    discoverTab.hidden = false;
    dataTab.hidden = false;
    if (!available && model.activeTab === "article") model.activeTab = "discover";
    discoverTab.setAttribute("aria-selected", model.activeTab === "discover" ? "true" : "false");
    articleTab.setAttribute("aria-selected", model.activeTab === "article" ? "true" : "false");
    dataTab.setAttribute("aria-selected", model.activeTab === "data" ? "true" : "false");
    discoverTab.tabIndex = model.activeTab === "discover" ? 0 : -1;
    articleTab.tabIndex = model.activeTab === "article" ? 0 : -1;
    dataTab.tabIndex = model.activeTab === "data" ? 0 : -1;
    discoverView.hidden = model.activeTab !== "discover";
    articleView.hidden = model.activeTab !== "article";
    dataView.hidden = model.activeTab !== "data";
    if (articleFocusWillHide && model.panelOpen) focusWithoutScroll(discoverTab);
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
        focusReadingTarget(entry.node);
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
    renderData();
  }

  function focusWithoutScroll(node) {
    if (!node || typeof node.focus !== "function") return;
    try {
      node.focus({ preventScroll: true });
    } catch (_) {
      node.focus();
    }
  }

  function nodeConnected(node) {
    if (!node) return false;
    if (typeof node.isConnected === "boolean") return node.isConnected;
    return !!(doc.documentElement && doc.documentElement.contains(node)) || shadow.contains(node);
  }

  function canRestoreFocus(node) {
    if (!nodeConnected(node) || typeof node.focus !== "function") return false;
    var current = node;
    while (current) {
      if (current.hidden || current.inert || current.disabled) return false;
      if (current.hasAttribute && (current.hasAttribute("hidden") || current.hasAttribute("inert") || current.hasAttribute("disabled"))) return false;
      if (current.getAttribute && String(current.getAttribute("aria-hidden") || "").toLowerCase() === "true") return false;
      if (current.nodeType === 1 && typeof global.getComputedStyle === "function") {
        var currentStyle = global.getComputedStyle(current);
        if (currentStyle && (currentStyle.display === "none" || currentStyle.visibility === "hidden" || currentStyle.visibility === "collapse")) return false;
      }
      var parent = current.parentElement;
      if (!parent && typeof current.getRootNode === "function") {
        var root = current.getRootNode();
        parent = root && root.host || null;
      }
      current = parent;
    }
    var tag = String(node.tagName || "").toUpperCase();
    if (tag === "INPUT" && String(node.type || "").toLowerCase() === "hidden") return false;
    if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return true;
    if (tag === "A" && node.hasAttribute && node.hasAttribute("href")) return true;
    if (node.isContentEditable) return true;
    return !!(node.hasAttribute && node.hasAttribute("tabindex"));
  }

  function triggerForEvent(event) {
    var active = shadow.activeElement || doc.activeElement;
    if (canRestoreFocus(active)) return active;
    var target = event && event.target;
    return canRestoreFocus(target) ? target : launcher;
  }

  function clearReadingFocusTarget() {
    var target = model.readingFocusTarget;
    var onBlur = model.readingFocusBlur;
    if (target && onBlur) target.removeEventListener("blur", onBlur);
    if (target && model.readingFocusAdded && target.getAttribute("tabindex") === "-1") target.removeAttribute("tabindex");
    model.readingFocusTarget = null;
    model.readingFocusAdded = false;
    model.readingFocusBlur = null;
  }

  function focusReadingTarget(node) {
    if (!node || typeof node.focus !== "function") return;
    clearReadingFocusTarget();
    var added = !node.hasAttribute("tabindex");
    if (added) {
      node.setAttribute("tabindex", "-1");
      var onBlur = function () {
        if (model.readingFocusTarget === node) clearReadingFocusTarget();
      };
      model.readingFocusTarget = node;
      model.readingFocusAdded = true;
      model.readingFocusBlur = onBlur;
      node.addEventListener("blur", onBlur);
    }
    focusWithoutScroll(node);
    if (added && doc.activeElement !== node) clearReadingFocusTarget();
  }

  function setOpen(open, trigger) {
    var next = !!open;
    var changed = next !== model.panelOpen;
    if (next && changed) model.openTrigger = canRestoreFocus(trigger) ? trigger : triggerForEvent(null);
    model.panelOpen = next;
    panel.hidden = !model.panelOpen;
    launcher.setAttribute("aria-expanded", model.panelOpen ? "true" : "false");
    if (model.panelOpen) {
      render();
      if (changed) focusWithoutScroll(closeButton);
    } else if (changed) {
      var restore = canRestoreFocus(model.openTrigger) ? model.openTrigger : launcher;
      model.openTrigger = null;
      focusWithoutScroll(restore);
    }
  }

  function setTab(name) {
    if (name === "data") model.activeTab = "data";
    else if (name === "article" && currentArticle()) model.activeTab = "article";
    else model.activeTab = "discover";
    updateTabs();
    if (model.panelOpen && model.activeTab === "article") renderArticle();
    if (model.panelOpen && model.activeTab === "data") renderData();
    if (model.panelOpen && model.activeTab === "discover") renderDiscovery();
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
    return { start: start, end: end, target: body };
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

  function flushProgress() {
    clearProgressTimer();
    var pending = model.progressPending;
    model.progressPending = null;
    if (!pending || model.destroyed) return;
    if (pending.value === progressFor(pending.key)) return;
    applyMutationResult(storageResult(function () { return storage.setProgress(pending.key, pending.value); }));
  }

  function onScroll() {
    var key = currentKey();
    if (!key || !currentArticle() || model.destroyed || routeIdentity() !== model.routeIdentity) return;
    var value = progressNow();
    model.progressPending = { key: key, value: value, identity: model.routeIdentity };
    clearProgressTimer();
    model.progressTimer = global.setTimeout(flushProgress, 250);
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
    focusReadingTarget(bounds.target);
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
    flushProgress();
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
      model.discoveryDirty = true;
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
    if (!key || !article || article.key !== key || model.markedEntry === model.routeEntry) return false;
    var result = storageResult(function () { return storage.markVisited(key, article.title || ""); });
    if (!applyMutationResult(result)) return false;
    model.markedEntry = model.routeEntry;
    return true;
  }

  function scan() {
    if (model.destroyed) return;
    model.generation += 1;
    invalidateRoute(routeIdentity(), false);
    var generation = model.generation;
    var page = null;
    try { page = site.extractPageArticle(doc); } catch (_) { page = null; }
    if (model.destroyed || generation > model.generation) return;
    var pageRecord = copyRecord(page, page && page.key, "page");
    model.pageArticle = pageRecord && model.routeKey && pageRecord.key === model.routeKey ? pageRecord : null;
    model.discoveryDirty = true;
    ensureDiscovery();
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
    updateTabs();
    var marked = markCurrentVisited();
    if (model.panelOpen && !marked) render();
  }

  function startRoutePolling() {
    if (model.destroyed || model.routePollTimer !== null || doc.hidden) return;
    model.routePollTimer = global.setTimeout(pollRoute, 2000);
  }

  function pollRoute() {
    model.routePollTimer = null;
    if (model.destroyed || doc.hidden) return;
    if (invalidateRoute(routeIdentity(), false)) scheduleScan();
    startRoutePolling();
  }

  function onRouteEvent() {
    if (invalidateRoute(routeIdentity(), true)) scheduleScan();
  }
  function onVisibilityChange() {
    if (doc.hidden) {
      if (model.routePollTimer !== null) {
        global.clearTimeout(model.routePollTimer);
        model.routePollTimer = null;
      }
      flushProgress();
      return;
    }
    if (invalidateRoute(routeIdentity(), false)) scheduleScan();
    startRoutePolling();
  }

  function onPagehide() {
    flushProgress();
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

  function onLauncherClick(event) { setOpen(!model.panelOpen, event.currentTarget); }
  function onCloseClick() { setOpen(false); }
  function onTabClick(event) { setTab(event.currentTarget.getAttribute("data-tab")); }
  function visibleTabs() {
    return [discoverTab, articleTab, dataTab].filter(function (tab) { return !tab.hidden; });
  }
  function onTabsKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    var availableTabs = visibleTabs();
    var currentIndex = availableTabs.indexOf(event.target);
    if (currentIndex === -1) return;
    var nextIndex;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + availableTabs.length) % availableTabs.length;
    else if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % availableTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = availableTabs.length - 1;
    else return;
    event.preventDefault();
    var nextTab = availableTabs[nextIndex];
    setTab(nextTab.getAttribute("data-tab"));
    focusWithoutScroll(nextTab);
  }
  function onSearchInput() { model.query = search.value || ""; renderDiscovery(); }
  function onScopeChange() { model.scope = scope.value === "local" ? "local" : "page"; renderDiscovery(); }
  function onFilterChange() { model.filter = filter.value || "all"; renderDiscovery(); }
  function cycleSort(field) {
    var nextSort = model.sort;
    var nextAscending = model.sortAscending;
    if (nextSort !== field) {
      nextSort = field;
      nextAscending = false;
    } else if (!nextAscending) {
      nextAscending = true;
    } else {
      nextSort = "";
      nextAscending = false;
    }
    var result = storageResult(function () {
      return storage.setPreferences({
        discoverySort: nextSort,
        discoverySortAscending: nextAscending
      });
    });
    if (!applyMutationResult(result)) {
      applySortPreference(model.snapshot);
      if (model.panelOpen) renderDiscovery();
    }
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
    var result = storageResult(function () { return storage.setPreferences({ commentSort: mode }); });
    if (!applyMutationResult(result, null, "Kommentarsortierung konnte nicht gespeichert werden.")) {
      model.commentSort = normalizeCommentMode(model.snapshot && model.snapshot.prefs && model.snapshot.prefs.commentSort);
      comments.sort(model.commentSort);
      commentSortSelect.value = model.commentSort;
      if (model.panelOpen && model.activeTab === "article") renderComments();
    }
  }


  function onExportClick() {
    if (typeof global.Blob !== "function" || !global.URL || typeof global.URL.createObjectURL !== "function") {
      setStorageError("export-unavailable");
      showToast("Export nicht verfügbar");
      return;
    }
    var url = "";
    var download = null;
    try {
      var json = storage.exportJson();
      var blob = new global.Blob([json], { type: "application/json" });
      if (model.exportUrl && typeof global.URL.revokeObjectURL === "function") global.URL.revokeObjectURL(model.exportUrl);
      url = global.URL.createObjectURL(blob);
      model.exportUrl = url;
      download = make("a");
      download.href = url;
      download.download = "derstandard-enhancer-daten.json";
      shadow.appendChild(download);
      download.click();
      shadow.removeChild(download);
    } catch (_) {
      if (download && download.parentNode) download.parentNode.removeChild(download);
      if (url && typeof global.URL.revokeObjectURL === "function") global.URL.revokeObjectURL(url);
      if (model.exportUrl === url) model.exportUrl = null;
      setStorageError("export-failed");
      showToast("Export fehlgeschlagen");
      return;
    }
    model.lastError = "";
    renderData();
    if (model.exportTimer !== null) global.clearTimeout(model.exportTimer);
    model.exportTimer = global.setTimeout(function () {
      model.exportTimer = null;
      if (typeof global.URL.revokeObjectURL === "function") global.URL.revokeObjectURL(url);
      if (model.exportUrl === url) model.exportUrl = null;
    }, 0);
    showToast("Daten exportiert");
  }

  function discardImportRead() {
    model.importGeneration += 1;
    var reader = model.importReader;
    model.importReader = null;
    if (!reader) return;
    reader.onload = null;
    reader.onerror = null;
    try {
      if (reader.readyState === 1 && typeof reader.abort === "function") reader.abort();
    } catch (_) {}
  }

  function onImportChange() {
    discardImportRead();
    model.pendingImport = null;
    model.clearPending = false;
    var file = importInput.files && importInput.files[0];
    if (!file) {
      renderData();
      return;
    }
    if (file.size > 1048576) {
      setStorageError("file-too-large");
      showToast("Import abgelehnt: Datei zu groß");
      importInput.value = "";
      return;
    }
    if (typeof global.FileReader !== "function") {
      setStorageError("file-reader-unavailable");
      importInput.value = "";
      return;
    }
    var generation = model.importGeneration;
    var reader = new global.FileReader();
    model.importReader = reader;
    reader.onload = function () {
      if (model.destroyed || model.importGeneration !== generation || model.importReader !== reader) return;
      model.importReader = null;
      reader.onload = null;
      reader.onerror = null;
      var prepared;
      try {
        prepared = storage.prepareImport(reader.result);
      } catch (_) {
        prepared = { ok: false, error: "prepare-import-failed" };
      }
      if (!prepared || prepared.ok !== true) {
        model.pendingImport = null;
        setStorageError(prepared && prepared.error ? prepared.error : "invalid-import");
        showToast("Import abgelehnt");
        importInput.value = "";
        return;
      }
      model.lastError = "";
      model.clearPending = false;
      model.pendingImport = { state: prepared.state, summary: prepared.summary };
      renderData();
      focusWithoutScroll(importCancelButton);
    };
    reader.onerror = function () {
      if (model.destroyed || model.importGeneration !== generation || model.importReader !== reader) return;
      model.importReader = null;
      reader.onload = null;
      reader.onerror = null;
      model.pendingImport = null;
      setStorageError("file-read-failed");
      importInput.value = "";
    };
    try {
      reader.readAsText(file);
    } catch (_) {
      if (model.importReader === reader) model.importReader = null;
      reader.onload = null;
      reader.onerror = null;
      setStorageError("file-read-failed");
      importInput.value = "";
    }
  }

  function onImportConfirm() {
    if (!model.pendingImport) return;
    var prepared = model.pendingImport;
    var result = storageResult(function () { return storage.importPrepared(prepared.state); }, "import-failed");
    if (!applyMutationResult(result, "Daten importiert", "Import konnte nicht gespeichert werden.")) return;
    model.pendingImport = null;
    importInput.value = "";
    renderData();
    focusWithoutScroll(importInput);
  }

  function onImportCancel() {
    discardImportRead();
    model.pendingImport = null;
    importInput.value = "";
    renderData();
    focusWithoutScroll(importInput);
  }

  function onClearClick() {
    discardImportRead();
    model.pendingImport = null;
    model.clearPending = true;
    importInput.value = "";
    renderData();
    focusWithoutScroll(clearCancelButton);
  }

  function onClearConfirm() {
    if (!model.clearPending) return;
    var result = storageResult(function () { return storage.clearVisited(); }, "clear-visited-failed");
    if (!applyMutationResult(result, "Besuchsverlauf gelöscht")) return;
    model.clearPending = false;
    renderData();
    focusWithoutScroll(clearButton);
  }

  function onClearCancel() {
    model.clearPending = false;
    renderData();
    focusWithoutScroll(clearButton);
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
      var openTrigger = triggerForEvent(event);
      event.preventDefault();
      setOpen(!model.panelOpen, openTrigger);
    } else if (key === "r") {
      var resumeTrigger = triggerForEvent(event);
      event.preventDefault();
      setOpen(true, resumeTrigger);
      setTab("article");
      resumeReading();
    }
  }

  function teardown() {
    flushProgress();
    model.destroyed = true;
    model.generation += 1;
    discardImportRead();
    clearReadingFocusTarget();
    if (model.scanTimer !== null) global.clearTimeout(model.scanTimer);
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
    dataTab.removeEventListener("click", onTabClick);
    tabs.removeEventListener("keydown", onTabsKeydown);
    search.removeEventListener("input", onSearchInput);
    scope.removeEventListener("change", onScopeChange);
    filter.removeEventListener("change", onFilterChange);
    dateSort.removeEventListener("click", onDateSort);
    commentSort.removeEventListener("click", onCommentSort);
    resumeButton.removeEventListener("click", onResumeClick);
    commentSortSelect.removeEventListener("change", onCommentOrderChange);
    exportButton.removeEventListener("click", onExportClick);
    importInput.removeEventListener("change", onImportChange);
    importConfirmButton.removeEventListener("click", onImportConfirm);
    importCancelButton.removeEventListener("click", onImportCancel);
    clearButton.removeEventListener("click", onClearClick);
    clearConfirmButton.removeEventListener("click", onClearConfirm);
    clearCancelButton.removeEventListener("click", onClearCancel);
    global.removeEventListener("scroll", onScroll);
    global.removeEventListener("popstate", onRouteEvent);
    global.removeEventListener("hashchange", onRouteEvent);
    global.removeEventListener("pagehide", onPagehide);
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    doc.removeEventListener("keydown", onKeydown);
    if (host.parentNode) host.parentNode.removeChild(host);
    global.__DSUXEnhancerController = false;
    global.DSUXEnhancerTeardown = null;
  }

  launcher.addEventListener("click", onLauncherClick);
  closeButton.addEventListener("click", onCloseClick);
  discoverTab.addEventListener("click", onTabClick);
  articleTab.addEventListener("click", onTabClick);
  dataTab.addEventListener("click", onTabClick);
  tabs.addEventListener("keydown", onTabsKeydown);
  search.addEventListener("input", onSearchInput);
  scope.addEventListener("change", onScopeChange);
  filter.addEventListener("change", onFilterChange);
  dateSort.addEventListener("click", onDateSort);
  commentSort.addEventListener("click", onCommentSort);
  resumeButton.addEventListener("click", onResumeClick);
  commentSortSelect.addEventListener("change", onCommentOrderChange);
  exportButton.addEventListener("click", onExportClick);
  importInput.addEventListener("change", onImportChange);
  importConfirmButton.addEventListener("click", onImportConfirm);
  importCancelButton.addEventListener("click", onImportCancel);
  clearButton.addEventListener("click", onClearClick);
  clearConfirmButton.addEventListener("click", onClearConfirm);
  clearCancelButton.addEventListener("click", onClearCancel);
  global.addEventListener("scroll", onScroll, { passive: true });
  global.addEventListener("popstate", onRouteEvent);
  global.addEventListener("hashchange", onRouteEvent);
  doc.addEventListener("keydown", onKeydown);

  if (typeof global.MutationObserver === "function") {
    model.observer = new global.MutationObserver(function () { scheduleScan(); });
    model.observer.observe(doc.documentElement, { childList: true, subtree: true });
  }
  global.addEventListener("pagehide", onPagehide);
  doc.addEventListener("visibilitychange", onVisibilityChange);
  model.unsubscribe = storage.subscribe(onStorageChange);
  global.DSUXEnhancerTeardown = teardown;
  scan();
  startRoutePolling();
}(typeof window !== "undefined" ? window : null));
