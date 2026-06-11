import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.trim().split(/\r?\n/).length;
}

test('stage 45 corner connector special interior ownership split is anchored', () => {
  const facade = read('esm/native/builder/corner_connector_interior_special.ts');
  const types = read('esm/native/builder/corner_connector_interior_special_types.ts');
  const metrics = read('esm/native/builder/corner_connector_interior_special_metrics.ts');
  const geometry = read('esm/native/builder/corner_connector_interior_special_geometry.ts');
  const contents = read('esm/native/builder/corner_connector_interior_special_contents.ts');
  const apply = read('esm/native/builder/corner_connector_interior_special_apply.ts');

  assert.ok(lineCount(facade) <= 35, 'public special interior seam must stay a small facade');
  assert.match(facade, /corner_connector_interior_special_metrics\.js/);
  assert.match(facade, /corner_connector_interior_special_geometry\.js/);
  assert.match(facade, /corner_connector_interior_special_apply\.js/);
  assert.doesNotMatch(facade, /new THREE|BoxGeometry|ExtrudeGeometry|emitFoldedClothesPlan/);

  assert.match(types, /export type CornerConnectorSpecialInteriorFlowParams/);
  assert.match(types, /export type CornerConnectorSpecialMetrics/);
  assert.match(types, /export type FoldedClothesSurfacePlan/);

  assert.match(metrics, /export function resolveCornerConnectorSpecialMetrics/);
  assert.match(metrics, /export function createEqualShelfBottomYs/);
  assert.doesNotMatch(metrics, /new THREE|BoxGeometry|ExtrudeGeometry|emitFoldedClothes|cornerGroup\.add/);

  assert.match(geometry, /export function createInsetPolygon/);
  assert.match(geometry, /export function createShapeFromPolygon/);
  assert.doesNotMatch(geometry, /emitFoldedClothes|cornerGroup\.add|BoxGeometry|ExtrudeGeometry/);

  assert.match(contents, /export function createLeftShelvesContentsPlan/);
  assert.match(contents, /export function createPentagonTopContentsPlan/);
  assert.match(contents, /export function emitFoldedClothesPlans/);
  assert.doesNotMatch(contents, /new THREE|BoxGeometry|ExtrudeGeometry|cornerGroup\.add/);

  assert.match(apply, /resolveCornerConnectorSpecialMetrics/);
  assert.match(apply, /createEqualShelfBottomYs/);
  assert.match(apply, /createInsetPolygon/);
  assert.match(apply, /createShapeFromPolygon/);
  assert.match(apply, /createLeftShelvesContentsPlan/);
  assert.match(apply, /createPentagonTopContentsPlan/);
});
