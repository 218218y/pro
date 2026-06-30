import test from 'node:test';
import assert from 'node:assert/strict';

import { CORNER_WING_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.js';
import { readSplitPosListFromMap } from '../esm/native/runtime/maps_access.js';
import { createHandlesApplyRuntime } from '../esm/native/builder/handles_apply_shared.js';
import { resetEdgeHandleDefaultNoneCacheMaps } from '../esm/native/builder/edge_handle_default_none_runtime.js';
import {
  clampCornerConnectorHandleAbsY,
  createCornerConnectorDoorContext,
  createCornerConnectorDoorState,
  mergeCornerConnectorSplitCuts,
  partIdForCornerConnectorSegment,
  readCornerConnectorCustomSplitCutsY,
  readCurtainType,
} from '../esm/native/builder/corner_connector_door_emit_shared.js';

class Vec3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  applyEuler(_: unknown) {
    return this;
  }
  normalize() {
    return this;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  dot(value: any) {
    return this.x * (value?.x || 0) + this.y * (value?.y || 0) + this.z * (value?.z || 0);
  }
}
class Group {
  children: any[] = [];
  position = {
    set: (x: number, y: number, z: number) => Object.assign(this.position, { x, y, z }),
    x: 0,
    y: 0,
    z: 0,
  };
  rotation = { y: 0 };
  userData: Record<string, unknown> = {};
  add(value: unknown) {
    this.children.push(value);
  }
}

function createFlowParams() {
  const App: any = {
    render: { marker: true },
    maps: {
      getMap(name: string) {
        if (name === 'splitDoorsMap') return { splitpos_lower_corner_pent_door_1: [0.25, 0.255, 0.75] };
        if (name === 'splitDoorsBottomMap') return {};
        return {};
      },
    },
  };

  const helpers: any = {
    cfgSnapshot: { customData: { storage: true }, doorTrimMap: { demo: true } },
    readMap: (name: string) => App.maps.getMap(name) || {},
    isSplitEnabledInMap: () => true,
    isSplitExplicitInMap: (_map: unknown, key: string) => key.startsWith('lower_'),
    isSplitBottomEnabledInMap: () => false,
    readSplitPosListFromMap,
    readModulesConfigurationListFromConfigSnapshot: () => [],
    getOrCreateCacheRecord: () => ({}),
    MODES: { REMOVE_DOOR: 'remove_door' },
    primaryMode: 'none',
    __isLongEdgeHandleVariantForPart: () => false,
    __topSplitHandleInsetForPart: () => 0.09,
    __edgeHandleLongLiftAbsYForCornerCells: () => 0,
    __edgeHandleAlignedBaseAbsYForCornerCells: () => 0,
    __clampHandleAbsYForPart: (_cfg: unknown, _partId: string, absY: number, minY: number, maxY: number) =>
      Math.max(minY + 0.01, Math.min(maxY - 0.01, absY)),
    isRecord: (value: unknown) => !!value && typeof value === 'object',
    asRecord: (value: unknown) =>
      (value && typeof value === 'object' ? value : {}) as Record<string, unknown>,
    reportErrorThrottled: () => {},
  };

  const cornerGroup = new Group();
  return {
    ctx: {
      App,
      THREE: { Group, Vector3: Vec3 },
      woodThick: 0.018,
      startY: 0.12,
      wingH: 2.1,
      uiAny: { layout: 'storage' },
      splitDoors: true,
      doorStyle: 'flat',
      groovesEnabled: false,
      getGroove: null,
      getCurtain: null,
      __readScopedReader: () => undefined,
      __resolveSpecial: () => null,
      __getMirrorMat: () => null,
      getCornerMat: () => ({ mat: true }),
      frontMat: { front: true },
      createDoorVisual: () => ({ visual: true }),
      addOutlines: () => {},
      removeDoorsEnabled: false,
      __isDoorRemoved: () => false,
      __individualColors: null,
      __sketchMode: false,
      config: {},
      __stackKey: 'bottom',
      __stackSplitEnabled: true,
      __stackScopePartKey: (partId: unknown) => `lower_${String(partId || '')}`,
    },
    locals: {
      pts: [
        { x: -0.7, z: 0 },
        { x: -0.2, z: 0 },
        { x: 0, z: 0 },
        { x: 1.4, z: 0 },
      ],
      interiorX: 0.5,
      interiorZ: -0.8,
      panelThick: 0.018,
      showFrontPanel: true,
      cornerGroup,
      addEdgePanel: () => {},
    },
    helpers,
  } as any;
}

test('corner connector door shared wrappers assemble context/state and normalize split cuts', () => {
  const params = createFlowParams();
  const ctx = createCornerConnectorDoorContext(params);
  assert.ok(ctx);
  assert.equal(ctx?.stackKey, 'bottom');
  assert.equal(ctx?.mount.userData.partId, 'corner_pent_front_mount');
  assert.ok((ctx?.cornerGroup as any).children.includes(ctx?.mount));
  assert.equal(readCurtainType(3), '3');

  const state = createCornerConnectorDoorState(ctx!, 1);
  assert.equal(state.scopedDoorBaseId, 'lower_corner_pent_door_1');
  assert.equal(state.hingeSide, 'left');
  assert.equal(partIdForCornerConnectorSegment(state, 4, 2), 'corner_pent_door_1_mid2');

  const topEdge = ctx!.effectiveTopLimit - CORNER_WING_DIMENSIONS.connector.doorTopClearanceM;
  const doorHeight = topEdge - ctx!.doorBottomY;
  const expectedCuts = [ctx!.doorBottomY + 0.25 * doorHeight, ctx!.doorBottomY + 0.75 * doorHeight];
  const cuts = readCornerConnectorCustomSplitCutsY(ctx!, state);
  assert.deepEqual(
    cuts.map(v => Number(v.toFixed(3))),
    expectedCuts.map(v => Number(v.toFixed(3)))
  );
  const merged = mergeCornerConnectorSplitCuts(ctx!, [ctx!.doorBottomY + 0.02, ...cuts, cuts[0] + 0.001]);
  assert.deepEqual(
    merged.map(v => Number(v.toFixed(3))),
    expectedCuts.map(v => Number(v.toFixed(3)))
  );

  const clamped = clampCornerConnectorHandleAbsY(ctx!, 'corner_pent_door_1_top', 5, 0.5, 0.8);
  assert.equal(clamped, 0.79);
});

test('corner connector edge handles default to one riding handle for the pentagon door pair', () => {
  const params = createFlowParams();
  params.helpers.cfgSnapshot = {
    globalHandleType: 'edge',
    handlesMap: {},
    removedDoorsMap: {},
    splitDoorsBottomMap: {},
  };
  resetEdgeHandleDefaultNoneCacheMaps(params.ctx.App);

  const ctx = createCornerConnectorDoorContext(params);
  assert.ok(ctx);
  createCornerConnectorDoorState(ctx!, 1);
  createCornerConnectorDoorState(ctx!, 2);

  const runtime = createHandlesApplyRuntime({
    App: params.ctx.App,
    cfgSnapshot: params.helpers.cfgSnapshot,
    addOutlines: () => undefined,
    removeDoorsEnabled: false,
  });

  assert.equal(runtime.getHandleType('corner_pent_door_1_full', 'bottom'), 'none');
  assert.equal(runtime.getHandleType('corner_pent_door_2_full', 'bottom'), 'edge');
});

test('corner connector custom split cuts ignore string-encoded runtime normalized positions', () => {
  const params = createFlowParams();
  params.ctx.App.maps.getMap = (name: string) => {
    if (name === 'splitDoorsMap') return { splitpos_lower_corner_pent_door_1: ['0.25', 0.75] };
    return {};
  };

  const ctx = createCornerConnectorDoorContext(params);
  const state = createCornerConnectorDoorState(ctx!, 1);
  const topEdge = ctx!.effectiveTopLimit - CORNER_WING_DIMENSIONS.connector.doorTopClearanceM;
  const doorHeight = topEdge - ctx!.doorBottomY;
  const cuts = readCornerConnectorCustomSplitCutsY(ctx!, state);

  assert.deepEqual(
    cuts.map(v => Number(v.toFixed(3))),
    [Number((ctx!.doorBottomY + 0.75 * doorHeight).toFixed(3))]
  );
});
