import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { MCPServerConfig, MCPServerSettings } from "@shared/types";
import type { MitmProxyConfig } from "../proxy/mitm-proxy-config";
import type { PathProvider } from "./path-provider";

const DEFAULT_MCP_SERVER_CONFIG: MCPServerSettings = {
  enabled: false,
  port: 23816,
  authEnabled: true,
  authToken: randomUUID(),
};

const DEFAULT_MITM_PROXY_CONFIG: MitmProxyConfig = {
  enabled: false,
  port: 8888,
  caInstalled: false,
  systemProxy: false,
};

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return { ...fallback, ...JSON.parse(readFileSync(filePath, "utf-8")) } as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function getMcpServersPath(pathProvider: PathProvider): string {
  return pathProvider.getMcpServersPath();
}

function migrateMcpServerConfig(raw: Record<string, unknown>): MCPServerConfig {
  if (!raw.transport) {
    return {
      id: raw.id as string,
      name: raw.name as string,
      enabled: raw.enabled as boolean,
      transport: "stdio",
      command: (raw.command as string) || "",
      args: (raw.args as string[]) || [],
      env: (raw.env as Record<string, string>) || {},
    };
  }
  return raw as unknown as MCPServerConfig;
}

export function loadNodeMcpServerConfig(pathProvider: PathProvider): MCPServerSettings {
  const filePath = pathProvider.getMcpServerConfigPath();
  return readJsonFile(filePath, { ...DEFAULT_MCP_SERVER_CONFIG });
}

export function saveNodeMcpServerConfig(pathProvider: PathProvider, config: MCPServerSettings): void {
  writeJsonFile(pathProvider.getMcpServerConfigPath(), config);
}

export function loadNodeMitmProxyConfig(pathProvider: PathProvider): MitmProxyConfig {
  return readJsonFile(pathProvider.getMitmProxyConfigPath(), { ...DEFAULT_MITM_PROXY_CONFIG });
}

export function saveNodeMitmProxyConfig(pathProvider: PathProvider, config: MitmProxyConfig): void {
  writeJsonFile(pathProvider.getMitmProxyConfigPath(), config);
}

export function loadNodeMcpServers(pathProvider: PathProvider): MCPServerConfig[] {
  const filePath = getMcpServersPath(pathProvider);
  if (!existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>[];
    return parsed.map(migrateMcpServerConfig);
  } catch {
    return [];
  }
}

export function saveNodeMcpServers(pathProvider: PathProvider, servers: MCPServerConfig[]): void {
  writeJsonFile(getMcpServersPath(pathProvider), servers);
}
