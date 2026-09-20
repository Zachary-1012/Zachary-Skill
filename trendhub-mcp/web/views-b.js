VIEWS.discover = async function (content) {
  content.innerHTML = `
    <div class="discover-page">
      <section class="discover-section">
        <div class="discover-section-head">
          <h2>正在聚集</h2>
          <span>多个平台同时出现的话题</span>
        </div>
        <div id="discoverClusters">${loading("正在整理跨平台变化…")}</div>
      </section>

      <section class="discover-section">
        <div class="discover-section-head">
          <h2>刚刚出现</h2>
          <span>相对上一轮采集的新变化</span>
        </div>
        <div id="discoverChanges">${loading("正在读取最近变化…")}</div>
      </section>
    </div>`;

  const labelFor = (platform) => {
    const row = (META?.platforms || []).find((item) => item.platform === platform);
    return row?.label || platform;
  };

  const changesTask = api("/api/changes")
    .then((data) => {
      const rows = [];
      for (const group of (data.withHistory || [])) {
        for (const item of (group.newTopics || []).slice(0, 3)) {
          rows.push({ ...item, label: labelFor(group.platform) });
          if (rows.length >= 12) break;
        }
        if (rows.length >= 12) break;
      }
      const box = $("#discoverChanges", content);
      if (!box) return;
      box.innerHTML = rows.length
        ? rows.map((row) => `
            <div class="discovery-item">
              <button type="button" class="discovery-topic" data-keyword="${esc(row.title)}">${esc(row.title)}</button>
              <span class="discovery-meta">${esc(row.label)}${row.currentRank ? ` · #${esc(row.currentRank)}` : ""}</span>
            </div>`).join("")
        : homeEmpty("还没有足够的历史快照用于比较");
      box.querySelectorAll("[data-keyword]").forEach((button) => {
        button.addEventListener("click", () => startResearch(button.dataset.keyword));
      });
    })
    .catch(() => {
      const box = $("#discoverChanges", content);
      if (box) box.innerHTML = homeEmpty("最近变化暂时不可用");
    });

  const clusterTask = api("/api/clusters?min_platforms=2&limit=16")
    .then((data) => {
      const box = $("#discoverClusters", content);
      if (!box) return;
      const clusters = data.clusters || [];
      box.innerHTML = clusters.length
        ? clusters.map((cluster) => `
            <div class="discovery-cluster">
              <button type="button" class="discovery-topic" data-keyword="${esc(cluster.topic)}">${esc(cluster.topic)}</button>
              <div class="discovery-meta">${esc(cluster.platformCount)} 个平台同时出现 · 共振 ${esc(cluster.resonanceScore)}</div>
              <div class="discovery-platforms">${(cluster.members || []).slice(0, 4).map((member) => esc(member.label || member.platform)).join(" · ")}</div>
            </div>`).join("")
        : homeEmpty("当前没有检测到跨平台同时出现的话题");
      box.querySelectorAll("[data-keyword]").forEach((button) => {
        button.addEventListener("click", () => startResearch(button.dataset.keyword));
      });
    })
    .catch(() => {
      const box = $("#discoverClusters", content);
      if (box) box.innerHTML = homeEmpty("跨平台聚合暂时不可用");
    });

  await Promise.allSettled([changesTask, clusterTask]);
};

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
    <p class="lead">输入品牌、Campaign、行业议题、受众话题或平台标签，查看它在社媒、视频、新闻、科技与社区信号中的跨平台共振。不同平台指标不直接相加，结果同时保留命中证据。</p>
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
    <p class="lead">话题雷达：自动从当前多平台内容中发现跨平台共振议题，并把同义标题、平台标签和证据聚合为可用于营销判断的主题簇。支持不输入关键词的全网发现，也支持品牌、Campaign、行业或标签筛选。</p>
    <div class="controls">
      <input class="input" id="f-topic" placeholder="可选：品牌 / Campaign / 行业话题 / #标签" />
      <label class="field">至少在 N 个平台出现<select id="f-min">
        ${[2, 3, 4, 5].map((n) => `<option value="${n}">${n}</option>`).join("")}</select></label>
      <button class="btn primary" id="btn-go">发现共振话题</button>
    </div><div id="out">${empty("点击按钮开始（需拉取多个平台，可能耗时数十秒）")}</div>`;
  $("#btn-go").addEventListener("click", async () => {
    $("#out").innerHTML = loading();
    try {
      const topic = $("#f-topic").value.trim();
      const qs = new URLSearchParams({ min_platforms: $("#f-min").value, limit: "30" });
      if (topic) qs.set("topic", topic);
      const d = await api(`/api/clusters?${qs}`);
      const clusters = d.clusters || [];
      const cloudTerms = clusters.slice(0, 24).map((c) => ({ text: c.topic, weight: Math.max(1, c.platformCount + Math.round(c.resonanceScore / 40)), platforms: c.platformCount }));
      $("#out").innerHTML =
        note("info", esc(d.note || "")) +
        (clusters.length ? `<div class="topic-radar card"><div class="topic-radar-head"><h2>实时话题词组图</h2><span class="badge ok">${topic ? "筛选结果" : "实时快照"}</span></div><div class="topic-cloud">${cloudTerms.map((x) => `<span class="topic-word" style="--topic-weight:${Math.min(2.1, 0.85 + x.weight / 5)}" title="${esc(x.platforms)} 个平台共振">${esc(x.text)}</span>`).join("")}</div><p class="sub">词组大小按跨平台出现与共振分展示，不代表绝对热度；下方每个主题都附平台证据与营销解释。</p></div>` : "") +
        (clusters.length
          ? clusters.map(
              (c) => `<div class="cluster" style="margin-bottom:12px">
                <div class="topic">${esc(c.topic)}</div>
                <div class="tagrow" style="margin:6px 0">
                  <span class="badge accent">${c.platformCount} 平台共振</span>
                  <span class="badge neutral">共振分 ${c.resonanceScore}</span>
                  ${(c.platforms || []).map((p) => `<span class="tag">${esc(p)}</span>`).join("")}
                </div>
                <div class="topic-explanation"><strong>营销解释</strong><span>跨 ${c.platformCount} 个平台出现，建议结合品牌关联、受众语境、内容形式和传播阶段继续复核。</span></div>
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
