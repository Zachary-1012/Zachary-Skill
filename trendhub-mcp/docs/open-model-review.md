# 开源模型来源标题复核

TrendHub 用自托管的多语言句向量模型比较研究主题与最多 8 条公开来源标题。网页用户和 Skill/MCP 使用者均无需注册模型服务或提供 API Key。此功能只在明确请求时运行；输出是余弦相似度，不是 Jev 的判断概率，也不是事实、热度或来源可信度证据。

## 模型与运行位置

- 权重：[onnx-community/paraphrase-multilingual-MiniLM-L12-v2-ONNX](https://huggingface.co/onnx-community/paraphrase-multilingual-MiniLM-L12-v2-ONNX)，固定修订 `d4c06bf0d7680171ac30042a1387e1fdb7a90021`，`model_quantized.onnx`，Apache-2.0。原始模型：[sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)，Apache-2.0。
- 推理库：[@huggingface/transformers](https://github.com/huggingface/transformers.js)，Apache-2.0；Node.js 进程中的 ONNX Runtime CPU 推理。
- 首次运行会从 Hugging Face 下载约 118 MB 量化权重和分词文件并缓存；后续在同一持久缓存中复用。云端临时文件系统重启后可能再次下载。用户提交的主题和标题只在 TrendHub 运行时处理，不送往外部模型推理 API。
- 模型 API 调用没有按次费用；托管服务器的 CPU、内存、存储和流量仍可能产生费用。公共端设每日额度以控制资源。

## 使用与边界

网页在研究结果点击“用开源模型复核标题”。Skill/MCP 在使用者明确要求时为 `get_content_brief` 设置 `open_model_review_public_titles: true`。本地运行时走 `/api/connections/model-review/review`，公网走 `/api/model-review/review`；两者均不接收模型密钥。

输出的 `semanticSimilarity` 范围为 -1 到 1，只便于人工比较同一主题下的标题。不要设自动采信阈值，不得用它覆盖原始 Evidence、研究结论、排序或发布状态。模型下载、加载或资源不足时返回不可用，原本的证据简报仍可使用。首次加载可能较慢。

此模型用于轻量多语言标题比较；不是生成模型。内容创作继续优先由宿主 AI 完成。若用户选择本地开放权重生成模型，仍须通过现有 loopback 端点连接。TypeSafe Jev 是闭源计费服务，已从运行路径移除。
