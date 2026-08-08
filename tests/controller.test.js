import { expect, test } from "@playwright/test";
import path from "node:path";

const ROOT = process.cwd();
const GENERATED_PATH = path.join(ROOT, "derstandard-enhancer.user.js");
const SOURCE_PATHS = ["src/site.js", "src/storage.js", "src/comments.js", "src/controller.js"].map((file) => path.join(ROOT, file));

const FIXTURE_HTML = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <link rel="canonical" href="https://www.derstandard.at/">
  </head>
  <body data-fixture-marker="unchanged">
    <main id="fixture-content">
      <article class="teaser" data-section="Politik">
        <a href="https://www.derstandard.at/story/123/erste-meldung"><h3 class="teaser-title">Erste Meldung</h3></a>
        <span class="teaser-postingcount">1.234 Kommentare</span>
        <dst-rl-timestamp date="2025-01-02"></dst-rl-timestamp>
      </article>
      <article class="teaser" data-section="Wirtschaft">
        <a href="https://www.derstandard.at/story/456/zweite-meldung"><h3 class="teaser-title">Zweite Meldung</h3></a>
        <span class="teaser-postingcount">7 Kommentare</span>
        <dst-rl-timestamp date="2025-01-03"></dst-rl-timestamp>
      </article>
    </main>
  </body>
</html>`;
const ARTICLE_URL = "https://www.derstandard.at/story/789/leseprobe";
const ARTICLE_KEY = "https://derstandard.at/story/789/leseprobe";
const ARTICLE_HTML = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <link rel="canonical" href="${ARTICLE_URL}">
    <style>
      html, body { margin: 0; padding: 0; }
      .article-body { height: 2400px; }
    </style>
  </head>
  <body>
    <article class="story-article">
      <h1 class="article-title">Eine Leseprobe</h1>
      <div class="article-body">
        <h2>Einordnung</h2>
        <p>Dieser Artikel dient als deterministische Browser-Fixture für den Lesefortschritt.</p>
      </div>
    </article>
  </body>
</html>`;
const COMMENT_ARTICLE_HTML = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <link rel="canonical" href="${ARTICLE_URL}">
  </head>
  <body>
    <article class="story-article">
      <h1 class="article-title">Forum-Leseprobe</h1>
      <p>Artikeltext mit Forum.</p>
    </article>
    <div id="publisher-controls">Publisher controls</div>
    <dst-forum id="fixture-forum"></dst-forum>
    <script>
      const forum = document.getElementById("fixture-forum");
      const root = forum.attachShadow({ mode: "open" });
      root.innerHTML = \`
        <section id="forum">
          <main class="forum--main">
            <div id="publisher-slot-before">Publisher slot before</div>
            <dst-posting id="low" data-level="0" positiveratings="1" negativeratings="0">Low</dst-posting>
            <div id="publisher-slot-middle">Publisher slot middle</div>
            <dst-posting id="high" data-level="0" positiveratings="9" negativeratings="1">High</dst-posting>
            <dst-posting id="medium" data-level="0" positiveratings="5" negativeratings="0">Medium</dst-posting>
          </main>
        </section>\`;
    </script>
  </body>
</html>`;

const HOME_URL = "https://www.derstandard.at/";


async function fixture(page, { html = FIXTURE_HTML, url = HOME_URL } = {}) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: html,
    });
  });

  await page.goto(url);
}

async function installEnhancer(page, useGenerated = false) {
  const paths = useGenerated ? [GENERATED_PATH] : SOURCE_PATHS;
  for (const file of paths) await page.addScriptTag({ path: file });
  // addScriptTag is test setup; remove its tags so page-mutation assertions cover the product only.
  await page.evaluate(() => document.querySelectorAll("script").forEach((node) => node.remove()));
  await expect(page.locator("html > div")).toHaveCount(1);
}

