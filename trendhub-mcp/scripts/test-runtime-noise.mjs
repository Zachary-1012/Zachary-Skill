#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const domestic = await readFile(join(root, "src", "sources", "domestic.ts"), "utf8");
const overrides = await readFile(join(root, "src", "sources", "overrides.ts"), "utf8");
const index = await readFile(join(root, "src", "sources", "index.ts"), "utf8");

assert.doesNotMatch(domestic, /dailyhot-api\/dist\/app\.js/, "embedded source adapters must not load upstream web shell");
assert.match(domestic, /dailyhot-api\/dist\/routes\/\$\{name\}\.js/, "domestic adapters must load route handlers directly");
assert.doesNotMatch(overrides, /获取抖音 Cookie 出错/, "TrendHub-owned Douyin adapter must not inherit upstream cookie parser noise");
assert.match(overrides, /export async function fetchDouyin/, "Douyin must have a TrendHub-owned adapter");
assert.match(index, /douyin:\s*fetchDouyin/, "Douyin override must be canonical");
console.log("RUNTIME NOISE CONTRACT OK dailyhot=route-only douyin=owned-adapter");
