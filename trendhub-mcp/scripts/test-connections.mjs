import assert from "node:assert/strict";
import { handleConnectionsApi } from "../dist/src/web/connections-api.js";

const status = await handleConnectionsApi("/api/connections/status", "GET", "");
assert.equal(status.status, 200);
assert.equal(status.data.secretsPersisted, false);
assert.equal(status.data.runtime, "local");

const deepseek = await handleConnectionsApi(
  "/api/connections/ai",
  "POST",
  JSON.stringify({ provider: "deepseek", model: "deepseek-v4-flash", apiKey: "test-only" })
);
assert.equal(deepseek.status, 200);
assert.equal(deepseek.data.ai.provider, "deepseek");
assert.equal(deepseek.data.ai.endpoint, "https://api.deepseek.com");
assert.equal(JSON.stringify(deepseek.data).includes("test-only"), false);

const reviewStatus = await handleConnectionsApi("/api/connections/status", "GET", "");
assert.equal(reviewStatus.data.modelReview.requiresUserKey, false);
assert.equal(reviewStatus.data.modelReview.inference, "self-hosted");
assert.equal(reviewStatus.data.modelReview.license, "Apache-2.0");
assert.equal((await handleConnectionsApi("/api/connections/jev/review", "POST", "{}" )).status, 404);
const tooMany = await handleConnectionsApi("/api/connections/model-review/review", "POST", JSON.stringify({
  topic: "品牌营销", titles: Array(9).fill("公开标题"),
}));
assert.equal(tooMany.status, 400);

const blocked = await handleConnectionsApi(
  "/api/connections/ai",
  "POST",
  JSON.stringify({ provider: "openai-compatible", endpoint: "https://example.com/v1", model: "model" })
);
assert.equal(blocked.status, 400);
assert.match(blocked.data.error, /回环地址/);

const invalidCookie = await handleConnectionsApi(
  "/api/connections/xhs",
  "POST",
  JSON.stringify({ cookie: "a1=only" })
);
assert.equal(invalidCookie.status, 400);

const cookie = await handleConnectionsApi(
  "/api/connections/xhs",
  "POST",
  JSON.stringify({ cookie: "a1=test-a1; web_session=test-session; other=value" })
);
assert.equal(cookie.status, 200);
assert.equal(cookie.data.xhs.configured, true);
assert.equal(JSON.stringify(cookie.data).includes("test-session"), false);

await handleConnectionsApi("/api/connections/xhs/clear", "POST", "");
await handleConnectionsApi("/api/connections/ai/clear", "POST", "");
const cleared = await handleConnectionsApi("/api/connections/status", "GET", "");
assert.equal(cleared.data.ai.configured, false);
if (!process.env.XHS_COOKIE) assert.equal(cleared.data.xhs.configured, false);

console.log("connections API checks passed");
