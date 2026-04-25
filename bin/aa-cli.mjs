#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync, writeFileSync, chmodSync } from "node:fs";
import { spawn } from "node:child_process";

const APP_SUPPORT_DIR = join(homedir(), "Library", "Application Support", "anything-analyzer");
const MCP_CONFIG_PATH = join(APP_SUPPORT_DIR, "mcp-server-config.json");
const MITM_CONFIG_PATH = join(APP_SUPPORT_DIR, "mitm-proxy-config.json");
const MCP_URL = process.env.AA_MCP_URL || "http://localhost:23816/mcp";
const ACCEPT = "application/json, text/event-stream";

function fail(message, extra) {
  const payload = { ok: false, error: message };
  if (extra !== undefined) payload.details = extra;
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Failed to parse JSON: ${path}`, String(error));
  }
}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      flags[raw.slice(0, eq)] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      flags[raw] = next;
      i += 1;
    } else {
      flags[raw] = true;
    }
  }
  return { positionals, flags };
}

function requireFlag(flags, name) {
  const value = flags[name];
  if (value === undefined || value === true || value === "") {
    fail(`Missing required flag --${name}`);
  }
  return value;
}

function parseMaybeJson(value, label = "value") {
  if (value === undefined || value === true) return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    fail(`Invalid JSON for ${label}`, String(error));
  }
}

function getMcpConfig() {
  const config = readJson(MCP_CONFIG_PATH, {});
  return {
    path: MCP_CONFIG_PATH,
    exists: existsSync(MCP_CONFIG_PATH),
    enabled: Boolean(config?.enabled),
    port: config?.port ?? 23816,
    authEnabled: config?.authEnabled !== false,
    authToken: config?.authToken || "",
  };
}

function getMitmConfig() {
  const config = readJson(MITM_CONFIG_PATH, {});
  return {
    path: MITM_CONFIG_PATH,
    exists: existsSync(MITM_CONFIG_PATH),
    enabled: Boolean(config?.enabled),
    port: config?.port ?? 8888,
    caInstalled: Boolean(config?.caInstalled),
    systemProxy: Boolean(config?.systemProxy),
  };
}

async function mcpInitialize(config) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "aa-cli", version: "0.1.0" },
    },
  };
  const headers = {
    "content-type": "application/json",
    accept: ACCEPT,
  };
  if (config.authEnabled && config.authToken) {
    headers.authorization = `Bearer ${config.authToken}`;
  }
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const sessionId = response.headers.get("mcp-session-id") || "";
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    fail("MCP initialize failed", {
      status: response.status,
      statusText: response.statusText,
      response: json,
    });
  }
  return { sessionId, response: json };
}

async function mcpCall(method, params, { transportSessionId, config, requestId = 2 } = {}) {
  const headers = {
    "content-type": "application/json",
    accept: ACCEPT,
  };
  if (config.authEnabled && config.authToken) {
    headers.authorization = `Bearer ${config.authToken}`;
  }
  if (transportSessionId) {
    headers["mcp-session-id"] = transportSessionId;
  }
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method,
      params,
    }),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    fail("MCP request failed", {
      method,
      status: response.status,
      statusText: response.statusText,
      response: json,
    });
  }
  return json;
}

function extractToolText(result) {
  const content = result?.result?.content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const textBlock = content.find((item) => item && item.type === "text");
  if (!textBlock) return content;
  const raw = textBlock.text;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function withTransport(fn) {
  const config = getMcpConfig();
  const init = await mcpInitialize(config);
  return fn({ config, transportSessionId: init.sessionId, initialize: init.response });
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function getProxyUrl(port) {
  return `http://127.0.0.1:${port}`;
}

function getBadBoyConfig(flags, mitm) {
  const browserPath =
    flags.path ||
    flags.browser ||
    process.env.BADBOYBROWSER_PATH ||
    process.env.BBB_PATH ||
    "BadBoyBrowser";
  const proxyUrl = flags.proxy || getProxyUrl(mitm.port);
  const extraArgs = [];
  const pushArg = (arg) => {
    if (arg && !extraArgs.includes(arg)) extraArgs.push(arg);
  };
  pushArg(`--proxy-server=${proxyUrl}`);
  if (flags["ignore-certificate-errors"] !== "false") {
    pushArg("--ignore-certificate-errors");
  }
  if (flags["ignore-certificate-errors-spki-list"]) {
    pushArg(`--ignore-certificate-errors-spki-list=${flags["ignore-certificate-errors-spki-list"]}`);
  }
  if (flags["user-data-dir"]) {
    pushArg(`--user-data-dir=${flags["user-data-dir"]}`);
  }
  if (flags["profile-directory"]) {
    pushArg(`--profile-directory=${flags["profile-directory"]}`);
  }
  if (flags["extra-arg"]) {
    const raw = Array.isArray(flags["extra-arg"]) ? flags["extra-arg"] : [flags["extra-arg"]];
    raw.forEach(pushArg);
  }
  return { browserPath, proxyUrl, extraArgs };
}

