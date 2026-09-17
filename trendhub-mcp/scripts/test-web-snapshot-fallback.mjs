#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trendhub-web-snapshot-"));
process.env.TRENTHUB_DATA_DIR = tmp;
const snapshotDir = path.join(tmp, "snapshots");
fs.mkdirSync(snapshotDir, { recursive: true });

const makeResult = (platform, label, title) => ({
  platform,
  label,
  category: "social",
  capturedAt: "2026-09-17T10:00:00.000Z",
  sourceUpdatedAt: null,
  dataQuality: "ok",
  note: null,
  items: [{ rank: 1, title, url: "https://example.com/item", hot: 100, hotText: "100", author: null, desc: null }],
});

fs.writeFileSync(path.join(snapshotDir, "weibo.json"), JSON.stringify({ latest: makeResult("weibo", "微博", "快照热榜"), previous: null }));
fs.writeFileSync(path.join(snapshotDir, "xiaohongshu.json"), JSON.stringify({ latest: makeResult("xiaohongshu", "小红书", "快照小红书"), previous: null }));

try {
  const { handleApi } = await import(`../dist/src/web/api.js?snapshot-test=${Date.now()}`);
  const trending = await handleApi("/api/trending", new URL("http://127.0.0.1/api/trending?platform=weibo&mode=snapshot&limit=5"), "GET", "");
  assert.equal(trending.status, 200);
  assert.equal(trending.data.sourceMode, "snapshot");
  assert.equal(trending.data.results.length, 1);
  assert.equal(trending.data.results[0].items[0].title, "快照热榜");

  const xhs = await handleApi("/api/xhs/topics", new URL("http://127.0.0.1/api/xhs/topics?mode=snapshot&limit=5&topic_limit=5"), "GET", "");
  assert.equal(xhs.status, 200);
  assert.equal(xhs.data.sourceMode, "snapshot");
  assert.equal(xhs.data.feed.items[0].title, "快照小红书");

  console.log("WEB SNAPSHOT FALLBACK TEST OK");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
