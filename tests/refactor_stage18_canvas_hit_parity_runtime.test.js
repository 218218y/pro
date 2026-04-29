import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readSourceText } from '../tools/wp_source_text.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadHitIdentityOwner() {
  const doorPartHelperShim = `
function __wp_isDoorLikePartId(partId) {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return false;
  if (/^(?:lower_)?d\\d+(?:_|$)/.test(pid) && !pid.includes('_draw_')) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(pid)) return true;
  if (pid.startsWith('sliding') || pid.startsWith('slide')) return true;
  if (pid.startsWith('lower_sliding')) return true;
  return (
    pid.startsWith('corner_door') ||
    pid.startsWith('corner_pent_door') ||
    pid.startsWith('lower_corner_door') ||
    pid.startsWith('lower_corner_pent_door')
  );
}
function __wp_isDrawerLikePartId(partId) {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid) return false;
  if (/^(?:lower_)?d\\d+_draw_/.test(pid)) return true;
  if (pid.includes('_draw_')) return true;
  if (pid.includes('drawer') || pid.includes('draw') || pid.includes('chest')) return true;
  return false;
}
`;
  const source = readSourceText('esm/native/services/canvas_picking_hit_identity.ts')
    .replace(/import type \{[\s\S]*?\} from '\.\.\/\.\.\/\.\.\/types';\n/, '')
    .replace(
      /import\s*\{\s*__wp_isDoorLikePartId\s*,\s*__wp_isDrawerLikePartId\s*,?\s*\}\s*from\s*['"]\.\/canvas_picking_door_part_helpers\.js['"];\s*/m,
      doorPartHelperShim
    );

  assert.doesNotMatch(
    source,
    /canvas_picking_door_part_helpers\.js/,
    'canvas hit identity fixture must inline the door-part helper shim'
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

test('stage 18 keeps mirror, split, and sketch identities canonical', async () => {
  const {
    createCanvasPickingClickHitIdentity,
    createCanvasPickingDoorHoverHitIdentity,
    mergeCanvasPickingHitIdentityUserData,
  } = await loadHitIdentityOwner();

  const mirrorIdentity = createCanvasPickingClickHitIdentity({
    partId: 'd8_full',
    doorId: 'd8_full',
    drawerId: null,
    moduleIndex: null,
    moduleStack: null,
    hitObjectUserData: {
      __wpMirrorSurface: true,
      surfaceId: 'door:d8:mirror:inside',
      faceSign: -1,
    },
  });
  assert.equal(mirrorIdentity.targetKind, 'door');
  assert.equal(mirrorIdentity.doorId, 'd8');
  assert.equal(mirrorIdentity.faceSide, 'inside');

  const splitIdentity = createCanvasPickingDoorHoverHitIdentity({
    partId: 'lower_d4_bot',
    source: 'raycast',
    hitObjectUserData: mergeCanvasPickingHitIdentityUserData(
      { surfaceId: 'door:lower_d4:outside:bot', faceSign: 1 },
      { partId: 'lower_d4_bot', __wpStack: 'bottom' }
    ),
  });
  assert.equal(splitIdentity.targetKind, 'door');
  assert.equal(splitIdentity.doorId, 'lower_d4');
  assert.equal(splitIdentity.moduleStack, 'bottom');
  assert.equal(splitIdentity.splitPart, 'bottom');
  assert.equal(splitIdentity.faceSide, 'outside');

  const sketchIdentity = createCanvasPickingClickHitIdentity({
    partId: 'sketch_box_free_7_sbf_alpha_door_sbdr_1_accent_top',
    doorId: 'sketch_box_free_7_sbf_alpha_door_sbdr_1_accent_top',
    drawerId: null,
    moduleIndex: null,
    moduleStack: null,
    hitObjectUserData: {
      __wpSketchBoxDoorId: 'sbdr_1',
      __wpSketchModuleKey: '7',
      __wpSketchBoxDoor: true,
      faceSign: 1,
    },
  });
  assert.equal(sketchIdentity.targetKind, 'door');
  assert.equal(sketchIdentity.doorId, 'sbdr_1');
  assert.equal(sketchIdentity.moduleIndex, 7);
  assert.equal(sketchIdentity.faceSide, 'outside');
});

test('stage 18 canvas parity contract is wired into guardrails', () => {
  const pkg = JSON.parse(readSourceText('package.json'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:canvas-hit-parity/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage18_canvas_hit_parity_runtime\.test\.js/
  );
});
