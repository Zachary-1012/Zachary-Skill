/**
 * Creator Ops — local-first operating view for people who ship TrendHub without
 * having to interpret raw logs. This module deliberately does not restart,
 * deploy, upload telemetry, or invent provider-billing/user-growth data.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { config } from "../config.js";
import { SERVER_NAME, SERVER_VERSION } from "../server.js";
import { localObservabilitySnapshot } from "../observability/local.js";

type Severity = "info" | "attention" | "warning";

interface CostEntry {
  id: string;
  amountUsd: number;
  category: string;
  note: string;
  occurredAt: string;
  createdAt: string;
}

interface FeedbackEntry {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "normal" | "high" | "critical";
  createdAt: string;
  status: "open";
}

interface CreatorOpsStore {
  schemaVersion: 1;
  costs: CostEntry[];
  feedback: FeedbackEntry[];
}

export interface CreatorOpsInputCost {
  amountUsd?: unknown;
  category?: unknown;
  note?: unknown;
  occurredAt?: unknown;
}

export interface CreatorOpsInputFeedback {
  title?: unknown;
  detail?: unknown;
  severity?: unknown;
}

export class CreatorOpsInputError extends Error {}

const STORE_FILE = path.join(config.dataDir, "ops", "creator-ops.json");
let cpuPrevious: { usage: NodeJS.CpuUsage; at: bigint } | null = null;

function compactText(value: unknown, max: number, field: string, required = false): string {
  const text = String(value ?? "").trim();
  if (required && !text) throw new CreatorOpsInputError(`${field} is required`);
  if (text.length > max) throw new CreatorOpsInputError(`${field} must be at most ${max} characters`);
  return text;
}

/** Remove credentials before any locally persisted or rendered diagnostic text. */
export function redactSecretText(value: unknown): string {
  let text = String(value ?? "");
  text = text.replace(/(authorization\s*[:=]\s*(?:bearer\s+)?)([^\s,;]+)/gi, "$1[REDACTED]");
  text = text.replace(/(bearer\s+)([A-Za-z0-9._~+/=-]{8,})/gi, "$1[REDACTED]");
  text = text.replace(/([?&](?:access_?token|api_?key|key|secret|token|cookie|password)=)([^&#\s]+)/gi, "$1[REDACTED]");
  text = text.replace(/((?:api[_-]?key|secret|token|cookie|password|x-api-key)\s*[:=]\s*["']?)([^\s,"']+)/gi, "$1[REDACTED]");
  text = text.replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[REDACTED]");
  return text;
}

function newStore(): CreatorOpsStore {
  return { schemaVersion: 1, costs: [], feedback: [] };
}

function store(): CreatorOpsStore {
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) as Partial<CreatorOpsStore>;
    return {
      schemaVersion: 1,
      costs: Array.isArray(raw.costs) ? raw.costs.slice(-500) : [],
      feedback: Array.isArray(raw.feedback) ? raw.feedback.slice(-500) : [],
    };
  } catch {
    return newStore();
  }
}

function writeStore(value: CreatorOpsStore): void {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, STORE_FILE);
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function finiteAmount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
    throw new CreatorOpsInputError("amountUsd must be a number between 0 and 1000000");
  }
  return Math.round(n * 100) / 100;
}

function isoDate(value: unknown, field: string): string {
  if (value == null || String(value).trim() === "") return new Date().toISOString();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new CreatorOpsInputError(`${field} must be an ISO date/time`);
  return parsed.toISOString();
}

function readSourceHealth() {
  const fallback = {
    state: "unknown" as const,
    generatedAt: null as string | null,
    ageHours: null as number | null,
    hotSummary: null as { ok: number; degraded: number; missing: number } | null,
    detail: "尚未运行 source:health；外部信源当前状态不可判断。",
  };
  try {
    const source = JSON.parse(fs.readFileSync(path.join(config.dataDir, "health", "source-health-latest.json"), "utf8")) as {
      generatedAt?: string;
      hotSummary?: { ok?: number; degraded?: number; missing?: number };
    };
    const generatedAt = source.generatedAt && !Number.isNaN(Date.parse(source.generatedAt)) ? source.generatedAt : null;
    const ageHours = generatedAt ? Math.round(((Date.now() - Date.parse(generatedAt)) / 3_600_000) * 10) / 10 : null;
    const hotSummary = source.hotSummary && [source.hotSummary.ok, source.hotSummary.degraded, source.hotSummary.missing].every(Number.isFinite)
      ? { ok: Number(source.hotSummary.ok), degraded: Number(source.hotSummary.degraded), missing: Number(source.hotSummary.missing) }
      : null;
    const state = !generatedAt ? "unknown" : (ageHours ?? Infinity) > 48 ? "stale" : (hotSummary?.missing ?? 0) > 0 ? "attention" : "healthy";
    return {
      state,
      generatedAt,
      ageHours,
      hotSummary,
      detail: state === "stale" ? "最近 source-health 报告超过 48 小时。" : "Source Health 报告来自真实外部拉取，不等同于代码 CI。",
    };
  } catch {
    return fallback;
  }
}

function storageSnapshot() {
  try {
    const stat = fs.statfsSync(config.dataDir) as unknown as { bsize?: number; blocks?: number; bavail?: number };
    const totalBytes = Number(stat.bsize ?? 0) * Number(stat.blocks ?? 0);
    const availableBytes = Number(stat.bsize ?? 0) * Number(stat.bavail ?? 0);
    if (!Number.isFinite(totalBytes) || totalBytes <= 0 || !Number.isFinite(availableBytes)) throw new Error("statfs unavailable");
    return {
      state: availableBytes / totalBytes < 0.1 ? "attention" : "healthy",
      totalBytes,
      availableBytes,
      availablePercent: Math.round((availableBytes / totalBytes) * 10_000) / 100,
      scope: "TrendHub data volume filesystem, not a cloud-account quota",
    };
  } catch {
    return {
      state: "unknown",
      totalBytes: null,
      availableBytes: null,
      availablePercent: null,
      scope: "Filesystem capacity is unavailable in this runtime.",
    };
  }
}

function cpuSnapshot() {
  const now = process.hrtime.bigint();
  const current = process.cpuUsage();
  const previous = cpuPrevious;
  cpuPrevious = { usage: current, at: now };
  if (!previous) return { state: "warming_up", processPercent: null, scope: "Node process CPU only; host CPU is not inferred." };
  const usedMicros = (current.user - previous.usage.user) + (current.system - previous.usage.system);
  const wallMicros = Number(now - previous.at) / 1_000;
  const processPercent = wallMicros > 0 ? Math.round((usedMicros / wallMicros) * 1000) / 10 : null;
  return { state: "observed", processPercent, scope: "Node process CPU only; host CPU is not inferred." };
}

function monthStart(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

function costSummary(data: CreatorOpsStore) {
  const active = data.costs.filter((entry) => Date.parse(entry.occurredAt) >= monthStart());
  const trackedUsd = Math.round(active.reduce((sum, entry) => sum + Number(entry.amountUsd || 0), 0) * 100) / 100;
  const rawBudget = Number(process.env.TRENTHUB_OPS_MONTHLY_BUDGET_USD);
  const budgetUsd = Number.isFinite(rawBudget) && rawBudget >= 0 ? Math.round(rawBudget * 100) / 100 : null;
  return {
    tracking: active.length ? "manual" : "not_connected",
    actualProviderBilling: "not_connected",
    monthTrackedUsd: active.length ? trackedUsd : null,
    monthEntryCount: active.length,
    budgetUsd,
    budgetState: budgetUsd == null ? "not_configured" : trackedUsd > budgetUsd ? "over_budget" : "within_budget",
    note: active.length
      ? "金额来自本地手工录入，不是云厂商账单 API。"
      : "尚未接入账单数据；未填写不表示成本为 0。",
  };
}

function safeBuildSha(): string | null {
  const candidate = process.env.TRENTHUB_BUILD_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
  return /^[a-f0-9]{7,64}$/i.test(candidate) ? candidate : null;
}

function diagnostic(severity: Severity, title: string, detail: string, action: string) {
  return { severity, title, detail, action, automatic: false };
}

export function creatorOpsSummary() {
  const data = store();
  const observation = localObservabilitySnapshot();
  const sources = readSourceHealth();
  const storage = storageSnapshot();
  const cpu = cpuSnapshot();
  const costs = costSummary(data);
  const recentErrors = observation.apiRoutes.filter((route) => route.errors > 0).slice(0, 8);
  const diagnostics = [] as ReturnType<typeof diagnostic>[];
  if (sources.state === "unknown" || sources.state === "stale") diagnostics.push(diagnostic("attention", "信源健康尚未确认", sources.detail, "在受控网络环境运行 npm run source:health；不要把单次第三方失败当作代码发布失败。"));
  if ((sources.hotSummary?.missing ?? 0) > 0) diagnostics.push(diagnostic("attention", "存在暂不可用信源", `最近报告中 missing=${sources.hotSummary?.missing}。`, "查看 Source Reliability 与平台授权状态；不要伪造缺失数据。"));
  if (storage.state === "attention") diagnostics.push(diagnostic("warning", "数据卷可用空间偏低", `可用空间 ${storage.availablePercent}%。`, "扩容持久化卷或按留存策略清理可再生成的历史；先备份再操作。"));
  if (recentErrors.length) diagnostics.push(diagnostic("attention", "本进程观察到 API 错误", `${recentErrors.map((r) => `${r.name}: ${r.errors}/${r.count}`).join("；")}`, "在本地复现对应请求并查看脱敏错误；不要把请求内容或 Token 贴进诊断。"));
  if (costs.tracking === "not_connected") diagnostics.push(diagnostic("info", "成本尚未接入", costs.note, "可在此页录入月度成本，并用 TRENTHUB_OPS_MONTHLY_BUDGET_USD 设置本地预算阈值。"));
  if (!safeBuildSha()) diagnostics.push(diagnostic("info", "构建来源未验证", "运行环境没有可验证的 build SHA。", "在 CI/托管平台注入 TRENTHUB_BUILD_SHA 或使用平台提供的 commit SHA；不要手写已验证。"));

  const overall = diagnostics.some((item) => item.severity === "warning") ? "attention" : diagnostics.some((item) => item.severity === "attention") ? "needs_review" : "healthy";
  const memory = observation.gauges;
  return {
    schema: "trendhub-creator-ops-v1",
    generatedAt: new Date().toISOString(),
    scope: {
      mode: "local-only",
      telemetry: false,
      remoteExport: false,
      actions: "advisory-only; no restart, deploy, rollback, delete, or credential access is performed",
    },
    overall,
    runtime: {
      service: SERVER_NAME,
      version: SERVER_VERSION,
      startedAt: observation.startedAt,
      uptimeSeconds: observation.gauges["process.uptime.seconds"],
      memory: {
        rssBytes: observation.gauges["process.memory.rss.bytes"],
        heapUsedBytes: observation.gauges["process.memory.heap.used.bytes"],
        heapTotalBytes: observation.gauges["process.memory.heap.total.bytes"],
      },
      cpu,
    },
    delivery: {
      buildSha: safeBuildSha(),
      buildVerified: Boolean(safeBuildSha()),
      releaseStatus: "runtime-observed; release/publish state is not inferred from this process",
    },
    storage,
    sources,
    requests: {
      apiRoutes: observation.apiRoutes,
      mcpTools: observation.mcpTools,
      recentErrorRoutes: recentErrors,
    },
    costs,
    feedback: {
      openCount: data.feedback.length,
      latest: data.feedback.slice(-20).reverse(),
      privacy: "Feedback is local-only and secret-redacted before persistence.",
    },
    diagnostics,
  };
}

export function listCreatorOpsEvents() {
  const data = store();
  return {
    schema: "trendhub-creator-ops-events-v1",
    generatedAt: new Date().toISOString(),
    costs: data.costs.slice(-100).reverse(),
    feedback: data.feedback.slice(-100).reverse(),
    privacy: "All text is redacted before persistence. This endpoint is local-only.",
  };
}

export function addCreatorOpsCost(input: CreatorOpsInputCost) {
  const data = store();
  const entry: CostEntry = {
    id: id("cost"),
    amountUsd: finiteAmount(input.amountUsd),
    category: redactSecretText(compactText(input.category || "Other", 60, "category", true)),
    note: redactSecretText(compactText(input.note || "", 280, "note")),
    occurredAt: isoDate(input.occurredAt, "occurredAt"),
    createdAt: new Date().toISOString(),
  };
  data.costs.push(entry);
  data.costs = data.costs.slice(-500);
  writeStore(data);
  return entry;
}

export function addCreatorOpsFeedback(input: CreatorOpsInputFeedback) {
  const severity = compactText(input.severity || "normal", 12, "severity").toLowerCase();
  if (!(["low", "normal", "high", "critical"] as string[]).includes(severity)) {
    throw new CreatorOpsInputError("severity must be low, normal, high, or critical");
  }
  const entry: FeedbackEntry = {
    id: id("feedback"),
    title: redactSecretText(compactText(input.title, 120, "title", true)),
    detail: redactSecretText(compactText(input.detail, 4_000, "detail", true)),
    severity: severity as FeedbackEntry["severity"],
    createdAt: new Date().toISOString(),
    status: "open",
  };
  const data = store();
  data.feedback.push(entry);
  data.feedback = data.feedback.slice(-500);
  writeStore(data);
  return entry;
}

export function creatorOpsReport() {
  const summary = creatorOpsSummary();
  const source = summary.sources.hotSummary
    ? `OK ${summary.sources.hotSummary.ok} / degraded ${summary.sources.hotSummary.degraded} / missing ${summary.sources.hotSummary.missing}`
    : "未运行或无法读取 source:health";
  const cost = summary.costs.monthTrackedUsd == null ? "未接入账单或手工成本" : `$${summary.costs.monthTrackedUsd.toFixed(2)}（手工录入）`;
  const actions = summary.diagnostics.length
    ? summary.diagnostics.map((item, index) => `${index + 1}. [${item.severity}] ${item.title}：${item.action}`).join("\n")
    : "1. 当前没有本地规则触发的待处理项；仍应使用独立外部可用性监控验证公网入口。";
  return {
    schema: "trendhub-creator-ops-report-v1",
    generatedAt: summary.generatedAt,
    summary,
    markdown: `# TrendHub Creator Ops Brief\n\n- 运行版本：${summary.runtime.version}\n- 构建来源：${summary.delivery.buildSha ?? "未验证"}\n- 进程运行：${summary.runtime.uptimeSeconds}s；RSS ${summary.runtime.memory.rssBytes} bytes\n- 信源健康：${source}\n- 本月成本：${cost}\n- 开放反馈：${summary.feedback.openCount}\n\n## 建议动作\n${actions}\n\n## 边界\n本报告仅基于本地运行时、脱敏事件与已接入的手工数据生成；不代表云账单、真实用户增长、第三方平台实时可用性或已完成发布。不会自动执行重启、部署、回滚或删除。`,
  };
}
