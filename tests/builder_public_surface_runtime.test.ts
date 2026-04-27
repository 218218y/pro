import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuilderBootstrap } from '../esm/native/builder/bootstrap.ts';
import {
  applyBuilderHandles,
  clearBuilderBuildUi,
  ensureBuilderBuildUi,
  runBuilderRenderFollowThrough,
  runBuilderPostBuildFollowThrough,
  runBuilderChestModeFollowThrough,
  getBuilderAddFoldedClothes,
  getBuilderAddHangingClothes,
  getBuilderAddOutlines,
  getBuilderAddRealisticHanger,
  getBuilderBuildChestOnly,
  getBuilderBuildCornerWing,
  getBuilderBuildWardrobe,
  getBuilderCreateDoorVisual,
  getBuilderCreateInternalDrawerBox,
  getBuilderGetMaterial,
  getBuilderMirrorMaterialFactory,
  getBuilderModulesService,
  getBuilderPlanService,
  getBuilderRenderAdapterService,
  getBuilderScheduler,
  purgeBuilderHandlesForRemovedDoors,
  requestBuilderBuild,
  requestBuilderImmediateBuild,
  requestBuilderForcedBuild,
  requestBuilderDebouncedBuild,
  requestBuilderBuildFromActionMeta,
  requestBuilderBuildWithUiFromActionMeta,
  requestBuilderStructuralRefresh,
  requestBuilderBuildWithUi,
  runBuilderBuildWardrobe,
} from '../esm/native/runtime/builder_service_access.ts';
import {
  ensureBuilderDepsNamespace,
  getBuilderDepsNamespace,
  getBuilderDepsRoot,
  isBuilderDepsReady,
} from '../esm/native/runtime/builder_deps_access.ts';

type AnyRecord = Record<string, any>;

type Harness = {
  App: AnyRecord;
  calls: {
    outlines: AnyRecord[];
    materials: AnyRecord[];
    materialMirror: AnyRecord[];
    renderMirror: AnyRecord[];
    createDoorVisual: AnyRecord[];
    createInternalDrawerBox: AnyRecord[];
    buildChestOnly: number;
    buildCornerWing: number;
    addRealisticHanger: AnyRecord[];
    addHangingClothes: AnyRecord[];
    addFoldedClothes: AnyRecord[];
    buildWardrobe: AnyRecord[];
    requestBuild: AnyRecord[];
    applyHandles: number;
    purgeHandles: AnyRecord[];
    cleanGroup: AnyRecord[];
    pruneCaches: AnyRecord[];
    triggerRender: AnyRecord[];
    ensureRenderLoop: AnyRecord[];
    finalizeRegistry: number;
    viewportRender: AnyRecord[];
    viewportControlsUpdate: number;
    ensureWardrobeGroup: AnyRecord[];
    notesGetForSave: number;
    notesRestore: AnyRecord[];
  };
};

