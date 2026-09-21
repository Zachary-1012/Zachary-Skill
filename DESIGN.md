# TrendHub 2.0 Design System

## Product thesis

TrendHub is a creator's working shelf built on verifiable trend evidence. The primary surface advances a content artifact; research supports the artifact without turning the product into a dashboard or tool catalog.

## Visual language

- Material: warm rice-paper surfaces with restrained, low-contrast fibre texture.
- Ink: `#28251f` primary, `#5c564c` secondary, `#80786a` muted.
- Maple action: `#a8472d`, with `#8f3423` for hover/strong state. Use it only for primary actions, active progress, and small editorial labels.
- Paper: `#eee8dc` background, `#f8f4eb` working surface, `#e8e0d2` secondary surface.
- Type: Song-style serif for project titles and artifacts; system sans for controls, metadata, and navigation.
- Shape: 1px hairlines, 3px action buttons, restrained 8px to 12px utility corners. Avoid excessive pills and floating cards.

## Information hierarchy

Global shell → grouped navigation → project title → production stage rail → editable artifact → AI/evidence/next-action context.

The sidebar groups Creation and Trends. The default route is Content Studio. Content Library and Publishing Plan preserve continuity across projects. Trend Research, Inspiration, and Watch remain upstream inputs.

## Components

- `paper-canvas`: the primary editable production surface.
- `paper-panel`: contextual AI, Evidence, and publishing preparation.
- `stage-rail`: Brief, Create, Review, Ready, Published, Evaluated.
- `maple-button`: one primary action per local decision area.
- `artifact-editor`: long-form, serif, editable output surface.
- `evidence-state`: explicit collected/not-collected state with timestamp and limitations.

## Responsive behavior

Desktop uses a working canvas plus a narrow context rail. Below 980px, context panels move below the canvas. Below 700px, form fields stack, the stage rail scrolls horizontally, and all major actions become full width. Root height remains content-driven to prevent embedded/mobile blank-scroll failures.

## AI behavior

The host AI path sends a complete evidence-bound production task through the MCP Apps bridge. The local path calls a user-controlled OpenAI-compatible endpoint and writes the returned artifact into the editor. Tokens are session-memory only. No connection returns an honest unavailable state.

## Provenance

No raster artwork ships in the interface. The supplied recording informed hierarchy only. CSS textures, layout, icons, and components are original TrendHub implementation.
