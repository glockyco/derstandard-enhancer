((root) => {
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
        discoverySortAscending: false,
      },
    };
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasOwn(value, key) {
    return isRecord(value) && Object.hasOwn(value, key);
  }

  function rawText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function text(value, limit) {
    return rawText(value).slice(0, limit);
  }

  function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
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
      if (root?.localStorage) return root.localStorage;
    } catch (_error) {
      // localStorage may be disabled or inaccessible.
    }
    return null;
  }

  function urlConstructor() {
    try {
      if (root && typeof root.URL === "function") return root.URL;
    } catch (_error) {
      // URL may be unavailable on a test host.
    }
    try {
      if (typeof URL === "function") return URL;
    } catch (_error) {
      // URL may be unavailable in an old browser.
    }
    return null;
  }

  function isArticleHost(hostname) {
    var host = String(hostname || "")
      .toLowerCase()
      .replace(/\.$/, "");
    return host === "derstandard.at" || host.slice(-".derstandard.at".length) === ".derstandard.at";
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
        if (
          (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
          !isArticleHost(parsed.hostname) ||
          (requireArticlePath && !isArticlePath(parsed.pathname))
        )
          return "";
        parsed.protocol = "https:";
        parsed.hostname = "derstandard.at";
        parsed.username = "";
        parsed.password = "";
        parsed.port = "";
        parsed.search = "";
        parsed.hash = "";
        var canonical = parsed.href;
        return canonical.length <= MAX_URL_LENGTH ? canonical : "";
      } catch (_error) {
        return "";
      }
    }
    var noQuery = raw.split("#")[0].split("?")[0];
    if (!/^https?:\/\/([^/?#]+)(\/[^?#]*)?$/i.test(noQuery)) return "";
    if (noQuery.slice(0, 7).toLowerCase() === "http://") noQuery = `https://${noQuery.slice(7)}`;
    var hostMatch = noQuery.match(/^https:\/\/([^/?#]+)(\/.*)?$/i);
    if (!hostMatch || !isArticleHost(hostMatch[1]) || (requireArticlePath && !isArticlePath(hostMatch[2] || "/")))
      return "";
    noQuery = `https://derstandard.at${hostMatch[2] || "/"}`;
    return noQuery.length <= MAX_URL_LENGTH ? noQuery : "";
  }

  function keyFor(value) {
    var candidate = isRecord(value) ? value.key || value.url : value;
    if (typeof candidate !== "string" || !rawText(candidate)) return "";
    var canonical = "";
    var site = null;
    var hasArticleKey = false;
    try {
      site = root?.DSUXSite;
      hasArticleKey = !!(site && typeof site.articleKey === "function");
      if (hasArticleKey) canonical = site.articleKey(rawText(candidate));
    } catch (_error) {
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
      return value.map((entry) => {
        if (Array.isArray(entry) && entry.length > 1) return [entry[0], entry[1]];
        return [isRecord(entry) ? entry.key || entry.url : "", entry];
      });
    }
    if (!isRecord(value)) return [];
    return Object.keys(value).map((key) => [key, value[key]]);
  }

  function sortAndBound(map, timeField) {
    var keys = Object.keys(map);
    keys.sort((left, right) => {
      var leftTime = map[left][timeField];
      var rightTime = map[right][timeField];
      if (rightTime !== leftTime) return rightTime - leftTime;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    var bounded = emptyMap();
    keys.slice(0, MAX_ENTRIES).forEach((key) => {
      bounded[key] = map[key];
    });
    return bounded;
  }

  function putRecord(map, ties, key, value, timeField, tie) {
    var existing = map[key];
    if (
      !existing ||
      value[timeField] > existing[timeField] ||
      (value[timeField] === existing[timeField] && tie < ties[key])
    ) {
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
    if (
      !existing ||
      value.updatedAt > existing.updatedAt ||
      (value.updatedAt === existing.updatedAt && tie < ties[key])
    ) {
      map[key] = value;
      ties[key] = tie;
      noteTime(value.updatedAt);
    }
  }

  function sourceState(input) {
    if (!isRecord(input)) return null;
    var known =
      hasOwn(input, "version") ||
      hasOwn(input, "visited") ||
      hasOwn(input, "saved") ||
      hasOwn(input, "ignored") ||
      hasOwn(input, "progress") ||
      hasOwn(input, "readingProgress") ||
      hasOwn(input, "history") ||
      hasOwn(input, "bookmarks") ||
      hasOwn(input, "prefs") ||
      hasOwn(input, "preferences");
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

    mapEntries(hasOwn(source, "visited") ? source.visited : source.history).forEach((pair) => {
      var item = pair[1];
      var object = isRecord(item) ? item : null;
      var key = keyFor(pair[0]);
      if (!key && object) key = keyFor(object.key || object.url);
      if (!key) return;
      var visitedAt = object ? timestamp(object.visitedAt) : null;
      if (visitedAt === null) visitedAt = 0;
      var title = object ? text(object.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH);
      var record = { url: key, title: title, visitedAt: visitedAt };
      var tie = `${rawText(pair[0])}\u0000${title}\u0000${key}`;
      putRecord(visited, visitedTies, key, record, "visitedAt", tie);
      if (visitedTimes[key] === undefined || visitedAt > visitedTimes[key]) visitedTimes[key] = visitedAt;
    });

    mapEntries(hasOwn(source, "saved") ? source.saved : source.bookmarks).forEach((pair) => {
      var item = pair[1];
      var object = isRecord(item) ? item : null;
      var key = keyFor(pair[0]);
      if (!key && object) key = keyFor(object.key || object.url);
      if (!key) return;
      var savedAt = object ? timestamp(object.savedAt) : null;
      if (savedAt === null) savedAt = 0;
      var title = object ? text(object.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH);
      var record = { url: key, title: title, savedAt: savedAt };
      var tie = `${rawText(pair[0])}\u0000${title}\u0000${key}`;
      putRecord(saved, savedTies, key, record, "savedAt", tie);
    });

    mapEntries(source.ignored).forEach((pair) => {
      var item = pair[1];
      var object = isRecord(item) ? item : null;
      var key = keyFor(pair[0]);
      if (!key && object) key = keyFor(object.key || object.url);
      if (!key) return;
      var ignoredAt = object ? timestamp(object.ignoredAt) : null;
      if (ignoredAt === null) ignoredAt = 0;
      var title = object ? text(object.title, MAX_TITLE_LENGTH) : text(item, MAX_TITLE_LENGTH);
      var record = { url: key, title: title, ignoredAt: ignoredAt };
      var tie = `${rawText(pair[0])}\u0000${title}\u0000${key}`;
      putRecord(ignored, ignoredTies, key, record, "ignoredAt", tie);
    });

    function collectProgress(raw, kind) {
      mapEntries(raw).forEach((pair) => {
        var key = keyFor(pair[0]);
        var object = isRecord(pair[1]) ? pair[1] : null;
        if (!key && object) key = keyFor(object.key || object.url);
        if (!key) return;
        var fallbackTime = visitedTimes[key] === undefined ? 0 : visitedTimes[key];
        var candidate = progressCandidate(pair[1], fallbackTime);
        if (!candidate) return;
        var tie = `${rawText(pair[0])}\u0000${kind}\u0000${String(candidate.value)}`;
        putProgress(progress, progressTies, key, candidate, tie);
      });
    }

    collectProgress(hasOwn(source, "progress") ? source.progress : null, "progress");
    collectProgress(source.readingProgress, "readingProgress");

    mapEntries(hasOwn(source, "visited") ? source.visited : source.history).forEach((pair) => {
      var object = isRecord(pair[1]) ? pair[1] : null;
      if (!object) return;
      var key = keyFor(pair[0]);
      if (!key) key = keyFor(object.key || object.url);
      if (!key) return;
      var nestedTime = timestamp(object.visitedAt);
      var candidate = progressCandidate(object.progress, nestedTime === null ? 0 : nestedTime);
      if (!candidate) return;
      var tie = `${rawText(pair[0])}\u0000visited\u0000${String(candidate.value)}`;
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
      if (typeof prefs.discoverySortAscending === "boolean")
        output.prefs.discoverySortAscending = prefs.discoverySortAscending;
    }
    return output;
  }

  function touchStateTimes(value) {
    var maps = [value?.visited, value?.saved, value?.ignored];
    var fields = ["visitedAt", "savedAt", "ignoredAt"];
    maps.forEach((map, index) => {
      if (!isRecord(map)) return;
      Object.keys(map).forEach((key) => {
        noteTime(timestamp(map[key]?.[fields[index]]));
      });
    });
    if (value && isRecord(value.progress))
      Object.keys(value.progress).forEach((key) => {
        noteTime(timestamp(value.progress[key]?.updatedAt));
      });
  }

  function cloneState(value) {
    return sanitizeState(value);
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  function statesEqual(left, right) {
    return stableStringify(left) === stableStringify(right);
  }

  function futureVersion(input) {
    var source = sourceState(input);
    if (!source || !hasOwn(source, "version")) return false;
    return (
      typeof source.version !== "number" || !Number.isFinite(source.version) || source.version > 2 || source.version < 1
    );
  }

  function writeState(store, value) {
    if (!store) return false;
    var serialized = stableStringify(value);
    try {
      store.setItem(STORAGE_KEY, serialized);
      return store.getItem(STORAGE_KEY) === serialized;
    } catch (_error) {
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
    } catch (_error) {
      return { ok: false, state: null, error: "storage-read-failed" };
    }
    if (sourceRaw === null) return { ok: true, state: emptyState() };

    var parsed = null;
    try {
      parsed = JSON.parse(sourceRaw);
    } catch (_error) {
      parsed = null;
    }
    if (futureVersion(parsed)) return { ok: false, state: null, error: "unsupported-version" };
    var normalized = sanitizeState(parsed);
    var serialized = stableStringify(normalized);
    var needsMigration = sourceKey !== STORAGE_KEY || sourceRaw !== serialized;
    if (needsMigration) {
      if (!writeState(store, normalized)) return { ok: false, state: null, error: "storage-write-failed" };
      LEGACY_KEYS.forEach((legacyKey) => {
        try {
          if (typeof store.removeItem === "function") store.removeItem(legacyKey);
        } catch (_error) {
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
    listeners.slice().forEach((listener) => {
      var snapshot = cloneState(state);
      try {
        listener(snapshot);
      } catch (_error) {
        /* subscriber errors are isolated */
      }
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
      error: error || null,
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
    if (context?.externalChanged) notify();
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
    return runMutation(
      () => {
        if (!isRecord(patch)) return false;
        var found = false;
        for (var index = 0; index < keys.length; index += 1) if (hasOwn(patch, keys[index])) found = true;
        return found;
      },
      (next) => {
        var commentSort = text(patch.commentSort, MAX_PREF_LENGTH);
        var discoverySort = text(patch.discoverySort, MAX_PREF_LENGTH);
        if (hasOwn(patch, "commentSort") && COMMENT_MODES[commentSort]) next.prefs.commentSort = commentSort;
        if (hasOwn(patch, "discoverySort") && (discoverySort === "" || DISCOVERY_SORTS[discoverySort]))
          next.prefs.discoverySort = discoverySort;
        if (hasOwn(patch, "discoverySortAscending") && typeof patch.discoverySortAscending === "boolean")
          next.prefs.discoverySortAscending = patch.discoverySortAscending;
      }
    );
  }

  function markVisited(url, title) {
    var key = keyFor(url);
    return runMutation(
      () => !!key,
      (next) => {
        var current = next.visited[key];
        next.visited[key] = {
          url: key,
          title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : current ? current.title : "",
          visitedAt: now(),
        };
      }
    );
  }

  function setProgress(url, value) {
    var key = keyFor(url);
    var progress = progressValue(value);
    return runMutation(
      () => !!key && progress !== null,
      (next) => {
        next.progress[key] = { value: progress, updatedAt: now() };
      }
    );
  }

  function toggleSaved(url, title) {
    var key = keyFor(url);
    return runMutation(
      () => !!key,
      (next) => {
        if (next.saved[key]) delete next.saved[key];
        else
          next.saved[key] = {
            url: key,
            title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : "",
            savedAt: now(),
          };
      }
    );
  }

  function toggleIgnored(url, title) {
    var key = keyFor(url);
    return runMutation(
      () => !!key,
      (next) => {
        if (next.ignored[key]) delete next.ignored[key];
        else
          next.ignored[key] = {
            url: key,
            title: typeof title === "string" ? text(title, MAX_TITLE_LENGTH) : "",
            ignoredAt: now(),
          };
      }
    );
  }

  function clearVisited() {
    return runMutation(null, (next) => {
      next.visited = emptyMap();
    });
  }

  function importSummary(value) {
    return {
      visited: Object.keys(value.visited).length,
      saved: Object.keys(value.saved).length,
      ignored: Object.keys(value.ignored).length,
      progress: Object.keys(value.progress).length,
    };
  }

  function hasMeaningfulData(value) {
    return (
      Object.keys(value.visited).length > 0 ||
      Object.keys(value.saved).length > 0 ||
      Object.keys(value.ignored).length > 0 ||
      Object.keys(value.progress).length > 0 ||
      value.prefs.commentSort !== "native" ||
      value.prefs.discoverySort !== "" ||
      value.prefs.discoverySortAscending !== false
    );
  }

  function prepareImport(json) {
    var parsed = json;
    if (typeof json === "string") {
      try {
        parsed = JSON.parse(json);
      } catch (_error) {
        return { ok: false, error: "invalid-json", state: null, summary: null };
      }
    }
    if (!isRecord(parsed)) return { ok: false, error: "invalid-import", state: null, summary: null };
    var source = sourceState(parsed);
    if (!source || futureVersion(source))
      return { ok: false, error: "unsupported-version", state: null, summary: null };
    var recognized =
      hasOwn(source, "version") ||
      hasOwn(source, "visited") ||
      hasOwn(source, "saved") ||
      hasOwn(source, "ignored") ||
      hasOwn(source, "progress") ||
      hasOwn(source, "readingProgress") ||
      hasOwn(source, "history") ||
      hasOwn(source, "bookmarks") ||
      hasOwn(source, "prefs") ||
      hasOwn(source, "preferences");
    if (!recognized) return { ok: false, error: "unrelated-import", state: null, summary: null };
    var normalized = sanitizeState(source);
    if (!hasMeaningfulData(normalized)) return { ok: false, error: "empty-import", state: null, summary: null };
    return { ok: true, error: null, state: cloneState(normalized), summary: importSummary(normalized) };
  }

  function validPrepared(value) {
    return (
      isRecord(value) &&
      value.version === 2 &&
      isRecord(value.visited) &&
      isRecord(value.saved) &&
      isRecord(value.ignored) &&
      isRecord(value.progress) &&
      isRecord(value.prefs) &&
      hasMeaningfulData(sanitizeState(value))
    );
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
    if (typeof callback !== "function") return () => {};
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
      try {
        parsed = JSON.parse(event.newValue);
      } catch (_error) {
        return;
      }
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
    } catch (_error) {
      // Listener removal is best effort on partial test hosts.
    }
    storageListenerAttached = false;
  }

  if (root && typeof root.addEventListener === "function") {
    try {
      root.addEventListener("storage", onStorageEvent);
      storageListenerAttached = true;
    } catch (_error) {
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
    disconnect: disconnect,
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
