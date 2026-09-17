# TrendHub distribution architecture

TrendHub uses **one verified core** and thin distribution adapters. Marketplace packaging must not fork tool logic or create vendor-specific implementations.

## Canonical source

- Repository: `Zachary-1012/Zachary-Skill`
- Core: `trendhub-mcp/`
- Stable tool contract: **TrendHub v1.4.1, 19 MCP tools, 38 public trend sources**
- Local transport: stdio via `trendhub-mcp/scripts/launcher.mjs`
- Hosted transport: Streamable HTTP through `trendhub-mcp/scripts/remote-gateway.mjs`
- Public MCP endpoint: `https://trendhub-remote-production.up.railway.app/mcp`

## Public distribution status

Last evidence check: **2026-09-17**.

| Channel | State | Public identifier / link | What is verified |
| --- | --- | --- | --- |
| GitHub source | **LIVE** | `https://github.com/Zachary-1012/Zachary-Skill` | Public clone; Node-free bootstrap; local stdio install contract |
| Official MCP Registry | **PUBLISHED · SEARCHABLE** | `io.github.Zachary-1012/trendhub` · `https://registry.modelcontextprotocol.io/?q=trendhub` | v1.4.1 is `active`, `isLatest=true`, remote URL points to the production Streamable HTTP endpoint |
| Glama MCP Directory | **PUBLISHED · SEARCHABLE** | `https://glama.ai/mcp/connectors/io.github.Zachary-1012/trendhub` | Connector indexed; production remote detected; 19 tools detected |
| Agent Plugins standard | **READY · DIRECT INSTALL** | root `plugin.json` + `mcp.json` | Portable Agent Plugin metadata and remote MCP configuration are version-locked to v1.4.1 |
| Cursor | **READY · DIRECT MCP INSTALL** | `mcp.json` / Cursor MCP install link in README | Users can connect the public remote immediately. A public Cursor Marketplace listing still requires Cursor submission and manual review; do not label it “listed” until approved. |
| Smithery | **READY FOR SUBMISSION** | production `/mcp` URL | Public Streamable HTTP endpoint satisfies URL-publishing prerequisites. Smithery publication requires an authenticated publisher namespace; do not label it “listed” until that submission succeeds. |
| ChatGPT / OpenAI Plugins Directory | **READY FOR APP SUBMISSION** | production `/mcp` + `/privacy` + `/terms` | Hosted MCP, privacy and terms endpoints exist. Public directory discovery requires OpenAI developer submission, review and publish; do not label it “listed” before approval. |

**Rule:** only channels in `PUBLISHED · SEARCHABLE` state may be described publicly as “上架 / listed / searchable”. Compatibility or submission readiness is not the same as marketplace publication.

## Direct-use paths

### Remote, zero local install

Any MCP client that supports Streamable HTTP can point to:

```text
https://trendhub-remote-production.up.railway.app/mcp
```

Canonical portable configuration:

```json
{
  "mcpServers": {
    "trendhub": {
      "type": "streamable-http",
      "url": "https://trendhub-remote-production.up.railway.app/mcp"
    }
  }
}
```

### Local, repository link install

Users or coding agents can clone the public repository and run the Node-free bootstrap documented in `README.md` and `trendhub-mcp/manifest.json`. This path does not depend on any marketplace being available.

## Distribution targets and review gates

The maintained distribution targets are:

1. Official MCP Registry — published and searchable.
2. Glama MCP Directory — published and searchable.
3. Agent Plugins / direct GitHub distribution — ready and usable from the repository.
4. Cursor — direct MCP use is ready; public Marketplace publication is review-gated.
5. Smithery — endpoint is publish-ready; public listing is publisher-auth-gated.
6. ChatGPT / OpenAI Plugins Directory — endpoint and policy pages are ready; public listing is submission/review-gated.

All listings must point to the same public repository and, for remote-capable directories, the same verified hosted `/mcp` endpoint.

## Release discipline

Marketplace metadata must not claim more tools, platforms, privacy properties, or source availability than the canonical manifest and release evidence support. CI success proves the code/install contract; it does not imply every third-party source is continuously available.

Remote marketplace access does not expose the local `/api/*` console routes and does not use a visitor's private Xiaohongshu cookie.