function host(page) {
  return page.locator("html > div").first();
}
test("generated comments module sorts an article forum inside the enhancer panel and restores native order", async ({ page }) => {
  await fixture(page, { html: COMMENT_ARTICLE_HTML, url: ARTICLE_URL });
  await page.evaluate(() => window.localStorage.clear());
  await installEnhancer(page, true);

  expect(await page.evaluate(() => typeof window.DSUXComments)).toBe("object");
  const nativeOrder = async () => page.evaluate(() => {
    const forum = document.querySelector("#fixture-forum");
    const main = forum && forum.shadowRoot && forum.shadowRoot.querySelector("section#forum main.forum--main");
    return main ? Array.from(main.querySelectorAll("dst-posting[data-level='0']")).map((node) => node.id) : [];
  });
  const forumMainChildSequence = async () => page.evaluate(() => {
    const forum = document.querySelector("#fixture-forum");
    const main = forum && forum.shadowRoot && forum.shadowRoot.querySelector("section#forum main.forum--main");
    return main ? Array.from(main.childNodes).map((node) => ({
      nodeType: node.nodeType,
      nodeName: node.nodeName,
      value: node.nodeType === Node.ELEMENT_NODE ? node.outerHTML : node.nodeValue,
    })) : [];
  });
  await expect.poll(nativeOrder).toEqual(["low", "high", "medium"]);
  const nativeChildren = await forumMainChildSequence();

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await expect(enhancer.locator(".dsux-comment-sort")).toBeHidden();
  await enhancer.locator('[data-tab="article"]').click();
  const select = enhancer.locator(".dsux-comment-sort");
  await expect(select).toHaveCount(1);
  await expect(enhancer.locator(".dsux-comment-status")).toContainText("3");
  expect(await page.evaluate(() => {
    const forum = document.querySelector("#fixture-forum");
    const enhancerShadow = document.querySelector("html > div")?.shadowRoot;
    const controls = ".dsux-comment-sort, .dsux-comment-status";
    return {
      pageLightDom: document.querySelectorAll(controls).length,
      forumShadowRoot: forum?.shadowRoot?.querySelectorAll(controls).length || 0,
      enhancerSort: enhancerShadow?.querySelectorAll(".dsux-comment-sort").length || 0,
      enhancerStatus: enhancerShadow?.querySelectorAll(".dsux-comment-status").length || 0,
    };
  })).toEqual({
    pageLightDom: 0,
    forumShadowRoot: 0,
    enhancerSort: 1,
    enhancerStatus: 1,
  });

  await select.selectOption("positive");
  await expect.poll(nativeOrder).toEqual(["high", "medium", "low"]);
  await expect.poll(async () => page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state") || "{}");
    return state.prefs && state.prefs.commentSort;
  })).toBe("positive");

  await page.evaluate(() => window.DSUXEnhancerTeardown());
  await expect(page.locator("html > div")).toHaveCount(0);
  await expect.poll(nativeOrder).toEqual(["low", "high", "medium"]);
  await expect.poll(forumMainChildSequence).toEqual(nativeChildren);
  expect(await page.evaluate(() => window.DSUXComments.currentMode())).toBe("positive");

  await installEnhancer(page, true);
  const reinjectedEnhancer = host(page);
  await reinjectedEnhancer.locator(".dsux-launcher").click();
  await reinjectedEnhancer.locator('[data-tab="article"]').click();
  const persistedSelect = reinjectedEnhancer.locator(".dsux-comment-sort");
  await expect(persistedSelect).toHaveValue("positive");
  await expect.poll(nativeOrder).toEqual(["high", "medium", "low"]);

  await page.evaluate(() => window.DSUXEnhancerTeardown());
  await expect(page.locator("html > div")).toHaveCount(0);
  await expect.poll(nativeOrder).toEqual(["low", "high", "medium"]);
  await expect.poll(forumMainChildSequence).toEqual(nativeChildren);
});

