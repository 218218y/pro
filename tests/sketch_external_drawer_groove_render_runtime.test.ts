import test from 'node:test';
import assert from 'node:assert/strict';

import { addSketchExternalDrawerFrontVisual } from '../esm/native/builder/render_interior_sketch_drawers_external_visual.ts';
import { addSketchBoxExternalDrawerFrontVisual } from '../esm/native/builder/render_interior_sketch_boxes_fronts_drawers_visual.ts';

function createContext(groovesMap: Record<string, unknown> | null, extraCfg: Record<string, unknown> = {}) {
  const createDoorVisualCalls: unknown[][] = [];
  const createDoorVisual = (...args: unknown[]) => {
    createDoorVisualCalls.push(args);
    return {
      userData: {},
      position: {
        set() {},
      },
      traverse() {},
    };
  };
  return {
    context: {
      input: {
        cfg: {
          groovesMap,
          ...extraCfg,
        },
        addOutlines: null,
        createDoorVisual,
      },
      shell: {
        boxId: 'box-a',
        isFreePlacement: false,
        boxMat: 'box-material',
      },
      moduleKeyStr: 'module-0',
      doorStyle: 'flat',
      doorStyleMap: {},
      createDoorVisual,
      THREE: {
        MeshStandardMaterial: class MeshStandardMaterial {
          params: unknown;
          constructor(params: unknown) {
            this.params = params;
          }
        },
        Mesh: class Mesh {
          userData = {};
          position = { set() {} };
          traverse() {}
          geometry: unknown;
          material: unknown;
          constructor(geometry?: unknown, material?: unknown) {
            this.geometry = geometry;
            this.material = material;
          }
        },
        BoxGeometry: class BoxGeometry {},
      },
      isFn(value: unknown) {
        return typeof value === 'function';
      },
      resolveCachedMirrorMaterial() {
        return null;
      },
    } as never,
    createDoorVisualCalls,
  };
}

function createOpPlan(partId = 'sketch_box_box-a_ext_drawer_front_1') {
  return {
    partId,
    faceW: 0.8,
    visualH: 0.2,
    visualD: 0.018,
    frontMat: 'front-material',
    faceOffsetX: 0.1,
    faceOffsetY: -0.2,
    omitBoxFrontPanel: false,
    omitConnectorPanel: false,
  } as never;
}

function createGroupNode() {
  return {
    added: [] as unknown[],
    add(node: unknown) {
      this.added.push(node);
    },
  } as never;
}

test('module-level sketch external drawer front passes groove state into the shared door visual factory', () => {
  const partId = 'sketch_ext_drawers_1_sed-1_1';
  const { context, createDoorVisualCalls } = createContext({ [`groove_${partId}`]: true });
  const groupNode = createGroupNode();

  addSketchExternalDrawerFrontVisual(
    context,
    { drawerId: 'sed-1' } as never,
    createOpPlan(partId),
    groupNode
  );

  assert.equal(createDoorVisualCalls.length, 1);
  assert.equal(createDoorVisualCalls[0][5], true);
  assert.equal(createDoorVisualCalls[0][12], partId);
});

test('module-level sketch external drawer front appends configured door-trim visuals', () => {
  const partId = 'sketch_ext_drawers_1_sed-1_1';
  const { context } = createContext(null, {
    doorTrimMap: {
      [partId]: [{ id: 'trim-a', axis: 'horizontal', color: 'black', span: 'full', centerNorm: 0.5 }],
    },
  });
  const groupNode = createGroupNode();

  addSketchExternalDrawerFrontVisual(
    context,
    { drawerId: 'sed-1' } as never,
    createOpPlan(partId),
    groupNode
  );

  assert.equal(groupNode.added.length, 2);
  assert.equal((groupNode.added[1] as any).userData.__wpDoorTrim, true);
  assert.equal((groupNode.added[1] as any).userData.partId, partId);
});

test('module-level sketch external drawer front does not render grooves on glass fronts', () => {
  const partId = 'sketch_ext_drawers_1_sed-1_1';
  const { context, createDoorVisualCalls } = createContext(
    { [`groove_${partId}`]: true },
    { isMultiColorMode: true, doorSpecialMap: { [partId]: 'glass' } }
  );
  const groupNode = createGroupNode();

  addSketchExternalDrawerFrontVisual(
    context,
    { drawerId: 'sed-1' } as never,
    createOpPlan(partId),
    groupNode
  );

  assert.equal(createDoorVisualCalls.length, 1);
  assert.equal(createDoorVisualCalls[0][4], 'glass');
  assert.equal(createDoorVisualCalls[0][5], false);
});

test('sketch external drawer front passes groove state into the shared door visual factory', () => {
  const partId = 'sketch_box_box-a_ext_drawer_front_1';
  const { context, createDoorVisualCalls } = createContext({ [`groove_${partId}`]: true });
  const groupNode = createGroupNode();

  addSketchBoxExternalDrawerFrontVisual(context, createOpPlan(partId), groupNode);

  assert.equal(createDoorVisualCalls.length, 1);
  assert.equal(createDoorVisualCalls[0][5], true);
  assert.equal(createDoorVisualCalls[0][12], partId);
});

test('sketch-box external drawer front appends configured door-trim visuals', () => {
  const partId = 'sketch_box_box-a_ext_drawers_sed-2_1';
  const { context } = createContext(null, {
    doorTrimMap: {
      [partId]: [{ id: 'trim-b', axis: 'vertical', color: 'nickel', span: 'half', centerNorm: 0.5 }],
    },
  });
  const groupNode = createGroupNode();

  addSketchBoxExternalDrawerFrontVisual(context, createOpPlan(partId), groupNode);

  assert.equal(groupNode.added.length, 2);
  assert.equal((groupNode.added[1] as any).userData.__wpDoorTrim, true);
  assert.equal((groupNode.added[1] as any).userData.partId, partId);
});

test('sketch external drawer front does not render grooves on glass fronts', () => {
  const partId = 'sketch_box_box-a_ext_drawer_front_1';
  const { context, createDoorVisualCalls } = createContext(
    { [`groove_${partId}`]: true },
    { isMultiColorMode: true, doorSpecialMap: { [partId]: 'glass' } }
  );
  const groupNode = createGroupNode();

  addSketchBoxExternalDrawerFrontVisual(context, createOpPlan(partId), groupNode);

  assert.equal(createDoorVisualCalls.length, 1);
  assert.equal(createDoorVisualCalls[0][4], 'glass');
  assert.equal(createDoorVisualCalls[0][5], false);
});
