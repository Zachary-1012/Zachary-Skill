# TrendHub distribution architecture

TrendHub uses **one verified core** and thin distribution adapters. Marketplace packaging must not fork tool logic or create vendor-specific implementations.

## Canonical source

- Repository: `Zachary-1012/Zachary-Skill`
- Core: `trendhub-mcp/`
- Stable tool contract: TrendHub v1.4.0, 19 MCP tools
- Local transport: stdio via `trendhub-mcp/scripts/launcher.mjs`
- Hosted transport: Streamable HTTP through `trendhub-mcp/scripts/remote-gateway.mjs`

## Distribution targets

The supported publication targets are:

1. Official MCP Registry
2. Glama MCP Directory
3. Smithery
4. Cursor Marketplace (Agent Plugin)
5. ChatGPT / OpenAI plugin-app discovery when the hosted endpoint and publisher submission requirements are satisfied

All listings must point to the same public repository and, for remote-capable directories, the same verified hosted `/mcp` endpoint.

## Release discipline

Marketplace metadata must not claim more tools, platforms, privacy properties, or source availability than the canonical manifest and release evidence support. CI success proves the code/install contract; it does not imply every third-party source is continuously available.

Remote marketplace access does not expose the local `/api/*` console routes and does not use a visitor's private Xiaohongshu cookie.
