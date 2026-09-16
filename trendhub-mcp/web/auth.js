/* TrendHub 控制台 HTTP 鉴权桥。
 * loopback 默认无 Token；远程私有网络模式下，遇到 401 时只在当前浏览器会话中询问并保存 Token。
 * Token 使用 sessionStorage，不写入仓库、不持久化到服务器，也不放进 URL。
 */
"use strict";

(() => {
  const KEY = "trendhub_http_token";
  const originalFetch = window.fetch.bind(window);
  let prompting = false;

  function isProtectedRequest(input) {
    try {
      const u = new URL(typeof input === "string" ? input : input.url, location.href);
      return u.origin === location.origin && (u.pathname === "/mcp" || u.pathname.startsWith("/api/"));
    } catch {
      return false;
    }
  }

  function withToken(init = {}) {
    const token = sessionStorage.getItem(KEY) || "";
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return { ...init, headers };
  }

  async function askToken() {
    if (prompting) return null;
    prompting = true;
    try {
      const token = window.prompt("TrendHub 远程访问需要 TRENTHUB_HTTP_TOKEN。请输入主机端配置的 Token：", "");
      const clean = (token || "").trim();
      if (!clean) return null;
      sessionStorage.setItem(KEY, clean);
      return clean;
    } finally {
      prompting = false;
    }
  }

  window.fetch = async (input, init = {}) => {
    if (!isProtectedRequest(input)) return originalFetch(input, init);

    let response = await originalFetch(input, withToken(init));
    if (response.status !== 401) return response;

    sessionStorage.removeItem(KEY);
    const token = await askToken();
    if (!token) return response;
    response = await originalFetch(input, withToken(init));
    if (response.status === 401) sessionStorage.removeItem(KEY);
    return response;
  };
})();