function writeScript(path, content) {
  writeFileSync(path, content, "utf8");
  chmodSync(path, 0o755);
}

function buildBadBoyLaunchScript({ browserPath, proxyUrl, extraArgs, targetUrl, name, mitm }) {
  const joinedArgs = extraArgs.map(shellQuote).join(" ");
  const tail = targetUrl ? ` ${shellQuote(targetUrl)}` : "";
  return `#!/bin/sh
set -eu

export HTTP_PROXY=${shellQuote(proxyUrl)}
export HTTPS_PROXY=${shellQuote(proxyUrl)}
export ALL_PROXY=${shellQuote(proxyUrl)}

echo '[aa-cli] browser=' ${shellQuote(browserPath)}
echo '[aa-cli] proxy=' ${shellQuote(proxyUrl)}
echo '[aa-cli] mitm_port=' ${shellQuote(String(mitm.port))}
echo '[aa-cli] target=' ${shellQuote(targetUrl || "")}

exec ${shellQuote(browserPath)} ${joinedArgs}${tail}
`;
}

async function createReverseSession(name, targetUrl, navigateFlag) {
  return withTransport(async ({ config, transportSessionId }) => {
    const created = await mcpCall(
      "tools/call",
      { name: "create_session", arguments: { name, targetUrl } },
      { config, transportSessionId, requestId: 2 },
    );
    const session = extractToolText(created);
    const sessionId = session?.id || session?.sessionId;
    if (!sessionId) {
      fail("create_session returned no session id", created);
    }
    const started = await mcpCall(
      "tools/call",
      { name: "start_capture", arguments: { sessionId, mode: "external" } },
      { config, transportSessionId, requestId: 3 },
    );
    let navigated = null;
    if (navigateFlag) {
      navigated = await mcpCall(
        "tools/call",
        { name: "navigate", arguments: { url: targetUrl } },
        { config, transportSessionId, requestId: 4 },
      );
    }
    return {
      session,
      sessionId,
      capture: extractToolText(started),
      navigate: navigated ? extractToolText(navigated) : null,
    };
  });
}

function usage() {
  printJson({
    ok: true,
    usage: [
      "aa-cli status",
      "aa-cli init",
      "aa-cli tools",
      "aa-cli sessions list",
      "aa-cli sessions create --name demo --url https://example.com",
      "aa-cli capture start --session <sessionId>",
      "aa-cli capture start --session <sessionId> --mode external",
      "aa-cli browser navigate --url https://example.com",
      "aa-cli requests list --session <sessionId>",
      "aa-cli requests filter --session <sessionId> --domain example.com --content-type json",
      "aa-cli requests detail --request <requestId>",
      "aa-cli hooks --session <sessionId>",
      "aa-cli storage --session <sessionId>",
      "aa-cli analyze --session <sessionId> --purpose reverse-api",
      "aa-cli followup --session <sessionId> --message 'summarize auth flow'",
      "aa-cli resource read --uri sessions://list",
      "aa-cli rpc --method tools/call --params '{\"name\":\"list_sessions\",\"arguments\":{}}'",
      "aa-cli reverse start --name demo --url https://example.com",
      "aa-cli reverse badboy-script --name demo --url https://example.com --path /Applications/BadBoyBrowser.app/Contents/MacOS/BadBoyBrowser",
      "aa-cli reverse badboy-open --name demo --url https://example.com --path /Applications/BadBoyBrowser.app/Contents/MacOS/BadBoyBrowser",
      "aa-cli reverse summarize --session <sessionId> --purpose reverse-api",
      "aa-cli mitm status",
      "aa-cli mitm hint",
    ],
  });
}

