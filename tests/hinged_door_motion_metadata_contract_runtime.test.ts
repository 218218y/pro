import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createHingedDoorMotionMetadataPatch,
  readHingedDoorMotionMetadataSnapshot,
} from '../esm/shared/door_motion_contracts_shared.ts';
import {
  createBuilderHingedDoorMotionMetadata,
  patchBuilderHingedDoorMotionMetadata,
} from '../esm/native/builder/hinged_door_motion_metadata.ts';
import { readRuntimeHingedDoorMotionMetadata } from '../esm/native/runtime/door_motion_policy_access.ts';
import { readHingedDoorMotionMetadata } from '../esm/native/runtime/hinged_door_kinematics.ts';

test('hinged-door metadata writer and runtime reader round-trip one canonical schema', () => {
  const userData = createBuilderHingedDoorMotionMetadata({
    partId: 'corner_pent_door_2_mid1',
    cornerPent: true,
    cornerPentPair: true,
    openDirectionSign: -1,
    handleZSign: 1,
    invertSwing: true,
    removed: false,
    noGlobalOpen: true,
    widthM: 0.48,
    heightM: 0.91,
    meshOffsetXM: -0.24,
  });

  assert.deepEqual(userData, {
    partId: 'corner_pent_door_2_mid1',
    __wpCornerPentDoor: true,
    __wpCornerPentDoorPair: 'corner_pent_pair',
    __wpDoorOpenDirSign: -1,
    __handleZSign: 1,
    __invertSwing: true,
    __wpDoorRemoved: false,
    noGlobalOpen: true,
    __doorWidth: 0.48,
    __doorHeight: 0.91,
    __doorMeshOffsetX: -0.24,
  });

  assert.deepEqual(readRuntimeHingedDoorMotionMetadata(userData), {
    partId: 'corner_pent_door_2_mid1',
    isCornerPent: true,
    openDirectionSign: -1,
    invertSwing: true,
    removed: false,
    noGlobalOpen: true,
    widthM: 0.48,
    heightM: 0.91,
    meshOffsetXM: -0.24,
  });
});

test('hinged-door metadata reader owns direction precedence and legacy sign compatibility', () => {
  assert.equal(
    readHingedDoorMotionMetadataSnapshot({
      __wpDoorOpenDirSign: -1,
      __wpDoorOpenZSign: 1,
      __handleZSign: -1,
    }).openDirectionSign,
    -1
  );
  assert.equal(
    readHingedDoorMotionMetadataSnapshot({ __wpDoorOpenZSign: '-1', __handleZSign: -1 }).openDirectionSign,
    -1
  );
  assert.equal(readHingedDoorMotionMetadataSnapshot({ __handleZSign: '1' }).openDirectionSign, -1);
  assert.equal(readHingedDoorMotionMetadataSnapshot({ __handleZSign: '-1' }).openDirectionSign, 1);
  assert.equal(readHingedDoorMotionMetadataSnapshot({ __handleZSign: 'not-a-sign' }).openDirectionSign, 1);
});

test('hinged-door metadata writer is strict while the reader is the compatibility boundary', () => {
  const malformed = createHingedDoorMotionMetadataPatch({
    partId: 'door_1',
    widthM: Number.NaN,
    heightM: Number.POSITIVE_INFINITY,
    meshOffsetXM: Number.NEGATIVE_INFINITY,
  });
  assert.deepEqual(malformed, { partId: 'door_1' });

  const unsafeInput: unknown = {
    partId: { accidental: true },
    openDirectionSign: '1',
    handleZSign: '-1',
    widthM: '0.5',
  };
  const strictPatch = createHingedDoorMotionMetadataPatch(
    unsafeInput as Parameters<typeof createHingedDoorMotionMetadataPatch>[0]
  );
  assert.deepEqual(strictPatch, {});

  const compatibilityRead = readHingedDoorMotionMetadataSnapshot(unsafeInput);
  assert.equal(compatibilityRead.partId, '');
  assert.equal(compatibilityRead.openDirectionSign, 1);
  assert.equal(compatibilityRead.widthM, null);
});

test('Corner Pent and no-global-open classification are normalized once for runtime and services', () => {
  const byMarker = readHingedDoorMotionMetadataSnapshot({
    __wpCornerPentDoorPair: 'corner_pent_pair',
  });
  assert.equal(byMarker.isCornerPent, true);
  assert.equal(byMarker.noGlobalOpen, true);

  const byPartId = readHingedDoorMotionMetadataSnapshot({ partId: 'corner_pent_door_1_full' });
  assert.equal(byPartId.isCornerPent, true);
  assert.equal(byPartId.noGlobalOpen, true);

  const byFrontMarker = readHingedDoorMotionMetadataSnapshot({ __wpCornerPentFront: true });
  assert.equal(byFrontMarker.isCornerPent, false);
  assert.equal(byFrontMarker.noGlobalOpen, true);
});

test('entry invert-swing participates in the same normalized runtime snapshot', () => {
  const group = {
    userData: createBuilderHingedDoorMotionMetadata({
      partId: 'door_7',
      openDirectionSign: 1,
      heightM: 2,
      meshOffsetXM: 0.3,
    }),
  };
  const door = { type: 'hinged', hingeSide: 'left', invertSwing: true, group } as never;
  const metadata = readHingedDoorMotionMetadata(door);

  assert.equal(metadata.invertSwing, true);
  assert.equal(metadata.partId, 'door_7');
  assert.equal(metadata.heightM, 2);
  assert.equal(metadata.meshOffsetXM, 0.3);
});

test('builder patch updates motion metadata without deleting unrelated scene metadata', () => {
  const userData: Record<string, unknown> = {
    moduleIndex: 4,
    __wpStack: 'top',
    customMarker: true,
  };

  patchBuilderHingedDoorMotionMetadata(userData, {
    partId: 'door_4',
    removed: true,
    widthM: 0.6,
  });

  assert.equal(userData.moduleIndex, 4);
  assert.equal(userData.__wpStack, 'top');
  assert.equal(userData.customMarker, true);
  assert.equal(userData.partId, 'door_4');
  assert.equal(userData.__wpDoorRemoved, true);
  assert.equal(userData.__doorWidth, 0.6);
});
