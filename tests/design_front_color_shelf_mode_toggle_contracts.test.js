import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('front color shelf mode toggle keeps all shelves and brace front-edge equally clickable', () => {
  const source = readSource('esm/native/ui/react/tabs/design_tab_color_section.tsx');

  assert.match(source, /const isAllShelfInheritanceMode = model\.frontColorShelfInheritanceMode === 'all';/);
  assert.match(
    source,
    /'wp-r-mini-link-toggle wp-r-mini-link-toggle--manual wp-r-front-color-shelf-mode-toggle '/
  );
  assert.match(source, /wp-r-front-color-shelf-mode-toggle--all/);
  assert.match(source, /wp-r-front-color-shelf-mode-toggle--brace/);
  assert.match(source, /קנט קושרת/);
  assert.match(source, /הקנט הקדמי/);
  assert.doesNotMatch(source, /wp-r-mini-link-toggle--auto/);
});
