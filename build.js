const header = `// ==UserScript==
// @name         DerStandard Enhancer
// @namespace    https://github.com/glockyco/derstandard-enhancer
// @version      0.1.0
// @description  Entdeckung, Lesefortschritt und Kommentare für derStandard
// @match        https://www.derstandard.at/*
// @match        https://derstandard.at/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js
// @updateURL    https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js
// ==/UserScript==
`;

const modules = [
  "src/storage.js",
  "src/site.js",
  "src/comments.js",
  "src/controller.js",
];

const [styles, ...sources] = await Promise.all([
  Bun.file("src/controller.css").text(),
  ...modules.map((path) => Bun.file(path).text()),
]);
const styleModule = `(function (global) { global.DSUXStyles = ${JSON.stringify(styles)}; }(typeof window !== "undefined" ? window : globalThis));`;
await Bun.write("derstandard-enhancer.user.js", [header, styleModule, ...sources].join("\n\n"));
