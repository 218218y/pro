import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage 14 UI design system contract is wired into refactor guardrails', () => {
  execFileSync(process.execPath, ['tools/wp_ui_design_system_contract.mjs'], { stdio: 'pipe' });

  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:ui-design-system/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage14_ui_design_system_runtime\.test\.js/
  );
});

test('stage 14 Design tab uses shared choice primitives instead of bespoke swatch and option controls', () => {
  const colorSwatch = read('esm/native/ui/react/components/ColorSwatch.tsx');
  const button = read('esm/native/ui/react/components/Button.tsx');
  const designPanel = read('esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx');
  const colorSection = read('esm/native/ui/react/tabs/design_tab_color_section.tsx');
  const doorFeaturesSection = read('esm/native/ui/react/tabs/design_tab_sections_door_features.tsx');
  const cellDimsSection = read('esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx');
  const platformOverhangField = read('esm/native/ui/react/tabs/structure_tab_platform_overhang_field.tsx');
  const sketchBoxControls = read(
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx'
  );
  const structureControls = read('esm/native/ui/react/tabs/structure_tab_controls.tsx');
  const sketchDrawerHeightField = read(
    'esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx'
  );
  const sketchShelvesSection = read('esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx');
  const sketchBoxControlsSection = read(
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx'
  );
  const structureBodyBaseSection = read('esm/native/ui/react/tabs/structure_tab_body_section_base.tsx');

  assert.match(colorSwatch, /children\?: ReactNode/);
  assert.match(colorSwatch, /special\?: boolean/);
  assert.match(button, /type ButtonVariant =[\s\S]*\| 'danger'/);
  assert.match(designPanel, /import \{ Button, ColorSwatch, OptionButton, OptionButtonGroup, ToggleRow \}/);
  assert.match(designPanel, /<ColorSwatch[\s\S]*special=\{dot\.isSpecial\}/);
  assert.match(designPanel, /<Button[\s\S]*variant="light"[\s\S]*wp-r-mirror-draft-reset-btn/);
  assert.match(designPanel, /<Button[\s\S]*variant="danger"[\s\S]*size="sm"/);
  assert.match(
    designPanel,
    /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-door-style-options">/
  );
  assert.match(
    designPanel,
    /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-curtain-options">/
  );
  assert.doesNotMatch(designPanel, /<button\b/);
  assert.doesNotMatch(designPanel, /className=\{\s*'type-option type-option--compact type-option--iconrow/);
  assert.doesNotMatch(designPanel, /className=\{'curtain-btn' \+/);

  assert.match(colorSection, /import \{ Button, ColorSwatchItem \} from '\.\.\/components\/index\.js';/);
  assert.match(
    colorSection,
    /<Button[\s\S]*variant="delete"[\s\S]*data-testid="design-selected-color-delete-button"/
  );
  assert.match(colorSection, /<Button[\s\S]*inline[\s\S]*data-testid="design-selected-color-lock-button"/);
  assert.match(
    colorSection,
    /<Button[\s\S]*variant="save"[\s\S]*data-testid="design-custom-color-save-button"/
  );
  assert.match(
    colorSection,
    /<Button[\s\S]*variant="accent"[\s\S]*data-testid="design-custom-color-cancel-button"/
  );
  assert.doesNotMatch(colorSection, /className="btn btn-delete wp-r-btn-compact"/);
  assert.doesNotMatch(colorSection, /className="btn btn-save wp-r-mt-4"/);

  assert.match(doorFeaturesSection, /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/);
  assert.match(
    doorFeaturesSection,
    /wp-r-groove-lines-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*className="wp-r-groove-reset-btn"[\s\S]*onClick=\{model\.resetGrooveLinesCount\}/
  );
  assert.doesNotMatch(doorFeaturesSection, /className="btn btn-light btn-inline wp-r-groove-reset-btn"/);

  assert.match(
    cellDimsSection,
    /import \{ Button, InlineNotice, ModeToggleButton \} from '\.\.\/components\/index\.js';/
  );
  assert.match(
    cellDimsSection,
    /function CellDimResetButton[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-cell-dims-reset-dim-btn/
  );
  assert.doesNotMatch(
    cellDimsSection,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-styled-tooltip hint-bottom"/
  );

  assert.match(platformOverhangField, /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/);
  assert.match(
    platformOverhangField,
    /<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-platform-overhang-reset-btn/
  );
  assert.match(sketchBoxControls, /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/);
  assert.match(
    sketchBoxControls,
    /export function SketchBoxNumericField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-box-reset-btn/
  );
  assert.match(
    sketchBoxControls,
    /export function SketchBoxPlatformOverhangField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-platform-overhang-reset-btn/
  );
  assert.doesNotMatch(
    sketchBoxControls,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-sketch-box-reset-btn wp-r-styled-tooltip hint-bottom"/
  );
  assert.doesNotMatch(
    `${platformOverhangField}\n${sketchBoxControls}`,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-platform-overhang-reset-btn wp-r-styled-tooltip hint-bottom"/
  );

  assert.match(structureControls, /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/);
  assert.match(
    structureControls,
    /function DoorMountThicknessField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-door-thickness-reset-btn/
  );
  assert.doesNotMatch(
    structureControls,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-door-thickness-reset-btn wp-r-styled-tooltip hint-bottom"/
  );

  assert.match(
    sketchDrawerHeightField,
    /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
  );
  assert.match(
    sketchDrawerHeightField,
    /export function SketchDrawerHeightField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn/
  );
  assert.doesNotMatch(
    sketchDrawerHeightField,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
  );
  assert.match(sketchShelvesSection, /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/);
  assert.match(
    sketchShelvesSection,
    /function SketchFieldResetButton[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn/
  );
  assert.doesNotMatch(
    sketchShelvesSection,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
  );
  assert.match(
    sketchBoxControlsSection,
    /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
  );
  assert.match(
    sketchBoxControlsSection,
    /wp-r-sketch-box-plinth-height-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn[\s\S]*resetSketchBoxPlinthHeight\(props\)/
  );
  assert.doesNotMatch(
    sketchBoxControlsSection,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
  );
  assert.match(
    structureBodyBaseSection,
    /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
  );
  assert.match(
    structureBodyBaseSection,
    /wp-r-base-plinth-height-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn[\s\S]*DEFAULT_BASE_PLINTH_HEIGHT_CM/
  );
  assert.doesNotMatch(
    structureBodyBaseSection,
    /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
  );
});
