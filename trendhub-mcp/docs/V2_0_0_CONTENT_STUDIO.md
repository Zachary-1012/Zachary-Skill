# TrendHub 2.0.0 — Evidence-backed AI Content Studio

TrendHub 2.0 turns trend intelligence into a persistent content-production surface while preserving the 21-tool compatibility facade and Evidence Contract.

The production chain is Brief → Evidence → Strategy → Draft → Review → Ready → Published → Evaluated. Projects, drafts, schedules, and user-entered results stay in browser-local storage on the public site. The hosted service does not receive model credentials or publish to third-party platforms.

Inside an MCP Apps host, `get_content_brief` opens `ui://trendhub/content-studio.html`. The component can collect an evidence brief and send the production task to the user's current AI. The standalone local workspace can instead call a user-controlled OpenAI-compatible endpoint and place the result directly into the editor.

The UI uses restrained rice-paper neutrals, dark ink typography, and maple-leaf red for primary actions. The hierarchy follows global shell → grouped navigation → local production stages → working artifact → contextual evidence and actions.

Release gates:

- exactly 21 existing MCP tools;
- Apps UI resource registered and attached to `get_content_brief`;
- no model credential in localStorage or hosted requests;
- model output never promoted to Evidence;
- project and artifact persistence tested;
- desktop and mobile runtime visually accepted;
- missing/unavailable evidence remains explicit.
