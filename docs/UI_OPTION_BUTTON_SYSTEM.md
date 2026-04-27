# UI Option Button System

WardrobePro React tabs use `OptionButton` and `OptionButtonGroup` as the canonical primitive for repeated choice buttons.

## Goals

- Keep Structure and Interior option grids consistent.
- Avoid one-off CSS overrides for every tab section.
- Keep compact three-across controls explicit through `OptionButtonGroup columns={3}` and `density="micro"` instead of ad-hoc selector hacks.
- Preserve existing `.type-option` styling while giving new code a clear React component owner.

## Current migrated owners

- `esm/native/ui/react/tabs/structure_tab_controls.tsx`
- `esm/native/ui/react/tabs/structure_tab_body_section_controls.tsx`
- `esm/native/ui/react/tabs/structure_tab_body_section_base.tsx`
- `esm/native/ui/react/tabs/interior_tab_helpers.tsx`
- `esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx`

## Policy

New React choice controls should use:

- `OptionButton` for a single selectable button.
- `OptionButtonGroup` for repeated options.
- `density="compact"` for ordinary secondary groups.
- `density="micro"` plus `columns={3}` for the small three-across controls.

Do not add new tab-specific `!important` rules to force button sizing. Fix the primitive or variant instead.
