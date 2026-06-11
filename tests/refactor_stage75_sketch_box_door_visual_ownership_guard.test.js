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

test('stage 75 sketch box door visual ownership split is anchored', () => {
  const frontOwner = read('esm/native/builder/render_interior_sketch_boxes_fronts.ts');
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const pkg = JSON.parse(read('package.json'));

  assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes('Stage 75'));
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 75 sketch box door visual ownership split is anchored')
    ),
    'stage 75 must be registered in the shared refactor stage catalog anchors'
  );
  assert.ok(
    pkg.scripts['test:refactor-stage-guards'].includes(
      'tests/refactor_stage75_sketch_box_door_visual_ownership_guard.test.js'
    ),
    'stage 75 guard must be wired into the stage guard lane'
  );
  assert.ok(
    integrationAudit.includes('tests/refactor_stage75_sketch_box_door_visual_ownership_guard.test.js'),
    'integration audit must require the stage 75 guard'
  );
  assert.match(progress, /Stage 75/);
  assert.match(workmap, /Stage 75/);
  const doorOwner = read('esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts');
  const visuals = read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts');
  const materials = read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_materials.ts');
  const routes = read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_routes.ts');
  const core = read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts');
  const accents = read('esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts');

  assert.match(doorOwner, /from '\.\/render_interior_sketch_boxes_fronts_door_visuals\.js';/);
  assert.doesNotMatch(
    frontOwner + doorOwner,
    /render_interior_sketch_boxes_fronts_door_visual_(materials|routes|core)\.js/,
    'public sketch-box fronts and door owners must not bypass the door-visual orchestration facade'
  );

  assert.match(visuals, /resolveSketchBoxDoorVisualState\(input, doorPid\)/);
  assert.match(visuals, /resolveSketchBoxDoorVisualMaterials\(/);
  assert.match(visuals, /resolveSketchBoxDoorVisualRoute\(/);
  assert.match(visuals, /appendSketchBoxDoorCoreVisual\(/);
  assert.match(visuals, /appendDoorTrimVisuals\(/);
  assert.match(visuals, /appendClassicDoorAccentAndGrooves\(/);
  assert.doesNotMatch(
    visuals,
    /getMirrorMaterial|resolveEffectiveDoorStyle|new THREE\.Mesh\(new THREE\.BoxGeometry|createDoorVisual\(/,
    'door visual facade must orchestrate visual policy without owning mirror materials, style routing, or mesh construction'
  );

  assert.match(materials, /export function resolveSketchBoxDoorVisualMaterials\(/);
  assert.match(materials, /resolvePartMaterial\(doorPid, bodyMat\)/);
  assert.match(materials, /rawGetMirrorMaterial/);
  assert.match(materials, /getMirrorMaterial\(\{ App, THREE \}\)/);
  assert.doesNotMatch(
    materials,
    /resolveEffectiveDoorStyle|createDoorVisual\(|new THREE\.Mesh\(|appendDoorTrimVisuals|appendClassicDoorAccentAndGrooves/,
    'door material owner must not own style routing, scene mutation, trims, or accents'
  );

  assert.match(routes, /export function resolveSketchBoxDoorVisualRoute\(/);
  assert.match(routes, /resolveEffectiveDoorStyle\(doorStyle, doorStyleMap, doorPid\)/);
  assert.match(routes, /route: 'special'/);
  assert.match(routes, /route: 'styled'/);
  assert.match(routes, /route: 'slab'/);
  assert.match(routes, /shouldUseClassicAccents: !doorVisualState\.isMirror && !doorVisualState\.isGlass/);
  assert.doesNotMatch(
    routes,
    /getMirrorMaterial|new THREE\.Mesh\(|applySketchBoxPickMeta|appendDoorTrimVisuals|appendClassicDoorAccentAndGrooves/,
    'door route owner must stay a pure routing policy owner'
  );

  assert.match(core, /export function appendSketchBoxDoorCoreVisual\(/);
  assert.match(core, /visualRoute\.route === 'special'/);
  assert.match(core, /visualRoute\.route === 'styled'/);
  assert.match(
    core,
    /const doorSlab = new THREE\.Mesh\(new THREE\.BoxGeometry\(doorW, doorH, doorD\), materials\.doorMat\)/
  );
  assert.match(core, /applySketchBoxPickMetaDeep\(/);
  assert.match(core, /applySketchBoxPickMeta\(/);
  assert.doesNotMatch(
    core,
    /getMirrorMaterial|resolveEffectiveDoorStyle|appendDoorTrimVisuals|appendClassicDoorAccentAndGrooves/,
    'door core visual owner must not own material resolution, style routing, trims, or accent/groove policy'
  );

  assert.match(accents, /export function appendClassicDoorAccentAndGrooves\(/);
  assert.match(accents, /normalizeGrooveLinesCount\(boxDoor\.grooveLinesCount\) \?\?/);
  assert.match(accents, /resolveGrooveLinesCount\(App, doorW, undefined, doorPid\)/);

  assert.doesNotMatch(visuals + materials + routes + core + accents, /export default\s+/);
});
