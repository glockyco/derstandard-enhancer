import { expect, test } from "bun:test";

const SITE_SOURCE = await Bun.file(new URL("../src/site.js", import.meta.url)).text();
const STORAGE_SOURCE = await Bun.file(new URL("../src/storage.js", import.meta.url)).text();

function makeSharedStorage() {
  const values = new Map();
  const operations = [];
  const browsers = [];
  const shared = {
    values,
    failSetItem: false,
    operations,
    set(key, value) { values.set(key, String(value)); },
    createBrowser() {
      const listeners = [];
      const browser = {
        localStorage: {
          getItem(key) { return values.has(key) ? values.get(key) : null; },
          setItem(key, value) {
            if (shared.failSetItem || shared.failSetItemKey === key) throw new Error("setItem failed");
            const oldValue = values.has(key) ? values.get(key) : null;
            operations.push(`set:${key}`);
            const newValue = String(value);
            values.set(key, newValue);
            browsers.forEach((other) => {
              if (other === browser) return;
              other.listeners.slice().forEach((listener) => listener({
                key,
                oldValue,
                newValue,
                storageArea: other.browser.localStorage,
              }));
            });
          },
          removeItem(key) {
            if (shared.failSetItem) throw new Error("removeItem failed");
            const oldValue = values.has(key) ? values.get(key) : null;
            operations.push(`remove:${key}`);
            values.delete(key);
            browsers.forEach((other) => {
              if (other === browser) return;
              other.listeners.slice().forEach((listener) => listener({
                key,
                oldValue,
                newValue: null,
                storageArea: other.browser.localStorage,
              }));
            });
          },
        },
        addEventListener(type, listener) {
          if (type === "storage" && typeof listener === "function") listeners.push(listener);
        },
        removeEventListener(type, listener) {
          if (type !== "storage") return;
          const index = listeners.indexOf(listener);
          if (index !== -1) listeners.splice(index, 1);
        },
      };
      browsers.push({ browser, listeners });
      return browser;
    },
  };
  return shared;
}

function makeStorage(shared = makeSharedStorage()) {
  const browser = shared.createBrowser();
  new Function("window", SITE_SOURCE)(browser);
  new Function("window", STORAGE_SOURCE)(browser);
  return { storage: browser.DSUXStorage, browser, shared };
}

function canonical(index) {
  return `https://derstandard.at/story/${index}/article`;
}

