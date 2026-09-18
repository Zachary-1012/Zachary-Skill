/* TrendHub 控制台前端 —— 原生 JS、零依赖；同一 UI 同时支持本地与公网只读/查询模式。
   只通过同源 /api/* 调用 TrendHub 能力；分析与成稿由调用方 AI 完成。 */
"use strict";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
window.TRENHUB_IS_REMOTE = !LOOPBACK_HOSTS.has(location.hostname);
window.TRENHUB_RUNTIME_MODE = window.TRENHUB_IS_REMOTE ? "公网" : "本地";

const COLORS = ["#10a37f", "#2563eb", "#d97706", "#dc2626", "#7c3aed"];
const ICON = {
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4l9 16H3z" stroke-linejoin="round"/><path d="M12 10v4M12 17h.01" stroke-linecap="round"/></svg>',
  err: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round"/></svg>',
};

let PLATFORMS = [];
let CATS = { platformCategories: [], futureSignalCategories: [], eventCategories: [] };

/* ---------------- 基础工具 ---------------- */
const $ = (s, el = document) => el.querySelector(s);
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function safeUrl(u) {
  return /^https?:\/\//i.test(u || "") ? u : null;
}
function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}
async function api(path, opts) {
  const r = await fetch(path, opts);
  let j = null;
  try { j = await r.json(); } catch { /* ignore */ }
  if (!r.ok) throw new Error((j && j.error) || `HTTP ${r.status}`);
  return j;
}
function post(path) {
  return api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
}
function copyText(text, okMsg) {
  const done = () => toast(okMsg || "已复制到剪贴板");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); done(); } catch { toast("复制失败，请手动选择文本"); }
  document.body.removeChild(ta);
}

