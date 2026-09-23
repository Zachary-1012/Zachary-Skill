VIEWS.brief = async function (content, params) {
  await ensureMeta();
  const tplOpts = ['<option value="">自动匹配平台模板</option>']
    .concat((await api("/api/templates")).templates.map((t) => `<option value="${esc(t.id)}" ${params.template_id === t.id ? "selected" : ""}>${esc(t.name)}</option>`)).join("");
  const platOpts = ['<option value="xiaohongshu" selected>小红书（默认 · 主打）</option>', '<option value="all">通用 all</option>']
    .concat(PLATFORMS.filter((p) => p.platform !== "xiaohongshu").map((p) => `<option value="${esc(p.platform)}">${esc(p.label)}</option>`)).join("");
  content.innerHTML = `
    <p class="lead">围绕主题聚合真实热点证据、相关词、同平台样本与专家模板。TrendHub 2.0 会在内容工作台调用使用者的 AI，并保留可编辑成稿。</p>
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
  const connections = window.TrendHubConnections;
  const prefs = connections?.getPreferences?.() || { mode: "auto", provider: "openai-compatible", endpoint: "http://127.0.0.1:11434/v1", model: "" };
  let runtimeStatus = null;
  if (!window.TRENHUB_IS_REMOTE && connections) {
    try { runtimeStatus = await connections.status(); } catch { /* 本地服务暂不可用时继续渲染设置。 */ }
  }
  const aiConnected = Boolean(runtimeStatus?.ai?.configured);
  let jevConnected = Boolean(runtimeStatus?.jev?.configured);
  if (window.TRENHUB_IS_REMOTE) {
    try { jevConnected = Boolean((await fetch("/api/jev/status").then((response) => response.json())).configured); }
    catch { jevConnected = false; }
  }
  const xhsConnected = Boolean(runtimeStatus?.xhs?.configured);
  content.innerHTML = `
    <div class="settings-page">
      <header class="settings-heading"><div><span class="panel-kicker">Connections</span><h1>模型与数据连接</h1><p>把自己的 AI 和平台会话接入内容工作台。密钥与 Cookie 只驻留本机 TrendHub 进程，关闭进程即清除。</p></div><span class="runtime-chip ${window.TRENHUB_IS_REMOTE ? "remote" : "local"}">${window.TRENHUB_IS_REMOTE ? "公网只读边界" : "本地私有运行时"}</span></header>

      <section class="settings-section connection-section">
        <div class="settings-section-head"><div><h2>创作 AI</h2><p>这些都是可选通道：未填写时继续使用宿主 AI；填写任一通道后自动连接到内容工作台。</p></div><span class="connection-state ${aiConnected ? "connected" : ""}">${aiConnected ? "已连接" : "可选"}</span></div>
        <div class="provider-switch" role="radiogroup" aria-label="AI 提供方">
          <button type="button" data-provider="deepseek" class="${prefs.provider === "deepseek" ? "active" : ""}"><strong>DeepSeek</strong><span>官方 Chat Completions</span></button>
          <button type="button" data-provider="zhipu" class="${prefs.provider === "zhipu" ? "active" : ""}"><strong>智谱 BigModel</strong><span>官方开放平台</span></button>
          <button type="button" data-provider="openai-compatible" class="${prefs.provider === "openai-compatible" ? "active" : ""}"><strong>本地开放模型</strong><span>OpenAI-compatible</span></button>
        </div>
        <form class="connection-form" id="aiConnectionForm">
          <input type="hidden" id="settingsAiProvider" value="${esc(prefs.provider)}">
          <label><span>模型名称</span><input id="settingsAiModel" value="${esc(prefs.model)}" placeholder="填写提供方当前可用模型"></label>
          <label><span>API 端点</span><input id="settingsAiEndpoint" value="${esc(prefs.endpoint)}" placeholder="本地端点只允许 localhost / 127.0.0.1"></label>
          <label class="wide"><span>API Key</span><input id="settingsAiKey" type="password" autocomplete="new-password" placeholder="不写入浏览器、项目或磁盘"></label>
          <div class="connection-actions wide"><button class="maple-button" id="saveAiConnection" type="submit" ${window.TRENHUB_IS_REMOTE ? "disabled" : ""}>保存并自动连接</button><button class="quiet-button" id="clearAiConnection" type="button" ${!aiConnected ? "disabled" : ""}>断开</button><span id="aiConnectionMessage">${window.TRENHUB_IS_REMOTE ? "公网托管页不接收私人密钥，请运行本地 TrendHub。" : "不填写不影响其他能力；填写后自动用于内容创作。"}</span></div>
        </form>
      </section>

      <section class="settings-section connection-section">
        <div class="settings-section-head"><div><h2>Jev 来源复核</h2><p>TrendHub 统一提供 TypeSafe Jev 1.13，使用者无需密钥。只在主动点击来源复核时发送研究主题和最多 8 条公开标题；不会发送 Cookie、草稿或来源 URL。</p></div><span class="connection-state ${jevConnected ? "connected" : ""}">${jevConnected ? "平台已配置" : "平台暂未启用"}</span></div>
        <p>Jev 只判断标题与主题是否直接相关；不生成文案、不验证正文事实，也不会自动修改研究结论。中文判断仍需人工复核。</p>
      </section>

      <section class="settings-section connection-section">
        <div class="settings-section-head"><div><h2>小红书会话增强</h2><p>不填写也可使用公开游客数据；填写后启用当前账号可访问的搜索与热榜能力。</p></div><span class="connection-state ${xhsConnected ? "connected" : ""}">${xhsConnected ? "已连接" : "游客模式"}</span></div>
        <form class="cookie-form" id="xhsConnectionForm"><label><span>Cookie</span><textarea id="settingsXhsCookie" rows="3" autocomplete="off" placeholder="必须包含 a1 与 web_session；仅驻留本地进程内存"></textarea></label><div class="connection-actions"><button class="maple-button" type="submit" ${window.TRENHUB_IS_REMOTE ? "disabled" : ""}>连接会话</button><button class="quiet-button" id="clearXhsConnection" type="button" ${!xhsConnected ? "disabled" : ""}>清除</button><span id="xhsConnectionMessage">${window.TRENHUB_IS_REMOTE ? "公网托管端不接收私人 Cookie。" : "不会写入项目数据、浏览器存储、日志或快照。"}</span></div></form>
      </section>

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

  const providerInput = $("#settingsAiProvider", content);
  const endpointInput = $("#settingsAiEndpoint", content);
  const modelInput = $("#settingsAiModel", content);
  content.querySelectorAll("[data-provider]").forEach((button) => button.addEventListener("click", () => {
    content.querySelectorAll("[data-provider]").forEach((item) => item.classList.toggle("active", item === button));
    providerInput.value = button.dataset.provider;
    const preset = connections?.presets?.[button.dataset.provider];
    endpointInput.value = preset?.endpoint || "";
    modelInput.value = preset?.model || "";
  }));

  $("#aiConnectionForm", content)?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#saveAiConnection", content);
    const message = $("#aiConnectionMessage", content);
    button.disabled = true;
    button.textContent = "正在连接…";
    try {
      const value = { provider: providerInput.value, endpoint: endpointInput.value.trim(), model: modelInput.value.trim(), apiKey: $("#settingsAiKey", content).value };
      await connections.saveAi(value);
      connections.savePreferences({ mode: "connected", provider: value.provider, endpoint: value.endpoint, model: value.model });
      message.textContent = "连接成功，内容工作台已切换到此模型。";
      toast("AI 连接成功");
      setTimeout(() => VIEWS.settings(content), 450);
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
      button.textContent = "保存并自动连接";
    }
  });

  $("#clearAiConnection", content)?.addEventListener("click", async () => {
    await connections.clearAi();
    connections.savePreferences({ ...connections.getPreferences(), mode: "auto", model: "" });
    toast("AI 私有连接已清除");
    VIEWS.settings(content);
  });

  $("#xhsConnectionForm", content)?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("#xhsConnectionMessage", content);
    try {
      await connections.saveXhs($("#settingsXhsCookie", content).value);
      $("#settingsXhsCookie", content).value = "";
      message.textContent = "会话已连接，仅在本地进程内生效。";
      toast("小红书会话已连接");
      setTimeout(() => VIEWS.settings(content), 450);
    } catch (error) {
      message.textContent = error.message;
    }
  });

  $("#clearXhsConnection", content)?.addEventListener("click", async () => {
    await connections.clearXhs();
    toast("小红书会话已清除，已回到游客模式");
    VIEWS.settings(content);
  });

  try {
    const health = await api("/api/health");
    const version = $("#settingsVersion", content);
    if (version) version.textContent = `TrendHub ${health.version || ""} · ${health.platformCount ?? "—"} 个运行来源`;
  } catch {
    /* 设置页不因健康信息暂时不可用而阻断。 */
  }
};
