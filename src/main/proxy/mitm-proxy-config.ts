import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { app } from "electron";
import type { PathProvider } from "../runtime/path-provider";
import { loadNodeMitmProxyConfig, saveNodeMitmProxyConfig } from "../runtime/node-config";

export interface MitmProxyConfig {
  enabled: boolean;
  port: number;
  caInstalled: boolean;
  systemProxy: boolean;
}

const DEFAULT_CONFIG: MitmProxyConfig = {
  enabled: false,
  port: 8888,
  caInstalled: false,
  systemProxy: false,
};

let pathProvider: PathProvider | null = null;

export function setMitmProxyConfigPathProvider(provider: PathProvider | null): void {
  pathProvider = provider;
}

function getConfigPath(): string {
  return pathProvider
    ? pathProvider.getMitmProxyConfigPath()
    : join(app.getPath("userData"), "mitm-proxy-config.json");
}

export function loadMitmProxyConfig(): MitmProxyConfig {
  if (pathProvider) {
    return loadNodeMitmProxyConfig(pathProvider);
  }

  const configPath = getConfigPath();
  if (!existsSync(configPath)) return { ...DEFAULT_CONFIG };

  try {
    const raw = readFileSync(configPath, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveMitmProxyConfig(config: MitmProxyConfig): void {
  if (pathProvider) {
    saveNodeMitmProxyConfig(pathProvider, config);
    return;
  }
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}
