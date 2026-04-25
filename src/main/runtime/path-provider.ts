import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface PathProvider {
  getUserDataPath(): string;
  getDataDir(): string;
  getDatabasePath(): string;
  getMitmCaDir(): string;
  getMitmProxyConfigPath(): string;
  getMcpServerConfigPath(): string;
  getMcpServersPath(): string;
  getProxyConfigPath(): string;
  ensureAppDirs(): void;
}

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export class StandardPathProvider implements PathProvider {
  constructor(private readonly userDataPath: string) {}

  getUserDataPath(): string {
    return this.userDataPath;
  }

  getDataDir(): string {
    return join(this.userDataPath, "data");
  }

  getDatabasePath(): string {
    return join(this.getDataDir(), "anything-register.db");
  }

  getMitmCaDir(): string {
    return join(this.userDataPath, "mitm-ca");
  }

  getMitmProxyConfigPath(): string {
    return join(this.userDataPath, "mitm-proxy-config.json");
  }

  getMcpServerConfigPath(): string {
    return join(this.userDataPath, "mcp-server-config.json");
  }

  getMcpServersPath(): string {
    return join(this.userDataPath, "mcp-servers.json");
  }

  getProxyConfigPath(): string {
    return join(this.userDataPath, "proxy-config.json");
  }

  ensureAppDirs(): void {
    ensureDir(this.userDataPath);
    ensureDir(this.getDataDir());
    ensureDir(this.getMitmCaDir());
  }
}

export function createHeadlessPathProvider(appName: string = "anything-analyzer"): PathProvider {
  return new StandardPathProvider(join(homedir(), "Library", "Application Support", appName));
}
