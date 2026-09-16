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
    </div>
    <div id="out">${empty("输入关键词后查询")}</div>`;
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
    </div>
    <div id="out">${empty("输入关键词后查询")}</div>`;
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
    </div>
    <div id="out">${loading()}</div>`;
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
    </div>
    <div id="out">${loading()}</div>`;
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
            </div></div></div>`).join("")}</div>`
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
    </div>
    <div id="out">${empty("输入话题后生成")}</div>`;
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
