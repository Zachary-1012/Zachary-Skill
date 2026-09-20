#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dashboard = await readFile(join(root, "web", "views-a.js"), "utf8");
const professional = await readFile(join(root, "web", "views-e.js"), "utf8";

assert.match(dashboard, /professional\/sources\?priority=P2/, "dashboard must load the full P2 Source Universe");
assert.doesNotMatch(dashboard, /professional\/sources\?priority=P1/, "dashboard must not label a P1 subset as the full Source Universe");
assert.doesNotMatch(professional, /badge neutral">DEV</, "stable Professional views must not show stale DEV badges");
console.log("WEB TRUTH CONTRACT OK source-universe=P2 stable-badges=clean");
