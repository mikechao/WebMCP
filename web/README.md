# MCP-B Demo Website

Full-stack demo application showcasing MCP-B (Model Context Protocol for Browsers) capabilities with a production-ready architecture.

## Overview

This is a comprehensive demonstration of MCP-B in action, featuring:
- **Frontend**: React with MCP server exposing todo management tools
- **Backend**: Cloudflare Workers with Hono.js and PostgreSQL
- **Real-time sync**: ElectricSQL for live data updates
- **Documentation**: Complete guide to MCP-B implementation

## Tech Stack

### Frontend
- React 18 with TypeScript
- MCP-B server integration using `@mcp-b/transports`
- Tailwind CSS for styling
- Vite for build tooling

### Backend
- Cloudflare Workers for serverless edge computing
- Hono.js as the web framework
- PostgreSQL database (Neon)
- ElectricSQL for real-time data synchronization

## Features

- **Todo Management**: Full CRUD operations exposed as MCP tools
- **Real-time Updates**: Changes sync instantly across all connected clients
- **Authentication**: Session-based auth respecting browser security model
- **MCP Tools**: 
  - `getTodos` - Retrieve all todos
  - `createTodo` - Add new todo items
  - `updateTodo` - Modify existing todos
  - `deleteTodo` - Remove todos
  - `clearCompleted` - Bulk delete completed items

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Cloudflare account (for Workers deployment)
- PostgreSQL database (e.g., Neon)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/WebMCP-org/web.git
cd web
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations:
```bash
pnpm db:migrate
```

5. Start the development server:
```bash
pnpm dev
```

Visit `http://localhost:5173` to see the demo in action.

## Deployment

### Frontend (Vercel/Netlify)

```bash
pnpm build
# Deploy the 'dist' folder to your hosting platform
```

### Backend (Cloudflare Workers)

```bash
pnpm deploy:backend
```

## Architecture

The demo showcases a modern, scalable architecture:

1. **Browser Context**: MCP server runs in the browser, maintaining user authentication
2. **Edge Computing**: Backend logic runs on Cloudflare's edge network
3. **Real-time Sync**: ElectricSQL provides conflict-free replicated data
4. **Type Safety**: End-to-end TypeScript with Zod validation

## Testing with MCP-B Extension

1. Install the [MCP-B Chrome Extension](https://chromewebstore.google.com/detail/mcp-b/daohopfhkdelnpemnhlekblhnikhdhfa)
2. Visit the demo site
3. Open the extension popup to see available tools
4. Use the chat interface to interact with the tools

## Learn More

- [MCP-B Documentation](https://mcp-b.ai)
- [Main Repository](https://github.com/WebMCP-org/WebMCP)
- [Examples Repository](https://github.com/WebMCP-org/examples)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT
