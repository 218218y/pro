# UI Design System Plan

## Current canonical primitives

- `OptionButton` / `OptionButtonGroup` own repeated choice grids.
- `ColorSwatch` owns clickable color/texture/special swatches, including keyboard activation and selected state.

## Stage 14 update

Stage 14 extends the design-system rollout into the Design tab multi-color panel:

- multi-color brush swatches now use `ColorSwatch` instead of rebuilding the clickable swatch contract locally.
- door style choices now use `OptionButtonGroup` + `OptionButton`.
- curtain choices now use `OptionButtonGroup` + `OptionButton` while preserving the existing `curtain-btn` visual class.

This keeps the UI primitive layer small. No global registry, no state wrapper, and no alternate design system was introduced.

## Guardrail

`tools/wp_ui_design_system_contract.mjs` protects the migrated Design tab controls from drifting back to bespoke `div role="button"` or hand-built `type-option` strings.

## Stage 15 saved swatches

`ColorSwatchItem` owns selectable saved/default swatch shell behavior in the Design tab. Use it for selectable swatches; keep normal buttons for actions such as delete, save, lock, and upload.
