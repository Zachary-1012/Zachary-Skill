export const TRENDHUB_SKILL_CONTRACT = {
  schema: "trendhub-skill-v2",
  skillVersion: "2.0",
  productVersion: "1.6.0",
  name: "trendhub",
  progressiveDisclosure: true,
  compatibilityTools: 21,
  defaultResources: [
    "trendhub://namespace",
    "trendhub://contracts/evidence",
    "trendhub://capabilities",
    "trendhub://methodology",
    "trendhub://sources",
  ],
  workflows: [
    "trend-discovery",
    "brand-radar",
    "campaign-research",
    "content-research",
    "trend-validation",
  ],
  policies: ["evidence", "confidence", "reliability", "forecasting"],
  executionOrder: [
    "resolve-intent",
    "load-minimum-resources",
    "call-canonical-tool",
    "cross-check-evidence-when-required",
    "preserve-limitations-and-truth-state",
    "caller-ai-interprets",
  ],
  boundaries: {
    dataTruthOwner: "trendhub-core",
    modelTruthOwner: false,
    adaptersAreTruthOwners: false,
    plannedCoverageCountsAsLive: false,
    missingBecomesZero: false,
  },
} as const;

export function skillContract() {
  return JSON.parse(JSON.stringify(TRENDHUB_SKILL_CONTRACT)) as typeof TRENDHUB_SKILL_CONTRACT;
}
