/**
 * Media evidence layer.
 *
 * TrendHub core does not bundle a vision model or require a model API key. It
 * surfaces traceable image/video evidence to multimodal caller AIs and exposes
 * an optional local Transformers.js adapter contract for installations that
 * explicitly enable it.
 */
import { keywordHit } from "./text.js";
import { readHistory } from "../store/history.js";

export interface MediaEvidenceItem {
  platform: string;
  capturedAt: string;
  title: string;
  author: string | null;
  kind: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  rank: number | null;
}

export interface MediaEvidence {
  methodologyVersion: "media-evidence-v1";
  keyword: string;
  generatedAt: string;
  evidenceCount: number;
  imageEvidenceCount: number;
  videoLikeEvidenceCount: number;
  items: MediaEvidenceItem[];
  multimodal: {
    callerAiReady: boolean;
    localAdapterEnabled: boolean;
    localAdapterPackage: "@huggingface/transformers";
    model: string;
    note: string;
  };
  caveats: string[];
}

function isVideoLike(kind: string | null | undefined): boolean {
  const value = String(kind ?? "").toLowerCase();
  return value.includes("video") || value.includes("reel") || value.includes("short") || value.includes("直播");
}

export function collectMediaEvidence(
  keyword: string,
  platforms: string[],
  now = new Date(),
  lookbackHours = 24 * 30,
  limit = 40,
): MediaEvidence {
  const seen = new Set<string>();
  const items: MediaEvidenceItem[] = [];
  for (const platform of platforms) {
    const history = readHistory(platform, lookbackHours, now);
    for (let p = history.length - 1; p >= 0 && items.length < limit; p--) {
      const point = history[p]!;
      for (const item of point.items) {
        if (!keywordHit(item.title, keyword)) continue;
        if (!item.imageUrl && !isVideoLike(item.kind)) continue;
        const key = `${platform}|${item.externalId ?? item.url ?? item.imageUrl ?? item.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          platform,
          capturedAt: point.capturedAt,
          title: item.title,
          author: item.author ?? null,
          kind: item.kind ?? null,
          imageUrl: item.imageUrl ?? null,
          sourceUrl: item.url,
          rank: item.rank,
        });
        if (items.length >= limit) break;
      }
    }
  }

  const localAdapterEnabled = ["1", "true", "yes", "on"].includes(
    String(process.env.TRENHUB_LOCAL_VISION_ENABLED ?? "").trim().toLowerCase(),
  );
  const model = process.env.TRENHUB_LOCAL_VISION_MODEL?.trim() || "Xenova/clip-vit-base-patch32";
  return {
    methodologyVersion: "media-evidence-v1",
    keyword,
    generatedAt: now.toISOString(),
    evidenceCount: items.length,
    imageEvidenceCount: items.filter((x) => Boolean(x.imageUrl)).length,
    videoLikeEvidenceCount: items.filter((x) => isVideoLike(x.kind)).length,
    items,
    multimodal: {
      callerAiReady: items.some((x) => Boolean(x.imageUrl)),
      localAdapterEnabled,
      localAdapterPackage: "@huggingface/transformers",
      model,
      note: localAdapterEnabled
        ? "Local vision is opt-in. Install @huggingface/transformers separately and keep model files under your own environment/cache policy; TrendHub does not auto-download a vision model during normal installation."
        : "Image/video evidence is returned as source-linked URLs for a multimodal caller AI. Set TRENHUB_LOCAL_VISION_ENABLED=1 only when an installation explicitly wants an optional local model adapter.",
    },
    caveats: [
      "Media evidence is only as complete as the public source metadata returned by each platform.",
      "A thumbnail or content kind is evidence that media exists; it is not itself a semantic image-analysis result.",
      "TrendHub does not infer identity or sensitive personal attributes from media.",
    ],
  };
}

export async function classifyMediaWithOptionalLocalAdapter(
  imageUrl: string,
  candidateLabels: string[],
): Promise<{ status: "disabled" | "unavailable" | "ok"; model: string | null; predictions: Array<{ label: string; score: number }>; note?: string }> {
  const enabled = ["1", "true", "yes", "on"].includes(
    String(process.env.TRENHUB_LOCAL_VISION_ENABLED ?? "").trim().toLowerCase(),
  );
  if (!enabled) return { status: "disabled", model: null, predictions: [], note: "Set TRENHUB_LOCAL_VISION_ENABLED=1 to opt in." };
  if (!/^https:\/\//i.test(imageUrl)) return { status: "unavailable", model: null, predictions: [], note: "Only HTTPS media URLs are accepted." };
  const labels = candidateLabels.map((x) => x.trim()).filter(Boolean).slice(0, 25);
  if (labels.length < 2) return { status: "unavailable", model: null, predictions: [], note: "At least two candidate labels are required." };

  try {
    // Variable dynamic import keeps the heavyweight optional adapter outside the
    // default dependency graph and portable bootstrap.
    const moduleName = "@huggingface/transformers";
    const transformers = await import(moduleName) as any;
    const model = process.env.TRENHUB_LOCAL_VISION_MODEL?.trim() || "Xenova/clip-vit-base-patch32";
    const classifier = await transformers.pipeline("zero-shot-image-classification", model);
    const output = await classifier(imageUrl, labels);
    const predictions = (Array.isArray(output) ? output : [])
      .slice(0, labels.length)
      .map((x: any) => ({ label: String(x.label ?? ""), score: Number(x.score ?? 0) }))
      .filter((x: { label: string; score: number }) => x.label && Number.isFinite(x.score));
    return { status: "ok", model, predictions };
  } catch (error) {
    return {
      status: "unavailable",
      model: process.env.TRENHUB_LOCAL_VISION_MODEL?.trim() || "Xenova/clip-vit-base-patch32",
      predictions: [],
      note: `Optional local vision adapter unavailable: ${(error as Error).message}`,
    };
  }
}
