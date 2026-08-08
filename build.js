const header = `// ==UserScript==
// @name         DerStandard Enhancer
// @namespace    https://github.com/glockyco/derstandard-enhancer
// @version      0.1.8
// @description  Panel für Artikelsuche und Lesefortschritt auf derStandard.at
// @match        https://www.derstandard.at/*
// @match        https://derstandard.at/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js
// @updateURL    https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js
// ==/UserScript==
`;

const modules = ["src/site.js", "src/storage.js", "src/comments.js", "src/controller.js"];

async function render() {
  const [styles, ...sources] = await Promise.all([
    Bun.file("src/controller.css").text(),
    ...modules.map((path) => Bun.file(path).text()),
  ]);
  const styleModule = `(function (global) { global.DSUXStyles = ${JSON.stringify(styles)}; }(typeof window !== "undefined" ? window : globalThis));`;
  return [header, styleModule, ...sources].join("\n\n");
}

function bytesEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

const args = Bun.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
  const unknown = args.find((arg) => arg !== "--check") ?? "--check";
  console.error(`Unknown argument: ${unknown}`);
  console.error("Usage: bun build.js [--check]");
  process.exitCode = 1;
} else {
  const rendered = await render();
  if (args[0] === "--check") {
    let committed;
    try {
      committed = new Uint8Array(await Bun.file("derstandard-enhancer.user.js").arrayBuffer());
    } catch {
      committed = null;
    }
    const expected = new TextEncoder().encode(rendered);
    if (committed && bytesEqual(committed, expected)) {
      console.log("derstandard-enhancer.user.js is up to date.");
    } else {
      console.error("derstandard-enhancer.user.js is stale; run `bun build.js` to regenerate it.");
      process.exitCode = 1;
    }
  } else {
    await Bun.write("derstandard-enhancer.user.js", rendered);
  }
}
