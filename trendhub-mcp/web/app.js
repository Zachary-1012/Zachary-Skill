/* TrendHub 本地控制台前端 —— 原生 JS、零依赖、离线运行、不接任何大模型。
   只通过同源 /api/* 调用本机插件能力；分析与成稿由调用方 AI 完成。 */
"use strict";

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
    paths += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
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
VIEWS.dashboard = async function (content) {
  content.innerHTML = loading();
  const [health] = await Promise.all([api("/api/health"), ensureMeta()]);
  const catTiles = CATS.platformCategories
    .map((c) => `<div class="tile" data-cat="${esc(c)}">${esc(c)} <span class="cat">分类</span></div>`)
    .join("");
  content.innerHTML = `
    <div class="grid cols-4">
      ${statCard(health.platformCount, "接入平台")}
      ${statCard(CATS.platformCategories.length, "平台分类")}
      ${statCard(16, "MCP 工具")}
      ${statCard("本地", "运行模式")}
    </div>
    <div class="section-title">快捷入口</div>
    <div class="grid cols-4">
      ${quickCard("xhs", "小红书热点 · 主打", "热门笔记 + 派生话题词 + 官方热搜")}
      ${quickCard("trending", "当下热榜", "全平台实时榜单（小红书打头）")}
      ${quickCard("clusters", "共振话题发现", "无需关键词，自动聚类全网热点")}
      ${quickCard("brief", "创作简报", "证据卡 + 模板 + 可交给 AI 的 Prompt")}
    </div>
    <div class="section-title">按分类浏览热榜</div>
    <div class="card"><div class="platform-tiles">${catTiles}</div></div>
    <div class="section-title">数据纪律</div>
    <div class="grid cols-2">
      <div class="card"><h3>不编造、不估算</h3><p class="sub">取不到的字段一律为 null，并用 正常 / 降级 / 缺失 标记；每条数据带采集时刻 capturedAt 与来源链接；平台公布时间与采集时间分离。</p></div>
      <div class="card"><h3>隐私与算力</h3><p class="sub">插件不内置任何大模型 Key、不采集、不回传、不联网上报；趋势判断与脚本/文案/方案成稿，均由你正在使用的 AI 完成。</p></div>
    </div>`;
  content.querySelectorAll("[data-cat]").forEach((t) =>
    t.addEventListener("click", () => (location.hash = `#/trending?category=${encodeURIComponent(t.dataset.cat)}`))
  );
  content.querySelectorAll("[data-quick]").forEach((t) =>
    t.addEventListener("click", () => (location.hash = `#/${t.dataset.quick}`))
  );
};
function statCard(num, lbl) {
  return `<div class="card stat"><span class="num">${esc(num)}</span><span class="lbl">${esc(lbl)}</span></div>`;
}
function quickCard(view, name, desc) {
  return `<div class="card" data-quick="${view}" style="cursor:pointer"><h3>${esc(name)}</h3><p class="sub">${esc(desc)}</p></div>`;
}