function createHarness(): Harness {
  const calls: Harness['calls'] = {
    outlines: [],
    materials: [],
    materialMirror: [],
    renderMirror: [],
    createDoorVisual: [],
    createInternalDrawerBox: [],
    buildChestOnly: 0,
    buildCornerWing: 0,
    addRealisticHanger: [],
    addHangingClothes: [],
    addFoldedClothes: [],
    buildWardrobe: [],
    requestBuild: [],
    applyHandles: 0,
    purgeHandles: [],
    cleanGroup: [],
    pruneCaches: [],
    triggerRender: [],
    ensureRenderLoop: [],
    finalizeRegistry: 0,
    viewportRender: [],
    viewportControlsUpdate: 0,
    ensureWardrobeGroup: [],
    notesGetForSave: 0,
    notesRestore: [],
  };

  const builder: AnyRecord = {
    handles: {
      applyHandles() {
        calls.applyHandles += 1;
      },
      purgeHandlesForRemovedDoors(forceEnabled: boolean) {
        calls.purgeHandles.push({ self: this, forceEnabled });
      },
    },
    plan: {
      createBuildPlan(input: unknown, meta?: AnyRecord) {
        return { input, meta };
      },
    },
    renderAdapter: {
      ensureWardrobeGroup(THREE: unknown) {
        calls.ensureWardrobeGroup.push({ self: this, THREE });
        return { THREE, seeded: true };
      },
    },
    __scheduler: {
      __esm_v1: true,
      getState() {
        return { waiting: false };
      },
    },
    registry: {
      finalize() {
        calls.finalizeRegistry += 1;
      },
    },
    renderOps: {
      addOutlines(group: unknown) {
        calls.outlines.push({ self: this, group });
        return { outlined: group };
      },
      getMirrorMaterial(args: { App: unknown; THREE: unknown }) {
        calls.renderMirror.push({ self: this, args });
        return { via: 'renderOps', args };
      },
      addDimensionLine() {
        return 'dimension-line';
      },
    },
    materials: {
      getMaterial(name: string) {
        calls.materials.push({ self: this, name });
        return `material:${name}`;
      },
      getMirrorMaterial(args: { THREE: unknown }) {
        calls.materialMirror.push({ self: this, args });
        return { via: 'materials', args };
      },
    },
    modules: {
      createDoorVisual(input: unknown) {
        calls.createDoorVisual.push({ self: this, input });
        return { kind: 'door', input };
      },
      createInternalDrawerBox(input: unknown) {
        calls.createInternalDrawerBox.push({ self: this, input });
        return { kind: 'drawer', input };
      },
      buildChestOnly() {
        calls.buildChestOnly += 1;
        return { kind: 'chest' };
      },
      buildCornerWing() {
        calls.buildCornerWing += 1;
        return { kind: 'corner' };
      },
    },
    contents: {
      addRealisticHanger(input: unknown) {
        calls.addRealisticHanger.push({ self: this, input });
        return { kind: 'hanger', input };
      },
      addHangingClothes(input: unknown) {
        calls.addHangingClothes.push({ self: this, input });
        return { kind: 'hanging', input };
      },
      addFoldedClothes(input: unknown) {
        calls.addFoldedClothes.push({ self: this, input });
        return { kind: 'folded', input };
      },
    },
    buildWardrobe(state: unknown) {
      calls.buildWardrobe.push({ self: this, state });
      return { built: true, state };
    },
    requestBuild(uiOverride: unknown, meta: AnyRecord) {
      calls.requestBuild.push({ self: this, uiOverride, meta });
      return true;
    },
  };

  const App: AnyRecord = {
    services: {
      builder,
      platform: {
        util: {
          cleanGroup(group: unknown) {
            calls.cleanGroup.push({ self: this, group });
            return group;
          },
          pruneCachesSafe(rootNode?: unknown) {
            calls.pruneCaches.push({ self: this, rootNode });
            return rootNode;
          },
        },
        triggerRender(updateShadows?: boolean) {
          calls.triggerRender.push({ self: this, updateShadows: !!updateShadows });
          return true;
        },
        ensureRenderLoop() {
          calls.ensureRenderLoop.push({ self: this });
          return true;
        },
        activity: {
          touch() {
            return true;
          },
        },
      },
      uiFeedback: {
        toast() {},
      },
      tools: {
        setDrawersOpenId() {},
      },
      drawer: {
        rebuildMeta() {},
      },
      notes: {
        getForSave() {
          calls.notesGetForSave += 1;
          return [{ id: 'note-1' }];
        },
        restoreFromSave(saved: unknown) {
          calls.notesRestore.push({ self: this, saved });
        },
      },
    },
    deps: {
      THREE: { REVISION: 'test' },
    },
    render: {
      drawersArray: [],
      scene: { id: 'scene' },
      camera: { id: 'camera' },
      renderer: {
        render(scene: unknown, camera: unknown) {
          calls.viewportRender.push({ scene, camera });
        },
      },
      controls: {
        update() {
          calls.viewportControlsUpdate += 1;
        },
      },
    },
  };

  return { App, calls };
}

