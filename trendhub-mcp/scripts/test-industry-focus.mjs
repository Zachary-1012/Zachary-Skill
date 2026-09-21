#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildUsefulIndustryFallback,
  filterIndustryItems,
  INDUSTRY_DEFAULT_VERTICALS,
  INDUSTRY_FOCUS_LABEL,
} from "../dist/src/sources/industry-focus.js";

assert.deepEqual(INDUSTRY_DEFAULT_VERTICALS, [
  "business-corporate",
  "marketing-advertising",
  "retail-commerce",
]);
assert.match(INDUSTRY_FOCUS_LABEL, /品牌营销/);

const item = (title, url) => ({
  rank: 1, title, url, hot: null, hotText: null, desc: null, author: null, externalId: null,
});
const focused = filterIndustryItems([
  item("品牌如何布局零售媒体", "https://example.com/brand"),
  item("球队赢得今晚比赛", "https://example.com/sport"),
  item("创作者营销成为广告增长引擎", "https://example.com/creator"),
], "零售媒体", 10);
assert.deepEqual(focused.map((row) => row.title), ["品牌如何布局零售媒体", "创作者营销成为广告增长引擎"]);

const fallback = buildUsefulIndustryFallback([
  {
    id: "industry-news", label: "行业媒体", family: "news-authority", dataQuality: "ok",
    capturedAt: "2026-09-21T00:00:00.000Z", query: "品牌营销", itemCount: 2,
    note: "公开来源",
    items: [
      { id: "a", channel: "industry-news", source: "Source A", family: "news-authority", title: "较早证据", url: "https://example.com/a", publishedAt: "2026-09-20T00:00:00.000Z", author: null, summary: null, evidenceKind: "article" },
      { id: "b", channel: "industry-news", source: "Source B", family: "news-authority", title: "最新证据", url: "https://example.com/b", publishedAt: "2026-09-21T00:00:00.000Z", author: null, summary: null, evidenceKind: "article" },
    ],
  },
], "品牌营销", "平台受限");
assert.equal(fallback.mode, "industry-public-evidence");
assert.equal(fallback.itemCount, 2);
assert.equal(fallback.items[0].title, "最新证据");
assert.match(fallback.reason, /平台受限/);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = JSON.parse(readFileSync(resolve(root, "data/future-sources.json"), "utf8")).sources;
for (const required of ["Marketing Dive", "ADWEEK", "Marketing Week", "Digiday", "Retail Dive", "Nieman Lab"]) {
  assert.ok(sources.some((source) => source.name === required), `missing industry source ${required}`);
}

console.log("INDUSTRY FOCUS TEST OK");
