import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');

test('pdf sketch text mode keeps empty layer click-through while note boxes stay interactive', () => {
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-sketch-card-text-layer\.is-text-mode \{[\s\S]*?pointer-events:\s*none;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-sketch-card-text-layer\.is-text-mode \.annotation-box \{[\s\S]*?pointer-events:\s*auto\s*!important;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-sketch-card-text-layer\.is-text-mode \.annotation-box \.editor \{[\s\S]*?pointer-events:\s*auto\s*!important;/
  );
});
