#!/usr/bin/env node
import assert from "node:assert/strict";
import { createSnapshotScheduler } from "../dist/src/runtime/snapshot-scheduler.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(predicate, timeoutMs = 4000, stepMs = 25) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(stepMs);
  }

  throw new Error(`waitUntil timeout after ${timeoutMs}ms`);
}

const quiet = { log() {}, warn() {}, error() {} };

let calls = 0;

const scheduler = createSnapshotScheduler({
  enabled: true,
  intervalMs: 40,
  initialDelayMs: 5,
  logger: quiet,
  runner: async () => {
    calls += 1;
    await sleep(5);
    return [
      {
        platform: "test",
        ok: true,
        items: 1,
      },
    ];
  },
});

scheduler.start();

try {
  await waitUntil(() => calls >= 2);
} finally {
  scheduler.stop();
}

const state = scheduler.getState();

assert.equal(
  state.intervalMs,
  1000,
  "scheduler must clamp explicit intervals below 1000ms",
);

assert.ok(
  calls >= 2,
  `expected initial + scheduled run, got ${calls}`,
);

assert.equal(state.lastOk, 1);
assert.equal(state.lastTotal, 1);
assert.equal(state.lastError, null);
assert.ok(state.lastSuccessAt);

let disabledCalls = 0;

const disabled = createSnapshotScheduler({
  enabled: false,
  intervalMs: 40,
  initialDelayMs: 1,
  logger: quiet,
  runner: async () => {
    disabledCalls += 1;
    return [];
  },
});

disabled.start();

try {
  await sleep(100);
} finally {
  disabled.stop();
}

assert.equal(disabledCalls, 0);

console.log("SNAPSHOT SCHEDULER TEST OK");