test("storage export/import round trips normalized v2 public state", () => {
  const { storage } = makeStorage();
  const url = "https://www.derstandard.at/story/123/article?utm_source=test";
  const key = canonical(123);
  const input = {
    version: 2,
    visited: {
      [url]: { url, title: "  Eine Meldung  ", visitedAt: 42 },
    },
    saved: {
      [url]: { url, title: "Eine Meldung", savedAt: 41 },
    },
    ignored: {},
    progress: { [url]: { value: 0.6, updatedAt: 43 } },
    prefs: { commentSort: "positive", discoverySort: "date", discoverySortAscending: true },
  };

  const prepared = storage.prepareImport(JSON.stringify(input));
  expect(prepared.ok).toBe(true);
  expect(storage.load().visited[key]).toBeUndefined();
  const imported = storage.importPrepared(prepared.state);
  expect(imported.ok).toBe(true);
  expect(imported.changed).toBe(true);

  const exported = storage.exportJson();
  const state = JSON.parse(exported);
  expect(state.version).toBe(2);
  expect(state.visited[key]).toEqual({ url: key, title: "Eine Meldung", visitedAt: 42 });
  expect(state.saved[key]).toEqual({ url: key, title: "Eine Meldung", savedAt: 41 });
  expect(state.progress[key]).toEqual({ value: 0.6, updatedAt: 43 });
  expect(state.prefs).toMatchObject({ commentSort: "positive", discoverySort: "date", discoverySortAscending: true });

  const clone = storage.load();
  clone.visited[key].title = "mutated clone";
  expect(storage.load().visited[key].title).toBe("Eine Meldung");

  expect(storage.exportJson()).toBe(exported);
});
test("public mutations expose v2 durable results and keep progress separate", () => {
  const { storage } = makeStorage();
  const url = "https://www.derstandard.at/story/12/article?utm_campaign=test";
  const key = canonical(12);

  const visited = storage.markVisited(url, "Visited");
  expect(visited).toMatchObject({ ok: true, changed: true });
  expect(visited.state.version).toBe(2);
  expect(visited.state.visited[key]).toEqual({ url: key, title: "Visited", visitedAt: expect.any(Number) });
  expect(visited.state.visited[key].progress).toBeUndefined();

  const progress = storage.setProgress(url, 0.75);
  expect(progress).toMatchObject({ ok: true, changed: true });
  expect(progress.state.progress[key]).toMatchObject({ value: 0.75, updatedAt: expect.any(Number) });
  expect(progress.state.visited[key].progress).toBeUndefined();

  const ignored = storage.toggleIgnored(url, "Ignored");
  expect(ignored).toMatchObject({ ok: true, changed: true });
  expect(ignored.state.ignored[key]).toBeDefined();

  const preferences = storage.setPreferences({ commentSort: "positive", discoverySort: "comments", discoverySortAscending: true });
  expect(preferences).toMatchObject({ ok: true, changed: true });
  expect(preferences.state.prefs).toMatchObject({ commentSort: "positive", discoverySort: "comments", discoverySortAscending: true });

  const cleared = storage.clearVisited();
  expect(cleared).toMatchObject({ ok: true, changed: true });
  expect(Object.keys(cleared.state.visited)).toHaveLength(0);
});

test("prepareImport validates without mutation and importPrepared commits separately", () => {
  const { storage } = makeStorage();
  const existing = storage.markVisited("https://derstandard.at/story/10/article", "Existing");
  const before = storage.load();
  const key = canonical(11);
  const input = {
    version: 2,
    visited: { [key]: { url: key, title: "Prepared", visitedAt: 20 } },
    saved: {},
    ignored: {},
    progress: { [key]: { value: 0.25, updatedAt: 21 } },
    prefs: { commentSort: "total", discoverySort: "date", discoverySortAscending: false },
  };

  expect(existing.ok).toBe(true);
  const prepared = storage.prepareImport(JSON.stringify(input));
  expect(prepared.ok).toBe(true);
  expect(prepared.state.version).toBe(2);
  expect(prepared.state.visited[key]).toBeDefined();
  expect(prepared.summary).toBeDefined();
  expect(storage.load()).toEqual(before);

  const committed = storage.importPrepared(prepared.state);
  expect(committed.ok).toBe(true);
  expect(committed.changed).toBe(true);
  expect(committed.state.visited[key]).toBeDefined();
  expect(storage.load().visited[key]).toBeDefined();
});

test("failed persistence returns the last durable state and does not lose mutations", () => {
  const { storage, shared } = makeStorage();
  const initial = storage.markVisited("https://derstandard.at/story/20/article", "Durable");
  expect(initial.ok).toBe(true);
  const durable = storage.load();

  shared.failSetItem = true;
  const failed = storage.setPreferences({ commentSort: "negative" });
  expect(failed.ok).toBe(false);
  expect(failed.changed).toBe(false);
  expect(failed.state).toEqual(durable);
  expect(storage.load()).toEqual(durable);
  shared.failSetItem = false;
  expect(storage.load()).toEqual(durable);
});

test("rejects malformed, unrelated, empty, and future imports without mutation", () => {
  const { storage } = makeStorage();
  expect(storage.markVisited("https://derstandard.at/story/30/article", "Keep")).toMatchObject({ ok: true });
  const before = storage.load();
  const beforeExport = storage.exportJson();
  const rejected = [
    "",
    "{not json",
    JSON.stringify({}),
    JSON.stringify({ version: 2, visited: {}, saved: {}, ignored: {}, progress: {}, prefs: {} }),
    JSON.stringify({ version: 2, unrelated: true }),
    JSON.stringify({ version: 99, visited: {}, saved: {}, ignored: {}, progress: {}, prefs: {} }),
  ];

  rejected.forEach((input) => {
    const result = storage.prepareImport(input);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.state).toBeNull();
    expect(storage.exportJson()).toBe(beforeExport);
    expect(storage.load()).toEqual(before);
  });
});

