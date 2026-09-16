/**
 * 小红书热门笔记标题 → 话题词派生（零依赖、纯本地统计）。
 *
 * 重要口径：这是从「热门笔记标题」提取/统计的话题词，属于派生信号（derived），
 * 不是小红书官方「热搜词榜」。官方热搜词榜需登录态（见 sources/xiaohongshu.ts）。
 *
 * 小红书作者普遍在标题里「用空格直接堆话题短语」（例："社会大环境 就业大环境
 * 经济大环境 打拼的年轻人"、"健身 健身搭子 腰臀比"），这些是人工分好词的高价值话题，
 * 与 #话题# 标签等价。因此分三类来源，可信度与排序不同：
 *   - cross（跨篇热词）：在 ≥2 篇热门笔记出现（trigram≥2 / bigram≥3 / 短词≥2），最能代表热点，排最前；
 *   - hashtag（#标签）：作者显式 #话题# 标注；
 *   - author（作者话题）：作者用空格分隔的干净话题短语，单篇也保留（每篇最多取 3 个，防刷屏），属选题候选。
 * 连续中文长句再用 trigram/bigram 兜底跨篇热词，并以功能字首尾/纯功能字规则降噪。
 */

export type XhsTopicSource = "cross" | "hashtag" | "author";

export interface XhsTopic {
  word: string;
  /** 总出现次数 */
  tf: number;
  /** 出现该词的不同标题数（document frequency） */
  df: number;
  /** 来源类型 */
  source: XhsTopicSource;
  /** 是否来自作者显式 #话题# 标签（source==="hashtag"） */
  tagged: boolean;
  /** 示例标题（最多 2 条，截断） */
  examples: string[];
}

export interface XhsTopicResult {
  generatedAt: string;
  sampleSize: number;
  topics: XhsTopic[];
  /** 固定口径说明，随结果返回给调用方/前端 */
  note: string;
}

const DERIVED_NOTE =
  "派生词（非官方热搜词榜，供 AI 复核）：cross=在≥2篇热门笔记出现的跨篇热词；hashtag=作者#标签；author=作者在标题用空格标注的话题（单篇选题候选）。df=出现该词的笔记数。官方热搜词榜需配置 XHS_COOKIE。";

/** 词级停用（功能词/称呼词等无区分度高频词，保守，仅停用功能词与泛称呼）。 */
const STOP = new Set([
  "的", "了", "是", "我", "你", "他", "她", "它", "们", "和", "与", "及", "在", "就", "都", "很", "也",
  "不", "没", "有", "个", "这", "那", "些", "什么", "怎么", "为什么", "可以", "一个", "没有", "还是",
  "真的", "就是", "这个", "那个", "我们", "你们", "他们", "她们", "自己", "一下", "这种", "那种",
  "以及", "或者", "但是", "因为", "所以", "如果", "然后", "现在", "今天", "昨天", "明天", "哈哈",
  "哈哈哈", "超级", "非常", "比较", "一些", "一点", "第一", "最后", "看看", "请问", "有人", "大家",
  "姐妹", "姐妹们", "宝宝", "兄弟们", "如何", "万能的小红书", "不懂就问",
]);

/** 单字功能字：ngram 若以这些字开头/结尾（或全由其组成）则丢弃，显著降噪。 */
const STOP_CHARS = new Set(
  ("的了是我你他她它们和与及在就都很也不没个这那些吗呢啊吧呀哦哈会能要去让被把给到里上下中着过地得" +
    "又再才只还却并而但或真最太挺多少大小来说看做吃买用次天年月一").split("")
);

