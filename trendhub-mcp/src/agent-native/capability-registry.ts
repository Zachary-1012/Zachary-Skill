export type CapabilityKind = "tool" | "resource" | "skill" | "app" | "task";
export type CapabilityStatus = "compatibility" | "available" | "designed" | "planned";

export interface CapabilityDescriptor {
  id: string;
  kind: CapabilityKind;
  status: CapabilityStatus;
  description: string;
  canonicalMethod?: string;
  requires?: string[];
  readOnly?: boolean;
}

const entries: CapabilityDescriptor[] = [
  { id: "trendhub.discovery.trending", kind: "tool", status: "compatibility", canonicalMethod: "get_trending", description: "Current multi-source trend discovery", readOnly: false },
  { id: "trendhub.discovery.platforms", kind: "tool", status: "compatibility", canonicalMethod: "list_platforms", description: "Live platform inventory", readOnly: true },
  { id: "trendhub.intelligence.cross_signal", kind: "tool", status: "compatibility", canonicalMethod: "cross_platform_overlap", description: "Cross-signal topic confirmation", readOnly: true },
  { id: "trendhub.history.topic", kind: "resource", status: "available", description: "Read local topic/platform history", readOnly: true },
  { id: "trendhub.reliability.source_health", kind: "resource", status: "available", description: "Read local source reliability observations", readOnly: true },
  { id: "trendhub.research.deep_topic", kind: "skill", status: "available", description: "Progressively disclosed evidence-first research workflow", readOnly: true },
  { id: "trendhub.content.build_brief", kind: "tool", status: "compatibility", canonicalMethod: "get_content_brief", description: "Build a structured content brief", readOnly: true },
  { id: "trendhub.apps.trend_radar", kind: "app", status: "designed", description: "Interactive trend radar descriptor", readOnly: true },
  { id: "trendhub.apps.source_health", kind: "app", status: "designed", description: "Interactive source health descriptor", readOnly: true },
  { id: "trendhub.apps.evidence_explorer", kind: "app", status: "designed", description: "Evidence exploration descriptor", readOnly: true },
  { id: "trendhub.tasks.async_intelligence", kind: "task", status: "planned", description: "Durable long-running research tasks; protocol extension pending E2E validation", requires: ["durable-task-store", "tasks-extension-e2e"] },
];

export function listCapabilities(filter: { kind?: CapabilityKind; namespace?: string } = {}): CapabilityDescriptor[] {
  return entries.filter((x) => (!filter.kind || x.kind === filter.kind) && (!filter.namespace || x.id.startsWith(filter.namespace))).map((x) => ({ ...x, requires: x.requires ? [...x.requires] : undefined })).sort((a, b) => a.id.localeCompare(b.id));
}

export function capabilityRegistry(): { schema: "trendhub-capability-registry-v1"; capabilities: CapabilityDescriptor[] } {
  return { schema: "trendhub-capability-registry-v1", capabilities: listCapabilities() };
}
