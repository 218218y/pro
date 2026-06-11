import test from 'node:test';
import assert from 'node:assert/strict';

import { getSiteVariant, isSite2Variant } from '../esm/native/services/site_variant.ts';

type AnyRecord = Record<string, unknown>;

function makeApp({
  pathname,
  search = '',
  metaVariant = null,
  config = {},
}: {
  pathname: string;
  search?: string;
  metaVariant?: string | null;
  config?: Record<string, unknown>;
}): AnyRecord {
  const meta = metaVariant
    ? {
        getAttribute(name: string) {
          return name === 'content' ? metaVariant : null;
        },
      }
    : null;
  const doc = {
    createElement() {
      return {};
    },
    querySelector(selector: string) {
      if (selector === 'meta[name="wp-site-variant"]') return meta;
      return null;
    },
  };
  const win = {
    document: doc,
    navigator: { userAgent: 'unit-test' },
    location: { pathname, search },
  };
  return {
    deps: {
      browser: {
        window: win,
        document: doc,
        location: win.location,
        navigator: win.navigator,
      },
    },
    store: {
      getState() {
        return { config, ui: {}, runtime: {}, mode: {}, meta: {} };
      },
    },
  };
}

test('site variant falls back to html meta for site2 builds', () => {
  const app = makeApp({ pathname: '/index_pro.html', metaVariant: 'site2', config: {} });
  assert.equal(getSiteVariant(app as any), 'site2');
  assert.equal(isSite2Variant(app as any), true);
});

test('site variant falls back to site2 pathname when config is missing', () => {
  const app = makeApp({ pathname: '/index_site2.html', config: {} });
  assert.equal(getSiteVariant(app as any), 'site2');
  assert.equal(isSite2Variant(app as any), true);
});
