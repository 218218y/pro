import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage15 design saved swatches use ColorSwatchItem primitive', () => {
  const component = read('esm/native/ui/react/components/ColorSwatch.tsx');
  const colorSection = read('esm/native/ui/react/tabs/design_tab_color_section.tsx');
  const contract = read('tools/wp_ui_design_system_contract.mjs');

  assert.match(component, /export function ColorSwatchItem/);
  assert.match(component, /function handleActivation/);
  assert.match(component, /swatchStyle\?: CSSProperties/);
  assert.match(colorSection, /import \{ ColorSwatchItem \} from '\.\.\/components\/index\.js';/);
  assert.match(colorSection, /<ColorSwatchItem[\s\S]*data-testid="design-color-swatch-item"/);
  assert.doesNotMatch(colorSection, /const className = 'color-dot-swatch'/);
  assert.doesNotMatch(colorSection, /<div className=\{className\} style=\{style\} aria-hidden="true"/);
  assert.match(contract, /ColorSwatchItem/);
});
