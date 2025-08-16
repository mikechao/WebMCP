# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prerequisites
- Node.js >=22.12 (recommended: 24.3.0 per .nvmrc)
- pnpm ^10
- Chrome browser for extension development

## Essential Commands

### Development Setup
- `pnpm install` - Install all dependencies across the monorepo
- `pnpm build:shared` - Build all shared internal packages
- `pnpm build:apps` - Build all applications (extension, backend, native-server)
- `pnpm dev` - Start all development servers with automatic native messaging registration
- `pnpm dev:apps` - Start development servers for all apps
- `pnpm dev:mcp` - Start only extension and native-server (useful for MCP development)

### Build and Quality
- `pnpm build` - Build all projects in the monorepo (runs build:packages first, then builds apps)
- `pnpm typecheck` - Type-check all TypeScript files across the workspace
- `pnpm lint` - Run Biome linter with auto-fix
- `pnpm format` - Format code with Biome
- `pnpm check` - Run both linting and formatting checks
- `pnpm check-all` - Complete quality check (typecheck + biome ci)

### Testing
- `pnpm test` - Run all tests across the monorepo with Turbo (uses Vitest for unit tests)
- `pnpm test:e2e` - Run end-to-end tests using Playwright
- `pnpm --filter @mcp-b/e2e-tests test:ui` - Run E2E tests with UI
- `pnpm --filter @mcp-b/e2e-tests test:debug` - Debug E2E tests
- `pnpm --filter @mcp-b/e2e-tests test:headed` - Run tests with browser visible
- For specific e2e tests: `cd e2e-tests && pnpm test:basic` or `pnpm test:mcp`

### Extension Development
- `pnpm --filter @mcp-b/extension dev:firefox` - Run extension in Firefox
- `pnpm --filter @mcp-b/extension build:firefox` - Build for Firefox
- `pnpm --filter @mcp-b/extension zip` - Create extension zip for distribution
- `pnpm --filter @mcp-b/extension test:ui` - Run tests with UI
- `pnpm --filter @mcp-b/extension compile` - Type check without emit

### Deployment and Release
- `pnpm --filter @mcp-b/backend deploy` - Deploy backend to Cloudflare Workers
- `pnpm --filter @mcp-b/backend cf-typegen` - Generate Cloudflare types
- `pnpm changeset` - Create a changeset for version management
- `pnpm changeset:version` - Update versions based on changesets
- `pnpm changeset:publish` - Publish packages to npm

### Cleanup
- `pnpm clean` - Clean git artifacts (.cache, .turbo, node_modules)
- `pnpm clear-configs` - Clear native messaging configurations

### NPM Packages
NPM packages have been moved to a separate repository: https://github.com/WebMCP-org/npm-packages

### Examples
Examples have been moved to a separate repository: https://github.com/WebMCP-org/examples

To run examples, clone the examples repository and follow the instructions there.

## High-Level Architecture

This is MCP-B: a browser-native implementation of the Model Context Protocol (MCP) that allows websites to expose functionality as tools that AI agents can call directly.

### Core Concept
- **Traditional browser automation**: AI parses screenshots/DOM to "click" elements (slow, brittle)
- **MCP-B approach**: Websites expose structured tools that AI calls directly (fast, reliable)

### Key Components

#### 1. Transport Layer ([@mcp-b/transports](https://github.com/WebMCP-org/npm-packages))
The heart of MCP-B, providing browser-specific transport implementations:
- **TabServerTransport/TabClientTransport**: Uses `postMessage` for same-tab communication
- **ExtensionServerTransport/ExtensionClientTransport**: Uses Chrome runtime messaging for extension communication
- **NativeServerTransport/NativeClientTransport**: Bridges browser to local MCP clients

#### 2. Browser Extension (`apps/extension/`)
Built with WXT framework, acts as MCP client:
- **Background service**: Manages connections to websites and native hosts
- **Sidepanel**: React-based UI with chat interface and tool inspector
- **Content scripts**: Inject MCP clients into web pages
- Uses Assistant UI (@assistant-ui/react) for chat interfaces

#### 3. Web Tools & Extension Tools ([NPM Packages](https://github.com/WebMCP-org/npm-packages))
- **@mcp-b/web-tools**: MCP tools for web APIs (like Prompt API)
- **@mcp-b/extension-tools**: Auto-generated MCP tools for Chrome Extension APIs
- **@mcp-b/mcp-react-hooks**: React hooks for MCP integration

#### 4. Demo Website ([WebMCP-org/web](https://github.com/WebMCP-org/web))
Full-stack demo showcasing MCP-B capabilities:
- **Frontend**: React with MCP server exposing todo management tools
- **Backend**: Cloudflare Workers with Hono.js and PostgreSQL
- **Real-time sync**: ElectricSQL for live data updates

#### 5. Native Host (`apps/native-server/`)
Node.js server that bridges browser extension to local MCP clients:
- HTTP server on port 12306
- Proxies requests from desktop apps (Claude Desktop, Cursor) to browser
- **Native Messaging Setup**: Automatically registers native messaging host manifests for both regular Chrome and Chrome for Testing during development

### Data Flow
1. Website registers MCP server with tools using `TabServerTransport`
2. Extension injects client that discovers available tools
3. User interacts via extension's chat or calls tools directly
4. Tools execute in website context with full authentication
5. Results flow back to AI with visual feedback in UI

### Key Architectural Decisions
- **Browser-first**: Leverages existing web security model and user authentication
- **Deterministic**: Tools return structured data, not visual parsing
- **Scoped**: Tools are page-specific and respect user sessions
- **Auditable**: All tool calls visible in extension UI

