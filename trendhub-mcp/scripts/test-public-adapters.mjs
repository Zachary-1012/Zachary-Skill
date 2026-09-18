#!/usr/bin/env node
import assert from "node:assert/strict";
import { listPlatforms } from "../dist/src/sources/index.js";
import { PUBLIC_ADAPTER_PLATFORMS, PUBLIC_RSS_SOURCES } from "../dist/src/sources/public-adapters.js";
const platforms = listPlatforms();
const names = new Set(platforms.map((platform) => platform.platform));
assert.equal(names.size, platforms.length, "platform inventory must not contain duplicates");
assert.ok(names.has("bluesky"), "Bluesky public adapter must be in runtime inventory");
for (const source of PUBLIC_ADAPTER_PLATFORMS) assert.ok(names.has(source.platform), `missing public adapter ${source.platform}`);
assert.ok(PUBLIC_RSS_SOURCES.length >= 10, "public editorial coverage must not regress");
assert.ok(PUBLIC_ADAPTER_PLATFORMS.some((source) => source.platform === "gdelt"));
assert.ok(PUBLIC_ADAPTER_PLATFORMS.some((source) => source.platform === "apple-podcasts"));
console.log(`PUBLIC ADAPTER CONTRACT OK platforms=${platforms.length} publicAdapters=${PUBLIC_ADAPTER_PLATFORMS.length}`);
