/* 研究结果页（结论全部由后端 /api/review 给出，前端只渲染）+ 数据源 + 本机协作。 */
"use strict";

TITLES.research = "研究";
TITLES.professional = "研究";
TITLES.sources = "数据源";
TITLES.workspace = "协作（本机）";

/* ---------- 数据源页仍在使用的展示辅助 ---------- */
function scoreCard(label, value, sub) {
  return `<div class="stat"><div class="stat-num">${esc(value ?? "—")}</div><div class="stat-label">${esc(label)}</div>${sub ? `<div class="meta">${esc(sub)}</div>` : ""}</div>`;
}
function verticalOptions(selected) {
  const opts = [
    ["", "行业默认：品牌 / 商业 / 广告 / 媒体"], ["fashion-luxury", "时尚 / 奢侈品"], ["beauty", "美妆"],
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
    "zero-config": "开箱即用",
    "optional-local-session": "免配置 · 可在本机登录增强",
    "user-api-key": "需要用户 API Key",
    "user-oauth": "需要官方登录授权",
    "required-local-session": "需要本机登录",
    "licensed-connector": "需要授权数据连接器",
    planned: "适配中",
  })[mode] || mode || "—";
}

/* ================= 研究结果（主体页） ================= */

const RV_EXAMPLES = ["广州太古汇", "Louis Vuitton", "小米汽车"];

function rvEntry(keyword) {
  return `
  <section class="home-hero">
    <h1 class="home-title">研究一个主体，先看证据再下结论</h1>
    <p class="home-sub">输入品牌、商场、产品、人物或话题，得到当前结论、趋势变化、平台表现、机会风险和建议。</p>
    <form class="home-search" id="rvEntryForm">
      <input class="home-keyword" id="rvEntryKeyword" type="search" autocomplete="off" aria-label="研究对象" placeholder="例如：广州太古汇" value="${esc(keyword || "")}">
      <button class="btn primary lg" type="submit">开始研究</button>
    </form>
    <div class="home-examples"><span>试试</span>${RV_EXAMPLES.map((x) => `<button type="button" class="example-chip" data-example="${esc(x)}">${esc(x)}</button>`).join("")}</div>
  </section>`;
}

function rvSkeleton() {
  const block = (kicker, lines) => `
    <section class="rv-section">
      <div class="rv-kicker">${kicker}</div>
      <div class="rv-skeleton">${Array.from({ length: lines }).map((_, i) => `<span class="sk-line" style="width:${[92, 78, 64, 88, 70][i % 5]}%"></span>`).join("")}</div>
    </section>`;
  return (
    block("当前结论", 3) +
    block("趋势变化", 2) +
    block("关键驱动", 2) +
    block("平台表现", 4) +
    block("证据", 3) +
    block("机会与风险", 2) +
    block("建议", 3)
  );
}

VIEWS.research = async function (root, params) {
  const keyword = (params.keyword || "").trim();

  if (!keyword) {
    root.innerHTML = rvEntry("");
    const input = $("#rvEntryKeyword", root);
    $("#rvEntryForm", root).addEventListener("submit", (event) => {
      event.preventDefault();
      startResearch(input.value);
    });
    root.querySelectorAll("[data-example]").forEach((button) => {
      button.addEventListener("click", () => startResearch(button.dataset.example));
    });
    input.focus();
    return;
  }

  root.innerHTML = `
    <div class="research-page">
      <div class="research-progress" id="rvProgress"><span></span></div>
      <header class="research-header">
        <div>
          <div class="research-kind" id="rvKind">正在研究</div>
          <h1 class="research-title">${esc(keyword)}</h1>
        </div>
        <div class="research-actions" id="rvHeadActions"></div>
      </header>
      <div id="rvBody">${rvSkeleton()}</div>
      <aside class="evidence-drawer" id="evidenceDrawer" hidden aria-label="来源与依据">
        <div class="evidence-drawer-head">
          <div>
            <div class="evidence-drawer-eyebrow">来源与依据</div>
            <h2 id="evidenceDrawerTitle">依据</h2>
          </div>
          <button type="button" class="evidence-close" id="evidenceClose" aria-label="关闭">×</button>
        </div>
        <div class="evidence-drawer-body" id="evidenceDrawerBody"></div>
      </aside>
      <div class="evidence-backdrop" id="evidenceBackdrop" hidden></div>
    </div>`;

  const base = {
    keyword,
    geo: params.geo || "CN",
    timeframe: params.timeframe || "today 3-m",
    ...(params.refresh === "1" ? {} : { refresh: "0" }),
  };
  const quickQs = new URLSearchParams({ ...base, depth: "quick", _: String(Date.now()) });
  const fullQs = new URLSearchParams({ ...base, _: String(Date.now() + 1) });
  let finalRendered = false;

  const quickTask = api(`/api/review?${quickQs}`)
    .then((view) => {
      if (!finalRendered) renderDecision(root, keyword, view, params, true);
    })
    .catch(() => {});

  try {
    const view = await api(`/api/review?${fullQs}`);
    finalRendered = true;
    await quickTask;
    renderDecision(root, keyword, view, params, false);
  } catch (error) {
    await quickTask;
    const body = $("#rvBody", root);
    if (body && !body.querySelector(".research-summary")) {
      $("#rvProgress", root)?.replaceChildren();
      body.innerHTML =
        note("err", `这次研究没有完成：${esc(error.message)}`) +
        '<div class="rv-retry"><button class="btn primary" id="rvRetry">重新研究</button><a class="btn" href="#/research">返回研究</a></div>';
      $("#rvRetry", root).onclick = () => VIEWS.research(root, params);
    } else {
      $("#rvProgress", root)?.replaceChildren();
      toast("更多数据暂时没有补齐，已保留当前结果");
    }
  }
};
VIEWS.professional = VIEWS.research;

