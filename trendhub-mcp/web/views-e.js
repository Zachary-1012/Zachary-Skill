/* Professional Intelligence v2 views — development branch only. */
"use strict";

TITLES.professional = "专业趋势情报";
TITLES.sources = "信源与品牌宇宙";
TITLES.workspace = "工作区与监测";

function pct(v) { return v == null ? "—" : `${Math.round(Number(v))}`; }
function scoreCard(label, value, sub) {
  return `<div class="stat"><div class="stat-num">${esc(value ?? "—")}</div><div class="stat-label">${esc(label)}</div>${sub ? `<div class="meta">${esc(sub)}</div>` : ""}</div>`;
}
function flagList(title, values, kind) {
  const xs = values || [];
  return `<div class="card"><h2>${esc(title)}</h2>${xs.length ? `<div class="tagrow">${xs.map((x) => `<span class="badge ${kind || "neutral"}">${esc(x)}</span>`).join("")}</div>` : empty("当前没有证据支持的标记")}</div>`;
}
function forecastTable(rows) {
  if (!rows || !rows.length) return empty("历史不足，暂不输出预测");
  return `<div class="table-wrap"><table><thead><tr><th>时间</th><th>信号</th><th>下界</th><th>上界</th><th>变化</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.horizonHours}h</td><td>${esc(r.value)}</td><td>${esc(r.lower)}</td><td>${esc(r.upper)}</td><td>${r.deltaFromNow > 0 ? "+" : ""}${esc(r.deltaFromNow)}</td></tr>`).join("")}</tbody></table></div>`;
}
function researchStrengthLabel(value) {
  return ({ strong: "强", moderate: "中等", limited: "有限", insufficient: "不足" })[value] || value || "—";
}
function visibilityLabel(value) {
  return ({
    "cross-platform-hot": "跨平台热点",
    "single-platform-hot": "单平台热点",
    "active-subject-evidence": "主体讨论活跃",
    "low-observed-visibility": "当前可见度有限",
    undetermined: "无法判断",
  })[value] || value || "—";
}
function researchQualityBadge(value) {
  if (value === "ok") return '<span class="badge ok">可用</span>';
  if (value === "degraded") return '<span class="badge degraded">降级</span>';
  return '<span class="badge missing">缺失</span>';
}
function decisionList(items, emptyText) {
  if (!items || !items.length) return empty(emptyText || "当前没有足够证据");
  return '<div class="interpretation-list">' + items.map((x, index) => {
    const title = x.title || x.action || "—";
    const body = x.reason || "";
    const priority = x.priority ? '<span class="interpretation-priority">' + esc(x.priority) + '</span>' : "";
    return '<div class="interpretation-item"><span class="interpretation-index">' + String(index + 1).padStart(2, "0") + '</span><div>' + priority + '<strong>' + esc(title) + '</strong><p>' + esc(body) + '</p></div></div>';
  }).join("") + '</div>';
}
function gapList(items) {
  if (!items || !items.length) return '<div class="evidence-clear">当前没有关键证据缺口</div>';
  return '<div class="gap-list">' + items.map((x, index) =>
    '<div class="gap-item"><span>' + String(index + 1).padStart(2, "0") + '</span><div><strong>' + esc(x.title) + '</strong><p>' + esc(x.reason) + '</p><div class="next-step">下一步：' + esc(x.nextStep) + '</div></div></div>'
  ).join("") + '</div>';
}
function evidenceRefs(items) {
  if (!items || !items.length) return empty("没有可展示的原始证据");
  return '<div class="evidence-ref-list">' + items.map((x, index) =>
    '<div class="evidence-ref"><span class="evidence-ref-index">' + String(index + 1).padStart(2, "0") + '</span><div><div class="evidence-source">' + esc(x.source || x.channel || "source") + (x.publishedAt ? ' · ' + esc(fmtTime(x.publishedAt)) : "") + '</div><div class="evidence-title">' + linkOrText(x.title, x.url) + '</div></div></div>'
  ).join("") + '</div>';
}
function channelResearchCard(channel, index = 0) {
  return '<article class="evidence-stratum">' +
    '<div class="evidence-stratum-index">' + String(index + 1).padStart(2, "0") + '</div>' +
    '<div class="evidence-stratum-main"><div class="evidence-stratum-head"><div><strong>' + esc(channel.label) + '</strong><span class="channel-family">' + esc(channel.family) + '</span></div><div>' + researchQualityBadge(channel.dataQuality) + '<span class="channel-count">' + esc(channel.itemCount || 0) + ' 条</span></div></div>' +
    '<p class="research-conclusion">' + esc(channel.conclusion || "") + '</p>' +
    '<details class="evidence-details"><summary>沿 Trace 查看原始证据</summary>' + evidenceRefs(channel.evidence || []) + '<div class="evidence-note">' + esc(channel.note || "") + '</div></details></div>' +
  '</article>';
}
function changeSummary(research, core) {
  const s = research?.searchIntent || {};
  if (s.direction === "rising") return '搜索相对热度近期上升' + (s.changePct == null ? '' : '约 ' + s.changePct + '%') + '，需要结合事件与平台证据判断驱动。';
  if (s.direction === "declining") return '搜索相对热度近期下降' + (s.changePct == null ? '' : '约 ' + Math.abs(s.changePct) + '%') + '，不能仅凭曲线判断原因。';
  if (s.direction === "flat") return '搜索关注近期整体平稳，当前变化更应从事件、内容与跨平台证据中判断。';
  if (core?.lifecycle && core.lifecycle !== "insufficient_history") return '历史生命周期为 ' + core.lifecycle + '，但搜索序列不足，当前变化需结合历史轨迹判断。';
  return '历史与搜索序列不足，当前以主动检索到的主体证据为主。';
}

function verticalOptions(selected) {
  const opts = [
    ["", "自动 / 综合"], ["fashion-luxury", "时尚 / 奢侈品"], ["beauty", "美妆"],
    ["business-corporate", "商业 / 公司"], ["technology", "科技"], ["automotive", "汽车"],
    ["finance-markets", "财经 / 市场"], ["marketing-advertising", "营销 / 广告"],
    ["retail-commerce", "零售 / 电商"], ["culture-entertainment", "文化 / 娱乐"],
  ];
  return opts.map(([v, t]) => `<option value="${v}" ${selected === v ? "selected" : ""}>${t}</option>`).join("");
}
function accessClass(mode) {
  if (mode === "zero-config") return "access-zero";
  if (mode === "optional-local-session") return "access-optional";
  if (mode === "planned") return "access-planned";
  return "access-auth";
}
function accessLabel(mode) {
  return ({
    "zero-config": "零配置可用",
    "optional-local-session": "基础免配置 · 可选本地授权增强",
    "user-api-key": "需用户 API Key",
    "user-oauth": "需官方 OAuth",
    "required-local-session": "需本地授权会话",
    "licensed-connector": "需授权数据连接器",
    planned: "适配开发中",
  })[mode] || mode || "—";
}

VIEWS.professional = async function (root, params) {
  const initial = params.keyword || "";
  const initialVertical = params.vertical || "";
  root.innerHTML = `
    <section class="research-entry" aria-labelledby="research-entry-title">
      <div class="field-index">01 · SUBJECT CONTEXT</div>
      <div class="research-entry-copy">
        <h2 id="research-entry-title">从一个真实主体开始，而不是从一堵数据墙开始。</h2>
        <p>品牌、公司、商业体、产品与 Campaign 先进入 Entity-first 取证，再沿同一条 Trace 看变化、原因、证据与行动。</p>
      </div>
      <div class="research-entry-form">
        <label class="subject-input" for="proKeyword">
          <span>Subject</span>
          <input id="proKeyword" value="${esc(initial)}" autocomplete="off" placeholder="例如：广州太古汇 / Louis Vuitton / 小米汽车" />
        </label>
        <button class="query-submit" id="proRun">开始研究 <span aria-hidden="true">→</span></button>
      </div>
      <div class="research-scope-line">
        <label>领域 <select id="proVertical">${verticalOptions(initialVertical)}</select></label>
        <label>地区 <select id="proGeo"><option value="CN" selected>中国</option><option value="HK">香港</option><option value="US">美国</option><option value="">全球</option></select></label>
        <label>时间窗 <select id="proTimeframe"><option value="today 3-m">近3个月</option><option value="today 1-m">近1个月</option><option value="today 12-m">近12个月</option><option value="now 7-d">近7天</option></select></label>
        <details class="scope-advanced"><summary>指定平台</summary><input id="proPlatforms" placeholder="可选：平台 id；留空自动选择" /></details>
      </div>
    </section>
    <div id="proResult">${initial ? loading() : '<div class="research-empty"><span>SUBJECT → TRACE</span><strong>输入主体后开始研究</strong><p>结果会沿“变化 → 原因 → 证据 → 行动”展开，而不是把新闻列表当结论。</p></div>'}</div>`;

  const run = async () => {
    const keyword = $("#proKeyword").value.trim();
    if (!keyword) return toast("请输入研究主体");
    const platforms = $("#proPlatforms").value.trim();
    const vertical = $("#proVertical").value;
    const geo = $("#proGeo").value;
    const timeframe = $("#proTimeframe").value;
    const target = $("#proResult");
    target.innerHTML = loading();
    try {
      const qs = new URLSearchParams({ keyword, geo, timeframe });
      if (platforms) qs.set("platforms", platforms);
      if (vertical) qs.set("verticals", vertical);
      const d = await api(`/api/professional?${qs}`);
      const research = d.research || {};
      const state = research.currentState || {};
      const subject = research.subject || {};
      const core = d.core || {};
      const metrics = core.metrics || {};
      const f = d.forecast || {};
      const audience = d.audience || {};
      const media = d.media || {};
      const architecture = d.sourceArchitecture || {};
      const series = (f.recentSeries || []).map((x) => ({ date: x.at, value: x.value }));
      const change = changeSummary(research, core);
      const entityLabel = subject.resolved ? "已解析实体" : "自定义主体";
      const stateTone = state.evidenceStrength === "strong" || state.evidenceStrength === "moderate" ? "ready" : "limited";
      const upcoming = research.upcomingNodes || [];

      target.innerHTML = `
        <article class="subject-field ${stateTone}" id="subject-field">
          <div class="field-index">02 · SUBJECT FIELD</div>
          <div class="subject-field-grid">
            <div class="subject-field-main">
              <div class="subject-identity"><span>${esc(entityLabel)}</span><span class="truth-chip">${esc(d.evidenceState?.overall || "UNKNOWN")}</span></div>
              <h2>${esc(subject.canonicalName || keyword)}</h2>
              <p class="subject-conclusion">${esc(state.conclusion || "当前证据不足，无法形成主体判断。")}</p>
            </div>
            <aside class="change-axis-summary">
              <span>WHAT CHANGED</span>
              <p>${esc(change)}</p>
            </aside>
          </div>
          <dl class="subject-facts">
            <div><dt>证据强度</dt><dd>${esc(researchStrengthLabel(state.evidenceStrength))}</dd></div>
            <div><dt>可见状态</dt><dd>${esc(visibilityLabel(state.visibility))}</dd></div>
            <div><dt>主体证据</dt><dd>${esc(state.totalEvidenceItems ?? 0)}</dd></div>
            <div><dt>可观测通道</dt><dd>${esc(state.observedChannels ?? 0)}</dd></div>
          </dl>
        </article>

        <nav class="trace-index" aria-label="研究轨迹">
          <a href="#trace-change"><span>01</span>变化</a>
          <a href="#trace-interpret"><span>02</span>原因</a>
          <a href="#trace-evidence"><span>03</span>证据</a>
          <a href="#trace-action"><span>04</span>行动</a>
        </nav>

        <div class="trace-flow">
          <section class="trace-stage" id="trace-change">
            <header class="trace-stage-head"><span class="trace-no">01</span><div><small>CHANGE</small><h2>发生了什么</h2></div></header>
            <div class="trace-stage-body">
              <p class="stage-lead">${esc(change)}</p>
              <dl class="signal-line">
                <div><dt>生命周期</dt><dd>${esc(core.lifecycle || "—")}</dd><small>置信度 ${esc(core.confidence ?? "—")}</small></div>
                <div><dt>速度</dt><dd>${esc(pct(metrics.velocityScore))}</dd><small>0–100</small></div>
                <div><dt>扩散</dt><dd>${esc(pct(metrics.diffusionScore))}</dd><small>0–100</small></div>
                <div><dt>持续性</dt><dd>${esc(pct(metrics.persistenceScore))}</dd><small>0–100</small></div>
                <div><dt>信源可靠度</dt><dd>${esc(pct(metrics.sourceReliabilityScore))}</dd><small>0–100</small></div>
                <div><dt>信号家族</dt><dd>${esc(d.decisionState?.signalFamiliesCovered ?? "—")}</dd><small>跨家族确认</small></div>
              </dl>
              <div class="signal-views">
                <section><div class="subsection-label">历史轨迹</div>${series.length ? lineChart([{ name: keyword, points: series }]) : empty("历史不足，当前以 Query Evidence 为主")}</section>
                <section><div class="subsection-label">6–72h 条件预测</div>${forecastTable(f.forecast)}<p class="sub">预测验证：${esc(f.validation?.grade || "—")} · 不是概率，也不替代证据。</p></section>
              </div>
            </div>
          </section>

          <section class="trace-stage" id="trace-interpret">
            <header class="trace-stage-head"><span class="trace-no">02</span><div><small>INTERPRET</small><h2>为什么值得注意</h2></div></header>
            <div class="trace-stage-body">
              <div class="interpretation-strata">
                <section><span class="stratum-label">DRIVERS</span><h3>驱动因素</h3>${decisionList(research.drivers, "目前没有足够证据识别驱动因素")}</section>
                <section><span class="stratum-label">OPPORTUNITIES</span><h3>机会</h3>${decisionList(research.opportunities, "当前没有证据支持的明确机会")}</section>
                <section><span class="stratum-label">RISKS</span><h3>风险</h3>${decisionList(research.risks, "当前没有证据支持的明确风险")}</section>
              </div>
            </div>
          </section>

          <section class="trace-stage" id="trace-evidence">
            <header class="trace-stage-head"><span class="trace-no">03</span><div><small>EVIDENCE TRACE</small><h2>什么证据支持它</h2></div></header>
            <div class="trace-stage-body">
              <p class="stage-note">每个信号通道先给自己的结论与状态，再允许沿 Trace 打开原始证据。缺失通道保持缺失，不用 0 填平。</p>
              <div class="evidence-stack">${(research.channelAnalysis || []).map((channel, index) => channelResearchCard(channel, index)).join("") || empty("暂无可用信号通道")}</div>
              <div class="evidence-boundary">
                <div class="subsection-label">EVIDENCE GAPS</div>
                <h3>哪里不能下结论</h3>
                ${gapList(research.evidenceGaps)}
              </div>
              <div class="context-strata">
                <section><div class="subsection-label">CREATOR / AUDIENCE PROXY</div><h3>公开受众与创作者代理</h3><p class="sub">不推断敏感人口属性。匹配内容 ${esc(audience.evidence?.matchedItems ?? 0)} · 创作者 ${esc(audience.evidence?.creatorsObserved ?? 0)}</p>${renderAny((audience.creatorSignals || []).slice(0, 10))}</section>
                <section><div class="subsection-label">MEDIA EVIDENCE</div><h3>媒体证据</h3><p class="sub">证据 ${esc(media.evidenceCount ?? 0)} · 图片 ${esc(media.imageEvidenceCount ?? 0)}</p>${renderAny((media.items || []).slice(0, 10))}</section>
              </div>
            </div>
          </section>

          <section class="trace-stage" id="trace-action">
            <header class="trace-stage-head"><span class="trace-no">04</span><div><small>ACTION / RETURN</small><h2>接下来能做什么</h2></div></header>
            <div class="trace-stage-body">
              <div class="action-path">${decisionList(research.recommendedActions, "先补充主体证据")}</div>
              ${upcoming.length ? `<div class="upcoming-axis"><div class="subsection-label">UPCOMING NODES</div><h3>临近节点</h3>${upcoming.slice(0, 8).map((node, index) => `<div class="upcoming-node"><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(node.name)}</strong><time>${esc(node.startDate)}</time><p>${esc(node.expectedImpact || node.category || "")}</p></div>`).join("")}</div>` : ""}
            </div>
          </section>
        </div>

        <section class="research-technical">
          <details>
            <summary>技术口径 / 信源架构 / 专业告警</summary>
            <div class="technical-grid">
              <div><h3>信源架构</h3>${renderAny((architecture.selected || []).map((x) => ({ source: x.label || x.requestedId, access: x.access, families: (x.families || []).join(", ") })))}</div>
              <div><h3>专业告警</h3>${renderAny(d.alerts?.triggered || [])}</div>
            </div>
          </details>
        </section>

        <section class="research-delivery">
          <div><span class="field-index">RETURN · DELIVERY</span><h2>同一份 Intelligence Truth，交给人或 AI</h2><p>页面、Markdown、JSON 与 CSV 共用同一后端证据链。</p></div>
          <div class="delivery-actions"><button class="text-action" id="proMd">复制决策简报</button><button class="text-action" id="proJson">JSON</button><button class="text-action" id="proCsv">CSV</button></div>
        </section>
      `;

      const copyReport = async (format) => {
        const qs2 = new URLSearchParams({ keyword, format, geo, timeframe });
        if (platforms) qs2.set("platforms", platforms);
        if (vertical) qs2.set("verticals", vertical);
        qs2.set("refresh", "0");
        const r = await api(`/api/professional/report?${qs2}`);
        copyText(typeof r.content === "string" ? r.content : JSON.stringify(r.content, null, 2), `${format.toUpperCase()} 报告已复制`);
      };
      $("#proJson").onclick = () => copyReport("json");
      $("#proMd").onclick = () => copyReport("markdown");
      $("#proCsv").onclick = () => copyReport("csv");
    } catch (e) {
      target.innerHTML = note("err", `专业情报生成失败：${esc(e.message)}`);
    }
  };
  $("#proRun").onclick = run;
  $("#proKeyword").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  if (initial) await run();
};

VIEWS.sources = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h2>Professional Source Universe <span class="badge neutral">DEV</span></h2>
      <p class="sub">这里把“已真实可取数”“零配置”“需要 API/OAuth”“只允许本地授权会话”“商业授权连接器”“适配开发中”严格分开。列入 Universe 不等于虚假宣称已上线。</p>
      <div class="form-row">
        <select id="srcVertical">${verticalOptions("")}</select>
        <select id="srcPriority"><option value="P0">P0 核心</option><option value="P1" selected>P0 + P1 主流</option><option value="P2">全部规划</option></select>
        <button class="btn primary" id="srcLoad">刷新信源矩阵</button>
      </div>
    </div>
    <div id="srcResult">${loading()}</div>
    <div class="card" style="margin-top:14px">
      <h2>品牌 / 公司实体宇宙</h2>
      <p class="sub">内置只是一组高优先级种子。实际监测不受此名单限制，用户可在工作区加入任意品牌、公司、产品和别名。</p>
      <div class="form-row"><input id="entityQ" placeholder="试试：LV / 小米 / Tesla / YSL"/><button class="btn" id="entityFind">解析实体</button></div>
      <div id="entityResult">${loading()}</div>
    </div>`;

  const loadSources = async () => {
    const vertical = $("#srcVertical").value;
    const priority = $("#srcPriority").value;
    const qs = new URLSearchParams({ priority });
    if (vertical) qs.set("verticals", vertical);
    const d = await api(`/api/professional/sources?${qs}`);
    const c = d.counts || {};
    $("#srcResult").innerHTML = `
      <div class="source-summary">
        ${scoreCard("当前范围", c.total ?? 0, priority)}
        ${scoreCard("零配置", c.zeroConfig ?? 0, "打开即可用")}
        ${scoreCard("可选增强", c.optionalEnhancements ?? 0, "不阻断基础使用")}
        ${scoreCard("API / OAuth", c.credentialed ?? 0, "用户明确需要时再配置")}
        ${scoreCard("授权连接器", c.licensed ?? 0, "不做私有 API 绕过")}
        ${scoreCard("适配开发中", c.planned ?? 0, "不计 live coverage")}
      </div>
      <div class="card"><h3>默认自动选择</h3><div class="tagrow">${(d.defaultLivePlatforms || []).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div><p class="sub">专业分析优先从这些已可用且不要求用户配置的高优先级源开始，避免每次先让用户填 Cookie/API。</p></div>
      <div class="source-grid" style="margin-top:14px">${(d.sources || []).map((s) => {
        const on = s.onboarding || {};
        return `<div class="source-card">
          <div class="source-head"><div class="source-name">${esc(s.label)}</div><span class="badge neutral">${esc(s.priority)}</span></div>
          <div class="source-meta">${esc(s.region)} · ${esc((s.families || []).join(" / "))}</div>
          <div class="source-meta">${esc((s.verticals || []).join(" / "))}</div>
          <div class="source-action ${accessClass(on.mode)}"><strong>${esc(accessLabel(on.mode))}</strong>${on.userAction ? `<br>${esc(on.userAction)}` : ""}</div>
        </div>`;
      }).join("")}</div>`;
  };

  const loadEntities = async () => {
    const q = $("#entityQ").value.trim();
    const qs = new URLSearchParams({ priority: "P1" });
    if (q) qs.set("q", q);
    const d = await api(`/api/professional/entities?${qs}`);
    const resolved = d.resolved;
    $("#entityResult").innerHTML = `${resolved ? note("info", `已解析：${esc(resolved.name)} · ${esc(resolved.sector)} · aliases: ${esc((resolved.aliases || []).join(" / "))}`) : (q ? note("warn", "种子库未命中；仍可作为自定义品牌/公司直接监测，不会被拒绝。") : "")}
      <div class="entity-grid">${(d.entities || []).map((e) => `<div class="entity-card"><strong>${esc(e.name)}</strong><div class="source-meta">${esc(e.sector)} · ${esc(e.region)} · ${esc(e.priority)}</div><div class="aliases">${esc((e.aliases || []).join(" / "))}</div></div>`).join("")}</div>`;
  };

  $("#srcLoad").onclick = loadSources;
  $("#srcVertical").onchange = loadSources;
  $("#srcPriority").onchange = loadSources;
  $("#entityFind").onclick = loadEntities;
  $("#entityQ").addEventListener("keydown", (e) => { if (e.key === "Enter") loadEntities(); });
  await Promise.all([loadSources(), loadEntities()]);
};