/* 小红书主打专区 */
VIEWS.xhs = function (content) {
  content.innerHTML = `
    <p class="lead">小红书主打专区：官方首页『热门推荐流』真实笔记（封面 / 作者 / 点赞 / 原文）+ 由热门标题词频派生的高频话题词。游客零配置可用热门流；官方热搜词榜与关键词搜索需配置 <span class="mono">XHS_COOKIE</span>。</p>
    <div class="controls">
      <label class="field">笔记条数<select id="f-limit">${[20, 30, 40].map((n) => `<option value="${n}" ${n === 30 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <button class="btn primary" id="btn-go">刷新小红书热点</button>
      <button class="btn" id="btn-copy">复制选题素材给 AI</button>
      <span id="mode"></span>
    </div>
    <div id="out">${loading()}</div>`;
  let last = null;
  const renderXhs = (d) => {
    last = d;
    const feed = d.feed || {};
    const items = feed.items || [];
    const topics = (d.derivedTopics && d.derivedTopics.topics) || [];
    const hot = d.officialHotlist;
    $("#mode").innerHTML = d.loggedIn ? `<span class="badge ok">登录态 · 全能力</span>` : `<span class="badge neutral">游客模式 · 热门流开放</span>`;
    const modeNote = d.loggedIn
      ? note("info", "已检测到 XHS_COOKIE：热门推荐流与官方热搜词榜均可用。")
      : note("warn", "游客模式：下方为官方首页『热门推荐流』（平台推荐序，<strong>非官方热搜词榜</strong>），点赞为展示近似值（如 4.1万 / 10万+，非精确整数）。配置 XHS_COOKIE 后解锁官方热搜词榜与关键词爆款搜索。");
    const feedWarn = feed.dataQuality && feed.dataQuality !== "ok" ? note(feed.dataQuality === "missing" ? "err" : "warn", esc(feed.note || "")) : "";
    const cards = items.length
      ? `<div class="xhs-grid">${items.map(xhsCard).join("")}</div>`
      : empty(feed.note || "本次未取到笔记，可稍后刷新");
    const topicList = topics.length
      ? topics.map((t) => `<div class="xhs-word" title="${esc((t.examples || []).join(" / "))}"><span class="xhs-w-text">${xhsTopicBadge(t)}${esc(t.word)}</span><span class="xhs-w-freq">${xhsTopicFreq(t)}</span></div>`).join("")
      : empty("样本不足，暂无派生词");
    const hotItems = hot && hot.items ? hot.items.slice(0, 24) : [];
    const hotBlock = hotItems.length
      ? `<div class="card xhs-side-card"><h3>官方热搜词榜 <span class="badge ok">登录</span></h3>${hotItems.map((h, i) => `<div class="xhs-word"><span class="xhs-w-text"><span class="xhs-rank">${i + 1}</span>${linkOrText(h.title, h.url)}</span><span class="xhs-w-freq">${esc(h.hotText || "")}</span></div>`).join("")}</div>`
      : `<div class="card xhs-side-card"><h3>官方热搜词榜</h3>${note("info", "官方词榜仅登录态开放：在启动环境设置 XHS_COOKIE（含 a1 与 web_session）后重启。游客请使用左侧热门推荐流与派生词。")}</div>`;
    $("#out").innerHTML =
      modeNote +
      `<div class="grid cols-3" style="margin-bottom:14px">${statCard(items.length, "热门笔记")}${statCard(topics.length, "派生话题词")}${statCard(d.loggedIn ? "已解锁" : "未配置", "官方词榜 / 搜索")}</div>` +
      `<div class="xhs-layout">
        <div class="xhs-main">
          <div class="xhs-head"><div class="section-title" style="margin:0">热门推荐笔记</div><span class="captured" style="margin:0">采集 ${fmtTime(feed.capturedAt)}</span></div>
          ${feedWarn}${cards}
        </div>
        <div class="xhs-side">
          <div class="card xhs-side-card"><h3>派生高频话题词 <span class="badge neutral">非官方词榜</span></h3>
            <p class="sub" style="margin:-4px 0 10px">热=跨篇高频词；#=作者标签；话题=作者空格标注（单篇候选）。均为标题派生、非官方词榜</p>${topicList}</div>
          ${hotBlock}
        </div>
      </div>`;
  };
  const run = async () => {
    $("#out").innerHTML = loading();
    try {
      const d = await api(`/api/xhs/topics?limit=${$("#f-limit").value}&topic_limit=24`);
      renderXhs(d);
    } catch (e) {
      $("#out").innerHTML = note("err", esc(e.message));
    }
  };
  $("#btn-go").addEventListener("click", run);
  $("#btn-copy").addEventListener("click", () => {
    if (!last) return toast("请先刷新小红书热点");
    copyText(xhsBriefText(last), "已复制小红书选题素材，粘贴给你的 AI 即可");
  });
  run();
};
function xhsTopicBadge(t) {
  if (t.source === "cross") return '<span class="badge accent">热 ' + t.df + "</span>";
  if (t.source === "hashtag") return '<span class="badge accent">#</span>';
  return '<span class="badge neutral">话题</span>';
}
function xhsTopicFreq(t) {
  if (t.source === "cross") return t.df + " 篇" + (t.tf > t.df ? ` · ${t.tf}次` : "");
  return t.source === "hashtag" ? "标签" : "作者标注";
}
function xhsCard(it) {
  const inner =
    (safeUrl(it.imageUrl)
      ? `<img class="xhs-img" src="${esc(it.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="xhs-img ph"><span>${esc(Array.from(it.title || "").slice(0, 2).join(""))}</span></div>`) +
    (it.kind === "video" ? `<span class="xhs-kind">视频</span>` : "") +
    (it.hotText ? `<span class="xhs-like">${esc(it.hotText)}</span>` : "");
  const cover = safeUrl(it.url)
    ? `<a class="xhs-cover" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<div class="xhs-cover">${inner}</div>`;
  return `<div class="xhs-card">${cover}
    <div class="xhs-body"><div class="xhs-title">${linkOrText(it.title, it.url)}</div>
    <div class="xhs-author">${esc(it.author || "")}</div></div></div>`;
}
function xhsBriefText(d) {
  const feed = d.feed || {}, items = feed.items || [], topics = (d.derivedTopics && d.derivedTopics.topics) || [];
  const hot = (d.officialHotlist && d.officialHotlist.items) || [];
  const L = [];
  L.push("【小红书当下热点 · 选题素材】");
  L.push(`采集时间：${feed.capturedAt || ""}；口径：官方首页热门推荐流（平台推荐序，非官方热搜词榜），点赞为展示近似值。`);
  L.push("");
  L.push(`一、热门笔记 TOP ${items.length}：`);
  items.forEach((it, i) => L.push(`${i + 1}. ${it.title} — @${it.author || ""} — 赞${it.hotText || "—"} ${it.url || ""}`));
  L.push("");
  L.push("二、热门话题词（标题派生，非官方词榜，供复核）：");
  const cross = topics.filter((t) => t.source === "cross");
  const tags = topics.filter((t) => t.source === "hashtag");
  const auth = topics.filter((t) => t.source === "author");
  if (cross.length) L.push("跨篇热词：" + cross.map((t) => `${t.word}(${t.df}篇)`).join("、"));
  if (tags.length) L.push("作者#标签：" + tags.map((t) => `#${t.word}`).join("、"));
  if (auth.length) L.push("作者话题（单篇选题候选）：" + auth.map((t) => t.word).join("、"));
  if (hot.length) {
    L.push("");
    L.push("三、官方热搜词榜：");
    hot.forEach((h, i) => L.push(`${i + 1}. ${h.title}`));
  }
  L.push("");
  L.push("请基于以上真实热点，按 xiaohongshu-note 模板产出 3 个选题方向、5 个标题钩子与一篇笔记正文框架；数据不得编造，缺失标注[待补充]。");
  return L.join("\n");
}

/* 当下热榜 */
VIEWS.trending = function (content, params) {
  const catOpts = ['<option value="">核心榜单（默认 10 平台 · 小红书打头）</option>']
    .concat(CATS.platformCategories.map((c) => `<option ${params.category === c ? "selected" : ""}>${esc(c)}</option>`))
    .join("");
  const platOpts = ['<option value="">（按分类或默认）</option>']
    .concat(PLATFORMS.map((p) => `<option value="${esc(p.platform)}" ${params.platform === p.platform ? "selected" : ""}>${esc(p.label)} · ${esc(p.category)}</option>`))
    .join("");
  content.innerHTML = `
    <p class="lead">选择分类或具体平台拉取当下热榜；每次查询会在本地积累快照，供“新晋/掉榜”对比。</p>
    <div class="controls">
      <label class="field">分类<select id="f-cat">${catOpts}</select></label>
      <label class="field">平台<select id="f-plat">${platOpts}</select></label>
      <label class="field">每平台条数<input class="input" id="f-limit" type="number" min="5" max="50" value="${esc(params.limit || 20)}" style="width:90px"></label>
      <button class="btn primary" id="btn-go">拉取热榜</button>
    </div>
    <div id="out">${loading()}</div>`;
  const run = async () => {
    const cat = $("#f-cat").value, plat = $("#f-plat").value, limit = $("#f-limit").value || 20;
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (plat) qs.set("platform", plat);
      else if (cat) qs.set("category", cat);
      const d = await api(`/api/trending?${qs}`);
      const bad = (d.degradedOrMissing || []).filter((x) => x.dataQuality !== "ok");
      $("#out").innerHTML =
        (bad.length ? note("warn", `以下平台本次降级/缺失：${bad.map((b) => `${b.platform}（${b.note || b.dataQuality}）`).join("；")}`) : "") +
        (d.results || []).map(platformCard).join("");
    } catch (e) {
      $("#out").innerHTML = note("err", esc(e.message));
    }
  };
  $("#btn-go").addEventListener("click", run);
  if (params.category || params.platform) run();
  else $("#out").innerHTML = empty("选择分类或平台后点击“拉取热榜”");
};
function platformCard(r) {
  const head = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <h3 style="margin:0">${esc(r.label)}</h3>${qbadge(r.dataQuality)}
    <span class="sub">${esc(r.platform)} · ${esc(r.category)} · ${r.items.length} 条</span></div>`;
  const warn = r.note ? note(r.dataQuality === "missing" ? "err" : "warn", esc(r.note)) : "";
  const cap = `<div class="captured">采集时刻 ${fmtTime(r.capturedAt)}${r.sourceUpdatedAt ? ` · 平台更新 ${fmtTime(r.sourceUpdatedAt)}` : ""}</div>`;
  return `<div class="card" style="margin-bottom:14px">${head}${warn}${cap}<div style="margin-top:10px">${itemsTable(r.items)}</div></div>`;
}

/* 跨平台共振 */
VIEWS.overlap = function (content, params) {
  content.innerHTML = `
    <p class="lead">输入关键词/话题，看它当前在多少个平台同时上榜（跨平台共振）。命中平台 ≥3 通常具备全网话题潜力。</p>
    <div class="controls">
      <input class="input" id="f-kw" placeholder="关键词，如 AI眼镜 / 英伟达" value="${esc(params.keyword || "")}">
      <input class="input" id="f-plats" placeholder="可选，限定平台，逗号分隔" style="flex:0 1 280px" value="${esc(params.platforms || "")}">
      <button class="btn primary" id="btn-go">分析共振</button>
    </div><div id="out">${empty("输入关键词后开始分析")}</div>`;
  const run = async () => {
    const kw = $("#f-kw").value.trim();
    if (!kw) return toast("请输入关键词");
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ keyword: kw, limit: "20" });
      if ($("#f-plats").value.trim()) qs.set("platforms", $("#f-plats").value.trim());
      const d = await api(`/api/overlap?${qs}`);
      const pct = Math.min(100, (d.platformsHit || 0) * 20);
      const missing = (d.checkedPlatforms || []).filter((p) => p.dataQuality !== "ok").map((p) => p.platform);
      $("#out").innerHTML =
        note("info", esc(d.interpretationHint || "")) +
        (missing.length ? note("warn", `部分平台本次不可用，未计入：${missing.join("、")}`) : "") +
        `<div class="card"><div class="score-ring">
          <div class="ring" style="--pct:${pct}%"><span>${esc(d.resonanceScore)}</span></div>
          <div><div style="font-size:15px;font-weight:650">「${esc(kw)}」命中 ${d.platformsHit} 个平台 · ${d.totalMentions} 条</div>
          <div class="sub">${esc(d.scoreNote || "")}</div></div>
        </div></div>` +
        (d.platforms || []).map(
          (p) => `<div class="platform-hit" style="margin-top:10px"><div class="head"><span>${esc(p.label)} ${qbadge("ok")}</span>
            <span class="sub">命中 ${p.count} · 最佳排名 #${p.bestRank >= 999 ? "—" : p.bestRank}</span></div>
            ${p.items.map((i) => `<div class="member">#${i.rank ?? "—"} ${linkOrText(i.title, i.url)}</div>`).join("")}</div>`
        ).join("");
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  };
  $("#btn-go").addEventListener("click", run);
  if (params.keyword) run();
};

/* 共振话题发现 */
VIEWS.clusters = function (content) {
  content.innerHTML = `
    <p class="lead">无需关键词，基于标题相似度自动聚类当前在多个平台共振的话题。规则聚类可能合并/遗漏近义话题，主题归纳请交给 AI 复核。</p>
    <div class="controls">
      <label class="field">至少在 N 个平台出现<select id="f-min">
        ${[2, 3, 4, 5].map((n) => `<option value="${n}">${n}</option>`).join("")}</select></label>
      <button class="btn primary" id="btn-go">发现共振话题</button>
    </div><div id="out">${empty("点击按钮开始（需拉取多个平台，可能耗时数十秒）")}</div>`;
  $("#btn-go").addEventListener("click", async () => {
    $("#out").innerHTML = loading();
    try {
      const d = await api(`/api/clusters?min_platforms=${$("#f-min").value}&limit=20`);
      $("#out").innerHTML =
        note("info", esc(d.note || "")) +
        ((d.clusters || []).length
          ? d.clusters.map(
              (c) => `<div class="cluster" style="margin-bottom:12px">
                <div class="topic">${esc(c.topic)}</div>
                <div class="tagrow" style="margin:6px 0">
                  <span class="badge accent">${c.platformCount} 平台共振</span>
                  <span class="badge neutral">共振分 ${c.resonanceScore}</span>
                  ${(c.platforms || []).map((p) => `<span class="tag">${esc(p)}</span>`).join("")}
                </div>
                ${(c.members || []).map((m) => `<div class="member">${esc(m.label)}：${linkOrText(m.title, m.url)} <span class="meta">#${m.rank ?? "—"}</span></div>`).join("")}
              </div>`
            ).join("")
          : empty("当前未发现达到阈值的跨平台共振话题，可调低平台数或稍后再试"));
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  });
};

/* 新晋 / 掉榜 */
VIEWS.changes = function (content) {
  content.innerHTML = `
    <p class="lead">对比两次快照，输出各平台新晋上榜、排名飙升（≥3 位）与掉榜话题。需要先落两次快照（间隔一段时间）。</p>
    <div class="controls">
      <button class="btn primary" id="btn-snap">立即快照</button>
      <button class="btn" id="btn-diff">查看变化</button>
    </div>
    <div id="out">${note("info", "第一次点击“立即快照”建立基线；过一段时间（或热榜刷新后）再点一次，然后“查看变化”。")}</div>`;
  $("#btn-snap").addEventListener("click", async () => {
    $("#out").innerHTML = loading();
    try {
      const d = await post("/api/snapshot");
      const ok = (d.report || []).filter((r) => r.ok).length;
      $("#out").innerHTML = note("info", `快照完成：${ok}/${(d.report || []).length} 个平台成功，采集时刻 ${fmtTime(d.capturedAt)}。再次快照后即可查看新晋/掉榜。`);
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  });
  $("#btn-diff").addEventListener("click", async () => {
    $("#out").innerHTML = loading();
    try {
      const d = await api("/api/changes");
      const blocks = (d.withHistory || []).map((p) => {
        const sec = (arr, kind, label) =>
          arr.length
            ? `<div style="margin-top:8px"><div style="font-weight:600;font-size:12.5px;color:var(--muted)">${label}</div>${arr
                .map((c) => `<div class="member">${changeText(c, kind)}</div>`)
                .join("")}</div>`
            : "";
        return `<div class="card" style="margin-bottom:12px">
          <h3>${esc(p.platform)}</h3>
          ${sec(p.newTopics, "new", "新晋")}${sec(p.rising, "risen", "飙升")}${sec(p.dropped, "dropped", "掉榜")}
          ${!p.newTopics.length && !p.rising.length && !p.dropped.length ? empty("两次快照间无明显变化") : ""}
          <div class="captured">对比 ${fmtTime(p.previousAt)} → ${fmtTime(p.latestAt)}</div></div>`;
      });
      $("#out").innerHTML =
        (d.noHistoryYet && d.noHistoryYet.length ? note("warn", `这些平台尚无两次快照：${d.noHistoryYet.join("、")}`) : "") +
        (blocks.length ? blocks.join("") : empty("还没有可对比的历史，请先点两次“立即快照”"));
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  });
};
function changeText(c, kind) {
  const arrow = kind === "new" ? "新" : kind === "risen" ? `↑${c.rankDelta}` : "掉";
  const cls = kind === "dropped" ? "neutral" : kind === "risen" ? "accent" : "ok";
  return `<span class="badge ${cls}" style="margin-right:6px">${arrow}</span>${linkOrText(c.title, c.url)} <span class="meta">${c.prevRank ? `#${c.prevRank}→` : ""}${c.currentRank ? `#${c.currentRank}` : ""}</span>`;
}

/* 关键词趋势曲线 */
VIEWS.curve = function (content, params) {
  content.innerHTML = `
    <p class="lead">Google Trends 相对热度（0–100，所选时间窗峰值=100），支持 1–5 个关键词对比；不是绝对搜索量。</p>
    <div class="controls">
      <input class="input" id="f-kw" placeholder="关键词，逗号分隔，如 AI眼镜,VR头显" value="${esc(params.keywords || "")}">
      <input class="input" id="f-geo" placeholder="地区代码 US/CN，留空全球" style="flex:0 1 150px" value="${esc(params.geo || "")}">
      <select id="f-tf" class="input" style="flex:0 1 160px">
        ${["now 7-d", "today 1-m", "today 3-m", "today 12-m"].map((t) => `<option ${params.timeframe === t ? "selected" : ""}>${t}</option>`).join("")}
      </select>
      <button class="btn primary" id="btn-go">查询趋势</button>
    </div><div id="out">${empty("输入关键词后查询")}</div>`;
  $("#btn-go").addEventListener("click", async () => {
    const kw = $("#f-kw").value.trim();
    if (!kw) return toast("请输入关键词");
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ keywords: kw, geo: $("#f-geo").value.trim(), timeframe: $("#f-tf").value });
      const d = await api(`/api/curve?${qs}`);
      if (d.dataQuality !== "ok") { $("#out").innerHTML = note("warn", esc(d.note || "趋势数据不可用（可能被限流或地区不可用）")); return; }
      const names = kw.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
      const series = d.series
        ? names.map((n) => ({ name: n, points: d.series[n] || d.points }))
        : [{ name: d.keyword, points: d.points }];
      $("#out").innerHTML =
        note("info", esc(d.scaleNote)) +
        `<div class="chart-card">${chartLegend(series)}${lineChart(series)}</div>`;
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  });
  if (params.keywords) $("#btn-go").click();
};

/* 相关搜索词 */
VIEWS.related = function (content, params) {
  content.innerHTML = `
    <p class="lead">关键词在 Google Trends 的相关搜索：top 长期热门、rising 近期飙升，用于选题与搜索流量布局。</p>
    <div class="controls">
      <input class="input" id="f-kw" placeholder="关键词" value="${esc(params.keyword || "")}">
      <input class="input" id="f-geo" placeholder="地区代码，留空全球" style="flex:0 1 150px" value="${esc(params.geo || "")}">
      <button class="btn primary" id="btn-go">查询相关词</button>
    </div><div id="out">${empty("输入关键词后查询")}</div>`;
  $("#btn-go").addEventListener("click", async () => {
    const kw = $("#f-kw").value.trim();
    if (!kw) return toast("请输入关键词");
    $("#out").innerHTML = loading();
    try {
      const d = await api(`/api/related?keyword=${encodeURIComponent(kw)}&geo=${encodeURIComponent($("#f-geo").value.trim())}`);
      if (d.dataQuality !== "ok") { $("#out").innerHTML = note("warn", esc(d.note || "相关词数据不足或不可用")); return; }
      const col = (arr, cls, label) => `<div class="card"><h3>${label}（${arr.length}）</h3>
        <div class="tagrow">${arr.length ? arr.map((x) => `<span class="tag ${cls}">${esc(x.query)}${x.value ? ` · ${esc(x.value)}` : ""}</span>`).join("") : empty("无")}</div></div>`;
      $("#out").innerHTML = `<div class="grid cols-2">${col(d.rising || [], "rising", "近期飙升 rising")}${col(d.top || [], "", "长期热门 top")}</div>`;
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  });
  if (params.keyword) $("#btn-go").click();
};

/* 未来信号 */
VIEWS.signals = function (content, params) {
  const catOpts = ['<option value="all">全部</option>']
    .concat(CATS.futureSignalCategories.map((c) => `<option ${params.category === c ? "selected" : ""}>${esc(c)}</option>`)).join("");
  content.innerHTML = `
    <p class="lead">聚合高质量科技 / AI / 商业 / 营销信源的最新文章，作为“未来趋势”信号素材；趋势判断交给 AI。</p>
    <div class="controls">
      <select id="f-cat" class="input" style="flex:0 1 180px">${catOpts}</select>
      <input class="input" id="f-kw" placeholder="按关键词过滤标题/摘要（可选）" value="${esc(params.keyword || "")}">
      <select id="f-limit" class="input" style="flex:0 1 110px">${[20, 40, 60, 100].map((n) => `<option ${String(params.limit) === String(n) ? "selected" : ""}>${n}</option>`).join("")}</select>
      <button class="btn primary" id="btn-go">拉取信号</button>
    </div><div id="out">${loading()}</div>`;
  const run = async () => {
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ category: $("#f-cat").value, limit: $("#f-limit").value });
      if ($("#f-kw").value.trim()) qs.set("keyword", $("#f-kw").value.trim());
      const d = await api(`/api/signals?${qs}`);
      const failed = (d.sourceStatus || []).filter((s) => !s.ok);
      $("#out").innerHTML =
        (d.dataQuality !== "ok" ? note(d.dataQuality === "missing" ? "err" : "warn", `信源可用度：${d.dataQuality}（${failed.length}/${(d.sourceStatus || []).length} 个源本次失败）`) : "") +
        `<div class="sub" style="margin-bottom:10px">共 ${d.total} 篇 · 采集 ${fmtTime(d.capturedAt)}</div>` +
        ((d.articles || []).length
          ? d.articles.map((a) => `<div class="article" style="margin-bottom:10px">
              <div class="at-title">${linkOrText(a.title, a.url)}</div>
              <div class="at-meta">${esc(a.source)} · ${esc(a.category)} · ${fmtTime(a.publishedAt)}</div>
              ${a.summary ? `<div class="at-summary">${esc(a.summary)}</div>` : ""}
            </div>`).join("")
          : empty("没有匹配的文章"));
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  };
  $("#btn-go").addEventListener("click", run);
  run();
};

/* 节点日历 */
VIEWS.events = function (content, params) {
  const catOpts = ['<option value="all">全部</option>']
    .concat(CATS.eventCategories.map((c) => `<option ${params.category === c ? "selected" : ""}>${esc(c)}</option>`)).join("");
  content.innerHTML = `
    <p class="lead">未来 N 天的趋势节点（科技展会 / 财报季 / 政策 / 电商大促 / 节假日），含距今天数与预热等级。未官宣日期以窗口表示。</p>
    <div class="controls">
      <select id="f-days" class="input" style="flex:0 1 140px">${[30, 90, 180, 365].map((n) => `<option ${String(params.days_ahead || 90) === String(n) ? "selected" : ""}>未来 ${n} 天</option>`).join("")}</select>
      <select id="f-cat" class="input" style="flex:0 1 200px">${catOpts}</select>
      <button class="btn primary" id="btn-go">查询节点</button>
    </div><div id="out">${loading()}</div>`;
  const run = async () => {
    const qs = new URLSearchParams({ days_ahead: $("#f-days").value, category: $("#f-cat").value });
    const d = await api(`/api/events?${qs}`);
    $("#out").innerHTML =
      `<div class="sub" style="margin-bottom:12px">基准日 ${esc(d.asOf)} · 窗口内 ${d.total} 个节点</div>` +
      ((d.events || []).length
        ? `<div class="timeline">${d.events.map((e) => `<div class="tl-item"><div class="event">
            <div class="days">${e.daysUntilStart}<small>天后开始</small></div>
            <div style="flex:1">
              <div style="font-weight:650">${linkOrText(e.name, e.sourceUrl)} <span class="badge neutral">${esc(e.category)}</span> ${e.preheat ? `<span class="badge accent">${esc(e.preheat)}</span>` : ""}</div>
              <div class="ev-meta">${esc(e.startDate)}${e.endDate && e.endDate !== e.startDate ? ` ~ ${esc(e.endDate)}` : ""}${e.region ? ` · ${esc(e.region)}` : ""}</div>
              ${e.expectedImpact ? `<div class="ev-meta">${esc(e.expectedImpact)}</div>` : ""}
            </div>
          </div></div>`).join("")}</div>`
        : empty(d.note || "窗口内暂无节点"));
  };
  $("#btn-go").addEventListener("click", () => run().catch((e) => ($("#out").innerHTML = note("err", esc(e.message)))));
  run().catch((e) => ($("#out").innerHTML = note("err", esc(e.message))));
};

/* 话题深度情报 */
VIEWS.topic = function (content, params) {
  content.innerHTML = `
    <p class="lead">一次性聚合跨平台共振、搜索热度与动量、相关词、未来信号、临近节点与情感信号，供 AI 做定性 / 阶段 / 机会风险判断。</p>
    <div class="controls">
      <input class="input" id="f-kw" placeholder="要分析的话题" value="${esc(params.keyword || "")}">
      <input class="input" id="f-geo" placeholder="地区代码，留空全球" style="flex:0 1 150px" value="${esc(params.geo || "")}">
      <button class="btn primary" id="btn-go">生成情报包</button>
    </div><div id="out">${empty("输入话题后生成")}</div>`;
  $("#btn-go").addEventListener("click", async () => {
    const kw = $("#f-kw").value.trim();
    if (!kw) return toast("请输入话题");
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ keyword: kw, geo: $("#f-geo").value.trim() });
      const d = await api(`/api/topic?${qs}`);
      $("#out").innerHTML = renderAny(d);
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  });
  if (params.keyword) $("#btn-go").click();
};

/* 创作简报 */
VIEWS.brief = async function (content, params) {
  await ensureMeta();
  const tplOpts = ['<option value="">自动匹配平台模板</option>']
    .concat((await api("/api/templates")).templates.map((t) => `<option value="${esc(t.id)}" ${params.template_id === t.id ? "selected" : ""}>${esc(t.name)}</option>`)).join("");
  const platOpts = ['<option value="xiaohongshu" selected>小红书（默认 · 主打）</option>', '<option value="all">通用 all</option>']
    .concat(PLATFORMS.filter((p) => p.platform !== "xiaohongshu").map((p) => `<option value="${esc(p.platform)}">${esc(p.label)}</option>`)).join("");
  content.innerHTML = `
    <p class="lead">围绕主题聚合真实热点证据、相关词、情感、同平台爆款样本与专家模板，产出逐格填充指引和可直接交给 AI 的 productionPrompt。<strong>本页不接模型、不写成稿</strong>。</p>
    <div class="controls">
      <input class="input" id="f-topic" placeholder="创作主题 / 要蹭的热点（必填）" value="${esc(params.topic || "")}">
      <select id="f-plat" class="input" style="flex:0 1 170px">${platOpts}</select>
      <select id="f-tpl" class="input" style="flex:0 1 190px">${tplOpts}</select>
    </div>
    <div class="controls">
      <input class="input" id="f-goal" placeholder="目标：涨粉 / 带货转化 / 品牌曝光 / 线索收集" value="${esc(params.goal || "")}">
      <input class="input" id="f-aud" placeholder="目标人群画像（可选）" value="${esc(params.audience || "")}">
      <input class="input" id="f-geo" placeholder="趋势地区（可选）" style="flex:0 1 140px" value="${esc(params.geo || "")}">
      <button class="btn primary" id="btn-go">生成创作简报</button>
    </div><div id="out">${empty("填写主题后生成证据简报")}</div>`;
  $("#btn-go").addEventListener("click", async () => {
    const topic = $("#f-topic").value.trim();
    if (!topic) return toast("请填写创作主题");
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ topic, platform: $("#f-plat").value });
      if ($("#f-tpl").value) qs.set("template_id", $("#f-tpl").value);
      if ($("#f-goal").value.trim()) qs.set("goal", $("#f-goal").value.trim());
      if ($("#f-aud").value.trim()) qs.set("audience", $("#f-aud").value.trim());
      if ($("#f-geo").value.trim()) qs.set("geo", $("#f-geo").value.trim());
      const d = await api(`/api/brief?${qs}`);
      $("#out").innerHTML = renderBrief(d);
    } catch (e) { $("#out").innerHTML = note("err", esc(e.message)); }
  });
  if (params.topic) $("#btn-go").click();
};
function renderBrief(d) {
  const t = d.template || {};
  const ev = d.evidence || {};
  const cp = ev.crossPlatform || {};
  const rq = ev.relatedQueries || {};
  const promptBlock = `<div class="brief-section">
    <h3>交给 AI 的 productionPrompt</h3>
    <div class="toolbar" style="margin-bottom:8px">
      <button class="btn sm primary" id="cp-prompt">复制 Prompt</button>
      <button class="btn sm" id="cp-all">复制完整简报（JSON）</button>
    </div>
    <pre class="prompt" id="prompt-text">${esc(d.productionPrompt || "")}</pre></div>`;
  const tplCard = `<div class="card">
    <h3>${esc(t.name || "模板")} <span class="badge neutral">${esc(t.type)}</span></h3>
    <p class="sub">${esc(t.bestFor || "")}</p>
    ${(t.structure || []).map((s) => `<div style="margin-top:8px"><strong>${esc(s.section)}</strong><div class="sub">${esc(s.purpose)} · ${esc(s.guidance)}</div>${(s.slots || []).length ? `<div class="tagrow">${s.slots.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div>` : ""}</div>`).join("")}
    ${t.checklist && t.checklist.length ? `<div style="margin-top:10px"><strong>自查清单</strong><ul class="clean checklist">${t.checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
  </div>`;
  const cpCard = `<div class="card">
    <h3>跨平台证据</h3>
    ${cp.dataQuality === "missing" ? note("warn", esc(cp.note || "跨平台数据不可用")) : `
    <div class="kv">
      <div class="k">命中平台</div><div>${cp.platformsHit ?? "—"}</div>
      <div class="k">命中条目</div><div>${cp.totalMentions ?? "—"}</div>
      <div class="k">共振分</div><div>${cp.resonanceScore ?? "—"}</div>
    </div>
    <div style="margin-top:10px">${(cp.topMentions || []).map((m) => `<div class="member">${esc(m.platform)}：${linkOrText(m.title, m.url)} <span class="meta">#${m.rank ?? "—"}</span></div>`).join("") || empty("无命中样本")}</div>`}
  </div>`;
  const rqCard = `<div class="card"><h3>相关搜索词</h3>
    ${rq.dataQuality === "missing" ? note("warn", esc(rq.note || "相关词不可用")) : `
    <div class="tagrow">${(rq.rising || []).map((x) => `<span class="tag rising">↑ ${esc(x.query)}</span>`).join("")}${(rq.top || []).map((x) => `<span class="tag">${esc(x.query)}</span>`).join("")}</div>`}
  </div>`;
  const refsCard = (d.referenceTitles || []).length
    ? `<div class="card"><h3>同平台真实爆款样本（学语感，勿抄袭）</h3>${d.referenceTitles.map((g) => `<div style="margin-bottom:8px"><strong>${esc(g.label)}</strong>${(g.titles || []).map((ti) => `<div class="member">${esc(ti)}</div>`).join("")}</div>`).join("")}</div>`
    : "";
  const slotsCard = (d.fillSlots || []).length
    ? `<div class="card"><h3>逐格填充指引</h3>${d.fillSlots.map((s) => `<div class="slot"><strong>${esc(s.section)} · ${esc(s.slot)}</strong><div class="sub">${esc(s.hint)}</div></div>`).join("")}</div>`
    : "";
  const nodesCard = (ev.relatedNodes || []).length
    ? `<div class="card"><h3>相关节点</h3>${ev.relatedNodes.map((e2) => `<div class="member">${linkOrText(e2.name, e2.sourceUrl)} <span class="meta">${esc(e2.startDate)}</span></div>`).join("")}</div>`
    : "";
  setTimeout(() => {
    const cp1 = $("#cp-prompt"), cp2 = $("#cp-all");
    if (cp1) cp1.addEventListener("click", () => copyText(d.productionPrompt || "", "Prompt 已复制，粘贴给你的 AI 即可成稿"));
    if (cp2) cp2.addEventListener("click", () => copyText(JSON.stringify(d, null, 2), "完整简报 JSON 已复制"));
  }, 0);
  return note("info", esc(d.note || "把本简报与 Prompt 一起交给你的 AI 生成成稿；所有数据须来自证据，缺失保留[待补充]。")) +
    promptBlock +
    `<div class="grid cols-2" style="margin-top:14px">${cpCard}${rqCard}</div>` +
    (refsCard || nodesCard ? `<div class="grid cols-2" style="margin-top:14px">${refsCard}${nodesCard}</div>` : "") +
    (slotsCard ? `<div style="margin-top:14px">${slotsCard}</div>` : "") +
    `<div style="margin-top:14px">${tplCard}</div>`;
}

/* 模板库 */
VIEWS.templates = async function (content) {
  content.innerHTML = `<p class="lead">内置专家模板：短视频分镜、小红书、微博、公众号、X 线程、直播脚本、营销方案、内容日历、新品发布、标题钩子。</p><div id="out">${loading()}</div>`;
  const d = await api("/api/templates");
  $("#out", content).innerHTML = `<div class="grid cols-3">${(d.templates || []).map(
    (t) => `<div class="card"><h3>${esc(t.name)}</h3>
      <div class="tagrow" style="margin:6px 0"><span class="badge neutral">${esc(t.type)}</span>${(t.platforms || []).map((p) => `<span class="tag">${esc(p)}</span>`).join("")}</div>
      <p class="sub">${esc(t.bestFor)}</p>
      <button class="btn sm" data-tpl="${esc(t.id)}">查看结构</button>
      <div class="tpl-detail" style="display:none;margin-top:10px"></div></div>`
  ).join("")}</div>`;
  content.querySelectorAll("[data-tpl]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const box = btn.nextElementSibling;
      if (box.style.display === "block") { box.style.display = "none"; return; }
      box.style.display = "block";
      box.innerHTML = loading();
      const t = await api(`/api/template?id=${encodeURIComponent(btn.dataset.tpl)}`);
      box.innerHTML = renderAny({ structure: t.structure, formulas: t.formulas, storyboardFields: t.storyboardFields, tips: t.tips, checklist: t.checklist });
    })
  );
};

