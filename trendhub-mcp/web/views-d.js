VIEWS.brief = async function (content, params) {
  await ensureMeta();
  const tplOpts = ['<option value="">自动匹配平台模板</option>']
    .concat((await api("/api/templates")).templates.map((t) => `<option value="${esc(t.id)}" ${params.template_id === t.id ? "selected" : ""}>${esc(t.name)}</option>`)).join("");
  const platOpts = ['<option value="xiaohongshu" selected>小红书（默认 · 主打）</option>', '<option value="all">通用 all</option>']
    .concat(PLATFORMS.filter((p) => p.platform !== "xiaohongshu").map((p) => `<option value="${esc(p.platform)}">${esc(p.label)}</option>`)).join("");
  content.innerHTML = `
    <p class="lead">围绕主题聚合真实热点证据、相关词、情感、同平台爆款样本与专家模板，产出逐格填充指引和可直接交给 AI 的写作提示词。<strong>本页不接模型、不代替你写成稿</strong>。</p>
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
    <h3>交给 AI 的写作提示词</h3>
    <div class="toolbar" style="margin-bottom:8px">
      <button class="btn sm primary" id="cp-prompt">复制提示词</button>
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
    if (cp1) cp1.addEventListener("click", () => copyText(d.productionPrompt || "", "写作提示词已复制，粘贴给你的 AI 即可成稿"));
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
  content.innerHTML = `
    <div class="settings-page">
      <section class="settings-section">
        <h2>研究设置</h2>
        <a class="settings-row" href="#/sources">
          <div><strong>数据源</strong><p>查看当前可用、需要授权和暂不可用的数据来源</p></div><span>›</span>
        </a>
        <a class="settings-row" href="#/workspace">
          <div><strong>关注与协作</strong><p>本地工作区、关注对象和已存研究</p></div><span>›</span>
        </a>
      </section>

      <section class="settings-section">
        <h2>高级功能</h2>
        <details class="settings-details">
          <summary>查看高级分析入口</summary>
          <div class="settings-links">
            <a href="#/xhs">小红书公开数据</a>
            <a href="#/trending">平台热点榜</a>
            <a href="#/curve">趋势曲线</a>
            <a href="#/related">相关搜索</a>
            <a href="#/events">节点日历</a>
            <a href="#/topic">话题深度分析</a>
            <a href="#/templates">创作模板</a>
          </div>
        </details>
        <p class="settings-note">这些能力仍然存在，但不会占据主导航。正常研究会在需要时自动使用对应数据。</p>
      </section>

      <section class="settings-section">
        <h2>运行与隐私</h2>
        <a class="settings-row" href="#/ops">
          <div><strong>运行状态</strong><p>查看本机/托管运行状态和交付信息</p></div><span>›</span>
        </a>
        <details class="settings-details" id="localConfig">
          <summary>本地配置</summary>
          <div class="settings-config">
            <div><code>XHS_COOKIE</code><span>可选，仅用于你自己的本地小红书登录增强；公网托管端不接收私人 Cookie。</span></div>
            <div><code>TRENTHUB_DATA_DIR</code><span>本地快照与历史数据目录。</span></div>
            <div><code>TRENTHUB_HTTP_TOKEN</code><span>非本机回环监听时使用的访问令牌。</span></div>
          </div>
        </details>
      </section>

      <section class="settings-about">
        <div id="settingsVersion">TrendHub</div>
        <p>公开来源可能因平台限制出现缺失、限流或暂不可用。TrendHub 会标注这些状态，不把缺失解释为 0。</p>
      </section>
    </div>`;

  try {
    const health = await api("/api/health");
    const version = $("#settingsVersion", content);
    if (version) version.textContent = `TrendHub ${health.version || ""} · ${health.platformCount ?? "—"} 个运行来源`;
  } catch {
    /* 设置页不因健康信息暂时不可用而阻断。 */
  }
};