test("migrates v1 and legacy records into canonical v2 keys without nested visited progress", () => {
  const shared = makeSharedStorage();
  const oldKey = "dsux-state-v1";
  const legacyUrl = "https://www.derstandard.at/story/40/article?utm_source=old";
  const canonicalKey = canonical(40);
  shared.set(oldKey, JSON.stringify({
    version: 1,
    visited: {
      [legacyUrl]: { url: legacyUrl, title: "  Legacy title ", visitedAt: 10, progress: 0.2 },
    },
    saved: {
      ["http://derstandard.at/story/40/article?ref=old"]: { title: "Saved title", savedAt: 11 },
    },
    progress: {
      ["https://derstandard.at/story/40/article?utm_medium=old"]: { value: 0.8, updatedAt: 99 },
    },
    prefs: { commentSort: "negative", discoverySort: "comments", discoverySortAscending: true },
  }));

  const first = makeStorage(shared).storage;
  const migrated = first.load();
  const currentWrite = shared.operations.indexOf("set:derstandard-enhancer-state");
  const legacyRemove = shared.operations.indexOf("remove:dsux-state-v1");
  expect(currentWrite).toBeGreaterThanOrEqual(0);
  expect(legacyRemove).toBeGreaterThan(currentWrite);
  expect(migrated.version).toBe(2);
  expect(Object.keys(migrated.visited)).toEqual([canonicalKey]);
  expect(Object.keys(migrated.saved)).toEqual([canonicalKey]);
  expect(migrated.progress[canonicalKey]).toEqual({ value: 0.8, updatedAt: 99 });
  expect(Object.values(migrated.visited).every((item) => !Object.prototype.hasOwnProperty.call(item, "progress"))).toBe(true);
  expect(shared.values.has("derstandard-enhancer-state")).toBe(true);
  expect(shared.values.has(oldKey)).toBe(false);

  const legacyShared = makeSharedStorage();
  const legacyUrl2 = "https://derstandard.at/story/41/article?source=legacy";
  legacyShared.set("derstandard-userscript-state", JSON.stringify({
    history: { [legacyUrl2]: { url: legacyUrl2, title: "Legacy history", visitedAt: 12, progress: 0.4 } },
    bookmarks: { [legacyUrl2]: { url: legacyUrl2, title: "Legacy bookmark", savedAt: 13 } },
    readingProgress: { [legacyUrl2]: 0.4 },
  }));
  const second = makeStorage(legacyShared).storage.load();
  expect(second.version).toBe(2);
  expect(second.visited[canonical(41)]).toBeDefined();
  expect(second.saved[canonical(41)]).toBeDefined();
  expect(second.progress[canonical(41)]).toMatchObject({ value: 0.4 });
});

