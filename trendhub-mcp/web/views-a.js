VIEWS.dashboard = async function (content) {
  content.innerHTML = loading();
  const [health, universe] = await Promise.all([
    api("/api/health"),
    api("/api/professional/sources?priority=P1"),
    ensureMeta(),
  ]);
  const universeCounts = universe.counts || {};
  content.innerHTML = `
    <section class="workspace-home">
      <div class="workspace-home-copy">
        <span class="eyebrow">TrendHub · Agent-native Trend Intelligence</span>
        <h2>不是看新闻。直接研究你关心的主体。</h2>
        <p>输入品牌、公司、商业体、产品或 Campaign。TrendHub 会主动取证，再给出当前状态、变化、驱动、机会、风险、证据缺口和下一步。</p>
        <div class="workspace-search">
          <input id="homeResearchKeyword" placeholder="例如：广州太古汇 / Louis Vuitton / 小米汽车 / 某个 Campaign" />
          <button class="btn primary" id="homeResearchRun">开始研究</button>
        </div>
        <div class="workspace-examples">
          <button data-example="广州太古汇">广州太古汇</button>
          <button data-example="Louis Vuitton">Louis Vuitton</button>
          <button data-example="小米汽车">小米汽车</button>
        </div>
      </div>
      <div class="workspace-principles">
        <div><strong>Entity-first</strong><span>品牌/商业主体先主动检索，不再只扫热榜。</span></div>
        <div><strong>Decision-first</strong><span>结果先给判断和行动，再给原始证据。</span></div>
        <div><strong>Evidence-first</strong><span>缺失 ≠ 0；每个结论保留来源和限制。</span></div>
      </div>
    </section>

    <section class="home-capabilities">
      <div class="section-heading"><div><span class="eyebrow">INTELLIGENCE OUTPUT</span><h2>一次研究要回答什么</h2></div></div>
      <div class="capability-rail">
        <div><span>01</span><strong>现在怎样</strong><p>主体当前可见度、证据强度、趋势状态。</p></div>
        <div><span>02</span><strong>发生什么</strong><p>搜索、新闻、社交、历史信号发生了什么变化。</p></div>
        <div><span>03</span><strong>为什么</strong><p>重复主题、相关搜索和跨信号驱动线索。</p></div>
        <div><span>04</span><strong>怎么办</strong><p>机会、风险、证据缺口和优先行动。</p></div>
      </div>
    </section>

    <section class="home-system">
      <div class="section-heading"><div><span class="eyebrow">PRODUCTION TRUTH</span><h2>当前能力边界</h2></div></div>
      <div class="stats-grid">
        ${scoreCard ? "" : ""}
        ${statCard(health.platformCount, "运行时平台")}
        ${statCard(universeCounts.total ?? 0, "分层专业信源")}
        ${statCard(health.tools || 21, "稳定 MCP Tools")}
        ${statCard(health.runtime === "remote" ? "公网" : (window.TRENHUB_RUNTIME_MODE || "本地"), "运行模式")}
      </div>
      <div class="home-paths">
        ${quickCard("professional", "主体研究", "品牌 / 公司 / 商业体 / 产品 / Campaign → Entity-first Intelligence")}
        ${quickCard("clusters", "趋势发现", "没有明确主体时，发现多平台正在共振的话题")}
        ${quickCard("xhs", "小红书证据", "查看公开推荐流、内容证据与本地登录态增强")}
        ${quickCard("sources", "证据覆盖", "查看哪些信源已上线、需要授权或仍在规划")}
      </div>
    </section>

    <section class="home-discipline">
      <div><strong>热榜不是市场全貌</strong><p>主体未进入热榜，只能说明“当前没有热榜命中”，不能推导“无人讨论”。</p></div>
      <div><strong>公网不收私人 Cookie</strong><p>需要登录态增强时只在使用者自己的本地 TrendHub 配置，公共 Remote MCP 保持共享安全边界。</p></div>
      <div><strong>预测不是概率</strong><p>预测必须带验证等级与不确定区间；历史不足时直接返回 insufficient_history。</p></div>
    </section>`;

  const run = () => {
    const keyword = $("#homeResearchKeyword").value.trim();
    if (!keyword) return toast("请输入研究主体");
    location.hash = `#/professional?keyword=${encodeURIComponent(keyword)}`;
  };
  $("#homeResearchRun").onclick = run;
  $("#homeResearchKeyword").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  content.querySelectorAll("[data-example]").forEach((button) => {
    button.onclick = () => {
      $("#homeResearchKeyword").value = button.dataset.example || "";
      run();
    };
  });
  content.querySelectorAll("[data-quick]").forEach((t) =>
    t.addEventListener("click", () => (location.hash = `#/${t.dataset.quick}`))
  );
};