const SPLIT_RE = /[\s|/\\,，、;；!！?？.。~～·:：\-—_【】\[\]{}()（）「」“”"‘’#*<>《》…]+/;
const CJK_RE = /[一-龥]/;
const TOKEN_RE = /^[一-龥a-zA-Z0-9]+$/;
const TAG_RE = /#([^#\s【】\[\]()（）|/\\,，、;；!！?？.。~～*]{1,20})#?/g;
const ASCII_RE = /[a-zA-Z][a-zA-Z0-9]{1,}/g;
/** 短语首尾需剥离的标点/符号（emoji 不在内，残留则该片段不视为干净作者话题） */
const EDGE_TRIM_RE = /^[\s|/\\,，、;；:：·\-—_【】[\]{}()（）「」“”"'‘’<>《》…!?。！？.*~～]+|[\s|/\\,，、;；:：·\-—_【】[\]{}()（）「」“”"'‘’<>《》…!?。！？.*~～]+$/g;

function isCjk(s: string): boolean {
  return CJK_RE.test(s);
}

/** 干净的短话题词：CJK 2–8 字，或字母数字词 ≥2 字符；非纯数字、非停用词。 */
function validToken(w: string): boolean {
  if (!w || !TOKEN_RE.test(w)) return false;
  if (STOP.has(w)) return false;
  if (/^\d+$/.test(w)) return false;
  if (isCjk(w)) {
    const chars = [...w];
    if (chars.length < 2 || chars.length > 8) return false;
    if (TAIL_DROP.has(chars[chars.length - 1])) return false;
    return true;
  }
  return w.length >= 2;
}

/** 话题词尾字若为语气助词/结构助词，多为口语句子碎片而非话题，丢弃（作者空格话题降噪）。 */
const TAIL_DROP = new Set("吧吗呢啊呀嘛哦哈哇呗呐的".split(""));

/** ngram 质量闸：非整词停用、非纯功能字、首尾非功能字。 */
function gramOk(w: string): boolean {
  const chars = [...w];
  if (STOP.has(w)) return false;
  if (chars.every((c) => STOP_CHARS.has(c))) return false;
  if (STOP_CHARS.has(chars[0]) || STOP_CHARS.has(chars[chars.length - 1])) return false;
  return true;
}

interface Agg {
  tf: number;
  df: number;
  hash: boolean;
  author: boolean;
  examples: string[];
}

function push(
  map: Map<string, Agg>,
  word: string,
  title: string,
  flags: { hash?: boolean; author?: boolean },
  seen: Set<string>
) {
  if (seen.has(word)) return; // 同一标题内 df 只计一次
  seen.add(word);
  let e = map.get(word);
  if (!e) {
    e = { tf: 0, df: 0, hash: false, author: false, examples: [] };
    map.set(word, e);
  }
  e.tf += 1;
  e.df += 1;
  e.hash = e.hash || Boolean(flags.hash);
  e.author = e.author || Boolean(flags.author);
  if (e.examples.length < 2) e.examples.push(title.length > 40 ? title.slice(0, 40) : title);
}

/**
 * 从热门笔记标题提取话题词。
 * @param titles 热门笔记标题数组（建议按热度排序后的前 30-40 条）
 * @param topN 返回词条上限
 */
export function extractXhsTopics(titles: string[], topN = 20): XhsTopicResult {
  const words = new Map<string, Agg>();
  const ngrams = new Map<string, Agg>();

  titles.filter(Boolean).forEach((rawTitle) => {
    const title = String(rawTitle);
    const seen = new Set<string>();
    const seenN = new Set<string>();
    let authorBudget = 3; // 每篇最多收录 3 个作者空格话题，防止单篇刷屏

    // 1) 显式 #话题# 标签
    let tm: RegExpExecArray | null;
    TAG_RE.lastIndex = 0;
    while ((tm = TAG_RE.exec(title)) !== null) {
      const w = tm[1].trim();
      if (validToken(w)) push(words, w, title, { hash: true }, seen);
    }

    const stripped = title.replace(TAG_RE, " ");
    // 2) 以空白为界：小红书作者用空格堆话题，干净短语即「作者话题」
    for (const chunk0 of stripped.split(/\s+/)) {
      const chunk = chunk0.trim();
      if (!chunk) continue;
      const clean = chunk.replace(EDGE_TRIM_RE, "");
      if (validToken(clean)) {
        if (authorBudget > 0) {
          push(words, clean, title, { author: true }, seen);
          authorBudget -= 1;
        }
        continue;
      }
      // 3) 非干净片段（含标点/长句）：标点细分做跨篇统计 + 中文 ngram
      for (const seg0 of chunk.split(SPLIT_RE)) {
        const seg = seg0.trim();
        if (!seg) continue;
        const asciiWords = seg.match(ASCII_RE);
        if (asciiWords) {
          for (const w0 of asciiWords) {
            if (w0.length >= 2 && !STOP.has(w0.toLowerCase())) push(words, w0, title, {}, seen);
          }
        }
        if (validToken(seg)) push(words, seg, title, {}, seen);
        const runs = seg.match(/[一-龥]{2,}/g);
        if (runs) {
          for (const run of runs) {
            const chars = [...run];
            for (let i = 0; i + 3 <= chars.length; i++) {
              const w = chars.slice(i, i + 3).join("");
              if (gramOk(w)) push(ngrams, w, title, {}, seenN);
            }
            for (let i = 0; i + 2 <= chars.length; i++) {
              const w = chars.slice(i, i + 2).join("");
              if (gramOk(w)) push(ngrams, w, title, {}, seenN);
            }
          }
        }
      }
    }
  });

  // 4) 合并跨篇 ngram（trigram df≥2 / bigram df≥3），且不得是更高质量词的子串
  const have = new Set(words.keys());
  for (const [word, agg] of ngrams) {
    const minDf = [...word].length >= 3 ? 2 : 3;
    if (agg.df < minDf) continue;
    let contained = false;
    for (const pw of have) {
      if (pw.includes(word)) {
        contained = true;
        break;
      }
    }
    if (contained) continue;
    const ex = words.get(word);
    if (ex) {
      ex.tf += agg.tf;
      ex.df = Math.max(ex.df, agg.df);
    } else {
      words.set(word, agg);
    }
  }

  // 5) 归类：df≥2 即跨篇热词；否则 #标签 / 作者话题；其余（df=1 的标点碎片）丢弃
  const RANK: Record<XhsTopicSource, number> = { cross: 0, hashtag: 1, author: 2 };
  const topics: XhsTopic[] = [];
  for (const [word, a] of words.entries()) {
    const source: XhsTopicSource | null =
      a.df >= 2 ? "cross" : a.hash ? "hashtag" : a.author ? "author" : null;
    if (!source) continue;
    topics.push({ word, tf: a.tf, df: a.df, source, tagged: source === "hashtag", examples: a.examples });
  }
  topics.sort((a, b) => {
    if (RANK[a.source] !== RANK[b.source]) return RANK[a.source] - RANK[b.source];
    if (b.df !== a.df) return b.df - a.df;
    return b.tf - a.tf;
  });

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: titles.filter(Boolean).length,
    topics: topics.slice(0, topN),
    note: DERIVED_NOTE,
  };
}
