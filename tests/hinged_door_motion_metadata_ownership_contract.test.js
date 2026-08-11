import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('runtime and service motion routes consume the canonical hinged-door metadata reader', () => {
  const kinematics = read('esm/native/runtime/hinged_door_kinematics.ts');
  const service = read('esm/native/services/doors_runtime_visuals_doors.ts');

  assert.match(kinematics, /readRuntimeHingedDoorMotionMetadata/);
  assert.match(service, /readHingedDoorMotionMetadata\(door\)\.noGlobalOpen/);

  for (const rawKey of [
    '__wpDoorOpenDirSign',
    '__wpDoorOpenZSign',
    '__handleZSign',
    '__wpCornerPentDoor',
    '__wpCornerPentDoorPair',
    '__invertSwing',
  ]) {
    assert.equal(kinematics.includes(rawKey), false, `kinematics must not interpret ${rawKey} directly`);
    assert.equal(service.includes(rawKey), false, `service must not interpret ${rawKey} directly`);
  }
});

test('all hinged-door builder families route motion metadata through the canonical builder seam', () => {
  const files = [
    'esm/native/builder/render_door_ops_hinged.ts',
    'esm/native/builder/corner_connector_door_emit_visuals.ts',
    'esm/native/builder/corner_wing_cell_doors_rendering.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts',
  ];

  for (const path of files) {
    const source = read(path);
    assert.match(
      source,
      /createBuilderHingedDoorMotionMetadata|patchBuilderHingedDoorMotionMetadata/,
      `${path} must consume the canonical metadata writer`
    );
  }
});
