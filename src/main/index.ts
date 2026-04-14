import { app, BrowserWindow } from "electron";
import { getDatabase, closeDatabase } from "./db/database";
import { runMigrations } from "./db/migrations";
import {
  SessionsRepo,
  RequestsRepo,
  JsHooksRepo,
  StorageSnapshotsRepo,
  AnalysisReportsRepo,
} from "./db/repositories";
import { CaptureEngine } from "./capture/capture-engine";
import { SessionManager } from "./session/session-manager";
import { AiAnalyzer } from "./ai/ai-analyzer";
import { WindowManager } from "./window";
import { registerIpcHandlers, loadProxyConfig, applyProxy, loadMCPServerConfig } from "./ipc";
import { Updater } from "./updater";
import { MCPClientManager } from "./mcp/mcp-manager";
import { initMCPServer, stopMCPServer } from "./mcp/mcp-server";

const windowManager = new WindowManager();
const mcpManager = new MCPClientManager();

app.whenReady().then(() => {
  // Initialize database
  const db = getDatabase();
  runMigrations(db);

  // Initialize repositories
  const sessionsRepo = new SessionsRepo(db);
  const requestsRepo = new RequestsRepo(db);
  const jsHooksRepo = new JsHooksRepo(db);
  const storageSnapshotsRepo = new StorageSnapshotsRepo(db);
  const reportsRepo = new AnalysisReportsRepo(db);

  // Initialize capture engine
  const captureEngine = new CaptureEngine(
    requestsRepo,
    jsHooksRepo,
    storageSnapshotsRepo,
  );

  // Initialize session manager
  const sessionManager = new SessionManager(sessionsRepo, captureEngine);

  // Recover from potential crash
  sessionManager.recoverFromCrash();

  // Initialize AI analyzer
  const aiAnalyzer = new AiAnalyzer(
    sessionsRepo,
    requestsRepo,
    jsHooksRepo,
    storageSnapshotsRepo,
    reportsRepo,
  );

  // Create main window
  windowManager.createMainWindow();

  // Initialize tab manager with first tab
  windowManager.initTabs();

  // Apply proxy config from saved settings (before IPC handlers)
  const proxyConfig = loadProxyConfig();
  if (proxyConfig && proxyConfig.type !== "none") {
    applyProxy(proxyConfig).catch((err) =>
      console.error("Failed to apply proxy config:", err),
    );
  }

  // Initialize auto-updater
  const updater = new Updater();
  const mainWin = windowManager.getMainWindow();
  if (mainWin) updater.setMainWindow(mainWin);

  // Inject MCP client manager into AI analyzer
  aiAnalyzer.setMCPManager(mcpManager);

  // Register IPC handlers
  registerIpcHandlers({
    sessionManager,
    aiAnalyzer,
    windowManager,
    updater,
    mcpManager,
    sessionsRepo,
    requestsRepo,
    jsHooksRepo,
    storageSnapshotsRepo,
    reportsRepo,
  });

  // Check for updates on startup (non-blocking, delayed 3s)
  setTimeout(() => updater.checkForUpdates(), 3000);

  // Start MCP Server if enabled
  const mcpServerConfig = loadMCPServerConfig();
  if (mcpServerConfig.enabled) {
    initMCPServer(
      { sessionManager, aiAnalyzer, windowManager, requestsRepo, jsHooksRepo, storageSnapshotsRepo, reportsRepo },
      mcpServerConfig.port,
    ).catch((err) => console.error("Failed to start MCP Server:", err));
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
      windowManager.initTabs();
      const win = windowManager.getMainWindow();
      if (win) updater.setMainWindow(win);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopMCPServer().catch(() => {});
  mcpManager.disconnectAll().catch(() => {});
  closeDatabase();
});
