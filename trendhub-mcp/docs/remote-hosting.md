# TrendHub Remote MCP hosting

TrendHub's public hosted distribution uses `scripts/remote-gateway.mjs` as an isolation layer around the existing local-first MCP core.

## Security model

- The existing MCP core remains bound to `127.0.0.1`.
- A fresh 256-bit internal bearer token is generated for every gateway process and is never exposed to clients.
- Only `/mcp`, `/health`, `/privacy`, `/terms`, `/.well-known/mcp.json`, and the minimal landing page are public.
- The local visual console and `/api/*` are **not** exposed by the gateway.
- Request bodies are bounded (2 MiB by default) and concurrent MCP requests are capped (24 by default).
- The public gateway does not inject `XHS_COOKIE` or any user credential.
- Hosted deployments set `TRENTHUB_AUTOUPDATE=0`; the deployed Git commit is the deployment authority and the process does not self-mutate.
- There is no TrendHub application telemetry or per-request application log. Hosting/network providers may still process ordinary infrastructure metadata under their own policies; this is disclosed in the public privacy notice.

## Start command

Build first, then start the gateway:

```bash
npm ci --no-audit --no-fund
npm run build
npm run start:remote
```

The hosting platform must provide `PORT` (or `TRENTHUB_REMOTE_PORT`). The gateway binds `0.0.0.0` by default; the private MCP core remains loopback-only on a separate internal port.

## Public endpoints

- `POST /mcp` — stateless Streamable HTTP MCP
- `GET /health` — version/readiness metadata
- `GET /.well-known/mcp.json` — discoverable endpoint metadata
- `GET /privacy` — privacy notice
- `GET /terms` — hosted-service terms
- `GET /` — minimal landing page

`/api/*` intentionally returns 404 on the public gateway.

## Environment knobs

- `PORT` — public port supplied by most cloud platforms
- `TRENTHUB_REMOTE_HOST` — public bind host, default `0.0.0.0`
- `TRENTHUB_INTERNAL_PORT` — private loopback core port, default `18333`
- `TRENTHUB_REMOTE_MAX_BODY_BYTES` — request-size cap, default 2 MiB
- `TRENTHUB_REMOTE_MAX_CONCURRENCY` — in-process concurrency cap, default 24
- `TRENTHUB_REMOTE_TIMEOUT_MS` — upstream MCP request timeout, default 90 seconds

The remote gateway is a distribution adapter. It does not change TrendHub's 19-tool contract or weaken the local edition's non-loopback bearer-token requirement.
