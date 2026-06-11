import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('[mode-toggle-button] supports placing disclosure icons after the label without changing the default order', () => {
  const src = readSource('esm/native/ui/react/components/ModeToggleButton.tsx');

  assert.match(src, /iconPosition\?: 'start' \| 'end'/);
  assert.match(src, /iconPosition = 'start'/);
  assert.match(
    src,
    /icon && iconPosition === 'start'[\s\S]*?<span className="wp-r-editmode-toggle__label">\{children\}<\/span>[\s\S]*?icon && iconPosition === 'end'/
  );
});

test('[structure-cell-dims] special dimensions and hex toggles place chevrons on the label end', () => {
  const src = readSource('esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx');

  assert.equal((src.match(/iconPosition="end"/g) || []).length, 2);
  assert.match(src, /\{props\.modeLabel \|\| 'מידות מיוחדות לפי תא'\}/);
  assert.match(src, /\{labels\.hexModeButton \|\| 'תא משושה'\}/);
});
