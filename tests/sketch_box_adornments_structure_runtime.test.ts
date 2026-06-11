import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/pure_api.ts';
import {
  getSketchFreeBoxContentKind,
  parseSketchBoxBaseTool,
  parseSketchBoxCorniceTool,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';
import {
  FakeBoxGeometry,
  FakeExtrudeGeometry,
  FakeMaterial,
  FakeMesh,
  FakeNode,
  FakePositionAttribute,
  createSketchInteriorHarness,
  getWorldY,
} from './sketch_box_runtime_helpers.ts';

test('sketch box adornment tools parse as free-box content kinds', () => {
  assert.equal(parseSketchBoxCorniceTool('sketch_box_cornice:wave'), 'wave');
  assert.equal(parseSketchBoxCorniceTool('sketch_box_cornice:classic'), 'classic');
  assert.equal(parseSketchBoxBaseTool('sketch_box_base:legs'), 'legs');
  assert.equal(parseSketchBoxBaseTool('sketch_box_base:none'), 'none');
  assert.equal(getSketchFreeBoxContentKind('sketch_box_cornice:wave'), 'cornice');
  assert.equal(getSketchFreeBoxContentKind('sketch_box_base:plinth'), 'base');
});

test('sketch internal drawers tool parses as free-box content kind', () => {
  assert.equal(getSketchFreeBoxContentKind('sketch_int_drawers'), 'drawers');
  assert.equal(getSketchFreeBoxContentKind('sketch_int_drawers@24'), 'drawers');
});

test('free-placement sketch box renders base and cornice adornments with pick metadata', () => {
  const { wardrobeGroup, boards, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'free1',
            freePlacement: true,
            absX: 0,
            absY: 1.1,
            heightM: 0.62,
            widthM: 0.72,
            depthM: 0.45,
            hasCornice: true,
            corniceType: 'wave',
            baseType: 'legs',
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  assert.ok(boards.length >= 5, 'expected free-placement sketch box boards to render');

  const adornmentNodes: FakeNode[] = [];
  wardrobeGroup.traverse(node => {
    const rec = node as FakeNode;
    const partId = String(rec.userData?.partId || '');
    if (!partId.startsWith('sketch_box_free_')) return;
    if (partId.includes('_leg_') || partId.includes('cornice')) adornmentNodes.push(rec);
  });

  assert.ok(adornmentNodes.length >= 3, `expected free box adornment nodes, got ${adornmentNodes.length}`);
  for (const node of adornmentNodes) {
    assert.equal(node.userData.__wpSketchFreePlacement, true);
    assert.equal(node.userData.__wpSketchBoxId, 'free1');
    assert.equal(node.userData.__wpSketchModuleKey, '0');
  }
});

test('adjacent free-placement sketch boxes collapse to one connected dimension group', () => {
  const capturedDimensions: Array<{
    label: string;
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
  }> = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    bodyWidth: 1.8,
    bodyHeight: 2.6,
    bodyDepth: 0.7,
    bodyCenterY: 1.3,
    ops: {
      addDimensionLine: (
        from: { x: number; y: number; z: number },
        to: { x: number; y: number; z: number },
        _textOffset: unknown,
        label: string
      ) => {
        capturedDimensions.push({
          label: String(label),
          from: { x: from.x, y: from.y, z: from.z },
          to: { x: to.x, y: to.y, z: to.z },
        });
      },
    },
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      cfg: { showDimensions: true },
      sketchExtras: {
        boxes: [
          { id: 'lb', freePlacement: true, absX: -0.375, absY: 0.3, heightM: 0.6, widthM: 0.55, depthM: 0.6 },
          { id: 'rb', freePlacement: true, absX: 0.275, absY: 0.3, heightM: 0.6, widthM: 0.75, depthM: 0.6 },
          { id: 'lt', freePlacement: true, absX: -0.375, absY: 0.9, heightM: 0.6, widthM: 0.55, depthM: 0.6 },
          { id: 'rt', freePlacement: true, absX: 0.275, absY: 0.9, heightM: 0.6, widthM: 0.75, depthM: 0.6 },
        ],
      },
      effectiveTopY: 2.6,
      internalDepth: 0.65,
    })
  );

  assert.equal(ok, true);
  assert.equal(
    capturedDimensions.filter(line => line.label === '130').length,
    1,
    'expected one grouped total width'
  );
  assert.equal(
    capturedDimensions.filter(line => line.label === '55').length,
    1,
    'expected one left column width'
  );
  assert.equal(
    capturedDimensions.filter(line => line.label === '75').length,
    1,
    'expected one right column width'
  );
  assert.equal(
    capturedDimensions.filter(line => line.label === '120').length,
    1,
    'expected one grouped total height'
  );
  assert.equal(
    capturedDimensions.filter(line => line.label === '60').length,
    1,
    'expected one grouped depth'
  );

  const totalWidthLine = capturedDimensions.find(line => line.label === '130');
  assert.ok(totalWidthLine);
  assert.ok(
    Math.abs(totalWidthLine.from.x + 0.65) < 1e-6,
    `expected grouped width to start at -0.65, got ${totalWidthLine?.from.x}`
  );
  assert.ok(
    Math.abs(totalWidthLine.to.x - 0.65) < 1e-6,
    `expected grouped width to end at 0.65, got ${totalWidthLine?.to.x}`
  );
});

