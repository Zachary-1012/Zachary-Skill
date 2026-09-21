/**
 * Local-only runtime connections for the TrendHub content studio.
 *
 * Secrets live only in this Node.js process. They are never written to project
 * data, browser storage, logs, snapshots, or the public remote gateway.
 */
import { xhsClient } from "../sources/xhs/guest.js";

export interface ConnectionsApiResponse {
  status: number;
  data: unknown;
}

type Provider = "deepseek" | "zhipu" | "openai-compatible";

interface AiRuntime {
  provider: Provider;
  endpoint: string;
  model: string;
  apiKey: string;
  configuredAt: string;
}

const PROVIDERS: Record<Provider, { label: string; endpoint: string; model: string }> = {
  deepseek: {
    label: "DeepSeek",
    endpoint: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
  },
  zhipu: {
    label: "智谱 BigModel",
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    model: "",
  },
  "openai-compatible": {
    label: "本地 / 自托管",
    endpoint: "http://127.0.0.1:11434/v1",
    model: "",
  },
};

let aiRuntime: AiRuntime | null = null;

function error(message: string, status = 400): ConnectionsApiResponse {
  return { status, data: { error: message } };
}

function bodyObject(body: string): Record<string, unknown> {
  if (!body.trim()) return {};
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("请求体必须是 JSON 对象");
  return parsed as Record<string, unknown>;
}

function text(input: unknown, max = 2000): string {
  return typeof input === "string" ? input.trim().slice(0, max) : "";
}

function providerOf(value: unknown): Provider | null {
  return value === "deepseek" || value === "zhipu" || value === "openai-compatible" ? value : null;
}

function localEndpoint(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("本地端点不是有效 URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("本地端点只支持 HTTP/HTTPS");
  const host = url.hostname.toLowerCase();
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    throw new Error("自定义端点仅允许本机回环地址，避免服务器代请求任意网络地址");
  }
  return url.toString().replace(/\/$/, "");
}

function endpointFor(provider: Provider, input: string): string {
  if (provider === "openai-compatible") return localEndpoint(input || PROVIDERS[provider].endpoint);
  return PROVIDERS[provider].endpoint;
}

function chatUrl(base: string): string {
  return base.replace(/\/$/, "") + "/chat/completions";
}

function publicStatus() {
  return {
    runtime: "local",
    secretsPersisted: false,
    ai: aiRuntime
      ? {
          configured: true,
          provider: aiRuntime.provider,
          providerLabel: PROVIDERS[aiRuntime.provider].label,
          model: aiRuntime.model,
          endpoint: aiRuntime.endpoint,
          configuredAt: aiRuntime.configuredAt,
        }
      : { configured: false },
    xhs: {
      configured: xhsClient.hasLoginCookie(),
      mode: xhsClient.hasLoginCookie() ? "cookie" : "guest",
    },
    providers: Object.entries(PROVIDERS).map(([id, value]) => ({
      id,
      label: value.label,
      endpoint: value.endpoint,
      suggestedModel: value.model,
    })),
  };
}

async function configureAi(input: Record<string, unknown>): Promise<ConnectionsApiResponse> {
  const provider = providerOf(input.provider);
  if (!provider) return error("不支持的 AI 提供方");
  const apiKey = text(input.apiKey, 12000);
  const model = text(input.model, 200);
  if (!model) return error("请填写模型名称");
  if (provider !== "openai-compatible" && !apiKey) return error("请填写 API Key");
  const endpoint = endpointFor(provider, text(input.endpoint, 1000));
  aiRuntime = { provider, endpoint, model, apiKey, configuredAt: new Date().toISOString() };
  return { status: 200, data: { ok: true, ...publicStatus() } };
}

async function generate(input: Record<string, unknown>): Promise<ConnectionsApiResponse> {
  if (!aiRuntime) return error("尚未配置本地 AI 连接", 409);
  const prompt = text(input.prompt, 120000);
  if (!prompt) return error("缺少创作提示");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (aiRuntime.apiKey) headers.Authorization = `Bearer ${aiRuntime.apiKey}`;
    const response = await fetch(chatUrl(aiRuntime.endpoint), {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: aiRuntime.model,
        stream: false,
        temperature: 0.72,
        messages: [
          {
            role: "system",
            content: "你是证据约束的资深内容创作者。事实不确定时明确标注，不得编造。输出完整可编辑制品。",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as any;
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error || `AI 端点 HTTP ${response.status}`;
      return error(String(message), response.status >= 400 && response.status < 500 ? 400 : 502);
    }
    const output = payload?.choices?.[0]?.message?.content;
    if (typeof output !== "string" || !output.trim()) return error("AI 返回了空内容", 502);
    return {
      status: 200,
      data: {
        output: output.trim(),
        provider: aiRuntime.provider,
        providerLabel: PROVIDERS[aiRuntime.provider].label,
        model: aiRuntime.model,
      },
    };
  } catch (cause) {
    return error(cause instanceof Error && cause.name === "AbortError" ? "AI 请求超时" : "AI 连接失败", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleConnectionsApi(
  pathname: string,
  method: string,
  body: string
): Promise<ConnectionsApiResponse | null> {
  if (!pathname.startsWith("/api/connections/")) return null;
  try {
    if (pathname === "/api/connections/status" && method === "GET") {
      return { status: 200, data: publicStatus() };
    }
    if (pathname === "/api/connections/ai" && method === "POST") {
      return await configureAi(bodyObject(body));
    }
    if (pathname === "/api/connections/ai/clear" && method === "POST") {
      aiRuntime = null;
      return { status: 200, data: { ok: true, ...publicStatus() } };
    }
    if (pathname === "/api/connections/ai/generate" && method === "POST") {
      return await generate(bodyObject(body));
    }
    if (pathname === "/api/connections/xhs" && method === "POST") {
      const cookie = text(bodyObject(body).cookie, 64000);
      const result = xhsClient.setLoginCookie(cookie);
      return result.ok
        ? { status: 200, data: { ok: true, ...publicStatus() } }
        : error(result.error || "Cookie 不可用");
    }
    if (pathname === "/api/connections/xhs/clear" && method === "POST") {
      xhsClient.clearLoginCookie();
      return { status: 200, data: { ok: true, ...publicStatus() } };
    }
    return error("连接设置接口不存在", 404);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "连接设置失败");
  }
}