function renderDecision(root, keyword, view, params, updating = false) {
  const progress = $("#rvProgress", root);
  if (progress && !updating) progress.replaceChildren();

  const current = view.current || {};
  const change = view.change || {};
  const watching = TH_STORE.isWatching(keyword);

  $("#rvKind", root).textContent = updating ? "已返回首批结果 · 正在继续补充" : (view.subject?.kind || "研究结果");
  $("#rvHeadActions", root).innerHTML = `
    <button class="research-action" id="rvWatchTop" type="button">${watching ? "已关注" : "关注"}</button>
    <button class="research-action" id="rvRefresh" type="button">更新</button>
    <button class="research-action primary" id="rvExport" type="button">导出</button>`;

  const curveBlock = change.curve?.points?.length > 1
    ? `<div class="research-curve">${lineChart([{ name: keyword, points: change.curve.points }], { ariaLabel: "搜索热度趋势" })}<p class="research-caption">${esc(change.curve.scaleNote || "")}</p></div>`
    : "";

  const related = change.related || {};
  const relatedBlock = (related.rising?.length || related.top?.length)
    ? `<div class="research-related">
        ${related.rising?.length ? `<div><span>近期上升</span>${related.rising.slice(0, 10).map((item) => `<button type="button" data-related="${esc(item)}">${esc(item)}</button>`).join("")}</div>` : ""}
        ${related.top?.length ? `<div><span>相关搜索</span>${related.top.slice(0, 10).map((item) => `<button type="button" data-related="${esc(item)}">${esc(item)}</button>`).join("")}</div>` : ""}
      </div>`
    : "";

  const changeMeta = [
    change.directionText && change.directionText !== "方向暂不明确" ? change.directionText : "",
    change.changePct != null ? `${change.changePct > 0 ? "+" : ""}${change.changePct}%` : "",
    change.qualityText || "",
  ].filter(Boolean).join(" · ");

  const insights = [
    ...(view.drivers || []).map((item, index) => ({ ...item, kind: "驱动", source: "drivers", index })),
    ...(view.opportunities || []).map((item, index) => ({ ...item, kind: "机会", source: "opportunities", index })),
    ...(view.risks || []).map((item, index) => ({ ...item, kind: "风险", source: "risks", index })),
  ];

  const insightBlock = insights.length
    ? `<div class="insight-stream">${insights.map((item) => `
        <article class="insight-row">
          <div class="insight-kind">${esc(item.kind)}</div>
          <div class="insight-copy">
            <strong>${esc(item.title)}</strong>
            ${item.reason ? `<p>${esc(item.reason)}</p>` : ""}
          </div>
          ${item.evidence?.length ? `<button type="button" class="text-action" data-insight-source="${item.source}" data-insight-index="${item.index}">查看依据</button>` : ""}
        </article>`).join("")}</div>`
    : '<p class="research-empty">当前证据还不足以识别稳定的驱动、机会或风险。</p>';

  const platforms = view.platforms || [];
  const platformBlock = platforms.length
    ? `<div class="platform-stream">${platforms.map((platform, index) => `
        <article class="platform-row state-${esc(platform.state)}">
          <div class="platform-state-dot" aria-hidden="true"></div>
          <div class="platform-copy">
            <div class="platform-title-line">
              <strong>${esc(platform.name)}</strong>
              <span>${esc(platform.stateText)}${platform.count ? ` · ${platform.count} 条` : ""}</span>
            </div>
            ${platform.conclusion ? `<p>${esc(platform.conclusion)}</p>` : ""}
          </div>
          <button type="button" class="text-action" data-platform-index="${index}">${platform.evidence?.length ? "查看依据" : "查看说明"}</button>
        </article>`).join("")}</div>`
    : '<p class="research-empty">这次没有取到可用的平台数据。</p>';

  const suggestions = view.suggestions || [];
  const suggestionBlock = suggestions.length
    ? `<div class="next-stream">${suggestions.map((item) => `
        <article class="next-row">
          <span class="next-priority">${esc(item.priorityText || "建议")}</span>
          <div><strong>${esc(item.title)}</strong>${item.reason ? `<p>${esc(item.reason)}</p>` : ""}</div>
        </article>`).join("")}</div>`
    : '<p class="research-empty">当前还没有足够依据给出下一步建议。</p>';

  const upcomingBlock = view.upcoming?.length
    ? `<div class="next-nodes">
        <div class="subhead">接下来值得留意</div>
        ${view.upcoming.slice(0, 4).map((item) => `
          <div class="next-node"><div><strong>${esc(item.name)}</strong>${item.impact ? `<p>${esc(item.impact)}</p>` : ""}</div><time>${esc(item.date || "")}</time></div>`).join("")}
      </div>`
    : "";

  const gapsBlock = view.gaps?.length
    ? `<details class="research-limits">
        <summary>这次研究还有 ${view.gaps.length} 个数据限制</summary>
        ${view.gaps.map((gap) => `<div class="limit-row"><strong>${esc(gap.title)}</strong><p>${esc(gap.reason || "")}</p>${gap.nextStep ? `<p>${esc(gap.nextStep)}</p>` : ""}</div>`).join("")}
      </details>`
    : "";

  $("#rvBody", root).innerHTML = `
    <section class="research-summary">
      <p class="research-conclusion">${esc(current.conclusion || "正在整理该主体的公开信息。")}</p>
      <div class="research-meta">
        <span>${esc(current.strengthText || "证据不足")}</span>
        <span>${esc(current.evidenceCount ?? 0)} 条依据</span>
        <span>${esc(current.channelCount ?? 0)} 个来源有信号</span>
      </div>
      ${current.hotlistText ? `<p class="research-context">${esc(current.hotlistText)}</p>` : ""}
    </section>

    <section class="research-flow">
      <div class="flow-heading">
        <h2>发生了什么</h2>
        ${changeMeta ? `<span>${esc(changeMeta)}</span>` : ""}
      </div>
      <p class="flow-lead">${esc(change.text || "当前没有足够的趋势序列判断变化方向。")}</p>
      ${curveBlock}
      ${relatedBlock}
    </section>

    <section class="research-flow">
      <div class="flow-heading"><h2>为什么值得注意</h2></div>
      ${insightBlock}
    </section>

    <section class="research-flow">
      <div class="flow-heading">
        <h2>哪些平台支持这个判断</h2>
        <button type="button" class="text-action" id="rvAllSources">查看全部来源</button>
      </div>
      ${platformBlock}
    </section>

    <section class="research-flow next-step">
      <div class="flow-heading"><h2>下一步</h2></div>
      ${suggestionBlock}
      ${upcomingBlock}
      <div class="next-secondary">
        <a href="#/brief?topic=${encodeURIComponent(keyword)}">生成创作简报</a>
      </div>
      ${gapsBlock}
    </section>

    <p class="research-data-note">${esc(view.dataNote || "")}</p>`;

  bindResearchInteractions(root, keyword, view, params);
}

