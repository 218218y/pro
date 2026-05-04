import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
} from '../tools/wp_refactor_stage_catalog.mjs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const GUARD_FILE = 'tests/refactor_stage76_drawer_shared_contract_ownership_guard.test.js';

test('stage 76 drawer shared render contract ownership split is anchored', () => {
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const pkg = JSON.parse(read('package.json'));

  assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes('Stage 76'));
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 76 drawer shared render contract ownership split is anchored')
    ),
    'stage 76 must be registered in the shared refactor stage catalog anchors'
  );
  assert.ok(
    pkg.scripts['test:refactor-stage-guards'].includes(GUARD_FILE),
    'stage 76 guard must be wired into the stage guard lane'
  );
  assert.ok(integrationAudit.includes(GUARD_FILE), 'integration audit must require the stage 76 guard');
  assert.match(progress, /Stage 76/);
  assert.match(workmap, /Stage 76/);

  const facade = read('esm/native/builder/render_drawer_ops_shared.ts');
  const types = read('esm/native/builder/render_drawer_ops_shared_types.ts');
  const guards = read('esm/native/builder/render_drawer_ops_shared_guards.ts');
  const readers = read('esm/native/builder/render_drawer_ops_shared_readers.ts');
  const ops = read('esm/native/builder/render_drawer_ops_shared_ops.ts');
  const visualState = read('esm/native/builder/render_drawer_ops_shared_visual_state.ts');
  const drawerFacade = read('esm/native/builder/render_drawer_ops.ts');
  const external = read('esm/native/builder/render_drawer_ops_external.ts');
  const internal = read('esm/native/builder/render_drawer_ops_internal.ts');

  assert.match(
    facade,
    /export type \{[\s\S]*BuilderRenderDrawerDeps[\s\S]*\} from '\.\/render_drawer_ops_shared_types\.js';/
  );
  assert.match(facade, /from '\.\/render_drawer_ops_shared_guards\.js';/);
  assert.match(facade, /from '\.\/render_drawer_ops_shared_readers\.js';/);
  assert.match(facade, /from '\.\/render_drawer_ops_shared_ops\.js';/);
  assert.match(facade, /from '\.\/render_drawer_ops_shared_visual_state\.js';/);
  assert.doesNotMatch(
    facade,
    /readDoorStyleMap|readCurtainType|function readExternalDrawerOp|function readCreateDoorVisual|function resolveDrawerVisualState/,
    'drawer shared facade must not own config readers, op parsing, callback adapters, or visual-state policy'
  );

  assert.match(types, /export type BuilderRenderDrawerDeps =/);
  assert.match(types, /export type DrawerConfig =/);
  assert.match(types, /export type ExternalDrawerOpLike =/);
  assert.match(types, /export type InternalDrawerOpLike =/);
  assert.doesNotMatch(types, /export function|readCurtainType|readDoorStyleMap\(/);

  assert.match(guards, /export function isRecord/);
  assert.match(guards, /export function readThreeLike/);
  assert.match(guards, /export function readFinitePositive/);
  assert.doesNotMatch(
    guards,
    /readDoorStyleMap|readCurtainType|readExternalDrawerOp|resolveDrawerVisualState/
  );

  assert.match(readers, /export function readDrawerConfig/);
  assert.match(readers, /readDoorStyleMap\(value\.doorStyleMap\)/);
  assert.match(readers, /export function readCreateDoorVisual/);
  assert.match(readers, /createDoorVisual returned invalid object/);
  assert.match(readers, /export function readAddFoldedClothes/);
  assert.doesNotMatch(
    readers,
    /readCurtainType|export function readExternalDrawerOp|export function resolveDrawerVisualState/
  );

  assert.match(ops, /export function readExternalDrawerOp/);
  assert.match(ops, /export function readInternalDrawerOp/);
  assert.match(ops, /readPositionTriplet\(value\.closed\)/);
  assert.doesNotMatch(ops, /readDoorStyleMap|readCurtainType|readCreateDoorVisual|resolveDrawerVisualState/);

  assert.match(visualState, /export function resolveDrawerVisualState/);
  assert.match(visualState, /from '\.\/door_visual_lookup_state\.js';/);
  assert.match(visualState, /readCurtainType\(readDoorVisualMapValue\(cfg\.curtainMap, partId\)\)/);
  assert.match(visualState, /const special = readDoorVisualMapValue\(cfg\.doorSpecialMap, partId\);/);
  assert.match(visualState, /if \(isMirror\) \{/);
  assert.doesNotMatch(visualState, /cfg\.curtainMap\s*\?\s*cfg\.curtainMap\[partId\]/);
  assert.doesNotMatch(visualState, /cfg\.doorSpecialMap\s*\?\s*cfg\.doorSpecialMap\[partId\]/);
  assert.doesNotMatch(visualState, /readDoorStyleMap|readExternalDrawerOp|readCreateDoorVisual|new THREE\./);

  assert.match(drawerFacade, /from '\.\/render_drawer_ops_shared\.js';/);
  assert.match(external, /from '\.\/render_drawer_ops_shared\.js';/);
  assert.match(internal, /from '\.\/render_drawer_ops_shared\.js';/);
  assert.doesNotMatch(
    drawerFacade + external + internal,
    /render_drawer_ops_shared_(types|guards|readers|ops|visual_state)\.js/,
    'drawer render consumers must stay on the shared public facade instead of importing private shared owners'
  );
});
