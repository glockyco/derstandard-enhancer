import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const ROOT = process.cwd();
const GENERATED_PATH = path.join(ROOT, "derstandard-enhancer.user.js");
const SOURCE_PATHS = ["src/site.js", "src/storage.js", "src/comments.js", "src/controller.js"].map((file) =>
  path.join(ROOT, file)
);
const CONTROLLER_CSS = readFileSync(path.join(ROOT, "src/controller.css"), "utf8");

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
const CURRENT_KEYS = [
  "https://derstandard.at/story/123/erste-meldung",
  "https://derstandard.at/story/456/zweite-meldung",
];
const LOCAL_VISITED_KEY = "https://derstandard.at/story/901/lokal-besucht";
const LOCAL_SAVED_KEY = "https://derstandard.at/story/902/lokal-gespeichert";
const LOCAL_IGNORED_KEY = "https://derstandard.at/story/903/lokal-ignoriert";
const LOCAL_PROGRESS_KEY = "https://derstandard.at/story/904/lokal-fortschritt";
const LOCAL_KEYS = [LOCAL_VISITED_KEY, LOCAL_SAVED_KEY, LOCAL_IGNORED_KEY, LOCAL_PROGRESS_KEY];
const LOCAL_SCOPE_STATE = {
  version: 2,
  visited: {
    [LOCAL_VISITED_KEY]: { url: LOCAL_VISITED_KEY, title: "Lokal besucht", visitedAt: 1700000000000 },
  },
  saved: {
    [LOCAL_SAVED_KEY]: { url: LOCAL_SAVED_KEY, title: "Lokal gespeichert", savedAt: 1700000000001 },
  },
  ignored: {
    [LOCAL_IGNORED_KEY]: { url: LOCAL_IGNORED_KEY, title: "Lokal ignoriert", ignoredAt: 1700000000002 },
  },
  progress: {
    [LOCAL_PROGRESS_KEY]: { value: 0.35, updatedAt: 1700000000003 },
  },
  prefs: {
    commentSort: "native",
    discoverySort: "",
    discoverySortAscending: false,
  },
};

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
  if (!useGenerated)
    await page.evaluate((styles) => {
      window.DSUXStyles = styles;
    }, CONTROLLER_CSS);
  for (const file of paths) await page.addScriptTag({ path: file });
  // addScriptTag is test setup; remove its tags so page-mutation assertions cover the product only.
  await page.evaluate(() => {
    document.querySelectorAll("script").forEach((node) => {
      node.remove();
    });
  });
  await expect(page.locator("html > div")).toHaveCount(1);
}

async function installInstrumented(page, { siteHook = null, storageHook = null, preControllerHook = null } = {}) {
  await page.evaluate((styles) => {
    window.DSUXStyles = styles;
  }, CONTROLLER_CSS);
  await page.addScriptTag({ path: path.join(ROOT, "src/site.js") });
  if (siteHook) await page.evaluate(siteHook);
  await page.addScriptTag({ path: path.join(ROOT, "src/storage.js") });
  if (storageHook) await page.evaluate(storageHook);
  if (preControllerHook) await page.evaluate(preControllerHook);
  await page.addScriptTag({ path: path.join(ROOT, "src/comments.js") });
  await page.addScriptTag({ path: path.join(ROOT, "src/controller.js") });
  await page.evaluate(() => {
    document.querySelectorAll("script").forEach((node) => {
      node.remove();
    });
  });
  await expect(page.locator("html > div")).toHaveCount(1);
}

function host(page) {
  return page.locator("html > div").first();
}

