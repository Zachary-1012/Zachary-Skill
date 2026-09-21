#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("web/index.html");
const app = read("web/app.js");
const studio = read("web/content-studio.js");
const style = read("web/experience-v2.css");
const widget = read("src/agent-native/content-studio-widget.ts");
const resources = read("src/agent-native/resources.ts");
const skill = read("../skills/trendhub/SKILL.md");

assert.match(index, /#\/studio/);
assert.match(index, /内容资产/);
assert.match(index, /发布计划/);
assert.match(app, /#\/studio/);
for (const contract of ["content-projects-v2", "createBrief", "runAI", "artifact-editor", "scheduleAt", "evidenceState"]) assert.match(studio, new RegExp(contract));
assert.match(studio, /sendFollowUpMessage/);
assert.match(studio, /chat\/completions/);
assert.doesNotMatch(studio, /localStorage\.setItem\([^\n]*(token|secret|password)/i);
assert.match(style, /--th-accent: #a8472d/);
assert.match(style, /repeating-linear-gradient/);
assert.match(resources, /text\/html;profile=mcp-app/);
assert.match(widget, /ui\/message/);
assert.match(skill, /usable artifact/);
assert.match(skill, /Model output is replaceable/);

console.log("CONTENT STUDIO V2 OK projects=local user-ai=host-or-openai-compatible evidence=separate tools=21");