VIEWS.workspace = async function (root) {
  if (window.TRENHUB_IS_REMOTE) {
    root.innerHTML = note("info", "工作区写操作只在本地安装开放；公网托管端不会暴露 RBAC / watchlist / saved query / alert-rule 变更接口。") +
      `<div class="card"><h2>为什么</h2><p class="sub">协作状态属于用户自己的运行数据。TrendHub 默认 local-first，不为公开访问者建立中央账号数据库。</p></div>`;
    return;
  }
  root.innerHTML = `
    <div class="card"><h2>本地工作区</h2><p class="sub">owner / editor / analyst / viewer · Watchlist · Saved Query · Alert Rule · Audit Log</p>
      <div class="form-row"><input id="wsPrincipal" value="local-owner" placeholder="principal"/><input id="wsName" value="TrendHub Workspace" placeholder="工作区名称"/><button class="btn primary" id="wsCreate">创建</button><button class="btn" id="wsRefresh">刷新</button></div>
    </div><div id="wsResult">${loading()}</div>`;
  const load = async () => {
    const p = $("#wsPrincipal").value.trim() || "local-owner";
    const d = await api(`/api/workspaces?principal=${encodeURIComponent(p)}`);
    $("#wsResult").innerHTML = `<div class="card"><h2>可访问工作区</h2>${renderAny(d.workspaces || [])}</div>`;
  };
  $("#wsCreate").onclick = async () => {
    const principal = $("#wsPrincipal").value.trim() || "local-owner";
    const name = $("#wsName").value.trim() || "TrendHub Workspace";
    await api("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", principal, name }) });
    toast("工作区已创建"); await load();
  };
  $("#wsRefresh").onclick = load;
  await load();
};