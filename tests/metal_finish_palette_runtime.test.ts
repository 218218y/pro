import test from 'node:test';
import assert from 'node:assert/strict';

import { getBaseLegColorHex } from '../esm/native/features/base_leg_support.ts';
import {
  METAL_FINISH_PALETTE_BY_COLOR,
  resolveHandleFinishPalette,
} from '../esm/native/features/finish_palette/api.ts';
import { createSlidingTrackPalette } from '../esm/native/builder/render_door_ops_shared_materials.ts';

test('nickel finish is shared by sliding tracks, base legs, and handles', () => {
  const nickel = METAL_FINISH_PALETTE_BY_COLOR.nickel;
  const sliding = createSlidingTrackPalette({ slidingTracksColor: 'nickel' });
  const handle = resolveHandleFinishPalette('nickel');

  assert.equal(nickel.hex, 0xe5e9ef);
  assert.equal(sliding.hex, nickel.hex);
  assert.equal(sliding.emissiveHex, nickel.emissiveHex);
  assert.equal(sliding.roughness, nickel.roughness);
  assert.equal(getBaseLegColorHex('nickel'), nickel.cssHex);
  assert.equal(handle.hex, nickel.hex);
  assert.equal(handle.metalness, nickel.metalness);
});

test('silver and nickel handles remain visually distinct presets', () => {
  const nickel = resolveHandleFinishPalette('nickel');
  const silver = resolveHandleFinishPalette('silver');

  assert.notEqual(nickel.hex, silver.hex);
  assert.notEqual(nickel.roughness, silver.roughness);
});
