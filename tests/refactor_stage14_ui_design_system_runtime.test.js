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
  const designPanel = read('esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx');

  assert.match(colorSwatch, /children\?: ReactNode/);
  assert.match(colorSwatch, /special\?: boolean/);
  assert.match(designPanel, /<ColorSwatch[\s\S]*special=\{dot\.isSpecial\}/);
  assert.match(
    designPanel,
    /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-door-style-options">/
  );
  assert.match(
    designPanel,
    /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-curtain-options">/
  );
  assert.doesNotMatch(designPanel, /className=\{\s*'type-option type-option--compact type-option--iconrow/);
  assert.doesNotMatch(designPanel, /className=\{'curtain-btn' \+/);
});