test('free-placement sketch box plinth renders below the box body instead of inside it', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const boxHeight = 0.62;
  const boxCenterY = boxHeight / 2 + 0.08;
  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'floorBox',
            freePlacement: true,
            absX: 0,
            absY: boxCenterY,
            heightM: boxHeight,
            widthM: 0.72,
            depthM: 0.45,
            baseType: 'plinth',
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  let plinthNode: FakeMesh | undefined;
  wardrobeGroup.traverse(node => {
    const rec = node as FakeMesh;
    if (!plinthNode && String(rec.userData?.partId || '').includes('plinth')) plinthNode = rec;
  });
  assert.ok(plinthNode, 'expected plinth node');
  const plinthTopY = getWorldY(plinthNode) + plinthNode.geometry.parameters.height / 2;
  const boxBottomY = boxCenterY - boxHeight / 2;
  assert.ok(
    Math.abs(plinthTopY - boxBottomY) < 1e-6,
    `expected plinth top ${plinthTopY} to meet box bottom ${boxBottomY}`
  );
});

test('free-placement classic sketch box cornice applies miter trims like the regular wardrobe cornice', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'classic1',
            freePlacement: true,
            absX: 0,
            absY: 1.1,
            heightM: 0.62,
            widthM: 0.72,
            depthM: 0.45,
            hasCornice: true,
            corniceType: 'classic',
            baseType: 'none',
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const corniceMeshes: FakeMesh[] = [];
  wardrobeGroup.traverse(node => {
    const rec = node as FakeMesh;
    if (rec.geometry instanceof FakeExtrudeGeometry) corniceMeshes.push(rec);
  });
  assert.ok(corniceMeshes.length >= 3, `expected profile cornice meshes, got ${corniceMeshes.length}`);
  const frontMesh = corniceMeshes.find(node => Math.abs(node.rotation.y + Math.PI / 2) < 1e-6);
  assert.ok(frontMesh, 'expected front classic cornice mesh');
  const positionAttr = (frontMesh!.geometry as unknown as FakeExtrudeGeometry).getAttribute(
    'position'
  ) as FakePositionAttribute;
  const zs = positionAttr.zs.slice();
  const halfLen = Math.max(...zs.map(value => Math.abs(value)));
  assert.ok(
    zs.some(value => value < halfLen - 0.01),
    'expected trimmed positive-end vertices on the front cornice'
  );
  assert.ok(
    zs.some(value => value > -halfLen + 0.01),
    'expected trimmed negative-end vertices on the front cornice'
  );
});

test('free-placement sketch box cornice ops rise by the base support height when the box is floor-supported', () => {
  const plainOps = computeCarcassOps({
    totalW: 0.72,
    D: 0.45,
    H: 0.62,
    woodThick: 0.018,
    baseType: 'none',
    doorsCount: 2,
    hasCornice: true,
    corniceType: 'classic',
  }) as Record<string, unknown>;
  const raisedOps = computeCarcassOps({
    totalW: 0.72,
    D: 0.45,
    H: 0.74,
    woodThick: 0.018,
    baseType: 'legs',
    doorsCount: 2,
    hasCornice: true,
    corniceType: 'classic',
  }) as Record<string, unknown>;

  const plainCornice = plainOps.cornice as Record<string, unknown>;
  const raisedCornice = raisedOps.cornice as Record<string, unknown>;
  const plainFront = (plainCornice.segments as Array<Record<string, unknown>>)[0];
  const raisedFront = (raisedCornice.segments as Array<Record<string, unknown>>)[0];
  assert.ok(Math.abs(Number(raisedFront.y) - Number(plainFront.y) - 0.12) < 1e-6);
});

test('inside-module sketch box without baseType does not render a default plinth or legs', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    bodyWidth: 1.2,
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'moduleBoxAuto',
            heightM: 0.72,
            yNorm: 0.5,
          },
        ],
      },
      effectiveBottomY: 0.05,
      effectiveTopY: 2.25,
      innerW: 0.82,
      internalDepth: 0.58,
      createInternalDrawerBox: (w: number, h: number, d: number, mat: FakeMaterial) =>
        new FakeMesh(new FakeBoxGeometry(w, h, d), mat),
    })
  );

  assert.equal(ok, true);
  const allPartIds: string[] = [];
  wardrobeGroup.traverse(node => {
    const partId = String((node as FakeNode).userData?.partId || '');
    if (partId) allPartIds.push(partId);
  });
  assert.ok(
    allPartIds.some(partId => partId.includes('sketch_box_0_moduleBoxAuto')),
    'expected module sketch box body boards'
  );
  assert.ok(
    allPartIds.every(partId => !partId.includes('_plinth_') && !partId.includes('_leg_')),
    'module sketch box should not get a default base adornment'
  );
});

