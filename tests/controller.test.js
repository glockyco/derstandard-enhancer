import { expect, test } from "@playwright/test";
import path from "node:path";

const ROOT = process.cwd();
const GENERATED_PATH = path.join(ROOT, "derstandard-enhancer.user.js");
const SOURCE_PATHS = ["src/storage.js", "src/site.js", "src/controller.js"].map((file) => path.join(ROOT, file));

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

async function fixture(page) {
  await page.setContent(FIXTURE_HTML);
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
