import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { MCPServerSettings } from "@shared/types";
import type { PathProvider } from "./path-provider";

const DEFAULT_MCP_SERVER_CONFIG: MCPServerSettings = {
  enabled: false,
  port: 23816,
  authEnabled: true,
  authToken: randomUUID(),
};

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return { ...fallback, ...JSON.parse(readFileSync(filePath, "utf-8")) } as T;
  } catch {
    return fallback;
  }
}

export function loadNodeMainMcpServerConfig(pathProvider: PathProvider): MCPServerSettings {
  return readJsonFile(pathProvider.getMcpServerConfigPath(), { ...DEFAULT_MCP_SERVER_CONFIG });
}

export function saveNodeMainMcpServerConfig(pathProvider: PathProvider, config: MCPServerSettings): void {
  writeFileSync(pathProvider.getMcpServerConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}
