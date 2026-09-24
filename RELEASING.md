# Releasing n8n-nodes-pdfpipe

This repo is the canonical source and the only place the package is published
from. npm: https://www.npmjs.com/package/n8n-nodes-pdfpipe

A mirror used to live at `pdfpipe-api/integrations/n8n-nodes-pdfpipe`. It was
deleted on 2026-09-24 after it drifted and caused a release to be prepared in the
wrong place. Do not recreate it.

## What n8n Cloud verification requires

1. **npm provenance.** Only CI can generate it, through npm Trusted Publishing
   (OIDC). A local `npm publish` cannot, and a version published locally will
   fail verification.
2. **Source in this repo, tagged.** The published version must exist as a tag
   here.
3. **`repository` field** pointing at `Johin2/n8n-nodes-pdfpipe`.
4. **Bundled SVG icons.** `copy-icons.mjs` copies the SVGs into `dist/nodes` and
   `dist/credentials`, and `files` ships `dist`. The credential icon has to be in
   `dist/credentials`, because n8n resolves it relative to the compiled
   credential file.
5. **No manual auth.** API calls go through
   `httpRequestWithAuthentication('pdfPipeApi', ...)`, never a hand-set
   `Authorization` header. Enforced by
   `@n8n/community-nodes/no-http-request-with-manual-auth`.

v1.1.0 to v1.1.3 were published by hand and failed all of 1 to 4 at once.

## Release flow

1. Make the change here, on `main`.
2. Bump `version` in `package.json`.
3. Commit and push.
4. Wait for CI to pass.
5. `gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."`.
6. That fires `.github/workflows/release.yml`, which publishes with
   `--provenance` over OIDC. No token is involved.
7. npm processes a provenance publish asynchronously. The workflow prints
   `+ n8n-nodes-pdfpipe@X.Y.Z` and "your package is being processed"; the version
   can take several minutes to appear on the registry. Confirm with
   `curl -s https://registry.npmjs.org/n8n-nodes-pdfpipe | jq -r '."dist-tags".latest'`,
   which bypasses the local npm cache.
8. Verify: `npx @n8n/scan-community-package@latest n8n-nodes-pdfpipe`.

## Careful: two publish workflows exist

- **`release.yml`** is the real one. OIDC Trusted Publishing, no token, produces
  provenance. Triggered by publishing a GitHub Release.
- **`publish.yml`** is the old path. It authenticates with `secrets.NPM_TOKEN`,
  which last worked on 2026-06-11 and now fails with
  `E404 Not Found - PUT https://registry.npmjs.org/n8n-nodes-pdfpipe`. npm
  returns 404 rather than 403 for an unauthorised publish to a package that
  exists, so the error reads like a missing package when it is really a dead
  credential.

Use `release.yml`. Either rotate `NPM_TOKEN` or delete `publish.yml`, because as
it stands it looks like the publish path and is not.