async function discoveryRowKeys(enhancer) {
  return enhancer
    .locator(".dsux-table tbody [data-action='save'][data-key]")
    .evaluateAll((actions) => actions.map((action) => action.getAttribute("data-key")).sort());
}
test("generated comments module sorts an article forum inside the enhancer panel and restores native order", async ({
  page,
}) => {
  await fixture(page, { html: COMMENT_ARTICLE_HTML, url: ARTICLE_URL });
  await page.evaluate(() => window.localStorage.clear());
  await installEnhancer(page, true);

  expect(await page.evaluate(() => typeof window.DSUXComments)).toBe("object");
  const nativeOrder = async () =>
    page.evaluate(() => {
      const forum = document.querySelector("#fixture-forum");
      const main = forum?.shadowRoot?.querySelector("section#forum main.forum--main");
      return main ? Array.from(main.querySelectorAll("dst-posting[data-level='0']")).map((node) => node.id) : [];
    });
  const forumMainChildSequence = async () =>
    page.evaluate(() => {
      const forum = document.querySelector("#fixture-forum");
      const main = forum?.shadowRoot?.querySelector("section#forum main.forum--main");
      return main
        ? Array.from(main.childNodes).map((node) => ({
            nodeType: node.nodeType,
            nodeName: node.nodeName,
            value: node.nodeType === Node.ELEMENT_NODE ? node.outerHTML : node.nodeValue,
          }))
        : [];
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
  expect(
    await page.evaluate(() => {
      const forum = document.querySelector("#fixture-forum");
      const enhancerShadow = document.querySelector("html > div")?.shadowRoot;
      const controls = ".dsux-comment-sort, .dsux-comment-status";
      return {
        pageLightDom: document.querySelectorAll(controls).length,
        forumShadowRoot: forum?.shadowRoot?.querySelectorAll(controls).length || 0,
        enhancerSort: enhancerShadow?.querySelectorAll(".dsux-comment-sort").length || 0,
        enhancerStatus: enhancerShadow?.querySelectorAll(".dsux-comment-status").length || 0,
      };
    })
  ).toEqual({
    pageLightDom: 0,
    forumShadowRoot: 0,
    enhancerSort: 1,
    enhancerStatus: 1,
  });

  await select.selectOption("positive");
  await expect.poll(nativeOrder).toEqual(["high", "medium", "low"]);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state") || "{}");
        return state.prefs?.commentSort;
      })
    )
    .toBe("positive");

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

test("discovery scope separates current teasers from persisted local records", async ({ page }) => {
  await fixture(page);
  await page.evaluate((state) => {
    window.localStorage.setItem("derstandard-enhancer-state", JSON.stringify(state));
  }, LOCAL_SCOPE_STATE);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  const scope = enhancer.locator(".dsux-scope");
  await expect(scope).toHaveValue("page");
  await expect.poll(() => discoveryRowKeys(enhancer)).toEqual(CURRENT_KEYS.slice().sort());
  const pageRows = await discoveryRowKeys(enhancer);
  expect(pageRows.some((key) => LOCAL_KEYS.includes(key))).toBe(false);

  await scope.selectOption("local");
  await expect
    .poll(() => discoveryRowKeys(enhancer))
    .toEqual(LOCAL_KEYS.filter((key) => key !== LOCAL_IGNORED_KEY).sort());
  const localRows = await discoveryRowKeys(enhancer);
  expect(localRows.some((key) => CURRENT_KEYS.includes(key))).toBe(false);

  const filter = enhancer.locator('select[aria-label="Artikel filtern"]');
  await filter.selectOption("ignored");
  await expect.poll(() => discoveryRowKeys(enhancer)).toEqual([LOCAL_IGNORED_KEY]);
  const ignoredRows = await discoveryRowKeys(enhancer);
  expect(ignoredRows.some((key) => CURRENT_KEYS.includes(key))).toBe(false);
});

test("launcher visibly communicates Entdecken", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const launcher = host(page).locator(".dsux-launcher");
  await expect(launcher).toBeVisible();
  await expect(launcher).toContainText("Entdecken");
  await expect(launcher).toHaveAccessibleName(/Entdecken/);
});

