#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trendhub-closed-loop-"));
process.env.TRENHUB_DATA_DIR = temp;
process.env.TRENHUB_PUBLIC_REMOTE = "0";

try {
  const workspace = await import("../dist/src/collaboration/workspace.js");
  const evidence = await import("../dist/src/agent-native/evidence-contract.js");

  const ws = workspace.createWorkspace("Closed Loop", "owner");
  const trace = workspace.recordApplicationTrace(ws.id, "owner", {
    traceId: "trace-001",
    topic: "Tesla",
    capability: "get_content_brief",
    artifactId: "artifact-001",
    evidenceRefs: ["https://example.com/evidence/1", "evidence:2"],
  });
  assert.equal(trace.id, "trace-001");
  assert.equal(trace.evidenceRefs.length, 2);

  const outcome = workspace.appendOutcome(ws.id, "owner", {
    traceId: trace.id,
    metrics: { views: 0, comments: null },
    truth: { views: "OBSERVED", comments: "UNKNOWN" },
    observedAt: "2026-09-20T00:00:00Z",
  });
  assert.equal(outcome.metrics.views, 0, "observed zero must remain zero");
  assert.equal(outcome.truth.views, "OBSERVED");
  assert.equal(outcome.metrics.comments, null, "missing value must remain null");
  assert.equal(outcome.truth.comments, "UNKNOWN");

  assert.throws(() => workspace.appendOutcome(ws.id, "owner", {
    traceId: trace.id,
    metrics: { comments: null },
    truth: { comments: "OBSERVED" },
  }), /cannot be OBSERVED with a null value/);

  const evaluation = workspace.recordEvaluation(ws.id, "owner", {
    traceId: trace.id,
    outcomeIds: [outcome.id],
    result: "SUPPORTED",
    rationale: "Observed outcome supports the evidence-backed hypothesis.",
  });
  const learning = workspace.listLearningAssets(ws.id, "owner");
  assert.equal(learning.length, 1);
  assert.equal(learning[0].id, evaluation.learningAssetId);
  assert.equal(learning[0].state, "SUPPORTED");
  assert.equal(learning[0].version, 1);

  const wrapped = evidence.completeResult({
    capability: "trendhub.test.closed_loop",
    data: { ok: true },
    evidence: [
      { id: "a", source: "source-a", evidenceType: "live", observedAt: "2026-09-20T00:00:00Z", truthState: "OBSERVED" },
      { id: "b", source: "source-b", evidenceType: "history", observedAt: "2026-09-19T00:00:00Z", truthState: "STALE" },
    ],
  });
  assert.equal(wrapped.truth.states.OBSERVED, 1);
  assert.equal(wrapped.truth.states.STALE, 1);
  assert.deepEqual(wrapped.trace.evidenceIds, ["a", "b"]);

  process.env.TRENHUB_PUBLIC_REMOTE = "1";
  assert.throws(() => workspace.listWorkspaces("owner"), /local-only and effect-fenced/);
  assert.throws(() => workspace.readWorkspace(ws.id, "owner"), /local-only and effect-fenced/);

  console.log("CLOSED LOOP TEST OK truth=explicit trace=linked outcome=append-only evaluation=versioned remote=effect-fenced");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
