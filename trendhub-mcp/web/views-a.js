VIEWS.dashboard = async function (content) {
  const examples = ["广州太古汇", "Louis Vuitton", "小米汽车"];
  const recents = TH_STORE.recents();
  const watching = TH_STORE.watching();
  content.innerHTML = `
  <div class="home-page">
  <section class="home-hero">
    <h1 class="home-title">研究一个主体，先看证据再下结论</h1>
    <p class="home-sub">输入品牌、商场、产品、人物或话题，立即得到当前结论、趋势变化、平台表现、机会风险和可执行建议。</p>
    <form class="home-search" id="homeSearch">
      <input class="home-keyword" id="homeKeyword" type="search" autocomplete="off" aria-label="研究对象" placeholder="例如：广州太古汇">
      <button class="btn primary lg" type="submit">开始研究</button>
    </form>
    <div class="home-examples"><span>试试</span>${examples
      .map((x) => `<button type="button" class="example-chip" data-example="${esc(x)}">${esc(x)}</button>`)
      .join("")}</div>
  </section>

  <div class="home-columns">
    <section class="home-col">
      <div class="home-col-head"><h2>最近研究</h2><a class="home-link" href="#/research">＋ 新研究</a></div>
      <div id="homeRecent">${recents.length ? recents.map(homeRecentRow).join("") : homeEmpty("还没有研究记录，搜一个主体试试")}</div>
    </section>
    <section class="home-col">
      <div class="home-col-head"><h2>正在关注</h2><span class="home-hint">在研究结果页可一键加入</span></div>
      <div id="homeWatching">${watching.length ? watching.map(homeWatchingRow).join("") : homeEmpty("加入关注后，会在这里快速回到这些主体")}</div>
    </section>
  </div>

  <section class="home-discover">
    <div class="home-col-head"><h2>趋势发现</h2><a class="home-link" href="#/clusters">发现跨平台话题 →</a></div>
    <p class="home-hint">来自各平台最近一次成功采集的公开热点（小红书优先），点任意一条即可作为研究对象。</p>
    <div id="homeDiscover">${loading("正在读取最近热点…")}</div>
  </section>
  </div>`;

  const keywordInput = $("#homeKeyword", content);
  $("#homeSearch", content).addEventListener("submit", (e) => {
    e.preventDefault();
    startResearch(keywordInput.value);
  });
  content.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => startResearch(button.dataset.example));
  });
  bindHomeRows(content);
  loadHomeDiscover(content);
};

function homeEmpty(msg) {
  return `<div class="home-empty">${esc(msg)}</div>`;
}
function homeRecentRow(keyword) {
  return `<div class="home-row">
    <a class="home-row-main" href="#/research?keyword=${encodeURIComponent(keyword)}">${esc(keyword)}</a>
    <button type="button" class="home-row-action" data-del-recent="${esc(keyword)}" aria-label="删除该记录">删除</button>
  </div>`;
}
function homeWatchingRow(keyword) {
  return `<div class="home-row">
    <a class="home-row-main" href="#/research?keyword=${encodeURIComponent(keyword)}">${esc(keyword)}</a>
    <button type="button" class="home-row-action" data-unwatch="${esc(keyword)}">取消关注</button>
  </div>`;
}
function bindHomeRows(root) {
  root.querySelectorAll("[data-del-recent]").forEach((b) =>
    b.addEventListener("click", () => {
      TH_STORE.removeRecent(b.dataset.delRecent);
      b.closest(".home-row")?.remove();
    })
  );
  root.querySelectorAll("[data-unwatch]").forEach((b) =>
    b.addEventListener("click", () => {
      TH_STORE.toggleWatching(b.dataset.unwatch);
      b.closest(".home-row")?.remove();
    })
  );
}
async function loadHomeDiscover(root) {
  const box = $("#homeDiscover", root);
  try {
    const d = await api("/api/trending?mode=snapshot&limit=12");
    const results = (d.results || []).filter((r) => Array.isArray(r.items) && r.items.length);
    if (!results.length) {
      box.innerHTML = homeEmpty("暂时没有成功采集的热点快照，可到“热点榜”页实时刷新。");
      return;
    }
    const ordered = [...results].sort((a, b) => (a.platform === "xiaohongshu" ? -1 : b.platform === "xiaohongshu" ? 1 : 0));
    const rows = [];
    for (const r of ordered) {
      for (const item of r.items.slice(0, 3)) {
        rows.push({ platform: r.label, title: item.title, rank: item.rank });
        if (rows.length >= 12) break;
      }
      if (rows.length >= 12) break;
    }
    if (!rows.length) {
      box.innerHTML = homeEmpty("最近快照里还没有可展示的热点条目。");
      return;
    }
    box.innerHTML = rows
      .map(
        (x) => `<div class="discover-row">
          <button type="button" class="discover-title" data-keyword="${esc(x.title)}">${esc(x.title)}</button>
          <span class="discover-platform">${esc(x.platform)}${x.rank ? ` · #${esc(x.rank)}` : ""}</span>
        </div>`
      )
      .join("");
    box.querySelectorAll("[data-keyword]").forEach((b) =>
      b.addEventListener("click", () => startResearch(b.dataset.keyword))
    );
  } catch (e) {
    box.innerHTML = note("warn", `热点暂时读取不到：${esc(e.message)}`);
  }
}

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