test("visible tablist uses roving focus, labelled tabpanels, and keyboard navigation", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  const tablist = enhancer.getByRole("tablist");
  await expect(tablist).toHaveCount(1);
  const tabs = enhancer.locator('[role="tab"]');
  await expect(tabs).toHaveCount(3);

  const assertTabState = async () => {
    const state = await tabs.evaluateAll((nodes) =>
      nodes.map((tab) => {
        const controls = tab.getAttribute("aria-controls");
        const root = tab.getRootNode();
        const panel = controls && root.getElementById(controls);
        const panelStyle = panel && getComputedStyle(panel);
        return {
          id: tab.id,
          controls,
          selected: tab.getAttribute("aria-selected"),
          tabIndex: tab.tabIndex,
          hidden: tab.hidden,
          panelRole: panel?.getAttribute("role") || "",
          panelLabelledBy: panel?.getAttribute("aria-labelledby") || "",
          panelVisible: !!panel && !panel.hidden && panelStyle.display !== "none" && panelStyle.visibility !== "hidden",
        };
      })
    );
    expect(
      state.every(
        (tab) =>
          tab.id &&
          tab.controls &&
          (tab.selected === "true" || tab.selected === "false") &&
          (tab.tabIndex === 0 || tab.tabIndex === -1) &&
          tab.panelRole === "tabpanel" &&
          tab.panelLabelledBy === tab.id
      )
    ).toBe(true);
    const visibleTabs = state.filter((tab) => !tab.hidden);
    expect(visibleTabs.filter((tab) => tab.selected === "true")).toHaveLength(1);
    expect(visibleTabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
    const selectedTab = visibleTabs.find((tab) => tab.selected === "true");
    expect(selectedTab).toBeTruthy();
    expect(state.filter((tab) => tab.panelVisible)).toHaveLength(1);
    expect(selectedTab.panelVisible).toBe(true);
  };

  await assertTabState();
  const discoverTab = enhancer.locator('[data-tab="discover"]');
  const dataTab = enhancer.locator('[data-tab="data"]');
  await discoverTab.focus();

  await page.keyboard.press("ArrowRight");
  await expect(dataTab).toBeFocused();
  await assertTabState();

  await page.keyboard.press("ArrowLeft");
  await expect(discoverTab).toBeFocused();
  await assertTabState();

  await page.keyboard.press("End");
  await expect(dataTab).toBeFocused();
  await assertTabState();

  await page.keyboard.press("Home");
  await expect(discoverTab).toBeFocused();
  await assertTabState();
});

test("Escape and close restore focus to the launcher", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  const launcher = enhancer.locator(".dsux-launcher");
  const panel = enhancer.locator(".dsux-panel");

  await launcher.click();
  await expect(panel).toBeVisible();
  await enhancer.locator(".dsux-close").click();
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();

  await launcher.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
});

test("Escape survives publisher keydown propagation blockers", async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => {
    document.addEventListener("keydown", (event) => {
      event.stopImmediatePropagation();
    });
  });
  await installEnhancer(page);

  const enhancer = host(page);
  const launcher = enhancer.locator(".dsux-launcher");
  const panel = enhancer.locator(".dsux-panel");

  await launcher.click();
  await expect(panel).toBeVisible();
  await enhancer.locator('[data-tab="data"]').click();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
});
test("save and ignore rerenders preserve logical row-action focus", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  const firstRow = enhancer.locator(".dsux-table tbody tr").first();
  const firstSave = firstRow.locator('[data-action="save"]');
  const firstIgnore = firstRow.locator('[data-action="ignore"]');
  const firstKey = await firstSave.getAttribute("data-key");
  expect(firstKey).toBeTruthy();
  await firstSave.focus();
  await firstSave.click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const active = document.querySelector("html > div")?.shadowRoot?.activeElement;
        return {
          action: active?.getAttribute("data-action") || "",
          key: active?.getAttribute("data-key") || "",
        };
      })
    )
    .toEqual({ action: "save", key: firstKey });

  const secondRow = enhancer.locator(".dsux-table tbody tr").nth(1);
  const secondIgnore = secondRow.locator('[data-action="ignore"]');
  const secondKey = await secondIgnore.getAttribute("data-key");
  expect(secondKey).toBeTruthy();
  await secondIgnore.focus();
  await secondIgnore.click();
  await expect(enhancer.locator(`[data-action="ignore"][data-key="${secondKey}"]`)).toHaveCount(0);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const active = document.querySelector("html > div")?.shadowRoot?.activeElement;
        return {
          action: active?.getAttribute("data-action") || "",
          key: active?.getAttribute("data-key") || "",
        };
      })
    )
    .toEqual({ action: "ignore", key: firstKey });
  await expect(firstIgnore).toBeFocused();
});

