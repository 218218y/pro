import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRoomDesignData,
  DEFAULT_FLOOR_STYLES,
  DEFAULT_WALL_COLORS,
} from '../esm/native/ui/react/tabs/settings_visual_shared_room.ts';

test('settings visual controls shared room runtime returns detached default snapshots instead of live default objects', () => {
  const first = getRoomDesignData(null);
  const second = getRoomDesignData(null);

  assert.notEqual(first.floorStyles, DEFAULT_FLOOR_STYLES);
  assert.notEqual(first.floorStyles.parquet, DEFAULT_FLOOR_STYLES.parquet);
  assert.notEqual(first.wallColors, DEFAULT_WALL_COLORS);
  assert.notEqual(first.floorStyles.parquet[0], DEFAULT_FLOOR_STYLES.parquet[0]);
  assert.notEqual(first.wallColors[0], DEFAULT_WALL_COLORS[0]);

  first.floorStyles.parquet[0].name = 'mutated parquet';
  first.wallColors[0].name = 'mutated wall';

  assert.equal(DEFAULT_FLOOR_STYLES.parquet[0].name, 'אלון בהיר');
  assert.equal(DEFAULT_FLOOR_STYLES.tiles[0].id, DEFAULT_FLOOR_STYLES.parquet[0].id);
  assert.equal(DEFAULT_FLOOR_STYLES.tiles[0].lines, '#b9a993');
  assert.equal(DEFAULT_WALL_COLORS[0].name, 'לבן קלאסי');
  assert.equal(DEFAULT_WALL_COLORS[1].name, 'חול חמים');
  assert.equal(DEFAULT_WALL_COLORS[2].name, 'אפור בטון');
  assert.equal(second.floorStyles.parquet[0].name, 'אלון בהיר');
  assert.equal(second.wallColors[0].name, 'לבן קלאסי');
});

test('settings visual controls shared room runtime normalizes runtime-provided styles onto detached default baselines', () => {
  const runtime = {
    FLOOR_STYLES: {
      parquet: [{ id: 'oak_custom', color1: '#111111', color2: '#222222', name: 'Custom Oak' }],
      tiles: [
        {
          id: 'tile_custom',
          color: '#111111',
          color2: '#222222',
          lines: '#333333',
          size: '5',
          name: 'Custom Tile',
        },
      ],
    },
    WALL_COLORS: [{ id: 'wall_custom', val: '#333333', name: 'Custom Wall' }],
    DEFAULT_WALL_COLOR: '#333333',
  } as any;

  const roomData = getRoomDesignData(runtime);
  roomData.floorStyles.parquet[0].name = 'mutated';
  roomData.wallColors[0].name = 'mutated wall';

  const next = getRoomDesignData(runtime);
  assert.equal(next.floorStyles.parquet[0].name, 'Custom Oak');
  assert.equal(next.floorStyles.tiles[0].name, 'Custom Tile');
  assert.equal(next.floorStyles.tiles[0].lines, '#333333');
  assert.equal(next.floorStyles.tiles[0].size, 5);
  assert.equal(next.wallColors[0].name, 'Custom Wall');
  assert.equal(next.defaultWall, '#333333');
  assert.equal(next.hasRoomDesign, true);
});