test("generated distribution renders one shadow host and default discovery", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page, true);

  const enhancer = host(page);
  await expect(enhancer.locator(".dsux-launcher")).toHaveCount(1);
  await enhancer.locator(".dsux-launcher").click();
  await expect(enhancer.locator(".dsux-panel")).toBeVisible();
  await expect(enhancer.locator(".dsux-table tbody tr")).toHaveCount(2);
  await expect(enhancer.locator(".dsux-table tbody")).toContainText("Erste Meldung");
  await expect(enhancer.locator(".dsux-table tbody")).toContainText("Zweite Meldung");
});

test("source modules open, close, and restore focus through Escape", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);
  expect(await page.evaluate(() => typeof window.DSUXComments)).toBe("object");

  const enhancer = host(page);
  const launcher = enhancer.locator(".dsux-launcher");
  const close = enhancer.locator(".dsux-close");
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
  await launcher.click();
  await expect(enhancer.locator(".dsux-panel")).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(enhancer.locator(".dsux-panel")).toBeHidden();
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
  await expect(launcher).toBeFocused();
});

test("teardown removes the host and permits clean reinjection", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);
  await page.evaluate(() => window.DSUXEnhancerTeardown());
  await expect(page.locator("html > div")).toHaveCount(0);

  await installEnhancer(page);
  await expect(page.locator("html > div")).toHaveCount(1);
});

test("controller leaves fixture markup and attributes unchanged outside its host", async ({ page }) => {
  await fixture(page);
  const before = await page.evaluate(() => ({
    body: document.body.outerHTML,
    htmlAttributes: Array.from(document.documentElement.attributes).map((attribute) => [attribute.name, attribute.value]),
    htmlChildren: Array.from(document.documentElement.children).map((node) => node.outerHTML),
  }));

  await installEnhancer(page, true);
  const after = await page.evaluate(() => {
    const hostNode = Array.from(document.documentElement.children).find((node) => node.shadowRoot && node.shadowRoot.querySelector(".dsux-launcher"));
    return {
      body: document.body.outerHTML,
      htmlAttributes: Array.from(document.documentElement.attributes).map((attribute) => [attribute.name, attribute.value]),
      htmlChildren: Array.from(document.documentElement.children).filter((node) => node !== hostNode).map((node) => node.outerHTML),
      hostCount: Array.from(document.documentElement.children).filter((node) => node.shadowRoot && node.shadowRoot.querySelector(".dsux-launcher")).length,
    };
  });

  expect(after.hostCount).toBe(1);
  expect(after.body).toBe(before.body);
  expect(after.htmlAttributes).toEqual(before.htmlAttributes);
  expect(after.htmlChildren).toEqual(before.htmlChildren);
});

test("browser rejects imports over 1 MiB before constructing FileReader", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await enhancer.locator('[data-tab="data"]').click();
  const input = enhancer.locator('.dsux-data-view input[type="file"]');
  const durableBefore = await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"));
  await page.evaluate(() => {
    window.__dsuxFileReaderConstructed = false;
    window.FileReader = function () {
      window.__dsuxFileReaderConstructed = true;
      throw new Error("FileReader must not be constructed for oversized imports");
    };
  });

  await input.setInputFiles({
    name: "oversized.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(1024 * 1024 + 1, 65),
  });
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__dsuxFileReaderConstructed)).toBe(false);
  await expect(input).toHaveValue("");
  const rejection = enhancer.locator(".dsux-storage-error[role='alert']");
  await expect(rejection).toBeVisible();
  await expect(rejection).toHaveText("Die Datei ist größer als 1 MiB und wurde nicht gelesen.");
  const rejectionText = await rejection.innerText();
  expect(rejectionText.trim()).not.toBe("");
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBefore);

  await enhancer.locator('[data-tab="discover"]').click();
  await enhancer.locator('[data-tab="data"]').click();
  await expect(rejection).toBeVisible();
  await expect(rejection).toHaveText(rejectionText);
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBefore);
});