test("discover has one live status region and tbody is not live", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  const discover = enhancer.locator("#dsux-view-discover");
  const liveRegions = await discover.evaluate((node) =>
    Array.from(node.querySelectorAll('[role="status"], [aria-live]')).map((region) => ({
      role: region.getAttribute("role"),
      live: region.getAttribute("aria-live"),
    }))
  );
  expect(liveRegions).toEqual([{ role: "status", live: "polite" }]);
  const tbody = discover.locator("tbody");
  await expect(tbody).not.toHaveAttribute("role", "status");
  await expect(tbody).not.toHaveAttribute("aria-live");
  await expect(tbody.locator('[role="status"], [aria-live]')).toHaveCount(0);
});

test("discovery controls expose the visible labels Suche, Quelle, and Status", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  const fields = enhancer.locator("#dsux-view-discover .dsux-control-field");
  await expect(fields).toHaveCount(3);
  expect(
    await fields.evaluateAll((nodes) =>
      nodes.map((field) => ({
        tag: field.tagName,
        label: field.querySelector(".dsux-control-label")?.textContent.trim() || "",
        controls: field.querySelectorAll("input, select").length,
      }))
    )
  ).toEqual([
    { tag: "LABEL", label: "Suche", controls: 1 },
    { tag: "LABEL", label: "Quelle", controls: 1 },
    { tag: "LABEL", label: "Status", controls: 1 },
  ]);
  for (const label of ["Suche", "Quelle", "Status"]) {
    await expect(enhancer.locator(".dsux-control-label", { hasText: label }).filter({ hasText: label })).toHaveCount(1);
  }
});

test("visible toast does not overlap the widened launcher", async ({ page }) => {
  await fixture(page);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await enhancer.locator(".dsux-table tbody tr").first().locator('[data-action="save"]').click();
  const toast = enhancer.locator(".dsux-toast");
  const launcher = enhancer.locator(".dsux-launcher");
  await expect(toast).toBeVisible();
  const toastBox = await toast.boundingBox();
  const launcherBox = await launcher.boundingBox();
  expect(toastBox).toBeTruthy();
  expect(launcherBox).toBeTruthy();
  const separated =
    toastBox.x + toastBox.width <= launcherBox.x ||
    launcherBox.x + launcherBox.width <= toastBox.x ||
    toastBox.y + toastBox.height <= launcherBox.y ||
    launcherBox.y + launcherBox.height <= toastBox.y;
  expect(separated).toBe(true);
});