test('builder public surface runtime: service access binds canonical builder seams and request helpers preserve builder ownership', () => {
  const { App, calls } = createHarness();

  assert.equal(getBuilderGetMaterial(App)?.('oak'), 'material:oak');
  assert.equal(calls.materials[0]?.self, App.services.builder.materials);

  assert.deepEqual(getBuilderAddOutlines(App)?.({ id: 'group-1' }), { outlined: { id: 'group-1' } });
  assert.equal(calls.outlines[0]?.self, App.services.builder.renderOps);

  assert.deepEqual(getBuilderCreateDoorVisual(App)?.({ id: 'door-1' }), {
    kind: 'door',
    input: { id: 'door-1' },
  });
  assert.equal(calls.createDoorVisual[0]?.self, App.services.builder.modules);

  assert.deepEqual(getBuilderCreateInternalDrawerBox(App)?.({ id: 'drawer-1' }), {
    kind: 'drawer',
    input: { id: 'drawer-1' },
  });
  assert.equal(calls.createInternalDrawerBox[0]?.self, App.services.builder.modules);

  assert.deepEqual(getBuilderBuildChestOnly(App)?.(), { kind: 'chest' });
  assert.deepEqual(getBuilderBuildCornerWing(App)?.(), { kind: 'corner' });
  assert.equal(calls.buildChestOnly, 1);
  assert.equal(calls.buildCornerWing, 1);

  assert.deepEqual(getBuilderAddRealisticHanger(App)?.('hanger-a'), {
    kind: 'hanger',
    input: 'hanger-a',
  });
  assert.deepEqual(getBuilderAddHangingClothes(App)?.('hanger-b'), {
    kind: 'hanging',
    input: 'hanger-b',
  });
  assert.deepEqual(getBuilderAddFoldedClothes(App)?.('shelf-a'), {
    kind: 'folded',
    input: 'shelf-a',
  });

  const mirrorFactory = getBuilderMirrorMaterialFactory(App);
  assert.ok(mirrorFactory);
  assert.deepEqual(mirrorFactory?.({ App, THREE: { revision: 1 } } as any), {
    via: 'materials',
    args: { THREE: { revision: 1 } },
  });
  assert.equal(calls.materialMirror.length, 1);
  assert.equal(calls.renderMirror.length, 0);

  delete App.services.builder.materials.getMirrorMaterial;
  const fallbackMirrorFactory = getBuilderMirrorMaterialFactory(App);
  assert.deepEqual(fallbackMirrorFactory?.({ App, THREE: { revision: 2 } } as any), {
    via: 'renderOps',
    args: { App, THREE: { revision: 2 } },
  });
  assert.equal(calls.renderMirror.length, 1);

  const buildUi = ensureBuilderBuildUi(App as any);
  buildUi.mode = 'swing';
  assert.equal(App.services.builder.buildUi, buildUi);
  assert.ok(buildUi.raw && typeof buildUi.raw === 'object');
  assert.equal(clearBuilderBuildUi(App), true);
  assert.equal(App.services.builder.buildUi, null);

  assert.equal(applyBuilderHandles(App), true);
  assert.equal(purgeBuilderHandlesForRemovedDoors(App, false), true);
  assert.equal(calls.applyHandles, 1);
  assert.equal(calls.purgeHandles[0]?.self, App.services.builder.handles);
  assert.equal(calls.purgeHandles[0]?.forceEnabled, false);

  const buildWardrobe = getBuilderBuildWardrobe(App);
  assert.ok(buildWardrobe);
  assert.deepEqual(buildWardrobe?.({ reason: 'manual' }), {
    built: true,
    state: { reason: 'manual' },
  });
  assert.equal(runBuilderBuildWardrobe(App, { reason: 'via-helper' }), true);
  assert.equal(calls.buildWardrobe.length, 2);
  assert.equal(calls.buildWardrobe[0]?.self, App.services.builder);
  assert.equal(calls.buildWardrobe[1]?.self, App.services.builder);

  assert.equal(requestBuilderBuild(App, { source: 'unit' }), true);
  assert.equal(requestBuilderImmediateBuild(App, { source: 'immediate:unit' }), true);
  assert.equal(requestBuilderForcedBuild(App, { reason: 'forced:unit' }), true);
  assert.equal(requestBuilderDebouncedBuild(App, { reason: 'debounced:unit' }), true);
  assert.equal(
    requestBuilderBuildFromActionMeta(
      App,
      { source: 'meta:unit', immediate: false, forceBuild: true, trace: 'retained' },
      { source: 'meta:fallback', force: false }
    ),
    true
  );
  assert.equal(
    requestBuilderBuildWithUiFromActionMeta(
      App,
      { structure: 'single' },
      { source: 'meta:ui', immediate: false, forceBuild: true, trace: 'ui-retained' },
      { source: 'meta:ui:fallback', force: false }
    ),
    true
  );
  assert.deepEqual(requestBuilderStructuralRefresh(App, { source: 'structure:unit' }), {
    requestedBuild: true,
    triggeredRender: false,
    ensuredRenderLoop: false,
  });
  assert.equal(requestBuilderBuildWithUi(App, { structure: 'double' }, { reason: 'explicit' }), true);
  assert.equal(calls.requestBuild.length, 8);
  assert.equal(calls.requestBuild[0]?.self, App.services.builder);
  assert.equal(calls.requestBuild[0]?.uiOverride, null);
  assert.deepEqual(calls.requestBuild[0]?.meta, {
    source: 'unit',
    reason: 'unit',
    immediate: true,
    force: true,
  });
  assert.deepEqual(calls.requestBuild[1]?.meta, {
    source: 'immediate:unit',
    reason: 'immediate:unit',
    immediate: true,
    force: false,
  });
  assert.deepEqual(calls.requestBuild[2]?.meta, {
    reason: 'forced:unit',
    immediate: true,
    force: true,
  });
  assert.deepEqual(calls.requestBuild[3]?.meta, {
    reason: 'debounced:unit',
    immediate: false,
    force: false,
  });
  assert.deepEqual(calls.requestBuild[4]?.meta, {
    source: 'meta:unit',
    reason: 'meta:unit',
    immediate: false,
    force: true,
    trace: 'retained',
  });
  assert.deepEqual(calls.requestBuild[5]?.uiOverride, { structure: 'single' });
  assert.deepEqual(calls.requestBuild[5]?.meta, {
    source: 'meta:ui',
    reason: 'meta:ui',
    immediate: false,
    force: true,
    trace: 'ui-retained',
  });
  assert.deepEqual(calls.requestBuild[6]?.uiOverride, null);
  assert.deepEqual(calls.requestBuild[6]?.meta, {
    source: 'structure:unit',
    reason: 'structure:unit',
    immediate: true,
    force: true,
  });
  assert.equal(calls.triggerRender.length, 0);
  assert.deepEqual(calls.requestBuild[7]?.uiOverride, { structure: 'double' });
  assert.deepEqual(calls.requestBuild[7]?.meta, {
    reason: 'explicit',
    immediate: true,
    force: true,
  });

  assert.equal(typeof getBuilderPlanService(App)?.createBuildPlan, 'function');
  assert.equal(typeof getBuilderRenderAdapterService(App)?.ensureWardrobeGroup, 'function');
  assert.equal(typeof getBuilderModulesService(App)?.createDoorVisual, 'function');
  assert.equal(typeof getBuilderScheduler(App)?.getState, 'function');
});

