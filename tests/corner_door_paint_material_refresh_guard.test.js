import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CORNER_WING = [
  'esm/native/builder/corner_wing_cell_doors.ts',
  'esm/native/builder/corner_wing_cell_doors_shared.ts',
  'esm/native/builder/corner_wing_cell_doors_contracts.ts',
  'esm/native/builder/corner_wing_cell_doors_context.ts',
  'esm/native/builder/corner_wing_cell_doors_scope.ts',
  'esm/native/builder/corner_wing_cell_doors_state.ts',
  'esm/native/builder/corner_wing_cell_doors_rendering.ts',
  'esm/native/builder/corner_wing_cell_doors_split_policy.ts',
  'esm/native/builder/corner_wing_cell_doors_full.ts',
].map(rel => path.resolve(process.cwd(), rel));
const CORNER_PENT = [
  'esm/native/builder/corner_connector_door_emit.ts',
  'esm/native/builder/corner_connector_door_emit_shared.ts',
  'esm/native/builder/corner_connector_door_emit_split.ts',
  'esm/native/builder/corner_connector_door_emit_full.ts',
].map(rel => path.resolve(process.cwd(), rel));
const MATERIALS_APPLY_TRAVERSAL = path.resolve(
  process.cwd(),
  'esm/native/builder/materials_apply_traversal.ts'
);

test('[corner-door-paint] unsplit corner wing + pentagon doors use canonical *_full ids', () => {
  const wingSrc = CORNER_WING.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const pentSrc = CORNER_PENT.map(file => fs.readFileSync(file, 'utf8')).join('\n');

  assert.match(wingSrc, /const fullId = `\$\{state\.doorBaseId\}_full`;/);
  assert.match(pentSrc, /const fullId = `\$\{state\.doorBaseId\}_full`;/);
  assert.match(pentSrc, /pushCornerConnectorDoorSegment\(\s*ctx,\s*state,\s*fullId,/);
});

test('[paint-material-refresh] hidden selector hit meshes keep their invisible materials during no-build repaint', () => {
  const src = fs.readFileSync(MATERIALS_APPLY_TRAVERSAL, 'utf8');

  assert.match(src, /export function shouldKeepMaterialsApplyMeshMaterial\(/);
  assert.match(src, /userData\.isModuleSelector === true/);
  assert.match(src, /material\.colorWrite === false/);
  assert.match(src, /material\.transparent === true && Number\(material\.opacity\) === 0/);
});
