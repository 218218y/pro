import test from 'node:test';
import assert from 'node:assert/strict';

import {
  installBootSeedsPart02,
  seedColorSwatchesOrder,
  seedMultiColorMode,
} from '../esm/native/services/boot_seeds_part02.ts';

function makeApp(config: Record<string, unknown> = {}) {
  const cfg = { ...config };
  const calls: Record<string, unknown[]> = {
    multi: [],
    colors: [],
    room: [],
    savedColors: [],
  };
  const App: Record<string, unknown> = {
    actions: {
      colors: {
        setMultiMode(next: boolean, meta?: Record<string, unknown>) {
          calls.multi.push({ next, meta });
          cfg.isMultiColorMode = next;
        },
      },
      room: {
        setWardrobeType(next: string, meta?: Record<string, unknown>) {
          calls.room.push({ kind: 'wardrobeType', next, meta });
          cfg.wardrobeType = next;
        },
        setManualWidth(next: boolean, meta?: Record<string, unknown>) {
          calls.room.push({ kind: 'manualWidth', next, meta });
          cfg.isManualWidth = next;
        },
      },
    },
    maps: {
      setColorSwatchesOrder(order: string[], meta?: Record<string, unknown>) {
        calls.colors.push({ order, meta });
        cfg.colorSwatchesOrder = order.slice();
      },
      setSavedColors(colors: unknown[], meta?: Record<string, unknown>) {
        calls.savedColors.push({ colors, meta });
        cfg.savedColors = Array.isArray(colors) ? colors.slice() : [];
      },
    },
    services: {
      storage: {
        KEYS: { SAVED_COLORS: 'wardrobeSavedColors' },
        getString(key: string) {
          if (key !== 'wardrobeSavedColors:order') return null;
          return JSON.stringify(['  oak  ', '', 'white', 'oak']);
        },
      },
    },
    store: {
      getState() {
        return { config: cfg, ui: {}, runtime: {}, mode: {}, meta: {} };
      },
      patch(updater: any) {
        const current = this.getState();
        const next = typeof updater === 'function' ? updater(current) : updater;
        if (next && typeof next === 'object' && next.config && typeof next.config === 'object') {
          Object.assign(cfg, next.config);
        }
      },
    },
  };
  return { App, calls, config: cfg };
}

test('seedMultiColorMode prefers actions.colors.setMultiMode and seeds default false meta', () => {
  const { App, calls } = makeApp({});
  seedMultiColorMode(App as never);
  assert.equal(calls.multi.length, 1);
  assert.deepEqual(calls.multi[0], {
    next: false,
    meta: {
      source: 'boot:defaultMultiColor',
      silent: true,
      noBuild: true,
      noAutosave: true,
      noPersist: true,
      noHistory: true,
      noCapture: true,
    },
  });
});

test('seedColorSwatchesOrder reads storage order and writes normalized swatches with restore meta', () => {
  const { App, calls } = makeApp({ colorSwatchesOrder: [] });
  seedColorSwatchesOrder(App as never);
  assert.equal(calls.colors.length, 1);
  assert.deepEqual(calls.colors[0], {
    order: ['oak', 'white'],
    meta: {
      source: 'core:initColorSwatchOrderSeed',
      noStorageWrite: true,
      silent: true,
      noBuild: true,
      noAutosave: true,
      noPersist: true,
      noHistory: true,
      noCapture: true,
    },
  });
});

test('installBootSeedsPart02 is idempotent and reuses the same boot bucket', () => {
  const { App } = makeApp({ colorSwatchesOrder: ['already'], isMultiColorMode: true });
  const boot1 = installBootSeedsPart02(App as never);
  const boot2 = installBootSeedsPart02(App as never);
  assert.equal(boot1, boot2);
  assert.equal((boot2 as any).bootSeedsPart02Installed, true);
});

test('installBootSeedsPart02 heals missing seeded config even when the old boot flag is already set', () => {
  const { App, config } = makeApp({});
  (App as any).__wpInternal = { boot: { bootSeedsPart02Installed: true } };

  const boot = installBootSeedsPart02(App as never);

  assert.equal((boot as any).bootSeedsPart02Installed, true);
  assert.equal(config.isMultiColorMode, false);
  assert.deepEqual(config.savedColors, []);
  assert.deepEqual(config.colorSwatchesOrder, ['oak', 'white']);
  assert.equal(config.wardrobeType, 'hinged');
  assert.equal(config.isManualWidth, false);
});
