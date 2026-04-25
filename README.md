# BadBoy Analyzer

[English](README.en.md) | 简体中文

BadBoy Analyzer 现以 CLI 为主发布面，供 Hermes 或其他 agent 直接调用 anything-analyzer 的 MCP 与 MITM 能力，用于网站逆向抓包、协议分析、请求复放线索提取。

核心组合：
- `aa-cli`
- 纯 Node headless runtime
- BadBoyBrowser 或其他真实浏览器，经 AA MITM 代理导流

## 交付面

- `bin/aa-cli.mjs` —— 可脚本化 CLI
- `out/main/nodeHeadless.js` —— 已构建 agent runtime 入口
- `src/main/node-headless.ts` —— 上述 runtime 之源码入口
- `docs/hermes-aa-cli.md` —— Hermes / agent 调用说明

## 为何不用 dmg

此仓对 agent 真正有用者，不是桌面安装包，而是：
- 可直接调用之 CLI
- 稳定 JSON 输出
- 可由 shell 拉起之 headless runtime
- 可被 Hermes / 其他 agent 安装与分发之源码或 tarball

故默认发布产物应为：
- `*.tgz`
- `bin/aa-cli.mjs`
- `docs/hermes-aa-cli.md`

非 `.dmg`、`.exe`、`.AppImage`。

## 快起

```bash
pnpm install
pnpm build:cli
node ./bin/aa-cli.mjs status
pnpm aa:headless:oneshot
```

## Agent 工作流

1. 启动 headless runtime：

```bash
pnpm aa:headless
```

2. 建逆向会话：

```bash
aa-cli reverse start --name badboy --url https://target.example
```

3. 令 BadBoyBrowser 走 AA MITM：

```bash
aa-cli reverse badboy-open \
  --name badboy \
  --url https://target.example \
  --path /Applications/BadBoyBrowser.app/Contents/MacOS/BadBoyBrowser
```

4. 查已捕获流量：

```bash
aa-cli requests list --session <sessionId>
aa-cli analyze --session <sessionId> --purpose reverse-api
```

## 发布模型

GitHub Actions 现仅发布 CLI 向产物：
- `npm pack` 生成之 tarball
- `aa-cli.mjs`
- `hermes-aa-cli.md`

## 常用命令

```bash
pnpm build:cli
pnpm aa:headless
pnpm aa:headless:oneshot
pnpm pack:cli
pnpm test -- --run tests/main/node-headless.test.ts tests/main/headless-mcp.test.ts tests/main/db/migrations.test.ts
```

`pnpm build` 现等同 CLI-only 构建。

## 说明

- 当前默认发布面，乃 Hermes/agent CLI，而非桌面安装包。
- 对真实浏览器逆向，AA MCP 不会直接接管任意外部现存 tab；流量须先经 AA MITM。
- BadBoyBrowser 可作真实浏览器表面；anything-analyzer 负责其后之 MITM 抓包、请求检查与 AI 辅助逆向分析。
- 若日后仍要签名桌面版，应另开独立 release lane，不与 agent CLI 发布面混同。

## License

MIT