test("outline and resume jumps focus the page reading target with temporary tabindex", async ({ page }) => {
  await fixture(page, { html: ARTICLE_HTML, url: ARTICLE_URL });
  await page.evaluate((key) => {
    window.localStorage.setItem(
      "derstandard-enhancer-state",
      JSON.stringify({
        version: 2,
        visited: {},
        saved: {},
        ignored: {},
        progress: { [key]: { value: 0.35, updatedAt: 1700000000000 } },
        prefs: { commentSort: "native", discoverySort: "", discoverySortAscending: false },
      })
    );
  }, ARTICLE_KEY);
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await enhancer.locator('[data-tab="article"]').click();
  const outlineHeading = page.locator(".article-body h2").first();
  await enhancer.getByRole("button", { name: "Einordnung" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hostNode = document.querySelector("html > div");
        const article = document.querySelector("article.story-article");
        const active = document.activeElement;
        return !!active && !!article?.contains(active) && active !== hostNode;
      })
    )
    .toBe(true);
  await expect(outlineHeading).toBeFocused();
  await expect(outlineHeading).toHaveAttribute("tabindex", "-1");
  await enhancer.locator(".dsux-launcher").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector("article.story-article")?.querySelectorAll("[tabindex='-1']").length || 0
      )
    )
    .toBe(0);

  await enhancer.locator(".dsux-launcher").click();
  await enhancer.locator('[data-tab="article"]').click();
  const resume = enhancer.getByRole("button", { name: "Fortsetzen" });
  await expect(resume).toBeEnabled();
  await resume.click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hostNode = document.querySelector("html > div");
        const article = document.querySelector("article.story-article");
        const active = document.activeElement;
        return !!active && !!article?.contains(active) && active !== hostNode;
      })
    )
    .toBe(true);
  await expect(page.locator(".article-body")).toBeFocused();
  await expect(page.locator(".article-body")).toHaveAttribute("tabindex", "-1");
  await enhancer.locator(".dsux-launcher").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector("article.story-article")?.querySelectorAll("[tabindex='-1']").length || 0
      )
    )
    .toBe(0);
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
    htmlAttributes: Array.from(document.documentElement.attributes).map((attribute) => [
      attribute.name,
      attribute.value,
    ]),
    htmlChildren: Array.from(document.documentElement.children).map((node) => node.outerHTML),
  }));

  await installEnhancer(page, true);
  const after = await page.evaluate(() => {
    const hostNode = Array.from(document.documentElement.children).find((node) =>
      node.shadowRoot?.querySelector(".dsux-launcher")
    );
    return {
      body: document.body.outerHTML,
      htmlAttributes: Array.from(document.documentElement.attributes).map((attribute) => [
        attribute.name,
        attribute.value,
      ]),
      htmlChildren: Array.from(document.documentElement.children)
        .filter((node) => node !== hostNode)
        .map((node) => node.outerHTML),
      hostCount: Array.from(document.documentElement.children).filter((node) =>
        node.shadowRoot?.querySelector(".dsux-launcher")
      ).length,
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
    window.FileReader = function FileReaderSentinel() {
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
  await page.evaluate(
    (state) => window.localStorage.setItem("derstandard-enhancer-state", JSON.stringify(state)),
    initial
  );
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
  await expect
    .poll(async () => page.evaluate(() => JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"))))
    .toEqual(backup);
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
  await page.evaluate(
    (state) => window.localStorage.setItem("derstandard-enhancer-state", JSON.stringify(state)),
    initial
  );
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
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
        return {
          visited: Object.keys(state.visited),
          saved: state.saved,
          ignored: state.ignored,
          progress: state.progress,
        };
      })
    )
    .toEqual({ visited: [], saved: initial.saved, ignored: initial.ignored, progress: initial.progress });
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
  await page.evaluate(
    (state) => window.localStorage.setItem("derstandard-enhancer-state", JSON.stringify(state)),
    initial
  );
  await installEnhancer(page);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await enhancer.locator('[data-tab="data"]').click();
  await page.evaluate(() => {
    window.__dsuxOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("forced localStorage failure");
    };
  });

  await enhancer.getByRole("button", { name: "Verlauf löschen" }).click();
  const durableBeforeFinalDelete = await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"));
  await enhancer.locator(".dsux-clear-confirm").click();
  const error = enhancer.locator(".dsux-storage-error[role='alert']");
  await expect(error).toBeVisible();
  await expect(error).toHaveText(
    /Lokale Daten konnten nicht gespeichert werden\.|Besuchsverlauf konnte nicht gelöscht werden\./
  );
  const failureText = await error.innerText();
  expect(failureText.trim()).not.toBe("");
  expect(failureText).toMatch(
    /Lokale Daten konnten nicht gespeichert werden\.|Besuchsverlauf konnte nicht gelöscht werden\./
  );
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(
    durableBeforeFinalDelete
  );

  await enhancer.locator('[data-tab="discover"]').click();
  await enhancer.locator('[data-tab="data"]').click();
  await expect(error).toBeVisible();
  await expect(error).toHaveText(failureText);
  expect(await page.evaluate(() => window.localStorage.getItem("derstandard-enhancer-state"))).toBe(
    durableBeforeFinalDelete
  );

  await enhancer.locator(".dsux-clear-cancel").click();
  await expect(error).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__dsuxOriginalSetItem;
    delete window.__dsuxOriginalSetItem;
  });
  await enhancer.getByRole("button", { name: "Verlauf löschen" }).click();
  await enhancer.locator(".dsux-clear-confirm").click();
  await expect(error).toBeHidden();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(window.localStorage.getItem("derstandard-enhancer-state")).visited)
    )
    .toEqual({});
});

