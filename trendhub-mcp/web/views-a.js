VIEWS.dashboard = async function (content) {
  const recents = TH_STORE.recents();
  const watching = TH_STORE.watching();

  content.innerHTML = `
    <div class="home-page">
      <section class="home-create" aria-labelledby="homeCreateTitle">
        <h1 id="homeCreateTitle">说一句，直接创作</h1>
        <p>不填表。TrendHub 自动判断平台与格式，研究证据后交给当前 AI 生成成稿。</p>
        <form id="homeCreateForm" class="home-create-form">
          <textarea id="homeCreatePrompt" rows="3" placeholder="例如：为一家新消费品牌写一篇面向年轻职场人的小红书种草笔记"></textarea>
          <button class="maple-button" type="submit">开始创作</button>
        </form>
        <nav class="creation-platform-bar" aria-label="常用内容平台">
          ${Object.entries(window.TrendHubCreationPresets || {}).map(([id, item]) => `<button type="button" data-create-platform="${esc(id)}">${esc(item.label)}</button>`).join("")}
        </nav>
      </section>
      <section class="home-command">
        <form class="home-search" id="homeSearch">
          <input class="home-keyword" id="homeKeyword" type="search" autocomplete="off"
            aria-label="研究对象" placeholder="研究品牌、公司、产品、行业或话题">
          <button class="btn primary lg" type="submit">研究</button>
        </form>
        <div class="home-examples">
          <span>例如</span>
          <button type="button" class="example-chip" data-example="广州太古汇">广州太古汇</button>
          <button type="button" class="example-chip" data-example="Louis Vuitton">Louis Vuitton</button>
          <button type="button" class="example-chip" data-example="AI 眼镜">AI 眼镜</button>
        </div>
      </section>

      <section class="home-work">
        <div class="home-section-head">
          <h2>最近研究</h2>
        </div>
        <div id="homeRecent">
          ${recents.length ? recents.map(homeRecentRow).join("") : homeEmpty("还没有研究记录")}
        </div>
      </section>

      ${watching.length ? `
        <section class="home-work">
          <div class="home-section-head">
            <h2>关注</h2>
          </div>
          <div id="homeWatching">${watching.map(homeWatchingRow).join("")}</div>
        </section>` : ""}

      <section class="home-work">
        <div class="home-section-head">
          <h2>最近出现</h2>
          <a class="home-link" href="#/discover">去发现</a>
        </div>
        <div id="homeDiscover">${loading("正在读取最近数据…")}</div>
      </section>
    </div>`;

  const keywordInput = $("#homeKeyword", content);
  $("#homeCreateForm", content).addEventListener("submit", (event) => {
    event.preventDefault();
    const prompt = $("#homeCreatePrompt", content).value.trim();
    if (!prompt) return toast("直接说出你想创作什么");
    window.startTrendHubCreation(prompt, "auto");
  });
  content.querySelectorAll("[data-create-platform]").forEach((button) => button.addEventListener("click", () => {
    const prompt = $("#homeCreatePrompt", content).value.trim();
    window.startTrendHubCreation(prompt, button.dataset.createPlatform);
  }));
  $("#homeSearch", content).addEventListener("submit", (event) => {
    event.preventDefault();
    startResearch(keywordInput.value);
  });
  content.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => startResearch(button.dataset.example));
  });
  bindHomeRows(content);
  loadHomeDiscover(content);
};

function homeEmpty(message) {
  return `<div class="home-empty">${esc(message)}</div>`;
}

function homeRecentRow(keyword) {
  return `<div class="home-row">
    <a class="home-row-main" href="#/research?keyword=${encodeURIComponent(keyword)}">${esc(keyword)}</a>
    <button type="button" class="home-row-action" data-del-recent="${esc(keyword)}" aria-label="删除该记录">移除</button>
  </div>`;
}

function homeWatchingRow(keyword) {
  return `<div class="home-row">
    <a class="home-row-main" href="#/research?keyword=${encodeURIComponent(keyword)}">${esc(keyword)}</a>
    <button type="button" class="home-row-action" data-unwatch="${esc(keyword)}">取消关注</button>
  </div>`;
}

function bindHomeRows(root) {
  root.querySelectorAll("[data-del-recent]").forEach((button) =>
    button.addEventListener("click", () => {
      TH_STORE.removeRecent(button.dataset.delRecent);
      button.closest(".home-row")?.remove();
      renderSidebarRecents?.();
    })
  );
  root.querySelectorAll("[data-unwatch]").forEach((button) =>
    button.addEventListener("click", () => {
      TH_STORE.toggleWatching(button.dataset.unwatch);
      button.closest(".home-row")?.remove();
    })
  );
}

