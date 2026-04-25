const process = globalThis.process;
import { closeRuntimeContext, createRuntimeContext } from "./runtime/bootstrap";
import { createHeadlessPathProvider } from "./runtime/path-provider";
import { HeadlessExternalBrowserBackend } from "./runtime/headless-browser-backend";
import { initMCPServer, stopMCPServer } from "./mcp/mcp-server";
import { setMitmProxyConfigPathProvider, type MitmProxyConfig } from "./proxy/mitm-proxy-config";
import { setMcpConfigPathProvider } from "./mcp/mcp-config";
import { loadMCPServerConfig, setIpcPathProvider } from "./ipc";
import { loadNodeMitmProxyConfig } from "./runtime/node-config";
import { SystemProxy } from "./proxy/system-proxy";
import type { RuntimeContext } from "./runtime/runtime-context";

let runtimeContext: RuntimeContext | null = null;
let shuttingDown = false;

export async function startNodeHeadless(): Promise<void> {
  const pathProvider = createHeadlessPathProvider();
  setMitmProxyConfigPathProvider(pathProvider);
  setMcpConfigPathProvider(pathProvider);
  setIpcPathProvider(pathProvider);

  runtimeContext = createRuntimeContext({
    mode: "headless",
    pathProvider,
    browserBackend: new HeadlessExternalBrowserBackend(),
  });

  const {
    sessionManager,
    aiAnalyzer,
    mcpManager,
    mitmProxy,
    caManager,
    repos: { requestsRepo, jsHooksRepo, storageSnapshotsRepo, reportsRepo },
  } = runtimeContext;

  const mcpServerConfig = loadMCPServerConfig();
  const port = Number(process.env.AA_MCP_PORT || mcpServerConfig.port || 23816);
  const authEnabled = process.env.AA_MCP_AUTH_ENABLED
    ? process.env.AA_MCP_AUTH_ENABLED !== "false"
    : mcpServerConfig.authEnabled;
  const authToken = process.env.AA_MCP_AUTH_TOKEN || mcpServerConfig.authToken;

  await initMCPServer(
    {
      sessionManager,
      aiAnalyzer,
      browserBackend: runtimeContext.browserBackend,
      requestsRepo,
      jsHooksRepo,
      storageSnapshotsRepo,
      reportsRepo,
    },
    port,
    authEnabled,
    authToken,
  );

  const mitmConfig: MitmProxyConfig = loadNodeMitmProxyConfig(pathProvider);
  if (mitmConfig.enabled) {
    await caManager.init();
    await mitmProxy.start(mitmConfig.port);
    if (mitmConfig.systemProxy) {
      await SystemProxy.enable(mitmConfig.port).catch((err) =>
        console.error("[node-headless] Failed to enable system proxy:", err),
      );
    }
  }

  console.log(JSON.stringify({ ok: true, runtime: "node", mode: "headless", mcpPort: port, mitmEnabled: mitmConfig.enabled, mitmPort: mitmConfig.port }));

  if (process.argv.includes("--oneshot")) {
    await shutdown(0);
  }
}

async function shutdown(code: number): Promise<void> {
  if (shuttingDown) {
    process.exit(code);
  }
  shuttingDown = true;

  try {
    await SystemProxy.disable().catch(() => {});
    await runtimeContext?.mitmProxy.stop().catch(() => {});
    await stopMCPServer().catch(() => {});
    await runtimeContext?.mcpManager.disconnectAll().catch(() => {});
  } finally {
    closeRuntimeContext();
    process.exit(code);
  }
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

startNodeHeadless().catch((err) => {
  console.error("[node-headless] Failed to start:", err);
  void shutdown(1);
});
