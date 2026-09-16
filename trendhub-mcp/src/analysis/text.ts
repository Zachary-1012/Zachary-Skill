/**
 * 文本归一化与跨平台话题匹配（确定性、零依赖）。
 * 中文用字符 bigram/trigram + Dice 相似度，拉丁字母用 token；用于"同一话题在多平台共振"。
 */

export function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#【】\[\]（）()「」""''！!？?，,。.、:：;；~～\-—_·…|/\\]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function cjkRuns(s: string): string[] {
  return s.match(/[一-鿿]{2,}/g) ?? [];
}
function latinTokens(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]{1,}/g) ?? [];
}

function ngrams(run: string, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= run.length; i++) out.push(run.slice(i, i + n));
  return out;
}

export function featureSet(s: string): Set<string> {
  const norm = normalize(s);
  const feats = new Set<string>();
  for (const run of cjkRuns(norm)) {
    ngrams(run, 2).forEach((g) => feats.add(g));
    if (run.length >= 3) ngrams(run, 3).forEach((g) => feats.add(g));
  }
  latinTokens(norm).forEach((t) => feats.add(t));
  return feats;
}

export function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return (2 * inter) / (a.size + b.size);
}

/** 标题与关键词是否命中：直接包含，或关键词特征大部分覆盖标题 */
export function keywordHit(title: string, keyword: string): boolean {
  const t = normalize(title);
  const k = normalize(keyword);
  if (!k) return false;
  if (t.includes(k)) return true;
  // 多关键词（空格/逗号分隔）任一片段包含即命中
  const parts = keyword.split(/[\s,，、/|]+/).filter((x) => normalize(x).length >= 2);
  if (parts.some((p) => t.includes(normalize(p)))) return true;
  const tf = featureSet(title);
  const kf = featureSet(keyword);
  if (!kf.size) return false;
  let cover = 0;
  for (const x of kf) if (tf.has(x)) cover++;
  return cover / kf.size >= 0.72;
}

/** 两个标题是否指向同一话题 */
export function isSameTopic(a: string, b: string, threshold = 0.62): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return Math.min(na.length, nb.length) >= 4;
  return dice(featureSet(a), featureSet(b)) >= threshold;
}
