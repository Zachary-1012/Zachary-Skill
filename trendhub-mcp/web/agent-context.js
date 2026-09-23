/* Read-only page context adapter. It is feature-detected and does not claim a
 * browser-native WebMCP implementation; hosts may use this stable bridge. */
(function () {
  const tools = ["search_trends", "inspect_topic", "compare_topics", "show_source_health", "open_evidence", "build_brief", "create_content_project"];
  const safeArgs = (args) => {
    const value = args && typeof args === "object" ? args : {};
    return Object.fromEntries(Object.entries(value).filter(([key, v]) => !/cookie|secret|token|password/i.test(key) && ["string", "number", "boolean"].includes(typeof v)));
  };
  window.TRENDHUB_WEBMCP = {
    version: "2.0.1",
    mode: "content-workspace",
    listTools: () => [...tools],
    getContext: () => ({ version: "2.0.1", route: location.hash || "#/studio", title: document.title, localFirst: true }),
    call: async (name, args) => {
      if (!tools.includes(name)) throw new Error("unsupported page capability");
      if (name === "create_content_project") {
        window.createTrendHubProject?.();
        return { ok: true, localOnly: true };
      }
      const query = new URLSearchParams(safeArgs(args));
      const response = await fetch(`/api/${name === "search_trends" ? "curve" : name === "show_source_health" ? "source-health" : "topic"}?${query}`);
      if (!response.ok) throw new Error(`page capability failed: ${response.status}`);
      return response.json();
    },
  };
})();
