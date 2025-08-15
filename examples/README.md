# MCP-B Examples

Example implementations demonstrating how to use MCP-B (Model Context Protocol for Browsers) in various contexts.

## Overview

This repository contains example applications showing how to integrate MCP-B into your web applications. Each example is self-contained and demonstrates different aspects of the MCP-B protocol.

## Examples

### vanilla-ts
A minimal TypeScript example showing basic MCP-B integration with a simple todo list application.

### react
A React-based example demonstrating MCP-B integration in a modern React application with hooks and state management.

## Getting Started

Each example is isolated from the monorepo workspace and has its own dependencies.

To run an example:

```bash
cd vanilla-ts  # or react
pnpm install --ignore-workspace  # Install dependencies in isolation
pnpm dev                          # Run the example
```

## Prerequisites

- Node.js 18+
- pnpm package manager
- Chrome browser (for testing with the MCP-B extension)

## How Examples Work

Examples use the published versions of `@mcp-b` packages from npm:
- `@mcp-b/transports` - Browser-specific MCP transport implementations
- `@mcp-b/web-tools` - MCP tools for web APIs
- `@mcp-b/mcp-react-hooks` - React hooks for MCP integration (React example only)

Each example exposes MCP tools that can be called by AI agents through the MCP-B browser extension.

## Learn More

- [MCP-B Main Repository](https://github.com/WebMCP-org/WebMCP)
- [MCP-B Extension](https://github.com/WebMCP-org/WebMCP/tree/main/extension)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT