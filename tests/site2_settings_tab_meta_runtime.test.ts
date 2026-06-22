import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseSite2EnabledTabs } from '../esm/entry_pro_main_shared.js';
import { buildRuntimeConfig } from '../esm/entry_pro_main_boot_support.js';

function makeDoc(metaContent: string): Document {
  return {
    querySelector(selector: string) {
      if (selector === 'meta[name="wp-site-variant"]') {
        return { getAttribute: () => 'site2' };
      }
      if (selector === 'meta[name="wp-site2-enabled-tabs"]') {
        return { getAttribute: () => metaContent };
      }
      return null;
    },
  } as unknown as Document;
}

function readSite2EnabledTabsMetaFromHtml(html: string): string {
  const match = html.match(/<meta\s+name=["']wp-site2-enabled-tabs["']\s+content=["']([^"']+)["']/i);
  assert.ok(match, 'index_site2.html must expose wp-site2-enabled-tabs meta');
  return match[1];
}

test('site2 meta parser accepts settings tab and ignores legacy export tab name', () => {
  assert.deepEqual(parseSite2EnabledTabs('structure,design,interior,sketch,settings'), [
    'structure',
    'design',
    'interior',
    'sketch',
    'settings',
  ]);

  assert.deepEqual(parseSite2EnabledTabs('export,settings,SETTINGS'), ['settings']);
});

test('site2 runtime config keeps settings enabled from index_site2 meta', () => {
  const metaContent = readSite2EnabledTabsMetaFromHtml(readFileSync('index_site2.html', 'utf8'));
  const cfg = buildRuntimeConfig(makeDoc(metaContent), { config: null, flags: null });

  assert.equal(cfg.siteVariant, 'site2');
  assert.deepEqual(cfg.site2EnabledTabs, ['structure', 'design', 'interior', 'sketch', 'settings']);
});
