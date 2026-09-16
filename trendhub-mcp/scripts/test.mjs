#!/usr/bin/env node
/**
 * Deterministic offline tests used by CI and the release gate.
 * Source availability/third-party platform health is intentionally NOT tested here.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);

const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const lock = JSON.parse(await readFile(join(ROOT, "package-lock.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(ROOT, "manifest.json"), "utf8"));
await access(join(ROOT, "dist", "src", "index.js"));

const { SERVER_VERSION } = await import("../dist/src/server.js");
const { isLoopbackHost, assertHttpNetworkBoundary, isHttpAuthorized } = await import("../dist/src/security/http.js");
const { compareStableVersions, npmInstallArgs, currentPackageVersion } = await import("./lib-trendhub.mjs");

assert.equal(pkg.version, manifest.version, "package.json and manifest.json versions must match");
assert.equal(pkg.version, SERVER_VERSION, "package.json and MCP server versions must match");
assert.equal(pkg.version, lock.version, "package-lock root version must match package.json");
assert.equal(pkg.version, lock.packages?.[""]?.version, "package-lock package root version must match package.json");
assert.equal(pkg.engines?.node, ">=22", "public stable runtime must require supported Node >=22");
assert.equal(currentPackageVersion(), pkg.version, "runtime version reader must match package.json");

assert.equal(typeof pkg.scripts?.["source:health"], "string", "source health command must be explicit");
assert.equal(typeof pkg.scripts?.test, "string", "deterministic npm test command must exist");
assert.equal(typeof pkg.scripts?.["release:gate"], "string", "release gate command must exist");
assert.equal(pkg.files.includes("SKILL.md"), true, "release package must contain SKILL.md");
assert.equal(pkg.files.includes("docs"), true, "release package must contain setup docs");
assert.equal(manifest.aiInstall?.successMarker, "SMOKE OK tools=16", "AI install success marker must remain machine readable");
assert.equal(manifest.runtime?.autoUpdate?.channel, "github-stable-release", "auto updater must use stable release channel");

const installArgs = npmInstallArgs(null);
assert.equal(installArgs[0], "ci", "public installation must use npm ci, not npm install");
assert.equal(installArgs.includes("--no-audit"), true);
assert.equal(compareStableVersions("1.3.0", "1.2.9"), 1);
assert.equal(compareStableVersions("v1.3.0", "1.3.0"), 0);
assert.equal(compareStableVersions("1.2.9", "1.3.0"), -1);
assert.equal(compareStableVersions("1.3.0-beta.1", "1.3.0"), null, "release channel accepts stable x.y.z only");

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
assert.equal(isHttpAuthorized({ headers: { authorization: "Bearer secret" } }, "secret"), true);
assert.equal(isHttpAuthorized({ headers: { authorization: "Bearer wrong" } }, "secret"), false);
assert.equal(isHttpAuthorized({ headers: {} }, "secret"), false);

for (const relative of [
  "scripts/lib-trendhub.mjs",
  "scripts/setup.mjs",
  "scripts/launcher.mjs",
  "scripts/upgrade.mjs",
  "scripts/test.mjs",
  "web/auth.js",
]) {
  const checked = spawnSync(process.execPath, ["--check", join(ROOT, relative)], { encoding: "utf8" });
  assert.equal(checked.status, 0, `${relative} syntax check failed: ${checked.stderr || checked.stdout}`);
}

console.log(
  `TEST OK version=${pkg.version} runtime=${pkg.engines.node} lockfile=v${lock.lockfileVersion} release-channel=stable http-boundary=protected`,
);
