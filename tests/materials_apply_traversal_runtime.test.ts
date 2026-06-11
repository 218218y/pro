import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyMaterialsToWardrobeTree,
  shouldKeepMaterialsApplyMeshMaterial,
} from '../esm/native/builder/materials_apply_traversal.ts';

test('materials apply traversal keeps hidden selector/invisible meshes on their own materials', () => {
  const selectorMaterial = { colorWrite: false, transparent: true, opacity: 0 };
  const selectorMesh = {
    isMesh: true,
    material: selectorMaterial,
    userData: { partId: 'selector', isModuleSelector: true },
    children: [],
  } as any;

  const invisibleMaterial = { visible: false };
  const invisibleMesh = {
    isMesh: true,
    material: invisibleMaterial,
    userData: { partId: 'invisible-part' },
    children: [],
  } as any;

  const explicitKeepMaterial = { marker: 'keep' };
  const keepMesh = {
    isMesh: true,
    material: explicitKeepMaterial,
    userData: { partId: 'kept-part', __keepMaterial: true },
    children: [],
  } as any;

  const keepMaterialViaMaterialUserData = {
    userData: { __keepMaterial: true },
  };
  const keepMaterialUserDataMesh = {
    isMesh: true,
    material: keepMaterialViaMaterialUserData,
    userData: { partId: 'kept-via-material-user-data' },
    children: [],
  } as any;

  const keepMaterialViaMaterialFlag = {
    __keepMaterial: true,
  };
  const keepMaterialFlagMesh = {
    isMesh: true,
    material: keepMaterialViaMaterialFlag,
    userData: { partId: 'kept-via-material-flag' },
    children: [],
  } as any;

  const appPartMaterial = { canonical: true };
  const wardrobeGroup = {
    isMesh: false,
    userData: {},
    children: [selectorMesh, invisibleMesh, keepMesh, keepMaterialUserDataMesh, keepMaterialFlagMesh],
  } as any;

  const changed = applyMaterialsToWardrobeTree({
    wardrobeGroup,
    getPartMat: () => appPartMaterial,
    readPartId: value => (typeof value === 'string' ? value : null),
    readStackKey: () => null,
  });

  assert.equal(shouldKeepMaterialsApplyMeshMaterial(selectorMesh), true);
  assert.equal(shouldKeepMaterialsApplyMeshMaterial(invisibleMesh), true);
  assert.equal(shouldKeepMaterialsApplyMeshMaterial(keepMesh), true);
  assert.equal(shouldKeepMaterialsApplyMeshMaterial(keepMaterialUserDataMesh), true);
  assert.equal(shouldKeepMaterialsApplyMeshMaterial(keepMaterialFlagMesh), true);
  assert.equal(selectorMesh.material, selectorMaterial);
  assert.equal(invisibleMesh.material, invisibleMaterial);
  assert.equal(keepMesh.material, explicitKeepMaterial);
  assert.equal(keepMaterialUserDataMesh.material, keepMaterialViaMaterialUserData);
  assert.equal(keepMaterialFlagMesh.material, keepMaterialViaMaterialFlag);
});

test('materials apply traversal inherits canonical part ids through the tree and skips kept subtrees', () => {
  const assignedMaterials: string[] = [];
  const rootMaterial = { root: true };
  const keptSubtreeMaterial = { keep: true };

  const deepChild = {
    isMesh: true,
    material: { stale: 'deep' },
    userData: {},
    children: [],
  } as any;
  const keptParent = {
    isMesh: true,
    material: keptSubtreeMaterial,
    userData: { partId: 'kept-parent', __keepMaterialSubtree: true },
    children: [deepChild],
  } as any;
  const inheritedChild = {
    isMesh: true,
    material: { stale: 'child' },
    userData: {},
    children: [],
  } as any;
  const rootMesh = {
    isMesh: true,
    material: { stale: 'root' },
    userData: { partId: 'root-part' },
    children: [inheritedChild, keptParent],
  } as any;

  const changed = applyMaterialsToWardrobeTree({
    wardrobeGroup: rootMesh,
    getPartMat: partId => {
      assignedMaterials.push(String(partId));
      if (partId === 'root-part') return rootMaterial;
      return { fallback: partId };
    },
    readPartId: value => (typeof value === 'string' ? value : null),
    readStackKey: () => null,
  });

  assert.equal(changed, true);
  assert.deepEqual(assignedMaterials, ['root-part']);
  assert.equal(rootMesh.material, rootMaterial);
  assert.equal(inheritedChild.material, rootMaterial);
  assert.deepEqual(keptParent.material, keptSubtreeMaterial);
  assert.deepEqual(deepChild.material, { stale: 'deep' });
  assert.equal(
    shouldKeepMaterialsApplyMeshMaterial({ material: { transparent: true, opacity: 0 } } as any),
    true
  );
  assert.equal(shouldKeepMaterialsApplyMeshMaterial({ material: { visible: true } } as any), false);
});

test('materials apply traversal caches repeated part material resolution per part/stack and reports no-op replays', () => {
  const sharedMaterial = { canonical: true };
  let getPartMatCalls = 0;
  const repeatedChildA = {
    isMesh: true,
    material: { stale: 'a' },
    userData: {},
    children: [],
  } as any;
  const repeatedChildB = {
    isMesh: true,
    material: { stale: 'b' },
    userData: {},
    children: [],
  } as any;
  const rootMesh = {
    isMesh: true,
    material: { stale: 'root' },
    userData: { partId: 'repeat-part', __wpStack: 'bottom' },
    children: [repeatedChildA, repeatedChildB],
  } as any;

  const firstChanged = applyMaterialsToWardrobeTree({
    wardrobeGroup: rootMesh,
    getPartMat: (partId, stackKey) => {
      getPartMatCalls += 1;
      assert.equal(partId, 'repeat-part');
      assert.equal(stackKey, 'bottom');
      return sharedMaterial;
    },
    readPartId: value => (typeof value === 'string' ? value : null),
    readStackKey: value => (value === 'bottom' || value === 'top' ? value : null),
  });

  assert.equal(firstChanged, true);
  assert.equal(getPartMatCalls, 1);
  assert.equal(rootMesh.material, sharedMaterial);
  assert.equal(repeatedChildA.material, sharedMaterial);
  assert.equal(repeatedChildB.material, sharedMaterial);

  const secondChanged = applyMaterialsToWardrobeTree({
    wardrobeGroup: rootMesh,
    getPartMat: () => {
      getPartMatCalls += 1;
      return sharedMaterial;
    },
    readPartId: value => (typeof value === 'string' ? value : null),
    readStackKey: value => (value === 'bottom' || value === 'top' ? value : null),
  });

  assert.equal(secondChanged, false);
  assert.equal(getPartMatCalls, 2);
});
