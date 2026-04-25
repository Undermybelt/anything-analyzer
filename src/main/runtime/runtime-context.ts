import type Database from "better-sqlite3";
import type { SessionManager } from "../session/session-manager";
import type { AiAnalyzer } from "../ai/ai-analyzer";
import type { MCPClientManager } from "../mcp/mcp-manager";
import type { Updater } from "../updater";
import type { CaManager } from "../proxy/ca-manager";
import type { MitmProxyServer } from "../proxy/mitm-proxy-server";
import type { ProfileStore } from "../fingerprint/profile-store";
import type { BrowserBackend } from "./browser-backend";
import type { PathProvider } from "./path-provider";
import type {
  SessionsRepo,
  RequestsRepo,
  JsHooksRepo,
  StorageSnapshotsRepo,
  AnalysisReportsRepo,
  ChatMessagesRepo,
  FingerprintProfilesRepo,
  AiRequestLogRepo,
} from "../db/repositories";

export interface RuntimeRepos {
  sessionsRepo: SessionsRepo;
  requestsRepo: RequestsRepo;
  jsHooksRepo: JsHooksRepo;
  storageSnapshotsRepo: StorageSnapshotsRepo;
  reportsRepo: AnalysisReportsRepo;
  chatMessagesRepo: ChatMessagesRepo;
  fingerprintRepo: FingerprintProfilesRepo;
  aiRequestLogRepo: AiRequestLogRepo;
}

export interface RuntimeContext {
  mode: "electron-ui" | "headless";
  pathProvider: PathProvider;
  db: Database.Database;
  repos: RuntimeRepos;
  sessionManager: SessionManager;
  aiAnalyzer: AiAnalyzer;
  mcpManager: MCPClientManager;
  caManager: CaManager;
  mitmProxy: MitmProxyServer;
  profileStore: ProfileStore;
  browserBackend: BrowserBackend;
  updater?: Updater;
}