test('builder public surface runtime: canonical render follow-through prefers platform triggerRender and falls back to ensureRenderLoop', () => {
  const first = createHarness();
  assert.deepEqual(runBuilderRenderFollowThrough(first.App, { updateShadows: true }), {
    triggeredRender: true,
    ensuredRenderLoop: false,
  });
  assert.equal(first.calls.triggerRender.length, 1);
  assert.equal(first.calls.triggerRender[0]?.updateShadows, true);
  assert.equal(first.calls.ensureRenderLoop.length, 0);

  const second = createHarness();
  delete second.App.services.platform.triggerRender;
  assert.deepEqual(runBuilderRenderFollowThrough(second.App, { updateShadows: false }), {
    triggeredRender: false,
    ensuredRenderLoop: true,
  });
  assert.equal(second.calls.ensureRenderLoop.length, 1);
});

test('builder public surface runtime: structural refresh defers redundant render follow-through to the canonical immediate build scheduler', () => {
  const { App, calls } = createHarness();

  assert.deepEqual(
    requestBuilderStructuralRefresh(App, {
      source: 'structure:owned-by-build',
      immediate: true,
      force: true,
    }),
    {
      requestedBuild: true,
      triggeredRender: false,
      ensuredRenderLoop: false,
    }
  );
  assert.equal(calls.requestBuild.length, 1);
  assert.equal(calls.triggerRender.length, 0);
  assert.equal(calls.ensureRenderLoop.length, 0);
});

test('builder public surface runtime: structural refresh falls back to ensureRenderLoop when triggerRender is unavailable and no canonical scheduler owns the build', () => {
  const { App, calls } = createHarness();
  delete App.services.platform.triggerRender;
  delete App.services.builder.__scheduler;

  assert.deepEqual(
    requestBuilderStructuralRefresh(App, {
      source: 'structure:fallback',
      immediate: true,
      force: true,
    }),
    {
      requestedBuild: true,
      triggeredRender: false,
      ensuredRenderLoop: true,
    }
  );
  assert.equal(calls.requestBuild.length, 1);
  assert.equal(calls.ensureRenderLoop.length, 1);
});

