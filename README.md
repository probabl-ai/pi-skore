# pi-skore

One-command Pi distribution. `pi-skore` bundles four Pi packages — three
extensions and one skill lifecycle — into a single pinned npm package.

```bash
pi install npm:@probabl/pi-skore
```

That is the whole setup. Pi installs the package, and the bundled extensions
are discovered from the package's `pi` manifest. Nothing else to configure.

## What you get

| Extension | Source | What it adds |
|---|---|---|
| **skill lifecycle** | [`@probabl/pi-skill-lifecycle`](https://www.npmjs.com/package/@probabl/pi-skill-lifecycle) | OpenCode-style skill loading: a `skill` tool, a binding skill protocol, and archiving of stale skill bodies. No configuration. |
| **ask user question** | [`@probabl/pi-ask-user-question`](https://www.npmjs.com/package/@probabl/pi-ask-user-question) | The `ask_user_question` tool, scaled past 4 questions × 4 options, with a windowed tab bar and scrolling option lists. `PgUp` / `PgDn` and the mouse wheel scroll the conversation behind the dialog while you answer. |
| **thinking fold** | [`@99percentpeople/pi-thinking-fold`](https://www.npmjs.com/package/@99percentpeople/pi-thinking-fold) | Folds reasoning/thinking output in the TUI. |
| **web access** | [`pi-web-access`](https://www.npmjs.com/package/pi-web-access) | Web search and fetch tools (search providers, `fetch_content`, video/PDF/GitHub fetching). |

Each package is pinned to an exact version, so a given `pi-skore` release is a
reproducible set of extension versions rather than a floating set.

## How it is built

The package has no source of its own. It declares the four packages in
`dependencies`, lists them in `bundleDependencies`, and points its `pi`
manifest at their real entry points inside `node_modules`:

```json
{
  "pi": {
    "extensions": [
      "./node_modules/@probabl/pi-skill-lifecycle/extensions/index.ts",
      "./node_modules/@probabl/pi-ask-user-question/index.ts",
      "./node_modules/@99percentpeople/pi-thinking-fold/index.min.js",
      "./node_modules/pi-web-access/dist"
    ]
  },
  "dependencies": { "…": "exact version" },
  "bundleDependencies": ["…"]
}
```

Bundling is required, not cosmetic. Pi installs npm packages into one shared
root (`~/.pi/agent/npm`), so a dependency's files are hoisted to
`node_modules/<name>` next to `@probabl/pi-skore` — not into a package-local
`node_modules`. A relative `./node_modules/…` path would therefore not resolve
for a registry install. `bundleDependencies` makes `npm pack` place each
dependency (and its transitive tree) physically inside the published tarball,
which is what Pi documents for Pi packages used as dependencies.

Check the bundle before publishing:

```bash
npm install      # populates node_modules with the four pinned packages
npm run verify   # every dependency present, every pi.extensions path resolves
npm pack         # -> probabl-pi-skore-<version>.tgz (self-contained)
```

The tarball is large (~15 MB) because `pi-web-access` pulls in Express, the MCP
SDK, `unpdf`, `undici`, and friends. Those licenses ship inside the tarball.

## Updating

```bash
pi update npm:@probabl/pi-skore     # move to the newest pi-skore release
pi update --extensions              # update every installed package
```

Because the inner versions are pinned, an update arrives as a new `pi-skore`
release that re-pins them. To bump the bundle, edit the versions in
`package.json`, run `npm install && npm run verify && npm pack`, then publish.

## Uninstalling

```bash
pi remove npm:@probabl/pi-skore
```

## Do not install the pieces twice

`pi-skore` already ships all four packages. Installing
`@probabl/pi-skill-lifecycle`, `@probabl/pi-ask-user-question`,
`@99percentpeople/pi-thinking-fold`, or `pi-web-access` separately alongside
`pi-skore` loads two copies with separate module roots. Add the individual
package only if you want it *instead of* the bundle.

## Third-party notices

- `@probabl/pi-skill-lifecycle` — MIT, Probabl.
- `@probabl/pi-ask-user-question` — MIT, Probabl; a fork of
  `@juicesharp/rpiv-ask-user-question` by juicesharp.
- `@99percentpeople/pi-thinking-fold` — MIT, 99percentpeople.
- `pi-web-access` — MIT, Nicolas Bailon.

Each package's own `LICENSE` file is included in the tarball.

## License

MIT — see [LICENSE](./LICENSE).