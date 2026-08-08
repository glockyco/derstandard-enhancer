# DerStandard Enhancer

A local [Violentmonkey](https://violentmonkey.github.io/) userscript for discovering articles, tracking reading progress, and sorting visible comments on [derStandard.at](https://www.derstandard.at/).

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/).
2. If the browser requires it, enable Violentmonkey to run user scripts. In Brave: `brave://extensions` → Violentmonkey → **Details** → **Allow User Scripts**.
3. In Violentmonkey, choose **Install from URL** and enter:

   `https://raw.githubusercontent.com/glockyco/derstandard-enhancer/main/derstandard-enhancer.user.js`

4. Reload derStandard.at.

Remove an older DerStandard Enhancer installation first. Violentmonkey does not downgrade an installed script. The generated userscript declares the same GitHub URL as its `@downloadURL` and `@updateURL`.

## Panel

The fixed **Entdecken** launcher opens a Shadow DOM panel with three tabs:

### Entdecken

- Finds article teasers on the current page without treating links inside an article body as recommendations.
- Switches between **Aktuelle Seite** and persisted **Meine Artikel** records.
- Searches title, section, date, and URL.
- Filters all, unread, read, saved, or ignored records.
- Sorts by date or visible comment count. Repeated activation cycles through descending, ascending, and original order; the preference persists.
- Saves or ignores an article without altering the publisher's teaser controls.

### Artikel

Available on article pages:

- Records visited state separately from reading progress.
- Measures progress across the article body up to the forum and offers a stored resume point.
- Builds a panel-local heading outline; selecting an entry moves focus to the corresponding reading target.
- Sorts the comments already present in the article forum by positive, negative, or total rating. **Original** restores the captured publisher order. Route changes and teardown also restore that order.

The enhancer does not post, vote, or call a private comment API.

### Daten

- Exports the complete local state as deterministic JSON.
- Rejects import files larger than 1 MiB before reading them.
- Validates versioned backups, normalizes migratable legacy data, previews record counts, and replaces local state only after explicit confirmation.
- Clears visited history only after confirmation; progress, saved articles, ignored articles, and preferences remain.
- Keeps storage failures visible until a later successful operation.

## Keyboard and accessibility

- `Escape`: close the panel and restore focus to the launcher.
- Arrow keys, `Home`, and `End`: move through the visible tabs using standard roving-tabindex semantics.

The enhancer does not register custom global keyboard shortcuts.

The panel uses labelled tabs and tab panels, concise live regions, persistent action focus after table rerenders, and visible labels for discovery controls.

## Storage and privacy

State is stored under `derstandard-enhancer-state` in the page origin's `localStorage`. Version 2 keeps visited metadata, saved and ignored records, progress values, and preferences separate. Each mutation refreshes the current durable value before writing, and storage events propagate later changes between open tabs. Browser storage is not transactional: truly simultaneous writes remain last-write-wins. Legacy keys are removed only after a successful migration.

`localStorage` is same-origin storage, not a secret store. Any script executing on derstandard.at with access to that origin can read it. The enhancer itself does not send this state anywhere and performs no external synchronization or analytics.

## Architecture

- `src/site.js`: URL canonicalization and page/article extraction.
- `src/storage.js`: versioned state, migration, bounded retention, imports, and cross-tab propagation.
- `src/comments.js`: bounded forum discovery, sorting, and native-order restoration.
- `src/controller.js`: Shadow DOM UI, accessibility, route lifecycle, and reading progress.
- `src/controller.css`: the single maintained stylesheet, injected into the generated userscript by `build.js`.

Publisher styles and controls remain untouched. Selecting a comment order temporarily reorders the forum's existing top-level comment nodes; **Original**, a route change, and teardown restore their captured native order. The only temporary attribute added outside the enhancer panel is `tabindex="-1"` on a reading target while it receives focus; it is removed on blur, panel close, or teardown.

Full discovery extraction is deferred while the panel is closed. Lightweight article lifecycle work continues, pending progress is flushed before route/page lifecycle exits, and the slow fallback route poll pauses while the document is hidden.

## Development

Install dependencies:

```sh
bun install --frozen-lockfile
```

Build or check the generated distribution:

```sh
bun run build
bun run check:dist
```

Format, lint, or run the complete local/CI gate:

```sh
bun run format
bun run lint
bun run check:quality
bun run test:unit
bun run test:browser
bun run verify
```

`bun run verify` checks Biome formatting and lint rules, generated-file freshness, 17 unit tests, and the Playwright browser suite. Biome is scoped to maintained source, tests, configuration, and build files; the generated userscript and vendored dependencies are excluded.
