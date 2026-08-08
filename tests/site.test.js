import { expect, test } from "bun:test";

const SITE_SOURCE = await Bun.file(new URL("../src/site.js", import.meta.url)).text();

class FakeElement {
  constructor(tagName, attributes = {}, text = "") {
    this.nodeType = 1;
    this.localName = tagName.toLowerCase();
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.children = [];
    this.parentElement = null;
    this.ownerDocument = null;
    this._text = text;
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      child.ownerDocument = this.ownerDocument;
      this.children.push(child);
    }
    return this;
  }

  get firstChild() {
    return this.children[0] || null;
  }
  get nextSibling() {
    if (!this.parentElement) return null;
    const index = this.parentElement.children.indexOf(this);
    return this.parentElement.children[index + 1] || null;
  }
  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join("");
  }
  get nodeName() {
    return this.tagName;
  }
  get href() {
    return this.attributes.href || "";
  }

  getAttribute(name) {
    return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  matches(selector) {
    return selector.split(",").some((part) => {
      const value = part.trim();
      if (value === "article.story-article")
        return (
          this.localName === "article" &&
          String(this.attributes.class || "")
            .split(/\s+/)
            .indexOf("story-article") !== -1
        );
      if (value === "li") return this.localName === "li";
      if (value === "a[href]") return this.localName === "a" && !!this.getAttribute("href");
      if (value === "h3.teaser-title") return this.localName === "h3" && this.attributes.class === "teaser-title";
      if (value === "dst-rl-timestamp[date]")
        return this.localName === "dst-rl-timestamp" && !!this.getAttribute("date");
      if (value === ".js-forum-postingcount") return this.attributes.class === "js-forum-postingcount";
      if (value === ".article-postingcount") return this.attributes.class === "article-postingcount";
      if (value === ".teaser-postingcount") return this.attributes.class === "teaser-postingcount";
      if (value === "[aria-labelledby]") return !!this.getAttribute("aria-labelledby");
      if (value === '[class*="teaser"]') return String(this.attributes.class || "").includes("teaser");
      return false;
    });
  }

  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }
}

class FakeDocument extends FakeElement {
  constructor(children = []) {
    super("document");
    this.nodeType = 9;
    this.baseURI = "https://derstandard.at/";
    this.URL = this.baseURI;
    this.ownerDocument = this;
    this.children = [];
    this.append(...children);
  }

  getElementById(id) {
    return this.querySelector(`[id="${id}"]`);
  }
}

function makeSite() {
  const browser = { URL };
  new Function("window", SITE_SOURCE)(browser);
  return browser.DSUXSite;
}

function makeCard(href, title, comments, date) {
  const card = new FakeElement("article", { class: "teaser" });
  card.append(
    new FakeElement("a", { href }),
    new FakeElement("h3", { class: "teaser-title" }, title),
    new FakeElement("span", { class: "teaser-postingcount" }, comments),
    new FakeElement("dst-rl-timestamp", { date })
  );
  return card;
}

test("article identity normalizes protocol, credentials, ports, and article query data", () => {
  const site = makeSite();
  expect(site.canonicalUrl("http://derstandard.at/story/123/title")).toBe("https://derstandard.at/story/123/title");
  expect(site.canonicalUrl("https://reader:secret@derstandard.at/story/123/title")).toBe(
    "https://derstandard.at/story/123/title"
  );
  expect(site.canonicalUrl("https://derstandard.at:8443/story/123/title")).toBe(
    "https://derstandard.at/story/123/title"
  );
  const input = "http://reader:secret@www.derstandard.at:8443/story/123/title?utm_source=newsletter&foo=bar#comments";
  expect(site.canonicalUrl(input)).toBe("https://derstandard.at/story/123/title?foo=bar");
  expect(site.articleKey(input)).toBe("https://derstandard.at/story/123/title");
  expect(site.articleKey("https://derstandard.at/story/123/title?arbitrary=value#section")).toBe(
    "https://derstandard.at/story/123/title"
  );
  expect(site.isArticleUrl("https://derstandard.at/story/123/title?arbitrary=value#section")).toBe(true);
});

test("canonical URLs reject off-site and unsupported values", () => {
  const site = makeSite();
  expect(site.canonicalUrl("https://example.com/story/123/title")).toBe("");
  expect(site.canonicalUrl("ftp://derstandard.at/story/123/title")).toBe("");
  expect(site.canonicalUrl("javascript:alert(1)")).toBe("");
  expect(site.articleKey("not a URL")).toBe("");
});

test("article extraction excludes links inside the story article", () => {
  const storyArticle = new FakeElement("article", { class: "story-article" });
  storyArticle.append(new FakeElement("a", { href: "/story/999/body-link" }));
  const document = new FakeDocument([storyArticle]);

  expect(makeSite().extractArticles(document)).toEqual([]);
});

test("article extraction prefers nested teaser metadata over an outer article", () => {
  const outer = new FakeElement("article", { "data-section": "Outer", class: "article-shell" });
  const teaser = new FakeElement("div", { class: "teaser-list", "data-section": "Innen" });
  teaser.append(
    new FakeElement("a", { href: "/story/321/nested-title" }),
    new FakeElement("h3", { class: "teaser-title" }, "Nested headline"),
    new FakeElement("span", { class: "teaser-postingcount" }, "12 Kommentare"),
    new FakeElement("dst-rl-timestamp", { date: "2025-02-03" })
  );
  outer.append(
    new FakeElement("h3", { class: "teaser-title" }, "Outer headline"),
    new FakeElement("span", { class: "teaser-postingcount" }, "999 Kommentare"),
    new FakeElement("dst-rl-timestamp", { date: "2024-01-01" }),
    teaser
  );

  const articles = makeSite().extractArticles(new FakeDocument([outer]));
  expect(articles).toHaveLength(1);
  expect(articles[0]).toMatchObject({
    key: "https://derstandard.at/story/321/nested-title",
    title: "Nested headline",
    publishedAt: "2025-02-03",
    commentCount: 12,
    section: "Innen",
  });
});

test("comment counts accept localized integer formatting", () => {
  const site = makeSite();
  expect(site.parseCommentCount("1.234 Kommentare")).toBe(1234);
  expect(site.parseCommentCount("12 345 Kommentare")).toBe(12345);
  expect(site.parseCommentCount("Keine Kommentare")).toBe(null);
  expect(site.parseCommentCount("1.234,5 Kommentare")).toBe(null);
});

test("article extraction deduplicates canonical links and keeps card metadata", () => {
  const site = makeSite();
  const first = makeCard("/story/123/title?utm_source=feed", "Erste Meldung", "1.234 Kommentare", "2025-01-02");
  first.append(new FakeElement("a", { href: "https://www.derstandard.at/story/123/title#comments" }));
  const second = makeCard("https://derstandard.at/story/456/zweite", "Zweite Meldung", "7 Kommentare", "2025-01-03");
  const document = new FakeDocument([first, second]);

  const articles = site.extractArticles(document);
  expect(articles).toHaveLength(2);
  expect(articles.map((article) => article.key)).toEqual([
    "https://derstandard.at/story/123/title",
    "https://derstandard.at/story/456/zweite",
  ]);
  expect(articles[0]).toMatchObject({
    title: "Erste Meldung",
    commentCount: 1234,
    publishedAt: "2025-01-02",
    source: "card",
  });
});
