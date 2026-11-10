import { canonicalizeComparableProjectConfigSnapshot } from '../esm/native/features/project_config/project_config_snapshot_canonical_runtime.ts';
import { buildProjectConfigSnapshot } from '../esm/native/io/project_io_load_helpers_config.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  HANDLE_CATALOG,
  HANDLE_SIZE_GLOBAL_KEY,
  encodeHandleSize,
  handleSizePartKey,
  isHandleType,
  usesCatalogHandleGeometry,
  getSurfaceHandleFootprint,
  clampSurfaceHandleCenter,
  resolveConfiguredHandleSizeMm,
  supportsHandleHost,
} from '../esm/shared/handle_catalog.ts';
import { createHandleMeshV7 } from '../esm/native/builder/handles_mesh.ts';
import { applyHandles } from '../esm/native/builder/handles_apply.ts';
import { normalizeCurrentProjectData } from '../esm/native/io/project_schema_current.ts';
import { validateProjectData } from '../esm/native/io/project_schema_validation.ts';
import { readConfigStateProjectConfigSnapshot } from '../esm/native/features/project_config/project_config_persisted_snapshot.ts';

const handleTypes = Object.keys(HANDLE_CATALOG).filter(isHandleType);
const surfaceTypes = handleTypes.filter(type => usesCatalogHandleGeometry(type));
const noOutlines = () => undefined;

test('every handle ID, finish, legacy variant and catalog size survives project normalization', () => {
  for (const type of handleTypes) {
    for (const variant of ['short', 'long']) {
      const handlesMap = {
        d1: type,
        __wp_edge_handle_variant_global: variant,
        '__wp_edge_handle_variant:d1': variant,
        __handle_color__: 'nickel',
        '__wp_handle_color:d1': '#aabbcc',
        '__wp_manual_handle_position:d1': '{"xRatio":0.2,"yRatio":0.6}',
        ...(encodeHandleSize(type, 96) ? { [HANDLE_SIZE_GLOBAL_KEY]: encodeHandleSize(type, 96) } : {}),
        ...(encodeHandleSize(type, 160) ? { [handleSizePartKey('d1')]: encodeHandleSize(type, 160) } : {}),
      };
      const config = canonicalizeComparableProjectConfigSnapshot({ globalHandleType: type, handlesMap });
      const persisted = readConfigStateProjectConfigSnapshot(config);
      const project = normalizeCurrentProjectData(
        JSON.parse(
          JSON.stringify({
            settings: {
              width: 120,
              height: 210,
              depth: 60,
              doors: 2,
              globalHandleType: config.globalHandleType,
            },
            toggles: {},
            handlesMap: persisted.handlesMap,
          })
        )
      );
      assert.equal(validateProjectData(project).ok, true);
      assert.equal(project.settings?.globalHandleType, type);
      assert.deepEqual({ ...project.handlesMap }, handlesMap);
      const loaded = buildProjectConfigSnapshot(project);
      assert.equal(loaded.globalHandleType, type);
      assert.deepEqual({ ...loaded.handlesMap }, handlesMap);
    }
  }
  assert.equal(resolveConfiguredHandleSizeMm({ [HANDLE_SIZE_GLOBAL_KEY]: 'bow:96' }, 'd1', 'bar_slim'), 128);
  assert.equal(
    resolveConfiguredHandleSizeMm({ [handleSizePartKey('d1')]: 'bar_slim:192' }, 'd1_top', 'bar_slim'),
    192
  );
});

test('catalog meshes have distinct topology, real mounting planes and matching bounds', () => {
  const App = { deps: { THREE }, services: { builder: { handles: { cache: {} } } } };
  const signatures = new Set<string>();
  for (const type of surfaceTypes) {
    if (type === 'standard') continue;
    assert.equal(supportsHandleHost(type, 'sliding'), false);
    for (const host of ['door', 'drawer'] as const) {
      const model = createHandleMeshV7(type, 0.6, 1.2, true, host === 'drawer', {
        App,
        handleSizeMm: 96,
        addOutlines: noOutlines,
      });
      assert.ok(model);
      const bounds = new THREE.Box3().setFromObject(model as unknown as THREE.Object3D);
      const size = bounds.getSize(new THREE.Vector3());
      const footprint = getSurfaceHandleFootprint(type, host, 96);
      assert.ok(Math.abs(bounds.min.z) < 1e-6);
      assert.ok(Math.abs(size.x - footprint.width) < 1e-6, `${type} ${host} width ${size.x}`);
      assert.ok(Math.abs(size.y - footprint.height) < 1e-6, `${type} ${host} height ${size.y}`);
      assert.ok(Math.abs(size.z - footprint.depth) < 1e-6, `${type} ${host} depth ${size.z}`);
      const vertexCounts: number[] = [];
      (model as unknown as THREE.Object3D).traverse(part => {
        if (part instanceof THREE.Mesh) vertexCounts.push(part.geometry.attributes.position.count);
      });
      if (host === 'drawer') signatures.add(vertexCounts.join(','));
    }
  }
  assert.equal(signatures.size, surfaceTypes.length);
});

