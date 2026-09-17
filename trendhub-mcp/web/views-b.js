VIEWS.trending = function (content, params) {
  const catOpts = ['<option value="">核心榜单（默认 10 平台 · 小红书打头）</option>']
    .concat(CATS.platformCategories.map((c) => `<option ${params.category === c ? "selected" : ""}>${esc(c)}</option>`))
    .join("");
  const platOpts = ['<option value="">（按分类或默认）</option>']
    .concat(PLATFORMS.map((p) => `<option value="${esc(p.platform)}" ${params.platform === p.platform ? "selected" : ""}>${esc(p.label)} · ${esc(p.category)}</option>`))
    .join("");
  content.innerHTML = `
    <p class="lead">打开即显示托管端最近成功快照；点击“实时刷新”重新拉取当前热榜。实时源临时失败时自动回退到最近成功快照，不再显示空白。</p>
    <div class="controls">
      <label class="field">分类<select id="f-cat">${catOpts}</select></label>
      <label class="field">平台<select id="f-plat">${platOpts}</select></label>
      <label class="field">每平台条数<input class="input" id="f-limit" type="number" min="5" max="50" value="${esc(params.limit || 20)}" style="width:90px"></label>
      <button class="btn primary" id="btn-go">实时刷新</button>
    </div>
    <div id="out">${loading()}</div>`;
  const run = async (sourceMode = "live") => {
    const cat = $("#f-cat").value, plat = $("#f-plat").value, limit = $("#f-limit").value || 20;
    $("#out").innerHTML = loading();
    try {
      const qs = new URLSearchParams({ limit: String(limit), mode: sourceMode });
      if (plat) qs.set("platform", plat);
      else if (cat) qs.set("category", cat);
      const d = await api(`/api/trending?${qs}`);
      const bad = (d.degradedOrMissing || []).filter((x) => x.dataQuality !== "ok");
      const modeNote = d.sourceMode === "snapshot"
        ? note("info", `当前显示托管端最近成功快照 · ${d.platformCount || 0} 个平台。`)
        : (d.fallbackCount ? note("warn", `本次有 ${d.fallbackCount} 个平台实时源不可用，已自动回退到最近成功快照。`) : "");
      $("#out").innerHTML =
        modeNote +
        (bad.length ? note("warn", `以下平台本次降级/缺失：${bad.map((b) => `${b.platform}（${b.note || b.dataQuality}）`).join("；")}`) : "") +
        ((d.results || []).length ? (d.results || []).map(platformCard).join("") : empty("暂无成功快照；点击“实时刷新”获取当前数据"));
    } catch (e) {
      $("#out").innerHTML = note("err", esc(e.message));
    }
  };
  $("#btn-go").addEventListener("click", () => run("live"));
  run("snapshot");
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
          <div class="sub">${esc(d.scoreNote || "")}</div></div></div></div>` +
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
