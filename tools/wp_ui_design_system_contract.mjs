#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

const errors = [];

function requirePattern(file, pattern) {
  const source = read(file);
  if (!pattern.test(source)) errors.push(`${file}: missing ${pattern}`);
}

function forbidPattern(file, pattern) {
  const source = read(file);
  if (pattern.test(source)) errors.push(`${file}: forbidden legacy pattern ${pattern}`);
}

requirePattern(
  'esm/native/ui/react/components/ColorSwatch.tsx',
  /type ColorSwatchProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' \| 'onKeyDown' \| 'title'>/
);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /children\?: ReactNode/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /special\?: boolean/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /className=\{cx\(/);
requirePattern(
  'esm/native/ui/react/components/ColorSwatch.tsx',
  /type ColorSwatchItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' \| 'onKeyDown' \| 'title'>/
);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /export function ColorSwatchItem/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /function handleActivation/);

requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /import \{ Button, ColorSwatch, OptionButton, OptionButtonGroup, ToggleRow \}/
);
requirePattern('esm/native/ui/react/components/Button.tsx', /type ButtonVariant =[\s\S]*\| 'danger'/);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<Button[\s\S]*variant="light"[\s\S]*wp-r-mirror-draft-reset-btn/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<Button[\s\S]*variant="danger"[\s\S]*size="sm"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<ColorSwatch[\s\S]*special=\{dot\.isSpecial\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-door-style-options">/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButton[\s\S]*data-door-style=\{option\.id\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-curtain-options">/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className="curtain-btn"[\s\S]*selected=\{props\.curtainChoice === curtain\.id\}/
);

forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /import type \{ CSSProperties/
);
forbidPattern('esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx', /<button\b/);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{\s*'color-dot-swatch wp-r-color-swatch'/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{\s*'type-option type-option--compact type-option--iconrow/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{'curtain-btn' \+/
);

requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /import \{ Button, ColorSwatchItem \} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<ColorSwatchItem[\s\S]*data-testid="design-color-swatch-item"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="delete"[\s\S]*data-testid="design-selected-color-delete-button"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*inline[\s\S]*data-testid="design-selected-color-lock-button"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="delete"[\s\S]*className="wp-r-btn-xs wp-r-mt-1"[\s\S]*onClick=\{model\.removeTexture\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="save"[\s\S]*data-testid="design-custom-color-save-button"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="accent"[\s\S]*data-testid="design-custom-color-cancel-button"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /const className = 'color-dot-swatch'/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<div className=\{className\} style=\{style\} aria-hidden="true"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-delete wp-r-btn-compact"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-inline wp-r-btn-compact"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-delete wp-r-btn-xs wp-r-mt-1"/
);
forbidPattern('esm/native/ui/react/tabs/design_tab_color_section.tsx', /className="btn btn-save wp-r-mt-4"/);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-accent wp-r-mt-1"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
  /import \{ Button, InlineNotice, ModeToggleButton \} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
  /function CellDimResetButton[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-cell-dims-reset-dim-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_platform_overhang_field.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_platform_overhang_field.tsx',
  /<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-platform-overhang-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_platform_overhang_field.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-platform-overhang-reset-btn wp-r-styled-tooltip hint-bottom"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /export function SketchBoxPlatformOverhangField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-platform-overhang-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-platform-overhang-reset-btn wp-r-styled-tooltip hint-bottom"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /export function SketchBoxNumericField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-box-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-sketch-box-reset-btn wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_controls.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_controls.tsx',
  /function DoorMountThicknessField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-door-thickness-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_controls.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-door-thickness-reset-btn wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx',
  /export function SketchDrawerHeightField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
  /function SketchFieldResetButton[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  /wp-r-sketch-box-plinth-height-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn[\s\S]*resetSketchBoxPlinthHeight\(props\)/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
  /wp-r-base-plinth-height-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn[\s\S]*DEFAULT_BASE_PLINTH_HEIGHT_CM/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);

if (errors.length) {
  console.error('[ui-design-system-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[ui-design-system-contract] ok');
