import test from 'node:test';
import assert from 'node:assert/strict';

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
        if (name === 'splitDoorsMap') return { lower_corner_pent_door_1: [0.4, 0.405, 0.68] };
        if (name === 'splitDoorsBottomMap') return {};
        return {};
      },
    },
  };

  const helpers: any = {
    getCfg: () => ({ customData: { storage: true }, doorTrimMap: { demo: true } }),
    readMapOrEmpty: (_app: unknown, name: string) => App.maps.getMap(name) || {},
    isSplitEnabledInMap: () => true,
    isSplitExplicitInMap: (_map: unknown, key: string) => key.startsWith('lower_'),
    isSplitBottomEnabledInMap: () => false,
    readSplitPosListFromMap: (map: any, key: string) => map[key] || [],
    readModulesConfigurationListFromConfigSnapshot: () => [],
    getOrCreateCacheRecord: () => ({}),
    MODES: { REMOVE_DOOR: 'remove_door' },
    isPrimaryMode: () => false,
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

  const cuts = readCornerConnectorCustomSplitCutsY(ctx!, state);
  assert.deepEqual(
    cuts.map(v => Number(v.toFixed(3))),
    [0.4, 0.68]
  );
  const merged = mergeCornerConnectorSplitCuts(ctx!, [ctx!.doorBottomY + 0.02, ...cuts, cuts[0] + 0.001]);
  assert.deepEqual(
    merged.map(v => Number(v.toFixed(3))),
    [0.4, 0.68]
  );

  const clamped = clampCornerConnectorHandleAbsY(ctx!, 'corner_pent_door_1_top', 5, 0.5, 0.8);
  assert.equal(clamped, 0.79);
});
