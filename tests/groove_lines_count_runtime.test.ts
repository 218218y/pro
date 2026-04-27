import test from 'node:test';
import assert from 'node:assert/strict';

import { readConfigScalarOrDefault } from '../esm/native/runtime/config_selectors.ts';
import { buildProjectConfigSnapshot } from '../esm/native/io/project_io_load_helpers.ts';
import {
  computeAutoGrooveLinesCount,
  materializeActiveGrooveLinesCountMap,
  resolveGrooveLinesCount,
  PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY,
  resolvePendingGrooveLinesCount,
} from '../esm/native/builder/groove_lines_count.ts';

function asPlainRecord<T extends Record<string, unknown> | null | undefined>(
  value: T
): Record<string, unknown> {
  return value ? { ...value } : {};
}

function makeApp(cfg: Record<string, unknown>) {
  return {
    store: {
      getState() {
        return { config: cfg };
      },
    },
  };
}

test('groove line count config scalar normalizes nullable/project values safely', () => {
  assert.equal(readConfigScalarOrDefault({}, 'grooveLinesCount', null), null);
  assert.equal(readConfigScalarOrDefault({ grooveLinesCount: '20.9' }, 'grooveLinesCount', null), 20);
  assert.equal(readConfigScalarOrDefault({ grooveLinesCount: 0 }, 'grooveLinesCount', null), 1);
  assert.equal(readConfigScalarOrDefault({ grooveLinesCount: 'bad' }, 'grooveLinesCount', null), null);
});

test('project io load snapshot keeps groove line count and per-door groove map when present', () => {
  const cfg = buildProjectConfigSnapshot({
    grooveLinesCount: '12.8',
    grooveLinesCountMap: { d1_full: '15.2', bad: 'x' },
  });
  assert.equal(cfg.grooveLinesCount, 12);
  assert.deepEqual(asPlainRecord(cfg.grooveLinesCountMap as Record<string, unknown>), { d1_full: 15 });

  const fallbackCfg = buildProjectConfigSnapshot({ grooveLinesCount: 'bad' });
  assert.equal(fallbackCfg.grooveLinesCount, null);
});

test('pending groove count follows the live brush value, but rendered door count does not', () => {
  const App = makeApp({
    grooveLinesCount: 20,
    grooveLinesCountMap: {
      d1_full: 7,
    },
  });

  assert.equal(resolvePendingGrooveLinesCount(App as never, 0.45), 20);
  assert.equal(resolveGrooveLinesCount(App as never, 0.45, undefined, 'd1_full'), 7);
  assert.equal(
    resolveGrooveLinesCount(App as never, 0.45, undefined, 'd2_full'),
    computeAutoGrooveLinesCount(0.45)
  );
});

test('pending groove count falls back to part width when click hit width is missing', () => {
  const App = {
    store: {
      getState() {
        return {
          config: {
            grooveLinesCount: null,
            grooveLinesCountMap: {},
          },
          ui: {
            raw: {
              width: 240,
              doors: 4,
            },
          },
        };
      },
    },
    render: {
      doorsArray: [
        {
          partId: 'd2_full',
          width: 0.72,
          group: null,
          hingeSide: null,
        },
      ],
    },
  };

  assert.equal(
    resolvePendingGrooveLinesCount(App as never, null, undefined, 'd2_full'),
    computeAutoGrooveLinesCount(0.72)
  );
});

test('render groove count prefers transient pending per-door value when persisted map is not visible yet', () => {
  const App = {
    store: {
      getState() {
        return {
          config: {
            grooveLinesCount: 30,
            grooveLinesCountMap: {},
          },
          runtime: {
            [PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY]: {
              d3_full: 15,
            },
          },
        };
      },
    },
  };

  assert.equal(resolveGrooveLinesCount(App as never, 0.4, undefined, 'd3_full'), 15);
  assert.equal(
    resolveGrooveLinesCount(App as never, 0.4, undefined, 'd4_full'),
    computeAutoGrooveLinesCount(0.4)
  );
});

test('materializeActiveGrooveLinesCountMap freezes active grooved doors to stable per-door counts', () => {
  const App = {
    store: {
      getState() {
        return {
          config: {
            groovesMap: {
              groove_d1_full: true,
              groove_d2_full: true,
            },
            grooveLinesCountMap: {
              d1_full: 9,
            },
          },
          ui: {
            raw: {
              width: 240,
              doors: 4,
            },
          },
        };
      },
    },
    render: {
      doorsArray: [
        {
          partId: 'd2_full',
          width: 0.5,
          group: null,
          hingeSide: null,
        },
      ],
    },
  };

  assert.deepEqual(asPlainRecord(materializeActiveGrooveLinesCountMap(App as never)), {
    d1_full: 9,
    d2_full: 10,
  });
});

test('materializeActiveGrooveLinesCountMap keeps drawer auto count based on drawer face width', () => {
  const App = {
    store: {
      getState() {
        return {
          config: {
            groovesMap: {
              groove_drawer_1: true,
            },
            grooveLinesCountMap: {},
          },
          ui: {
            raw: {
              width: 160,
              doors: 4,
            },
          },
        };
      },
    },
    render: {
      doorsArray: [],
      drawersArray: [
        {
          id: 'drawer_1',
          group: {
            userData: {
              partId: 'drawer_1',
              __doorWidth: 0.8,
            },
          },
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 0, y: 0, z: 0.35 },
        },
      ],
    },
  };

  assert.deepEqual(asPlainRecord(materializeActiveGrooveLinesCountMap(App as never)), {
    drawer_1: 16,
  });
});

test('pending groove count for drawer fronts uses drawer face width instead of ui door fallback', () => {
  const App = {
    store: {
      getState() {
        return {
          config: {
            grooveLinesCount: null,
            grooveLinesCountMap: {},
          },
          ui: {
            raw: {
              width: 160,
              doors: 4,
            },
          },
        };
      },
    },
    render: {
      doorsArray: [],
      drawersArray: [
        {
          partId: 'drawer_2',
          group: {
            userData: {
              partId: 'drawer_2',
              __doorWidth: 0.8,
            },
          },
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 0, y: 0, z: 0.35 },
        },
      ],
    },
  };

  assert.equal(resolvePendingGrooveLinesCount(App as never, null, undefined, 'drawer_2'), 16);
});