test('builder public surface runtime: structural refresh does not leak render-only flags into build request meta', () => {
  const { App, calls } = createHarness();

  assert.deepEqual(
    requestBuilderStructuralRefresh(App, {
      source: 'structure:meta-clean',
      reason: 'structure:meta-clean:reason',
      immediate: false,
      force: true,
      triggerRender: false,
      updateShadows: true,
    }),
    {
      requestedBuild: true,
      triggeredRender: false,
      ensuredRenderLoop: false,
    }
  );
  assert.deepEqual(calls.requestBuild[0]?.meta, {
    source: 'structure:meta-clean',
    reason: 'structure:meta-clean:reason',
    immediate: false,
    force: true,
  });
});

test('builder public surface runtime: structural refresh stays no-op when no build request can be issued', () => {
  const { App, calls } = createHarness();
  delete App.services.builder.requestBuild;

  assert.deepEqual(
    requestBuilderStructuralRefresh(App, {
      source: 'structure:no-builder',
      immediate: true,
      force: true,
      updateShadows: true,
    }),
    {
      requestedBuild: false,
      triggeredRender: false,
      ensuredRenderLoop: false,
    }
  );
  assert.equal(calls.requestBuild.length, 0);
  assert.equal(calls.triggerRender.length, 0);
  assert.equal(calls.ensureRenderLoop.length, 0);
});

test('builder public surface runtime: explicit request-build rejection keeps structural refresh and build helpers fully no-op', () => {
  const { App, calls } = createHarness();
  App.services.builder.requestBuild = function (uiOverride: unknown, meta: AnyRecord) {
    calls.requestBuild.push({ self: this, uiOverride, meta });
    return false;
  };

  assert.equal(requestBuilderBuild(App, { source: 'reject:plain' }), false);
  assert.equal(
    requestBuilderBuildWithUi(App, { structure: 'reject-ui' }, { source: 'reject:ui', force: false }),
    false
  );
  assert.deepEqual(
    requestBuilderStructuralRefresh(App, {
      source: 'reject:structural',
      immediate: true,
      force: true,
      updateShadows: true,
    }),
    {
      requestedBuild: false,
      triggeredRender: false,
      ensuredRenderLoop: false,
    }
  );

  assert.deepEqual(
    calls.requestBuild.map(call => call.meta),
    [
      {
        source: 'reject:plain',
        reason: 'reject:plain',
        immediate: true,
        force: true,
      },
      {
        source: 'reject:ui',
        reason: 'reject:ui',
        immediate: true,
        force: false,
      },
      {
        source: 'reject:structural',
        reason: 'reject:structural',
        immediate: true,
        force: true,
      },
    ]
  );
  assert.equal(calls.triggerRender.length, 0);
  assert.equal(calls.ensureRenderLoop.length, 0);
});

test('builder public surface runtime: post-build follow-through keeps finalize/prune/clear/render ownership canonical', () => {
  const { App, calls } = createHarness();
  ensureBuilderBuildUi(App as any).mode = 'busy';
  const pruned: unknown[] = [];
  let rebuilt = 0;

  assert.deepEqual(
    runBuilderPostBuildFollowThrough(App, {
      finalizeRegistry: true,
      rebuildDrawerMeta() {
        rebuilt += 1;
      },
      pruneCachesSafe(scene) {
        pruned.push(scene);
      },
      clearBuildUi: true,
      triggerPlatformRender: true,
      updateShadows: true,
      applyHandles: true,
    }),
    {
      finalizedRegistry: true,
      rebuiltDrawerMeta: true,
      appliedHandles: true,
      prunedCaches: true,
      clearedBuildUi: true,
      triggeredRender: true,
      ensuredRenderLoop: false,
    }
  );

  assert.equal(calls.finalizeRegistry, 1);
  assert.equal(rebuilt, 1);
  assert.equal(calls.applyHandles, 1);
  assert.deepEqual(pruned, [App.render.scene]);
  assert.equal(App.services.builder.buildUi, null);
  assert.equal(calls.triggerRender.length, 1);
  assert.equal(calls.triggerRender[0]?.updateShadows, true);
});

