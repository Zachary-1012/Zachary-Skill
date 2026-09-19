/**
 * Local-first professional collaboration and evidence-to-learning loop.
 *
 * This module intentionally does not create a cloud identity service. A local
 * installation may map its own authenticated principal into these roles.
 * The public hosted Remote MCP is effect-fenced from every workspace read/write
 * operation so anonymous remote callers cannot mutate or inspect local workspace data.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { TRUTH_POLICY, isTruthState, type TruthState } from "../agent-native/truth-state.js";

export type WorkspaceRole = "owner" | "editor" | "analyst" | "viewer";
export type WorkspaceAction =
  | "workspace.create"
  | "workspace.update"
  | "workspace.read"
  | "member.manage"
  | "watchlist.manage"
  | "query.manage"
  | "rule.manage"
  | "report.manage"
  | "trace.manage"
  | "outcome.manage"
  | "evaluation.manage"
  | "learning.read"
  | "audit.read";

export interface WorkspaceMember {
  principal: string;
  role: WorkspaceRole;
  addedAt: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  keyword: string;
  platforms: string[];
  geo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceAlertRule {
  id: string;
  name: string;
  keyword: string;
  rule: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationTraceRecord {
  id: string;
  topic: string;
  capability: string;
  artifactId: string | null;
  evidenceRefs: string[];
  learningAssetIds: string[];
  createdAt: string;
}

export interface OutcomeObservation {
  id: string;
  traceId: string;
  observedAt: string;
  metrics: Record<string, number | null>;
  truth: Record<string, TruthState>;
  note: string | null;
  createdAt: string;
}

export type EvaluationResult = "SUPPORTED" | "CONTRADICTED" | "INSUFFICIENT";
export type LearningAssetState = "DRAFT" | "EXPERIMENT" | "SUPPORTED" | "REJECT" | "INSUFFICIENT_EVIDENCE" | "DEPRECATED";

export interface EvaluationRecord {
  id: string;
  traceId: string;
  outcomeIds: string[];
  result: EvaluationResult;
  rationale: string;
  evidenceRefs: string[];
  learningAssetId: string;
  createdAt: string;
}

export interface LearningAsset {
  id: string;
  topic: string;
  title: string;
  state: LearningAssetState;
  version: number;
  evidenceRefs: string[];
  evaluationIds: string[];
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members: WorkspaceMember[];
  watchlist: string[];
  savedQueries: SavedQuery[];
  alertRules: WorkspaceAlertRule[];
  reportPresets: Array<{ id: string; name: string; config: Record<string, unknown>; updatedAt: string }>;
  applicationTraces: ApplicationTraceRecord[];
  outcomes: OutcomeObservation[];
  evaluations: EvaluationRecord[];
  learningAssets: LearningAsset[];
}

export interface AuditEvent {
  id: string;
  at: string;
  workspaceId: string;
  principal: string;
  action: WorkspaceAction;
  target: string | null;
  result: "allowed" | "denied";
  details?: Record<string, unknown>;
}

interface WorkspaceFile {
  version: 1;
  workspaces: Workspace[];
  audit: AuditEvent[];
}

const FILE = path.join(config.dataDir, "workspaces.json");
const MAX_AUDIT = 5000;

const PERMISSIONS: Record<WorkspaceRole, ReadonlySet<WorkspaceAction>> = {
  owner: new Set(["workspace.create", "workspace.update", "workspace.read", "member.manage", "watchlist.manage", "query.manage", "rule.manage", "report.manage", "trace.manage", "outcome.manage", "evaluation.manage", "learning.read", "audit.read"]),
  editor: new Set(["workspace.update", "workspace.read", "watchlist.manage", "query.manage", "rule.manage", "report.manage", "trace.manage", "outcome.manage", "evaluation.manage", "learning.read", "audit.read"]),
  analyst: new Set(["workspace.read", "watchlist.manage", "query.manage", "rule.manage", "report.manage", "trace.manage", "outcome.manage", "evaluation.manage", "learning.read"]),
  viewer: new Set(["workspace.read", "learning.read"]),
};

function assertLocalWorkspaceBoundary(): void {
  if (process.env.TRENHUB_PUBLIC_REMOTE === "1") {
    throw new Error("workspace_manage is local-only and effect-fenced on the public Remote MCP");
  }
}

function emptyFile(): WorkspaceFile {
  return { version: 1, workspaces: [], audit: [] };
}

function normalizeWorkspace(workspace: Workspace): Workspace {
  return {
    ...workspace,
    members: Array.isArray(workspace.members) ? workspace.members : [],
    watchlist: Array.isArray(workspace.watchlist) ? workspace.watchlist : [],
    savedQueries: Array.isArray(workspace.savedQueries) ? workspace.savedQueries : [],
    alertRules: Array.isArray(workspace.alertRules) ? workspace.alertRules : [],
    reportPresets: Array.isArray(workspace.reportPresets) ? workspace.reportPresets : [],
    applicationTraces: Array.isArray(workspace.applicationTraces) ? workspace.applicationTraces : [],
    outcomes: Array.isArray(workspace.outcomes) ? workspace.outcomes : [],
    evaluations: Array.isArray(workspace.evaluations) ? workspace.evaluations : [],
    learningAssets: Array.isArray(workspace.learningAssets) ? workspace.learningAssets : [],
  };
}

function readFile(): WorkspaceFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as WorkspaceFile;
    if (parsed?.version === 1 && Array.isArray(parsed.workspaces) && Array.isArray(parsed.audit)) {
      return { ...parsed, workspaces: parsed.workspaces.map(normalizeWorkspace) };
    }
  } catch {
    // First run or malformed file; callers get a clean local store.
  }
  return emptyFile();
}

function atomicWrite(value: WorkspaceFile): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, FILE);
}

function cleanPrincipal(value: string): string {
  const principal = String(value ?? "").trim().slice(0, 160);
  if (!principal) throw new Error("principal is required");
  return principal;
}

function cleanName(value: string, label = "name"): string {
  const name = String(value ?? "").trim().slice(0, 160);
  if (!name) throw new Error(`${label} is required`);
  return name;
}

function cleanStringList(values: string[], limit = 500): string[] {
  return [...new Set((values ?? []).map(String).map((value) => value.trim()).filter(Boolean).map((value) => value.slice(0, 500)))].slice(0, limit);
}

function roleOf(workspace: Workspace, principal: string): WorkspaceRole | null {
  return workspace.members.find((member) => member.principal === principal)?.role ?? null;
}

function audit(data: WorkspaceFile, workspaceId: string, principal: string, action: WorkspaceAction, result: AuditEvent["result"], target: string | null, details?: Record<string, unknown>): void {
  data.audit.push({ id: randomUUID(), at: new Date().toISOString(), workspaceId, principal, action, target, result, details });
  data.audit = data.audit.slice(-MAX_AUDIT);
}

function requireAction(data: WorkspaceFile, workspace: Workspace, principal: string, action: WorkspaceAction, target: string | null = null): void {
  const role = roleOf(workspace, principal);
  const allowed = role != null && PERMISSIONS[role].has(action);
  audit(data, workspace.id, principal, action, allowed ? "allowed" : "denied", target, { role });
  if (!allowed) {
    atomicWrite(data);
    throw new Error(`workspace access denied: role=${role ?? "none"} action=${action}`);
  }
}

function getMutable(data: WorkspaceFile, workspaceId: string): Workspace {
  const workspace = data.workspaces.find((item) => item.id === workspaceId);
  if (!workspace) throw new Error(`workspace not found: ${workspaceId}`);
  return workspace;
}

function publicWorkspace(workspace: Workspace): Workspace {
  return JSON.parse(JSON.stringify(workspace)) as Workspace;
}

export function createWorkspace(name: string, principalInput: string): Workspace {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const now = new Date().toISOString();
  const data = readFile();
  const workspace: Workspace = {
    id: randomUUID(),
    name: cleanName(name, "workspace name"),
    createdAt: now,
    updatedAt: now,
    members: [{ principal, role: "owner", addedAt: now }],
    watchlist: [],
    savedQueries: [],
    alertRules: [],
    reportPresets: [],
    applicationTraces: [],
    outcomes: [],
    evaluations: [],
    learningAssets: [],
  };
  data.workspaces.push(workspace);
  audit(data, workspace.id, principal, "workspace.create", "allowed", workspace.id);
  atomicWrite(data);
  return publicWorkspace(workspace);
}

export function listWorkspaces(principalInput: string): Array<{ id: string; name: string; role: WorkspaceRole; updatedAt: string }> {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  return readFile().workspaces
    .map((workspace) => ({ workspace, role: roleOf(workspace, principal) }))
    .filter((x): x is { workspace: Workspace; role: WorkspaceRole } => x.role != null)
    .map(({ workspace, role }) => ({ id: workspace.id, name: workspace.name, role, updatedAt: workspace.updatedAt }));
}

export function readWorkspace(workspaceId: string, principalInput: string): Workspace {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "workspace.read", workspaceId);
  atomicWrite(data);
  return publicWorkspace(workspace);
}

export function upsertMember(workspaceId: string, principalInput: string, memberPrincipalInput: string, role: WorkspaceRole): Workspace {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const memberPrincipal = cleanPrincipal(memberPrincipalInput);
  if (!(role in PERMISSIONS)) throw new Error(`invalid workspace role: ${role}`);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "member.manage", memberPrincipal);
  const existing = workspace.members.find((member) => member.principal === memberPrincipal);
  if (existing) existing.role = role;
  else workspace.members.push({ principal: memberPrincipal, role, addedAt: new Date().toISOString() });
  workspace.updatedAt = new Date().toISOString();
  audit(data, workspace.id, principal, "member.manage", "allowed", memberPrincipal, { role });
  atomicWrite(data);
  return publicWorkspace(workspace);
}

export function setWatchlist(workspaceId: string, principalInput: string, keywords: string[]): Workspace {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "watchlist.manage", workspaceId);
  workspace.watchlist = cleanStringList(keywords, 500).map((value) => value.slice(0, 160));
  workspace.updatedAt = new Date().toISOString();
  audit(data, workspace.id, principal, "watchlist.manage", "allowed", workspaceId, { count: workspace.watchlist.length });
  atomicWrite(data);
  return publicWorkspace(workspace);
}

export function saveQuery(workspaceId: string, principalInput: string, input: Omit<SavedQuery, "id" | "createdAt" | "updatedAt"> & { id?: string }): SavedQuery {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "query.manage", input.id ?? null);
  const now = new Date().toISOString();
  const existing = input.id ? workspace.savedQueries.find((query) => query.id === input.id) : undefined;
  const query: SavedQuery = existing ?? { id: input.id || randomUUID(), name: "", keyword: "", platforms: [], createdAt: now, updatedAt: now };
  query.name = cleanName(input.name, "query name");
  query.keyword = cleanName(input.keyword, "keyword").slice(0, 160);
  query.platforms = cleanStringList(input.platforms ?? [], 50);
  query.geo = input.geo?.trim().slice(0, 24) || undefined;
  query.updatedAt = now;
  if (!existing) workspace.savedQueries.push(query);
  workspace.updatedAt = now;
  audit(data, workspace.id, principal, "query.manage", "allowed", query.id, { name: query.name });
  atomicWrite(data);
  return JSON.parse(JSON.stringify(query)) as SavedQuery;
}

export function saveAlertRule(workspaceId: string, principalInput: string, input: Omit<WorkspaceAlertRule, "id" | "createdAt" | "updatedAt"> & { id?: string }): WorkspaceAlertRule {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "rule.manage", input.id ?? null);
  const now = new Date().toISOString();
  const existing = input.id ? workspace.alertRules.find((rule) => rule.id === input.id) : undefined;
  const rule: WorkspaceAlertRule = existing ?? { id: input.id || randomUUID(), name: "", keyword: "", rule: {}, enabled: true, createdAt: now, updatedAt: now };
  rule.name = cleanName(input.name, "rule name");
  rule.keyword = cleanName(input.keyword, "keyword").slice(0, 160);
  rule.rule = JSON.parse(JSON.stringify(input.rule ?? {})) as Record<string, unknown>;
  rule.enabled = Boolean(input.enabled);
  rule.updatedAt = now;
  if (!existing) workspace.alertRules.push(rule);
  workspace.updatedAt = now;
  audit(data, workspace.id, principal, "rule.manage", "allowed", rule.id, { name: rule.name, enabled: rule.enabled });
  atomicWrite(data);
  return JSON.parse(JSON.stringify(rule)) as WorkspaceAlertRule;
}

export function recordApplicationTrace(
  workspaceId: string,
  principalInput: string,
  input: { traceId?: string; topic: string; capability?: string; artifactId?: string | null; evidenceRefs?: string[]; learningAssetIds?: string[] },
): ApplicationTraceRecord {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  const id = String(input.traceId || randomUUID()).trim().slice(0, 160);
  requireAction(data, workspace, principal, "trace.manage", id);
  const existing = workspace.applicationTraces.find((row) => row.id === id);
  if (existing) return JSON.parse(JSON.stringify(existing)) as ApplicationTraceRecord;
  const record: ApplicationTraceRecord = {
    id,
    topic: cleanName(input.topic, "topic"),
    capability: String(input.capability || "get_content_brief").trim().slice(0, 160),
    artifactId: input.artifactId ? String(input.artifactId).trim().slice(0, 240) : null,
    evidenceRefs: cleanStringList(input.evidenceRefs ?? [], 1000),
    learningAssetIds: cleanStringList(input.learningAssetIds ?? [], 200),
    createdAt: new Date().toISOString(),
  };
  workspace.applicationTraces.push(record);
  workspace.applicationTraces = workspace.applicationTraces.slice(-5000);
  workspace.updatedAt = record.createdAt;
  audit(data, workspace.id, principal, "trace.manage", "allowed", record.id, { evidenceCount: record.evidenceRefs.length });
  atomicWrite(data);
  return JSON.parse(JSON.stringify(record)) as ApplicationTraceRecord;
}

export function appendOutcome(
  workspaceId: string,
  principalInput: string,
  input: { traceId: string; observedAt?: string; metrics: Record<string, number | null>; truth?: Record<string, TruthState>; note?: string | null },
): OutcomeObservation {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "outcome.manage", input.traceId);
  if (!workspace.applicationTraces.some((row) => row.id === input.traceId)) throw new Error("trace_id not found in workspace");
  const metrics: Record<string, number | null> = {};
  const truth: Record<string, TruthState> = {};
  for (const [keyRaw, value] of Object.entries(input.metrics ?? {})) {
    const key = String(keyRaw).trim().slice(0, 120);
    if (!key) continue;
    if (value !== null && !Number.isFinite(value)) throw new Error(`metric ${key} must be a finite number or null`);
    metrics[key] = value;
    const supplied = input.truth?.[key];
    truth[key] = isTruthState(supplied) ? supplied : value === null ? "UNKNOWN" : "OBSERVED";
    if (value === null && truth[key] === "OBSERVED") throw new Error(`metric ${key} cannot be OBSERVED with a null value`);
  }
  if (!Object.keys(metrics).length) throw new Error("at least one outcome metric is required");
  const observedAt = input.observedAt ? new Date(input.observedAt) : new Date();
  if (Number.isNaN(observedAt.getTime())) throw new Error("observed_at must be a valid ISO timestamp");
  const record: OutcomeObservation = {
    id: randomUUID(),
    traceId: input.traceId,
    observedAt: observedAt.toISOString(),
    metrics,
    truth,
    note: input.note ? String(input.note).trim().slice(0, 1000) : null,
    createdAt: new Date().toISOString(),
  };
  workspace.outcomes.push(record);
  workspace.outcomes = workspace.outcomes.slice(-10000);
  workspace.updatedAt = record.createdAt;
  audit(data, workspace.id, principal, "outcome.manage", "allowed", record.id, { traceId: record.traceId, metrics: Object.keys(metrics), truthPolicy: TRUTH_POLICY });
  atomicWrite(data);
  return JSON.parse(JSON.stringify(record)) as OutcomeObservation;
}

export function recordEvaluation(
  workspaceId: string,
  principalInput: string,
  input: { traceId: string; result: EvaluationResult; rationale: string; outcomeIds?: string[]; evidenceRefs?: string[]; learningAssetId?: string; title?: string },
): EvaluationRecord {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "evaluation.manage", input.traceId);
  const trace = workspace.applicationTraces.find((row) => row.id === input.traceId);
  if (!trace) throw new Error("trace_id not found in workspace");
  if (!["SUPPORTED", "CONTRADICTED", "INSUFFICIENT"].includes(input.result)) throw new Error("invalid evaluation result");
  const outcomeIds = cleanStringList(input.outcomeIds ?? [], 500);
  for (const outcomeId of outcomeIds) {
    if (!workspace.outcomes.some((row) => row.id === outcomeId && row.traceId === trace.id)) throw new Error(`outcome ${outcomeId} does not belong to trace ${trace.id}`);
  }
  const now = new Date().toISOString();
  const learningAssetId = String(input.learningAssetId || trace.learningAssetIds[0] || randomUUID()).trim().slice(0, 160);
  let asset = workspace.learningAssets.find((row) => row.id === learningAssetId);
  if (!asset) {
    asset = {
      id: learningAssetId,
      topic: trace.topic,
      title: cleanName(input.title || `${trace.topic} learning candidate`, "learning title"),
      state: "DRAFT",
      version: 0,
      evidenceRefs: [],
      evaluationIds: [],
      updatedAt: now,
    };
    workspace.learningAssets.push(asset);
  }
  const evaluation: EvaluationRecord = {
    id: randomUUID(),
    traceId: trace.id,
    outcomeIds,
    result: input.result,
    rationale: cleanName(input.rationale, "rationale").slice(0, 2000),
    evidenceRefs: cleanStringList([...(input.evidenceRefs ?? []), ...trace.evidenceRefs], 1500),
    learningAssetId: asset.id,
    createdAt: now,
  };
  workspace.evaluations.push(evaluation);
  workspace.evaluations = workspace.evaluations.slice(-10000);
  asset.version += 1;
  asset.evaluationIds = cleanStringList([...asset.evaluationIds, evaluation.id], 5000);
  asset.evidenceRefs = cleanStringList([...asset.evidenceRefs, ...evaluation.evidenceRefs], 5000);
  asset.state = input.result === "SUPPORTED" ? "SUPPORTED" : input.result === "CONTRADICTED" ? "REJECT" : "INSUFFICIENT_EVIDENCE";
  asset.updatedAt = now;
  if (!trace.learningAssetIds.includes(asset.id)) trace.learningAssetIds.push(asset.id);
  workspace.updatedAt = now;
  audit(data, workspace.id, principal, "evaluation.manage", "allowed", evaluation.id, { traceId: trace.id, result: input.result, learningAssetId: asset.id, learningState: asset.state });
  atomicWrite(data);
  return JSON.parse(JSON.stringify(evaluation)) as EvaluationRecord;
}

export function listLearningAssets(workspaceId: string, principalInput: string): LearningAsset[] {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "learning.read", workspaceId);
  atomicWrite(data);
  return JSON.parse(JSON.stringify(workspace.learningAssets.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))) as LearningAsset[];
}

export function readAudit(workspaceId: string, principalInput: string, limit = 200): AuditEvent[] {
  assertLocalWorkspaceBoundary();
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "audit.read", workspaceId);
  const rows = data.audit.filter((event) => event.workspaceId === workspaceId).slice(-Math.max(1, Math.min(1000, limit)));
  atomicWrite(data);
  return JSON.parse(JSON.stringify(rows)) as AuditEvent[];
}

export function workspaceStoreInfo() {
  const data = readFile();
  return {
    workspaces: data.workspaces.length,
    auditEvents: data.audit.length,
    applicationTraces: data.workspaces.reduce((sum, workspace) => sum + workspace.applicationTraces.length, 0),
    outcomes: data.workspaces.reduce((sum, workspace) => sum + workspace.outcomes.length, 0),
    evaluations: data.workspaces.reduce((sum, workspace) => sum + workspace.evaluations.length, 0),
    learningAssets: data.workspaces.reduce((sum, workspace) => sum + workspace.learningAssets.length, 0),
    roles: Object.keys(PERMISSIONS) as WorkspaceRole[],
    centralAccountRequired: false,
    publicRemoteMutations: false,
    publicRemoteWorkspaceAccess: false,
    truthPolicy: TRUTH_POLICY,
  };
}
