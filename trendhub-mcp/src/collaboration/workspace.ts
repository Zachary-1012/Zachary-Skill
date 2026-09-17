/**
 * Local-first professional collaboration primitives.
 *
 * This module intentionally does not create a cloud identity service. A local
 * installation may map its own authenticated principal into these roles. The
 * public hosted gateway never exposes the mutation endpoints that use this file.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

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
  owner: new Set(["workspace.create", "workspace.update", "workspace.read", "member.manage", "watchlist.manage", "query.manage", "rule.manage", "report.manage", "audit.read"]),
  editor: new Set(["workspace.update", "workspace.read", "watchlist.manage", "query.manage", "rule.manage", "report.manage", "audit.read"]),
  analyst: new Set(["workspace.read", "watchlist.manage", "query.manage", "rule.manage", "report.manage"]),
  viewer: new Set(["workspace.read"]),
};

function emptyFile(): WorkspaceFile {
  return { version: 1, workspaces: [], audit: [] };
}

function readFile(): WorkspaceFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as WorkspaceFile;
    if (parsed?.version === 1 && Array.isArray(parsed.workspaces) && Array.isArray(parsed.audit)) return parsed;
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
  const name = String(value ?? "").trim().slice(0, 120);
  if (!name) throw new Error(`${label} is required`);
  return name;
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
  };
  data.workspaces.push(workspace);
  audit(data, workspace.id, principal, "workspace.create", "allowed", workspace.id);
  atomicWrite(data);
  return publicWorkspace(workspace);
}

export function listWorkspaces(principalInput: string): Array<{ id: string; name: string; role: WorkspaceRole; updatedAt: string }> {
  const principal = cleanPrincipal(principalInput);
  return readFile().workspaces
    .map((workspace) => ({ workspace, role: roleOf(workspace, principal) }))
    .filter((x): x is { workspace: Workspace; role: WorkspaceRole } => x.role != null)
    .map(({ workspace, role }) => ({ id: workspace.id, name: workspace.name, role, updatedAt: workspace.updatedAt }));
}

export function readWorkspace(workspaceId: string, principalInput: string): Workspace {
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "workspace.read", workspaceId);
  atomicWrite(data);
  return publicWorkspace(workspace);
}

export function upsertMember(workspaceId: string, principalInput: string, memberPrincipalInput: string, role: WorkspaceRole): Workspace {
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
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "watchlist.manage", workspaceId);
  workspace.watchlist = [...new Set(keywords.map((value) => value.trim()).filter(Boolean).map((value) => value.slice(0, 160)))].slice(0, 500);
  workspace.updatedAt = new Date().toISOString();
  audit(data, workspace.id, principal, "watchlist.manage", "allowed", workspaceId, { count: workspace.watchlist.length });
  atomicWrite(data);
  return publicWorkspace(workspace);
}

export function saveQuery(workspaceId: string, principalInput: string, input: Omit<SavedQuery, "id" | "createdAt" | "updatedAt"> & { id?: string }): SavedQuery {
  const principal = cleanPrincipal(principalInput);
  const data = readFile();
  const workspace = getMutable(data, workspaceId);
  requireAction(data, workspace, principal, "query.manage", input.id ?? null);
  const now = new Date().toISOString();
  const existing = input.id ? workspace.savedQueries.find((query) => query.id === input.id) : undefined;
  const query: SavedQuery = existing ?? { id: input.id || randomUUID(), name: "", keyword: "", platforms: [], createdAt: now, updatedAt: now };
  query.name = cleanName(input.name, "query name");
  query.keyword = cleanName(input.keyword, "keyword").slice(0, 160);
  query.platforms = [...new Set((input.platforms ?? []).map(String).map((value) => value.trim()).filter(Boolean))].slice(0, 50);
  query.geo = input.geo?.trim().slice(0, 24) || undefined;
  query.updatedAt = now;
  if (!existing) workspace.savedQueries.push(query);
  workspace.updatedAt = now;
  audit(data, workspace.id, principal, "query.manage", "allowed", query.id, { name: query.name });
  atomicWrite(data);
  return JSON.parse(JSON.stringify(query)) as SavedQuery;
}

export function saveAlertRule(workspaceId: string, principalInput: string, input: Omit<WorkspaceAlertRule, "id" | "createdAt" | "updatedAt"> & { id?: string }): WorkspaceAlertRule {
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

export function readAudit(workspaceId: string, principalInput: string, limit = 200): AuditEvent[] {
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
    roles: Object.keys(PERMISSIONS) as WorkspaceRole[],
    centralAccountRequired: false,
    publicRemoteMutations: false,
  };
}
