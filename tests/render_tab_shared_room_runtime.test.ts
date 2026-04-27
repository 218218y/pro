import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRoomDesignData,
  FALLBACK_FLOOR_STYLES,
  FALLBACK_WALL_COLORS,
} from '../esm/native/ui/react/tabs/render_tab_shared_room.ts';

test('render tab shared room runtime returns detached fallback snapshots instead of live fallback objects', () => {
  const first = getRoomDesignData(null);
  const second = getRoomDesignData(null);

  assert.notEqual(first.floorStyles, FALLBACK_FLOOR_STYLES);
  assert.notEqual(first.floorStyles.parquet, FALLBACK_FLOOR_STYLES.parquet);
  assert.notEqual(first.wallColors, FALLBACK_WALL_COLORS);
  assert.notEqual(first.floorStyles.parquet[0], FALLBACK_FLOOR_STYLES.parquet[0]);
  assert.notEqual(first.wallColors[0], FALLBACK_WALL_COLORS[0]);

  first.floorStyles.parquet[0].name = 'mutated parquet';
  first.wallColors[0].name = 'mutated wall';

  assert.equal(FALLBACK_FLOOR_STYLES.parquet[0].name, 'אלון בהיר');
  assert.equal(FALLBACK_WALL_COLORS[0].name, 'לבן קלאסי');
  assert.equal(second.floorStyles.parquet[0].name, 'אלון בהיר');
  assert.equal(second.wallColors[0].name, 'לבן קלאסי');
});

test('render tab shared room runtime normalizes runtime-provided styles onto detached fallback baselines', () => {
  const runtime = {
    FLOOR_STYLES: {
      parquet: [{ id: 'oak_custom', color1: '#111111', color2: '#222222', name: 'Custom Oak' }],
    },
    WALL_COLORS: [{ id: 'wall_custom', val: '#333333', name: 'Custom Wall' }],
    DEFAULT_WALL_COLOR: '#333333',
  } as any;

  const roomData = getRoomDesignData(runtime);
  roomData.floorStyles.parquet[0].name = 'mutated';
  roomData.wallColors[0].name = 'mutated wall';

  const next = getRoomDesignData(runtime);
  assert.equal(next.floorStyles.parquet[0].name, 'Custom Oak');
  assert.equal(next.wallColors[0].name, 'Custom Wall');
  assert.equal(next.defaultWall, '#333333');
  assert.equal(next.hasRoomDesign, true);
});