test('builder public surface runtime: chest-mode follow-through keeps viewport render and registry finalize on one seam', () => {
  const { App, calls } = createHarness();

  assert.deepEqual(
    runBuilderChestModeFollowThrough(App, {
      applyHandles: true,
      renderViewport: true,
      finalizeRegistry: true,
    }),
    {
      finalizedRegistry: true,
      rebuiltDrawerMeta: false,
      appliedHandles: true,
      prunedCaches: false,
      clearedBuildUi: false,
      triggeredRender: false,
      ensuredRenderLoop: false,
      renderedViewport: true,
      updatedControls: true,
    }
  );

  assert.equal(calls.applyHandles, 1);
  assert.equal(calls.viewportRender.length, 1);
  assert.equal(calls.viewportControlsUpdate, 1);
  assert.equal(calls.finalizeRegistry, 1);
  assert.equal(calls.triggerRender.length, 0);
});

test('builder public surface runtime: bootstrap seeds canonical builder deps namespaces and heals missing slots on reinstall', () => {
  const { App, calls } = createHarness();
  const customCalc = () => ({ kept: true });
  const customShowToast = () => 'kept-toast';

  const preseededModules = ensureBuilderDepsNamespace(App, 'modules');
  preseededModules.calculateModuleStructure = customCalc;
  const preseededRender = ensureBuilderDepsNamespace(App, 'render');
  preseededRender.showToast = customShowToast;

  const root = installBuilderBootstrap(App as any);
  assert.equal(root, getBuilderDepsRoot(App));
  assert.equal(isBuilderDepsReady(App), true);

  const namespaces = {
    util: getBuilderDepsNamespace(App, 'util') as AnyRecord,
    materials: getBuilderDepsNamespace(App, 'materials') as AnyRecord,
    modules: getBuilderDepsNamespace(App, 'modules') as AnyRecord,
    contents: getBuilderDepsNamespace(App, 'contents') as AnyRecord,
    notes: getBuilderDepsNamespace(App, 'notes') as AnyRecord,
    render: getBuilderDepsNamespace(App, 'render') as AnyRecord,
  };
  const requiredBindings = {
    util: ['cleanGroup', 'pruneCachesSafe'],
    materials: ['getMaterial', 'addOutlines'],
    modules: [
      'createDoorVisual',
      'createInternalDrawerBox',
      'buildChestOnly',
      'buildCornerWing',
      '__rebuildDrawerMeta',
    ],
    contents: ['addDimensionLine', 'addHangingClothes', 'addFoldedClothes', 'addRealisticHanger'],
    notes: ['getNotesForSave', 'restoreNotesFromSave'],
    render: ['triggerRender', 'ensureWardrobeGroup'],
  } as const;

  for (const namespaceName of Object.keys(requiredBindings) as Array<keyof typeof requiredBindings>) {
    for (const key of requiredBindings[namespaceName]) {
      assert.equal(
        typeof namespaces[namespaceName][key],
        'function',
        `${String(namespaceName)}.${String(key)} should be installed`
      );
    }
  }

  assert.equal(namespaces.render.showToast, customShowToast);
  assert.equal(namespaces.modules.calculateModuleStructure, customCalc);

  assert.equal(namespaces.materials.getMaterial('birch'), 'material:birch');
  assert.equal(namespaces.modules.createDoorVisual('door-2').kind, 'door');
  assert.deepEqual(namespaces.notes.getNotesForSave(), [{ id: 'note-1' }]);
  namespaces.notes.restoreNotesFromSave(['saved']);
  namespaces.render.triggerRender(true);
  namespaces.util.cleanGroup('group-a');
  namespaces.util.pruneCachesSafe('root-a');
  namespaces.render.ensureWardrobeGroup({ id: 'THREE' });

  assert.equal(calls.notesGetForSave, 1);
  assert.deepEqual(calls.notesRestore[0]?.saved, ['saved']);
  assert.equal(calls.triggerRender[0]?.updateShadows, true);
  assert.equal(calls.cleanGroup[0]?.group, 'group-a');
  assert.equal(calls.pruneCaches[0]?.rootNode, 'root-a');
  assert.deepEqual(calls.ensureWardrobeGroup[0]?.THREE, { id: 'THREE' });

  for (const namespaceName of Object.keys(requiredBindings) as Array<keyof typeof requiredBindings>) {
    for (const key of requiredBindings[namespaceName]) {
      namespaces[namespaceName][key] = null;
    }
  }
  namespaces.notes.restoreNotesFromSave = undefined;

  const repairedRoot = installBuilderBootstrap(App as any);
  assert.equal(repairedRoot, root);

  for (const namespaceName of Object.keys(requiredBindings) as Array<keyof typeof requiredBindings>) {
    for (const key of requiredBindings[namespaceName]) {
      assert.equal(
        typeof namespaces[namespaceName][key],
        'function',
        `${String(namespaceName)}.${String(key)} should be repaired`
      );
    }
  }

  assert.equal(namespaces.render.showToast, customShowToast);
  assert.equal(namespaces.modules.calculateModuleStructure, customCalc);
});