test("browser previews a valid v2 backup, cancels without mutation, then confirms replacement", async ({ page }) => {
  await fixture(page);
  const oldKey = "https://derstandard.at/story/111/alte-daten";
  const oldSavedKey = "https://derstandard.at/story/222/alter-merker";
  const oldIgnoredKey = "https://derstandard.at/story/333/alter-ausschluss";
  const oldProgressKey = "https://derstandard.at/story/444/alter-fortschritt";
  const initial = {
    version: 2,
    visited: {
      [oldKey]: { url: oldKey, title: "Alte Daten", visitedAt: 1600000000000 },
    },
    saved: {
      [oldSavedKey]: { url: oldSavedKey, title: "Alter Merker", savedAt: 1600000000001 },
    },
    ignored: {
      [oldIgnoredKey]: { url: oldIgnoredKey, title: "Alter Ausschluss", ignoredAt: 1600000000002 },
    },
    progress: {
      [oldProgressKey]: { value: 0.25, updatedAt: 1600000000003 },
    },
    prefs: {
      commentSort: "native",
      discoverySort: "",
      discoverySortAscending: false,
    },
  };
  await page.evaluate((state) => window.localStorage.setItem("derstandard-enhancer-state", JSON.stringify(state)), initial);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  const dataTab = enhancer.locator('[data-tab="data"]');
  await expect(dataTab).toBeVisible();
  await dataTab.click();
  const input = enhancer.locator('.dsux-data-view input[type="file"]');
  const importedVisitedA = "https://derstandard.at/story/987/importierte-sicherung";
  const importedVisitedB = "https://derstandard.at/story/988/zweite-sicherung";
  const importedSaved = "https://derstandard.at/story/989/gespeicherte-sicherung";
  const importedIgnored = "https://derstandard.at/story/990/ignorierte-sicherung";
  const importedProgressA = "https://derstandard.at/story/991/fortschritt-a";
  const importedProgressB = "https://derstandard.at/story/992/fortschritt-b";
  const backup = {
    version: 2,
    visited: {
      [importedVisitedA]: { url: importedVisitedA, title: "Importierte Sicherung", visitedAt: 1700000000000 },
      [importedVisitedB]: { url: importedVisitedB, title: "Zweite Sicherung", visitedAt: 1700000000001 },
    },
    saved: {
      [importedSaved]: { url: importedSaved, title: "Gespeicherte Sicherung", savedAt: 1700000000002 },
    },
    ignored: {
      [importedIgnored]: { url: importedIgnored, title: "Ignorierte Sicherung", ignoredAt: 1700000000003 },
    },
    progress: {
      [importedProgressA]: { value: 0.5, updatedAt: 1700000000004 },
      [importedProgressB]: { value: 0.75, updatedAt: 1700000000005 },
    },
    prefs: {
      commentSort: "native",
      discoverySort: "",
      discoverySortAscending: false,
    },
  };
  const backupBuffer = Buffer.from(JSON.stringify(backup));
  expect(backupBuffer.byteLength).toBeLessThanOrEqual(1024 * 1024);
  const durableBefore = await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"));

  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: backupBuffer,
  });
  const preview = enhancer.locator(".dsux-import-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(/Besuche\s*:?\s*2/);
  await expect(preview).toContainText(/Lesezeichen\s*:?\s*1/);
  await expect(preview).toContainText(/Ignorierte\s*:?\s*1/);
  await expect(preview).toContainText(/Fortschritte\s*:?\s*2/);
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBefore);

  await enhancer.getByRole("button", { name: "Verlauf löschen" }).click();
  const confirmation = enhancer.locator(".dsux-clear-confirmation");
  await expect(confirmation).toBeVisible();
  await expect(preview).toBeHidden();
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBefore);
  await enhancer.locator(".dsux-clear-cancel").click();
  await expect(confirmation).toBeHidden();
  await expect(preview).toBeHidden();

  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: backupBuffer,
  });
  await expect(preview).toBeVisible();
  await enhancer.locator(".dsux-import-cancel").click();
  await expect(preview).toBeHidden();
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBefore);

  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: backupBuffer,
  });
  await expect(preview).toBeVisible();
  await enhancer.locator(".dsux-import-confirm").click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(window.localStorage.getItem("derstandard-enhancer-state")))).toEqual(backup);
  await expect(input).toBeFocused();
});

