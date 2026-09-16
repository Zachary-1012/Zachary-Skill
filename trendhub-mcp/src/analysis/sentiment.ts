/**
 * 规则式中英文情感极性（确定性、可解释、零依赖）。
 * 定位：快速、可解释的辅助信号；最终的情感 / 观点 / 讽刺判断请由调用方大模型完成（更强）。
 * 方法：情感词典 + 否定翻转 + 程度副词加权，输出归一化到 -1~1。
 */

const POS = [
  "优秀","棒","赞","好","好用","推荐","喜欢","喜爱","开心","高兴","兴奋","激动","惊喜","惊艳","利好","增长","上涨","涨","突破","成功","夺冠","获胜",
  "胜利","创新","纪录","提升","加强","支持","欢迎","满意","幸福","温暖","感动","放心","划算","便宜","牛","强","赢","火爆","热销","暴涨",
  "反弹","回暖","获批","首发","领先","繁荣","便利","安全","健康","漂亮","帅","萌","真香","好评","点赞","期待","看好","振奋","鼓舞","暖心",
  "实惠","免费","破纪录","里程碑","达成","签约","合作","获奖","荣获","登顶","超越","强劲","乐观","积极","改善","复苏","增长强劲","大获成功","值得","靠谱","安心",
  "good","great","awesome","excellent","amazing","love","loved","best","win","wins","winning","success","successful","surge","soar","growth",
  "beat","beats","record","breakthrough","approve","approved","boost","gain","gains","positive","strong","rally","upgrade","buy","celebrate","hit"
];
const NEG = [
  "差","烂","糟","讨厌","恨","生气","愤怒","难过","伤心","失望","崩溃","惨","下跌","跌","暴跌","大跌","下滑","亏损","亏","失败","出局","淘汰",
  "被罚","处罚","罚款","违规","违法","丑闻","翻车","塌房","暴雷","爆雷","召回","事故","遇难","受伤","地震","洪水","火灾","冲突","战争","抗议",
  "罢工","裁员","失业","涨价","欺诈","诈骗","虚假","质疑","批评","反对","警告","风险","危机","恶化","严重","困难","麻烦","故障","漏洞","泄露",
  "污染","有毒","致癌","危险","恐慌","恶心","吓人","遗憾","惋惜","凉了","扑街","割韭菜","智商税","骗","假","黑","遇难","身亡","死亡","致死",
  "起诉","诉讼","破产","退市","违约","下调","降级","做空","指控","逮捕","拘留","腐败","贪腐","受贿","行贿","造假","逃税","封禁","下架","关停",
  "bad","worst","terrible","awful","hate","fail","failed","failure","loss","losses","drop","plunge","plummet","crash","decline","weak","cut",
  "warn","warning","risk","threat","lawsuit","sue","sued","fraud","scandal","recall","dead","death","dies","killed","negative","downgrade","sell","miss","fear","crisis"
];
const DEGREE: Record<string, number> = {
  "极其": 2, "极度": 2, "十分": 1.6, "非常": 1.6, "特别": 1.5, "超级": 1.7, "超":1.4, "最": 1.8, "太": 1.5,
  "更加": 1.4, "更": 1.3, "相当": 1.3, "明显": 1.3, "显著": 1.5, "大幅": 1.6, "格外": 1.4, "很": 1.3,
  "比较": 0.9, "有点": 0.7, "稍微": 0.6, "略": 0.7, "略微": 0.7,
};
// 注意：不放单字"非"，以免误伤极高频的"非常"
const NEGATION = ["不是", "不会", "不能", "没有", "并非", "难以", "不", "没", "无", "别", "莫", "未", "勿"];
const CLAUSE_BREAK = /[，,。！？!?.；;、
	]/;

export interface SentimentResult {
  score: number; // -1(极负) ~ 1(极正)
  label: "positive" | "neutral" | "negative";
  positiveHits: string[];
  negativeHits: string[];
  negated: string[];
  method: "rule-based-lexicon-v1";
  note: string;
}

