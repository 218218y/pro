import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomainApiSurfaceSections } from '../esm/native/kernel/domain_api_surface_sections.ts';

type MapPatchCall = {
  mapName: unknown;
  key: unknown;
  value: unknown;
  meta: unknown;
};

type ConfigSetCall = {
  mapName: unknown;
  nextMap: Record<string, unknown>;
  meta: unknown;
};

function createHarness(overrides?: {
  maps?: Record<string, Record<string, unknown>>;
  ui?: Record<string, unknown>;
  runtime?: Record<string, unknown>;
}) {
  const mapPatchCalls: MapPatchCall[] = [];
  const configSetCalls: ConfigSetCall[] = [];
  const env: { installVersion: number; maps: Record<string, Record<string, unknown>> } = {
    installVersion: 1,
    maps: {
      splitDoorsMap: { ...(overrides?.maps?.splitDoorsMap || {}) },
      splitDoorsBottomMap: { ...(overrides?.maps?.splitDoorsBottomMap || {}) },
      removedDoorsMap: { ...(overrides?.maps?.removedDoorsMap || {}) },
      groovesMap: { ...(overrides?.maps?.groovesMap || {}) },
      curtainMap: { ...(overrides?.maps?.curtainMap || {}) },
    },
  };

  const rootState = {
    ui: { ...(overrides?.ui || {}) },
    runtime: { ...(overrides?.runtime || {}) },
    mode: {},
    meta: {},
    config: env.maps,
  };

  const readMapRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};

  const setConfigMap = (mapName: unknown, nextMap: unknown, meta?: unknown) => {
    const cleanMapName = String(mapName || '');
    const cleanMap = readMapRecord(nextMap);
    if (cleanMapName) env.maps[cleanMapName] = cleanMap;
    configSetCalls.push({ mapName, nextMap: cleanMap, meta });
    return cleanMap;
  };

  const App: any = {
    actions: {
      config: {
        setMap: setConfigMap,
        patch(patch: Record<string, unknown>, meta?: unknown) {
          for (const [key, value] of Object.entries(patch || {})) {
            if (key === '__replace') continue;
            env.maps[key] = readMapRecord(value);
          }
          return { patch, meta };
        },
      },
    },
    store: {
      getState: () => rootState,
      patch(patch: Record<string, unknown>) {
        if (patch && typeof patch === 'object' && patch.config && typeof patch.config === 'object') {
          Object.assign(env.maps, patch.config);
        }
        Object.assign(rootState, patch || {});
        rootState.config = env.maps;
        return patch;
      },
    },
  };
  let select: any = {};
  let mapActions: any = {};
  let doorsActions: any = {};
  let drawersActions: any = {};
  let dividersActions: any = {};
  let viewActions: any = {};
  let flagsActions: any = {};
  let texturesActions: any = {};
  let groovesActions: any = {};
  let curtainsActions: any = {};

  const install = () =>
    installDomainApiSurfaceSections({
      App,
      select,
      mapActions,
      doorsActions,
      drawersActions,
      dividersActions,
      viewActions,
      flagsActions,
      texturesActions,
      groovesActions,
      curtainsActions,
      _cfg: () => rootState.config as any,
      _ui: () => rootState.ui as any,
      _rt: () => rootState.runtime as any,
      _meta: (meta, source) => ({ ...(meta || {}), installVersion: env.installVersion, source }),
      _map: mapName => ({ ...(env.maps[String(mapName)] || {}) }),
      _num: value => (typeof value === 'number' ? value : null),
      _cfgMapPatch: (mapName, key, value, meta) => {
        const cleanMapName = String(mapName || '');
        const cleanKey = String(key || '');
        if (cleanMapName && cleanKey) {
          const nextMap = { ...(env.maps[cleanMapName] || {}) };
          if (value == null) delete nextMap[cleanKey];
          else nextMap[cleanKey] = value;
          env.maps[cleanMapName] = nextMap;
        }
        mapPatchCalls.push({ mapName, key, value, meta });
        return { ok: true };
      },
    });

  const replacePublicRoots = () => {
    select = {};
    mapActions = {};
    doorsActions = {};
    drawersActions = {};
    dividersActions = {};
    viewActions = {};
    flagsActions = {};
    texturesActions = {};
    groovesActions = {};
    curtainsActions = {};
  };

  install();

  return {
    App,
    get select() {
      return select;
    },
    get mapActions() {
      return mapActions;
    },
    get doorsActions() {
      return doorsActions;
    },
    get drawersActions() {
      return drawersActions;
    },
    get dividersActions() {
      return dividersActions;
    },
    get viewActions() {
      return viewActions;
    },
    get flagsActions() {
      return flagsActions;
    },
    get texturesActions() {
      return texturesActions;
    },
    get groovesActions() {
      return groovesActions;
    },
    get curtainsActions() {
      return curtainsActions;
    },
    env,
    mapPatchCalls,
    configSetCalls,
    install,
    replacePublicRoots,
  };
}

