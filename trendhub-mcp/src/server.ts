import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/definitions.js";

export const SERVER_NAME = "trendhub-mcp";
export const SERVER_VERSION = "1.0.0";

/** 创建一个 MCP server 实例并注册全部工具（stateless HTTP 模式下每请求新建） */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        "TrendHub 是公司级全网热点趋势插件：提供当下热榜、跨平台共振、趋势变化、Google Trends 热度与相关词、未来信号、节点日历、话题深度分析，以及脚本/文案/方案的专家创作简报。数据缺失会显式标记 missing/degraded，不会编造；成稿创作请由你（调用方模型）基于工具返回的证据完成。",
    }
  );
  registerTools(server);
  return server;
}
