import assert from 'node:assert/strict';
import test from 'node:test';

import { loadRuntimeConfigModule } from '../esm/entry_pro_main_boot_support.ts';

function createVariantDocument(variant: 'main' | 'site2'): Document {
  return {
    querySelector(selector: string) {
      if (selector === 'meta[name="wp-site-variant"]') {
        return { getAttribute: () => variant };
      }
      if (selector === 'meta[name="wp-site2-enabled-tabs"]' && variant === 'site2') {
        return { getAttribute: () => 'structure,design,interior,sketch,settings' };
      }
      return null;
    },
  } as unknown as Document;
}

test('root runtime config applies the generated main overlay explicitly', async () => {
  const result = await loadRuntimeConfigModule(createVariantDocument('main'));

  assert.equal(result.config?.siteVariant, 'main');
  assert.equal(result.config?.supabaseCloudSync?.showRoomWidget, true);
});

test('root runtime config applies the generated site2 overlay without main leakage', async () => {
  const result = await loadRuntimeConfigModule(createVariantDocument('site2'));

  assert.equal(result.config?.siteVariant, 'site2');
  assert.equal(result.config?.supabaseCloudSync?.showRoomWidget, false);
  assert.deepEqual(result.config?.site2EnabledTabs, [
    'structure',
    'design',
    'interior',
    'sketch',
    'settings',
  ]);
});
