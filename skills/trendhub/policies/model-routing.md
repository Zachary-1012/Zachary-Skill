# Model routing

Route by capability, license, runtime fit, language, context length, structured-output reliability, privacy, and observed quality.

Priority:

1. The user's current host AI when TrendHub runs inside an MCP Apps host.
2. A user-controlled, commercially usable open-weight model exposed through an OpenAI-compatible endpoint.
3. An honest unavailable state when neither exists.

For open models, prefer permissive licenses such as Apache-2.0 and verify the exact checkpoint's current official model card before commercial deployment. Current examples include gpt-oss, Qwen3, and Apache-licensed Mistral releases; names are examples, not permanent ranking truth.

Never persist an API token in TrendHub project data, send a token to TrendHub's hosted gateway, or silently fall back to an undisclosed provider. Record provider/model labels and failure states with the project. Model output cannot create factual Evidence.
