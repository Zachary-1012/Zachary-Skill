#!/usr/bin/env node
/**
 * Deterministic offline tests used by CI and the release gate.
 * Source availability/third-party platform health is intentionally NOT tested here.
 */
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);

const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(ROOT, "manifest.json"), "utf8"));
await access(join(ROOT, "package-lock.json"));
await access(join(ROOT, "dist", "src", "index.js"));

const { SERVER_VERSION } = await import("../dist/src/server.js");
const { isLoopbackHost, assertHttpNetworkBoundary, isHttpAuthorized } = await import("../dist/src/security/http.js");

assert.equal(pkg.version, manifest.version, "package.json and manifest.json versions must match");
assert.equal(pkg.version, SERVER_VERSION, "package.json and MCP server versions must match");
assert.equal(pkg.engines?.node, ">=22", "public stable runtime must require supported Node >=22");
assert.equal(typeof pkg.scripts?.["source:health"], "string", "source health command must be explicit");
assert.equal(typeof pkg.scripts?.test, "string", "deterministic npm test command must exist");
assert.equal(typeof pkg.scripts?.["release:gate"], "string", "release gate command must exist");

for (const host of ["127.0.0.1", "127.1.2.3", "localhost", "::1", "[::1]"]) {
  assert.equal(isLoopbackHost(host), true, `${host} should be loopback`);
}
for (const host of ["0.0.0.0", "192.168.1.10", "100.64.0.1", "example.com"]) {
  assert.equal(isLoopbackHost(host), false, `${host} should not be loopback`);
}

assert.doesNotThrow(() => assertHttpNetworkBoundary("127.0.0.1", ""));
assert.doesNotThrow(() => assertHttpNetworkBoundary("0.0.0.0", "secret"));
assert.throws(
  () => assertHttpNetworkBoundary("0.0.0.0", ""),
  /TRENTHUB_HTTP_TOKEN/,
  "non-loopback HTTP must require a token",
);

assert.equal(isHttpAuthorized({ headers: {} }, ""), true, "loopback/no-token mode stays frictionless");
assert.equal(
  isHttpAuthorized({ headers: { authorization: "Bearer secret" } }, "secret"),
  true,
  "matching bearer token should authorize",
);
assert.equal(
  isHttpAuthorized({ headers: { authorization: "Bearer wrong" } }, "secret"),
  false,
  "wrong bearer token must be rejected",
);
assert.equal(isHttpAuthorized({ headers: {} }, "secret"), false, "missing bearer token must be rejected");

console.log(`TEST OK version=${pkg.version} runtime=${pkg.engines.node} http-boundary=protected`);
