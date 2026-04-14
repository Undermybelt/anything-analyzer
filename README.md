# Anything Analyzer

> **一句话：** 打开浏览器操作一遍，AI 就帮你把协议逆向、加密分析、安全审计的活儿干了 —— 省掉你手动抓包、整理请求、逐条分析的那几个小时。

Universal web protocol analyzer — 一款内嵌浏览器的桌面应用，通过 Chrome DevTools Protocol 实时捕获网络请求、JS Hook、存储变化，并借助 AI 进行智能协议分析。

![Electron](https://img.shields.io/badge/Electron-35-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 这个项目解决什么问题？

传统的协议分析流程是这样的：

1. 开 Chrome DevTools 或 Fiddler/Charles 抓包
2. 手动翻几十上百条请求，找出关键接口
3. 一条条复制 headers、body，整理成文档
4. 自己分析鉴权流程、加密逻辑、API 模式
5. 手写 Python 复现代码

**Anything Analyzer 把 2～5 步全部交给 AI。** 你只需要在内嵌浏览器里正常操作网站，剩下的交给它。

---

## 使用场景

| 场景 | 具体例子 | 你能得到什么 |
|------|---------|-------------|
| **逆向 API 协议** | 想对接某个网站的非公开 API | 完整的 API 端点文档 + 鉴权流程 + Python 复现代码 |
| **JS 加密逆向** | 请求参数有加密签名，不知道怎么生成的 | 自动识别 CryptoJS/SM4/RSA 等加密库，还原加密流程，给出 Python 实现 |
| **安全审计** | 检查自家网站的接口安全性 | Token 泄露风险、CSRF/XSS 漏洞、敏感数据暴露等问题清单 |
| **性能分析** | 页面加载慢，想知道瓶颈在哪 | 请求瀑布图分析、冗余请求识别、缓存策略建议 |
| **学习 Web 协议** | 想理解某个网站的 OAuth/SSO 登录流程 | AI 帮你梳理完整的认证链路和 Token 流转过程 |
| **调试第三方集成** | 对接支付/社交登录等 SDK，想看实际请求 | 完整的请求/响应记录 + AI 解读每一步在做什么 |

---

## 适用人群

**适合你，如果你是：**

- 后端/全栈开发者 — 需要快速理解和对接第三方 API
- 安全研究员 — 做 Web 安全审计、渗透测试前的信息收集
- 爬虫开发者 — 逆向网站的 API 协议和加密参数
- 前端开发者 — 调试复杂的请求链路和加密逻辑
- 学生/学习者 — 想深入理解 HTTP 协议、OAuth、加密等 Web 技术

**不适合你，如果你：**

- 只需要简单地看一两个请求 — Chrome DevTools 就够了
- 需要修改/拦截请求（中间人代理） — 这不是 mitmproxy，本工具只读不改
- 需要自动化测试 — 这是分析工具，不是测试框架
- 分析非 HTTP 协议的流量 — 目前仅支持 HTTP/HTTPS + WebSocket + SSE

---

## Features

- **内嵌浏览器** — 多标签页浏览器，支持弹窗自动捕获为内部标签（OAuth 流程友好）
- **标签页安全防护** — 阻止页面脚本通过 `window.close()` 关闭标签页，防止应用崩溃；最后一个标签页被意外销毁时自动恢复
- **清除浏览器环境** — 一键清除 Cookies、localStorage、sessionStorage 和缓存数据，快速切换测试环境
- **全量网络抓包** — 基于 CDP Fetch 拦截，捕获所有 HTTP 请求/响应（含 headers、body）
- **SSE / WebSocket 识别** — 自动检测流式通信和 WebSocket 升级请求并标记
- **JS Hook 注入** — 拦截 `fetch`、`XMLHttpRequest`、`crypto.subtle`、`document.cookie` 及第三方加密库（CryptoJS、JSEncrypt、node-forge、SM2/3/4）
- **加密代码提取** — 自动从捕获的 JS 文件中提取加密相关代码片段，三级匹配优先级
- **存储快照** — 定时采集 Cookie、localStorage、sessionStorage 变化
- **两阶段 AI 分析** — Phase 1 智能过滤无关请求 → Phase 2 聚焦深度分析，内置 tool 支持 AI 按需查看请求详情
- **手动多选分析** — 勾选指定请求直接分析，跳过 AI 预过滤，精准控制分析范围
- **导出请求列表** — 将捕获的原始请求数据导出为 JSON 文件，便于离线分析或共享
- **多种分析模式** — 自动识别 / 逆向 API 协议 / 安全审计 / 性能分析 / JS 加密逆向，支持自定义 prompt 模板
- **MCP 工具扩展** — 支持 MCP Client（stdio + HTTP），AI 分析时可调用外部工具增强能力
- **内置 MCP Server** — 对外暴露会话管理、抓包控制、AI 分析等工具，支持被 Claude Desktop 等 MCP 客户端调用
- **流式输出 + 追问** — 分析报告流式显示，支持多轮追问对话
- **全局代理设置** — 支持 SOCKS5/HTTP/HTTPS 代理，Settings 中配置即时生效
- **自动更新** — 内置 electron-updater，支持一键升级
- **暗色主题** — 基于 Ant Design 的现代暗色界面

## Screenshots
<img width="2554" height="1400" alt="image" src="https://github.com/user-attachments/assets/87f24186-ea00-4a03-9634-4d7af4b224d4" />


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 35 + electron-vite |
| Frontend | React 19 + Ant Design 5 + TypeScript |
| Database | better-sqlite3 (local SQLite) |
| Protocol | Chrome DevTools Protocol (CDP) |
| AI | OpenAI / Anthropic / Custom LLM API（支持 Chat Completions + Responses API） |
| AI 扩展 | MCP Client（stdio + StreamableHTTP）+ 内置 MCP Server |

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** (recommended) or npm
- Visual Studio Build Tools (Windows, for native module compilation)

### Install

```bash
git clone https://github.com/MouseWW/anything-analyzer.git
cd anything-analyzer
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
# Build distributable
pnpm build

# Package as installer (Windows .exe)
pnpm run build && npx electron-builder --win
```

### Test

```bash
pnpm test
```

## Usage

1. **Create Session** — 点击左下角 "New Session"，输入名称和目标 URL
2. **Browse** — 在内嵌浏览器中操作目标网站（支持多标签页）
3. **Capture** — 点击 "Start Capture" 开始抓包，所有网络请求实时展示
4. **Analyze** — 停止捕获后点击 "Analyze"，AI 生成协议分析报告

### LLM Configuration

点击左下角 Settings 配置 LLM Provider：
- **OpenAI** — 填入 API Key 和 Model（如 `gpt-4o`），支持 Chat Completions 和 Responses API
- **Anthropic** — 填入 API Key 和 Model（如 `claude-sonnet-4-20250514`）
- **Custom** — 任何 OpenAI 兼容的 API（填入 Base URL）

### Analysis Purposes

分析时可选择不同目的：
- **自动识别** — AI 自动检测场景并生成通用分析
- **逆向 API 协议** — 聚焦 API 端点、鉴权流程、数据模型、Python 复现代码
- **安全审计** — 聚焦认证安全、敏感数据暴露、CSRF/XSS 风险
- **性能分析** — 聚焦请求时序、冗余请求、缓存策略
- **JS 加密逆向** — 聚焦加密算法识别、加密流程还原、Python 复现代码
- **自定义** — 输入自定义分析指令，或使用 Prompt 模板

### MCP Client（扩展 AI 分析能力）

支持通过外部 MCP Server 扩展 AI 分析能力。在 Settings → MCP Server 中配置：
- **本地命令（stdio）** — 如 `npx -y @anthropic/mcp-server-xxx`
- **远程服务（StreamableHTTP）** — 填入 URL 和可选的 Headers

### 内置 MCP Server（对外暴露工具）

Anything Analyzer 自身可作为 MCP Server 运行，将会话管理、抓包控制、AI 分析等能力暴露为 MCP 工具。在 Settings 中启用后，可被 Claude Desktop、Cursor 等 MCP 客户端连接使用。

## Architecture

```
src/
├── main/                    # Electron main process
│   ├── ai/                  # AI analysis pipeline
│   │   ├── ai-analyzer.ts   #   两阶段编排：Phase 1 过滤 → Phase 2 深度分析
│   │   ├── data-assembler.ts #  数据组装、过滤、token 预算
│   │   ├── prompt-builder.ts #  prompt 生成（含过滤 prompt + 分析 prompt）
│   │   ├── scene-detector.ts #  规则场景分类
│   │   ├── crypto-script-extractor.ts # JS 加密代码提取
│   │   └── llm-router.ts    #   LLM 路由（OpenAI / Anthropic / Custom + tool calling）
│   ├── capture/             # Capture engine
│   │   ├── capture-engine.ts #  data sink → SQLite + renderer
│   │   ├── js-injector.ts   #   hook script injection
│   │   └── storage-collector.ts # periodic storage snapshots
│   ├── cdp/
│   │   └── cdp-manager.ts   # Chrome DevTools Protocol manager
│   ├── mcp/                 # MCP 集成
│   │   ├── mcp-manager.ts   #   MCP Client 连接管理
│   │   ├── mcp-server.ts    #   内置 MCP Server（对外暴露工具）
│   │   └── mcp-config.ts    #   配置持久化
│   ├── db/                  # SQLite database layer
│   ├── session/
│   │   └── session-manager.ts # session lifecycle + per-tab capture
│   ├── prompt-templates.ts  # Prompt 模板管理
│   ├── tab-manager.ts       # Multi-tab WebContentsView management
│   ├── updater.ts           # Auto-update via electron-updater
│   ├── window.ts            # Main window + layout management
│   └── ipc.ts               # IPC handler registration
├── preload/                 # Context bridge + hook script
├── renderer/                # React UI
│   ├── components/          # UI components
│   │   ├── TabBar.tsx       #   browser tab bar
│   │   ├── BrowserPanel.tsx #   address bar + navigation
│   │   ├── ControlBar.tsx   #   capture controls + analysis purpose
│   │   ├── RequestLog.tsx   #   request list table
│   │   ├── ReportView.tsx   #   AI report + follow-up chat
│   │   ├── SettingsModal.tsx #   LLM config
│   │   ├── MCPServerModal.tsx #  MCP server config
│   │   ├── PromptTemplateModal.tsx # Prompt template editor
│   │   └── ...
│   └── hooks/               # React hooks
└── shared/
    └── types.ts             # Shared type definitions
```
---
本项目`不具备`以下能力：
- 不具备【非法获取计算机数据】的功能
- 不具备【非法修改计算机数据】的功能
- 不具备【非法控制计算机系统】的功能
- 不具备【破坏计算机系统】的功能
- 不具备【内置AI模型】 （AI模型由用户自己配置，请按照《生成式人工智能服务管理暂行办法》合规使用大模型）
  
**务必不要使用本工具进行任何违反中国法律的行为！！！**

**务必不要使用本工具进行任何违反中国法律的行为！！！**

**务必不要使用本工具进行任何违反中国法律的行为！！！**

---

Finally，Thanks to everyone on LinuxDo for their support! Welcome to join https://linux.do/ for all kinds of technical exchanges, cutting-edge AI information, and AI experience sharing, all on Linuxdo!

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Mouseww/anything-analyzer&type=Date)](https://star-history.com/#Mouseww/anything-analyzer&Date)

---

## License

MIT