test('catalog fit clamps both axes and rejects undersized fronts', () => {
  const rect = { minX: -0.2, maxX: 0.2, minY: -0.05, maxY: 0.05 };
  const footprint = getSurfaceHandleFootprint('bar_round', 'drawer', 160);
  const center = clampSurfaceHandleCenter(footprint, rect, 0.2, -0.05);
  assert.ok(center);
  assert.ok(center.x + footprint.width / 2 < rect.maxX);
  assert.ok(center.y - footprint.height / 2 > rect.minY);
  assert.equal(clampSurfaceHandleCenter(getSurfaceHandleFootprint('bow', 'door', 160), rect, 0, 0), null);
});

test('a 96-front refresh keeps one catalog handle per host and reuses a bounded geometry cache', () => {
  const drawers = Array.from({ length: 96 }, (_, index) => {
    const group = new THREE.Group();
    group.userData = { partId: `d1_draw_${index}`, __doorWidth: 0.6, __doorHeight: 0.16, __frontMaxZ: 0.01 };
    return { group };
  });
  const App = {
    deps: { THREE },
    services: { builder: { handles: { cache: {} } }, platform: {} },
    store: { getState: () => ({ config: {}, ui: {}, runtime: {}, mode: {} }) },
    render: { doorsArray: [], drawersArray: drawers },
  };
  const cfgSnapshot = { globalHandleType: 'bar_slim' };
  const opts = { App, cfgSnapshot, addOutlines: noOutlines, removeDoorsEnabled: false, triggerRender: false };
  applyHandles(opts);
  const geometries = new Set<THREE.BufferGeometry>();
  let disposed = 0;
  for (const { group } of drawers) {
    assert.equal(group.children.length, 1);
    group.children[0]!.traverse(part => {
      if (part instanceof THREE.Mesh) geometries.add(part.geometry);
    });
  }
  assert.equal(geometries.size, 2);
  for (const geometry of geometries) geometry.addEventListener('dispose', () => disposed++);
  applyHandles(opts);
  assert.equal(disposed, 0);
  for (const { group } of drawers) {
    group.children[0]!.traverse(part => {
      if (part instanceof THREE.Mesh) assert.ok(geometries.has(part.geometry));
    });
  }
  assert.ok(drawers.every(({ group }) => group.children.length === 1));
});

test('split-leaf catalog fit and cabinet inheritance use the same snapshot on refresh', () => {
  const door = new THREE.Group();
  door.userData = {
    partId: 'd1',
    __doorWidth: 0.6,
    __doorHeight: 1.2,
    __wpSketchCustomHandles: true,
    __wpSketchSegmentedDoor: true,
  };
  for (const [partId, height, y] of [
    ['d1_top', 0.9, 0.15],
    ['d1_bot', 0.06, -0.35],
  ] as const) {
    const leaf = new THREE.Group();
    leaf.position.y = y;
    leaf.userData = { partId, __doorHeight: height, __wpSketchDoorLeaf: true };
    door.add(leaf);
  }
  const App = {
    deps: { THREE },
    services: { builder: { handles: { cache: {} } }, platform: {} },
    store: { getState: () => ({ config: {}, ui: {}, runtime: {}, mode: {} }) },
    render: { doorsArray: [{ group: door, type: 'hinged' }], drawersArray: [] },
  };
  applyHandles({
    App,
    addOutlines: noOutlines,
    removeDoorsEnabled: false,
    triggerRender: false,
    cfgSnapshot: {
      globalHandleType: 'knob_round',
      handlesMap: {
        d1: 'bar_round',
        d1_top: '__wp_inherit_global',
        [handleSizePartKey('d1')]: 'bar_round:192',
      },
    },
  });
  const handles = door.children.filter(node => node.userData.isHandle);
  assert.equal(handles.length, 1);
  assert.equal(handles[0]!.userData.partId, 'd1_top');
  assert.equal(handles[0]!.userData.handleType, 'knob_round');
  assert.ok(handles[0]!.position.x > -0.3 && handles[0]!.position.x < 0.3);
});

test('standard spacing preserves the original 128 mm geometry and changes fitted footprints at other sizes', () => {
  const App = { deps: { THREE }, services: { builder: { handles: { cache: {} } } } };
  const opts = { App, addOutlines: noOutlines };
  const implicit = createHandleMeshV7('standard', 0.6, 1.2, true, true, opts);
  const defaultSize = createHandleMeshV7('standard', 0.6, 1.2, true, true, { ...opts, handleSizeMm: 128 });
  const longer = createHandleMeshV7('standard', 0.6, 1.2, true, true, { ...opts, handleSizeMm: 192 });
  const bounds = (object: unknown) => new THREE.Box3().setFromObject(object as THREE.Object3D);
  assert.deepEqual(bounds(implicit), bounds(defaultSize));
  assert.ok(Math.abs(bounds(longer).getSize(new THREE.Vector3()).x - 0.224) < 1e-6);
  assert.equal(usesCatalogHandleGeometry('standard', 128), false);
  assert.equal(usesCatalogHandleGeometry('standard', 192), true);
  assert.equal(
    clampSurfaceHandleCenter(
      getSurfaceHandleFootprint('standard', 'drawer', 320),
      { minX: -0.14, maxX: 0.14, minY: -0.07, maxY: 0.07 },
      0,
      0
    ),
    null
  );
});
