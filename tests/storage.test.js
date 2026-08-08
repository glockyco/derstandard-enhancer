import { expect, test } from "bun:test";

const STORAGE_SOURCE = await Bun.file(new URL("../src/storage.js", import.meta.url)).text();

function makeStorage() {
  const values = new Map();
  const browser = {
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); },
      removeItem(key) { values.delete(key); },
    },
  };
  new Function("window", STORAGE_SOURCE)(browser);
  return browser.DSUXStorage;
}

test("storage export/import round trips normalized public state", () => {
  const storage = makeStorage();
  const url = "https://derstandard.at/story/123/article";
  const input = {
    visited: {
      [url]: { url, title: "  Eine Meldung  ", visitedAt: 42, progress: 0.4 },
    },
    saved: {
      [url]: { url, title: "Eine Meldung", savedAt: 41 },
    },
    progress: { [url]: 0.6 },
    prefs: { fontScale: 1.25, lineWidth: "wide", commentSort: "positive" },
  };

  expect(Boolean(storage.importJson(JSON.stringify(input)))).toBe(true);
  const exported = storage.exportJson();
  const state = JSON.parse(exported);

  expect(state.version).toBe(1);
  expect(state.visited[url]).toEqual({
    url,
    title: "Eine Meldung",
    visitedAt: 42,
    progress: 0.4,
  });
  expect(state.saved[url]).toEqual({ url, title: "Eine Meldung", savedAt: 41 });
  expect(state.progress[url]).toBe(0.6);
  expect(state.prefs).toMatchObject({ fontScale: 1.25, lineWidth: "wide", commentSort: "positive" });

  expect(Boolean(storage.importJson(exported))).toBe(true);
  expect(storage.exportJson()).toBe(exported);
});

test("storage bounds visited and progress maps to 500 entries", () => {
  const storage = makeStorage();
  const visited = {};
  const progress = {};
  for (let index = 0; index < 510; index += 1) {
    const url = `https://derstandard.at/story/${index}/article`;
    visited[url] = { url, title: `Article ${index}`, visitedAt: index, progress: index / 510 };
    progress[url] = index / 510;
  }

  expect(Boolean(storage.importJson(JSON.stringify({ visited, progress })))).toBe(true);
  const state = JSON.parse(storage.exportJson());
  const visitedKeys = Object.keys(state.visited);
  const progressKeys = Object.keys(state.progress);

  expect(visitedKeys).toHaveLength(500);
  expect(state.visited["https://derstandard.at/story/509/article"]).toBeDefined();
  expect(state.visited["https://derstandard.at/story/9/article"]).toBeUndefined();
  expect(Object.keys(state.progress).every((key) => key.startsWith("https://derstandard.at/story/"))).toBe(true);
  expect(state.progress["https://derstandard.at/story/100/article"]).toBeDefined();
  expect(progressKeys).toHaveLength(500);
});
