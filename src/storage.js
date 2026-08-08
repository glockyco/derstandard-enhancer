(function (root) {
  "use strict";

  var STORAGE_KEY = "derstandard-enhancer-state";
  var LEGACY_KEYS = ["dsux-state-v1", "derstandard-userscript-state"];
  var MAX_ENTRIES = 500;
  var MAX_URL_LENGTH = 2048;
  var MAX_TITLE_LENGTH = 500;
  var MAX_PREF_LENGTH = 40;
  var COMMENT_MODES = { native: true, positive: true, negative: true, total: true };

  function emptyMap() {
    return Object.create(null);
  }

  function emptyState() {
    return {
      version: 1,
      visited: emptyMap(),
      saved: emptyMap(),
      ignored: emptyMap(),
      progress: emptyMap(),
      prefs: { fontScale: 1, lineWidth: "medium", commentSort: "native" }
    };
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function text(value, limit) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, limit);
  }

  function keyFor(value) {
    if (isRecord(value)) value = value.key || value.url;
    if (typeof value !== "string") return "";
    return value.trim().slice(0, MAX_URL_LENGTH);
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

  function now() {
    var value = Date.now();
    return typeof value === "number" && isFinite(value) && value >= 0 ? value : 0;
  }

  function storage() {
    try {
      if (root && root.localStorage) return root.localStorage;
    } catch (error) {
      // localStorage may be disabled or inaccessible.
    }
    return null;
  }

  function mapEntries(value) {
    if (Array.isArray(value)) {
      return value.map(function (entry) {
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

  function sanitizeState(input) {
    var source = isRecord(input) ? input : emptyState();
    if (isRecord(source.state) && !source.visited && !source.saved) source = source.state;
    var output = emptyState();
    var rawProgress = source.progress || source.readingProgress;
    mapEntries(rawProgress).forEach(function (pair) {
      var key = keyFor(pair[0]);
      var value = progressValue(pair[1]);
      if (key && value !== null) output.progress[key] = value;
    });

    var visited = emptyMap();
    mapEntries(source.visited || source.history).forEach(function (pair) {
      var item = pair[1];
      var key = keyFor(pair[0]);
      if (!key && isRecord(item)) key = keyFor(item.url);
      if (!key) return;
      var itemUrl = isRecord(item) ? text(item.url, MAX_URL_LENGTH) : "";
      var itemTitle = isRecord(item) ? text(item.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH);
      var visitedAt = isRecord(item) ? timestamp(item.visitedAt) : null;
      var itemProgress = isRecord(item) ? progressValue(item.progress) : null;
      var savedProgress = output.progress[key];
      if (itemProgress === null) itemProgress = savedProgress === undefined ? 0 : savedProgress;
      if (savedProgress === undefined) output.progress[key] = itemProgress;
      visited[key] = {
        url: itemUrl || key,
        title: itemTitle,
        visitedAt: visitedAt === null ? 0 : visitedAt,
        progress: itemProgress
      };
    });

    var saved = emptyMap();
    mapEntries(source.saved || source.bookmarks).forEach(function (pair) {
      var item = pair[1];
      var key = keyFor(pair[0]);
      if (!key && isRecord(item)) key = keyFor(item.url);
      if (!key) return;
      saved[key] = {
        url: (isRecord(item) ? text(item.url, MAX_URL_LENGTH) : "") || key,
        title: isRecord(item) ? text(item.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH),
        savedAt: isRecord(item) && timestamp(item.savedAt) !== null ? timestamp(item.savedAt) : 0
      };
    });
    var ignored = emptyMap();
    mapEntries(source.ignored).forEach(function (pair) {
      var item = pair[1];
      var key = keyFor(pair[0]);
      if (!key && isRecord(item)) key = keyFor(item.url);
      if (!key) return;
      ignored[key] = {
        url: (isRecord(item) ? text(item.url, MAX_URL_LENGTH) : "") || key,
        title: isRecord(item) ? text(item.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH),
        ignoredAt: isRecord(item) && timestamp(item.ignoredAt) !== null ? timestamp(item.ignoredAt) : 0
      };
    });

    output.ignored = sortAndBound(ignored, "ignoredAt");

    output.visited = sortAndBound(visited, "visitedAt");
    output.saved = sortAndBound(saved, "savedAt");
    var progressKeys = Object.keys(output.progress).sort();
    var boundedProgress = emptyMap();
    progressKeys.slice(0, MAX_ENTRIES).forEach(function (key) { boundedProgress[key] = output.progress[key]; });
    output.progress = boundedProgress;

    var prefs = source.prefs || source.preferences;
    if (isRecord(prefs)) {
      var scale = finiteNumber(prefs.fontScale);
      if (scale !== null && scale > 0) output.prefs.fontScale = Math.max(0.5, Math.min(2, scale));
      var lineWidth = text(prefs.lineWidth, MAX_PREF_LENGTH);
      var commentSort = text(prefs.commentSort, MAX_PREF_LENGTH);
      if (lineWidth) output.prefs.lineWidth = lineWidth;
      if (commentSort && COMMENT_MODES[commentSort]) output.prefs.commentSort = commentSort;
    }
    return output;
  }

  function cloneState(value) { return sanitizeState(value); }

  function readStored() {
    var store = storage();
    if (!store) return emptyState();
    var raw = null;
    try {
      raw = store.getItem(STORAGE_KEY);
      if (raw === null) {
        for (var index = 0; index < LEGACY_KEYS.length; index += 1) {
          raw = store.getItem(LEGACY_KEYS[index]);
          if (raw !== null) break;
        }
      }
    } catch (error) { return emptyState(); }
    if (typeof raw !== "string" || !raw) return emptyState();
    try { return sanitizeState(JSON.parse(raw)); } catch (error) { return emptyState(); }
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableStringify(value[key]);
    }).join(",") + "}";
  }

  function persist(value) {
    var store = storage();
    if (!store) return false;
    try { store.setItem(STORAGE_KEY, stableStringify(value)); return true; } catch (error) { return false; }
  }

  var state = emptyState();
  var loaded = false;
  var listeners = [];

  function ensureLoaded() {
    if (!loaded) { state = readStored(); loaded = true; }
  }

  function notify() {
    var snapshot = cloneState(state);
    listeners.slice().forEach(function (listener) {
      try { listener(snapshot); } catch (error) { /* consumer errors are isolated */ }
    });
  }

  function commit(nextState) {
    state = sanitizeState(nextState);
    loaded = true;
    persist(state);
    notify();
    return cloneState(state);
  }

  function load() {
    state = readStored();
    loaded = true;
    return cloneState(state);
  }

  function save(nextState) { return commit(nextState); }

  function markVisited(url, title) {
    ensureLoaded();
    var key = keyFor(url);
    if (!key) return cloneState(state);
    var next = cloneState(state);
    var current = next.visited[key];
    var progress = next.progress[key];
    if (progress === undefined && current) progress = progressValue(current.progress);
    if (progress === null || progress === undefined) progress = 0;
    next.progress[key] = progress;
    next.visited[key] = {
      url: text(url, MAX_URL_LENGTH) || key,
      title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : current ? current.title : "",
      visitedAt: now(),
      progress: progress
    };
    return commit(next);
  }

  function setProgress(url, value) {
    ensureLoaded();
    var key = keyFor(url);
    var progress = progressValue(value);
    if (!key || progress === null) return cloneState(state);
    var next = cloneState(state);
    next.progress[key] = progress;
    if (next.visited[key]) next.visited[key].progress = progress;
    return commit(next);
  }

  function toggleSaved(url, title) {
    ensureLoaded();
    var key = keyFor(url);
    if (!key) return false;
    var next = cloneState(state);
    var isSaved = Boolean(next.saved[key]);
    if (isSaved) delete next.saved[key];
    else next.saved[key] = { url: text(url, MAX_URL_LENGTH) || key, title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : "", savedAt: now() };
    commit(next);
    return !isSaved;
  }
  function toggleIgnored(url, title) {
    ensureLoaded();
    var key = keyFor(url);
    if (!key) return false;
    var next = cloneState(state);
    var isIgnored = Boolean(next.ignored[key]);
    if (isIgnored) {
      delete next.ignored[key];
    } else {
      var current = next.ignored[key];
      var suppliedTitle = typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : "";
      next.ignored[key] = {
        url: text(url, MAX_URL_LENGTH) || key,
        title: suppliedTitle || (current ? current.title : ""),
        ignoredAt: now()
      };
    }
    commit(next);
    return !isIgnored;
  }


  function removeVisited(url) {
    ensureLoaded();
    var key = keyFor(url);
    if (!key) return cloneState(state);
    var next = cloneState(state);
    delete next.visited[key];
    return commit(next);
  }

  function clearVisited() {
    ensureLoaded();
    var next = cloneState(state);
    next.visited = emptyMap();
    return commit(next);
  }

  function exportJson() {
    ensureLoaded();
    return stableStringify(cloneState(state));
  }

  function importJson(json) {
    var parsed;
    if (typeof json === "string") {
      try { parsed = JSON.parse(json); } catch (error) { return false; }
    } else parsed = json;
    if (!isRecord(parsed)) return false;
    return commit(sanitizeState(parsed));
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return function () {};
    listeners.push(callback);
    return function unsubscribe() {
      var index = listeners.indexOf(callback);
      if (index !== -1) listeners.splice(index, 1);
    };
  }

  root.DSUXStorage = {
    load: load,
    save: save,
    markVisited: markVisited,
    setProgress: setProgress,
    toggleSaved: toggleSaved,
    toggleIgnored: toggleIgnored,
    removeVisited: removeVisited,
    clearVisited: clearVisited,
    exportJson: exportJson,
    importJson: importJson,
    subscribe: subscribe
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
