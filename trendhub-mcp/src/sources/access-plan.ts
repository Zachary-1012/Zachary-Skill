/**
 * Source routing and onboarding plan for Professional Intelligence v2.
 *
 * UX rule: never ask the user for credentials when a zero-config source can satisfy the
 * same signal family. Optional sessions enrich evidence but never block the base workflow.
 */
import {
  PROFESSIONAL_SOURCE_CATALOG,
  sourceUserSetup,
  type ProfessionalSourceSpec,
  type SignalFamily,
  type SourceVertical,
} from "./professional-catalog.js";

export interface SourceAccessPlan {
  zeroConfig: ProfessionalSourceSpec[];
  optionalEnhancements: ProfessionalSourceSpec[];
  credentialed: ProfessionalSourceSpec[];
  licensed: ProfessionalSourceSpec[];
  planned: ProfessionalSourceSpec[];
  defaultLivePlatforms: string[];
  rules: string[];
}

function priorityValue(p: ProfessionalSourceSpec["priority"]): number {
  return p === "P0" ? 3 : p === "P1" ? 2 : 1;
}

function verticalScore(source: ProfessionalSourceSpec, verticals: SourceVertical[]): number {
  if (!verticals.length) return 0;
  const own = source.verticals ?? ["general"];
  return own.filter((v) => verticals.includes(v)).length * 4;
}

export function defaultLivePlatformIds(options: {
  max?: number;
  verticals?: SourceVertical[];
  preferRegions?: Array<"CN" | "APAC" | "GLOBAL">;
} = {}): string[] {
  const max = Math.max(4, Math.min(24, options.max ?? 12));
  const verticals = options.verticals ?? [];
  const regions = options.preferRegions ?? ["CN", "GLOBAL", "APAC"];
  const candidates = PROFESSIONAL_SOURCE_CATALOG
    .filter((source) => source.livePlatformId)
    .filter((source) => source.priority !== "P2")
    .filter((source) => sourceUserSetup(source).blocksBasicUse === false)
    .map((source) => ({ source, setup: sourceUserSetup(source) }));

  const selected: ProfessionalSourceSpec[] = [];
  const families = new Set<SignalFamily>();
  const usedPlatforms = new Set<string>();

  while (selected.length < max) {
    let best: { source: ProfessionalSourceSpec; score: number } | null = null;
    for (const { source } of candidates) {
      const platform = source.livePlatformId as string;
      if (usedPlatforms.has(platform)) continue;
      const newFamilies = source.families.filter((family) => !families.has(family)).length;
      const regionRank = regions.indexOf(source.region);
      const regionBonus = regionRank < 0 ? 0 : Math.max(0, 3 - regionRank);
      const score = priorityValue(source.priority) * 3 + newFamilies * 5 + verticalScore(source, verticals) + regionBonus;
      if (!best || score > best.score || (score === best.score && source.id.localeCompare(best.source.id) < 0)) {
        best = { source, score };
      }
    }
    if (!best) break;
    selected.push(best.source);
    usedPlatforms.add(best.source.livePlatformId as string);
    best.source.families.forEach((family) => families.add(family));
  }

  return selected.map((source) => source.livePlatformId as string);
}

export function buildSourceAccessPlan(options: {
  verticals?: SourceVertical[];
  includePriority?: "P0" | "P1" | "P2";
  maxDefaultLive?: number;
} = {}): SourceAccessPlan {
  const ceiling = options.includePriority === "P2" ? 2 : options.includePriority === "P1" ? 1 : 0;
  const rank = { P0: 0, P1: 1, P2: 2 } as const;
  const verticals = options.verticals ?? [];
  const sources = PROFESSIONAL_SOURCE_CATALOG
    .filter((source) => rank[source.priority] <= ceiling)
    .filter((source) => !verticals.length || (source.verticals ?? ["general"]).some((v) => verticals.includes(v) || v === "general"));

  const zeroConfig: ProfessionalSourceSpec[] = [];
  const optionalEnhancements: ProfessionalSourceSpec[] = [];
  const credentialed: ProfessionalSourceSpec[] = [];
  const licensed: ProfessionalSourceSpec[] = [];
  const planned: ProfessionalSourceSpec[] = [];

  for (const source of sources) {
    const setup = sourceUserSetup(source);
    if (setup.mode === "zero-config") zeroConfig.push(source);
    else if (setup.mode === "optional-local-session") optionalEnhancements.push(source);
    else if (setup.mode === "licensed-connector") licensed.push(source);
    else if (setup.mode === "planned") planned.push(source);
    else credentialed.push(source);
  }

  return {
    zeroConfig,
    optionalEnhancements,
    credentialed,
    licensed,
    planned,
    defaultLivePlatforms: defaultLivePlatformIds({ max: options.maxDefaultLive ?? 12, verticals }),
    rules: [
      "Zero-config live/public sources are selected first and must keep the first-run workflow usable without setup.",
      "Optional local sessions may improve depth but never disable guest/basic evidence.",
      "Official API/OAuth credentials are requested only when the user chooses a capability that requires them.",
      "Private cookies/sessions remain local; the public hosted service never asks users to upload private session cookies.",
      "Licensed sources are shown as licensed connectors, never silently replaced with brittle private-API scraping.",
      "Planned adapters never count as live coverage until deterministic source-health tests pass.",
    ],
  };
}
