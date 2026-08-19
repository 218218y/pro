import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plannerRel = 'esm/native/builder/room_architecture_geometry.ts';
const adapterRel = 'esm/native/builder/room_architecture_plan_adapter.ts';
const buildOwnerRel = 'esm/native/builder/build_wardrobe_flow_context.ts';
const plannerAbsolute = path.join(root, plannerRel);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const forbiddenPlannerImportFragments = Object.freeze([
  'store_access',
  'app_container',
  '/runtime/',
  '/features/',
  'react',
  'three',
  '/dom/',
]);

test('room architecture planner owns only pure domain/geometry dependencies', () => {
  const source = read(plannerRel);
  const dependencies = analyzeModuleDependencies(plannerAbsolute, source);
  const forbiddenImports = dependencies.imports.filter(dependency =>
    forbiddenPlannerImportFragments.some(fragment => dependency.specifier.toLowerCase().includes(fragment))
  );

  assert.deepEqual(forbiddenImports, []);
  assert.doesNotMatch(source, /\bAppContainer\b/u);
  assert.doesNotMatch(source, /\bgetRuntime\s*\(/u);
  assert.doesNotMatch(source, /\bgetUi\s*\(/u);
  assert.doesNotMatch(source, /\bgetRoomArchitectureConfig\s*\(/u);
  const sourceFile = createSourceFile(plannerRel, source);
  const ambientDomAccess = [];
  walkAst(sourceFile, node => {
    if (node?.type !== 'MemberExpression' || node.computed) return;
    const objectName = node.object?.type === 'Identifier' ? node.object.name : null;
    if (objectName === 'document' || objectName === 'window') ambientDomAccess.push(objectName);
  });
  assert.deepEqual(ambientDomAccess, []);
});

test('room architecture state access is isolated in the adapter, while build planning uses prepared snapshots', () => {
  const adapter = read(adapterRel);
  const buildOwner = read(buildOwnerRel);

  assert.match(adapter, /from ['"]\.\/store_access\.js['"]/u);
  assert.match(adapter, /export function createRoomArchitecturePlanFromApp\(/u);
  assert.match(adapter, /export function createRoomArchitecturePlanFromBuildSnapshot\(/u);

  assert.doesNotMatch(buildOwner, /createRoomArchitecturePlanFromApp/u);
  assert.equal(
    (buildOwner.match(/createRoomArchitecturePlanFromBuildSnapshot\s*\(/gu) ?? []).length,
    1,
    'the build owner must create one room architecture plan from its prepared snapshot'
  );
  assert.match(buildOwner, /roomArchitecturePlan/u);
});
