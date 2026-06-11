import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuilderMaterialsApply } from '../esm/native/builder/materials_apply.ts';

function createApp(materials?: Record<string, unknown>, renderOps?: Record<string, unknown>) {
  return {
    services: {
      builder: {
        materials: materials ?? {},
        renderOps: renderOps ?? {},
      },
    },
  } as any;
}

test('materials apply install keeps canonical method refs stable and heals missing public methods', () => {
  const App = createApp();

  const installed = installBuilderMaterialsApply(App);
  const mirrorRef = installed.getMirrorMaterial;
  const applyRef = installed.applyMaterials;
  const renderOps = App.services.builder.renderOps;
  const renderMirrorRef = renderOps.getMirrorMaterial;
  const renderApplyRef = renderOps.applyMaterials;

  assert.equal(typeof mirrorRef, 'function');
  assert.equal(typeof applyRef, 'function');
  assert.equal(typeof renderMirrorRef, 'function');
  assert.equal(typeof renderApplyRef, 'function');

  delete installed.applyMaterials;
  delete renderOps.applyMaterials;

  const reinstalled = installBuilderMaterialsApply(App);
  assert.equal(reinstalled, installed);
  assert.equal(reinstalled.getMirrorMaterial, mirrorRef);
  assert.equal(reinstalled.applyMaterials, applyRef);
  assert.equal(renderOps.getMirrorMaterial, renderMirrorRef);
  assert.equal(renderOps.applyMaterials, renderApplyRef);
});

test('materials apply install heals drift even when the legacy installed marker is already set', () => {
  const driftedMirror = () => 'drifted';
  const driftedApply = () => 'drifted-apply';
  const App = createApp(
    {
      __esm_materials_apply_v1: true,
      getMirrorMaterial: driftedMirror,
      applyMaterials: driftedApply,
    },
    {
      applyMaterials: () => 'render-drifted',
    }
  );

  const installed = installBuilderMaterialsApply(App);
  const canonicalMirror = installed.getMirrorMaterial;
  const canonicalApply = installed.applyMaterials;
  const canonicalRenderApply = App.services.builder.renderOps.applyMaterials;

  assert.notEqual(canonicalMirror, driftedMirror);
  assert.notEqual(canonicalApply, driftedApply);
  assert.equal(typeof App.services.builder.renderOps.getMirrorMaterial, 'function');

  installed.applyMaterials = () => 'drifted-again';
  App.services.builder.renderOps.applyMaterials = () => 'render-drifted-again';
  installBuilderMaterialsApply(App);

  assert.equal(installed.getMirrorMaterial, canonicalMirror);
  assert.equal(installed.applyMaterials, canonicalApply);
  assert.equal(App.services.builder.renderOps.applyMaterials, canonicalRenderApply);
});