function collectHits(text: string, dict: string[]): { word: string; index: number }[] {
  const hits: { word: string; index: number }[] = [];
  for (const w of dict) {
    let from = 0;
    let idx = text.indexOf(w, from);
    while (idx !== -1) {
      hits.push({ word: w, index: idx });
      from = idx + w.length;
      idx = text.indexOf(w, from);
    }
  }
  // 按位置排序，去除被更长词包含的重复（如"涨"与"暴涨"）
  hits.sort((a, b) => a.index - b.index || b.word.length - a.word.length);
  const chosen: { word: string; index: number }[] = [];
  const occupied: [number, number][] = [];
  for (const h of hits) {
    const span: [number, number] = [h.index, h.index + h.word.length];
    const overlap = occupied.some(([s, e]) => span[0] < e && span[1] > s);
    if (!overlap) { chosen.push(h); occupied.push(span); }
  }
  return chosen;
}

export function sentiment(text: string): SentimentResult {
  const raw = text ?? "";
  const lower = raw.toLowerCase();
  const posHits = collectHits(lower, POS.map((w) => (w.charCodeAt(0) < 256 ? w.toLowerCase() : w)));
  const negHits = collectHits(lower, NEG.map((w) => (w.charCodeAt(0) < 256 ? w.toLowerCase() : w)));

  let score = 0;
  const positiveHits: string[] = [];
  const negativeHits: string[] = [];
  const negated: string[] = [];

  const clauseWindowBefore = (index: number): string => {
    let start = Math.max(0, index - 10);
    for (let i = index - 1; i >= Math.max(0, index - 10); i--) {
      if (CLAUSE_BREAK.test(raw[i] ?? "")) { start = i + 1; break; }
    }
    return raw.slice(start, index);
  };
  const scoreHits = (hits: { word: string; index: number }[], polarity: 1 | -1, bucket: string[]) => {
    for (const h of hits) {
      let weight = 1;
      const window = clauseWindowBefore(h.index);
      let flip = false;
      for (const neg of NEGATION) {
        if (window.includes(neg)) { flip = true; negated.push(h.word); break; }
      }
      for (const [d, v] of Object.entries(DEGREE)) {
        if (window.includes(d)) { weight = v; break; }
      }
      const finalPolarity = flip ? -polarity : polarity;
      score += finalPolarity * weight;
      bucket.push(h.word + (flip ? "(否定)" : ""));
    }
  };
  scoreHits(posHits, 1, positiveHits);
  scoreHits(negHits, -1, negativeHits);

  const normalized = Math.tanh(score / 2.5);
  const label = normalized > 0.12 ? "positive" : normalized < -0.12 ? "negative" : "neutral";
  return {
    score: Math.round(normalized * 100) / 100,
    label,
    positiveHits: [...new Set(positiveHits)],
    negativeHits: [...new Set(negativeHits)],
    negated: [...new Set(negated)],
    method: "rule-based-lexicon-v1",
    note: "规则词典情感，仅作可解释辅助；反讽/语境/立场请由调用方大模型终判",
  };
}

/** 对一组标题聚合情感分布 */
export function aggregateSentiment(texts: string[]) {
  const results = texts.map((t) => sentiment(t));
  const n = results.length || 1;
  const pos = results.filter((r) => r.label === "positive").length;
  const neg = results.filter((r) => r.label === "negative").length;
  const neu = results.length - pos - neg;
  const avg = results.reduce((s, r) => s + r.score, 0) / n;
  return {
    avgScore: Math.round(avg * 100) / 100,
    distribution: { positive: pos, neutral: neu, negative: neg, positivePct: Math.round((pos / n) * 100), negativePct: Math.round((neg / n) * 100) },
    method: "rule-based-lexicon-v1",
  };
}
