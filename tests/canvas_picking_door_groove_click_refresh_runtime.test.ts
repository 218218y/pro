import test from 'node:test';
import assert from 'node:assert/strict';

import {
  handleCanvasDoorGrooveClick,
  handleCanvasDoorHingeClick,
} from '../esm/native/services/canvas_picking_door_hinge_groove_click.ts';
import { handleCanvasDoorRemoveClick } from '../esm/native/services/canvas_picking_door_remove_click.ts';
import {
  isSketchBoxDoorSegmentPartId,
  parseSketchBoxDoorTarget,
} from '../esm/native/services/canvas_picking_door_sketch_box_edit.ts';
import { resolveSketchSegmentVisualFlags } from '../esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts';
import {
  requestDoorAuthoringBurstRefresh,
  requestDoorAuthoringImmediateRefresh,
} from '../esm/native/services/canvas_picking_door_authoring_burst.ts';

type BuildRequest = {
  uiOverride: unknown;
  meta: Record<string, unknown>;
};

function createApp() {
  const buildRequests: BuildRequest[] = [];
  const state: Record<string, any> = {
    config: {
      groovesMap: {},
      grooveLinesCountMap: {},
    },
    runtime: {},
    ui: {
      raw: {
        width: 100,
        doors: 2,
      },
    },
    mode: {},
  };

  const App: any = {
    store: {
      getState() {
        return state;
      },
      setRuntime(patch: Record<string, unknown>) {
        state.runtime = { ...state.runtime, ...patch };
      },
      patch(patch: Record<string, any>) {
        for (const [key, value] of Object.entries(patch || {})) {
          state[key] = { ...(state[key] || {}), ...(value || {}) };
        }
      },
    },
    maps: {
      getMap(mapName: string) {
        return state.config[mapName] || {};
      },
      setKey(mapName: string, key: string, value: unknown) {
        const map = (state.config[mapName] ||= {});
        if (value == null) delete map[key];
        else map[key] = value;
      },
    },
    actions: {
      config: {
        setMap(mapName: string, nextMap: Record<string, unknown>) {
          state.config[mapName] = { ...(nextMap || {}) };
        },
      },
      history: {
        batch(_meta: unknown, fn: () => unknown) {
          return fn();
        },
      },
    },
    render: {
      doorsArray: [],
      drawersArray: [],
    },
    services: {
      builder: {
        __scheduler: { __esm_v1: true },
        requestBuild(uiOverride: unknown, meta: Record<string, unknown>) {
          buildRequests.push({ uiOverride, meta: { ...(meta || {}) } });
          return true;
        },
      },
    },
  };

  return { App, state, buildRequests };
}

test('door authoring burst refresh stays debounced for coalesced structural edits', () => {
  const { App, buildRequests } = createApp();

  requestDoorAuthoringBurstRefresh(App, 'removeDoors:smart');

  assert.equal(buildRequests.length, 1);
  assert.equal(buildRequests[0].meta.source, 'removeDoors:smart');
  assert.equal(buildRequests[0].meta.immediate, false);
  assert.equal(buildRequests[0].meta.force, false);
});

test('door authoring immediate refresh runs before the post-click hover refresh frame', () => {
  const { App, buildRequests } = createApp();

  requestDoorAuthoringImmediateRefresh(App, 'groove:click');

  assert.equal(buildRequests.length, 1);
  assert.equal(buildRequests[0].meta.source, 'groove:click');
  assert.equal(buildRequests[0].meta.immediate, true);
  assert.equal(buildRequests[0].meta.force, false);
});

test('regular door hinge click writes the hinge map and requests an immediate rebuild', () => {
  const { App, state, buildRequests } = createApp();

  const handled = handleCanvasDoorHingeClick({
    App,
    effectiveDoorId: 'd1_left',
  });

  assert.equal(handled, true);
  assert.equal(state.config.hingeMap.door_hinge_1, 'right');
  assert.equal(buildRequests.length, 1);
  assert.equal(buildRequests[0].meta.source, 'hinge:click');
  assert.equal(buildRequests[0].meta.immediate, true);
  assert.equal(buildRequests[0].meta.force, false);
});