test("article initialization persists visited state and scrolling persists separate progress", async ({ page }) => {
  await fixture(page, { html: ARTICLE_HTML, url: ARTICLE_URL });
  await installEnhancer(page);

  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem("derstandard-enhancer-state");
        if (!raw) return null;
        const state = JSON.parse(raw);
        const record = state.visited?.[key];
        return record
          ? {
              url: record.url,
              title: record.title,
              visitedAt: typeof record.visitedAt,
            }
          : null;
      }, ARTICLE_KEY)
    )
    .toEqual({
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
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem("derstandard-enhancer-state");
        if (!raw) return null;
        const state = JSON.parse(raw);
        return state.progress?.[key] || null;
      }, ARTICLE_KEY)
    )
    .not.toBeNull();

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

test("closed scans defer full discovery until open and refresh only dirty open mutations", async ({ page }) => {
  await fixture(page);
  await installInstrumented(page, {
    siteHook: () => {
      const extractPageArticle = window.DSUXSite.extractPageArticle;
      const extractArticles = window.DSUXSite.extractArticles;
      window.__dsuxExtractPageArticleCalls = 0;
      window.__dsuxExtractArticlesCalls = 0;
      window.DSUXSite.extractPageArticle = function (...args) {
        window.__dsuxExtractPageArticleCalls += 1;
        return extractPageArticle.apply(this, args);
      };
      window.DSUXSite.extractArticles = function (...args) {
        window.__dsuxExtractArticlesCalls += 1;
        return extractArticles.apply(this, args);
      };
    },
  });

  await page.waitForTimeout(180);
  const initialCalls = await page.evaluate(() => ({
    page: window.__dsuxExtractPageArticleCalls,
    articles: window.__dsuxExtractArticlesCalls,
  }));
  expect(initialCalls.page).toBeGreaterThan(0);
  expect(initialCalls.articles).toBe(0);

  await page.evaluate(() => {
    const marker = document.createElement("div");
    marker.dataset.closedMutation = "true";
    document.querySelector("#fixture-content").appendChild(marker);
  });
  await expect.poll(() => page.evaluate(() => window.__dsuxExtractPageArticleCalls)).toBeGreaterThan(initialCalls.page);
  expect(await page.evaluate(() => window.__dsuxExtractArticlesCalls)).toBe(initialCalls.articles);

  const firstClosedMutationCalls = await page.evaluate(() => window.__dsuxExtractPageArticleCalls);
  await page.evaluate(() => {
    const teaser = document.createElement("article");
    teaser.className = "teaser";
    teaser.dataset.section = "Neue Meldung";
    teaser.innerHTML =
      '<a href="/story/999/geschlossene-meldung"><h3 class="teaser-title">Geschlossene Meldung</h3></a>';
    document.querySelector("#fixture-content").appendChild(teaser);
  });
  await expect
    .poll(() => page.evaluate(() => window.__dsuxExtractPageArticleCalls))
    .toBeGreaterThan(firstClosedMutationCalls);
  expect(await page.evaluate(() => window.__dsuxExtractArticlesCalls)).toBe(initialCalls.articles);

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  await expect
    .poll(() => page.evaluate(() => window.__dsuxExtractArticlesCalls))
    .toBeGreaterThan(initialCalls.articles);
  await expect(enhancer.locator(".dsux-table tbody")).toContainText("Geschlossene Meldung");
});

