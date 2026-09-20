export const TRENDHUB_SKILL_CONTRACT = {
  schema: "trendhub-skill-v2",
  skillVersion: "2.0",
  productVersion: "1.7.0",
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
  routing: {
    entityFirst: {
      intents: ["brand", "company", "commercial-place", "product", "campaign", "business-subject"],
      tool: "professional_intelligence",
      rule: "Actively acquire subject-specific public evidence before trend interpretation. Generic hotlists are secondary evidence only.",
    },
    topicFirst: {
      intents: ["topic", "hotspot", "issue", "meme", "event-topic"],
      tool: "analyze_topic",
      rule: "Use topic research when the user is studying the spread/meaning of a topic rather than a business entity.",
    },
    rawTrending: {
      intents: ["what-is-trending-now", "current-ranking"],
      tool: "get_trending",
      rule: "Never use raw hotlist absence as proof that a brand/entity has no discussion.",
    },
  },
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
