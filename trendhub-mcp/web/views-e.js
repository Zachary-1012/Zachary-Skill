/* 研究结果页（结论全部由后端 /api/review 给出，前端只渲染）+ 数据源 + 本机协作。 */
"use strict";

TITLES.research = "研究结果";
TITLES.professional = "研究结果";
TITLES.sources = "数据源";
TITLES.workspace = "协作（本机）";

/* ---------- 数据源页仍在使用的展示辅助 ---------- */
function scoreCard(label, value, sub) {
  return `<div class="stat"><div class="stat-num">${esc(value ?? "—")}</div><div class="stat-label">${esc(label)}</div>${sub ? `<div class="meta">${esc(sub)}</div>` : ""}</div>`;
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
    $("#rvEntryForm", root).addEventListener("submit", (e) => {
      e.preventDefault();
      startResearch(input.value);
    });
    root.querySelectorAll("[data-example]").forEach((b) => b.addEventListener("click", () => startResearch(b.dataset.example)));
    input.focus();
    return;
  }

  root.innerHTML = `
    <div class="rv-progress" id="rvProgress"><span></span></div>
    <div class="rv-page">
      <div class="research-head">
        <div class="research-head-main">
          <div class="rv-kind" id="rvKind">正在研究…</div>
          <h1 class="research-title">${esc(keyword)}</h1>
        </div>
        <div class="research-head-actions" id="rvHeadActions"></div>
      </div>
      <div id="rvQuick"></div>
      <div id="rvBody">${rvSkeleton()}</div>
    </div>`;

  /* 快层：读已有快照，毫秒级先给一条可看的信号，不等慢源 */
  api(`/api/overlap?keyword=${encodeURIComponent(keyword)}&limit=20`)
    .then((d) => {
      const box = $("#rvQuick");
      if (!box) return;
      const hit = d.platformsHit ?? 0;
      const mentions = d.totalMentions ?? 0;
      if (mentions > 0) {
        box.innerHTML = note("info", `正在完成完整分析。先看到：最近采集的榜单里，「${esc(keyword)}」在 ${hit} 个平台出现约 ${mentions} 条相关条目。`);
      }
    })
    .catch(() => {});

  /* 慢层：完整研究结果视图（结论由后端给出） */
  try {
    // 通用热榜走最近快照（refresh=0，弱网更快）；主体证据仍由后端实时检索。
    // 追加 refresh=1 进入研究页时会强制连热榜一起实时刷新。
    const qs = new URLSearchParams({
      keyword,
      geo: params.geo || "CN",
      timeframe: params.timeframe || "today 3-m",
      ...(params.refresh === "1" ? {} : { refresh: "0" }),
      _: String(Date.now()),
    });
    const view = await api(`/api/review?${qs}`);
    $("#rvQuick")?.remove();
    renderDecision(root, keyword, view, params);
  } catch (e) {
    $("#rvQuick")?.remove();
    const progress = $("#rvProgress");
    if (progress) progress.innerHTML = "";
    $("#rvBody").innerHTML =
      note("err", `这次研究没有完成：${esc(e.message)}。可以重试，或先到“热点榜 / 小红书”看公开数据。`) +
      `<div class="rv-retry"><button class="btn primary" id="rvRetry">重新研究</button><a class="btn" href="#/dashboard">返回首页</a></div>`;
    $("#rvRetry").onclick = () => VIEWS.research(root, params);
  }
};
VIEWS.professional = VIEWS.research;

function rvBadge(text, cls = "") {
  return `<span class="rv-badge ${cls}">${esc(text)}</span>`;
}