/* ---------------- 通用 UI 片段 ---------------- */
const loading = () => '<div class="spinner"></div>';
const empty = (t) => `<div class="empty">${esc(t || "暂无数据")}</div>`;
function note(kind, text) {
  return `<div class="note ${kind}">${ICON[kind] || ICON.info}<div>${text}</div></div>`;
}
function qbadge(q) {
  const map = { ok: ["ok", "正常"], degraded: ["degraded", "降级"], missing: ["missing", "缺失"] };
  const [c, t] = map[q] || ["neutral", esc(q || "—")];
  return `<span class="badge ${c}">${t}</span>`;
}
function linkOrText(title, url) {
  const u = safeUrl(url);
  return u
    ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`
    : esc(title);
}
function itemsTable(items) {
  if (!items || !items.length) return empty("该平台本次没有可取用的条目");
  const rows = items
    .map((it) => {
      const meta = [it.author, it.hotText].filter(Boolean).map(esc).join(" · ");
      return `<tr>
        <td class="rank">${it.rank ?? "—"}</td>
        <td class="title-cell">${linkOrText(it.title, it.url)}${meta ? `<span class="meta">${meta}</span>` : ""}${it.desc ? `<span class="meta">${esc(it.desc)}</span>` : ""}</td>
        <td class="hot">${it.hot ?? "—"}</td>
      </tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table>
    <colgroup><col style="width:48px"><col><col style="width:96px"></colgroup>
    <thead><tr><th>#</th><th>标题</th><th style="text-align:right">热度</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
function lineChart(series) {
  const W = 920, H = 300, padL = 46, padR = 16, padT = 14, padB = 28;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = Math.max(0, ...series.map((s) => s.points.length));
  if (!n) return empty("无时间序列数据");
  const X = (i) => padL + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const Y = (v) => padT + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  let grid = "";
  for (const gv of [0, 25, 50, 75, 100]) {
    const y = Y(gv);
    grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eeeeef"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9b9b9b">${gv}</text>`;
  }
  let paths = "";
  series.forEach((s, si) => {
    const col = s.color || COLORS[si % COLORS.length];
    let d = "", pen = true;
    s.points.forEach((p, i) => {
      if (p.value == null) { pen = true; return; }
      const x = X(i), y = Y(p.value);
      d += `${pen ? "M" : " L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      pen = false;
    });
    paths += `<path class="chart-line" pathLength="1" d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  const ref = series[0].points;
  const step = Math.max(1, Math.round(n / 7));
  let xl = "";
  ref.forEach((p, i) => {
    if (i % step === 0 || i === n - 1)
      xl += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#9b9b9b">${esc(String(p.date).slice(0, 10))}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="趋势折线图">${grid}${paths}${xl}</svg>`;
}
function chartLegend(series) {
  return `<div class="chart-legend">${series
    .map((s, i) => `<span class="li"><span class="sw" style="background:${s.color || COLORS[i % COLORS.length]}"></span>${esc(s.name)}</span>`)
    .join("")}</div>`;
}

/* 通用对象渲染（用于话题情报/情感等结构不定的结果） */
function renderAny(value, key = "", depth = 0) {
  if (value == null || value === "") return depth === 0 ? empty("无数据") : "";
  if (Array.isArray(value)) {
    if (!value.length) return "";
    if (typeof value[0] === "object") {
      const cols = Array.from(new Set(value.flatMap((o) => Object.keys(o || {})))).slice(0, 6);
      const head = cols.map((c) => `<th>${esc(c)}</th>`).join("");
      const body = value
        .slice(0, 50)
        .map((o) => `<tr>${cols.map((c) => `<td>${cellOf(o[c])}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }
    return `<div class="tagrow">${value.slice(0, 60).map((v) => `<span class="tag">${cellOf(v)}</span>`).join("")}</div>`;
  }
  if (typeof value === "object") {
    if (key === "points" || (Array.isArray(value.points))) {
      return lineChart([{ name: value.keyword || key, points: value.points }]);
    }
    const blocks = Object.entries(value)
      .map(([k, v]) => {
        if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
        return `<div class="brief-section"><h3>${esc(k)}</h3>${renderAny(v, k, depth + 1)}</div>`;
      })
      .filter(Boolean)
      .join("");
    return blocks || empty("无数据");
  }
  return esc(String(value));
}
function cellOf(v) {
  if (v == null) return "—";
  if (typeof v === "number" || typeof v === "boolean") return esc(String(v));
  if (typeof v === "object") {
    if (v.title) return linkOrText(v.title, v.url);
    if (v.query) return esc(v.query) + (v.value ? ` <span class="meta">${esc(v.value)}</span>` : "");
    if (v.name) return esc(v.name);
    return esc(JSON.stringify(v));
  }
  return esc(String(v));
}

/* ---------------- 视图 ---------------- */
const VIEWS = {};

/* 概览 */
/* ---------------- 元数据与路由 ---------------- */
async function ensureMeta() {
  if (PLATFORMS.length) return;
  const [p, c] = await Promise.all([api("/api/platforms"), api("/api/categories")]);
  PLATFORMS = p.platforms || [];
  CATS = c;
}
function parseHash() {
  const raw = location.hash.slice(1) || "/dashboard";
  const [path, qs] = raw.split("?");
  return { view: (path.replace(/^\//, "") || "dashboard"), params: Object.fromEntries(new URLSearchParams(qs || "")) };
}
const TITLES = {
  dashboard: "概览", xhs: "小红书热点", trending: "当下热榜", overlap: "跨平台共振", clusters: "共振话题发现", changes: "新晋 / 掉榜",
  curve: "关键词趋势曲线", related: "相关搜索词", signals: "未来信号", events: "节点日历",
  topic: "话题深度情报", brief: "创作简报", templates: "模板库", settings: "设置与说明",
  ops: "运行与交付",
};
async function route() {
  const { view, params } = parseHash();
  const fn = VIEWS[view] || VIEWS.dashboard;
  $("#viewTitle").textContent = TITLES[view] || "概览";
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  const content = $("#content");
  content.innerHTML = loading();
  try {
    await ensureMeta();
    await fn(content, params);
  } catch (e) {
    const hint = window.TRENHUB_IS_REMOTE
      ? "请稍后重试，并检查 /health 是否正常。"
      : "请确认控制台正在运行（npm run ui），且能访问各平台公开接口。";
    content.innerHTML = note("err", `加载失败：${esc(e.message)}`) + `<div class="card"><p class="sub">${hint}</p></div>`;
  }
}
const mobileNavQuery = window.matchMedia("(max-width: 720px)");
function setMobileNav(open) {
  const sidebar = document.querySelector(".sidebar");
  const toggle = document.querySelector("#navToggle");
  sidebar?.classList.toggle("nav-open", Boolean(open));
  toggle?.setAttribute("aria-expanded", String(Boolean(open)));
  toggle?.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
}
function closeMobileNav() {
  if (mobileNavQuery.matches) setMobileNav(false);
}
document.querySelectorAll(".nav-item").forEach((n) =>
  n.addEventListener("click", () => {
    closeMobileNav();
    location.hash = `#/${n.dataset.view}`;
  })
);
document.querySelector("#navToggle")?.addEventListener("click", () => {
  const open = !document.querySelector(".sidebar")?.classList.contains("nav-open");
  setMobileNav(open);
});
// iOS can restore a page from its back-forward cache with the old DOM state.
// Resetting the drawer on load/pageshow guarantees content is visible first.
closeMobileNav();
window.addEventListener("pageshow", closeMobileNav);
mobileNavQuery.addEventListener?.("change", closeMobileNav);
window.addEventListener("hashchange", route);