test("failed migration keeps the legacy record when the current key cannot be written", () => {
  const shared = makeSharedStorage();
  const legacyKey = "dsux-state-v1";
  const currentKey = "derstandard-enhancer-state";
  const legacyUrl = "https://www.derstandard.at/story/42/article?utm_source=legacy";
  const legacyRecord = JSON.stringify({
    version: 1,
    visited: {
      [legacyUrl]: { url: legacyUrl, title: "Legacy", visitedAt: 10 },
    },
  });
  shared.set(legacyKey, legacyRecord);
  shared.failSetItemKey = currentKey;

  const { storage } = makeStorage(shared);
  storage.load();

  expect(shared.values.get(legacyKey)).toBe(legacyRecord);
  expect(shared.values.has(currentKey)).toBe(false);
  expect(shared.operations).not.toContain(`remove:${legacyKey}`);
});
test("persists nested-tail livebericht canonical keys", () => {
  const { storage } = makeStorage();
  const url = "https://www.derstandard.at/jetzt/livebericht/99/segment-a/segment-b?utm_source=test";
  const key = "https://derstandard.at/jetzt/livebericht/99/segment-a/segment-b";

  expect(storage.markVisited(url, "Livebericht").ok).toBe(true);
  expect(storage.toggleSaved(url, "Livebericht").ok).toBe(true);
  expect(storage.setProgress(url, 0.4).ok).toBe(true);

  const loaded = storage.load();
  expect(loaded.visited[key]).toBeDefined();
  expect(loaded.saved[key]).toBeDefined();
  expect(loaded.progress[key]).toMatchObject({ value: 0.4 });
  expect(JSON.parse(storage.exportJson()).progress[key]).toMatchObject({ value: 0.4 });
});



test("two open instances preserve sequential saved changes and receive storage events", () => {
  const shared = makeSharedStorage();
  const first = makeStorage(shared).storage;
  const second = makeStorage(shared).storage;
  const staleInstance = makeStorage(shared);
  const stale = staleInstance.storage;
  const firstEvents = [];
  first.subscribe((state) => firstEvents.push(state));

  stale.load();
  stale.disconnect();
  const firstResult = first.toggleSaved("https://www.derstandard.at/story/50/article?utm_source=x", "First");
  expect(firstResult.ok).toBe(true);
  const secondResult = second.toggleSaved("https://www.derstandard.at/story/51/article?utm_source=x", "Second");
  expect(secondResult.ok).toBe(true);
  expect(secondResult.state.saved[canonical(50)]).toBeDefined();
  expect(secondResult.state.saved[canonical(51)]).toBeDefined();
  expect(firstEvents.length).toBeGreaterThan(0);
  expect(firstEvents[firstEvents.length - 1].saved[canonical(51)]).toBeDefined();

  const staleResult = stale.toggleSaved("https://www.derstandard.at/story/52/article?utm_source=x", "Stale");
  expect(staleResult.ok).toBe(true);
  expect(staleResult.state.saved[canonical(50)]).toBeDefined();
  expect(staleResult.state.saved[canonical(51)]).toBeDefined();
  expect(staleResult.state.saved[canonical(52)]).toBeDefined();
  const durable = makeStorage(shared).storage.load();
  expect(durable.saved[canonical(50)]).toBeDefined();
  expect(durable.saved[canonical(51)]).toBeDefined();
  expect(durable.saved[canonical(52)]).toBeDefined();

  const removed = first.toggleSaved("https://www.derstandard.at/story/50/article", "First");
  expect(removed.ok).toBe(true);
  expect(removed.state.saved[canonical(50)]).toBeUndefined();
  expect(removed.state.saved[canonical(51)]).toBeDefined();
  expect(removed.state.saved[canonical(52)]).toBeDefined();
  expect(second.load().saved[canonical(50)]).toBeUndefined();
  expect(second.load().saved[canonical(51)]).toBeDefined();
  expect(second.load().saved[canonical(52)]).toBeDefined();
});

test("retains the 501st newest progress entry and evicts the oldest", () => {
  const { storage } = makeStorage();
  const progress = {};
  for (let index = 0; index < 501; index += 1) {
    progress[canonical(index)] = { value: index / 500, updatedAt: index };
  }
  const prepared = storage.prepareImport(JSON.stringify({
    version: 2,
    visited: {},
    saved: {},
    ignored: {},
    progress,
    prefs: {},
  }));
  expect(prepared.ok).toBe(true);
  const result = storage.importPrepared(prepared.state);
  expect(result.ok).toBe(true);
  expect(Object.keys(result.state.progress)).toHaveLength(500);
  expect(result.state.progress[canonical(0)]).toBeUndefined();
  expect(result.state.progress[canonical(500)]).toEqual({ value: 1, updatedAt: 500 });
});

