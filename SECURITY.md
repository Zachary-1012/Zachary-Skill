# Security Policy

## Supported versions

Security fixes target the latest GitHub **Stable Release**. Development `main` is not the distribution channel.

## Security boundaries

- Local HTTP defaults to `127.0.0.1`.
- Any non-loopback bind requires `TRENTHUB_HTTP_TOKEN`; `/mcp` and `/api/*` require a Bearer token.
- TrendHub does not require a model API key and does not send usage telemetry to a TrendHub central service.
- Platform credentials such as `XHS_COOKIE` are local environment variables only and must never be committed, logged into diagnostics, or copied into benchmark evidence.
- Node-free bootstrap downloads Node 24 LTS from `nodejs.org` and verifies the official `SHASUMS256.txt` before execution.
- Stable updates follow GitHub Stable Releases, not `main` HEAD.

## Reporting a vulnerability

Do **not** post credentials, cookies, tokens, personal data, or exploit details into a public issue.

If you are an invited collaborator, report the issue privately to the repository owner `@Zachary-1012` through the existing private team/company channel and include:

- affected version/commit;
- reproduction steps without real secrets;
- expected vs actual behavior;
- security impact;
- proposed mitigation if known.

The owner decides disclosure and release timing. A security fix must still pass the deterministic release gate and Public Install E2E unless an emergency mitigation requires temporarily disabling a vulnerable feature.

## Dependency and source risk

Third-party source availability is not equivalent to a security incident. Source Health is separated from the release gate so platform outages, rate limits, or schema drift are reported as operational evidence rather than silently converted into fabricated success.
