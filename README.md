# DerStandard Enhancer

DerStandard Enhancer is a [Violentmonkey](https://violentmonkey.github.io/) userscript for finding articles, tracking reading progress, and sorting visible comments on [derStandard.at](https://www.derstandard.at/). It keeps your article history and preferences in your browser without external synchronization or analytics.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/).
2. Give Violentmonkey permission to run userscripts if your browser requires it. In Brave, open `brave://extensions`, select Violentmonkey, then Details, then Allow User Scripts.
3. In Violentmonkey, choose Install from URL and enter:

   ```text
   https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js
   ```

4. Reload derStandard.at and select the fixed "Entdecken" launcher.

The generated script uses the same GitHub URL for updates. Remove an older installation first if you need to install a lower version, because Violentmonkey does not downgrade an installed script.

## Find and save articles

Open the "Entdecken" tab to browse articles found on the current page or your stored "Meine Artikel" records. Search by title, section, date, or URL. Filter unread, read, saved, or ignored articles, and sort by date or visible comment count.

Saving or ignoring an article changes the enhancer's records, not the site's teaser controls.

## Resume reading and sort comments

On an article page, the "Artikel" tab shows reading progress, a stored resume point, and an outline of article headings. Visiting an article and reading it are tracked separately.

You can sort comments already loaded in the forum by positive, negative, or total rating. "Original" restores the captured site order. Navigation and script teardown also restore that order. The enhancer does not load the complete forum, post comments, vote, or call a private comment API.

Press `Escape` to close the panel and return focus to its launcher. Within the tabs, use arrow keys, `Home`, and `End` to navigate. The script adds no global keyboard shortcuts.

## Back up or clear your data

The "Daten" tab exports local state as JSON. Import previews the backup and replaces existing state only after confirmation. Clearing visited history leaves reading progress, saved and ignored articles, and preferences intact.

The enhancer stores state in the site's `localStorage`. Other scripts running on the same origin can read that storage, so do not treat it as private or encrypted storage. Changes propagate between open tabs, but simultaneous writes can overwrite each other. The script does not send this state elsewhere.

To stop using the enhancer, disable or remove it in Violentmonkey. Export a backup before clearing browser site data if you want to retain your records.

## Development

Use the Bun version declared in [package.json](package.json):

```sh
bun install --frozen-lockfile
bun run build
bun run check:dist
```

Edit the modules and stylesheet in [src/](src/), then rebuild [derstandard-enhancer.user.js](derstandard-enhancer.user.js). [build.js](build.js) defines script metadata and combines the maintained sources. Do not edit the generated script directly.

The complete local gate matches [CI](.github/workflows/verify.yml):

```sh
bun run verify
```

It checks Biome rules, generated-file freshness, unit tests, and Playwright browser tests. Install the Playwright browser as shown in the workflow before running browser tests. Individual check commands live in package.json.
