import test from 'node:test';
import assert from 'node:assert/strict';

import { readMap, readSavedColors, writeMapKey, writeSplit } from '../esm/native/runtime/maps_access.ts';

type Report = { error: unknown; ctx: any };

function createReportingApp(maps: Record<string, unknown>): { App: any; reports: Report[] } {
  const reports: Report[] = [];
  return {
    reports,
    App: {
      maps,
      services: {
        platform: {
          reportError(error: unknown, ctx: unknown) {
            reports.push({ error, ctx });
          },
        },
      },
    },
  };
}

function messageOf(error: unknown): string {
  return String((error as Error)?.message || error || '');
}

test('maps access reports getMap owner rejection and still reads raw map fallback', () => {
  const { App, reports } = createReportingApp({
    handlesMap: { d1: 'bar' },
    getMap() {
      throw new Error('installed maps getMap rejected');
    },
  });

  const map = readMap(App, 'handlesMap');

  assert.deepEqual({ ...(map || {}) }, { d1: 'bar' });
  assert.equal(reports.length, 1);
  assert.match(messageOf(reports[0].error), /installed maps getMap rejected/);
  assert.equal(reports[0].ctx.where, 'native/runtime/maps_access');
  assert.equal(reports[0].ctx.op, 'maps_access.readMapFromBag.getMap');
  assert.equal(reports[0].ctx.fatal, false);
});

test('maps access reports setKey owner rejection and preserves local raw-map write recovery', () => {
  const { App, reports } = createReportingApp({
    handlesMap: {},
    setKey() {
      throw new Error('installed maps setKey rejected');
    },
  });

  assert.equal(writeMapKey(App, 'handlesMap', 'd2', 'knob'), true);

  assert.equal(App.maps.handlesMap.d2, 'knob');
  assert.equal(reports.length, 1);
  assert.match(messageOf(reports[0].error), /installed maps setKey rejected/);
  assert.equal(reports[0].ctx.where, 'native/runtime/maps_access');
  assert.equal(reports[0].ctx.op, 'maps_access.trySetKey');
  assert.equal(reports[0].ctx.fatal, false);
});

test('maps access reports canonical split owner rejection and repairs through the store-backed owner writer', () => {
  const state = {
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
    config: {
      splitDoorsMap: { d3: true },
    } as Record<string, unknown>,
  };
  const { App, reports } = createReportingApp({
    splitDoorsMap: { d3: true },
    setSplit() {
      throw new Error('installed maps setSplit rejected');
    },
  });
  App.actions = {
    config: {
      setMap(mapName: string, nextMap: Record<string, unknown>) {
        state.config[mapName] = { ...nextMap };
        return state.config[mapName];
      },
    },
  };
  App.store = {
    getState: () => state,
    patch: () => undefined,
  };

  assert.equal(writeSplit(App, 'd3_top', true, { source: 'test' }), true);

  assert.deepEqual(state.config.splitDoorsMap, { split_d3: true });
  assert.deepEqual(App.maps.splitDoorsMap, { d3: true });
  assert.equal(reports.length, 1);
  assert.match(messageOf(reports[0].error), /installed maps setSplit rejected/);
  assert.equal(reports[0].ctx.where, 'native/runtime/maps_access');
  assert.equal(reports[0].ctx.op, 'maps_access.writeSplit.ownerRejected');
  assert.equal(reports[0].ctx.fatal, false);
});

test('maps access reports saved-colors owner rejection instead of silently returning unavailable', () => {
  const { App, reports } = createReportingApp({
    getSavedColors() {
      throw new Error('installed maps getSavedColors rejected');
    },
  });

  assert.equal(readSavedColors(App), null);

  assert.equal(reports.length, 1);
  assert.match(messageOf(reports[0].error), /installed maps getSavedColors rejected/);
  assert.equal(reports[0].ctx.where, 'native/runtime/maps_access');
  assert.equal(reports[0].ctx.op, 'maps_access.readSavedColors.ownerRejected');
  assert.equal(reports[0].ctx.fatal, false);
});
