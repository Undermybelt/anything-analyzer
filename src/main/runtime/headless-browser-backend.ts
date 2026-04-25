import type { BrowserBackend } from "./browser-backend";
import { BrowserBackendUnavailableError } from "./browser-backend";

export class HeadlessExternalBrowserBackend implements BrowserBackend {
  readonly kind = "headless-external" as const;

  hasUi(): boolean {
    return false;
  }

  getTabManager() {
    return null;
  }

  getRendererWebContents() {
    return null;
  }

  getCaptureStartAdapter() {
    return null;
  }

  getBrowserSessionAdapter() {
    return null;
  }

  async navigateTo(_url: string): Promise<void> {
    throw new BrowserBackendUnavailableError();
  }

  goBack(): void {
    throw new BrowserBackendUnavailableError();
  }

  goForward(): void {
    throw new BrowserBackendUnavailableError();
  }

  reload(): void {
    throw new BrowserBackendUnavailableError();
  }

  listTabs(): Array<{ id: string; url: string; title: string }> {
    return [];
  }

  createTab(): { id: string; url: string; title: string } {
    throw new BrowserBackendUnavailableError();
  }

  closeTab(_tabId: string): void {
    throw new BrowserBackendUnavailableError();
  }

  async captureScreenshot(): Promise<string> {
    throw new BrowserBackendUnavailableError();
  }
}
