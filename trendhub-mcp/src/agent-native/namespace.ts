export const TRENDHUB_NAMESPACE = {
  schema: "trendhub-namespace-v1",
  productVersion: "1.6.2",
  capabilityPrefix: "trendhub.",
  resourceScheme: "trendhub://",
  toolCompatibility: {
    naming: "legacy-unprefixed",
    count: 21,
    rule: "The stable 21 tool names remain unchanged; protocol-native discovery uses Resources and capability IDs.",
  },
  staticResources: [
    "trendhub://methodology",
    "trendhub://sources",
    "trendhub://capabilities",
    "trendhub://reliability",
    "trendhub://namespace",
    "trendhub://contracts/evidence",
    "trendhub://skill/trendhub",
  ],
  resourceTemplates: [
    "trendhub://platform/{platform}/history",
    "trendhub://capability/{capability}",
    "trendhub://source/{source}",
  ],
  invariants: [
    "missing-is-not-zero",
    "released-is-not-operating",
    "adapters-do-not-own-truth",
    "one-canonical-capability-owner",
    "evidence-state-is-explicit",
  ],
} as const;

export function namespaceContract() {
  return JSON.parse(JSON.stringify(TRENDHUB_NAMESPACE)) as typeof TRENDHUB_NAMESPACE;
}

export function isTrendHubCapabilityId(value: string): boolean {
  return value.startsWith(TRENDHUB_NAMESPACE.capabilityPrefix) && !value.includes("://");
}
