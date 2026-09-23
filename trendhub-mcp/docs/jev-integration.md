# Jev 来源标题复核

TrendHub 平台统一接入 TypeSafe Jev，供网页与 Skill/MCP 使用者按需复核公开来源标题与当前主题的语义匹配。使用者不需要自己的 API Key。创作仍由宿主 AI 或已连接的生成模型完成；Jev 的结果不修改原始 Evidence、研究结论、排序或发布状态。

## 选型

- 使用 TypeSafe 官方 API 的固定模型 `jev-1.13.0`，避免 `jev-latest` 更新后阈值和判断语义悄悄变化。[官方模型目录](https://docs.typesafe.ai/models)
- 每次用户点击“用 Jev 复核标题”或明确要求 Skill 执行 Jev 复核时才发送一次请求。一个请求包含主题和最多 8 条标题，每条标题对应一个 Noul 问题。[官方 API](https://docs.typesafe.ai/api)、[Noul 文档](https://docs.typesafe.ai/primitives/noul)
- 只发送研究主题与公开标题；不发送 Cookie、草稿、来源 URL 或用户私有工作区内容。平台运营方通过服务端 `TYPESAFE_API_KEY` 配置凭据，网页与 MCP 使用者均不能提交或读取密钥。公网服务设置全局及客户端每日额度。
- 不采用第三方 Jev 包装器或本地复刻作为默认模型。GitHub 上的 [jev-harness](https://github.com/TypeSafeAI/jev-harness) 和 [clarity-judge](https://github.com/TypeSafeAI/clarity-judge) 明确是独立社区项目；[AnyJev](https://github.com/nokia-applied-research/AnyJev) 是以其他模型实现 Jev 风格判断，不能等同 TypeSafe Jev 权重。

## 使用

1. 平台运营方在 Railway 服务密钥配置中设置 `TYPESAFE_API_KEY`，本地自托管可用同名环境变量。访客不需配置。
2. 网页使用者打开有公开来源的研究结果，在“哪些平台支持这个判断”处点击“用 Jev 复核标题”。Skill/MCP 使用者明确提出 Jev 复核时，`get_content_brief` 传入 `jev_review_public_titles: true`。
3. 查看每条标题的“直接讨论当前主题”判断概率和原始来源链接；结合原始证据人工判断。若平台未配置凭据，则明确显示不可用，原研究流程继续可用。

TypeSafe 说明 Jev 1.13 的英文表现优于包括中文在内的其他语言，且会在长而无关的状态、计数、日期和间接推理任务上失误。[模型目录](https://docs.typesafe.ai/models)、[已知局限](https://docs.typesafe.ai/model-jaggedness/jev-1.13)。因此这里保持标题输入简短，不设自动通过阈值，不把概率解释成来源可信度、热度或事实真伪。缺少 Key、限流或 API 故障时显示不可用；原研究流程继续可用。

这项接入的离线测试用模拟 API 响应验证请求形状、密钥边界和错误处理。真实 Jev 判断质量仍须使用平台账户与中文标注样本验证，不能从离线模拟结果推断。对外启用前，应核实 TypeSafe 服务条款与预计公共请求量，并确认 Railway 密钥配置成功。