function statCard(num, lbl) {
  return `<div class="card stat"><span class="num">${esc(num)}</span><span class="lbl">${esc(lbl)}</span></div>`;
}
function quickCard(view, name, desc) {
  return `<div class="card" data-quick="${view}" style="cursor:pointer"><h3>${esc(name)}</h3><p class="sub">${esc(desc)}</p></div>`;
}

/* 小红书主打专区 */
VIEWS.xhs = function (content) {
  content.innerHTML = `
    <p class="lead">小红书主打专区：官方首页『热门推荐流』真实笔记（封面 / 作者 / 点赞 / 原文）+ 由热门标题词频派生的高频话题词。游客零配置可用热门流；官方热搜词榜与关键词搜索需配置 <span class="mono">XHS_COOKIE</span>。</p>
    <div class="controls">
      <label class="field">笔记条数<select id="f-limit">${[20, 30, 40].map((n) => `<option value="${n}" ${n === 30 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <button class="btn primary" id="btn-go">实时刷新小红书热点</button>
      <button class="btn" id="btn-copy">复制选题素材给 AI</button>
      <span id="mode"></span>
    </div>
    <div id="out">${loading()}</div>`;
  let last = null;
  const renderXhs = (d) => {
    last = d;
    const feed = d.feed || {};
    const items = feed.items || [];
    const topics = (d.derivedTopics && d.derivedTopics.topics) || [];
    const hot = d.officialHotlist;
    $("#mode").innerHTML = d.loggedIn ? `<span class="badge ok">登录态 · 全能力</span>` : `<span class="badge neutral">游客模式 · 热门流开放</span>`;
    const modeNote = d.loggedIn
      ? note("info", "已检测到 XHS_COOKIE：热门推荐流与官方热搜词榜均可用。")
      : note("warn", "游客模式：下方为官方首页『热门推荐流』（平台推荐序，<strong>非官方热搜词榜</strong>），点赞为展示近似值（如 4.1万 / 10万+，非精确整数）。配置 XHS_COOKIE 后解锁官方热搜词榜与关键词爆款搜索。");
    const feedWarn = feed.dataQuality && feed.dataQuality !== "ok" ? note(feed.dataQuality === "missing" ? "err" : "warn", esc(feed.note || "")) : "";
    const cards = items.length
      ? `<div class="xhs-grid">${items.map(xhsCard).join("")}</div>`
      : empty(feed.note || "本次未取到笔记，可稍后刷新");
    const topicList = topics.length
      ? topics.map((t) => `<div class="xhs-word" title="${esc((t.examples || []).join(" / "))}"><span class="xhs-w-text">${xhsTopicBadge(t)}${esc(t.word)}</span><span class="xhs-w-freq">${xhsTopicFreq(t)}</span></div>`).join("")
      : empty("样本不足，暂无派生词");
    const hotItems = hot && hot.items ? hot.items.slice(0, 24) : [];
    const hotBlock = hotItems.length
      ? `<div class="card xhs-side-card"><h3>官方热搜词榜 <span class="badge ok">登录</span></h3>${hotItems.map((h, i) => `<div class="xhs-word"><span class="xhs-w-text"><span class="xhs-rank">${i + 1}</span>${linkOrText(h.title, h.url)}</span><span class="xhs-w-freq">${esc(h.hotText || "")}</span></div>`).join("")}</div>`
      : `<div class="card xhs-side-card"><h3>官方热搜词榜</h3>${note("info", "官方词榜仅登录态开放：在启动环境设置 XHS_COOKIE（含 a1 与 web_session）后重启。游客请使用左侧热门推荐流与派生词。")}</div>`;
    $("#out").innerHTML =
      modeNote +
      `<div class="grid cols-3" style="margin-bottom:14px">${statCard(items.length, "热门笔记")}${statCard(topics.length, "派生话题词")}${statCard(d.loggedIn ? "已解锁" : "未配置", "官方词榜 / 搜索")}</div>` +
      `<div class="xhs-layout">
        <div class="xhs-main">
          <div class="xhs-head"><div class="section-title" style="margin:0">热门推荐笔记</div><span class="captured" style="margin:0">采集 ${fmtTime(feed.capturedAt)}</span></div>
          ${feedWarn}${cards}
        </div>
        <div class="xhs-side">
          <div class="card xhs-side-card"><h3>派生高频话题词 <span class="badge neutral">非官方词榜</span></h3>
            <p class="sub" style="margin:-4px 0 10px">热=跨篇高频词；#=作者标签；话题=作者空格标注（单篇候选）。均为标题派生、非官方词榜</p>${topicList}</div>
          ${hotBlock}
        </div>
      </div>`;
  };
  const run = async (sourceMode = "live") => {
    $("#out").innerHTML = loading();
    try {
      const d = await api(`/api/xhs/topics?limit=${$("#f-limit").value}&topic_limit=24&mode=${encodeURIComponent(sourceMode)}`);
      renderXhs(d);
    } catch (e) {
      $("#out").innerHTML = note("err", esc(e.message));
    }
  };
  $("#btn-go").addEventListener("click", () => run("live"));
  $("#btn-copy").addEventListener("click", () => {
    if (!last) return toast("请先刷新小红书热点");
    copyText(xhsBriefText(last), "已复制小红书选题素材，粘贴给你的 AI 即可");
  });
  run("snapshot");
};
function xhsTopicBadge(t) {
  if (t.source === "cross") return '<span class="badge accent">热 ' + t.df + "</span>";
  if (t.source === "hashtag") return '<span class="badge accent">#</span>';
  return '<span class="badge neutral">话题</span>';
}
function xhsTopicFreq(t) {
  if (t.source === "cross") return t.df + " 篇" + (t.tf > t.df ? ` · ${t.tf}次` : "");
  return t.source === "hashtag" ? "标签" : "作者标注";
}
function xhsCard(it) {
  const inner =
    (safeUrl(it.imageUrl)
      ? `<img class="xhs-img" src="${esc(it.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="xhs-img ph"><span>${esc(Array.from(it.title || "").slice(0, 2).join("") )}</span></div>`) +
    (it.kind === "video" ? `<span class="xhs-kind">视频</span>` : "") +
    (it.hotText ? `<span class="xhs-like">${esc(it.hotText)}</span>` : "");
  const cover = safeUrl(it.url)
    ? `<a class="xhs-cover" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<div class="xhs-cover">${inner}</div>`;
  return `<div class="xhs-card">${cover}
    <div class="xhs-body"><div class="xhs-title">${linkOrText(it.title, it.url)}</div>
    <div class="xhs-author">${esc(it.author || "")}</div></div></div>`;
}
function xhsBriefText(d) {
  const feed = d.feed || {}, items = feed.items || [], topics = (d.derivedTopics && d.derivedTopics.topics) || [];
  const hot = (d.officialHotlist && d.officialHotlist.items) || [];
  const L = [];
  L.push("【小红书当下热点 · 选题素材】");
  L.push(`采集时间：${feed.capturedAt || ""}；口径：官方首页热门推荐流（平台推荐序，非官方热搜词榜），点赞为展示近似值。`);
  L.push("");
  L.push(`一、热门笔记 TOP ${items.length}：`);
  items.forEach((it, i) => L.push(`${i + 1}. ${it.title} — @${it.author || ""} — 赞${it.hotText || "—"} ${it.url || ""}`));
  L.push("");
  L.push("二、热门话题词（标题派生，非官方词榜，供复核）：");
  const cross = topics.filter((t) => t.source === "cross");
  const tags = topics.filter((t) => t.source === "hashtag");
  const auth = topics.filter((t) => t.source === "author");
  if (cross.length) L.push("跨篇热词：" + cross.map((t) => `${t.word}(${t.df}篇)`).join("、"));
  if (tags.length) L.push("作者#标签：" + tags.map((t) => `#${t.word}`).join("、"));
  if (auth.length) L.push("作者话题（单篇选题候选）：" + auth.map((t) => t.word).join("、"));
  if (hot.length) {
    L.push("");
    L.push("三、官方热搜词榜：");
    hot.forEach((h, i) => L.push(`${i + 1}. ${h.title}`));
  }
  L.push("");
  L.push("请基于以上真实热点，按 xiaohongshu-note 模板产出 3 个选题方向、5 个标题钩子与一篇笔记正文框架；数据不得编造，缺失标注[待补充]。");
  return L.join("\n");
}

/* 当下热榜 */