test('domain api surface sections ignore legacy unprefixed aliases for prefixed split and groove maps', () => {
  const h = createHarness({
    maps: {
      splitDoorsMap: { d2: false },
      splitDoorsBottomMap: { d3: true },
      groovesMap: { d4_full: true },
    },
  });

  assert.equal(h.select.doors.isSplit('split_d2'), true);
  assert.equal(h.select.doors.isSplitBottom('splitb_d3'), false);
  assert.equal(h.select.grooves.isOn('groove_d4_full'), false);
});

test('domain api surface sections read prefixed split and groove map semantics with sane defaults', () => {
  const h = createHarness({
    maps: {
      splitDoorsMap: { split_d1: false, d2: false },
      splitDoorsBottomMap: { splitb_d3: true, d4: true },
      removedDoorsMap: { removed_d6_full: true, removed_d7_top: true },
      groovesMap: { groove_d5_full: true },
      curtainMap: { d6_full: '', d7_full: 'linen' },
    },
  });

  assert.equal(h.select.doors.isSplit('d1'), false);
  assert.equal(h.select.doors.isSplit('d2'), true);
  assert.equal(h.select.doors.isSplit('missing'), true);

  assert.equal(h.select.doors.isSplitBottom('d3'), true);
  assert.equal(h.select.doors.isSplitBottom('d4'), false);
  assert.equal(h.select.doors.isSplitBottom('missing'), false);

  assert.equal(h.select.grooves.isOn('d5_full'), true);
  assert.equal(h.select.grooves.isOn('missing'), false);

  assert.equal(h.select.doors.isRemoved('d6'), true);
  assert.equal(h.select.doors.isRemoved('d7_top'), true);
  assert.equal(h.select.doors.isRemoved('d7_bot'), false);

  assert.equal(h.select.curtains.get('d6_full'), 'none');
  assert.equal(h.select.curtains.get('d7_full'), 'linen');
  assert.equal(h.select.curtains.get('missing'), 'none');
});

test('domain api surface sections door count ignores top-level-only UI door aliases', () => {
  const h = createHarness({
    ui: { doors: 9, raw: {} },
    runtime: { wardrobeDoorsCount: 3 },
  });

  assert.equal(h.select.doors.count(), 3);
});

test('domain api surface sections writes normalize prefixed map keys exactly once and suppress semantic no-op defaults', () => {
  const h = createHarness();

  h.doorsActions.setSplit('d8_top', true, { source: 'test:split' });
  h.doorsActions.setSplitBottom('splitb_d9_bot', false, { source: 'test:split-bottom:no-op-default' });
  h.groovesActions.set('d10_full', true, { source: 'test:groove:set' });

  assert.deepEqual({ ...h.env.maps.splitDoorsMap }, { split_d8: true });
  assert.deepEqual({ ...h.env.maps.splitDoorsBottomMap }, {});
  assert.deepEqual({ ...h.env.maps.groovesMap }, { groove_d10_full: true });
});

