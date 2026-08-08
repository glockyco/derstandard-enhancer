const header = `// ==UserScript==
// @name         DerStandard Enhancer
// @namespace    https://www.derstandard.at/
// @version      1.6.0
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

const sources = await Promise.all(modules.map((path) => Bun.file(path).text()));
await Bun.write("derstandard-enhancer.user.js", [header, ...sources].join("\n\n"));