test('inside-module sketch box renders explicit cornice adornments with scoped pick metadata', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    bodyWidth: 1.2,
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'moduleCornice',
            heightM: 0.72,
            yNorm: 0.5,
            hasCornice: true,
            corniceType: 'classic',
          },
        ],
      },
      effectiveBottomY: 0.05,
      effectiveTopY: 2.25,
      innerW: 0.82,
      internalDepth: 0.58,
      createInternalDrawerBox: (w: number, h: number, d: number, mat: FakeMaterial) =>
        new FakeMesh(new FakeBoxGeometry(w, h, d), mat),
    })
  );

  assert.equal(ok, true);
  const cornicePartIds: string[] = [];
  wardrobeGroup.traverse(node => {
    const rec = node as FakeNode;
    const partId = String(rec.userData?.partId || '');
    if (!partId.includes('sketch_box_0_moduleCornice_cornice')) return;
    cornicePartIds.push(partId);
    assert.equal(rec.userData.__wpSketchFreePlacement, false);
    assert.equal(rec.userData.__wpSketchBoxId, 'moduleCornice');
    assert.equal(rec.userData.__wpSketchModuleKey, '0');
  });

  assert.ok(cornicePartIds.length >= 3, `expected module box cornice nodes, got ${cornicePartIds.length}`);
});

test('inside-module sketch box renders explicit base adornments instead of dropping them silently', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    bodyWidth: 1.2,
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'moduleBase',
            heightM: 0.72,
            yNorm: 0.5,
            baseType: 'plinth',
          },
        ],
      },
      effectiveBottomY: 0.05,
      effectiveTopY: 2.25,
      innerW: 0.82,
      internalDepth: 0.58,
      createInternalDrawerBox: (w: number, h: number, d: number, mat: FakeMaterial) =>
        new FakeMesh(new FakeBoxGeometry(w, h, d), mat),
    })
  );

  assert.equal(ok, true);
  const baseNodes: FakeNode[] = [];
  wardrobeGroup.traverse(node => {
    const rec = node as FakeNode;
    const partId = String(rec.userData?.partId || '');
    if (!partId.includes('sketch_box_0_moduleBase_plinth')) return;
    baseNodes.push(rec);
    assert.equal(rec.userData.__wpSketchFreePlacement, false);
    assert.equal(rec.userData.__wpSketchBoxId, 'moduleBase');
  });

  assert.ok(baseNodes.length >= 1, 'expected module box plinth adornment');
});

test('free-placement sketch box doors honor explicit global and per-door door-style overrides through the canonical door visual factory', () => {
  const capturedStyles: Array<{ style: unknown; partId: unknown }> = [];
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const createDoorVisual = (
    w: number,
    h: number,
    d: number,
    mat: FakeMaterial,
    style: unknown,
    _hasGrooves: boolean,
    _isMirror: boolean,
    _curtainType: string | null,
    _baseMaterial: FakeMaterial | null,
    _frontFaceSign: number,
    _forceCurtainFix: boolean,
    _mirrorLayout: unknown,
    partId: unknown
  ) => {
    capturedStyles.push({ style, partId });
    const mesh = new FakeMesh(new FakeBoxGeometry(w, h, d), mat);
    mesh.userData.partId = partId;
    return mesh;
  };

  const okGlobal = applyInteriorSketchExtras(
    makeArgs({
      doorStyle: 'profile',
      createDoorVisual,
      sketchExtras: {
        boxes: [
          {
            id: 'freeStyleGlobal',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.72,
            widthM: 0.78,
            depthM: 0.5,
            doors: [{ id: 'doorA', enabled: true, hinge: 'left' }],
          },
        ],
      },
    })
  );

  assert.equal(okGlobal, true);
  assert.ok(
    capturedStyles.some(
      entry => entry.partId === 'sketch_box_free_0_freeStyleGlobal_door_doorA' && entry.style === 'profile'
    )
  );

  const okOverride = applyInteriorSketchExtras(
    makeArgs({
      cfg: {
        doorStyleMap: {
          sketch_box_free_0_freeStyleOverride_door_doorB: 'tom',
        },
      },
      doorStyle: 'flat',
      createDoorVisual,
      sketchExtras: {
        boxes: [
          {
            id: 'freeStyleOverride',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.72,
            widthM: 0.78,
            depthM: 0.5,
            doors: [{ id: 'doorB', enabled: true, hinge: 'left' }],
          },
        ],
      },
    })
  );

  assert.equal(okOverride, true);
  assert.ok(
    capturedStyles.some(
      entry => entry.partId === 'sketch_box_free_0_freeStyleOverride_door_doorB' && entry.style === 'tom'
    )
  );
  assert.ok(wardrobeGroup.children.length > 0);
});
