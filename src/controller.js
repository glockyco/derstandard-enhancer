(function (global) {
  "use strict";
  if (!global || !global.document || global.__DSUXEnhancerController) return;
  global.__DSUXEnhancerController = true;
  var doc = global.document;
  var storage = global.DSUXStorage;
  var site = global.DSUXSite;
  var comments = global.DSUXComments;
  if (!storage || !site) {
    global.__DSUXEnhancerController = false;
    return;
  }

  var state = storage.load();
  var pageArticle = null;
  var domItems = [];
  var sortMode = "date";
  var panelOpen = false;
  var activeTab = "discover";
  var returnFocus = null;
  var scanTimer = null;
  var scrollTimer = null;
  var toastTimer = null;
  var observer = null;
  var commentsStarted = false;
  var commentHost = null;
  var commentSelect = null;
  var commentSortButton = null;
  var unsubscribe = null;
  var destroyed = false;

  function clean(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }
  function has(map, key) {
    return !!(map && key && Object.prototype.hasOwnProperty.call(map, key));
  }
  function ignored(key) {
    var canonical = site.articleKey(key);
    if (!canonical) return false;
    if (has(state.ignored, canonical)) return true;
    var records = state.ignored || {};
    return Object.keys(records).some(function (rawKey) {
      var item = records[rawKey];
      return site.articleKey((item && item.url) || rawKey) === canonical;
    });
  }
  function normalizeIgnoredForToggle(key) {
    var canonical = site.articleKey(key);
    if (!canonical || !ignored(canonical) || has(state.ignored, canonical)) return;
    var next = storage.load();
    var records = next.ignored || {};
    var changed = false;
    Object.keys(records).forEach(function (rawKey) {
      if (rawKey === canonical) return;
      var item = records[rawKey];
      if (site.articleKey((item && item.url) || rawKey) !== canonical) return;
      if (!has(records, canonical)) {
        records[canonical] = {
          url: canonical,
          title: item && item.title || "",
          ignoredAt: item && item.ignoredAt || 0
        };
      }
      delete records[rawKey];
      changed = true;
    });
    if (changed) state = storage.save(next);
  }
  function progressFor(key) {
    var value = state.progress && state.progress[key];
    return typeof value === "number" && isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  }
  function read(key) { return has(state.visited, key); }
  function pct(value) { return Math.round(Math.max(0, Math.min(1, value || 0)) * 100); }
  function currentArticle() { return !!(pageArticle && pageArticle.key); }
  function markVisited(url, title) {
    var key = site.articleKey(url);
    if (!key) return;
    var existing = state.visited && state.visited[key];
    var nextTitle = clean(title) || (existing && existing.title) || "";
    if (existing && !clean(title)) return;
    storage.markVisited(key, nextTitle);
    state = storage.load();
  }
  function pref(name, value) {
    var next = storage.load();
    next.prefs = next.prefs || {};
    if (name === "fontScale") value = Math.max(0.5, Math.min(2, Number(value) || 1));
    if (name === "lineWidth") value = value === "narrow" ? "narrow" : "medium";
    if (name === "commentSort") value = value === "positive" || value === "negative" || value === "total" ? value : "native";
    next.prefs[name] = value;
    state = storage.save(next);
  }
  function dateText(value) {
    var raw = clean(value);
    if (!raw) return "";
    var date = new Date(raw);
    if (isNaN(date.getTime())) return raw.slice(0, 40);
    try {
      return new Intl.DateTimeFormat("de-AT", { dateStyle: "medium" }).format(date);
    } catch (_) {
      return date.toLocaleDateString("de-AT");
    }
  }
  function dateValue(value) {
    var parsed = Date.parse(value || "");
    return isNaN(parsed) ? 0 : parsed;
  }
  function button(label, className) {
    var node = doc.createElement("button");
    node.type = "button";
    node.className = className || "";
    node.textContent = label;
    return node;
  }
  function titleFor(anchor) {
    var label = anchor && (anchor.getAttribute("aria-label") || anchor.getAttribute("title"));
    if (label) return clean(label);
    var cardNode = anchor && anchor.closest ? anchor.closest("article, [aria-labelledby], [class*='teaser'], li") : null;
    var heading = cardNode && cardNode.querySelector ? cardNode.querySelector("h1, h2, h3, [data-testid='headline']") : null;
    return heading ? clean(heading.textContent) : "";
  }
  function copyItem(item, source) {
    return {
      key: item.key,
      url: item.url || item.key,
      title: clean(item.title),
      subtitle: clean(item.subtitle),
      section: clean(item.section),
      publishedAt: clean(item.publishedAt),
      commentCount: item.commentCount == null ? null : item.commentCount,
      source: source || item.source || ""
    };
  }
  function appendUnique(list, seen, item, source) {
    if (!item) return;
    var key = site.articleKey(item.key || item.url);
    if (!key) return;
    var existing = seen[key];
    if (existing) {
      if (!existing.title && item.title) existing.title = clean(item.title);
      if (!existing.subtitle && item.subtitle) existing.subtitle = clean(item.subtitle);
      if (!existing.section && item.section) existing.section = clean(item.section);
      if (!existing.publishedAt && item.publishedAt) existing.publishedAt = clean(item.publishedAt);
      if (existing.commentCount == null && item.commentCount != null) existing.commentCount = item.commentCount;
      return;
    }
    var copy = copyItem(item, source);
    copy.key = key;
    copy.url = key;
    seen[key] = copy;
    list.push(copy);
  }
  function baseItems() {
    var list = [];
    if (pageArticle) list.push(pageArticle);
    domItems.forEach(function (item) { list.push(item); });
    return list;
  }
  function localRecords() {
    var list = [];
    Object.keys(state.visited || {}).forEach(function (key) {
      var item = state.visited[key];
      var itemKey = item && site.articleKey(item.url || key);
      if (!itemKey) return;
      list.push({ key: itemKey, url: itemKey, title: item.title || "", subtitle: "", section: "", publishedAt: "", commentCount: null, source: "local" });
    });
    Object.keys(state.saved || {}).forEach(function (key) {
      var item = state.saved[key];
      var itemKey = item && site.articleKey(item.url || key);
      if (!itemKey) return;
      list.push({ key: itemKey, url: itemKey, title: item.title || "", subtitle: "", section: "", publishedAt: "", commentCount: null, source: "saved" });
    });
    Object.keys(state.ignored || {}).forEach(function (key) {
      var item = state.ignored[key];
      var itemKey = item && site.articleKey(item.url || key);
      if (!itemKey) return;
      list.push({ key: itemKey, url: itemKey, title: item.title || "", subtitle: "", section: "", publishedAt: "", commentCount: null, source: "ignored" });
    });
    return list;
  }
  function items() {
    var list = [];
    var seen = Object.create(null);
    baseItems().forEach(function (item) { appendUnique(list, seen, item, item && item.source); });
    localRecords().forEach(function (item) { appendUnique(list, seen, item, item.source); });
    list.sort(function (left, right) {
      if (sortMode === "comments") {
        var leftCount = typeof left.commentCount === "number" && isFinite(left.commentCount) ? left.commentCount : -1;
        var rightCount = typeof right.commentCount === "number" && isFinite(right.commentCount) ? right.commentCount : -1;
        if (rightCount !== leftCount) return rightCount - leftCount;
      }
      var dateDifference = dateValue(right.publishedAt) - dateValue(left.publishedAt);
      if (dateDifference) return dateDifference;
      return clean(left.title).localeCompare(clean(right.title), "de");
    });
    return list;
  }

  var host = doc.createElement("div");
  host.id = "dsux-enhancer-host";
  host.setAttribute("data-dsux-enhancer", "true");
  var root;
  try {
    root = host.attachShadow({ mode: "closed" });
  } catch (_) {
    global.__DSUXEnhancerController = false;
    return;
  }
  (doc.body || doc.documentElement).appendChild(host);
  var style = doc.createElement("style");
  style.textContent = ":host{all:initial}.dsux-launcher,.dsux-panel,.dsux-toast{box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1b1b1b}.dsux-launcher{position:fixed;z-index:2147483000;right:1rem;bottom:1rem;border:1px solid #333;border-radius:999px;padding:.65rem 1rem;background:#fff;color:#111;box-shadow:0 2px 14px #0003;cursor:pointer;font-size:15px;font-weight:700}.dsux-launcher:focus-visible,.dsux-panel button:focus-visible,.dsux-panel input:focus-visible,.dsux-panel select:focus-visible,.dsux-panel a:focus-visible{outline:3px solid #005fcc;outline-offset:2px}.dsux-panel{position:fixed;z-index:2147482999;right:1rem;bottom:4.4rem;width:min(96vw,68rem);max-height:min(84vh,52rem);overflow:auto;border:1px solid #555;border-radius:.6rem;background:#fff;color:#1b1b1b;box-shadow:0 5px 30px #0005;padding:1rem}.dsux-panel-header{display:flex;align-items:center;justify-content:space-between;gap:.75rem}.dsux-panel-header h2{font-size:1.1rem;margin:0}.dsux-close{border:0;background:transparent;font-size:1.5rem;cursor:pointer}.dsux-tabs{display:flex;gap:.4rem;margin:.8rem 0}.dsux-tabs button[aria-selected='true']{font-weight:700;border-bottom:3px solid #005fcc}.dsux-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(8rem,auto);gap:.5rem;margin-bottom:.5rem}.dsux-controls input,.dsux-controls select,.dsux-controls button,.dsux-scale input,.dsux-width button,.dsux-actions button,.dsux-comment-control select{font:inherit;padding:.4rem}.dsux-controls button{grid-column:span 2}.dsux-source-label{display:block;font-weight:700;margin:.5rem 0 .2rem}.dsux-meta{display:flex;flex-wrap:wrap;gap:.4rem .8rem;color:#555;font-size:.82rem}.dsux-status{display:block;min-height:1.3em;color:#555;font-size:.85rem;margin:.25rem 0 .5rem}.dsux-table{width:100%;border-collapse:collapse;table-layout:fixed;margin:.5rem 0}.dsux-table th{text-align:left;color:#555;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.03em;padding:.35rem .45rem;border-bottom:2px solid #bbb}.dsux-table-sort{padding:0!important;border:0!important;background:transparent!important;color:inherit!important;font:inherit!important;text-transform:inherit!important;letter-spacing:inherit!important}.dsux-table-sort[aria-pressed='true']{color:#111}.dsux-table th:nth-child(1){width:auto}.dsux-table th:nth-child(2){width:6.5rem}.dsux-table th:nth-child(3){width:5rem;text-align:right}.dsux-table th:nth-child(4){width:4.5rem;text-align:center}.dsux-table th:nth-child(5){width:10rem}.dsux-table td{vertical-align:top;padding:.55rem .45rem;border-bottom:1px solid #ddd}.dsux-table td:first-child{padding-left:0}.dsux-table td:last-child{padding-right:0}.dsux-title-cell a{font-weight:700;color:#0645ad;overflow-wrap:anywhere}.dsux-row-meta{margin-top:.15rem;color:#666;font-size:.75rem}.dsux-save,.dsux-ignore{flex:0 0 auto;white-space:nowrap;padding:.2rem .35rem!important;font-size:.76rem!important}.dsux-subtitle{margin:.25rem 0;font-size:.82rem;color:#555}.dsux-badge{display:inline-block;margin-top:.25rem;color:#17621b;font-size:.75rem}.dsux-progress{height:.25rem;background:#ddd;margin-top:.35rem;border-radius:99px;overflow:hidden}.dsux-progress span{display:block;height:100%;background:#17621b}.dsux-count-cell{text-align:right;font-variant-numeric:tabular-nums}.dsux-status-cell{text-align:center;color:#17621b;font-size:1.2rem;font-weight:700}.dsux-actions-cell{display:flex;flex-wrap:nowrap;gap:.3rem;white-space:nowrap}.dsux-empty td{padding:.9rem 0;color:#555}.dsux-help{border-top:1px solid #bbb;padding-top:.7rem;font-size:.85rem}.dsux-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}.dsux-empty{padding:.9rem 0;color:#555}.dsux-article-status{font-weight:600}.dsux-article-controls{display:grid;gap:1rem}.dsux-width{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem}.dsux-width button[aria-pressed='true']{font-weight:700}.dsux-outline{border-top:1px solid #ddd;padding-top:.5rem}.dsux-outline ol{margin:.4rem 0;padding-left:1.5rem}.dsux-toast{position:fixed;z-index:2147483001;right:1rem;bottom:1rem;max-width:min(92vw,31rem);padding:.65rem .8rem;border-radius:.4rem;background:#222;color:#fff;box-shadow:0 2px 12px #0005}.dsux-comment-control{margin:.75rem 0;padding:.65rem;border:1px solid #bbb;background:#fff;color:#111;font:14px system-ui,sans-serif}.dsux-comment-control small{display:block;margin-top:.35rem;color:#555}.dsux-comment-control label{font-weight:600}.dsux-comment-control select{margin-left:.35rem}.dsux-panel{background:#f4f4f4;border-color:#888;border-radius:.25rem;box-shadow:0 8px 28px #0004;padding:1.25rem}.dsux-panel-header{padding-bottom:.75rem;border-bottom:1px solid #c5c5c5}.dsux-panel-header h2{font-size:1.25rem}.dsux-tabs{margin:.75rem 0 1rem}.dsux-tabs button,.dsux-controls input,.dsux-controls select,.dsux-controls button,.dsux-actions button{border:1px solid #999;border-radius:.2rem;background:#fff;color:#1b1b1b;font-size:.9rem}.dsux-tabs button[aria-selected='true']{background:#1b1b1b;color:#fff;border-color:#1b1b1b}.dsux-launcher{background:#1b1b1b;color:#fff;border-color:#1b1b1b}.dsux-table th{color:#333}.dsux-table td{font-size:.9rem}.dsux-table-sort{font-size:.72rem!important}@media (max-width:38rem){.dsux-panel{right:.4rem;left:.4rem;width:auto;padding:.75rem}.dsux-table th:nth-child(2),.dsux-table td:nth-child(2),.dsux-table th:nth-child(4),.dsux-table td:nth-child(4){display:none}.dsux-table th:nth-child(3){width:3.5rem}.dsux-table th:nth-child(4){width:7rem}.dsux-table th,.dsux-table td{padding:.45rem .3rem}.dsux-actions-cell{flex-direction:column}.dsux-save,.dsux-ignore{width:100%}}";
  root.appendChild(style);

  var launcher = button("Entdecken", "dsux-launcher");
  launcher.setAttribute("aria-label", "DerStandard Enhancer: Entdecken öffnen");
  launcher.setAttribute("aria-expanded", "false");
  root.appendChild(launcher);
  var panel = doc.createElement("section");
  panel.className = "dsux-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "DerStandard Enhancer");
  panel.innerHTML = "<div class='dsux-panel-header'><h2>DerStandard Enhancer</h2><button type='button' class='dsux-close' aria-label='Schließen'>×</button></div><nav class='dsux-tabs' aria-label='Enhancer-Bereiche'><button type='button' data-tab='discover' aria-selected='true'>Entdecken</button><button type='button' data-tab='article' aria-selected='false'>Artikel</button></nav><div class='dsux-view' data-view='discover'></div><div class='dsux-view' data-view='article' hidden></div>";
  root.appendChild(panel);
  var toast = doc.createElement("div");
  toast.className = "dsux-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.hidden = true;
  root.appendChild(toast);
  var discoverView = panel.querySelector("[data-view='discover']");
  var articleView = panel.querySelector("[data-view='article']");
  var discoverTab = panel.querySelector("[data-tab='discover']");
  var articleTab = panel.querySelector("[data-tab='article']");
  var search = doc.createElement("input");
  search.type = "search";
  search.placeholder = "Titel oder Bereich suchen";
  search.setAttribute("aria-label", "Titel oder Bereich suchen");
  var filter = doc.createElement("select");
  filter.setAttribute("aria-label", "Artikel filtern");
  [["all", "Alle"], ["unread", "Ungelesen"], ["read", "Gelesen"], ["saved", "Gespeichert"], ["ignored", "Ignoriert"]].forEach(function (entry) {
    var option = doc.createElement("option");
    option.value = entry[0];
    option.textContent = entry[1];
    filter.appendChild(option);
  });
  var controls = doc.createElement("div");
  controls.className = "dsux-controls";
  controls.appendChild(search);
  controls.appendChild(filter);
  discoverView.appendChild(controls);
  var table = doc.createElement("table");
  table.className = "dsux-table";
  table.setAttribute("aria-label", "Artikelübersicht");
  var thead = doc.createElement("thead");
  var headerRow = doc.createElement("tr");
  ["Artikel", "Datum", "Kommentare", "Status", "Aktionen"].forEach(function (label) {
    var th = doc.createElement("th");
    th.scope = "col";
    if (label === "Kommentare") {
      commentSortButton = button("Kommentare", "dsux-table-sort");
      commentSortButton.setAttribute("aria-pressed", "false");
      commentSortButton.setAttribute("aria-label", "Nach Kommentaren sortieren");
      commentSortButton.addEventListener("click", function onCommentSortClick() {
        sortMode = sortMode === "comments" ? "date" : "comments";
        renderDiscovery();
      });
      th.appendChild(commentSortButton);
    } else {
      th.textContent = label;
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  var list = doc.createElement("tbody");
  list.setAttribute("aria-live", "polite");
  table.appendChild(list);
  discoverView.appendChild(table);
  var help = doc.createElement("div");
  help.className = "dsux-help";
  help.innerHTML = "<strong>Lokale Daten</strong><br>Besuche, Fortschritt, Lesezeichen und ignorierte Artikel bleiben in diesem Browser. Artikeltexte werden nicht gespeichert.<div class='dsux-actions'></div>";
  discoverView.appendChild(help);
  var actions = help.querySelector(".dsux-actions");
  var exportButton = button("Daten exportieren", "");
  var importLabel = doc.createElement("label");
  importLabel.textContent = "Daten importieren";
  var importInput = doc.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.setAttribute("aria-label", "JSON-Daten importieren");
  importLabel.appendChild(importInput);
  var clear = button("Verlauf löschen", "");
  actions.appendChild(exportButton);
  actions.appendChild(importLabel);
  actions.appendChild(clear);
  articleView.innerHTML = "<p class='dsux-article-status'></p><div class='dsux-article-controls'><div class='dsux-scale'><label for='dsux-scale'>Schriftgröße <output id='dsux-scale-value'>100%</output></label><input id='dsux-scale' type='range' min='0.5' max='2' step='0.05' value='1'></div><div class='dsux-width' role='group' aria-label='Textbreite'><span>Textbreite:</span><button type='button' data-width='comfortable' aria-pressed='true'>Komfortabel</button><button type='button' data-width='narrow' aria-pressed='false'>Schmal</button></div><div class='dsux-actions'><button type='button' data-resume>Fortsetzen</button></div><div class='dsux-outline'><strong>Übersicht</strong><ol></ol></div></div>";
  var articleStatus = articleView.querySelector(".dsux-article-status");
  var articleControls = articleView.querySelector(".dsux-article-controls");
  var scaleInput = articleView.querySelector("#dsux-scale");
  var scaleOutput = articleView.querySelector("#dsux-scale-value");
  var resume = articleView.querySelector("[data-resume]");
  var outline = articleView.querySelector(".dsux-outline");
  var outlineList = outline.querySelector("ol");

  function toastMessage(message) {
    if (destroyed) return;
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer !== null) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function hideToast() { toast.hidden = true; }, 3200);
  }
  function updateDiscoverAvailability() {
    discoverTab.hidden = currentArticle();
    articleTab.hidden = !currentArticle();
    if (currentArticle() && activeTab === "discover") setTab("article");
    if (!currentArticle() && activeTab === "article") setTab("discover");
  }
  function setTab(tabName) {
    activeTab = tabName === "article" ? "article" : "discover";
    panel.querySelectorAll("[data-tab]").forEach(function (node) {
      node.setAttribute("aria-selected", node.getAttribute("data-tab") === activeTab ? "true" : "false");
    });
    discoverView.hidden = activeTab !== "discover";
    articleView.hidden = activeTab !== "article";
    if (activeTab === "article") renderArticle();
  }
  function firstPanelControl() { return panel.querySelector("button, input, select, a"); }
  function setOpen(opened, trigger) {
    var next = !!opened;
    if (next === panelOpen) {
      if (next) {
        updateDiscoverAvailability();
        renderDiscovery();
        renderArticle();
      }
      return;
    }
    if (next) {
      var active = doc.activeElement;
      returnFocus = trigger && typeof trigger.focus === "function" ? trigger : active && active !== host && typeof active.focus === "function" ? active : launcher;
      panelOpen = true;
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      renderDiscovery();
      renderArticle();
      var control = firstPanelControl();
      if (control && typeof control.focus === "function") control.focus();
    } else {
      panelOpen = false;
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      var target = returnFocus && typeof returnFocus.focus === "function" ? returnFocus : launcher;
      returnFocus = null;
      if (target && typeof target.focus === "function") target.focus();
    }
  }
  function card(item) {
    var key = site.articleKey(item.key || item.url);
    if (!key) return null;
    var row = doc.createElement("tr");
    row.className = "dsux-row";
    var titleCell = doc.createElement("td");
    titleCell.className = "dsux-title-cell";
    var link = doc.createElement("a");
    link.href = key;
    link.textContent = item.title || key;
    titleCell.appendChild(link);
    if (item.section) {
      var rowMeta = doc.createElement("div");
      rowMeta.className = "dsux-row-meta";
      rowMeta.textContent = item.section;
      titleCell.appendChild(rowMeta);
    }
    if (item.subtitle) {
      var subtitle = doc.createElement("div");
      subtitle.className = "dsux-subtitle";
      subtitle.textContent = item.subtitle;
      titleCell.appendChild(subtitle);
    }
    var value = progressFor(key);
    if (value > 0) {
      var progress = doc.createElement("div");
      progress.className = "dsux-progress";
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-label", "Lesefortschritt");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      progress.setAttribute("aria-valuenow", String(pct(value)));
      var fill = doc.createElement("span");
      fill.style.width = pct(value) + "%";
      progress.appendChild(fill);
      titleCell.appendChild(progress);
    }
    row.appendChild(titleCell);
    var dateCell = doc.createElement("td");
    dateCell.className = "dsux-date-cell";
    dateCell.textContent = item.publishedAt ? dateText(item.publishedAt) : "—";
    row.appendChild(dateCell);
    var countCell = doc.createElement("td");
    countCell.className = "dsux-count-cell";
    countCell.textContent = item.commentCount === null || item.commentCount === undefined ? "—" : String(item.commentCount);
    row.appendChild(countCell);
    var statusCell = doc.createElement("td");
    statusCell.className = "dsux-status-cell";
    var progressValue = progressFor(key);
    if (progressValue > 0) {
      var progressPercent = pct(progressValue);
      statusCell.textContent = progressPercent >= 100 ? "✓" : progressPercent + "%";
      statusCell.setAttribute("aria-label", progressPercent >= 100 ? "Gelesen" : "Lesefortschritt " + progressPercent + "%");
      statusCell.title = progressPercent >= 100 ? "Gelesen" : "Lesefortschritt " + progressPercent + "%";
    }
    row.appendChild(statusCell);
    var actionsCell = doc.createElement("td");
    actionsCell.className = "dsux-actions-cell";
    var saved = has(state.saved, key);
    var save = button(saved ? "Gespeichert" : "Speichern", "dsux-save");
    save.setAttribute("aria-pressed", saved ? "true" : "false");
    save.setAttribute("aria-label", (saved ? "Lesezeichen entfernen: " : "Speichern: ") + (item.title || key));
    save.addEventListener("click", function onSaveClick(event) {
      event.preventDefault();
      event.stopPropagation();
      storage.toggleSaved(key, item.title || "");
      state = storage.load();
      renderList();
      decorate();
      toastMessage(has(state.saved, key) ? "Gespeichert" : "Lesezeichen entfernt");
    });
    actionsCell.appendChild(save);
    var isIgnored = ignored(key);
    var ignore = button(isIgnored ? "Wiederherstellen" : "Ignorieren", "dsux-ignore");
    ignore.setAttribute("aria-pressed", isIgnored ? "true" : "false");
    ignore.setAttribute("aria-label", (isIgnored ? "Wiederherstellen: " : "Ignorieren: ") + (item.title || key));
    ignore.addEventListener("click", function onIgnoreClick(event) {
      event.preventDefault();
      event.stopPropagation();
      normalizeIgnoredForToggle(key);
      storage.toggleIgnored(key, item.title || "");
      state = storage.load();
      renderList();
      decorate();
      toastMessage(ignored(key) ? "Artikel ignoriert" : "Artikel wiederhergestellt");
    });
    actionsCell.appendChild(ignore);
    row.appendChild(actionsCell);
    return row;
  }
  function renderList() {
    while (list.firstChild) list.removeChild(list.firstChild);
    var query = clean(search.value).toLocaleLowerCase();
    var selected = filter.value || "all";
    var sourceItems = items().filter(function (item) {
      return selected === "ignored" ? ignored(item.key) : !ignored(item.key);
    });
    var result = sourceItems.filter(function (item) {
      var key = item.key;
      if (selected === "ignored" && !ignored(key)) return false;
      if (selected === "read" && !read(key)) return false;
      if (selected === "unread" && read(key)) return false;
      if (selected === "saved" && !has(state.saved, key)) return false;
      if (query && [item.title, item.subtitle, item.section, item.publishedAt, item.key].join(" ").toLocaleLowerCase().indexOf(query) === -1) return false;
      return true;
    });
    if (!result.length) {
      var empty = doc.createElement("tr");
      empty.className = "dsux-empty";
      var emptyCell = doc.createElement("td");
      emptyCell.colSpan = 5;
      if (selected === "ignored") empty.textContent = "Keine ignorierten Artikel.";
      else if (query || selected !== "all") empty.textContent = "Keine passenden Artikel.";
        else if (!sourceItems.length) empty.textContent = "Keine Artikel gefunden.";
      else empty.textContent = "Keine Artikel verfügbar.";
      emptyCell.textContent = empty.textContent;
      empty.textContent = "";
      empty.appendChild(emptyCell);
      list.appendChild(empty);
      return;
    }
    result.forEach(function (item) {
      var node = card(item);
      if (node) list.appendChild(node);
    });
  }
  function renderDiscovery() {
    if (commentSortButton) {
      commentSortButton.textContent = sortMode === "comments" ? "Kommentare ↓" : "Kommentare";
      commentSortButton.setAttribute("aria-pressed", sortMode === "comments" ? "true" : "false");
    }
    renderList();
  }
  function reduced() {
    try {
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (_) {
      return false;
    }
  }
  function renderOutline() {
    while (outlineList.firstChild) outlineList.removeChild(outlineList.firstChild);
    if (!currentArticle()) {
      outline.hidden = true;
      return;
    }
    var article = doc.querySelector("article.story-article");
    var headings = article ? article.querySelectorAll("h2,h3") : [];
    outline.hidden = !headings.length;
    for (var i = 0; i < headings.length; i += 1) {
      var heading = headings[i];
      var label = clean(heading.textContent);
      if (!label) continue;
      if (!heading.id) {
        heading.id = "dsux-outline-" + i;
        heading.setAttribute("data-dsux-outline-id", "true");
      }
      var li = doc.createElement("li");
      if (String(heading.tagName).toLowerCase() === "h3") li.style.listStyleType = "circle";
      var link = doc.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = label;
      link.addEventListener("click", function onOutlineClick(event) {
        event.preventDefault();
        var target = doc.getElementById(event.currentTarget.getAttribute("href").slice(1));
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
      });
      li.appendChild(link);
      outlineList.appendChild(li);
    }
  }
  function renderArticle() {
    if (!currentArticle()) {
      articleStatus.textContent = "Auf einer Artikelseite stehen Schriftgröße, Breite und Fortsetzen zur Verfügung.";
      articleControls.hidden = true;
      renderOutline();
      return;
    }
    articleControls.hidden = false;
    var value = progressFor(pageArticle.key);
    articleStatus.textContent = (pageArticle.title || "Artikel") + " · " + pct(value) + "% gelesen";
    scaleInput.value = String(state.prefs && state.prefs.fontScale || 1);
    scaleOutput.textContent = pct(Number(scaleInput.value) || 1) + "%";
    var width = state.prefs && state.prefs.lineWidth === "narrow" ? "narrow" : "medium";
    articleView.querySelectorAll("[data-width]").forEach(function (node) {
      var selected = node.getAttribute("data-width") === "narrow" ? width === "narrow" : width === "medium";
      node.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    resume.disabled = value < 0.02 || value > 0.98;
    resume.textContent = value > 0.98 ? "Am Ende" : "Fortsetzen";
    renderOutline();
  }
  function applyArticle() {
    var article = doc.querySelector("article.story-article");
    if (!article || !currentArticle()) return;
    var scale = Number(state.prefs && state.prefs.fontScale) || 1;
    var width = state.prefs && state.prefs.lineWidth === "narrow" ? "narrow" : "medium";
    article.setAttribute("data-dsux-enhanced", "true");
    article.setAttribute("data-dsux-line-width", width);
    article.style.setProperty("--dsux-font-scale", String(scale));
    article.style.setProperty("--dsux-content-width", width === "narrow" ? "55ch" : "75ch");
    scaleInput.value = String(scale);
    scaleOutput.textContent = pct(scale) + "%";
  }
  function resumeReading() {
    if (!currentArticle()) return;
    var value = progressFor(pageArticle.key);
    if (value < 0.02 || value > 0.98) {
      toastMessage("Kein gespeicherter Fortsetzpunkt");
      return;
    }
    var max = Math.max(0, doc.documentElement.scrollHeight - global.innerHeight);
    if (global.scrollTo) global.scrollTo({ top: max * value, behavior: reduced() ? "auto" : "smooth" });
  }
  function scrollProgress() {
    var article = doc.querySelector("article.story-article");
    var start = article ? article.getBoundingClientRect().top + (global.pageYOffset || doc.documentElement.scrollTop || 0) : 0;
    var body = article && article.querySelector(".article-body, .article-content, [data-testid='article-body']");
    var forum = doc.querySelector("#forum, dst-forum");
    var articleEnd = body ? body.getBoundingClientRect().bottom + (global.pageYOffset || doc.documentElement.scrollTop || 0) : article ? article.getBoundingClientRect().bottom + (global.pageYOffset || doc.documentElement.scrollTop || 0) : 0;
    var forumStart = forum ? forum.getBoundingClientRect().top + (global.pageYOffset || doc.documentElement.scrollTop || 0) : 0;
    var end = forumStart > start ? forumStart : articleEnd;
    var range = Math.max(0, end - start);
    var viewportBottom = (global.pageYOffset || doc.documentElement.scrollTop || 0) + global.innerHeight;
    return range ? Math.max(0, Math.min(1, (viewportBottom - start) / range)) : 0;
  }
  function saveScroll() {
    scrollTimer = null;
    if (currentArticle()) {
      storage.setProgress(pageArticle.key, scrollProgress());
      state = storage.load();
      if (panelOpen && activeTab === "article") renderArticle();
    }
  }
  function onScroll() {
    if (currentArticle() && scrollTimer === null) scrollTimer = global.setTimeout(saveScroll, 250);
  }
  function decorate() {
    var old = doc.querySelectorAll("[data-dsux-decoration='true']");
    for (var oldIndex = 0; oldIndex < old.length; oldIndex += 1) {
      old[oldIndex].classList.remove("dsux-card-read");
      old[oldIndex].removeAttribute("data-dsux-progress");
    }
    var links = doc.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i += 1) {
      var key = site.articleKey(links[i].href || links[i].getAttribute("href"));
      if (!key) continue;
      var cardNode = links[i].closest ? links[i].closest("article,[aria-labelledby],[class*='teaser'],li") : null;
      if (!cardNode || cardNode === host) continue;
      cardNode.setAttribute("data-dsux-decoration", "true");
      cardNode.classList.toggle("dsux-card-read", read(key));
      var value = progressFor(key);
      if (value > 0) cardNode.setAttribute("data-dsux-progress", String(pct(value)));
    }
  }
  function visibleRatingNode(node) {
    var current = node;
    while (current && current.nodeType === 1) {
      if (!current.getAttribute) return false;
      if (current.hidden || current.getAttribute("aria-hidden") === "true") return false;
      var inline = current.getAttribute("style") || "";
      if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(inline)) return false;
      var view = current.ownerDocument && current.ownerDocument.defaultView;
      if (view && typeof view.getComputedStyle === "function") {
        var computed = view.getComputedStyle(current);
        if (computed && (computed.display === "none" || computed.visibility === "hidden" || computed.visibility === "collapse" || computed.opacity === "0")) return false;
      }
      current = current.parentElement;
    }
    return !!node;
  }
  function validRatingValue(value) { return typeof value === "string" && /^[+]?\d+$/.test(value.trim()); }
  function hasRatingAttributes(node) {
    return !!(node && node.getAttribute && ((validRatingValue(node.getAttribute("positiveratings")) || validRatingValue(node.getAttribute("negativeratings")))));
  }
  function ratingsAvailable() {
    var hosts = doc.querySelectorAll("dst-forum");
    for (var i = 0; i < hosts.length; i += 1) {
      var shadow = hosts[i].shadowRoot;
      if (!shadow || !shadow.querySelectorAll) continue;
      var logs = shadow.querySelectorAll("dst-posting--ratinglog");
      for (var j = 0; j < logs.length; j += 1) {
        if (!visibleRatingNode(logs[j])) continue;
        if (hasRatingAttributes(logs[j])) return true;
        var descendants = logs[j].querySelectorAll("[positiveratings],[negativeratings]");
        for (var k = 0; k < descendants.length; k += 1) if (visibleRatingNode(descendants[k]) && hasRatingAttributes(descendants[k])) return true;
      }
      var postings = shadow.querySelectorAll("dst-posting");
      for (var p = 0; p < postings.length; p += 1) if (visibleRatingNode(postings[p]) && hasRatingAttributes(postings[p])) return true;
    }
    return false;
  }
  function removeCommentControl() {
    if (commentHost && commentHost.parentNode) commentHost.parentNode.removeChild(commentHost);
    commentHost = null;
    commentSelect = null;
  }
  function commentControl() {
    if (!ratingsAvailable()) {
      removeCommentControl();
      return;
    }
    if (commentHost) return;
    var forum = doc.querySelector("#forum");
    var hostNode = doc.querySelector("dst-forum");
    var anchor = forum || hostNode;
    if (!anchor || !anchor.parentNode) return;
    commentHost = doc.createElement("div");
    commentHost.className = "dsux-comment-control";
    commentHost.style.cssText = "display:flex;align-items:center;gap:.5rem;margin:.75rem 0;padding:.55rem .65rem;border:1px solid #bbb;background:#fff;color:#111;font:14px system-ui,sans-serif";
    commentHost.id = "dsux-comment-control";
    var label = doc.createElement("label");
    label.htmlFor = "dsux-comment-sort";
    label.textContent = "Sortieren";
    var select = doc.createElement("select");
    commentSelect = select;
    select.id = "dsux-comment-sort";
    [["native", "Standard"], ["positive", "Positive Bewertungen"], ["negative", "Negative Bewertungen"], ["total", "Gesamtbewertungen"]].forEach(function (entry) {
      var option = doc.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      select.appendChild(option);
    });
    select.value = state.prefs && state.prefs.commentSort || "native";
    commentHost.appendChild(label);
    commentHost.appendChild(select);
    anchor.parentNode.insertBefore(commentHost, anchor);
    select.addEventListener("change", onCommentSortChange);
    if (comments && comments.sort) comments.sort(select.value);
  }
  function onCommentSortChange() {
    var mode = commentSelect && commentSelect.value;
    mode = mode === "positive" || mode === "negative" || mode === "total" ? mode : "native";
    pref("commentSort", mode);
    if (comments && comments.sort) comments.sort(mode);
  }
  function onCommentChange(payload) {
    if (payload && payload.available && ratingsAvailable()) commentControl();
    else if (!ratingsAvailable()) {
      if (comments && comments.sort) comments.sort("native");
      removeCommentControl();
    }
  }
  function startComments() {
    if (!comments || commentsStarted) return;
    commentsStarted = true;
    comments.init(onCommentChange);
    if (ratingsAvailable()) commentControl();
    else if (comments.sort) comments.sort("native");
  }
  function stopComments() {
    if (commentsStarted && comments && comments.sort) comments.sort("native");
    if (commentsStarted && comments && comments.disconnect) comments.disconnect();
    commentsStarted = false;
    removeCommentControl();
  }
  function scan() {
    if (destroyed) return;
    pageArticle = site.extractPageArticle(doc);
    domItems = site.extractArticles(doc);
    updateDiscoverAvailability();
    if (pageArticle) {
      markVisited(pageArticle.key, pageArticle.title);
      applyArticle();
      startComments();
    } else {
      stopComments();
    }
    decorate();
    if (panelOpen) {
      renderDiscovery();
      renderArticle();
    }
  }
  function schedule() {
    if (scanTimer !== null) global.clearTimeout(scanTimer);
    scanTimer = global.setTimeout(function runScan() {
      scanTimer = null;
      scan();
    }, 180);
  }
  function onLauncherClick() { setOpen(!panelOpen, launcher); }
  function onCloseClick() { setOpen(false); }
  function onTabClick(event) { setTab(event.currentTarget.getAttribute("data-tab")); }
  function onSearchInput() { renderList(); }
  function onFilterChange() { renderList(); }
  function onScaleInput() {
    pref("fontScale", scaleInput.value);
    applyArticle();
    renderArticle();
  }
  function onWidthClick(event) {
    pref("lineWidth", event.currentTarget.getAttribute("data-width") === "narrow" ? "narrow" : "medium");
    applyArticle();
    renderArticle();
  }
  function onResumeClick() { resumeReading(); }
  function onExportClick() {
    var blob = new Blob([storage.exportJson()], { type: "application/json" });
    var url = global.URL.createObjectURL(blob);
    var link = doc.createElement("a");
    link.href = url;
    link.download = "derstandard-enhancer-daten.json";
    link.click();
    global.setTimeout(function revokeExportUrl() { global.URL.revokeObjectURL(url); }, 0);
    toastMessage("Daten exportiert");
  }
  function onImportChange() {
    var file = importInput.files && importInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function onImportLoad() {
      if (storage.importJson(reader.result)) {
        state = storage.load();
        renderDiscovery();
        renderArticle();
        decorate();
        toastMessage("Daten importiert");
      } else toastMessage("Import abgelehnt: ungültige JSON-Daten");
      importInput.value = "";
    };
    reader.readAsText(file);
  }
  function onClearClick() {
    if (!global.confirm || global.confirm("Den lokalen Verlauf löschen? Lesefortschritt und gespeicherte Artikel bleiben erhalten. Ignorierte Artikel bleiben getrennt erhalten, bis sie wiederhergestellt oder über importierte lokale Daten entfernt werden.")) {
      storage.clearVisited();
      state = storage.load();
      renderDiscovery();
      renderArticle();
      decorate();
      toastMessage("Besuchsverlauf gelöscht; Fortschritt, Lesezeichen und ignorierte Artikel bleiben erhalten");
    }
  }
  function onDocumentClick(event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor || host.contains(anchor)) return;
    var key = site.articleKey(anchor.href || anchor.getAttribute("href"));
    if (key) {
      markVisited(key, titleFor(anchor));
      decorate();
    }
  }
  function onKeydown(event) {
    if (event.key === "Escape" && panelOpen) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!event.altKey || !event.shiftKey) return;
    if (String(event.key).toLowerCase() === "o") {
      event.preventDefault();
      setOpen(!panelOpen);
    } else if (String(event.key).toLowerCase() === "r") {
      event.preventDefault();
      setOpen(true);
      setTab("article");
      resumeReading();
    }
  }
  function onStorageChange(next) {
    state = next;
    var mode = state.prefs && state.prefs.commentSort;
    mode = mode === "positive" || mode === "negative" || mode === "total" ? mode : "native";
    if (commentSelect) commentSelect.value = mode;
    if (commentsStarted && comments && comments.sort && ratingsAvailable()) comments.sort(mode);
    applyArticle();
    decorate();
    if (panelOpen) {
      renderDiscovery();
      renderArticle();
    }
  }
  function cleanupPageDecorations() {
    var enhanced = doc.querySelectorAll("article.story-article[data-dsux-enhanced]");
    for (var i = 0; i < enhanced.length; i += 1) {
      enhanced[i].removeAttribute("data-dsux-enhanced");
      enhanced[i].removeAttribute("data-dsux-line-width");
      enhanced[i].style.removeProperty("--dsux-font-scale");
      enhanced[i].style.removeProperty("--dsux-content-width");
    }
    var decorated = doc.querySelectorAll("[data-dsux-decoration='true']");
    for (var j = 0; j < decorated.length; j += 1) {
      decorated[j].classList.remove("dsux-card-read");
      decorated[j].removeAttribute("data-dsux-progress");
      decorated[j].removeAttribute("data-dsux-decoration");
    }
    var generated = doc.querySelectorAll("[data-dsux-outline-id='true']");
    for (var k = 0; k < generated.length; k += 1) {
      generated[k].removeAttribute("id");
      generated[k].removeAttribute("data-dsux-outline-id");
    }
  }
  function teardown() {
    if (destroyed) return;
    destroyed = true;
    if (scanTimer !== null) global.clearTimeout(scanTimer);
    if (scrollTimer !== null) global.clearTimeout(scrollTimer);
    if (toastTimer !== null) global.clearTimeout(toastTimer);
    if (observer && observer.disconnect) observer.disconnect();
    if (unsubscribe) unsubscribe();
    stopComments();
    global.removeEventListener("scroll", onScroll);
    global.removeEventListener("popstate", schedule);
    doc.removeEventListener("click", onDocumentClick);
    doc.removeEventListener("keydown", onKeydown);
    launcher.removeEventListener("click", onLauncherClick);
    panel.querySelector(".dsux-close").removeEventListener("click", onCloseClick);
    panel.querySelectorAll("[data-tab]").forEach(function (node) { node.removeEventListener("click", onTabClick); });
    search.removeEventListener("input", onSearchInput);
    filter.removeEventListener("change", onFilterChange);
    scaleInput.removeEventListener("input", onScaleInput);
    articleView.querySelectorAll("[data-width]").forEach(function (node) { node.removeEventListener("click", onWidthClick); });
    resume.removeEventListener("click", onResumeClick);
    exportButton.removeEventListener("click", onExportClick);
    importInput.removeEventListener("change", onImportChange);
    clear.removeEventListener("click", onClearClick);
    cleanupPageDecorations();
    if (style.parentNode) style.parentNode.removeChild(style);
    if (host.parentNode) host.parentNode.removeChild(host);
    global.__DSUXEnhancerController = false;
    global.DSUXEnhancerTeardown = null;
  }

  launcher.addEventListener("click", onLauncherClick);
  panel.querySelector(".dsux-close").addEventListener("click", onCloseClick);
  panel.querySelectorAll("[data-tab]").forEach(function (node) { node.addEventListener("click", onTabClick); });
  search.addEventListener("input", onSearchInput);
  filter.addEventListener("change", onFilterChange);
  scaleInput.addEventListener("input", onScaleInput);
  articleView.querySelectorAll("[data-width]").forEach(function (node) { node.addEventListener("click", onWidthClick); });
  resume.addEventListener("click", onResumeClick);
  exportButton.addEventListener("click", onExportClick);
  importInput.addEventListener("change", onImportChange);
  clear.addEventListener("click", onClearClick);
  doc.addEventListener("click", onDocumentClick);
  global.addEventListener("scroll", onScroll, { passive: true });
  global.addEventListener("popstate", schedule);
  doc.addEventListener("keydown", onKeydown);
  if (typeof global.MutationObserver === "function") {
    observer = new global.MutationObserver(schedule);
    observer.observe(doc.documentElement || doc, { childList: true, subtree: true });
  }
  unsubscribe = storage.subscribe(onStorageChange);
  var pageStyle = doc.createElement("style");
  pageStyle.id = "dsux-enhancer-page-style";
  pageStyle.textContent = "article.story-article[data-dsux-enhanced] .article-body,article.story-article[data-dsux-enhanced] .article-content,article.story-article[data-dsux-enhanced] [data-testid='article-body']{font-size:calc(1em * var(--dsux-font-scale,1));max-width:var(--dsux-content-width,none)}[data-dsux-decoration='true'].dsux-card-read::after{content:' · gelesen';color:#17621b;font-size:.8em}[data-dsux-decoration='true'][data-dsux-progress]::before{content:'Lesefortschritt ' attr(data-dsux-progress) '%';display:block;color:#555;font-size:.75em}";
  (doc.head || doc.documentElement).appendChild(pageStyle);
  global.DSUXEnhancerTeardown = teardown;
  scan();

}(typeof window !== "undefined" ? window : null));