/* 设置与说明 */
VIEWS.settings = async function (content) {
  content.innerHTML = loading();
  let health = { version: "—", platformCount: "—", categoryCount: "—" };
  try { health = await api("/api/health"); } catch { /* ignore */ }
  const envRows = [
    ["TRENTHUB_TRANSPORT", "stdio | http", "传输方式，默认 stdio"],
    ["TRENTHUB_HOST / TRENTHUB_PORT", "127.0.0.1 / 8333", "HTTP 与控制台监听地址/端口"],
    ["TRENTHUB_CACHE_TTL", "300", "热榜 HTTP 缓存秒数"],
    ["TRENTHUB_TIMEOUT_MS / TRENTHUB_RETRIES", "15000 / 1", "外呼超时与重试"],
    ["TRENTHUB_DATA_DIR", "包内 data/", "快照等运行期数据目录"],
    ["TRENTHUB_RSS_SOURCES", "—", "自定义未来信号 RSS 清单 JSON"],
    ["XHS_COOKIE", "—", "可选：小红书网页 Cookie（需含 a1 与 web_session），解锁官方热搜词榜与关键词搜索；不设则游客模式仅热门推荐流"],
  ].map((r) => `<tr><td class="mono">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("");
  content.innerHTML = `
    <div class="grid cols-3">
      ${statCard(esc(health.version), "插件版本")}
      ${statCard(esc(health.platformCount), "平台数")}
      ${statCard(esc(health.categoryCount), "分类数")}
    </div>
    <div class="section-title">启动方式</div>
    <div class="card">
      <p>桌面 AI 客户端（Claude / Cursor / 豆包 / VS Code）用 <span class="mono">stdio</span>：命令 <span class="mono">node dist/src/index.js</span></p>
      <p>URL 类客户端用 HTTP MCP：<span class="mono">npm run start:http</span>，端点 <span class="mono">http://127.0.0.1:8333/mcp</span></p>
      <p>打开本控制台：<span class="mono">npm run ui</span>（等价 <span class="mono">node dist/src/index.js --ui</span>，自动开浏览器）。AI 也可直接给你形如 <span class="mono">http://127.0.0.1:8333/#/brief?topic=关键词</span> 的深链，打开即定位。</p>
      <p class="sub">各客户端具体接入字段见仓库 docs/setup-clients.md。</p>
    </div>
    <div class="section-title">环境变量</div>
    <div class="table-wrap"><table><colgroup><col style="width:28%"><col style="width:22%"><col></colgroup>
      <thead><tr><th>变量</th><th>默认</th><th>说明</th></tr></thead><tbody>${envRows}</tbody></table></div>
    <div class="section-title">隐私、合规与数据纪律</div>
    <div class="grid cols-2">
      <div class="card"><h3>零 Key · 零遥测 · 零回传</h3><p class="sub">插件不内置任何大模型 Key，不收集点击、关键词、标题或正文，不向任何外部端点上报；控制台只监听 127.0.0.1 本机回环，不对公网开放。分析与成稿算力全部由你接入的 AI 承担。</p></div>
      <div class="card"><h3>不编造、可追溯</h3><p class="sub">缺失字段为 null 并标记 missing/degraded；每条数据带 capturedAt 与来源链接；Google Trends 为 0–100 相对热度而非绝对搜索量；抓取类源随上游改版可能需要 git pull 更新。</p></div>
    </div>`;
};

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
    content.innerHTML = note("err", `加载失败：${esc(e.message)}`) + '<div class="card"><p class="sub">请确认控制台正在运行（npm run ui），且能访问各平台公开接口。</p></div>';
  }
}
document.querySelectorAll(".nav-item").forEach((n) =>
  n.addEventListener("click", () => (location.hash = `#/${n.dataset.view}`))
);
window.addEventListener("hashchange", route);
route();
