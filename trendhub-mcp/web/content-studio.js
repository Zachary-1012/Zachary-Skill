"use strict";

/* TrendHub 2.0 content workspace. Projects stay in this browser. Credentials
 * are sent only to the local TrendHub runtime and remain in process memory. */
(function () {
  const PROJECT_KEY = "content-projects-v2";
  const MODEL_KEY = "model-settings-v2";
  const STAGES = ["brief", "create", "review", "ready", "published", "evaluated"];
  const STAGE_LABEL = { brief: "简报", create: "创作", review: "审核", ready: "待发布", published: "已发布", evaluated: "已复盘" };
  const FORMAT_LABEL = {
    xiaohongshu: "小红书图文", short_video: "短视频脚本", article: "深度文章",
    social: "社交短帖", campaign: "内容矩阵", newsletter: "Newsletter",
  };
  const CREATION_PRESETS = {
    xiaohongshu: { label: "小红书", platform: "xiaohongshu", format: "xiaohongshu", seed: "创作一篇小红书内容" },
    douyin: { label: "抖音", platform: "douyin", format: "short_video", seed: "创作一条抖音短视频脚本" },
    wechat: { label: "公众号", platform: "wechat", format: "article", seed: "创作一篇微信公众号文章" },
    weibo: { label: "微博", platform: "weibo", format: "social", seed: "创作一条微博内容" },
    short_video: { label: "短视频", platform: "all", format: "short_video", seed: "创作一个短视频脚本" },
    article: { label: "深度文章", platform: "all", format: "article", seed: "创作一篇深度文章" },
  };

  const now = () => new Date().toISOString();
  const uid = () => `thp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const clean = (value) => String(value ?? "").trim();
  const PROVIDER_DEFAULTS = {
    deepseek: { endpoint: "https://api.deepseek.com", model: "deepseek-v4-flash" },
    zhipu: { endpoint: "https://open.bigmodel.cn/api/paas/v4", model: "" },
    "openai-compatible": { endpoint: "http://127.0.0.1:11434/v1", model: "" },
  };

  function inferCreationRequest(input, preferred = "auto") {
    const request = clean(input);
    const rules = [
      [/小红书|种草|笔记/, "xiaohongshu"],
      [/抖音/, "douyin"],
      [/公众号|微信文章|微信推文/, "wechat"],
      [/微博/, "weibo"],
      [/短视频|视频脚本|分镜|口播/, "short_video"],
      [/深度文章|长文|行业报告|白皮书/, "article"],
    ];
    const detected = rules.find(([pattern]) => pattern.test(request))?.[1];
    const key = detected || (preferred !== "auto" ? preferred : "article");
    const preset = CREATION_PRESETS[key] || CREATION_PRESETS.article;
    const goal = /带货|成交|转化|销售|购买/.test(request) ? "促进可信转化" :
      /涨粉|关注|互动/.test(request) ? "提升目标受众关注与互动" :
      /发布会|新品|上市/.test(request) ? "清晰传达新品价值" : "建立可信影响力";
    const audienceMatch = request.match(/(?:面向|写给|给)([^，。；,.]{2,24})(?:的|看|创作|写)/);
    return {
      request,
      title: request.slice(0, 42) || preset.seed,
      topic: request || preset.seed,
      goal,
      audience: audienceMatch?.[1]?.trim() || "由创作请求自动判断",
      platform: preset.platform,
      format: preset.format,
      tone: /活泼|轻松|幽默/.test(request) ? "自然、鲜活、有证据" : "克制、清晰、有证据",
    };
  }

  function projects() {
    return TH_STORE.get(PROJECT_KEY, []).filter((item) => item && item.id);
  }
  function saveProjects(list) {
    TH_STORE.set(PROJECT_KEY, list.slice(0, 80));
    renderSidebarProjects();
  }
  function getProject(id) { return projects().find((item) => item.id === id); }
  function makeProject(seed = {}) {
    const stamp = now();
    return {
      id: uid(), title: seed.title || "未命名创作", request: seed.request || seed.topic || "", topic: seed.topic || "", goal: seed.goal || "建立可信影响力",
      audience: seed.audience || "", platform: seed.platform || "xiaohongshu", format: seed.format || "xiaohongshu",
      tone: seed.tone || "克制、清晰、有证据", language: "zh-CN", stage: "brief", draft: "", brief: null,
      evidenceState: "not_collected", evidenceUpdatedAt: null, scheduleAt: "", publishedUrl: "", metrics: {},
      ai: { state: "idle", provider: "", model: "", lastRunAt: null }, createdAt: stamp, updatedAt: stamp,
    };
  }
  function putProject(project) {
    project.updatedAt = now();
    const list = projects();
    const index = list.findIndex((item) => item.id === project.id);
    if (index >= 0) list.splice(index, 1);
    list.unshift(project);
    saveProjects(list);
    persistHostState(project);
    return project;
  }
  function ensureProject(id, seed = {}) {
    const existing = id && getProject(id);
    if (existing) return existing;
    const project = makeProject(seed);
    putProject(project);
    return project;
  }
  function modelSettings() {
    return TH_STORE.get(MODEL_KEY, {
      mode: "auto", provider: "openai-compatible",
      endpoint: PROVIDER_DEFAULTS["openai-compatible"].endpoint, model: "",
    });
  }
  function saveModelSettings(value) { TH_STORE.set(MODEL_KEY, value); }
  function hostAI() { return typeof window.openai?.sendFollowUpMessage === "function"; }
  function persistHostState(project) {
    try {
      window.openai?.setWidgetState?.({
        trendhubVersion: "2.0.1", projectId: project.id, title: project.title, stage: project.stage,
        topic: project.topic, platform: project.platform, format: project.format,
        evidenceState: project.evidenceState, updatedAt: project.updatedAt,
      });
    } catch { /* optional host capability */ }
  }
  function evidenceSummary(project) {
    const brief = project.brief || {};
    const cross = brief.evidence?.crossPlatform || {};
    const queries = brief.evidence?.relatedQueries || {};
    return {
      crossPlatformMentions: cross.totalMentions ?? null,
      platformsHit: cross.platformsHit ?? null,
      relatedQueries: [...(queries.rising || []), ...(queries.top || [])].slice(0, 10).map((item) => item.query),
      sourceTitles: (brief.referenceTitles || []).flatMap((group) => group.titles || []).slice(0, 12),
      limitations: [cross.note, queries.note].filter(Boolean),
    };
  }
  function productionPrompt(project) {
    const evidence = evidenceSummary(project);
    return `你正在 TrendHub 2.0 内容工作台中协助完成一个真实创作项目。\n\n` +
      `项目：${project.title}\n主题：${project.topic}\n目标：${project.goal}\n受众：${project.audience || "待明确"}\n平台：${project.platform}\n内容格式：${FORMAT_LABEL[project.format] || project.format}\n语气：${project.tone}\n\n` +
      `使用者原始创作要求：${project.request || project.topic}\n\n` +
      `证据摘要：${JSON.stringify(evidence, null, 2)}\n\n` +
      `${project.brief?.productionPrompt || "当前没有已生成的 TrendHub 证据简报；不得虚构数据、热度、案例或来源。"}\n\n` +
      `请直接产出可编辑成稿，不要只给流程。结构为：标题候选、正文/脚本成稿、视觉或镜头建议、事实核验清单、发布前检查。` +
      `事实只能来自以上证据；未知信息用【待核验】标记。保持原创，不复刻参考样本措辞。`;
  }

  async function createBrief(project) {
    if (!clean(project.topic)) throw new Error("先填写创作主题");
    const qs = new URLSearchParams({ topic: project.topic, platform: project.platform || "all" });
    if (clean(project.goal)) qs.set("goal", project.goal);
    if (clean(project.audience)) qs.set("audience", project.audience);
    const brief = await api(`/api/brief?${qs}`);
    project.brief = brief;
    project.evidenceState = "collected";
    project.evidenceUpdatedAt = now();
    project.title = project.title === "未命名创作" ? project.topic : project.title;
    putProject(project);
    return brief;
  }

  async function configuredGenerate(project) {
    const settings = modelSettings();
    if (!clean(settings.model)) throw new Error("请先在设置中连接 AI 并填写模型");
    const payload = await post("/api/connections/ai/generate", { prompt: productionPrompt(project) });
    const output = payload.output;
    if (!clean(output)) throw new Error("AI 返回了空内容");
    project.draft = clean(output);
    project.stage = "create";
    project.ai = {
      state: "completed",
      provider: payload.provider || settings.provider || "user-ai",
      model: payload.model || settings.model,
      lastRunAt: now(),
    };
    putProject(project);
  }

  async function runAI(project) {
    if (!project.brief) await createBrief(project);
    const settings = modelSettings();
    if (settings.mode === "connected" && clean(settings.model)) return configuredGenerate(project);
    if (hostAI() && settings.mode !== "connected") {
      project.stage = "create";
      project.ai = { state: "handed_to_host", provider: "host-ai", model: "current-user-model", lastRunAt: now() };
      putProject(project);
      await window.openai.sendFollowUpMessage({ prompt: productionPrompt(project), scrollToBottom: true });
      return "host";
    }
    if (clean(settings.model)) return configuredGenerate(project);
    throw new Error("当前页面没有宿主 AI。请从 ChatGPT / Codex 中打开 TrendHub；这里不会用假内容代替生成结果");
  }

  function renderSidebarProjects() {
    const box = document.querySelector("#sidebarRecents");
    if (!box) return;
    const list = projects().slice(0, 7);
    box.innerHTML = list.length ? list.map((project) =>
      `<a class="sidebar-recent" href="#/studio?id=${encodeURIComponent(project.id)}" title="${esc(project.title)}">${esc(project.title)}</a>`
    ).join("") : '<span class="sidebar-recent-empty">还没有创作项目</span>';
  }
  window.renderSidebarProjects = renderSidebarProjects;

  function syncForm(project, root) {
    const fields = ["title", "topic", "goal", "audience", "platform", "format", "tone", "scheduleAt", "publishedUrl"];
    fields.forEach((name) => {
      const input = root.querySelector(`[data-field="${name}"]`);
      if (!input) return;
      const save = () => { project[name] = input.value; putProject(project); };
      input.addEventListener(input.tagName === "SELECT" ? "change" : "input", save);
    });
    const draft = root.querySelector("#studioDraft");
    draft?.addEventListener("input", () => { project.draft = draft.value; putProject(project); });
  }

  function stageRail(project) {
    return `<div class="stage-rail" aria-label="内容生产阶段">${STAGES.map((stage, index) => {
      const current = STAGES.indexOf(project.stage);
      const state = index < current ? "done" : index === current ? "active" : "";
      return `<button type="button" class="stage-step ${state}" data-stage="${stage}"><span>${index + 1}</span>${STAGE_LABEL[stage]}</button>`;
    }).join("")}</div>`;
  }

  function briefPanel(project) {
    const summary = evidenceSummary(project);
    const state = project.evidenceState === "collected" ? "已收集" : "尚未收集";
    return `<section class="paper-panel evidence-panel">
      <div class="panel-kicker">Evidence</div><h2>证据与约束</h2>
      <div class="evidence-state ${project.evidenceState}"><i></i><strong>${state}</strong><span>${project.evidenceUpdatedAt ? fmtTime(project.evidenceUpdatedAt) : "生成简报后更新"}</span></div>
      <dl class="evidence-counts"><div><dt>平台命中</dt><dd>${summary.platformsHit ?? "—"}</dd></div><div><dt>公开提及</dt><dd>${summary.crossPlatformMentions ?? "—"}</dd></div></dl>
      ${summary.relatedQueries.length ? `<div class="signal-list"><b>关联语义</b>${summary.relatedQueries.map((item) => `<span>${esc(item)}</span>`).join("")}</div>` : ""}
      ${summary.limitations.length ? `<div class="truth-note">${summary.limitations.map(esc).join("<br>")}</div>` : '<div class="truth-note">未知事实必须保留【待核验】，AI 输出不是证据。</div>'}
      <button class="quiet-button" id="refreshBrief" type="button">${project.brief ? "刷新证据简报" : "生成证据简报"}</button>
      ${project.brief ? '<button class="text-button" id="inspectBrief" type="button">查看完整简报</button>' : ""}
    </section>`;
  }

  function aiPanel(project) {
    const settings = modelSettings();
    const connected = hostAI() || clean(settings.model);
    const label = hostAI() && settings.mode !== "connected" ? "当前宿主 AI" : clean(settings.model) ? settings.model : "未连接";
    return `<section class="paper-panel ai-panel">
      <div class="panel-kicker">Your AI</div><h2>创作引擎</h2>
      <div class="ai-presence"><i class="${connected ? "online" : ""}"></i><div><strong>${esc(label)}</strong><span>${hostAI() && settings.mode !== "connected" ? "使用者当前会话模型" : clean(settings.model) ? "使用者配置的私有连接" : "不提供假输出"}</span></div></div>
      <button class="maple-button full" id="runAI" type="button">让我的 AI 创作</button>
      <button class="text-button" id="openAISettings" type="button">模型与连接设置</button>
      <p class="microcopy">开放模型按许可、能力、中文质量和硬件适配动态选择；TrendHub 不保存密钥。</p>
    </section>`;
  }

  function modelDialog() {
    const settings = modelSettings();
    return `<dialog class="model-dialog" id="modelDialog"><form method="dialog">
      <div class="dialog-head"><div><span class="panel-kicker">AI Connection</span><h2>使用你的 AI</h2></div><button class="icon-close" value="cancel" aria-label="关闭">×</button></div>
      <label>提供方<select id="aiProvider"><option value="deepseek" ${settings.provider === "deepseek" ? "selected" : ""}>DeepSeek API</option><option value="zhipu" ${settings.provider === "zhipu" ? "selected" : ""}>智谱 BigModel API</option><option value="openai-compatible" ${settings.provider === "openai-compatible" ? "selected" : ""}>本地 / OpenAI-compatible</option></select></label>
      <label>端点<input id="aiEndpoint" value="${esc(settings.endpoint)}" placeholder="本地连接只允许 127.0.0.1 / localhost"></label>
      <label>模型<input id="aiModel" value="${esc(settings.model)}" placeholder="填写提供方可用的模型名称"></label>
      <label>API Key<input id="aiToken" type="password" autocomplete="new-password" placeholder="仅驻留本地 TrendHub 进程内存"></label>
      <div class="license-note">优先 Apache-2.0 等明确支持商业使用的开放权重模型。实际模型许可证仍以对应版本的官方模型卡为准。</div>
      <div class="dialog-actions"><button class="quiet-button" value="cancel">取消</button><button class="maple-button" id="saveAISettings" value="default">保存连接</button></div>
    </form></dialog>`;
  }

  VIEWS.studio = async function (root, params) {
    const seed = inferCreationRequest(params.prompt || "", params.platform || "auto");
    const project = ensureProject(params.id, params.prompt || params.platform ? seed : {});
    root.innerHTML = `<div class="studio-shell">
      <header class="studio-heading"><div><span class="eyebrow">Content Studio · Local-first</span><input class="title-input" data-field="title" value="${esc(project.title)}" aria-label="项目名称"></div><div class="save-state">自动保存在此浏览器</div></header>
      ${stageRail(project)}
      <div class="studio-grid"><section class="paper-canvas">
        <form class="direct-creator" id="directCreator">
          <label for="creationRequest">告诉 TrendHub 你想创作什么</label>
          <textarea id="creationRequest" rows="3" placeholder="例如：为一家准备出海东南亚的新消费品牌，创作一篇有数据依据的小红书种草笔记">${esc(project.request || project.topic)}</textarea>
          <nav class="creation-platform-bar" aria-label="常用内容平台">
            ${Object.entries(CREATION_PRESETS).map(([id, item]) => `<button type="button" data-studio-platform="${esc(id)}">${esc(item.label)}</button>`).join("")}
          </nav>
          <div class="direct-creator-actions"><span>平台、格式、目标和受众会自动判断</span><button class="maple-button" id="createNow" type="submit">直接创作</button></div>
        </form>
        <details class="creation-advanced"><summary>高级设置（可选）</summary><div class="canvas-fields">
          <label><span>创作主题</span><input data-field="topic" value="${esc(project.topic)}" placeholder="一个真实主题、事件或品牌命题"></label>
          <label><span>内容目标</span><input data-field="goal" value="${esc(project.goal)}"></label>
          <label><span>目标受众</span><input data-field="audience" value="${esc(project.audience)}" placeholder="谁需要看见并采取什么行动"></label>
          <label><span>平台</span><select data-field="platform"><option value="xiaohongshu">小红书</option><option value="douyin">抖音</option><option value="wechat">公众号</option><option value="weibo">微博</option><option value="all">通用</option></select></label>
          <label><span>制品类型</span><select data-field="format">${Object.entries(FORMAT_LABEL).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
          <label><span>语气</span><input data-field="tone" value="${esc(project.tone)}"></label>
        </div></details>
        <div class="editor-head"><div><span class="panel-kicker">Artifact</span><h2>可编辑成稿</h2></div><span>${project.draft.length} 字符</span></div>
        <textarea id="studioDraft" class="artifact-editor" placeholder="点击“让我的 AI 创作”生成真实成稿，或直接在这里写作。">${esc(project.draft)}</textarea>
        <div class="canvas-actions"><button class="quiet-button" id="copyDraft">复制成稿</button><button class="quiet-button" id="advanceStage">提交审核</button><button class="maple-button" id="runAIBottom">让我的 AI 继续</button></div>
      </section><aside class="studio-context">${aiPanel(project)}${briefPanel(project)}
        <section class="paper-panel publish-panel"><div class="panel-kicker">Next</div><h2>发布准备</h2><label>计划时间<input type="datetime-local" data-field="scheduleAt" value="${esc(project.scheduleAt)}"></label><label>发布链接<input data-field="publishedUrl" value="${esc(project.publishedUrl)}" placeholder="发布后补充，未发布留空"></label></section>
      </aside></div>${modelDialog()}<dialog id="briefDialog" class="brief-dialog"><div class="dialog-head"><h2>完整证据简报</h2><button class="icon-close" aria-label="关闭">×</button></div><pre>${esc(JSON.stringify(project.brief || {}, null, 2))}</pre></dialog>
    </div>`;
    root.querySelector('[data-field="platform"]').value = project.platform;
    root.querySelector('[data-field="format"]').value = project.format;
    syncForm(project, root);
    root.querySelectorAll("[data-stage]").forEach((button) => button.addEventListener("click", () => { project.stage = button.dataset.stage; putProject(project); VIEWS.studio(root, { id: project.id }); }));
    root.querySelector("#refreshBrief")?.addEventListener("click", async (event) => { event.currentTarget.disabled = true; event.currentTarget.textContent = "正在收集公开证据…"; try { await createBrief(project); toast("证据简报已更新"); VIEWS.studio(root, { id: project.id }); } catch (error) { toast(error.message); event.currentTarget.disabled = false; } });
    const run = async (button) => { button.disabled = true; button.textContent = "正在研究并创作…"; try { const mode = await runAI(project); if (mode === "host") toast("已由当前 AI 开始创作"); else { toast("成稿已回填"); VIEWS.studio(root, { id: project.id }); } } catch (error) { toast(error.message); button.disabled = false; button.textContent = button.id === "createNow" ? "直接创作" : "让我的 AI 创作"; } };
    root.querySelector("#directCreator")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const request = clean(root.querySelector("#creationRequest").value);
      if (!request) return toast("直接说出你想创作什么");
      Object.assign(project, inferCreationRequest(request, "auto"), { brief: null, evidenceState: "not_collected" });
      putProject(project);
      await run(root.querySelector("#createNow"));
    });
    root.querySelectorAll("[data-studio-platform]").forEach((button) => button.addEventListener("click", () => {
      const preset = CREATION_PRESETS[button.dataset.studioPlatform];
      const input = root.querySelector("#creationRequest");
      if (!clean(input.value)) input.value = preset.seed;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }));
    root.querySelector("#runAI")?.addEventListener("click", (event) => run(event.currentTarget));
    root.querySelector("#runAIBottom")?.addEventListener("click", (event) => run(event.currentTarget));
    root.querySelector("#copyDraft")?.addEventListener("click", () => copyText(project.draft, "成稿已复制"));
    root.querySelector("#advanceStage")?.addEventListener("click", () => { if (!clean(project.draft)) return toast("成稿为空，不能提交审核"); project.stage = "review"; putProject(project); VIEWS.studio(root, { id: project.id }); });
    root.querySelector("#inspectBrief")?.addEventListener("click", () => root.querySelector("#briefDialog")?.showModal());
    root.querySelector("#briefDialog .icon-close")?.addEventListener("click", () => root.querySelector("#briefDialog")?.close());
    root.querySelector("#openAISettings")?.addEventListener("click", () => root.querySelector("#modelDialog")?.showModal());
    const providerSelect = root.querySelector("#aiProvider");
    providerSelect?.addEventListener("change", () => {
      const preset = PROVIDER_DEFAULTS[providerSelect.value];
      root.querySelector("#aiEndpoint").value = preset?.endpoint || "";
      if (!clean(root.querySelector("#aiModel").value)) root.querySelector("#aiModel").value = preset?.model || "";
    });
    root.querySelector("#saveAISettings")?.addEventListener("click", async (event) => {
      event.preventDefault();
      const value = {
        mode: "connected",
        provider: providerSelect.value,
        endpoint: clean(root.querySelector("#aiEndpoint").value),
        model: clean(root.querySelector("#aiModel").value),
      };
      try {
        if (window.TRENHUB_IS_REMOTE) throw new Error("公网托管页不接收私人密钥，请在本地 TrendHub 中连接");
        await post("/api/connections/ai", { ...value, apiKey: root.querySelector("#aiToken").value });
        saveModelSettings(value);
        root.querySelector("#modelDialog").close();
        toast("已保存并自动连接；未配置时仍使用宿主 AI");
        VIEWS.studio(root, { id: project.id });
      } catch (error) {
        toast(error.message);
      }
    });
  };

  VIEWS.library = function (root) {
    const list = projects();
    root.innerHTML = `<div class="collection-heading"><div><span class="eyebrow">Content Library</span><h1>内容资产</h1><p>项目、成稿、证据与下一步保存在同一条生产线上。</p></div><button class="maple-button" id="libraryNew">新建创作</button></div>
      <div class="library-table">${list.length ? list.map((project) => `<a class="library-row" href="#/studio?id=${encodeURIComponent(project.id)}"><div><strong>${esc(project.title)}</strong><span>${esc(FORMAT_LABEL[project.format] || project.format)} · ${fmtTime(project.updatedAt)}</span></div><span class="stage-pill ${project.stage}">${STAGE_LABEL[project.stage] || project.stage}</span><span class="row-next">${project.draft ? `${project.draft.length} 字符` : "等待成稿"}</span></a>`).join("") : '<div class="collection-empty">还没有内容项目。新建后，证据、AI 成稿和审核状态会持续保留。</div>'}</div>`;
    root.querySelector("#libraryNew")?.addEventListener("click", () => { const project = makeProject(); putProject(project); location.hash = `#/studio?id=${project.id}`; });
  };

  VIEWS.calendar = function (root) {
    const scheduled = projects().filter((project) => project.scheduleAt).sort((a, b) => a.scheduleAt.localeCompare(b.scheduleAt));
    root.innerHTML = `<div class="collection-heading"><div><span class="eyebrow">Publishing Plan</span><h1>发布计划</h1><p>只显示使用者明确安排的日期；没有排期不等于零。</p></div></div><div class="schedule-list">${scheduled.length ? scheduled.map((project) => `<a href="#/studio?id=${project.id}" class="schedule-row"><time>${fmtDate(project.scheduleAt)}<small>${new Date(project.scheduleAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}</small></time><div><strong>${esc(project.title)}</strong><span>${esc(FORMAT_LABEL[project.format] || project.format)} · ${STAGE_LABEL[project.stage]}</span></div></a>`).join("") : '<div class="collection-empty">暂无已确认排期。请在创作项目右侧填写计划时间。</div>'}</div>`;
  };

  window.createTrendHubProject = function () {
    const project = makeProject(); putProject(project); location.hash = `#/studio?id=${project.id}`;
  };
  window.startTrendHubCreation = function (prompt = "", platform = "auto") {
    const seed = inferCreationRequest(prompt || CREATION_PRESETS[platform]?.seed || "", platform);
    const project = makeProject(seed);
    putProject(project);
    location.hash = `#/studio?id=${encodeURIComponent(project.id)}`;
  };
  window.TrendHubCreationPresets = CREATION_PRESETS;
  window.inferTrendHubCreationRequest = inferCreationRequest;

  window.TrendHubConnections = {
    presets: PROVIDER_DEFAULTS,
    getPreferences: modelSettings,
    savePreferences: saveModelSettings,
    status: () => api("/api/connections/status"),
    saveAi: (value) => post("/api/connections/ai", value),
    clearAi: () => post("/api/connections/ai/clear"),
    saveXhs: (cookie) => post("/api/connections/xhs", { cookie }),
    clearXhs: () => post("/api/connections/xhs/clear"),
  };
})();