test('domain api surface sections writes canonical prefixed ids without legacy alias cleanup', () => {
  const h = createHarness();

  h.doorsActions.setSplit('split_d11', true, { source: 'test:split:canonical-clear' });
  h.doorsActions.setSplitBottom('splitb_d12', true, { source: 'test:split-bottom:canonical-clear' });
  h.groovesActions.set('groove_d13_full', true, { source: 'test:groove:canonical-clear' });

  assert.deepEqual({ ...h.env.maps.splitDoorsMap }, { split_d11: true });
  assert.deepEqual({ ...h.env.maps.splitDoorsBottomMap }, { splitb_d12: true });
  assert.deepEqual({ ...h.env.maps.groovesMap }, { groove_d13_full: true });
});

test('domain api surface sections store-backed writes replace legacy groove aliases with the canonical key only', () => {
  const h = createHarness({
    maps: {
      groovesMap: { d14_full: true },
    },
  });

  h.groovesActions.set('groove_d14_full', true, { source: 'test:groove:direct-clear' });

  assert.deepEqual(
    { ...h.env.maps.groovesMap },
    {
      groove_d14_full: true,
    }
  );
});

test('domain api surface sections divider toggle falls back to canonical cfg map patch when maps.toggleDivider is unavailable', () => {
  const h = createHarness();
  h.env.maps.drawerDividersMap = { divider_a: true } as any;

  h.dividersActions.toggle('divider_a', { source: 'test:dividers:toggle:off' });
  h.dividersActions.toggle('divider_b', { source: 'test:dividers:toggle:on' });

  assert.deepEqual(
    h.mapPatchCalls.map(({ mapName, key, value }) => ({ mapName, key, value })),
    [
      { mapName: 'drawerDividersMap', key: 'divider_a', value: null },
      { mapName: 'drawerDividersMap', key: 'divider_b', value: true },
    ]
  );
});

test('domain api surface sections generic map fallback writers normalize keys once across map and curtain actions', () => {
  const h = createHarness();

  h.mapActions.setKey('curtainMap', 42, 'linen', { source: 'test:map:setKey:number' });
  h.curtainsActions.set(7, 'sheer', { source: 'test:curtains:set:number' });

  assert.deepEqual(
    h.mapPatchCalls.map(({ mapName, key, value }) => ({ mapName, key, value })),
    [
      { mapName: 'curtainMap', key: '42', value: 'linen' },
      { mapName: 'curtainMap', key: '7', value: 'sheer' },
    ]
  );
});

test('domain api surface sections generic map writers reject visual maps and keep simple maps writable', () => {
  const h = createHarness();

  assert.throws(
    () => h.mapActions.setKey('removedDoorsMap', 'removed_d1_full', true, { source: 'test:generic:removed' }),
    /writeSimpleMapValue cannot write visual\/keyed map "removedDoorsMap"/
  );
  assert.throws(
    () => h.mapActions.setKey('splitDoorsMap', 'split_d1', true, { source: 'test:generic:split' }),
    /writeSimpleMapValue cannot write visual\/keyed map "splitDoorsMap"/
  );
  assert.throws(
    () =>
      h.mapActions.setKey('splitDoorsBottomMap', 'splitb_d1', true, { source: 'test:generic:split-bottom' }),
    /writeSimpleMapValue cannot write visual\/keyed map "splitDoorsBottomMap"/
  );
  assert.throws(
    () => h.mapActions.setKey('unknownMap', 'd1', true, { source: 'test:generic:unknown' }),
    /writeSimpleMapValue cannot write map "unknownMap"; use a semantic writer or SIMPLE_WRITABLE_MAP_NAMES/
  );

  h.mapActions.setKey('hingeMap', 'd1', 'left', { source: 'test:generic:hinge' });
  h.mapActions.setKey('handlesMap', 'd1', 'bar', { source: 'test:generic:handle' });

  assert.deepEqual(
    h.mapPatchCalls.map(({ mapName, key, value }) => ({ mapName, key, value })),
    [
      { mapName: 'hingeMap', key: 'd1', value: 'left' },
      { mapName: 'handlesMap', key: 'd1', value: 'bar' },
    ]
  );
  assert.deepEqual({ ...h.env.maps.removedDoorsMap }, {});
  assert.deepEqual({ ...h.env.maps.splitDoorsMap }, {});
  assert.deepEqual({ ...h.env.maps.splitDoorsBottomMap }, {});
});