function bindResearchInteractions(root, keyword, view, params) {
  const setWatch = (active) => {
    const button = $("#rvWatchTop", root);
    if (button) button.textContent = active ? "已关注" : "关注";
  };

  $("#rvWatchTop", root)?.addEventListener("click", () => {
    const active = TH_STORE.toggleWatching(keyword);
    setWatch(active);
    toast(active ? "已关注" : "已取消关注");
  });

  $("#rvRefresh", root)?.addEventListener("click", () => {
    VIEWS.research(root, { ...params, refresh: "1" });
  });

  $("#rvExport", root)?.addEventListener("click", async () => {
    try {
      const qs = new URLSearchParams({
        keyword,
        format: "markdown",
        refresh: "0",
        geo: params.geo || "CN",
        timeframe: params.timeframe || "today 3-m",
      });
      const report = await api(`/api/professional/report?${qs}`);
      copyText(typeof report.content === "string" ? report.content : JSON.stringify(report.content, null, 2), "研究简报已复制");
    } catch (error) {
      toast(`导出失败：${error.message}`);
    }
  });

  root.querySelectorAll("[data-related]").forEach((button) => {
    button.addEventListener("click", () => startResearch(button.dataset.related));
  });

  root.querySelectorAll("[data-platform-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const platform = view.platforms?.[Number(button.dataset.platformIndex)];
      if (!platform) return;
      openEvidenceDrawer(root, platform.name, platform.evidence || [], platform.note || platform.conclusion || "");
    });
  });

  root.querySelectorAll("[data-insight-source]").forEach((button) => {
    button.addEventListener("click", () => {
      const list = view[button.dataset.insightSource] || [];
      const item = list[Number(button.dataset.insightIndex)];
      if (!item) return;
      openEvidenceDrawer(root, item.title, item.evidence || [], item.reason || "");
    });
  });

  $("#rvAllSources", root)?.addEventListener("click", () => {
    const all = [];
    const seen = new Set();
    for (const platform of (view.platforms || [])) {
      for (const item of (platform.evidence || [])) {
        const key = item.url || `${platform.name}|${item.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push({ ...item, source: item.source || platform.name });
      }
    }
    openEvidenceDrawer(root, "全部来源", all, "仅展示本次研究实际取得的公开来源；缺失平台不会被补成 0。");
  });

  $("#evidenceClose", root)?.addEventListener("click", () => closeEvidenceDrawer(root));
  $("#evidenceBackdrop", root)?.addEventListener("click", () => closeEvidenceDrawer(root));
}

function openEvidenceDrawer(root, title, evidence, noteText) {
  const drawer = $("#evidenceDrawer", root);
  const backdrop = $("#evidenceBackdrop", root);
  const body = $("#evidenceDrawerBody", root);
  if (!drawer || !backdrop || !body) return;

  $("#evidenceDrawerTitle", root).textContent = title || "来源";
  body.innerHTML = `
    ${noteText ? `<p class="evidence-note">${esc(noteText)}</p>` : ""}
    ${evidence?.length
      ? evidence.map((item) => `
          <article class="evidence-item">
            <div class="evidence-meta">${esc(item.source || "公开来源")}${item.time ? ` · ${esc(fmtTime(item.time))}` : ""}</div>
            <div class="evidence-title">${linkOrText(item.title, item.url)}</div>
          </article>`).join("")
      : '<p class="research-empty">当前没有可回溯到链接的依据。</p>'}`;

  drawer.hidden = false;
  backdrop.hidden = false;
  document.body.classList.add("evidence-open");
}

function closeEvidenceDrawer(root) {
  const drawer = $("#evidenceDrawer", root);
  const backdrop = $("#evidenceBackdrop", root);
  if (drawer) drawer.hidden = true;
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove("evidence-open");
}

/* ================= 数据源（设置页，面向安装者） ================= */
VIEWS.sources = async function (root) {
  root.innerHTML = `
    <div class="card">
      <h2>数据源清单 <span class="badge neutral">只读</span></h2>
      <p class="sub">清楚区分“开箱即用”“可在本机登录增强”“需要 API / 官方授权”“需要授权连接器”“适配中”。列入清单不等于宣称已可取数，暂时取不到的源会在研究结果里如实标注。</p>
      <div class="form-row">
        <select id="srcVertical">${verticalOptions("")}</select>
        <select id="srcPriority">
          <option value="P0">核心（开箱即用）</option>
          <option value="P1" selected>主流公开源</option>
          <option value="P2">全部（含规划 / 授权）</option>
        </select>
        <button class="btn primary" id="srcLoad">刷新数据源</button>
      </div>
    </div>
    <div id="srcResult">${loading()}</div>
    <div class="card" style="margin-top:14px">
      <h2>品牌 / 公司主体库</h2>
      <p class="sub">内置只是一组高优先级种子；实际研究不受名单限制，任何品牌、公司、产品或商场都可作为自定义主体直接研究。</p>
      <div class="form-row"><input id="entityQ" placeholder="试试：LV / 小米 / Tesla / YSL"/><button class="btn" id="entityFind">解析主体</button></div>
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
        ${scoreCard("开箱即用", c.zeroConfig ?? 0, "打开即可用")}
        ${scoreCard("本机可增强", c.optionalEnhancements ?? 0, "不阻断基础使用")}
        ${scoreCard("API / 授权", c.credentialed ?? 0, "需要时再配置")}
        ${scoreCard("授权连接器", c.licensed ?? 0, "不做私有接口绕过")}
        ${scoreCard("适配中", c.planned ?? 0, "不计入可用源")}
      </div>
      <div class="card"><h3>默认自动选择</h3><div class="tagrow">${(d.defaultLivePlatforms || []).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div><p class="sub">研究默认从这些已可用、无需配置的高优先级源开始，不必先填 Cookie 或 API Key。</p></div>
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
    $("#entityResult").innerHTML = `${resolved ? note("info", `已识别：${esc(resolved.name)} · ${esc(resolved.sector)} · 别名：${esc((resolved.aliases || []).join(" / "))}`) : (q ? note("warn", "种子库未命中；仍可作为自定义主体直接研究，不会被拒绝。") : "")}
      <div class="entity-grid">${(d.entities || []).map((e) => `<div class="entity-card"><strong>${esc(e.name)}</strong><div class="source-meta">${esc(e.sector)} · ${esc(e.region)} · ${esc(e.priority)}</div><div class="aliases">${esc((e.aliases || []).join(" / "))}</div></div>`).join("")}</div>`;
  };

  $("#srcLoad").onclick = () => loadSources().catch((e) => ($("#srcResult").innerHTML = note("err", esc(e.message))));
  $("#srcVertical").onchange = () => loadSources().catch(() => {});
  $("#srcPriority").onchange = () => loadSources().catch(() => {});
  $("#entityFind").onclick = () => loadEntities().catch((e) => ($("#entityResult").innerHTML = note("err", esc(e.message))));
  $("#entityQ").addEventListener("keydown", (e) => { if (e.key === "Enter") loadEntities().catch(() => {}); });
  await Promise.all([loadSources().catch((e) => ($("#srcResult").innerHTML = note("err", esc(e.message)))), loadEntities().catch(() => {})]);
};

/* ================= 协作（仅本机） ================= */
VIEWS.workspace = async function (root) {
  if (window.TRENHUB_IS_REMOTE) {
    root.innerHTML = note("info", "协作相关的写操作只在你自己电脑上的本地安装开放；公网控制台不提供成员、关注名单、已存查询或告警规则的任何修改入口。") +
      `<div class="card"><h2>为什么</h2><p class="sub">协作数据属于你自己的运行数据，默认只存在本机，公网不为访问者建立账号体系，也不收集这些数据。</p></div>`;
    return;
  }
  root.innerHTML = `
    <div class="card"><h2>本机协作</h2><p class="sub">角色：所有者 / 可编辑 / 分析师 / 只读；可管理关注名单、已存查询、告警规则与操作记录。</p>
      <div class="form-row"><input id="wsPrincipal" value="local-owner" placeholder="使用者标识"/><input id="wsName" value="TrendHub 工作区" placeholder="工作区名称"/><button class="btn primary" id="wsCreate">创建</button><button class="btn" id="wsRefresh">刷新</button></div>
    </div><div id="wsResult">${loading()}</div>`;
  const load = async () => {
    const p = $("#wsPrincipal").value.trim() || "local-owner";
    const d = await api(`/api/workspaces?principal=${encodeURIComponent(p)}`);
    $("#wsResult").innerHTML = `<div class="card"><h2>可访问工作区</h2>${renderAny(d.workspaces || [])}</div>`;
  };
  $("#wsCreate").onclick = async () => {
    const principal = $("#wsPrincipal").value.trim() || "local-owner";
    const name = $("#wsName").value.trim() || "TrendHub 工作区";
    await api("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", principal, name }) });
    toast("工作区已创建"); await load();
  };
  $("#wsRefresh").onclick = () => load().catch((e) => toast(e.message));
  await load().catch((e) => { $("#wsResult").innerHTML = note("err", esc(e.message)); });
};
