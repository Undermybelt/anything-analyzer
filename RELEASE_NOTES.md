# BadBoy Analyzer v3.5.2

## Outcome

This release turns anything-analyzer into a CLI-first, Hermes-friendly reverse-analysis surface.

## Added

- `aa-cli` as the primary scriptable entry for sessions, capture, request inspection, analysis, follow-up chat, and reverse helpers
- pure Node headless runtime via `out/main/nodeHeadless.js`
- external capture workflow for BadBoyBrowser or any real browser routed through AA MITM
- agent-facing guide at `docs/hermes-aa-cli.md`

## Changed

- default release lane now targets CLI artifacts instead of desktop installers
- `pnpm build` now aliases the CLI-only build
- package tarball now ships only the minimal agent-facing files
- GitHub Actions release flow now uploads:
  - `*.tgz`
  - `bin/aa-cli.mjs`
  - `docs/hermes-aa-cli.md`

## Verified

- `pnpm build:cli`
- `pnpm exec vitest run tests/main/node-headless.test.ts tests/main/headless-mcp.test.ts`
- `pnpm exec vitest run tests/main/db/migrations.test.ts`
- `node ./out/main/nodeHeadless.js --oneshot`
- `npm pack`

## Release Artifacts

- `anything-analyzer-3.5.2.tgz`
- `aa-cli.mjs`
- `hermes-aa-cli.md`
