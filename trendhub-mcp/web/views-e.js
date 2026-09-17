/* Professional Intelligence v2 views — development branch only. */
"use strict";

TITLES.professional = "专业趋势情报";
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

VIEWS.professional = async (root, params) => {
  const initial = params.keyword || "";
  root.innerHTML = `
    <div class="card">
      <h2>Professional Intelligence v2 <span class="badge neutral">DEV</span></h2>
      <p class="sub">Evidence-first：生命周期 + 异常 + 可回测预测 + 受众/创作者代理 + 媒体证据 + 告警 + 高管报告。预测不是概率；证据不足时直接拒绝预测。</p>
      <div class="form-row">
        <input id="proKeyword" value="${esc(initial)}" placeholder="输入话题 / 关键词" />
        <input id="proPlatforms" placeholder="可选平台：xiaohongshu,weibo,bilibili…" />
        <button class="btn primary" id="proRun">生成专业情报</button>
      </div>
    </div>
    <div id="proResult">${initial ? loading() : empty("输入关键词后生成专业情报")}</div>`;

  const run = async () => {
    const keyword = $("#proKeyword").value.trim();
    if (!keyword) return toast("请输入关键词");
    const platforms = $("#proPlatforms").value.trim();
    const target = $("#proResult");
    target.innerHTML = loading();
    try {
      const qs = new URLSearchParams({ keyword });
      if (platforms) qs.set("platforms", platforms);
      const d = await api(`/api/professional?${qs}`);
      const core = d.core || {};
      const metrics = core.metrics || {};
      const f = d.forecast || {};
      const audience = d.audience || {};
      const media = d.media || {};
      const alerts = d.alerts || {};
      const series = (f.recentSeries || []).map((x) => ({ date: x.at, value: x.value }));
      target.innerHTML = `
        <div class="stats-grid">
          ${scoreCard("生命周期", core.lifecycle || "—", `置信度 ${core.confidence ?? "—"}`)}
          ${scoreCard("速度", pct(metrics.velocityScore), "0–100")}
          ${scoreCard("扩散", pct(metrics.diffusionScore), "0–100")}
          ${scoreCard("持续性", pct(metrics.persistenceScore), "0–100")}
          ${scoreCard("信源可靠度", pct(metrics.sourceReliabilityScore), "0–100")}
          ${scoreCard("预测验证", f.validation?.grade || "—", f.status || "")}
        </div>
        <div class="grid-2">
          <div class="card"><h2>趋势信号与异常</h2>
            ${series.length ? lineChart([{ name: keyword, points: series }]) : empty("历史不足")}
            <p class="sub">异常：${esc(f.anomaly?.direction || "none")} · robust z=${esc(f.anomaly?.robustZ ?? "—")} · bucket=${esc(f.bucketHours ?? "—")}h</p>
          </div>
          <div class="card"><h2>6–72h 条件预测</h2>${forecastTable(f.forecast)}<p class="sub">Holdout MAE=${esc(f.validation?.mae ?? "—")} · sMAPE=${esc(f.validation?.smape ?? "—")} · grade=${esc(f.validation?.grade || "—")}</p></div>
        </div>
        <div class="grid-2">
          <div class="card"><h2>公开证据受众 / 创作者</h2>
            <p class="sub">非人口学面板，不推断敏感属性。匹配内容 ${esc(audience.evidence?.matchedItems ?? 0)} · 创作者 ${esc(audience.evidence?.creatorsObserved ?? 0)}</p>
            ${renderAny((audience.creatorSignals || []).slice(0, 12))}
          </div>
          <div class="card"><h2>媒体证据</h2>
            <p class="sub">证据 ${esc(media.evidenceCount ?? 0)} · 图片 ${esc(media.imageEvidenceCount ?? 0)} · Multimodal caller ready=${esc(media.multimodal?.callerAiReady ?? false)}</p>
            ${renderAny((media.items || []).slice(0, 12))}
          </div>
        </div>
        <div class="grid-2">
          ${flagList("机会信号", d.decisionState?.opportunityFlags, "ok")}
          ${flagList("风险信号", d.decisionState?.riskFlags, "missing")}
        </div>
        <div class="card"><h2>专业告警</h2>${renderAny(alerts.triggered || [])}</div>
        <div class="card"><h2>报告与交付</h2>
          <div class="form-row"><button class="btn" id="proJson">复制 JSON 报告</button><button class="btn" id="proMd">复制 Markdown 报告</button><button class="btn" id="proCsv">复制 CSV</button></div>
          <p class="sub">报告严格绑定 evidenceRef / caveats，不自动生成未经证据支持的因果解释。</p>
        </div>`;
      const copyReport = async (format) => {
        const qs2 = new URLSearchParams({ keyword, format });
        if (platforms) qs2.set("platforms", platforms);
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

VIEWS.workspace = async (root) => {
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
