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
| Glama MCP Directory | **PUBLISHED · SEARCHABLE** | `https://glama.ai/mcp/connectors/io.github.Zachary-1012/trendhub` | Connector indexed, `Healthy`, Streamable HTTP remote detected, 19 tools detected |
| Agent Plugins standard | **READY · DIRECT INSTALL** | root `plugin.json` + `mcp.json` | Portable Agent Plugin metadata and remote MCP configuration are version-locked to v1.4.1 |
| Cursor | **NOT LISTED · DIRECT MCP READY** | `mcp.json` / Cursor MCP install link in README | Cursor supports direct MCP install now. Public Cursor Marketplace publication requires repository submission and Cursor manual review; current public Marketplace search must not be represented as listed until approved. |
| Smithery | **NOT LISTED · URL PUBLISH READY** | production `/mcp` URL | The public Streamable HTTP endpoint satisfies Smithery URL-publishing requirements. Publishing requires an authenticated Smithery publisher namespace/API key or web publishing session. |
| ChatGPT / Codex Plugins Directory | **NOT LISTED · APP SUBMISSION READY** | production `/mcp` + `/privacy` + `/terms` | OpenAI now uses the Plugins Directory as the primary discovery surface for ChatGPT/Codex workflow capabilities. TrendHub is not currently returned by Plugins Directory search; public distribution requires app/plugin submission, review and publication. |

**Rule:** only channels in `PUBLISHED · SEARCHABLE` state may be described publicly as “上架 / listed / searchable”. Compatibility, direct-install support or submission readiness is not the same as marketplace publication.

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

1. Official MCP Registry — **published and searchable**.
2. Glama MCP Directory — **published and searchable**.
3. Agent Plugins / direct GitHub distribution — ready and usable from the repository.
4. Cursor — direct MCP use is ready; public Marketplace publication is manually reviewed by Cursor.
5. Smithery — endpoint is URL-publish-ready; public listing requires an authenticated Smithery publisher namespace/session.
6. ChatGPT / Codex Plugins Directory — MCP/privacy/terms are ready; public discovery requires OpenAI submission, review and publication.

All listings must point to the same public repository and, for remote-capable directories, the same verified hosted `/mcp` endpoint.

## Release discipline

Marketplace metadata must not claim more tools, platforms, privacy properties, or source availability than the canonical manifest and release evidence support. CI success proves the code/install contract; it does not imply every third-party source is continuously available.

Remote marketplace access does not expose the local `/api/*` console routes and does not use a visitor's private Xiaohongshu cookie.