test('domain api surface sections writes canonical split ids and removed door keys only', () => {
  const h = createHarness();

  h.doorsActions.setSplit('d11', true, { source: 'test:split:legacy-clear' });
  h.doorsActions.setRemoved('d12', true, { source: 'test:removed:base-id' });

  assert.deepEqual({ ...h.env.maps.splitDoorsMap }, { split_d11: true });
  assert.deepEqual({ ...h.env.maps.removedDoorsMap }, { removed_d12_full: true });
});

test('domain api surface sections route visual door writes through semantic owner writers only', () => {
  const h = createHarness();

  h.doorsActions.setRemoved('d41', true, { source: 'test:semantic:removed' });
  h.doorsActions.setSplit('d42_top', true, { source: 'test:semantic:split' });
  h.doorsActions.setSplitBottom('splitb_d43_bot', true, { source: 'test:semantic:split-bottom' });

  assert.deepEqual(h.mapPatchCalls, []);
  assert.deepEqual(
    h.configSetCalls.map(({ mapName, nextMap }) => ({ mapName, nextMap })),
    [
      { mapName: 'removedDoorsMap', nextMap: { removed_d41_full: true } },
      { mapName: 'splitDoorsMap', nextMap: { split_d42: true } },
      { mapName: 'splitDoorsBottomMap', nextMap: { splitb_d43: true } },
    ]
  );
});

test('domain api surface sections heal missing action/select methods without replacing intact refs', () => {
  const h = createHarness();

  const setKeyRef = h.mapActions.setKey;
  const setOpenRef = h.doorsActions.setOpen;
  const countRef = h.select.doors.count;
  const curtainsGetRef = h.select.curtains.get;

  delete h.doorsActions.setSplit;
  delete h.groovesActions.toggle;
  delete h.select.grooves.hasAny;
  delete h.select.textures.customUploadedDataURL;

  h.install();

  assert.equal(h.mapActions.setKey, setKeyRef);
  assert.equal(h.doorsActions.setOpen, setOpenRef);
  assert.equal(h.select.doors.count, countRef);
  assert.equal(h.select.curtains.get, curtainsGetRef);

  assert.equal(typeof h.doorsActions.setSplit, 'function');
  assert.equal(typeof h.groovesActions.toggle, 'function');
  assert.equal(typeof h.select.grooves.hasAny, 'function');
  assert.equal(typeof h.select.textures.customUploadedDataURL, 'function');
});

test('domain api surface sections reinstall heals drifted public slots and keeps live behavior on refreshed state', () => {
  const h = createHarness({
    maps: {
      splitDoorsMap: { split_d20: true },
    },
  });

  const splitRef = h.doorsActions.setSplit;
  const isSplitRef = h.select.doors.isSplit;

  assert.equal(h.select.doors.isSplit('d20'), true);

  h.doorsActions.setSplit = (() => 'stale:setSplit') as any;
  h.select.doors.isSplit = (() => false) as any;

  h.env.installVersion = 2;
  h.env.maps.splitDoorsMap = { split_d21: false };
  h.install();

  assert.equal(h.doorsActions.setSplit, splitRef);
  assert.equal(h.select.doors.isSplit, isSplitRef);
  assert.equal(h.select.doors.isSplit('d21'), false);

  h.doorsActions.setSplit('d22', true, { source: 'test:split:healed' });
  assert.deepEqual(h.mapPatchCalls, []);
  assert.deepEqual(h.configSetCalls.slice(-1), [
    {
      mapName: 'splitDoorsMap',
      nextMap: { split_d21: false, split_d22: true },
      meta: { source: 'actions:doors:setSplit', installVersion: 2 },
    },
  ]);
});

