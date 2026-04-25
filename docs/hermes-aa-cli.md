# Hermes aa-cli

`aa-cli` turns anything-analyzer's local MCP server into a scriptable CLI for Hermes and shell use.

## Why

- Hermes can call a plain CLI without extra MCP client setup.
- anything-analyzer already owns capture, embedded browser control, request inspection, hooks, storage, and AI reverse analysis.
- For BadBoyBrowser or any real browser, AA can still inspect traffic when that browser is routed through AA's MITM proxy.

## Files

- CLI: `bin/aa-cli.mjs`
- npm script: `pnpm aa:cli -- ...`
- plan: `docs/hermes-aa-cli-plan.md`

## Requirements

1. anything-analyzer app running locally
2. MCP server enabled in app settings
3. If analyzing real-browser traffic, AA MITM must be enabled and that browser must use AA proxy

Default paths read by CLI:

- MCP config: `~/Library/Application Support/anything-analyzer/mcp-server-config.json`
- MITM config: `~/Library/Application Support/anything-analyzer/mitm-proxy-config.json`

## Basic usage

```bash
cd /Users/thrill3r/anything-analyzer
node ./bin/aa-cli.mjs status
node ./bin/aa-cli.mjs tools
pnpm aa:cli -- sessions list
```

## Reverse workflow

### 1. Start reverse session

```bash
node ./bin/aa-cli.mjs reverse start --name demo --url https://example.com
```

This does:

1. `create_session`
2. `start_capture`
3. `navigate`

### 2. Drive the target

Two modes.

#### Mode A: AA embedded browser

Drive the site inside anything-analyzer.

#### Mode B: BadBoyBrowser / real browser via AA MITM

Use AA as proxy target.

Check proxy hint:

```bash
node ./bin/aa-cli.mjs mitm hint
```

Generate launch script with proxy injected:

```bash
node ./bin/aa-cli.mjs reverse badboy-script \
  --name demo \
  --url https://example.com \
  --path /Applications/BadBoyBrowser.app/Contents/MacOS/BadBoyBrowser
```

Directly spawn browser with proxy env + Chromium flags:

```bash
node ./bin/aa-cli.mjs reverse badboy-open \
  --name demo \
  --url https://example.com \
  --path /Applications/BadBoyBrowser.app/Contents/MacOS/BadBoyBrowser
```

Supported injection knobs:

- `--path` / `--browser`
- `--proxy http://127.0.0.1:8888`
- `--user-data-dir ...`
- `--profile-directory ...`
- `--extra-arg ...`
- `--ignore-certificate-errors=false` to disable default cert bypass

Key fact: AA MCP cannot directly attach to arbitrary existing external tabs. For BadBoyBrowser capture, traffic must pass through AA MITM.

Runtime fact: Hermes-facing headless mode now boots the pure Node entry `src/main/node-headless.ts` and emits `out/main/nodeHeadless.js`; `src/main/headless.ts` remains only as a compatibility alias.

### 3. Stop and inspect

```bash
node ./bin/aa-cli.mjs capture stop --session <sessionId>
node ./bin/aa-cli.mjs requests filter --session <sessionId> --content-type json
node ./bin/aa-cli.mjs analyze --session <sessionId> --purpose reverse-api
```

### 4. Ask follow-up questions

```bash
node ./bin/aa-cli.mjs followup --session <sessionId> --message '列出认证头、签名字段、重放顺序'
```

## Command surface

### Health / transport

```bash
aa-cli status
aa-cli init
aa-cli tools
aa-cli rpc --method tools/list --params '{}'
aa-cli resource read --uri app://status
```

### Sessions / capture

```bash
aa-cli sessions list
aa-cli sessions create --name demo --url https://example.com
aa-cli capture start --session <sessionId>
aa-cli capture pause --session <sessionId>
aa-cli capture resume --session <sessionId>
aa-cli capture stop --session <sessionId>
```

### Browser / request / analysis

```bash
aa-cli browser navigate --url https://example.com
aa-cli requests list --session <sessionId>
aa-cli requests filter --session <sessionId> --domain example.com --content-type json
aa-cli requests detail --request <requestId>
aa-cli hooks --session <sessionId>
aa-cli storage --session <sessionId>
aa-cli analyze --session <sessionId> --purpose reverse-api
aa-cli followup --session <sessionId> --message 'summarize signing logic'
```

### High-level reverse helpers

```bash
aa-cli reverse start --name demo --url https://example.com
aa-cli reverse badboy-script --name demo --url https://example.com --path /path/to/BadBoyBrowser
aa-cli reverse badboy-open --name demo --url https://example.com --path /path/to/BadBoyBrowser
aa-cli reverse summarize --session <sessionId> --purpose reverse-api
```

### MITM hints

```bash
aa-cli mitm status
aa-cli mitm hint
```

## Hermes examples

```bash
cd /Users/thrill3r/anything-analyzer
node ./bin/aa-cli.mjs status
node ./bin/aa-cli.mjs reverse start --name shop --url https://target.example
node ./bin/aa-cli.mjs requests filter --session <sessionId> --domain api.target.example --content-type json
node ./bin/aa-cli.mjs analyze --session <sessionId> --purpose reverse-api
```

## Limits

- CLI talks only to the already-running AA app.
- CLI currently reads MITM state but does not toggle system proxy itself.
- If later needed, add AA-native proxy control endpoint or expose MITM toggles via MCP.