test("Daten is a separate panel tab and its controls are absent from Entdecken", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await expect(enhancer.locator('[data-tab="discover"]')).toBeVisible();
  await expect(enhancer.locator('[data-tab="data"]')).toBeVisible();
  await expect(enhancer.locator(".dsux-data-view")).toBeHidden();
  await expect(enhancer.locator('.dsux-data-view input[type="file"]')).toBeHidden();

  await enhancer.locator('[data-tab="data"]').click();
  await expect(enhancer.locator(".dsux-data-view")).toBeVisible();
  await expect(enhancer.locator(".dsux-data-view")).toContainText("Lokale Daten");
  await expect(enhancer.locator('.dsux-data-view input[type="file"]')).toHaveCount(1);
  await expect(enhancer.locator(".dsux-data-view").getByRole("button", { name: "Daten exportieren" })).toBeVisible();
  await expect(enhancer.locator(".dsux-data-view").getByRole("button", { name: "Verlauf löschen" })).toBeVisible();
});

test("Verlauf löschen confirms, cancels safely, and preserves non-visited durable data", async ({ page }) => {
  await fixture(page);
  const visitedKey = "https://derstandard.at/story/111/zu-besuchen";
  const savedKey = "https://derstandard.at/story/222/gespeichert";
  const ignoredKey = "https://derstandard.at/story/333/ignoriert";
  const progressKey = "https://derstandard.at/story/444/fortschritt";
  const initial = {
    version: 2,
    visited: { [visitedKey]: { url: visitedKey, title: "Besuch", visitedAt: 1700000000000 } },
    saved: { [savedKey]: { url: savedKey, title: "Lesezeichen", savedAt: 1700000000001 } },
    ignored: { [ignoredKey]: { url: ignoredKey, title: "Ignoriert", ignoredAt: 1700000000002 } },
    progress: { [progressKey]: { value: 0.4, updatedAt: 1700000000003 } },
    prefs: { commentSort: "native", discoverySort: "", discoverySortAscending: false },
  };
  await page.evaluate((state) => window.localStorage.setItem("derstandard-enhancer-state", JSON.stringify(state)), initial);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await enhancer.locator('[data-tab="data"]').click();
  const clear = enhancer.getByRole("button", { name: "Verlauf löschen" });
  const durableBefore = await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"));
  await clear.click();
  const confirmation = enhancer.locator(".dsux-clear-confirmation");
  await expect(confirmation).toBeVisible();
  const confirmationText = await confirmation.innerText();
  expect(confirmationText).toMatch(/Verlauf|Besuch/i);
  expect(confirmationText).toMatch(/Fortschritt/i);
  expect(confirmationText).toMatch(/Lesezeichen/i);
  expect(confirmationText).toMatch(/ignoriert/i);
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBefore);

  await enhancer.locator(".dsux-clear-cancel").click();
  await expect(confirmation).toBeHidden();
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBefore);

  await clear.click();
  await enhancer.locator(".dsux-clear-confirm").click();
  await expect.poll(async () => page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
    return { visited: Object.keys(state.visited), saved: state.saved, ignored: state.ignored, progress: state.progress };
  })).toEqual({ visited: [], saved: initial.saved, ignored: initial.ignored, progress: initial.progress });
});

