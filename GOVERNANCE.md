# Governance

## Upstream authority

`Zachary-1012/Zachary-Skill` is a public distribution repository with a controlled upstream.

- Repository owner: `@Zachary-1012`.
- Direct write access to the original repository is limited to the owner and collaborators explicitly invited by the owner.
- Public users receive read/clone/use access to the original repository; they do not receive upstream write permission by virtue of the repository being public.
- Pull-request creation for the upstream repository is restricted to collaborators by repository policy.
- The default branch is protected by the active `main-protection` ruleset: changes require a pull request, required Node 22/24 release-gate checks, an up-to-date branch, no force-push, and no branch deletion.
- No bypass actor is configured for the protected default branch.

## Change authority

A collaborator may propose changes on a branch, but a change is not part of the public product until all of the following are true:

1. it is submitted through a pull request;
2. required release gates pass;
3. the pull request is merged into `main` under the repository ruleset;
4. Stable Release automation re-runs the release gate;
5. Public Install E2E validates the published distribution path.

## Product truth

TrendHub distinguishes code correctness from third-party source availability:

- deterministic CI and MCP smoke prove the code/install contract;
- Source Health separately measures live source availability and data quality;
- a green release gate must never be presented as proof that every third-party source is currently reachable.

## License vs upstream permissions

Repository permissions and software licensing are different concepts. The upstream repository remains owner-controlled, while the software is currently distributed under the MIT License. MIT permits recipients to use, copy, modify, fork and redistribute copies subject to the license terms. Changing those legal rights would require an explicit license decision; repository write protection alone does not revoke MIT rights in copies or forks.
