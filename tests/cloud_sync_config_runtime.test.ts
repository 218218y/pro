import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGatewayUrl,
  getRoomFromUrl,
  isExplicitSite2Bundle,
  makeHeaders,
  readCfg,
  removeRoomTokenFromUrl,
  setRoomCredentialInUrl,
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
  const history = {
    state: { test: true },
    replaceState(state: unknown, _title: string, nextHref: string) {
      history.state = state as { test: boolean };
      location.href = String(nextHref);
      location.search = new URL(location.href).search;
    },
  };
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
        window: { location, history, document: doc, navigator: { userAgent: 'unit-test' } },
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
      storeId: 'bargig',
      gatewayFunction: 'room gateway',
      publicRoom: 'public::room',
      roomParam: 'shared',
      roomTokenParam: 'access',
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
    storeId: 'bargig',
    gatewayFunction: 'room gateway',
    publicRoom: 'public::room',
    roomParam: 'shared',
    roomTokenParam: 'access',
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
  setRoomCredentialInUrl(App as any, {
    roomParam: 'room',
    room: 'private-room',
    roomTokenParam: 'roomToken',
    roomToken: 'signed.token.value',
  });
  assert.equal(
    (App.deps as AnyRecord).browser.location.href,
    'https://example.com/index_site2.html?room=private-room&roomToken=signed.token.value#viewer'
  );
  assert.equal(removeRoomTokenFromUrl(App as any, 'roomToken'), true);
  assert.equal(
    (App.deps as AnyRecord).browser.location.href,
    'https://example.com/index_site2.html?room=private-room#viewer'
  );
  assert.equal(isExplicitSite2Bundle(App as any), true);
});

test('cloud sync config shared helpers keep gateway URL and headers canonical', () => {
  assert.equal(
    buildGatewayUrl('https://db.example.com///', 'room gateway'),
    'https://db.example.com/functions/v1/room%20gateway'
  );
  assert.deepEqual(makeHeaders('anon-key'), {
    apikey: 'anon-key',
    Authorization: 'Bearer anon-key',
    'Content-Type': 'application/json',
  });
});
