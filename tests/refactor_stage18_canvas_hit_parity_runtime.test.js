import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadHitIdentityOwner() {
  const source = readFileSync('esm/native/services/canvas_picking_hit_identity.ts', 'utf8').replace(
    /import type \{[\s\S]*?\} from '\.\.\/\.\.\/\.\.\/types';\n/,
    ''
  );

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;

  const dir = mkdtempSync(join(tmpdir(), 'wardrobepro-canvas-hit-identity-'));
  const file = join(dir, 'canvas_picking_hit_identity_fixture.mjs');
  writeFileSync(file, transpiled, 'utf8');
  return import(`${pathToFileURL(file).href}?cacheBust=${Date.now()}-${Math.random()}`);
}

test('stage 18 keeps hover and click identities equivalent for child-surface door hits', async () => {
  const {
    areCanvasPickingHitIdentitiesEquivalent,
    createCanvasPickingClickHitIdentity,
    createCanvasPickingDoorHoverHitIdentity,
    mergeCanvasPickingHitIdentityUserData,
  } = await loadHitIdentityOwner();

  const surfaceHitUserData = {
    partId: 'surface-proxy-should-not-win',
    surfaceId: 'door:d4:inside',
    faceSide: 'inside',
    faceSign: -1,
    splitPart: 'upper',
  };
  const resolvedDoorUserData = {
    partId: 'd4_upper',
    doorId: 'd4',
  };

  const mergedUserData = mergeCanvasPickingHitIdentityUserData(surfaceHitUserData, resolvedDoorUserData);

  assert.equal(mergedUserData.partId, 'd4_upper');
  assert.equal(mergedUserData.doorId, 'd4');
  assert.equal(mergedUserData.surfaceId, 'door:d4:inside');
  assert.equal(mergedUserData.faceSide, 'inside');
  assert.equal(mergedUserData.faceSign, -1);
  assert.equal(mergedUserData.splitPart, 'upper');

  const hoverIdentity = createCanvasPickingDoorHoverHitIdentity({
    partId: 'd4_upper',
    hitObjectUserData: mergedUserData,
    source: 'raycast',
  });
  const clickIdentity = createCanvasPickingClickHitIdentity({
    partId: 'd4_upper',
    doorId: 'd4',
    drawerId: null,
    moduleIndex: null,
    moduleStack: null,
    hitObjectUserData: mergedUserData,
  });

  assert.equal(hoverIdentity.surfaceId, 'door:d4:inside');
  assert.equal(hoverIdentity.faceSide, 'inside');
  assert.equal(clickIdentity.surfaceId, 'door:d4:inside');
  assert.equal(clickIdentity.faceSide, 'inside');
  assert.notEqual(hoverIdentity.source, clickIdentity.source);
  assert.equal(areCanvasPickingHitIdentitiesEquivalent(hoverIdentity, clickIdentity), true);
});

test('stage 18 canvas parity contract is wired into guardrails', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:canvas-hit-parity/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage18_canvas_hit_parity_runtime\.test\.js/
  );
});
