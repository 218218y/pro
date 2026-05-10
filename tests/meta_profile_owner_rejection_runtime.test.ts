import test from 'node:test';
import assert from 'node:assert/strict';

import { metaMerge, metaUiOnly } from '../esm/native/runtime/meta_profiles_access.ts';

test('meta profile access reports installed owner rejection before using local canonical defaults', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    actions: {
      meta: {
        uiOnly() {
          throw new Error('installed meta uiOnly rejected');
        },
      },
    },
    services: {
      platform: {
        reportError(error: unknown, ctx: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  };

  const meta = metaUiOnly(App, { source: 'caller' }, 'react:ui');

  assert.equal(meta.noBuild, true);
  assert.equal(meta.noAutosave, true);
  assert.equal(meta.noPersist, true);
  assert.equal(meta.noHistory, true);
  assert.equal(meta.noCapture, true);
  assert.equal(meta.uiOnly, true);
  assert.equal(meta.source, 'caller');
  assert.equal(reports.length, 1);
  assert.match(
    String((reports[0].error as Error)?.message || reports[0].error),
    /installed meta uiOnly rejected/
  );
  assert.equal(reports[0].ctx.where, 'native/runtime/meta_profiles_access');
  assert.equal(reports[0].ctx.op, 'meta.react:ui.ownerRejected');
  assert.equal(reports[0].ctx.fatal, false);
});

test('meta merge reports installed owner rejection and preserves caller defaults locally', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    actions: {
      meta: {
        merge() {
          throw new Error('installed meta merge rejected');
        },
      },
    },
    platform: {
      reportError(error: unknown, ctx: unknown) {
        reports.push({ error, ctx });
      },
    },
  };

  const meta = metaMerge(App, { existing: true }, { noHistory: true }, 'save:commit');

  assert.equal(meta.existing, true);
  assert.equal(meta.noHistory, true);
  assert.equal(meta.source, 'save:commit');
  assert.equal(reports.length, 1);
  assert.match(
    String((reports[0].error as Error)?.message || reports[0].error),
    /installed meta merge rejected/
  );
  assert.equal(reports[0].ctx.where, 'native/runtime/meta_profiles_access');
  assert.equal(reports[0].ctx.op, 'meta.save:commit.ownerRejected');
  assert.equal(reports[0].ctx.fatal, false);
});
