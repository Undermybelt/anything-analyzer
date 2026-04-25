import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

function readWorkspaceFile(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

describe("headless MCP capture wiring", () => {
  it("exposes external capture mode on the MCP start_capture tool", () => {
    const source = readWorkspaceFile("src/main/mcp/mcp-server.ts");

    expect(source).toContain('"start_capture"');
    expect(source).toContain('z.enum(["browser-ui", "external"])');
    expect(source).toContain('sessionManager.startExternalCapture(sessionId)');
  });


  it("documents CLI capture mode override and headless scripts", () => {
    const cli = readWorkspaceFile("bin/aa-cli.mjs");
    const pkg = readWorkspaceFile("package.json");

    expect(cli).toContain('arguments: action === "start" ? { sessionId, mode: flags.mode } : { sessionId }');
    expect(cli).toContain('aa-cli capture start --session <sessionId> --mode external');
    expect(pkg).toContain('"aa:headless": "node ./out/main/nodeHeadless.js"');
  });
});