test("mutation UI follows the synchronous durable subscription instead of a stale result envelope", async ({
  page,
}) => {
  await fixture(page);
  await installInstrumented(page, {
    storageHook: () => {
      const subscribe = window.DSUXStorage.subscribe;
      const toggleSaved = window.DSUXStorage.toggleSaved;
      window.__dsuxStorageAuthority = {
        subscriptionSaved: null,
        resultSaved: null,
        durableSaved: null,
      };
      window.DSUXStorage.subscribe = function (listener) {
        return subscribe.call(this, (next) => {
          const divergent = Object.assign({}, next, { saved: {} });
          const key = window.__dsuxStorageAuthority.key;
          window.__dsuxStorageAuthority.subscriptionSaved = !!divergent.saved?.[key];
          listener(divergent);
        });
      };
      window.DSUXStorage.toggleSaved = function (...args) {
        window.__dsuxStorageAuthority.key = args[0];
        const result = toggleSaved.apply(this, args);
        window.__dsuxStorageAuthority.resultSaved = !!result.state.saved?.[args[0]];
        const durable = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state") || "{}");
        window.__dsuxStorageAuthority.durableSaved = !!durable.saved?.[args[0]];
        return result;
      };
    },
  });

  const enhancer = host(page);
  await enhancer.locator(".dsux-launcher").click();
  const save = enhancer.locator(`[data-action="save"][data-key="${CURRENT_KEYS[0]}"]`);
  await expect(save).toHaveAttribute("aria-pressed", "false");
  await save.click();

  const renderedSave = enhancer.locator(`[data-action="save"][data-key="${CURRENT_KEYS[0]}"]`);
  await expect(renderedSave).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => window.__dsuxStorageAuthority)).toEqual({
    key: CURRENT_KEYS[0],
    subscriptionSaved: false,
    resultSaved: true,
    durableSaved: true,
  });
  expect(
    await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
      return !!state.saved?.[key];
    }, CURRENT_KEYS[0])
  ).toBe(true);
});

test("scroll progress flushes for the old article before route invalidation", async ({ page }) => {
  await fixture(page, { html: ARTICLE_HTML, url: ARTICLE_URL });
  await installEnhancer(page);
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
        return !!state.visited?.[key];
      }, ARTICLE_KEY)
    )
    .toBe(true);

  const progress = await page.evaluate((key) => {
    window.scrollTo(0, 600);
    window.dispatchEvent(new Event("scroll"));
    history.pushState({}, "", "/story/999/neue-leseprobe");
    window.dispatchEvent(new PopStateEvent("popstate"));
    const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
    return state.progress?.[key] ? state.progress[key].value : null;
  }, ARTICLE_KEY);
  expect(progress).toBeGreaterThan(0);
});

test("scroll progress flushes synchronously on pagehide before the debounce", async ({ page }) => {
  await fixture(page, { html: ARTICLE_HTML, url: ARTICLE_URL });
  await installEnhancer(page);
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
        return !!state.visited?.[key];
      }, ARTICLE_KEY)
    )
    .toBe(true);

  const progress = await page.evaluate((key) => {
    window.scrollTo(0, 600);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("pagehide"));
    const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
    return state.progress?.[key] ? state.progress[key].value : null;
  }, ARTICLE_KEY);
  expect(progress).toBeGreaterThan(0);
});

test("teardown flushes pending scroll progress before disconnecting storage", async ({ page }) => {
  await fixture(page, { html: ARTICLE_HTML, url: ARTICLE_URL });
  await installEnhancer(page);
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
        return !!state.visited?.[key];
      }, ARTICLE_KEY)
    )
    .toBe(true);

  const progress = await page.evaluate((key) => {
    window.scrollTo(0, 600);
    window.dispatchEvent(new Event("scroll"));
    window.DSUXEnhancerTeardown();
    const state = JSON.parse(window.localStorage.getItem("derstandard-enhancer-state"));
    return state.progress?.[key] ? state.progress[key].value : null;
  }, ARTICLE_KEY);
  expect(progress).toBeGreaterThan(0);
});