test('regular door groove click toggles the groove and requests an immediate rebuild for stable remove hover', () => {
  const { App, state, buildRequests } = createApp();

  const handled = handleCanvasDoorGrooveClick({
    App,
    effectiveDoorId: 'd1_left',
    foundPartId: null,
    activeStack: 'top',
    foundModuleStack: 'top',
    doorHitObject: {
      userData: {
        partId: 'd1_left',
        __doorWidth: 0.45,
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(state.config.groovesMap.groove_d1_left, true);
  assert.equal(typeof state.config.grooveLinesCountMap.d1_left, 'number');
  assert.equal(buildRequests.length, 1);
  assert.equal(buildRequests[0].meta.source, 'groove:click');
  assert.equal(buildRequests[0].meta.immediate, true);
  assert.equal(buildRequests[0].meta.force, false);
});

test('regular door groove click updates an existing grooved door count instead of toggling it off', () => {
  const { App, state, buildRequests } = createApp();
  state.config.grooveLinesCount = 9;
  state.config.groovesMap = { groove_d1_left: true };
  state.config.grooveLinesCountMap = { d1_left: 4 };

  const handled = handleCanvasDoorGrooveClick({
    App,
    effectiveDoorId: 'd1_left',
    foundPartId: null,
    activeStack: 'top',
    foundModuleStack: 'top',
    doorHitObject: {
      userData: {
        partId: 'd1_left',
        __doorWidth: 0.45,
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(state.config.groovesMap.groove_d1_left, true);
  assert.equal(state.config.grooveLinesCountMap.d1_left, 9);
  assert.equal(state.runtime.pendingGrooveLinesCountMap.d1_left, 9);
  assert.equal(buildRequests.length, 1);
});

test('regular segmented door groove click materializes inherited full-door groove before removing the clicked segment', () => {
  const { App, state, buildRequests } = createApp();
  state.config.groovesMap = { groove_d1_full: true };
  state.config.grooveLinesCountMap = { d1_full: 7 };
  App.render.doorsArray = [
    { group: { userData: { partId: 'd1_bot' }, children: [] } },
    { group: { userData: { partId: 'd1_top' }, children: [] } },
  ];

  const handled = handleCanvasDoorGrooveClick({
    App,
    effectiveDoorId: 'd1_bot',
    foundPartId: null,
    activeStack: 'top',
    foundModuleStack: 'top',
    doorHitObject: {
      userData: {
        partId: 'd1_bot',
        __doorWidth: 0.45,
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(state.config.groovesMap.groove_d1_full, undefined);
  assert.equal(state.config.groovesMap.groove_d1_bot, undefined);
  assert.equal(state.config.groovesMap.groove_d1_top, true);
  assert.equal(state.config.grooveLinesCountMap.d1_full, undefined);
  assert.equal(state.config.grooveLinesCountMap.d1_bot, undefined);
  assert.equal(state.config.grooveLinesCountMap.d1_top, 7);
  assert.equal(buildRequests.length, 1);
  assert.equal(buildRequests[0].meta.source, 'groove:click');
  assert.equal(buildRequests[0].meta.immediate, true);
});

test('free sketch-box door groove click updates changed line count without requiring remove and re-add', () => {
  const { App, state } = createApp();
  const patchCalls: Array<{
    stack: string;
    moduleKey: string;
    meta: Record<string, unknown>;
  }> = [];
  state.config.grooveLinesCount = 11;
  state.modulesConfiguration = [
    {
      sketchExtras: {
        boxes: [
          {
            id: 'sbf_alpha',
            doors: [
              {
                id: 'sbdr_1',
                xNorm: 0.5,
                hinge: 'left',
                enabled: true,
                open: false,
                groove: true,
                grooveLinesCount: 5,
              },
            ],
          },
        ],
      },
    },
  ];
  App.actions.modules = {
    ensureForStack(_stack: 'top' | 'bottom', moduleKey: string) {
      return state.modulesConfiguration[Number(moduleKey)];
    },
    patchForStack(
      stack: 'top' | 'bottom',
      moduleKey: string,
      mutate: (cfg: Record<string, unknown>) => void,
      meta?: Record<string, unknown>
    ) {
      patchCalls.push({ stack, moduleKey, meta: { ...(meta || {}) } });
      mutate(state.modulesConfiguration[Number(moduleKey)]);
    },
  };

  const handled = handleCanvasDoorGrooveClick({
    App,
    effectiveDoorId: 'sketch_box_free_0_sbf_alpha_door_sbdr_1',
    foundPartId: null,
    activeStack: 'top',
    foundModuleStack: 'top',
    doorHitObject: {
      userData: {
        partId: 'sketch_box_free_0_sbf_alpha_door_sbdr_1',
        __doorWidth: 0.45,
      },
    },
  });

  const door = state.modulesConfiguration[0].sketchExtras.boxes[0].doors[0];
  assert.equal(handled, true);
  assert.equal(door.groove, true);
  assert.equal(door.grooveLinesCount, 11);
  assert.deepEqual(patchCalls, [
    {
      stack: 'top',
      moduleKey: '0',
      meta: { source: 'groove:click', immediate: true },
    },
  ]);
  assert.equal('noBuild' in patchCalls[0].meta, false);
});

test('free sketch-box door remove click patches through the semantic remove source without suppressing build', () => {
  const { App, state } = createApp();
  const patchCalls: Array<{
    stack: string;
    moduleKey: string;
    meta: Record<string, unknown>;
  }> = [];
  state.modulesConfiguration = [
    {
      sketchExtras: {
        boxes: [
          {
            id: 'sbf_alpha',
            doors: [
              {
                id: 'sbdr_1',
                xNorm: 0.5,
                hinge: 'left',
                enabled: true,
                open: true,
              },
            ],
          },
        ],
      },
    },
  ];
  App.actions.modules = {
    ensureForStack(stack: 'top' | 'bottom', moduleKey: string) {
      return stack === 'top' ? state.modulesConfiguration[Number(moduleKey)] : null;
    },
    patchForStack(
      stack: 'top' | 'bottom',
      moduleKey: string,
      mutate: (cfg: Record<string, unknown>) => void,
      meta?: Record<string, unknown>
    ) {
      patchCalls.push({ stack, moduleKey, meta: { ...(meta || {}) } });
      mutate(state.modulesConfiguration[Number(moduleKey)]);
    },
  };

  const handled = handleCanvasDoorRemoveClick({
    App,
    effectiveDoorId: 'sketch_box_free_0_sbf_alpha_door_sbdr_1',
    foundPartId: null,
    foundModuleStack: 'top',
  });

  const door = state.modulesConfiguration[0].sketchExtras.boxes[0].doors[0];
  assert.equal(handled, true);
  assert.equal(door.enabled, false);
  assert.equal(door.open, false);
  assert.deepEqual(patchCalls, [
    {
      stack: 'top',
      moduleKey: '0',
      meta: { source: 'removeDoors:smart', immediate: true },
    },
  ]);
  assert.equal('noBuild' in patchCalls[0].meta, false);
});

test('sketch-box door target parser normalizes segmented door suffixes before patching door config', () => {
  assert.deepEqual(parseSketchBoxDoorTarget('sketch_box_free_7_sbf_alpha_door_sbdr_1_bot'), {
    moduleKey: '7',
    boxId: 'sbf_alpha',
    doorId: 'sbdr_1',
  });
  assert.deepEqual(parseSketchBoxDoorTarget('sketch_box_free_7_sbf_alpha_door_sbdr_1_mid2_accent_top'), {
    moduleKey: '7',
    boxId: 'sbf_alpha',
    doorId: 'sbdr_1',
  });
});

test('free sketch-box segmented door groove click toggles only the clicked segment map key', () => {
  const { App, state } = createApp();
  state.modulesConfiguration = [
    {
      sketchExtras: {
        boxes: [
          {
            id: 'sbf_alpha',
            doors: [
              {
                id: 'sbdr_1',
                xNorm: 0.5,
                hinge: 'left',
                enabled: true,
                open: false,
              },
            ],
          },
        ],
      },
    },
  ];
  App.actions.modules = {
    ensureForStack(_stack: 'top' | 'bottom', moduleKey: string) {
      return state.modulesConfiguration[Number(moduleKey)];
    },
    patchForStack(
      _stack: 'top' | 'bottom',
      moduleKey: string,
      mutate: (cfg: Record<string, unknown>) => void
    ) {
      mutate(state.modulesConfiguration[Number(moduleKey)]);
    },
  };

  const handled = handleCanvasDoorGrooveClick({
    App,
    effectiveDoorId: 'sketch_box_free_0_sbf_alpha_door_sbdr_1_bot',
    foundPartId: null,
    activeStack: 'top',
    foundModuleStack: 'top',
    doorHitObject: {
      userData: {
        partId: 'sketch_box_free_0_sbf_alpha_door_sbdr_1_bot',
        __doorWidth: 0.45,
      },
    },
  });

  const door = state.modulesConfiguration[0].sketchExtras.boxes[0].doors[0];
  assert.equal(handled, true);
  assert.equal(door.groove, undefined);
  assert.equal(door.grooveLinesCount, undefined);
  assert.equal(state.config.groovesMap.groove_sketch_box_free_0_sbf_alpha_door_sbdr_1_bot, true);
  assert.equal(typeof state.config.grooveLinesCountMap.sketch_box_free_0_sbf_alpha_door_sbdr_1_bot, 'number');
  assert.equal(state.config.groovesMap.groove_sketch_box_free_0_sbf_alpha_door_sbdr_1_top, undefined);
});

test('free sketch-box segmented door groove click materializes inherited whole-door groove before toggling one segment', () => {
  const { App, state } = createApp();
  const base = 'sketch_box_free_0_sbf_alpha_door_sbdr_1';
  state.modulesConfiguration = [
    {
      sketchExtras: {
        boxes: [
          {
            id: 'sbf_alpha',
            doors: [
              {
                id: 'sbdr_1',
                xNorm: 0.5,
                hinge: 'left',
                enabled: true,
                open: false,
                groove: true,
                grooveLinesCount: 5,
              },
            ],
          },
        ],
      },
    },
  ];
  App.render.doorsArray = [
    {
      group: {
        userData: { partId: base },
        children: [
          { userData: { partId: `${base}_bot` }, children: [] },
          { userData: { partId: `${base}_top` }, children: [] },
        ],
      },
    },
  ];
  App.actions.modules = {
    ensureForStack(_stack: 'top' | 'bottom', moduleKey: string) {
      return state.modulesConfiguration[Number(moduleKey)];
    },
    patchForStack(
      _stack: 'top' | 'bottom',
      moduleKey: string,
      mutate: (cfg: Record<string, unknown>) => void
    ) {
      mutate(state.modulesConfiguration[Number(moduleKey)]);
    },
  };

  const handled = handleCanvasDoorGrooveClick({
    App,
    effectiveDoorId: `${base}_bot`,
    foundPartId: null,
    activeStack: 'top',
    foundModuleStack: 'top',
    doorHitObject: {
      userData: {
        partId: `${base}_bot`,
        __doorWidth: 0.45,
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(state.config.groovesMap[`groove_${base}_bot`], undefined);
  assert.equal(state.config.groovesMap[`groove_${base}_top`], true);
  assert.equal(state.config.grooveLinesCountMap[`${base}_bot`], undefined);
  assert.equal(state.config.grooveLinesCountMap[`${base}_top`], 5);
});

test('sketch-box segmented door target helpers keep the clicked segment identity', () => {
  const partId = 'sketch_box_free_7_sbf_alpha_door_sbdr_1_mid2_accent_top';
  assert.equal(isSketchBoxDoorSegmentPartId(partId), true);
  assert.deepEqual(parseSketchBoxDoorTarget(partId), {
    moduleKey: '7',
    boxId: 'sbf_alpha',
    doorId: 'sbdr_1',
  });
});

test('sketch-box segmented door visual flags inherit whole-door groove until a segment map exists', () => {
  const base = 'sketch_box_free_0_sbf_alpha_door_sbdr_1';
  const runtime: any = {
    resolveCurtain: () => null,
    resolveSpecial: () => null,
    doorStyle: 'flat',
    doorStyleMap: {},
    groovesMap: {},
    resolveMirrorLayout: () => null,
  };

  const sourceUserData = { __wpSketchBoxDoor: true, __wpSketchBoxDoorGroove: true };
  assert.equal(
    resolveSketchSegmentVisualFlags({
      runtime,
      segmentPartId: `${base}_bot`,
      sourceUserData,
    }).segmentHasGroove,
    true
  );
});

test('sketch-box segmented door visual flags do not inherit box-door groove onto every segment', () => {
  const base = 'sketch_box_free_0_sbf_alpha_door_sbdr_1';
  const runtime: any = {
    resolveCurtain: () => null,
    resolveSpecial: () => null,
    doorStyle: 'flat',
    doorStyleMap: {},
    groovesMap: { [`groove_${base}_top`]: true },
    resolveMirrorLayout: () => null,
  };

  const sourceUserData = { __wpSketchBoxDoor: true, __wpSketchBoxDoorGroove: true };
  assert.equal(
    resolveSketchSegmentVisualFlags({
      runtime,
      segmentPartId: `${base}_bot`,
      sourceUserData,
    }).segmentHasGroove,
    false
  );
  assert.equal(
    resolveSketchSegmentVisualFlags({
      runtime,
      segmentPartId: `${base}_top`,
      sourceUserData,
    }).segmentHasGroove,
    true
  );
});
