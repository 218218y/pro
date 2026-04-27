const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

test('createDoorVisual wrappers forward groovePartId through builder paths', () => {
  const renderDoorOps = [
    read('esm/native/builder/render_door_ops.ts'),
    read('esm/native/builder/render_door_ops_shared.ts'),
    read('esm/native/builder/render_door_ops_shared_core.ts'),
    read('esm/native/builder/render_door_ops_sliding.ts'),
    read('esm/native/builder/render_door_ops_hinged.ts'),
  ].join('\n');
  assert.match(
    renderDoorOps,
    /return\s*\([\s\S]*?mirrorLayout,\s*groovePartId\s*\)\s*=>[\s\S]*?value\([\s\S]*?mirrorLayout,\s*groovePartId\s*\)/,
    'render_door_ops.ts must forward groovePartId to createDoorVisual()'
  );

  const moduleLoopShared = read('esm/native/builder/module_loop_pipeline_shared.ts');
  assert.match(
    moduleLoopShared,
    /const createDoorVisual:[\s\S]*?mirrorLayout,\s*groovePartId\s*\)[\s\S]*?Reflect\.apply\([\s\S]*?mirrorLayout,\s*groovePartId,\s*\]\)/,
    'module_loop_pipeline_shared.ts must forward groovePartId via Reflect.apply()'
  );

  const renderDrawerOps = [
    read('esm/native/builder/render_drawer_ops.ts'),
    read('esm/native/builder/render_drawer_ops_shared.ts'),
    read('esm/native/builder/render_drawer_ops_external.ts'),
  ].join('\n');
  assert.match(
    renderDrawerOps,
    /return\s*\([\s\S]*?mirrorLayout,\s*groovePartId\s*\)\s*=>[\s\S]*?value\([\s\S]*?mirrorLayout,\s*groovePartId\s*\)/,
    'render_drawer_ops.ts must forward groovePartId to createDoorVisual()'
  );

  assert.match(
    renderDrawerOps,
    /createDoorVisual\([\s\S]*?globalFrontMat,[\s\S]*?1,[\s\S]*?false,[\s\S]*?null,[\s\S]*?partId\s*\)/,
    'render_drawer_ops.ts must pass partId into the external drawer visual build call'
  );
});
