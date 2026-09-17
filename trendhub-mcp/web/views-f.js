/* Creator Ops view. It deliberately distinguishes secure local controls from the public read-only console. */
"use strict";

TITLES.ops = "运行与交付";

function opsBytes(value) {
  if (value == null || !Number.isFinite(Number(value))) return "未观测";
  const n = Number(value); const units = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let x = n;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
  return `${x >= 100 || i === 0 ? Math.round(x) : x.toFixed(1)} ${units[i]}`;
}
function opsState(state) {
  return ({ healthy: "正常", needs_review: "需要查看", attention: "注意", stale: "过期", unknown: "未确认", observed: "已观测", warming_up: "采样中", not_connected: "未接入", within_budget: "预算内", over_budget: "超预算" })[state] || state || "—";
}
function opsCard(title, value, detail) {
  return `<div class="ops-card"><h3>${esc(title)}</h3><div class="ops-value">${esc(value)}</div><div class="ops-detail">${esc(detail || "")}</div></div>`;
}
function opsDiagnostics(items) {
  if (!items || !items.length) return empty("当前没有本地规则触发的待处理项");
  return `<div class="ops-list">${items.map((item) => `<div class="ops-diagnostic ${esc(item.severity)}"><strong>${esc(item.title)}</strong><div class="ops-detail">${esc(item.detail)}</div><div class="ops-detail">建议：${esc(item.action)}</div></div>`).join("")}</div>`;
}
function opsEvents(events) {
  const rows = [
    ...(events.feedback || []).map((x) => ({ kind: "反馈", title: x.title, body: x.detail, at: x.createdAt, tag: x.severity })),
    ...(events.costs || []).map((x) => ({ kind: "成本", title: `$${Number(x.amountUsd).toFixed(2)} · ${x.category}`, body: x.note || "无备注", at: x.occurredAt, tag: "manual" })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20);
  return rows.length ? `<div class="ops-list">${rows.map((row) => `<div class="ops-event"><div class="ops-event-head"><strong>${esc(row.kind)} · ${esc(row.title)}</strong><span class="meta">${esc(row.tag)} · ${esc(fmtTime(row.at))}</span></div><div class="ops-detail">${esc(row.body)}</div></div>`).join("")}</div>` : empty("尚无本地成本或反馈事件");
}

VIEWS.ops = async function (root) {
  if (window.TRENHUB_IS_REMOTE) {
    let health = null;
    try { health = await api("/health"); } catch { /* public health may be transiently unavailable */ }
    root.innerHTML = `${note("info", "Creator Ops 的运行明细、成本和反馈是本地/受保护数据；公网控制台不暴露它们，也不接受写入。")}
      <div class="card"><div class="ops-hero"><div><h2>公网交付状态</h2><p class="sub">这里仅显示公共健康入口，不能据此推断账单、日志、CPU、用户增长或发布是否完成。</p></div><button class="btn" id="opsRemoteRefresh">刷新</button></div>
      <div class="ops-grid">${opsCard("服务版本", health?.version || "未确认", health ? "来自公开 /health" : "公开 health 未返回")}${opsCard("MCP 工具", health?.tools ?? "未确认", "只代表网关报告")}${opsCard("快照调度", health?.snapshotScheduler?.enabled ? "已启用" : "未启用/未确认", "调度不等于全部外部信源可用")}${opsCard("安全边界", "只读", "/api/ops/* 不在公网 allowlist")}</div>
      <p class="sub">生产可用性应由独立的外部探针验证；本地 Creator Ops 可录入成本、查看脱敏反馈、生成交付报告，并且不会自动重启或发布。</p></div>`;
    $("#opsRemoteRefresh").onclick = () => VIEWS.ops(root);
    return;
  }

  root.innerHTML = `<div id="opsResult">${loading()}</div>`;
  const load = async () => {
    const target = $("#opsResult"); target.innerHTML = loading();
    try {
      const [summary, events, report] = await Promise.all([api("/api/ops/summary"), api("/api/ops/events"), api("/api/ops/report")]);
      const s = summary.sources || {}; const r = summary.runtime || {}; const c = summary.costs || {}; const storage = summary.storage || {};
      const cpu = r.cpu || {}; const feedback = summary.feedback || {};
      const sourceText = s.hotSummary ? `OK ${s.hotSummary.ok} / 降级 ${s.hotSummary.degraded} / 缺失 ${s.hotSummary.missing}` : opsState(s.state);
      const costValue = c.monthTrackedUsd == null ? "未接入" : `$${Number(c.monthTrackedUsd).toFixed(2)}`;
      target.innerHTML = `
        <div class="card"><div class="ops-hero"><div><h2>Creator Ops <span class="badge neutral">LOCAL</span></h2><p class="sub">给 Creator 的可读运行、交付、成本和反馈视图。仅用本机数据；不会上传遥测、读取 Cookie/Secret、自动重启、发布或删除。</p></div><button class="btn" id="opsRefresh">刷新状态</button></div>
          <div class="ops-grid">${opsCard("总状态", opsState(summary.overall), "仅基于本地规则和已接入证据")}${opsCard("进程内存", opsBytes(r.memory?.rssBytes), `heap ${opsBytes(r.memory?.heapUsedBytes)} · uptime ${r.uptimeSeconds ?? "—"}s`)}${opsCard("进程 CPU", cpu.processPercent == null ? "采样中" : `${cpu.processPercent}%`, cpu.scope)}${opsCard("数据卷", storage.availablePercent == null ? "未观测" : `${storage.availablePercent}% 可用`, storage.scope)}${opsCard("信源健康", sourceText, s.detail)}${opsCard("本月成本", costValue, c.note)}${opsCard("开放反馈", feedback.openCount ?? 0, feedback.privacy)}${opsCard("构建来源", summary.delivery?.buildSha || "未验证", summary.delivery?.releaseStatus)}</div>
        </div>
        <div class="grid-2"><div class="card"><h2>诊断与建议</h2>${opsDiagnostics(summary.diagnostics)}</div><div class="card"><h2>最近事件</h2>${opsEvents(events)}</div></div>
        <div class="grid-2"><div class="card"><h2>登记成本</h2><p class="sub">手工录入用于看预算趋势，不会冒充云厂商账单。</p><div class="form-row"><input id="opsCostAmount" inputmode="decimal" placeholder="金额 USD，例如 12.50"/><input id="opsCostCategory" placeholder="类别，例如 Hosting"/><input id="opsCostNote" placeholder="可选备注（自动脱敏）"/><button class="btn primary" id="opsCostSave">保存成本</button></div></div>
        <div class="card"><h2>提交 Bug / 反馈</h2><p class="sub">只保存到本地运行数据；Bearer Token、Cookie、key 等会在落盘前脱敏。</p><div class="form-row"><input id="opsFeedbackTitle" placeholder="简短标题"/><select id="opsFeedbackSeverity"><option value="normal">普通</option><option value="high">高</option><option value="critical">严重</option><option value="low">低</option></select><input id="opsFeedbackDetail" placeholder="复现现象或用户反馈（请勿主动粘贴密钥）"/><button class="btn primary" id="opsFeedbackSave">保存反馈</button></div></div></div>
        <div class="card"><div class="ops-hero"><div><h2>交付简报</h2><p class="sub">基于以上可验证的本地信号生成；可复制给负责决策或处理运维的人。</p></div><button class="btn" id="opsCopyReport">复制简报</button></div><textarea id="opsReport" class="ops-report" readonly>${esc(report.markdown || "")}</textarea></div>`;
      $("#opsRefresh").onclick = load;
      $("#opsCopyReport").onclick = () => copyText($("#opsReport").value, "交付简报已复制");
      $("#opsCostSave").onclick = async () => {
        try { await api("/api/ops/costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountUsd: $("#opsCostAmount").value, category: $("#opsCostCategory").value || "Other", note: $("#opsCostNote").value }) }); toast("成本已本地保存"); await load(); } catch (e) { toast(`保存失败：${e.message}`); }
      };
      $("#opsFeedbackSave").onclick = async () => {
        try { await api("/api/ops/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: $("#opsFeedbackTitle").value, detail: $("#opsFeedbackDetail").value, severity: $("#opsFeedbackSeverity").value }) }); toast("反馈已本地保存并脱敏"); await load(); } catch (e) { toast(`保存失败：${e.message}`); }
      };
    } catch (e) { target.innerHTML = note("err", `Creator Ops 加载失败：${esc(e.message)}`); }
  };
  await load();
};
