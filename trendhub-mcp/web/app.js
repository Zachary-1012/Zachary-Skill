"use strict";
/* TrendHub 2.0：趋势判断来自后端；内容项目、编辑状态与使用者 AI 编排位于产品前端。 */
/* 公网项目保存在浏览器；模型令牌只驻留页面内存，不发送给 TrendHub。 */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
window.TRENHUB_IS_REMOTE = !LOOPBACK_HOSTS.has(location.hostname);
window.TRENHUB_RUNTIME_MODE = window.TRENHUB_IS_REMOTE ? "公网" : "本地";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

async function post(path, body) {
  return api(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function copyText(text, msg = "已复制") {
  const done = () => toast(msg);
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)); }
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch { toast("复制失败，请手动选择"); }
  ta.remove();
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function loading(label = "正在获取公开数据…") {
  return `<div class="loading"><span class="spin"></span><span>${esc(label)}</span></div>`;
}
function empty(msg) {
  return `<div class="empty">${esc(msg)}</div>`;
}
function note(kind, msg) {
  const cls = kind === "err" ? "err" : kind === "warn" ? "warn" : kind === "ok" ? "ok" : "info";
  return `<div class="note ${cls}">${msg}</div>`;
}
function qbadge(q) {
  const map = { ok: ["ok", "可用"], degraded: ["warn", "降级"], stale: ["warn", "过期"], missing: ["neutral", "缺失"], down: ["err", "不可用"], auth_required: ["warn", "需登录"], rate_limited: ["warn", "限流"] };
  const [cls, text] = map[q] || ["neutral", q || "未知"];
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}
function safeUrl(u) {
  try { const url = new URL(u, location.origin); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}
function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function linkOrText(title, url) {
  const safe = safeUrl(url);
  return safe
    ? `<a href="${esc(safe)}" target="_blank" rel="noreferrer noopener">${esc(title || "(无标题)")}</a>`
    : esc(title || "(无标题)");
}
function itemsTable(items) {
  if (!items?.length) return empty("暂无条目");
  return `<div class="table-wrap"><table><colgroup><col style="width:46px"><col><col style="width:96px"></colgroup><thead>
    <tr><th>#</th><th>标题</th><th>热度</th></tr></thead><tbody>
    ${items.map((i) => `<tr><td>${i.rank ?? "—"}</td><td>${linkOrText(i.title, i.url)}</td><td class="mono">${esc(i.metric ?? i.hot ?? "—")}</td></tr>`).join("")}
  </tbody></table></div>`;
}
function statCard(value, label) {
  return `<div class="card stat"><div class="stat-num">${esc(value)}</div><div class="stat-label">${esc(label)}</div></div>`;
}
function verticalOptions(selected) {
  const opts = [
    ["general", "通用"], ["fashion-luxury", "时尚 / 奢侈品"], ["beauty", "美妆"], ["business-corporate", "商业 / 企业"],
    ["technology", "科技"], ["automotive", "汽车"], ["finance-markets", "金融 / 市场"], ["marketing-advertising", "营销 / 广告"],
    ["retail-commerce", "零售 / 电商"], ["culture-entertainment", "文化 / 娱乐"],
  ];
  return opts.map(([v, l]) => `<option value="${v}" ${selected === v ? "selected" : ""}>${l}</option>`).join("");
}
function chartLegend(series) {
  return `<div class="chart-legend">${series.map((s, i) => `<span class="legend-item"><i class="legend-dot" style="--dot-color:var(--accent-${i + 1})"></i>${esc(s.name)}</span>`).join("")}</div>`;
}
function lineChart(series, opts = {}) {
  const W = 880, H = 280, P = { t: 16, r: 16, b: 28, l: 40 };
  const all = series.flatMap((s) => s.points || []).map((p) => Number(p.value)).filter(Number.isFinite);
  if (!all.length) return empty("暂无可绘制的数据");
  const maxV = Math.max(...all, 1);
  const maxLen = Math.max(...series.map((s) => (s.points || []).length), 2);
  const x = (i) => P.l + (i * (W - P.l - P.r)) / Math.max(1, maxLen - 1);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - Number(v) / maxV);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((g) => {
    const yy = y(g * maxV);
    return `<line x1="${P.l}" y1="${yy}" x2="${W - P.r}" y2="${yy}" class="chart-grid"/>
      <text x="${P.l - 8}" y="${yy + 4}" text-anchor="end" class="chart-axis">${Math.round(g * maxV)}</text>`;
  }).join("");
  const labels = (() => {
    const ref = series[0].points || [];
    const idxs = [0, Math.floor((ref.length - 1) / 2), ref.length - 1].filter((v, i, a) => ref[v] && a.indexOf(v) === i);
    return idxs.map((i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="chart-axis">${esc(String(ref[i].date ?? "").slice(5, 10))}</text>`).join("");
  })();
  const paths = series.map((s, si) => {
    const pts = (s.points || []).map((p, i) => `${x(i)},${y(Number(p.value))}`);
    return `<polyline class="chart-line series-${si + 1}" fill="none" points="${pts.join(" ")}"/>
      ${(s.points || []).map((p, i) => `<circle cx="${x(i)}" cy="${y(Number(p.value))}" r="2.4" class="chart-dot series-${si + 1}"/>`).join("")}`;
  }).join("");
  return `<div class="chart-scroll"><svg class="chart-draw" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(opts.ariaLabel || "趋势曲线")}">${grid}${labels}${paths}</svg></div>`;
}

function renderAny(value, key = "") {
  if (value == null) return `<span class="null">null</span>`;
  if (typeof value === "boolean") return `<span class="bool">${value ? "true" : "false"}</span>`;
  if (typeof value === "number" || typeof value === "string") {
    if (key.toLowerCase().includes("url") && safeUrl(value)) return `<a href="${esc(value)}" target="_blank" rel="noreferrer">${esc(value)}</a>`;
    return esc(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    if (value.every((x) => ["string", "number"].includes(typeof x))) return `<div class="tagrow">${value.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div>`;
    return `<div class="json-list">${value.map((x, i) => `<div class="json-row"><span class="json-key">[${i}]</span><div>${renderAny(x)}</div></div>`).join("")}</div>`;
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (!entries.length) return "{}";
  return `<div class="json-tree">${entries.map(([k, v]) => {
    const scalar = v == null || ["string", "number", "boolean"].includes(typeof v);
    return `<div class="json-row ${scalar ? "scalar" : ""}"><span class="json-key">${esc(k)}</span><div class="json-val">${renderAny(v, k)}</div></div>`;
  }).join("")}</div>`;
}

/* ---------- 本机存储：最近研究 / 正在关注（只存本机，不上传、不回传） ---------- */
const TH_STORE = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem("th:" + key)); return v ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("th:" + key, JSON.stringify(value)); } catch { /* 隐私模式等场景静默降级 */ }
  },
  recents() { return this.get("recents", []); },
  addRecent(keyword) {
    if (!keyword) return;
    const list = this.get("recents", []).filter((x) => x !== keyword);
    list.unshift(keyword);
    this.set("recents", list.slice(0, 8));
  },
  removeRecent(keyword) {
    this.set("recents", this.get("recents", []).filter((x) => x !== keyword));
  },
  watching() { return this.get("watching", []); },
  isWatching(k) { return this.get("watching", []).includes(k); },
  toggleWatching(k) {
    if (!k) return false;
    let list = this.get("watching", []);
    if (list.includes(k)) list = list.filter((x) => x !== k);
    else { list.unshift(k); list = list.slice(0, 20); }
    this.set("watching", list);
    return list.includes(k);
  },
};
window.TH_STORE = TH_STORE;

function renderSidebarRecents() {
  if (typeof window.renderSidebarProjects === "function") return window.renderSidebarProjects();
  const box = $("#sidebarRecents");
  if (!box) return;
  const rows = TH_STORE.recents().slice(0, 6);
  box.innerHTML = rows.length
    ? rows.map((keyword) => `<a class="sidebar-recent" href="#/research?keyword=${encodeURIComponent(keyword)}" title="${esc(keyword)}">${esc(keyword)}</a>`).join("")
    : '<span class="sidebar-recent-empty">还没有研究记录</span>';
}
window.renderSidebarRecents = renderSidebarRecents;

/* 统一研究入口：首页搜索、最近研究和新研究按钮都走这里 */
function startResearch(keyword) {
  const kw = String(keyword || "").trim();
  if (!kw) { location.hash = "#/research"; return; }
  TH_STORE.addRecent(kw);
  renderSidebarRecents();
  location.hash = `#/research?keyword=${encodeURIComponent(kw)}`;
}
window.startResearch = startResearch;

/* ---------- 平台元数据 ---------- */
let META = null;
async function ensureMeta() {
  if (META) return META;
  const d = await api("/api/health");
  META = { platforms: d.platforms || [], categories: d.categories || [] };
  return META;
}
const PLATFORMS = new Proxy([], {
  get(target, prop) {
    if (prop === "length") return META?.platforms.length || 0;
    if (prop in target) return target[prop];
    return META?.platforms[prop];
  },
});
const CATS = new Proxy({}, {
  get(_t, prop) {
    if (prop === "platformCategories") return [...new Set((META?.platforms || []).map((p) => p.category))].sort();
    if (prop === "futureSignalCategories") return [...new Set((META?.categories || []).filter((c) => c.type === "future_signal").map((c) => c.category))];
    if (prop === "eventCategories") return [...new Set((META?.categories || []).filter((c) => c.type === "event").map((c) => c.category))];
    return undefined;
  },
});
window.PLATFORMS = PLATFORMS;
window.CATS = CATS;

/* ---------- 路由 ---------- */
const VIEWS = {};
const TITLES = {
  studio: "内容工作台", library: "内容资产", calendar: "发布计划",
  dashboard: "研究", research: "研究", professional: "研究", discover: "发现", watch: "关注",
  xhs: "小红书", trending: "热点榜", overlap: "跨平台共振", clusters: "话题发现",
  curve: "趋势曲线", related: "相关搜索词", signals: "未来信号", events: "节点日历",
  topic: "话题情报", brief: "创作简报", templates: "模板库", sources: "数据源",
  workspace: "协作（本机）", ops: "运行与交付", settings: "设置",
};
window.VIEWS = VIEWS;
window.TITLES = TITLES;

function closeNavigation() {
  const sheet = $("#navigationSheet");
  const backdrop = $("#navBackdrop");
  const toggle = $("#navToggle");
  if (sheet) sheet.hidden = true;
  if (backdrop) backdrop.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
}
window.closeNavigation = closeNavigation;

async function route() {
  closeNavigation();
  const hash = location.hash || "#/studio";
  const [path, query = ""] = hash.slice(1).split("?");
  const segments = path.split("/").filter(Boolean);
  const requestedView = segments[0] || "research";
  const view = requestedView === "dashboard" ? "research" : requestedView === "brief" ? "studio" : requestedView;
  const params = Object.fromEntries(new URLSearchParams(query));
  const content = $("#content");
  const title = TITLES[view] || "";
  const viewTitle = $("#viewTitle");
  if (viewTitle) viewTitle.textContent = title;
  document.title = title ? `${title} · TrendHub` : "TrendHub · 内容工作台";
  $$(".nav-item").forEach((a) => {
    const dv = a.dataset.view;
    const active =
      dv === view ||
      (view === "professional" && dv === "research") ||
      (["trending", "clusters", "overlap", "curve", "related", "signals", "events", "topic", "xhs"].includes(view) && dv === "discover") ||
      (["sources", "workspace", "ops", "templates"].includes(view) && dv === "settings");
    a.classList.toggle("active", active);
  });
  content.scrollIntoView?.({ block: "start" });
  window.scrollTo({ top: 0 });
  try {
    if (VIEWS[view]) await VIEWS[view](content, params);
    else content.innerHTML = empty("页面不存在");
  } catch (e) {
    content.innerHTML = note("err", `加载失败：${esc(e.message)}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ensureMeta().catch(() => {});
  if (typeof renderXhsLoginStatus === "function") renderXhsLoginStatus().catch(() => {});
  if (!location.hash) history.replaceState(null, "", "#/studio");
  route();
  window.addEventListener("hashchange", route);

  const toggle = $("#navToggle");
  const sheet = $("#navigationSheet");
  const backdrop = $("#navBackdrop");
  if (toggle && sheet && backdrop) {
    toggle.addEventListener("click", () => {
      const open = sheet.hidden;
      sheet.hidden = !open;
      backdrop.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    });
    backdrop.addEventListener("click", closeNavigation);
    $("#closeNavigation")?.addEventListener("click", closeNavigation);
  }
  const openNewResearch = () => {
    closeNavigation();
    if (typeof window.createTrendHubProject === "function") window.createTrendHubProject();
    else location.hash = "#/studio";
  };
  $("#newResearchTop")?.addEventListener("click", openNewResearch);
  $("#sidebarNewResearch")?.addEventListener("click", openNewResearch);
  $("#sheetNewResearch")?.addEventListener("click", openNewResearch);
  renderSidebarRecents();
  if (typeof window.renderSidebarProjects === "function") window.renderSidebarProjects();
  window.addEventListener("pageshow", (event) => {
    renderSidebarRecents();
    if (event.persisted) route();
  });
});
