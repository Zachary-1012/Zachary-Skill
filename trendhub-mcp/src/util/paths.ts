import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * 向上查找包根：同时兼容 tsx 直接运行(src/util/*)与编译后运行(dist/src/util/*)两种目录深度。
 * 以同时含 package.json 与 data/templates.json 的目录为包根。
 */
function findPackageRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 9; i++) {
    if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, "data", "templates.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start, "..", "..");
}

export const PKG_ROOT = findPackageRoot(here);

/** 只读种子数据（随包分发：events.json / future-sources.json / templates） */
export function seedFile(name: string): string {
  return path.join(PKG_ROOT, "data", name);
}

export function readSeedJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(seedFile(name), "utf-8")) as T;
  } catch {
    return fallback;
  }
}
