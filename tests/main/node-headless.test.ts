import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

function readWorkspaceFile(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

describe("node headless runtime wiring", () => {
  it("uses node-headless entry instead of electron headless script", () => {
    const pkg = readWorkspaceFile("package.json");
    const config = readWorkspaceFile("electron.vite.cli.config.ts");

    expect(pkg).toContain('"aa:headless": "node ./out/main/nodeHeadless.js"');
    expect(pkg).toContain('"aa:headless:oneshot": "node ./out/main/nodeHeadless.js --oneshot"');
    expect(config).toContain("nodeHeadless: resolve('src/main/node-headless.ts')");
  });

  it("boots node headless runtime without electron.app imports", () => {
    const source = readWorkspaceFile("src/main/node-headless.ts");
    const legacyBridge = readWorkspaceFile("src/main/headless.ts");

    expect(source).toContain('runtime: "node"');
    expect(source).toContain('setMcpConfigPathProvider(pathProvider)');
    expect(source).toContain("createHeadlessPathProvider()");
    expect(source).toContain("export async function startNodeHeadless");
    expect(source).not.toContain('from "electron"');
    expect(source).not.toContain('from "node:process"');
    expect(source).not.toContain("app.whenReady");
    expect(legacyBridge.trim()).toBe('export { startNodeHeadless as startHeadless } from "./node-headless";');
  });
});