test("fallback route polling is slow, pauses while hidden, and route events still scan", async ({ page }) => {
  await fixture(page, { html: ARTICLE_HTML, url: ARTICLE_URL });
  await installInstrumented(page, {
    siteHook: () => {
      const extractPageArticle = window.DSUXSite.extractPageArticle;
      window.__dsuxExtractPageArticleCalls = 0;
      window.DSUXSite.extractPageArticle = function (...args) {
        window.__dsuxExtractPageArticleCalls += 1;
        return extractPageArticle.apply(this, args);
      };
    },
    preControllerHook: () => {
      const nativeSetTimeout = window.setTimeout;
      const nativeClearTimeout = window.clearTimeout;
      const state = { hidden: false, schedules: [] };
      window.__dsuxRuntimeTimerState = state;
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => state.hidden,
      });
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => (state.hidden ? "hidden" : "visible"),
      });
      window.setTimeout = (callback, delay, ...args) => {
        const normalizedDelay = Number(delay) || 0;
        const entry = {
          captured: normalizedDelay >= 2000,
          callback,
          delay: normalizedDelay,
          hidden: state.hidden,
          cleared: false,
        };
        state.schedules.push(entry);
        if (entry.captured) return entry;
        return nativeSetTimeout.call(window, callback, normalizedDelay, ...args);
      };
      window.clearTimeout = (timer) => {
        if (timer?.captured) {
          timer.cleared = true;
          return;
        }
        return nativeClearTimeout.call(window, timer);
      };
    },
  });

  await page.waitForTimeout(180);
  const initialSlowTimers = await page.evaluate(() =>
    window.__dsuxRuntimeTimerState.schedules
      .filter((entry) => entry.delay >= 2000 && !entry.hidden)
      .map((entry) => ({ delay: entry.delay, hasCallback: typeof entry.callback === "function" }))
  );
  expect(initialSlowTimers.length).toBeGreaterThan(0);
  expect(initialSlowTimers[0].hasCallback).toBe(true);

  const visibleBeforeRoute = await page.evaluate(() => window.__dsuxExtractPageArticleCalls);
  await page.evaluate(() => history.pushState({}, "", "/story/1000/silent-visible"));
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.__dsuxExtractPageArticleCalls)).toBe(visibleBeforeRoute);

  await page.evaluate(() => {
    window.__dsuxRuntimeTimerState.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hiddenBeforeRoute = await page.evaluate(() => window.__dsuxExtractPageArticleCalls);
  await page.evaluate(() => history.pushState({}, "", "/story/1001/silent-hidden"));
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.__dsuxExtractPageArticleCalls)).toBe(hiddenBeforeRoute);
  expect(
    await page.evaluate(
      () => window.__dsuxRuntimeTimerState.schedules.filter((entry) => entry.delay >= 2000 && entry.hidden).length
    )
  ).toBe(0);

  const routeEventBefore = await page.evaluate(() => window.__dsuxExtractPageArticleCalls);
  await page.evaluate(() => {
    history.pushState({}, "", "/story/1002/route-event");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect.poll(() => page.evaluate(() => window.__dsuxExtractPageArticleCalls)).toBeGreaterThan(routeEventBefore);
  const routeEventAfter = await page.evaluate(() => window.__dsuxExtractPageArticleCalls);

  const fallbackBefore = await page.evaluate(() => {
    window.__dsuxRuntimeTimerState.hidden = false;
    history.pushState({}, "", "/story/1003/silent-fallback");
    const fallback = window.__dsuxRuntimeTimerState.schedules.find((entry) => entry.delay >= 2000 && !entry.hidden);
    if (!fallback || typeof fallback.callback !== "function") return false;
    fallback.callback();
    return true;
  });
  expect(fallbackBefore).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__dsuxExtractPageArticleCalls)).toBeGreaterThan(routeEventAfter);
  expect(
    await page.evaluate(() =>
      window.__dsuxRuntimeTimerState.schedules.some((entry) => entry.delay >= 2000 && !entry.hidden)
    )
  ).toBe(true);
});