test("storage failures remain visible across data rerenders and clear after a later success", async ({ page }) => {
  await fixture(page);
  const visitedKey = "https://derstandard.at/story/111/fehlerfall";
  const initial = {
    version: 2,
    visited: { [visitedKey]: { url: visitedKey, title: "Fehlerfall", visitedAt: 1700000000000 } },
    saved: {},
    ignored: {},
    progress: {},
    prefs: { commentSort: "native", discoverySort: "", discoverySortAscending: false },
  };
  await page.evaluate((state) => window.localStorage.setItem("derstandard-enhancer-state", JSON.stringify(state)), initial);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await enhancer.locator('[data-tab="data"]').click();
  await page.evaluate(() => {
    window.__dsuxOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new Error("forced localStorage failure"); };
  });

  await enhancer.getByRole("button", { name: "Verlauf löschen" }).click();
  const durableBeforeFinalDelete = await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"));
  await enhancer.locator(".dsux-clear-confirm").click();
  const error = enhancer.locator(".dsux-storage-error[role='alert']");
  await expect(error).toBeVisible();
  await expect(error).toHaveText(/Lokale Daten konnten nicht gespeichert werden\.|Besuchsverlauf konnte nicht gelöscht werden\./);
  const failureText = await error.innerText();
  expect(failureText.trim()).not.toBe("");
  expect(failureText).toMatch(/Lokale Daten konnten nicht gespeichert werden\.|Besuchsverlauf konnte nicht gelöscht werden\./);
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBeforeFinalDelete);

  await enhancer.locator('[data-tab="discover"]').click();
  await enhancer.locator('[data-tab="data"]').click();
  await expect(error).toBeVisible();
  await expect(error).toHaveText(failureText);
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(durableBeforeFinalDelete);

  await enhancer.locator(".dsux-clear-cancel").click();
  await expect(error).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__dsuxOriginalSetItem;
    delete window.__dsuxOriginalSetItem;
  });
  await enhancer.getByRole("button", { name: "Verlauf löschen" }).click();
  await enhancer.locator(".dsux-clear-confirm").click();
  await expect(error).toBeHidden();
  await expect.poll(async () => page.evaluate(() => JSON.parse(window.localStorage.getItem("derstandard-enhancer-state")).visited)).toEqual({});
});

test("article initialization persists visited state and scrolling persists separate progress", async ({ page }) => {
  await fixture(page, { html: ARTICLE_HTML, url: ARTICLE_URL });
  await installEnhancer(page);

  await expect.poll(async () => page.evaluate((key) => {
    const raw = window.localStorage.getItem("derstandard-enhancer-state");
    if (!raw) return null;
    const state = JSON.parse(raw);
    const record = state.visited && state.visited[key];
    return record ? {
      url: record.url,
      title: record.title,
      visitedAt: typeof record.visitedAt,
    } : null;
  }, ARTICLE_KEY)).toEqual({
    url: ARTICLE_KEY,
    title: "Eine Leseprobe",
    visitedAt: "number",
  });

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await expect(enhancer.locator('[data-tab="article"]')).toBeVisible();
  await expect(enhancer.locator(".dsux-article-title")).toHaveText("Eine Leseprobe");
  await page.waitForTimeout(200);

  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(async () => page.evaluate((key) => {
    const raw = window.localStorage.getItem("derstandard-enhancer-state");
    if (!raw) return null;
    const state = JSON.parse(raw);
    return state.progress && state.progress[key] || null;
  }, ARTICLE_KEY)).not.toBeNull();

  const durable = await page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
    return {
      visited: state.visited[key],
      progress: state.progress[key],
    };
  }, ARTICLE_KEY);
  expect(Object.keys(durable.visited).sort()).toEqual(["title", "url", "visitedAt"]);
  expect(Object.keys(durable.progress).sort()).toEqual(["updatedAt", "value"]);
  expect(durable.progress.value).toBeGreaterThan(0);
  expect(durable.progress.value).toBeLessThanOrEqual(1);
  expect(typeof durable.progress.updatedAt).toBe("number");
});
