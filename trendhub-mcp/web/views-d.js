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

