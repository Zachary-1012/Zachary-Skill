# TrendHub v1.5.0 Rollback Boundary

Stable v1.4.4 is immutable and remains the rollback target until a later stable release is explicitly approved.

## Before Registry publication

If the v1.5.0 runtime fails health, MCP handshake, security or release checks, stop publication. Do not publish Registry or marketplace metadata. Restore the last healthy v1.4.4 deployment using the approved Railway release history, then verify `/health`, the 19-tool handshake and read-only Web security behavior.

## After a later approved deployment

Keep the v1.4.4 tag and GitHub Release unchanged. Roll back the hosting service to the last healthy v1.4.4 deployment (or another explicitly approved stable version), verify the matching version/tool count, and only then decide whether public metadata needs a controlled correction.

## Local installations

Disable auto-update with `TRENTHUB_AUTOUPDATE=0` when investigating. Reinstall the immutable v1.4.4 stable artifact or use the launcher rollback path. Preserve local evidence and logs; never upload cookies, sessions or private workspace data.
