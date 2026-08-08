# DerStandard Enhancer

A local Violentmonkey userscript that improves discovery, reading progress, and comment browsing on [derStandard.at](https://www.derstandard.at/).

## Install

1. Install [Violentmonkey](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) in Brave or another supported browser.
2. Open `chrome://extensions` (or the equivalent extensions page).
3. Open Violentmonkey's **Details** and enable **Allow User Scripts**.
4. Open the userscript file:
   - [Install from the raw GitHub file](https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js), or
   - Choose **New from file** in Violentmonkey and select `derstandard-enhancer.user.js`.
5. Visit derStandard.at and reload the page.

The script declares GitHub `@downloadURL` and `@updateURL` metadata, so Violentmonkey can check for future releases.

## Features

- Discovery panel for current-page articles, newest RSS items, and locally observed most-commented items.
- Search plus read, saved, and ignored article filters.
- Visited markers, scroll progress, resume reading, and JSON export/import.
- Ignore and restore controls for articles.
- Font scaling, text-width preferences, and an article outline.
- Reversible sorting of loaded top-level comments by native order, positive ratings, negative ratings, or total ratings.
- Keyboard shortcuts: `Alt+Shift+O` opens the panel; `Alt+Shift+R` resumes reading.
- Local-only state via `localStorage`; no posting, voting, private API calls, or external synchronization.

## Limitations

- “Most commented” is based on comment counts visible in the current page, not a global derStandard ranking API.
- Comment sorting affects loaded top-level comments only. Replies and unloaded comments remain under the site's control.
- RSS discovery is best-effort and falls back to current-page data when the feed is unavailable or blocked.

## Development

The canonical source modules are in [`src/`](src/). The installable single-file userscript is [`derstandard-enhancer.user.js`](derstandard-enhancer.user.js); it intentionally embeds the modules so Violentmonkey can install it directly.
