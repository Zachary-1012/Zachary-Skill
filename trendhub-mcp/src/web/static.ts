/**
 * 本地控制台静态资源托管（仅绑定 127.0.0.1）。
 * 资源位于包根 web/；做路径穿越防护，任何越界路径一律拒绝。
 */
import fs from "node:fs";
import path from "node:path";
import { PKG_ROOT } from "../util/paths.js";

const WEB_ROOT = path.join(PKG_ROOT, "web");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function ok(file: string, status = 200): Response {
  const ext = path.extname(file).toLowerCase();
  return new Response(fs.readFileSync(file), {
    status,
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "no-cache" },
  });
}

export function serveStatic(pathname: string): Response {
  let rel = decodeURIComponent(pathname.split("?")[0] || "/");
  if (rel === "/") rel = "/index.html";
  // 防路径穿越：规范化后必须仍位于 WEB_ROOT 内
  const target = path.resolve(WEB_ROOT, "." + rel);
  if (target !== WEB_ROOT && !target.startsWith(WEB_ROOT + path.sep)) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return ok(target);
    }
  } catch {
    /* 落到 SPA fallback */
  }
  // 单页应用 fallback：未知非 /api 路径返回 index.html
  try {
    return ok(path.join(WEB_ROOT, "index.html"));
  } catch {
    return new Response("console not built (web/index.html missing)", { status: 404 });
  }
}