function renderDecision(root, keyword, view, params) {
  const progress = $("#rvProgress");
  if (progress) progress.innerHTML = "";

  const watching = TH_STORE.isWatching(keyword);
  $("#rvKind").textContent = view.subject.kind || "研究结果";
  $("#rvHeadActions").innerHTML = `
    <button class="btn sm" id="rvWatchTop">${watching ? "★ 已关注" : "☆ 加入关注"}</button>
    <a class="btn sm" href="#/brief?topic=${encodeURIComponent(keyword)}">写创作简报</a>
    <a class="btn sm" href="#/xhs?keyword=${encodeURIComponent(keyword)}">看小红书</a>`;

  const c = view.current || {};
  const ch = view.change || {};

  /* 趋势变化 */
  const curveBlock = ch.curve && ch.curve.points && ch.curve.points.length > 1
    ? `<div class="rv-curve">${lineChart([{ name: keyword, points: ch.curve.points }], { ariaLabel: "搜索热度趋势" })}<p class="rv-cap">${esc(ch.curve.scaleNote || "")}</p></div>`
    : "";
  const related = ch.related || {};
  const relatedBlock = (related.rising?.length || related.top?.length)
    ? `<div class="rv-related">
        ${related.rising?.length ? `<div class="rv-related-group"><span class="rv-related-label">近期上升相关词</span><div class="tagrow">${related.rising.slice(0, 16).map((x) => `<span class="tag rising">↑ ${esc(x)}</span>`).join("")}</div></div>` : ""}
        ${related.top?.length ? `<div class="rv-related-group"><span class="rv-related-label">长期热门相关词</span><div class="tagrow">${related.top.slice(0, 16).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div></div>` : ""}
      </div>` : "";
  const forecast = ch.forecast;
  const forecastBlock = forecast
    ? `<div class="rv-forecast">
        <div class="rv-forecast-head"><strong>${esc(forecast.statusText)}</strong></div>
        ${forecast.rows.length ? `<div class="table-wrap"><table><thead><tr><th>时间</th><th>预期相对热度</th><th>较现在</th></tr></thead><tbody>
          ${forecast.rows.map((r) => `<tr><td>${esc(r.horizonText)}</td><td class="mono">${esc(r.value)}</td><td>${esc(r.deltaText || "—")}</td></tr>`).join("")}
        </tbody></table></div>` : ""}
        <p class="rv-cap">${esc(forecast.validationText)}</p>
      </div>` : "";
  const changeBadges = [
    rvBadge(`方向：${ch.directionText || "暂不明确"}`, ch.directionText === "上升" || ch.directionText === "快速上升" ? "up" : ch.directionText === "下降" ? "down" : ""),
    ch.changePct != null ? rvBadge(`变化约 ${ch.changePct > 0 ? "+" : ""}${ch.changePct}%`) : "",
    ch.peak != null ? rvBadge(`近期峰值 ${ch.peak}`) : "",
    rvBadge(ch.qualityText || "搜索趋势暂缺"),
  ].join("");

  /* 平台表现 */
  const platformsBlock = (view.platforms || []).length
    ? `<div class="rv-platforms">${view.platforms.map(rvPlatform).join("")}</div>`
    : empty("这次没有取到可用的平台数据，稍后重试或在本机登录后增强。");

  /* 证据（展示层聚合去重，结论仍来自后端） */
  const seen = new Set();
  const evidence = (view.platforms || [])
    .flatMap((p) => (p.evidence || []).map((e) => ({ ...e, platform: p.name })))
    .filter((e) => {
      const key = e.url || `${e.platform}|${e.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
  const shownEvidence = evidence.slice(0, 30);
  const evidenceBlock = shownEvidence.length
    ? `<div class="rv-evidence">${shownEvidence.map((e) => `
        <div class="rv-ev-item">
          <div class="rv-ev-meta">${esc(e.platform || e.source || "公开来源")}${e.time ? ` · ${esc(fmtTime(e.time))}` : ""}</div>
          <div class="rv-ev-title">${linkOrText(e.title, e.url)}</div>
        </div>`).join("")}</div>
      ${evidence.length > shownEvidence.length ? `<p class="rv-cap">仅展示最近 ${shownEvidence.length} 条，共 ${evidence.length} 条。</p>` : ""}`
    : empty("暂无可回溯到链接的证据条目；平台暂时取不到的数据已在上方标注。");

  /* 机会 / 风险 */
  const twoCol = `<div class="rv-two-col">
      <div class="rv-col"><div class="rv-col-head up">机会</div>${rvResultList(view.opportunities, "当前没有证据支持的明确机会")}</div>
      <div class="rv-col"><div class="rv-col-head down">风险</div>${rvResultList(view.risks, "当前没有证据支持的明确风险")}</div>
    </div>`;

  /* 建议 + 缺口 + 节点 */
  const suggestionsBlock = view.suggestions?.length
    ? `<div class="rv-suggestions">${view.suggestions.map((s) => `
        <div class="rv-suggestion">
          <span class="rv-priority priority-${esc(s.priority || "next")}">${esc(s.priorityText || "建议接下来做")}</span>
          <div><strong>${esc(s.title)}</strong>${s.reason ? `<p>${esc(s.reason)}</p>` : ""}</div>
        </div>`).join("")}</div>`
    : empty("先补充更多平台证据，再给出行动建议。");
  const gapsBlock = view.gaps?.length
    ? `<details class="rv-gaps"><summary>还有哪些地方不能下结论（${view.gaps.length}）</summary>
        ${view.gaps.map((g) => `<div class="rv-gap"><strong>${esc(g.title)}</strong><p>${esc(g.reason || "")}</p><p class="rv-gap-next">下一步：${esc(g.nextStep || "在本机登录对应平台后补充。")}</p></div>`).join("")}
      </details>` : "";
  const upcomingBlock = view.upcoming?.length
    ? `<div class="rv-upcoming"><div class="rv-col-head">近期相关节点</div>${view.upcoming.slice(0, 6).map((u) => `
      <div class="rv-node"><div><strong>${esc(u.name)}</strong>${u.impact ? `<p>${esc(u.impact)}</p>` : ""}</div><time>${esc(u.date || "")}</time></div>`).join("")}</div>` : "";

  $("#rvBody").innerHTML = `
    <section class="rv-section rv-current tone-${esc(c.tone || "insufficient")}">
      <div class="rv-kicker">当前结论</div>
      <p class="rv-conclusion">${esc(c.conclusion || "正在整理该主体的公开证据。")}</p>
      <div class="rv-badges">
        ${rvBadge(esc(c.strengthText || "证据不足"))}
        ${rvBadge(c.visibilityText || "公开证据有限")}
        ${rvBadge(`证据 ${c.evidenceCount ?? 0} 条`)}
        ${rvBadge(`${c.channelCount ?? 0} 个平台有信号`)}
      </div>
      <p class="rv-hotlist">${esc(c.hotlistText || "")}</p>
    </section>

    <section class="rv-section">
      <div class="rv-kicker">趋势变化</div>
      <p class="rv-lead">${esc(ch.text || "")}</p>
      <div class="rv-badges">${changeBadges}</div>
      ${curveBlock}
      ${relatedBlock}
      ${forecastBlock}
    </section>

    <section class="rv-section">
      <div class="rv-kicker">关键驱动</div>
      ${rvResultList(view.drivers, "目前没有足够证据识别关键驱动。")}
    </section>

    <section class="rv-section">
      <div class="rv-kicker">平台表现</div>
      ${platformsBlock}
    </section>

    <section class="rv-section">
      <div class="rv-kicker">证据</div>
      ${evidenceBlock}
    </section>

    <section class="rv-section">
      <div class="rv-kicker">机会与风险</div>
      ${twoCol}
    </section>

    <section class="rv-section">
      <div class="rv-kicker">建议</div>
      ${suggestionsBlock}
      ${upcomingBlock}
      ${gapsBlock}
    </section>

    <section class="rv-section rv-actions-section">
      <div class="rv-kicker">操作</div>
      <div class="rv-action-bar">
        <button class="btn primary" id="rvWatch">${watching ? "★ 取消关注" : "☆ 加入关注"}</button>
        <button class="btn" id="rvMd">复制研究简报</button>
        <button class="btn" id="rvJson">复制结果 JSON</button>
        <button class="btn" id="rvCsv">复制 CSV</button>
        <button class="btn" id="rvRetry2">重新研究</button>
        <a class="btn" href="#/brief?topic=${encodeURIComponent(keyword)}">去写创作简报</a>
        <a class="btn" href="#/research">换个主体</a>
      </div>
      <p class="rv-data-note">${esc(view.dataNote || "")}</p>
    </section>`;

  bindDecisionActions(root, keyword, view, params);
}

function rvResultList(items, emptyText) {
  if (!items || !items.length) return empty(emptyText);
  return `<div class="rv-result-list">${items
    .map((x) => `<div class="rv-result"><strong>${esc(x.title || "—")}</strong>${x.reason ? `<p>${esc(x.reason)}</p>` : ""}</div>`)
    .join("")}</div>`;
}

function rvPlatform(p) {
  const ev = (p.evidence || []).slice(0, 3);
  const more = (p.evidence || []).length - ev.length;
  return `<div class="rv-platform state-${esc(p.state)}">
    <div class="rv-platform-head">
      <span class="state-dot" aria-hidden="true"></span>
      <strong class="rv-platform-name">${esc(p.name)}</strong>
      <span class="rv-platform-family">${esc(p.familyText)}</span>
      <span class="rv-platform-state">${esc(p.stateText)}${p.count ? ` · ${p.count} 条` : ""}</span>
    </div>
    ${p.conclusion ? `<p class="rv-platform-conclusion">${esc(p.conclusion)}</p>` : ""}
    ${ev.length ? `<div class="rv-platform-ev">${ev
      .map((e) => `<div class="rv-ev-item"><div class="rv-ev-meta">${esc(e.source || "公开来源")}${e.time ? ` · ${esc(fmtTime(e.time))}` : ""}</div><div class="rv-ev-title">${linkOrText(e.title, e.url)}</div></div>`)
      .join("")}${more > 0 ? `<p class="rv-cap">还有 ${more} 条已计入证据区。</p>` : ""}</div>` : ""}
    ${p.note ? `<p class="rv-cap">${esc(p.note)}</p>` : ""}
  </div>`;
}

function bindDecisionActions(root, keyword, view, params) {
  const setWatchBtn = (on) => {
    const labels = on ? ["★ 取消关注", "★ 已关注"] : ["☆ 加入关注", "☆ 加入关注"];
    const b1 = $("#rvWatch", root);
    const b2 = $("#rvWatchTop", root);
    if (b1) b1.textContent = labels[0];
    if (b2) b2.textContent = labels[1];
  };
  const toggleWatch = () => {
    const on = TH_STORE.toggleWatching(keyword);
    setWatchBtn(on);
    toast(on ? "已加入“正在关注”" : "已取消关注");
  };
  $("#rvWatch", root)?.addEventListener("click", toggleWatch);
  $("#rvWatchTop", root)?.addEventListener("click", toggleWatch);

  $("#rvJson", root)?.addEventListener("click", () =>
    copyText(JSON.stringify(view, null, 2), "研究结果 JSON 已复制"));

  const copyReport = async (format, label) => {
    try {
      const qs = new URLSearchParams({ keyword, format, refresh: "0", geo: params.geo || "CN", timeframe: params.timeframe || "today 3-m" });
      const r = await api(`/api/professional/report?${qs}`);
      copyText(typeof r.content === "string" ? r.content : JSON.stringify(r.content, null, 2), `${label}已复制`);
    } catch (e) {
      toast(`复制失败：${e.message}`);
    }
  };
  $("#rvMd", root)?.addEventListener("click", () => copyReport("markdown", "研究简报"));
  $("#rvCsv", root)?.addEventListener("click", () => copyReport("csv", "CSV"));
  $("#rvRetry2", root)?.addEventListener("click", () => VIEWS.research(root, params));
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
