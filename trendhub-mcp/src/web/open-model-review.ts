/** Local inference for optional semantic review of public source titles. */
export const REVIEW_MODEL = "onnx-community/paraphrase-multilingual-MiniLM-L12-v2-ONNX";
export const REVIEW_REVISION = "d4c06bf0d7680171ac30042a1387e1fdb7a90021";
export const REVIEW_LICENSE = "Apache-2.0";

export class ModelReviewError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type Extractor = (inputs: string[], options: { pooling: "mean"; normalize: true }) => Promise<unknown>;
let extractorPromise: Promise<Extractor> | null = null;
let ready = false;

async function extractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = import("@huggingface/transformers")
      .then(({ pipeline }) => pipeline("feature-extraction", REVIEW_MODEL, {
        dtype: "q8",
        revision: REVIEW_REVISION,
      }) as unknown as Promise<Extractor>)
      .then((model) => { ready = true; return model; })
      .catch((cause) => { extractorPromise = null; throw cause; });
  }
  return extractorPromise;
}

export function modelReviewStatus() {
  return {
    configured: true,
    ready,
    model: REVIEW_MODEL,
    revision: REVIEW_REVISION,
    license: REVIEW_LICENSE,
    inference: "self-hosted",
    requiresUserKey: false,
    scope: "public-title-topic-similarity",
  };
}

export async function reviewSourceTitles(topic: string, titles: string[]) {
  if (!topic?.trim() || topic.length > 200 || !Array.isArray(titles) || titles.length < 1 || titles.length > 8 ||
      titles.some((title) => typeof title !== "string" || !title.trim() || title.length > 300)) {
    throw new ModelReviewError("请提供研究主题和 1–8 条公开来源标题", 400);
  }

  try {
    const run = await extractor();
    const vectors = await run([topic.trim(), ...titles.map((title) => title.trim())], {
      pooling: "mean",
      normalize: true,
    }) as unknown as { dims: number[]; data: Float32Array };
    const dimensions = vectors.dims[1];
    if (vectors.dims[0] !== titles.length + 1 || !dimensions || vectors.data.length !== dimensions * (titles.length + 1)) {
      throw new Error("invalid embedding shape");
    }
    const items = titles.map((_, index) => {
      let similarity = 0;
      for (let offset = 0; offset < dimensions; offset++) {
        similarity += vectors.data[offset] * vectors.data[(index + 1) * dimensions + offset];
      }
      if (!Number.isFinite(similarity)) throw new Error("invalid embedding value");
      return { index, semanticSimilarity: Math.max(-1, Math.min(1, Number(similarity.toFixed(4)))) };
    });
    return {
      ...modelReviewStatus(),
      reviewedAt: new Date().toISOString(),
      items,
      note: "余弦相似度仅用于人工比较标题与主题，不是相关概率、来源可信度、热度或事实证明；不得自动据此采信或拒绝证据。",
    };
  } catch (cause) {
    if (cause instanceof ModelReviewError) throw cause;
    throw new ModelReviewError("开源模型暂不可用，请稍后重试", 503);
  }
}
