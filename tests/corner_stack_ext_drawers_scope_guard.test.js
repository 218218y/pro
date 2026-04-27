import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bundleSources } from './_source_bundle.js';

const CELL_BUNDLE = bundleSources(
  [
    '../esm/native/builder/corner_wing_cell_emit.ts',
    '../esm/native/builder/corner_wing_cell_interiors.ts',
    '../esm/native/builder/corner_wing_cell_interiors_shared.ts',
    '../esm/native/builder/corner_wing_cell_interiors_storage.ts',
  ],
  import.meta.url
);
const EXTRAS_BUNDLE = bundleSources(
  [
    '../esm/native/builder/post_build_front_reveal_frames.ts',
    '../esm/native/builder/post_build_front_reveal_frames_runtime.ts',
    '../esm/native/builder/post_build_front_reveal_frames_drawers.ts',
  ],
  import.meta.url
);

test('[corner-stack-ext-drawers] lower stack corner drawers are stack-scoped and carry stack metadata', () => {
  const src = CELL_BUNDLE;

  assert.match(src, /const scopeExtDrawerKey = \(id: string\): string =>/);
  assert.match(
    src,
    /runtime\.__stackKey === 'bottom'[\s\S]*\?[\s\S]*runtime\.__stackScopePartKey\(id\)[\s\S]*:[\s\S]*id/
  );
  assert.match(
    src,
    /const shelfOverDrawersPartId = scopeExtDrawerKey\(`corner_shelf_over_drawers_c\$\{cell\.idx\}`\);/
  );
  assert.match(src, /const id = scopeExtDrawerKey\(idRaw\);/);
  assert.match(src, /const divId = scopeExtDrawerKey\(divIdRaw\);/);
  assert.match(src, /__wpStack: runtime\.__stackKey,|__wpStack: __stackKey,/);
  assert.match(src, /__wpType\s*=\s*'extDrawer';|__wpType: 'extDrawer',/);
});

test('[corner-stack-ext-drawers] post-build drawer extras recognize lower-scoped corner drawer ids', () => {
  assert.match(EXTRAS_BUNDLE, /\^\(\?:lower_\)\?corner_c\\d\+_draw_\(\?:shoe\|\\d\+\)\$/);
});

test('[corner-stack-ext-drawers] lower stack fallback never reuses top ensureCornerCellAt when a lower cell is still missing', () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), 'esm/native/builder/corner_wing_extension_cells_config.ts'),
    'utf8'
  );
  assert.match(
    src,
    /function readEnsureLowerCornerCellAt\(value: unknown\): \(\(index: number\) => unknown\) \| null \{/
  );
  assert.match(
    src,
    /args\.__stackSplitEnabled && args\.__stackKey === 'bottom'[\s\S]*\?[\s\S]*readEnsureLowerCornerCellAt\(modulesRec\)[\s\S]*:[\s\S]*readEnsureCornerCellAt\(modulesRec\)/
  );
});