async function loadHomeDiscover(root) {
  const box = $("#homeDiscover", root);
  try {
    const d = await api("/api/trending?mode=snapshot&limit=6");
    const rows = [];
    for (const platform of (d.results || [])) {
      if (!Array.isArray(platform.items)) continue;
      for (const item of platform.items.slice(0, 2)) {
        rows.push({ platform: platform.label, title: item.title });
        if (rows.length >= 8) break;
      }
      if (rows.length >= 8) break;
    }
    if (!rows.length) {
      box.innerHTML = homeEmpty("暂时没有可用的最近数据");
      return;
    }
    box.innerHTML = rows.map((row) => `
      <div class="discover-row">
        <button type="button" class="discover-title" data-keyword="${esc(row.title)}">${esc(row.title)}</button>
        <span class="discover-platform">${esc(row.platform)}</span>
      </div>`).join("");
    box.querySelectorAll("[data-keyword]").forEach((button) => {
      button.addEventListener("click", () => startResearch(button.dataset.keyword));
    });
  } catch (error) {
    box.innerHTML = homeEmpty("最近数据暂时不可用");
  }
}

/* 小红书主打专区 */
VIEWS.xhs = function (content) {
  content.innerHTML = `
    <p class="lead">行业内容雷达：聚焦品牌营销、商业运营、广告与媒体。小红书登录态优先使用关键词证据；游客模式只保留与行业或输入主题直接相关的推荐内容，受限时自动显示可追溯的行业公开证据。</p>
    <div class="controls">
      <label class="field">行业 / 品牌 / Campaign<input id="xhs-focus" type="search" value="品牌营销 商业运营 广告 媒体" placeholder="例如：零售媒体、品牌出海、某个 Campaign"></label>
      <label class="field">笔记条数<select id="f-limit">${[20, 30, 40].map((n) => `<option value="${n}" ${n === 30 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <button class="btn primary" id="btn-go">获取行业相关结果</button>
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
    const fallback = d.usefulFallback || null;
    const fallbackItems = fallback && Array.isArray(fallback.items) ? fallback.items : [];
    $("#mode").innerHTML = d.loggedIn ? `<span class="badge ok">登录态 · 全能力</span>` : `<span class="badge neutral">游客模式 · 行业聚焦</span>`;
    const modeNote = d.loggedIn
      ? note("info", "已使用本地授权会话；优先返回主题相关平台证据。")
      : note("warn", "游客模式不会展示泛化推荐流；只保留行业/主题直接命中。平台受限或没有命中时，下方替代层提供行业媒体、新闻与公开讨论证据，并明确区分来源。");
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
      : `<div class="card xhs-side-card"><h3>官方热搜词榜</h3>${note("info", "官方词榜仅登录态开放；游客结果由行业公开证据补足，不伪装成官方词榜。")}</div>`;
    const fallbackBlock = fallbackItems.length
      ? `<div class="card" style="margin:14px 0"><div class="section-title">${esc(fallback.label || "行业公开证据替代层")} <span class="badge neutral">非小红书热榜</span></div><p class="sub">${esc(fallback.reason || "")}</p>${fallbackItems.slice(0, 18).map((item) => `<div class="discover-row"><div><strong>${linkOrText(item.title, item.url)}</strong><div class="meta">${esc(item.source || "公开来源")} · ${item.publishedAt ? esc(fmtTime(item.publishedAt)) : "时间未提供"}</div></div><span class="discover-platform">${esc(item.family || "evidence")}</span></div>`).join("")}</div>`
      : "";
    $("#out").innerHTML =
      modeNote +
      `<div class="grid cols-3" style="margin-bottom:14px">${statCard(items.length, "行业相关平台内容")}${statCard(fallbackItems.length, "替代公开证据")}${statCard(d.loggedIn ? "已解锁" : "游客聚焦", "平台模式")}</div>` +
      fallbackBlock +
      `<div class="xhs-layout">
        <div class="xhs-main">
          <div class="xhs-head"><div class="section-title" style="margin:0">行业相关平台内容</div><span class="captured" style="margin:0">采集 ${fmtTime(feed.capturedAt)}</span></div>
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
      const focus = $("#xhs-focus").value.trim();
      const d = await api(`/api/xhs/topics?limit=${$("#f-limit").value}&topic_limit=24&industry_only=1&focus=${encodeURIComponent(focus)}&mode=${encodeURIComponent(sourceMode)}`);
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
  const fallback = (d.usefulFallback && d.usefulFallback.items) || [];
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
  if (fallback.length) {
    L.push("");
    L.push("四、行业公开证据替代层（非小红书热榜）：");
    fallback.slice(0, 18).forEach((item, i) => L.push(`${i + 1}. ${item.title} — ${item.source || "公开来源"} — ${item.url || ""}`));
  }
  L.push("");
  L.push("请基于以上真实热点，按 xiaohongshu-note 模板产出 3 个选题方向、5 个标题钩子与一篇笔记正文框架；数据不得编造，缺失标注[待补充]。");
  return L.join("\n");
}

/* 当下热榜 */