async function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  if (positionals.length === 0 || flags.help) {
    usage();
    return;
  }

  const [group, action] = positionals;

  if (group === "status") {
    const mcp = getMcpConfig();
    const mitm = getMitmConfig();
    let initialize = null;
    try {
      initialize = await mcpInitialize(mcp);
    } catch (error) {
      initialize = { error: String(error) };
    }
    printJson({
      ok: true,
      mcpUrl: MCP_URL,
      mcp,
      mitm,
      connectivity: initialize?.sessionId
        ? { ok: true, transportSessionId: initialize.sessionId, initialize: initialize.response }
        : { ok: false, details: initialize },
    });
    return;
  }

  if (group === "init") {
    const config = getMcpConfig();
    const initialize = await mcpInitialize(config);
    printJson({ ok: true, transportSessionId: initialize.sessionId, response: initialize.response });
    return;
  }

  if (group === "tools") {
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall("tools/list", {}, { config, transportSessionId });
      printJson({ ok: true, result });
    });
    return;
  }

  if (group === "resource" && action === "read") {
    const uri = requireFlag(flags, "uri");
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall("resources/read", { uri }, { config, transportSessionId });
      printJson({ ok: true, uri, result });
    });
    return;
  }

  if (group === "rpc") {
    const method = requireFlag(flags, "method");
    const params = parseMaybeJson(flags.params, "--params") || {};
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(method, params, { config, transportSessionId });
      printJson({ ok: true, method, result });
    });
    return;
  }

  if (group === "sessions" && action === "list") {
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "list_sessions", arguments: {} },
        { config, transportSessionId },
      );
      printJson({ ok: true, sessions: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "sessions" && action === "create") {
    const name = requireFlag(flags, "name");
    const targetUrl = flags.url || flags.targetUrl || flags.target || "about:blank";
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "create_session", arguments: { name, targetUrl } },
        { config, transportSessionId },
      );
      printJson({ ok: true, session: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "capture" && ["start", "pause", "resume", "stop"].includes(action)) {
    const sessionId = requireFlag(flags, "session");
    const toolMap = {
      start: "start_capture",
      pause: "pause_capture",
      resume: "resume_capture",
      stop: "stop_capture",
    };
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        {
          name: toolMap[action],
          arguments: action === "start" ? { sessionId, mode: flags.mode } : { sessionId },
        },
        { config, transportSessionId },
      );
      printJson({ ok: true, action, sessionId, result: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "browser" && action === "navigate") {
    const url = requireFlag(flags, "url");
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "navigate", arguments: { url } },
        { config, transportSessionId },
      );
      printJson({ ok: true, url, result: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "requests" && action === "list") {
    const sessionId = requireFlag(flags, "session");
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "get_requests", arguments: { sessionId } },
        { config, transportSessionId },
      );
      printJson({ ok: true, sessionId, requests: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "requests" && action === "filter") {
    const sessionId = requireFlag(flags, "session");
    const args = {
      sessionId,
      method: flags.method,
      domain: flags.domain,
      statusCode: flags["status-code"] ? Number(flags["status-code"]) : undefined,
      statusRange: flags["status-range"],
      contentType: flags["content-type"],
      urlPattern: flags["url-pattern"],
      limit: flags.limit ? Number(flags.limit) : undefined,
    };
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "filter_requests", arguments: args },
        { config, transportSessionId },
      );
      printJson({ ok: true, sessionId, requests: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "requests" && action === "detail") {
    const requestId = requireFlag(flags, "request");
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "get_request_detail", arguments: { requestId } },
        { config, transportSessionId },
      );
      printJson({ ok: true, requestId, detail: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "hooks") {
    const sessionId = requireFlag(flags, "session");
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "get_hooks", arguments: { sessionId } },
        { config, transportSessionId },
      );
      printJson({ ok: true, sessionId, hooks: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "storage") {
    const sessionId = requireFlag(flags, "session");
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "get_storage", arguments: { sessionId } },
        { config, transportSessionId },
      );
      printJson({ ok: true, sessionId, storage: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "analyze") {
    const sessionId = requireFlag(flags, "session");
    const args = {
      sessionId,
      purpose: flags.purpose,
      selectedSeqs: parseMaybeJson(flags["selected-seqs"], "--selected-seqs"),
    };
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "run_analysis", arguments: args },
        { config, transportSessionId },
      );
      printJson({ ok: true, sessionId, analysis: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "followup") {
    const sessionId = requireFlag(flags, "session");
    const message = requireFlag(flags, "message");
    await withTransport(async ({ config, transportSessionId }) => {
      const result = await mcpCall(
        "tools/call",
        { name: "chat_followup", arguments: { sessionId, message } },
        { config, transportSessionId },
      );
      printJson({ ok: true, sessionId, answer: extractToolText(result), raw: result });
    });
    return;
  }

  if (group === "reverse" && action === "start") {
    const name = requireFlag(flags, "name");
    const targetUrl = requireFlag(flags, "url");
    const reverse = await createReverseSession(name, targetUrl, flags.navigate !== "false");
    printJson({
      ok: true,
      mode: "reverse-start",
      session: reverse.session,
      capture: reverse.capture,
      navigate: reverse.navigate,
      next: [
        `Drive target in AA embedded browser or through AA MITM if using BadBoyBrowser/real browser.`,
        `Stop: aa-cli capture stop --session ${reverse.sessionId}`,
        `Filter: aa-cli requests filter --session ${reverse.sessionId} --content-type json`,
        `Analyze: aa-cli analyze --session ${reverse.sessionId} --purpose reverse-api`,
      ],
    });
    return;
  }

  if (group === "reverse" && action === "badboy-script") {
    const name = requireFlag(flags, "name");
    const targetUrl = requireFlag(flags, "url");
    const mitm = getMitmConfig();
    const reverse = await createReverseSession(name, targetUrl, false);
    const badboy = getBadBoyConfig(flags, mitm);
    const scriptPath =
      flags.output ||
      join(APP_SUPPORT_DIR, `launch-badboy-${reverse.sessionId}.sh`);
    const script = buildBadBoyLaunchScript({
      browserPath: badboy.browserPath,
      proxyUrl: badboy.proxyUrl,
      extraArgs: badboy.extraArgs,
      targetUrl,
      name,
      mitm,
    });
    writeScript(scriptPath, script);
    printJson({
      ok: true,
      mode: "reverse-badboy-script",
      session: reverse.session,
      sessionId: reverse.sessionId,
      proxyUrl: badboy.proxyUrl,
      browserPath: badboy.browserPath,
      extraArgs: badboy.extraArgs,
      scriptPath,
      run: `sh ${shellQuote(scriptPath)}`,
      next: [
        `Run: sh ${scriptPath}`,
        `After browsing: aa-cli capture stop --session ${reverse.sessionId}`,
        `Then: aa-cli reverse summarize --session ${reverse.sessionId}`,
      ],
    });
    return;
  }

  if (group === "reverse" && action === "badboy-open") {
    const name = requireFlag(flags, "name");
    const targetUrl = requireFlag(flags, "url");
    const mitm = getMitmConfig();
    const reverse = await createReverseSession(name, targetUrl, false);
    const badboy = getBadBoyConfig(flags, mitm);
    const child = spawn(badboy.browserPath, [...badboy.extraArgs, targetUrl], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        HTTP_PROXY: badboy.proxyUrl,
        HTTPS_PROXY: badboy.proxyUrl,
        ALL_PROXY: badboy.proxyUrl,
      },
    });
    child.unref();
    printJson({
      ok: true,
      mode: "reverse-badboy-open",
      session: reverse.session,
      sessionId: reverse.sessionId,
      browserPath: badboy.browserPath,
      proxyUrl: badboy.proxyUrl,
      extraArgs: badboy.extraArgs,
      spawned: true,
      next: [
        `Drive site in BadBoyBrowser via proxy ${badboy.proxyUrl}`,
        `Stop: aa-cli capture stop --session ${reverse.sessionId}`,
        `Summarize: aa-cli reverse summarize --session ${reverse.sessionId}`,
      ],
    });
    return;
  }

  if (group === "reverse" && action === "summarize") {
    const sessionId = requireFlag(flags, "session");
    const purpose = flags.purpose || "reverse-api";
    await withTransport(async ({ config, transportSessionId }) => {
      const requests = await mcpCall(
        "tools/call",
        { name: "filter_requests", arguments: { sessionId, contentType: "json", limit: 50 } },
        { config, transportSessionId, requestId: 2 },
      );
      const analysis = await mcpCall(
        "tools/call",
        { name: "run_analysis", arguments: { sessionId, purpose } },
        { config, transportSessionId, requestId: 3 },
      );
      printJson({
        ok: true,
        mode: "reverse-summarize",
        sessionId,
        requests: extractToolText(requests),
        analysis: extractToolText(analysis),
      });
    });
    return;
  }

  if (group === "mitm" && action === "status") {
    const mitm = getMitmConfig();
    printJson({ ok: true, mitm });
    return;
  }

  if (group === "mitm" && action === "hint") {
    const mitm = getMitmConfig();
    printJson({
      ok: true,
      mitm,
      usage: {
        proxyHost: "127.0.0.1",
        proxyPort: mitm.port,
        note: "AA sees external browser traffic only when that browser is routed through AA MITM. AA MCP does not attach to arbitrary existing tabs directly.",
        badboybrowser: [
          `If BadBoyBrowser supports proxy flags, point HTTP/HTTPS proxy to 127.0.0.1:${mitm.port}.`,
          `Preferred Chromium args: --proxy-server=http://127.0.0.1:${mitm.port} --ignore-certificate-errors`,
          `One-shot script: aa-cli reverse badboy-script --name demo --url https://target --path /path/to/BadBoyBrowser`,
          `Direct spawn: aa-cli reverse badboy-open --name demo --url https://target --path /path/to/BadBoyBrowser`,
          `If using system proxy route, AA app must have MITM enabled and system proxy enabled inside the Electron app.`,
          `After browsing, inspect with: aa-cli requests list --session <sessionId>`,
        ],
      },
    });
    return;
  }

  fail("Unknown command", { positionals, flags });
}

main().catch((error) => {
  fail("Unhandled error", String(error));
});
