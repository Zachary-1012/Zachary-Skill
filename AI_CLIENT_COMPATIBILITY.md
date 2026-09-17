# TrendHub AI Client Compatibility

TrendHub is public, but **a public GitHub repository does not mean every ordinary AI chat window can fetch, install, or execute the repository**. Whether an AI can use TrendHub depends on the capabilities exposed by that client.

## Three supported entry paths

| Client capability | Can use TrendHub? | Recommended path |
| --- | --- | --- |
| Supports custom Remote MCP / Streamable HTTP | **Yes** | Connect directly to `https://trendhub-remote-production.up.railway.app/mcp` |
| Can execute terminal commands / clone GitHub / run local tools | **Yes** | Clone `https://github.com/Zachary-1012/Zachary-Skill` and follow the current repository bootstrap/install contract |
| Ordinary chat-only client with no custom MCP, no terminal/tool execution, and no reliable GitHub repository access | **No direct tool use** | It may only discuss text it can actually retrieve or that the user pastes into chat; it cannot truthfully claim TrendHub is installed or connected |

## Public repository vs client capability

`Zachary-1012/Zachary-Skill` is a public repository. Anyone can open or clone it through a normal GitHub-capable browser or Git client, subject to GitHub/network availability.

An AI chat product may still restrict one or more of the following:

- external web browsing;
- GitHub/raw-file retrieval;
- repository-wide reading;
- shell/terminal execution;
- local file writes;
- package installation;
- custom MCP server configuration.

Therefore, if an ordinary chat client says it cannot access the repository, that **does not by itself indicate a TrendHub repository failure**. It normally means that the current client session does not expose the required browsing, connector, MCP, or execution capability.

Do not describe a client as compatible merely because it is an AI chatbot. Compatibility must be verified by actual tool access.

## Canonical public endpoints

### Source / local installation

```text
https://github.com/Zachary-1012/Zachary-Skill
```

Use this path when the AI/client can clone repositories and execute installation commands.

### Remote MCP

```text
https://trendhub-remote-production.up.railway.app/mcp
```

Use this path when the client supports custom Remote MCP over Streamable HTTP. Remote MCP does not require the client to clone the GitHub repository locally.

### Health check

```text
https://trendhub-remote-production.up.railway.app/health
```

This is a human/monitoring health endpoint. The `/mcp` endpoint itself is not a normal webpage and should be called through the MCP protocol.

### Web console

TrendHub also maintains a responsive Web Console path at the Remote origin. Availability must be verified against the currently deployed Stable Release before representing it as live production functionality.

```text
https://trendhub-remote-production.up.railway.app/
```

The Web Console is for human browser access. It is not a substitute for MCP integration inside an AI client.

## Universal instruction to give another AI

> Read `https://github.com/Zachary-1012/Zachary-Skill` using the capabilities actually available in your current client. If you support custom Remote MCP / Streamable HTTP, connect to `https://trendhub-remote-production.up.railway.app/mcp`. If you can execute terminal commands, read the current repository README/manifest and install TrendHub locally from the public repository. If your current chat client cannot access GitHub, cannot execute tools, and cannot add a custom MCP server, state that limitation explicitly and do not claim TrendHub has been installed or connected.

## Verification rule

A client may only say TrendHub is usable after one of these is actually verified:

1. **Remote MCP:** MCP `initialize` succeeds and `tools/list` returns the TrendHub tools.
2. **Local install:** repository bootstrap/install succeeds and the local smoke test passes.
3. **Web:** the currently deployed public Web Console returns a usable browser page.

Reading a README, searching for TrendHub, or seeing the `/mcp` URL is **not** sufficient evidence of an installed/connected MCP tool.

## Product access model

```text
Human browser
  -> TrendHub Web Console

AI client with Remote MCP
  -> public /mcp
  -> TrendHub runtime

Coding agent / desktop AI with terminal
  -> public GitHub repository
  -> local TrendHub MCP

Chat-only AI with no MCP / terminal / GitHub access
  -> cannot directly execute TrendHub tools
```

This compatibility policy is descriptive: TrendHub should not fake support for a client that does not expose the required integration surface.
