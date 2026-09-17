export type LiveSkillDecision = { workflow: string; requireCrossCheck: boolean; forecastAllowed: boolean; reasons: string[] };

export function decideLiveSkill(input: { sourceReliabilityScore: number | null; historySamples: number; lifecycle: string }): LiveSkillDecision {
  const reasons: string[] = [];
  const requireCrossCheck = input.sourceReliabilityScore == null || input.sourceReliabilityScore < 70;
  if (requireCrossCheck) reasons.push("source reliability is missing or below 70");
  const forecastAllowed = input.historySamples >= 8;
  if (!forecastAllowed) reasons.push("history is insufficient for a directional forecast");
  const workflow = input.lifecycle === "accelerating" ? "trend-validation" : input.lifecycle === "emerging" ? "trend-discovery" : "content-research";
  return { workflow, requireCrossCheck, forecastAllowed, reasons };
}
