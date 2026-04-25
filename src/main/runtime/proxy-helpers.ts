import { ProxyAgent, setGlobalDispatcher } from "undici";
import type { ProxyConfig } from "@shared/types";

export async function applyProxyConfig(config: ProxyConfig): Promise<void> {
  if (config.type === "none") return;

  let proxyUrl: string;

  if (config.type === "socks5") {
    proxyUrl = `socks5://${config.host}:${config.port}`;
  } else {
    const auth = config.username && config.password
      ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
      : "";
    proxyUrl = `${config.type}://${auth}${config.host}:${config.port}`;
  }

  const dispatcher = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(dispatcher);
}
