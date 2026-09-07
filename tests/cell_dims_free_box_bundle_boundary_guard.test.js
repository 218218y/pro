import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FREE_BOX_CORE = 'esm/native/services/canvas_picking_cell_dims_free_box_core.ts';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('cell-dims free-box core keeps box lookup helpers on the leaf commit-boxes boundary', () => {
  const source = read(FREE_BOX_CORE);

  assert.match(
    source,
    /from ['"]\.\/canvas_picking_sketch_box_content_commit_boxes\.js['"]/u,
    'cell-dims free-box core must import box lookup helpers directly from the leaf owner'
  );
  assert.doesNotMatch(
    source,
    /from ['"]\.\/canvas_picking_sketch_box_content_commit\.js['"]/u,
    'cell-dims free-box core must not pull the full sketch-box commit aggregator into the initial bundle'
  );
});
