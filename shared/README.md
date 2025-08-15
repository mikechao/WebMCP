# Shared Internal Packages

This directory contains internal shared packages used across the WebMCP monorepo. These packages are not published to NPM and are only used internally within the project.

## Available Packages

- **utils**: Common utility functions
- **types**: Shared TypeScript type definitions
- **config**: Shared configuration files

## Usage

These packages can be imported in other workspace packages using the workspace protocol:

```json
{
  "dependencies": {
    "@webmcp/utils": "workspace:*",
    "@webmcp/types": "workspace:*",
    "@webmcp/config": "workspace:*"
  }
}
```

## Development

```bash
# Build all shared packages
pnpm --filter "./shared/*" build

# Watch mode for development
pnpm --filter "./shared/*" dev

# Type check
pnpm --filter "./shared/*" typecheck
```