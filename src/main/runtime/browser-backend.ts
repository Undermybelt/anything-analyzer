import type { WebContents } from "electron";
import type { TabManager } from "../tab-manager";

export interface CaptureStartAdapter {
  start(sessionId: string): Promise<void>;
}

export interface BrowserSessionAdapter {
  clearActiveSessionData(): Promise<void>;
}

export interface BrowserBackend {
  kind: "electron-ui" | "headless-external";
  hasUi(): boolean;
  getTabManager(): TabManager | null;
  getRendererWebContents(): WebContents | null;
  getCaptureStartAdapter(): CaptureStartAdapter | null;
  getBrowserSessionAdapter(): BrowserSessionAdapter | null;
  navigateTo(url: string): Promise<void>;
  goBack(): void;
  goForward(): void;
  reload(): void;
  listTabs(): Array<{ id: string; url: string; title: string }>;
  createTab(url?: string): { id: string; url: string; title: string };
  closeTab(tabId: string): void;
  captureScreenshot(): Promise<string>;
}

export class BrowserBackendUnavailableError extends Error {
  constructor(message: string = "Browser UI backend unavailable in current runtime") {
    super(message);
    this.name = "BrowserBackendUnavailableError";
  }
}
