import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRestUrl,
  getRoomFromUrl,
  isExplicitSite2Bundle,
  makeHeaders,
  readCfg,
  setRoomInUrl,
} from '../esm/native/services/cloud_sync_config.ts';

type AnyRecord = Record<string, unknown>;

function makeApp({
  href = 'https://example.com/index_site2.html?room=private%3A%3Aabc#viewer',
  pathname = '/index_site2.html',
  search = '?room=private%3A%3Aabc',
  config = {},
  supabaseCloudSync = {},
}: {
  href?: string;
  pathname?: string;
  search?: string;
  config?: Record<string, unknown>;
  supabaseCloudSync?: Record<string, unknown>;
} = {}): AnyRecord {
  const location = { href, pathname, search };
  const doc = {
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  };
  return {
    deps: {
      config: { supabaseCloudSync },
      browser: {
        window: { location, document: doc, navigator: { userAgent: 'unit-test' } },
        document: doc,
        location,
        navigator: { userAgent: 'unit-test' },
      },
    },
    store: {
      getState() {
        return { config, ui: {}, runtime: {}, mode: {}, meta: {} };
      },
    },
  };
}

test('readCfg normalizes deps config and clamps site2 sketch max age', () => {
  const App = makeApp({
    supabaseCloudSync: {
      url: 'https://db.example.com/',
      anonKey: 'anon-key',
      table: 'room state',
      publicRoom: 'public::room',
      privateRoom: 'private::room',
      roomParam: 'shared',
      pollMs: 3333,
      shareBaseUrl: 'https://share.example.com/app/',
      realtime: 'off',
      realtimeMode: 'postgres_changes',
      realtimeChannelPrefix: 'custom_prefix',
      site2SketchInitialAutoLoad: 'yes',
      site2SketchInitialMaxAgeHours: 999,
      diagnostics: '1',
    },
  });

  const cfg = readCfg(App as any);
  assert.deepEqual(cfg, {
    url: 'https://db.example.com/',
    anonKey: 'anon-key',
    table: 'room state',
    publicRoom: 'public::room',
    privateRoom: 'private::room',
    roomParam: 'shared',
    pollMs: 3333,
    shareBaseUrl: 'https://share.example.com/app/',
    realtime: false,
    realtimeMode: 'broadcast',
    realtimeChannelPrefix: 'custom_prefix',
    site2SketchInitialAutoLoad: true,
    site2SketchInitialMaxAgeHours: 168,
    diagnostics: true,
  });
});

test('cloud sync config browser helpers keep URL params and site2 detection canonical', () => {
  const App = makeApp();
  assert.equal(getRoomFromUrl(App as any, 'room'), 'private::abc');
  setRoomInUrl(App as any, 'room', 'shared-room');
  assert.equal(
    (App.deps as AnyRecord).browser.location.href,
    'https://example.com/index_site2.html?room=shared-room#viewer'
  );
  setRoomInUrl(App as any, 'room', null);
  assert.equal((App.deps as AnyRecord).browser.location.href, 'https://example.com/index_site2.html#viewer');
  assert.equal(isExplicitSite2Bundle(App as any), true);
});

test('cloud sync config shared helpers keep rest URL and headers canonical', () => {
  assert.equal(
    buildRestUrl('https://db.example.com///', 'room state'),
    'https://db.example.com/rest/v1/room%20state'
  );
  assert.deepEqual(makeHeaders('anon-key'), {
    apikey: 'anon-key',
    Authorization: 'Bearer anon-key',
    'Content-Type': 'application/json',
  });
});
