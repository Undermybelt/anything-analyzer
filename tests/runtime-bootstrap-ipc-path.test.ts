import { afterEach, describe, expect, it, vi } from "vitest";

const setDatabasePathProvider = vi.fn();
const getDatabase = vi.fn(() => ({ fake: true }));
const closeDatabase = vi.fn();
const runMigrations = vi.fn();
const setIpcPathProvider = vi.fn();
const recoverFromCrash = vi.fn();
const setMCPManager = vi.fn();
const onMitmProxy = vi.fn();

vi.mock("../src/main/db/database", () => ({
  getDatabase,
  closeDatabase,
  setDatabasePathProvider,
}));

vi.mock("../src/main/db/migrations", () => ({
  runMigrations,
}));

vi.mock("../src/main/ipc", () => ({
  setIpcPathProvider,
}));

vi.mock("../src/main/db/repositories", () => ({
  SessionsRepo: class SessionsRepo {},
  RequestsRepo: class RequestsRepo {},
  JsHooksRepo: class JsHooksRepo {},
  StorageSnapshotsRepo: class StorageSnapshotsRepo {},
  AnalysisReportsRepo: class AnalysisReportsRepo {},
  FingerprintProfilesRepo: class FingerprintProfilesRepo {},
  ChatMessagesRepo: class ChatMessagesRepo {},
  AiRequestLogRepo: class AiRequestLogRepo {},
}));

vi.mock("../src/main/capture/capture-engine", () => ({
  CaptureEngine: class CaptureEngine {
    handleResponseCaptured = vi.fn();
  },
}));

vi.mock("../src/main/node-session-manager", () => ({
  NodeSessionManager: class NodeSessionManager {
    recoverFromCrash = recoverFromCrash;
  },
}));

vi.mock("../src/main/ai/ai-analyzer", () => ({
  AiAnalyzer: class AiAnalyzer {
    setMCPManager = setMCPManager;
  },
}));

vi.mock("../src/main/mcp/mcp-manager", () => ({
  MCPClientManager: class MCPClientManager {},
}));

vi.mock("../src/main/proxy/ca-manager", () => ({
  CaManager: class CaManager {},
}));

vi.mock("../src/main/proxy/mitm-proxy-server", () => ({
  MitmProxyServer: class MitmProxyServer {
    on = onMitmProxy;
  },
}));

vi.mock("../src/main/fingerprint/profile-store", () => ({
  ProfileStore: class ProfileStore {},
}));

describe("createRuntimeContext", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wires path provider into ipc config loading for headless runtime", async () => {
    const { createRuntimeContext } = await import("../src/main/runtime/bootstrap");
    const pathProvider = {
      ensureAppDirs: vi.fn(),
      getMitmCaDir: vi.fn(() => "/tmp/aa-ca"),
    } as any;
    const browserBackend = {} as any;

    createRuntimeContext({
      mode: "headless",
      pathProvider,
      browserBackend,
    });

    expect(pathProvider.ensureAppDirs).toHaveBeenCalledTimes(1);
    expect(setDatabasePathProvider).toHaveBeenCalledWith(pathProvider);
    expect(setIpcPathProvider).toHaveBeenCalledWith(pathProvider);
  });
});
