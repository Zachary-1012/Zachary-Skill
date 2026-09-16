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
const repoReadme = await readFile(join(ROOT, "..", "README.md"), "utf8");
const accessDoc = await readFile(join(ROOT, "docs", "access.md"), "utf8");
const setupClientsDoc = await readFile(join(ROOT, "docs", "setup-clients.md"), "utf8");
const bootstrapSh = await readFile(join(ROOT, "scripts", "bootstrap.sh"), "utf8");
const bootstrapPs1 = await readFile(join(ROOT, "scripts", "bootstrap.ps1"), "utf8");
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

assert.equal(manifest.aiInstall?.public, true, "AI install contract must stay public");
assert.equal(manifest.aiInstall?.registrationRequired, false, "TrendHub must not introduce a registration requirement");
assert.equal(manifest.aiInstall?.loginRequired, false, "TrendHub must not introduce a login requirement");
assert.equal(manifest.aiInstall?.bootstrap?.nodeFree, true, "AI bootstrap must support machines without preinstalled Node");
assert.equal(manifest.aiInstall?.bootstrap?.minimumNodeMajor, 22);
assert.equal(manifest.aiInstall?.bootstrap?.preferredNodeMajor, 24);
assert.equal(manifest.aiInstall?.bootstrap?.source, "https://nodejs.org/dist/latest-v24.x");
assert.equal(manifest.aiInstall?.bootstrap?.resultMarker, "AI_BOOTSTRAP_OK ");
assert.equal(manifest.aiInstall?.bootstrap?.mcpConfigFromResult?.commandField, "node");
assert.equal(manifest.aiInstall?.bootstrap?.mcpConfigFromResult?.launcherField, "launcher");
assert.match(manifest.aiInstall?.bootstrap?.integrity || "", /SHASUMS256\.txt/i);
assert.match(manifest.aiInstall?.bootstrap?.commands?.windows || "", /bootstrap\.ps1/i);
assert.match(manifest.aiInstall?.bootstrap?.commands?.macosLinux || "", /bootstrap\.sh/i);

for (const [name, text] of [
  ["README", repoReadme],
  ["access.md", accessDoc],
  ["setup-clients.md", setupClientsDoc],
  ["manifest.json", JSON.stringify(manifest)],
]) {
  assert.equal(text.includes("TrendHub 账号"), false, `${name} must not imply that a TrendHub account system exists`);
}
assert.match(repoReadme, /无需审批、注册、登录或中央服务器/);
assert.match(accessDoc, /无需审批、注册、登录或中央服务器/);
assert.match(repoReadme, /AI_BOOTSTRAP_OK/);
assert.match(accessDoc, /AI_BOOTSTRAP_OK/);
assert.match(setupClientsDoc, /AI_BOOTSTRAP_OK/);
assert.match(setupClientsDoc, /<NODE_COMMAND>/);
assert.match(setupClientsDoc, /<LAUNCHER>/);

for (const [name, text] of [
  ["bootstrap.sh", bootstrapSh],
  ["bootstrap.ps1", bootstrapPs1],
]) {
  assert.match(text, /latest-v24\.x/, `${name} must use the Node 24 LTS channel`);
  assert.match(text, /SHASUMS256\.txt/, `${name} must verify against official checksums`);
  assert.match(text, /SHA-256|SHA256|Get-FileHash|sha256sum|shasum/i, `${name} must enforce SHA-256 verification`);
  assert.match(text, /scripts[\\/]setup\.mjs/, `${name} must hand off to the canonical setup.mjs installer`);
  assert.match(text, /AI_BOOTSTRAP_OK/, `${name} must return persistent MCP runtime paths`);
  assert.match(text, /process\.execPath/, `${name} must return the actual Node executable path`);
  assert.match(text, /launcher/, `${name} must return the absolute launcher path`);
}

if (process.platform !== "win32") {
  const bashCheck = spawnSync("bash", ["-n", join(ROOT, "scripts", "bootstrap.sh")], { encoding: "utf8" });
  assert.equal(bashCheck.status, 0, `bootstrap.sh syntax check failed: ${bashCheck.stderr || bashCheck.stdout}`);
}

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
  `TEST OK version=${pkg.version} runtime=${pkg.engines.node} lockfile=v${lock.lockfileVersion} release-channel=stable http-boundary=protected ai-bootstrap=node24-verified`,
);
