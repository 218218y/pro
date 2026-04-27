const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('box rods and storage keep xNorm / segment placement across hover and commit', () => {
  const previewOwner = read('esm/native/services/canvas_picking_sketch_box_vertical_content_preview.ts');
  const rodPreview = read('esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts');
  const storagePreview = read(
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts'
  );
  const helpers = [
    read('esm/native/services/canvas_picking_sketch_box_content_commit.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_vertical.ts'),
  ].join('\n');
  const render = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_contents.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_contents_parts.ts'),
  ].join('\n');

  assert.match(previewOwner, /canvas_picking_sketch_box_vertical_content_preview_rod\.js/);
  assert.match(previewOwner, /canvas_picking_sketch_box_vertical_content_preview_storage\.js/);
  assert.match(rodPreview, /contentKind: 'rod'/);
  assert.match(rodPreview, /contentXNorm: readFiniteSegmentNumber\(rodSegment, 'xNorm'\) \?\? 0\.5/);
  assert.match(storagePreview, /contentKind: 'storage'/);
  assert.match(storagePreview, /contentXNorm: readFiniteSegmentNumber\(storageSegment, 'xNorm'\) \?\? 0\.5/);

  assert.match(helpers, /commitArgs\.contentKind === 'rod' && contentXNorm != null/);
  assert.match(helpers, /commitArgs\.contentKind === 'storage'/);

  assert.match(render, /xNorm: barrier\.xNorm/);
  assert.match(render, /xNorm: rod\.xNorm/);
});
