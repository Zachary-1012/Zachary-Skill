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

const noJev = await handleConnectionsApi(
  "/api/connections/jev/review", "POST", JSON.stringify({ topic: "品牌营销", titles: ["某品牌发布营销活动"] })
);
if (!process.env.TYPESAFE_API_KEY) assert.equal(noJev.status, 503);

const originalFetch = globalThis.fetch;
const originalJevKey = process.env.TYPESAFE_API_KEY;
try {
  process.env.TYPESAFE_API_KEY = "jev-test-only";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    assert.equal(options.headers.Authorization, "Bearer jev-test-only");
    const request = JSON.parse(options.body);
    assert.equal(request.model, "jev-1.13.0");
    assert.deepEqual(request.state, { research_topic: "品牌营销" });
    assert.match(JSON.stringify(request.questions), /某品牌发布营销活动/);
    assert.equal(Object.keys(request.questions).length, 2);
    return new Response(JSON.stringify({
      model: "jev-1.13.0",
      answers: { title_0: { type: "noul", noul: 0.91 }, title_1: { type: "noul", noul: 0.12 } },
    }), { status: 200 });
  };
  const jev = await handleConnectionsApi("/api/connections/status", "GET", "");
  assert.equal(jev.data.jev.model, "jev-1.13.0");
  assert.equal(jev.data.jev.source, "platform");
  assert.equal(JSON.stringify(jev.data).includes("jev-test-only"), false);
  assert.equal((await handleConnectionsApi("/api/connections/jev", "POST", JSON.stringify({ apiKey: "visitor-key" }))).status, 404);

  const tooMany = await handleConnectionsApi("/api/connections/jev/review", "POST", JSON.stringify({
    topic: "品牌营销", titles: Array(9).fill("公开标题"),
  }));
  assert.equal(tooMany.status, 400);

  const reviewed = await handleConnectionsApi("/api/connections/jev/review", "POST", JSON.stringify({
    topic: "品牌营销", titles: ["某品牌发布营销活动", "某公司发布季度财报"],
  }));
  assert.equal(reviewed.status, 200);
  assert.deepEqual(reviewed.data.items.map((item) => item.topicMatchProbability), [0.91, 0.12]);
  assert.equal(JSON.stringify(reviewed.data).includes("jev-test-only"), false);

  globalThis.fetch = async () => new Response(JSON.stringify({ model: "jev-1.13.0", answers: {} }), { status: 200 });
  const malformed = await handleConnectionsApi("/api/connections/jev/review", "POST", JSON.stringify({ topic: "品牌营销", titles: ["一条标题"] }));
  assert.equal(malformed.status, 502);

  globalThis.fetch = async () => new Response("unauthorized", { status: 401 });
  const rejected = await handleConnectionsApi("/api/connections/jev/review", "POST", JSON.stringify({ topic: "品牌营销", titles: ["一条标题"] }));
  assert.equal(rejected.status, 401);
  assert.equal(JSON.stringify(rejected.data).includes("jev-test-only"), false);
} finally {
  globalThis.fetch = originalFetch;
  if (originalJevKey === undefined) delete process.env.TYPESAFE_API_KEY;
  else process.env.TYPESAFE_API_KEY = originalJevKey;
}

const jevCleared = await handleConnectionsApi("/api/connections/status", "GET", "");
if (!process.env.TYPESAFE_API_KEY) assert.equal(jevCleared.data.jev.configured, false);

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
