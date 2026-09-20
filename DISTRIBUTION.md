# TrendHub distribution architecture

TrendHub uses **one verified core** and thin distribution adapters. Marketplace packaging must not fork tool logic or create vendor-specific implementations.

## Canonical source

- Repository: `Zachary-1012/Zachary-Skill`
- Core: `trendhub-mcp/`
- Stable tool contract: **TrendHub v1.6.0, 21 MCP tools, MCP Resources, Unified Evidence Contract v1, 51 runtime source adapters, 129 layered sources**
- Local transport: stdio via `trendhub-mcp/scripts/launcher.mjs`
- Hosted transport: Streamable HTTP through `trendhub-mcp/scripts/remote-gateway.mjs`
- Public MCP endpoint: `https://trendhub-remote-production.up.railway.app/mcp`

## Public distribution status

Last evidence check: **2026-09-20**.

| Channel | State | Public identifier / link | What is verified |
| --- | --- | --- | --- |
| GitHub source | **LIVE** | `https://github.com/Zachary-1012/Zachary-Skill` | Public clone; Node-free bootstrap; local stdio install contract |
| Official MCP Registry | **PUBLISHED · SEARCHABLE · Stable** | `io.github.Zachary-1012/trendhub` · `https://registry.modelcontextprotocol.io/?q=trendhub` | `v1.5.3` is `active`, `isLatest=true`, and the remote URL points to the production Streamable HTTP endpoint |
| Glama MCP Directory | **PUBLISHED · SEARCHABLE** | `https://glama.ai/mcp/connectors/io.github.Zachary-1012/trendhub` | Connector indexed, `Healthy`, Streamable HTTP remote detected, 21 tools detected |
| Agent Plugins standard | **READY · DIRECT INSTALL** | root `plugin.json` + `mcp.json` | Portable Agent Plugin metadata and remote MCP configuration are version-locked to the current Stable Release |
| Cursor | **NOT LISTED · DIRECT MCP READY** | `mcp.json` / Cursor MCP install link in README | Cursor supports direct MCP install now. Public Cursor Marketplace publication requires repository submission and Cursor manual review; current public Marketplace search must not be represented as listed until approved. |
| Smithery | **NOT LISTED · URL PUBLISH READY** | production `/mcp` URL | The public Streamable HTTP endpoint satisfies Smithery URL-publishing requirements. Publishing requires an authenticated Smithery publisher namespace/API key or web publishing session. |
| OpenAI Plugins Directory (ChatGPT / Codex) | **READY TO SUBMIT** | production `/mcp` + `/privacy` + `/terms` + `/.well-known/openai-apps-challenge` + [Submission Portal](https://platform.openai.com/apps) | TrendHub is prepared for a `With MCP` submission. The domain-verification endpoint is prewired and returns the portal challenge verbatim only when `OPENAI_APPS_CHALLENGE_TOKEN` is configured. It has not yet been submitted, reviewed, or published. |

**Rule:** only channels in `PUBLISHED · SEARCHABLE` state may be described publicly as “上架 / listed / searchable”. Compatibility, direct-install support or submission readiness is not the same as marketplace publication.

## License boundary

Starting with **TrendHub v1.4.3**, TrendHub-authored portions use the **TrendHub Free Use License 1.0** (`LicenseRef-TrendHub-Free-Use-1.0`): free personal use and free internal company/business use of unmodified copies are permitted; modification, derivative works, redistribution, republication, sublicensing, resale, and third-party hosted access to the software itself are prohibited. Third-party components remain under their own licenses. v1.4.2 and earlier retain the license rights granted when those releases were published.

Distribution directories must not describe TrendHub v1.4.3+ as MIT or as open-source software.

## v1.6.0 hosted protocol behavior

The hosted Remote MCP preserves the 21-tool compatibility facade and adds protocol-native Resources for namespace, evidence contract, capabilities, source contracts, Skill 2.0 and local history. Registry publication validates these Resources against the deployed production endpoint. The hosted Web Console reads the latest successful persisted snapshots for its initial view. Explicit live refreshes still query upstream sources, but transient missing/empty source responses fall back to the most recent successful snapshot. The stable hosted contract is now 21 MCP tools with the layered source universe; published releases remain immutable; v1.5.3 is the immediate rollback target for v1.6.0.

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

## AI client compatibility boundary

A public repository is **not** the same thing as universal AI-client access. A consumer chat window may be unable to browse GitHub, read repository files, run a terminal, install packages, or add a custom MCP server even when the repository itself is public.

TrendHub therefore supports three distinct access modes:

| Client / user capability | TrendHub path |
| --- | --- |
| Custom Remote MCP / Streamable HTTP support | Connect directly to the production `/mcp` endpoint; no local Git clone is required |
| Terminal / coding-agent / local tool execution | Clone the public repository and install the local MCP using the current bootstrap contract |
| Ordinary chat-only client with no MCP, terminal, or reliable GitHub access | No direct TrendHub tool execution; the client must not claim the Skill is installed or connected |

A failed repository read inside an ordinary AI chat product does **not by itself** prove that GitHub or TrendHub is unavailable. It may only show that the current client session does not expose the required web, connector, MCP, or execution capability.

The canonical compatibility policy and a copy-paste universal AI instruction are maintained in [`AI_CLIENT_COMPATIBILITY.md`](./AI_CLIENT_COMPATIBILITY.md).

## Distribution targets and review gates

The maintained distribution targets are:

1. Official MCP Registry — **published and searchable**.
2. Glama MCP Directory — **published and searchable**.
3. Agent Plugins / direct GitHub distribution — ready and usable from the repository.
4. Cursor — direct MCP use is ready; public Marketplace publication is manually reviewed by Cursor.
5. Smithery — endpoint is URL-publish-ready; public listing requires an authenticated Smithery publisher namespace/session.
6. OpenAI Plugins Directory (ChatGPT / Codex) — production MCP, privacy, terms and submission materials are ready; submit through the [official portal](https://platform.openai.com/apps), then await review and publication.

All listings must point to the same public repository and, for remote-capable directories, the same verified hosted `/mcp` endpoint.

## Release discipline

Marketplace metadata must not claim more tools, platforms, privacy properties, or source availability than the canonical manifest and release evidence support. CI success proves the code/install contract; it does not imply every third-party source is continuously available.

Remote marketplace access does not expose the local `/api/*` console routes and does not use a visitor's private Xiaohongshu cookie.
