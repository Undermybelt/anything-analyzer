# BadBoy Analyzer

English | [简体中文](README.md)

BadBoy Analyzer is a CLI-first bridge that lets Hermes or any other agent drive anything-analyzer's MCP server and MITM capture pipeline without depending on the desktop UI.

It is meant for agent-driven reverse analysis of websites and apps, especially when pairing:
- `aa-cli`
- the pure Node headless runtime
- BadBoyBrowser or another real browser routed through AA MITM

## What it ships

- `bin/aa-cli.mjs` — scriptable CLI surface for MCP calls and reverse workflows
- `out/main/nodeHeadless.js` — built agent runtime entry
- `src/main/node-headless.ts` — source entry for the runtime above
- `docs/hermes-aa-cli.md` — usage guide for Hermes / agent workflows

## Why CLI-first

This repo's useful delivery surface for agents is not a `.dmg` or desktop installer.
Agents want:
- a callable CLI
- deterministic JSON output
- a headless runtime they can boot from shell
- a tarball or source checkout they can install and invoke

So release artifacts should be:
- npm tarball: `*.tgz`
- raw CLI file: `bin/aa-cli.mjs`
- docs: `docs/hermes-aa-cli.md`

Not desktop installers.

## Quick start

```bash
pnpm install
pnpm build:cli
node ./bin/aa-cli.mjs status
pnpm aa:headless:oneshot
```

## Agent workflow

1. Start headless runtime:

```bash
pnpm aa:headless
```

2. Create reverse session:

```bash
aa-cli reverse start --name badboy --url https://target.example
```

3. Route BadBoyBrowser through AA MITM:

```bash
aa-cli reverse badboy-open \
  --name badboy \
  --url https://target.example \
  --path /Applications/BadBoyBrowser.app/Contents/MacOS/BadBoyBrowser
```

4. Inspect captured traffic:

```bash
aa-cli requests list --session <sessionId>
aa-cli analyze --session <sessionId> --purpose reverse-api
```

## Release model

GitHub Actions now publishes CLI-oriented artifacts only:
- `npm pack` tarball
- `aa-cli.mjs`
- `hermes-aa-cli.md`

English is the default README surface. Chinese lives in `README.md`.

## Build commands

```bash
pnpm build:cli
pnpm aa:headless
pnpm aa:headless:oneshot
pnpm pack:cli
pnpm test -- --run tests/main/node-headless.test.ts tests/main/headless-mcp.test.ts tests/main/db/migrations.test.ts
```

`pnpm build` now aliases the CLI-only build.

## Notes

- Release target is now the Hermes/agent CLI lane, not desktop installers.
- For external browser reversing, AA MCP does not attach to arbitrary live tabs directly; traffic must pass through AA MITM.
- BadBoyBrowser works as the real browsing surface; anything-analyzer provides MITM capture, request inspection, and AI-assisted reverse analysis behind it.
- If a signed desktop product is needed later, ship it as a separate release lane.
