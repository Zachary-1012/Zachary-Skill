export function routeIntent(text: string): { intent: "trend-discovery" | "brand-radar" | "campaign-research" | "content-research" | "source-health"; capability: string; requiresEvidence: boolean } {
  const s = text.toLowerCase();
  if (/source|reliab|信源|可靠|健康/.test(s)) return { intent: "source-health", capability: "trendhub.reliability.source_health", requiresEvidence: true };
  if (/brand|品牌|sov|竞品|campaign|营销|广告/.test(s)) return { intent: "brand-radar", capability: "trendhub.intelligence.cross_signal", requiresEvidence: true };
  if (/brief|content|内容|选题|创作/.test(s)) return { intent: "content-research", capability: "trendhub.content.build_brief", requiresEvidence: true };
  if (/campaign|活动|投放/.test(s)) return { intent: "campaign-research", capability: "trendhub.intelligence.cross_signal", requiresEvidence: true };
  return { intent: "trend-discovery", capability: "trendhub.discovery.trending", requiresEvidence: true };
}