test('domain api surface sections keep canonical public roots alive across root replacement', () => {
  const h = createHarness({
    maps: {
      splitDoorsMap: { split_d30: true },
    },
  });

  const staleSelectRoot = h.select;
  const staleDoorsSelect = h.select.doors;
  const staleMapActions = h.mapActions;
  const staleDoorsActions = h.doorsActions;

  delete staleSelectRoot.map;
  delete staleDoorsSelect.isSplit;
  delete staleDoorsActions.setSplit;

  h.replacePublicRoots();
  h.env.installVersion = 2;
  h.env.maps.splitDoorsMap = { split_d31: false };
  h.install();

  assert.notEqual(h.select, staleSelectRoot);
  assert.notEqual(h.mapActions, staleMapActions);
  assert.notEqual(h.doorsActions, staleDoorsActions);

  assert.equal(h.select.doors, staleDoorsSelect);
  assert.equal(h.select.map, staleSelectRoot.map);
  assert.equal(h.App.actions.map, staleMapActions);
  assert.equal(h.App.actions.doors, staleDoorsActions);
  assert.equal(h.App.actions.doors.setSplit, staleDoorsActions.setSplit);
  assert.equal(typeof h.doorsActions.setSplit, 'undefined');
  assert.equal(typeof staleSelectRoot.map, 'function');
  assert.equal(typeof staleDoorsSelect.isSplit, 'function');
  assert.equal(typeof staleDoorsActions.setSplit, 'function');
  assert.equal(h.select.doors.isSplit('d31'), false);

  staleDoorsActions.setSplit('d32', true, { source: 'test:split:stale-root-reused' });
  assert.deepEqual(h.mapPatchCalls, []);
  assert.deepEqual(h.configSetCalls.slice(-1), [
    {
      mapName: 'splitDoorsMap',
      nextMap: { split_d31: false, split_d32: true },
      meta: { source: 'actions:doors:setSplit', installVersion: 2 },
    },
  ]);
});

test('domain api surface sections runtime door and drawer actions require the canonical runtime patch action', () => {
  const runtimePatches: Array<{ patch: Record<string, unknown>; meta: Record<string, unknown> }> = [];
  const h = createHarness();
  h.App.actions.runtime = {
    patch(payload: Record<string, unknown>, meta?: Record<string, unknown>) {
      runtimePatches.push({ patch: payload, meta: meta || {} });
      return { ok: true };
    },
  };

  const now = Date.now;
  Date.now = () => 4242;
  try {
    h.doorsActions.setOpen(true, { source: 'test:doors:setOpen' });
    h.drawersActions.setOpenId('drawer-7', { source: 'test:drawers:setOpenId' });
  } finally {
    Date.now = now;
  }

  assert.deepEqual(runtimePatches, [
    {
      patch: { doorsOpen: true, doorsLastToggleTime: 4242 },
      meta: {
        source: 'actions:doors:setOpen',
        installVersion: 1,
        noBuild: true,
        noAutosave: true,
        noPersist: true,
        noHistory: true,
        noCapture: true,
      },
    },
    {
      patch: { drawersOpenId: 'drawer-7' },
      meta: {
        source: 'actions:drawers:setOpenId',
        installVersion: 1,
        noBuild: true,
        noAutosave: true,
        noPersist: true,
        noHistory: true,
        noCapture: true,
      },
    },
  ]);
});

test('domain api surface sections semantic no-op map writes stay silent when the effective canonical value is unchanged', () => {
  const h = createHarness({
    maps: {
      groovesMap: { groove_d90_full: true },
      curtainMap: { d91_full: 'linen' },
    },
  });

  h.groovesActions.set('groove_d90_full', true, { source: 'test:groove:no-op' });
  h.curtainsActions.set('d91_full', 'linen', { source: 'test:curtain:no-op' });

  assert.deepEqual({ ...h.env.maps.groovesMap }, { groove_d90_full: true });
  assert.deepEqual({ ...h.env.maps.curtainMap }, { d91_full: 'linen' });
  assert.deepEqual(h.mapPatchCalls, []);
  assert.deepEqual(h.configSetCalls, []);
});

test('domain api surface sections no-op suppression ignores legacy aliases when canonical values already match', () => {
  const h = createHarness({
    maps: {
      splitDoorsMap: { split_d92: true, d92: true },
    },
  });

  h.doorsActions.setSplit('d92', true, { source: 'test:split:no-op-alias-clear' });

  assert.deepEqual(
    { ...h.env.maps.splitDoorsMap },
    {
      split_d92: true,
      d92: true,
    }
  );
  assert.deepEqual(h.mapPatchCalls, []);
  assert.deepEqual(h.configSetCalls, []);
});
