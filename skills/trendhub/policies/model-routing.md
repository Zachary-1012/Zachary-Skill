# Model routing

Route by capability, license, runtime fit, language, context length, structured-output reliability, privacy, and observed quality.

Priority:

1. The user's current host AI when TrendHub runs inside an MCP Apps host.
2. A user-configured DeepSeek or Zhipu API connection in the local TrendHub runtime.
3. A user-controlled, commercially usable open-weight model exposed through a loopback OpenAI-compatible endpoint.
4. An honest unavailable state when none exists.

For open models, prefer permissive licenses such as Apache-2.0 and verify the exact checkpoint's current official model card before commercial deployment. Current examples include gpt-oss, Qwen3, and Apache-licensed Mistral releases; names are examples, not permanent ranking truth.

The Settings page may accept an API Key for DeepSeek or Zhipu, or a token for a
loopback OpenAI-compatible endpoint. Keys live only in the local Node.js process
and disappear when it exits. Never persist a token in browser storage, TrendHub
project data, files, logs, snapshots, diagnostics, or the hosted gateway.

Provider selection is explicit. Record provider/model labels and failure states
with the project, and never silently fall back to an undisclosed provider.
Model output cannot create factual Evidence.
