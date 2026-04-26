import type Database from "better-sqlite3";
import { getDatabase, closeDatabase, setDatabasePathProvider } from "../db/database";
import { runMigrations } from "../db/migrations";

import {
  SessionsRepo,
  RequestsRepo,
  JsHooksRepo,
  StorageSnapshotsRepo,
  AnalysisReportsRepo,
  FingerprintProfilesRepo,
  ChatMessagesRepo,
  AiRequestLogRepo,
} from "../db/repositories";
import { CaptureEngine } from "../capture/capture-engine";
import { NodeSessionManager } from "../node-session-manager";
import { AiAnalyzer } from "../ai/ai-analyzer";
import { MCPClientManager } from "../mcp/mcp-manager";
import { CaManager } from "../proxy/ca-manager";
import { MitmProxyServer } from "../proxy/mitm-proxy-server";
import { ProfileStore } from "../fingerprint/profile-store";
import type { RuntimeContext } from "./runtime-context";
import type { BrowserBackend } from "./browser-backend";
import type { PathProvider } from "./path-provider";
import { setIpcPathProvider } from "../ipc";

export interface BootstrapOptions {
  mode: "electron-ui" | "headless";
  pathProvider: PathProvider;
  browserBackend: BrowserBackend;
}

export function createRuntimeContext(options: BootstrapOptions): RuntimeContext {
  options.pathProvider.ensureAppDirs();
  setDatabasePathProvider(options.pathProvider);
  setIpcPathProvider(options.pathProvider);

  const db: Database.Database = getDatabase();
  runMigrations(db);

  const sessionsRepo = new SessionsRepo(db);
  const requestsRepo = new RequestsRepo(db);
  const jsHooksRepo = new JsHooksRepo(db);
  const storageSnapshotsRepo = new StorageSnapshotsRepo(db);
  const reportsRepo = new AnalysisReportsRepo(db);
  const chatMessagesRepo = new ChatMessagesRepo(db);
  const fingerprintRepo = new FingerprintProfilesRepo(db);
  const aiRequestLogRepo = new AiRequestLogRepo(db);

  const profileStore = new ProfileStore(fingerprintRepo);
  const captureEngine = new CaptureEngine(requestsRepo, jsHooksRepo, storageSnapshotsRepo);
  const sessionManager = new NodeSessionManager(sessionsRepo, captureEngine, profileStore);
  sessionManager.recoverFromCrash();

  const aiAnalyzer = new AiAnalyzer(
    sessionsRepo,
    requestsRepo,
    jsHooksRepo,
    storageSnapshotsRepo,
    reportsRepo,
    aiRequestLogRepo,
  );
  const mcpManager = new MCPClientManager();
  aiAnalyzer.setMCPManager(mcpManager);

  const caManager = new CaManager(options.pathProvider.getMitmCaDir());
  const mitmProxy = new MitmProxyServer(caManager);
  mitmProxy.on("response-captured", (data) => {
    captureEngine.handleResponseCaptured({ ...data, source: "proxy" });
  });

  return {
    mode: options.mode,
    pathProvider: options.pathProvider,
    db,
    repos: {
      sessionsRepo,
      requestsRepo,
      jsHooksRepo,
      storageSnapshotsRepo,
      reportsRepo,
      chatMessagesRepo,
      fingerprintRepo,
      aiRequestLogRepo,
    },
    sessionManager,
    aiAnalyzer,
    mcpManager,
    caManager,
    mitmProxy,
    profileStore,
    browserBackend: options.browserBackend,
  };
}

export function closeRuntimeContext(): void {
  closeDatabase();
}
