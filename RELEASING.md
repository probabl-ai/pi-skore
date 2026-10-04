# Releasing `@probabl/pi-skore`

How to publish a new version of the Pi meta-package.

`pi-skore` has no source of its own. It pins four packages in `dependencies`,
lists them in `bundleDependencies`, and points its `pi` manifest at their entry
points inside `node_modules`. A release is therefore "re-pin the inner versions,
verify the bundle, publish".

Publishing runs in GitHub Actions using
[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC), so
there is **no `NPM_TOKEN` secret**. The workflow file is
`.github/workflows/release.yml`.

## TL;DR (re-pin + release)

```sh
# 0. optionally update the pinned inner versions in package.json
npm install --legacy-peer-deps --no-audit --no-fund
npm run verify
npm pack --dry-run          # confirm the tarball is self-contained

# 1. bump pi-skore's own version (updates package.json and package-lock.json)
npm version patch --no-git-tag-version

# 2. commit and push
git add package.json package-lock.json
git commit -m "Release 0.1.1"
git push origin main

# 3. create the GitHub Release whose tag matches the version
gh release create 0.1.1 --title "Release 0.1.1" --generate-notes
```

The Release triggers the `Release` workflow, which runs
`npm ci --legacy-peer-deps`, `npm run verify`, and
`npm publish --provenance`. The package appears on npm with a provenance
attestation.

## One-time setup (already done — keep for reference / recovery)

- npm scope `@probabl` is provided by the `probabl` npm organization; the
  publishing account must be a member (owner/developer) with 2FA enabled.
- The package has a **Trusted Publisher** configured (npmjs.com → package →
  Settings → Trusted Publisher → GitHub Actions):

  | Field | Value |
  |---|---|
  | Organization | `probabl-ai` |
  | Repository | `pi-skore` |
  | Workflow filename | `release.yml` |
  | Environment | *(blank)* |

  Equivalent CLI (needs npm ≥ 11.15 and 2FA):

  ```sh
  npm trust github @probabl/pi-skore \
    --repo probabl-ai/pi-skore --file release.yml --allow-publish
  ```

If you rename `release.yml`, update the workflow filename in the trusted
publisher too, otherwise OIDC publishing stops working.

## Remotes

| Remote | Points at |
|---|---|
| `origin` | `probabl-ai/pi-skore` |

## Updating the pinned extensions

`pi-skore` versions its own releases. When one of the bundled packages ships a
new version, open a PR that:

1. Updates the exact version in `dependencies` (and `package-lock.json`):

   ```sh
   npm install @probabl/pi-ask-user-question@<new> --legacy-peer-deps --no-audit --no-fund
   ```

2. Re-runs the bundle check:
   ```sh
   npm run verify
   ```
3. Bumps `pi-skore`'s own `version` (patch if only inner pins moved; minor if
   the set of extensions changes) and follows *Cutting a release* below.

The `verify` script fails if a dependency is missing from `node_modules`, if a
`bundleDependencies` entry has no matching `dependencies` entry (or vice versa),
or if any `pi.extensions` path does not resolve.

## Before you release

```sh
git switch main && git pull
npm ci --legacy-peer-deps --no-audit --no-fund
npm run verify
```

`--legacy-peer-deps` is required locally and in CI: the bundled extensions
declare Pi's host packages (`@earendil-works/pi-*`, `typebox`, …) as
`peerDependencies`, and those are provided by Pi at runtime, not installed here.

## Cutting a release

1. Bump the version. `npm version <patch|minor|major> --no-git-tag-version`
   updates both `package.json` and `package-lock.json`.
2. Commit and push to `main`.
3. Create a GitHub Release (UI: *Releases → Draft a new release*, or
   `gh release create <version> --generate-notes`). The tag must equal the
   `package.json` version; both `0.1.1` and `v0.1.1` are accepted. The workflow
   fails fast if the tag and version disagree.
4. Watch the run: `gh run list -R probabl-ai/pi-skore -w Release`.
5. Verify:

   ```sh
   npm view @probabl/pi-skore version
   pi -e npm:@probabl/pi-skore
   pi install npm:@probabl/pi-skore
   ```

> The tarball is a self-contained bundle (~15 MB packed, tens of MB unpacked)
> because `bundleDependencies` physically embeds `pi-web-access` and its
> transitive tree. That is intentional: Pi hoists packages into one shared
> `~/.pi/agent/npm` root, so a relative `./node_modules/…` path only resolves
> from inside the tarball.

## Publishing without a GitHub Release

*Actions → Release → Run workflow*. It defaults to a dry run; clear the
`dry_run` checkbox to publish the version currently in `package.json`. This is
also authorized by the same trusted publisher.

## Manual publish (fallback)

Only needed if Actions/OIDC is unavailable. Requires 2FA:

```sh
npm login
npm whoami
npm publish --access public      # prompts for a one-time password
```

## Troubleshooting

- **`You cannot publish over the previously published versions: X`** — the
  version already exists on npm. Bump `version` (and `package-lock.json`) and
  release again. This is also why the `dry_run` path can fail: `npm publish
  --dry-run` still checks the registry for the version.
- **`verify-bundle: FAILED`** — a pinned dependency is missing from
  `node_modules` (run `npm install --legacy-peer-deps`), a `pi.extensions` path
  does not resolve, or `dependencies`/`bundleDependencies` disagree.
- **`ERESOLVE` during install** — use `--legacy-peer-deps`, as the CI workflow
  and `prepack` script do.
- **`EOTP` / one-time password required** — 2FA is `auth-and-writes`. Authenticate
  via the browser URL the CLI prints, or pass `--otp=<code>`.
- **`npm view` returns 404 right after the first publish** — npm's package
  *index* (packument) can lag behind the version/tarball, which are already
  live. Wait and retry; do not republish the same version. If it persists,
  contact `support@npmjs.com` and note that the `PUT` returned 200 while the
  packument 404s.
- **Provenance/auth errors in CI** — confirm the trusted publisher's
  Organization/Repository/Workflow filename exactly match this repository and
  `release.yml`.