test('builder public surface runtime: bootstrap stable namespace refs retarget to the latest App owner on reinstall', () => {
  const first = createHarness();
  installBuilderBootstrap(first.App as any);

  const namespaces = {
    util: getBuilderDepsNamespace(first.App, 'util') as AnyRecord,
    materials: getBuilderDepsNamespace(first.App, 'materials') as AnyRecord,
    modules: getBuilderDepsNamespace(first.App, 'modules') as AnyRecord,
    contents: getBuilderDepsNamespace(first.App, 'contents') as AnyRecord,
    notes: getBuilderDepsNamespace(first.App, 'notes') as AnyRecord,
    render: getBuilderDepsNamespace(first.App, 'render') as AnyRecord,
  };

  const retainedRefs = {
    cleanGroup: namespaces.util.cleanGroup,
    getMaterial: namespaces.materials.getMaterial,
    createDoorVisual: namespaces.modules.createDoorVisual,
    addHangingClothes: namespaces.contents.addHangingClothes,
    getNotesForSave: namespaces.notes.getNotesForSave,
    triggerRender: namespaces.render.triggerRender,
    ensureWardrobeGroup: namespaces.render.ensureWardrobeGroup,
  } as const;

  const second = createHarness();
  second.App.deps.builder = first.App.deps.builder;
  installBuilderBootstrap(second.App as any);

  assert.equal(namespaces.util.cleanGroup, retainedRefs.cleanGroup);
  assert.equal(namespaces.materials.getMaterial, retainedRefs.getMaterial);
  assert.equal(namespaces.modules.createDoorVisual, retainedRefs.createDoorVisual);
  assert.equal(namespaces.contents.addHangingClothes, retainedRefs.addHangingClothes);
  assert.equal(namespaces.notes.getNotesForSave, retainedRefs.getNotesForSave);
  assert.equal(namespaces.render.triggerRender, retainedRefs.triggerRender);
  assert.equal(namespaces.render.ensureWardrobeGroup, retainedRefs.ensureWardrobeGroup);

  assert.equal(retainedRefs.getMaterial('walnut'), 'material:walnut');
  assert.deepEqual(retainedRefs.createDoorVisual({ id: 'door-retarget' }), {
    kind: 'door',
    input: { id: 'door-retarget' },
  });
  assert.deepEqual(retainedRefs.addHangingClothes({ id: 'hanger-retarget' }), {
    kind: 'hanging',
    input: { id: 'hanger-retarget' },
  });
  assert.deepEqual(retainedRefs.getNotesForSave(), [{ id: 'note-1' }]);
  retainedRefs.cleanGroup('shared-group');
  retainedRefs.triggerRender(true);
  retainedRefs.ensureWardrobeGroup({ id: 'THREE-retarget' });

  assert.equal(first.calls.materials.length, 0);
  assert.equal(first.calls.createDoorVisual.length, 0);
  assert.equal(first.calls.addHangingClothes.length, 0);
  assert.equal(first.calls.notesGetForSave, 0);
  assert.equal(first.calls.cleanGroup.length, 0);
  assert.equal(first.calls.triggerRender.length, 0);
  assert.equal(first.calls.ensureWardrobeGroup.length, 0);

  assert.equal(second.calls.materials.length, 1);
  assert.equal(second.calls.createDoorVisual.length, 1);
  assert.equal(second.calls.addHangingClothes.length, 1);
  assert.equal(second.calls.notesGetForSave, 1);
  assert.equal(second.calls.cleanGroup.length, 1);
  assert.equal(second.calls.triggerRender.length, 1);
  assert.equal(second.calls.ensureWardrobeGroup.length, 1);
  assert.equal(second.calls.cleanGroup[0]?.group, 'shared-group');
  assert.equal(second.calls.triggerRender[0]?.updateShadows, true);
  assert.deepEqual(second.calls.ensureWardrobeGroup[0]?.THREE, { id: 'THREE-retarget' });
});