## Development Workflow

### Adding New Transport Types
Transport implementations live in the [@mcp-b/transports](https://github.com/WebMCP-org/npm-packages) package and must implement the MCP transport interface.

### Creating New Tools
- For websites: Use `@mcp-b/transports` with `TabServerTransport`
- For extensions: Use `@mcp-b/extension-tools` or extend `BaseApiTools`
- Always use Zod schemas for input validation

### Extension Development
- Built with WXT (extension framework)
- Uses React with Tailwind CSS and Shadcn UI
- Background scripts manage MCP connections
- Sidepanel provides user interface
- Extension environment configuration via `apps/extension/.env` file
- Production extension ID: `daohopfhkdelnpemnhlekblhnikhdhfa` (Chrome Web Store)

### Testing Strategy
- Unit tests with **Vitest** for extension code
- E2E tests with **Playwright** testing real extension functionality
- Test libraries: `@testing-library/react`, `jsdom` for extension tests
- Manual testing with example applications
- Run `pnpm test` for all tests or filter specific packages

### Code Quality Tools
- **Biome** for linting and formatting (replaces ESLint/Prettier)
- **Turbo** for monorepo task orchestration
- **Husky** for git hooks (commit-msg, pre-commit)
- **Commitlint** for conventional commit messages
- Automated quality checks on commit via git hooks

### Package Publishing
Uses changesets for version management:
1. Make changes
2. Run `pnpm changeset` to document changes
3. Run `pnpm changeset:version` to update versions
4. Run `pnpm changeset:publish` to publish to npm
5. Native-server is published as `@mcp-b/native-server` on npm

### Native Messaging Setup

#### Development Workflow
The development workflow is fully automated with configurable extension IDs:

1. **New Developer Setup:**
   ```bash
   git clone <repo-url>
   cd WebMCP
   pnpm install
   
   # Optional: Configure your development extension ID
   cp apps/native-server/.env.example apps/native-server/.env
   # Edit apps/native-server/.env with your extension ID if different
   
   pnpm dev
   ```

2. **Finding Your Extension ID:**
   - Run `pnpm dev` first (uses default ID)
   - Open Chrome at `chrome://extensions/`
   - Enable "Developer mode"
   - Find your MCP-B extension and copy the ID
   - Update `apps/native-server/.env` with `DEV_EXTENSION_ID=your-extension-id`
   - Restart `pnpm dev`

3. **What `pnpm dev` does automatically:**
   - Builds all packages and the native server
   - Loads extension ID from `apps/native-server/.env` (git-ignored)
   - Registers native messaging host for both production and dev extension IDs
   - Starts WXT with a persistent profile (`apps/extension/.wxt/chrome-data`)
   - Launches the extension in Chrome

4. **Extension ID Management:**
   - Production extension ID: `mhipkdochajohklmmjinmicahanmldbj` (hardcoded)
   - Development extension ID: Configurable via `apps/native-server/.env` (git-ignored)
   - Default dev ID: `oeidgnbdmdjeacgmfhemhpngaplpkiel`
   - Both IDs are included in all native messaging manifests

5. **Persistent Profile Benefits:**
   - Browser data persists between dev sessions
   - Native messaging manifests are found correctly
   - Can install devtools extensions and remember logins
   - Configured via `apps/extension/web-ext.config.ts`

#### Manual Registration (if needed)
- Run `pnpm --filter @mcp-b/native-server run register:dev`
- Registers manifests in all Chrome variants and the persistent WXT profile

#### Troubleshooting
If you still get "Access to the specified native messaging host is forbidden":
- Ensure `pnpm dev` completed successfully
- Check that manifests exist in the persistent profile directory:
  - `apps/extension/.wxt/chrome-data/NativeMessagingHosts/com.chromemcp.nativehost.json`

## Important Implementation Notes

### Monorepo Structure

```
WebMCP/
├── apps/                    # Application packages
│   ├── extension/          # Browser extension (Chrome/Firefox)
│   ├── backend/            # Backend server (Cloudflare Workers)
│   └── native-server/      # Native messaging host (Node.js, port 12306)
├── shared/                 # Internal shared packages
│   └── utils/             # Shared utility functions
├── e2e-tests/             # End-to-end tests with Playwright
└── scripts/               # Build and maintenance scripts
```

### External Repositories
- **[npm-packages](https://github.com/WebMCP-org/npm-packages)** - Published NPM packages (@mcp-b/transports, @mcp-b/web-tools, etc.)
- **[examples](https://github.com/WebMCP-org/examples)** - Example applications
- **[web](https://github.com/WebMCP-org/web)** - Demo website with todo app
- **[webmcp-userscripts](https://github.com/WebMCP-org/webmcp-userscripts)** - Tampermonkey userscripts

### Build Dependencies
- Uses pnpm workspaces with Turbo for task orchestration
- Apps and shared packages have interdependencies requiring proper build order
- **Critical**: `build:shared` or `build:packages` must run before building apps
- Workspace uses pnpm catalog for centralized dependency version management

### Extension Permissions
Extension requires broad permissions for Chrome API access. Tools are scoped appropriately in implementation.

### Security Model
- Respects browser same-origin policy
- Tools execute in website context using existing user authentication
- No data leaves browser except through explicit tool calls

### Tool Naming Convention
Recent migration to domain-prefixed tool names (e.g., `domain_com_toolName`) for multi-tab disambiguation.

### Backend Infrastructure
- Cloudflare Workers with Hono.js framework
- PostgreSQL database for persistent storage
- ElectricSQL for real-time data synchronization
- Deploy with `pnpm --filter @mcp-b/backend deploy`