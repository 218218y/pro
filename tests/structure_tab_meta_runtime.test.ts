import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStructureTabNoBuildImmediateMeta,
  createStructureTabNoBuildNoHistoryImmediateMeta,
  createStructureTabNoBuildNoHistoryMeta,
  createStructureTabRecomputeWriteMeta,
  createStructureTabStructuralCommitMeta,
  createStructureTabUiOnlyImmediateMeta,
  withImmediate,
} from '../esm/native/ui/react/tabs/structure_tab_meta.ts';

type MetaInput = Record<string, unknown> | undefined;

function createMeta() {
  return {
    uiOnlyImmediate(source?: string) {
      return { source, immediate: true, uiOnly: true, noBuild: true };
    },
    noBuild(meta?: MetaInput, source?: string) {
      return { ...(meta || {}), source, noBuild: true };
    },
    noHistory(meta?: MetaInput, source?: string) {
      return { ...(meta || {}), source, noHistory: true };
    },
    noBuildImmediate(source?: string) {
      return { source, immediate: true, noBuild: true, via: 'noBuildImmediate' };
    },
    noHistoryImmediate(source?: string) {
      return { source, immediate: true, noHistory: true, via: 'noHistoryImmediate' };
    },
  };
}

test('[structure-tab-meta] recompute write meta is normalized and preserves caller flags', () => {
  assert.deepEqual(createStructureTabRecomputeWriteMeta(' react:structure:test ', { noHistory: true }), {
    noHistory: true,
    source: 'react:structure:test',
    immediate: true,
    noBuild: true,
  });

  assert.deepEqual(withImmediate({ source: 'react:test', noBuild: true }), {
    source: 'react:test',
    noBuild: true,
    immediate: true,
  });
});

test('[structure-tab-meta] no-build helpers prefer profile methods but keep canonical fallbacks', () => {
  const meta = createMeta();
  assert.deepEqual(createStructureTabNoBuildImmediateMeta(meta, ' react:structure:doors '), {
    source: 'react:structure:doors',
    immediate: true,
    noBuild: true,
    via: 'noBuildImmediate',
  });

  const fallbackMeta = {
    uiOnlyImmediate: meta.uiOnlyImmediate,
    noBuild: meta.noBuild,
    noHistory: meta.noHistory,
    noHistoryImmediate: meta.noHistoryImmediate,
  };
  assert.deepEqual(createStructureTabNoBuildImmediateMeta(fallbackMeta, ' react:structure:fallback '), {
    immediate: true,
    source: 'react:structure:fallback',
    noBuild: true,
  });

  assert.deepEqual(
    createStructureTabNoBuildImmediateMeta(
      {
        ...fallbackMeta,
        noBuildImmediate: () => ({ source: 'stale', noBuild: true }),
      },
      ' react:structure:normalized '
    ),
    {
      source: 'react:structure:normalized',
      immediate: true,
      noBuild: true,
    }
  );
});

test('[structure-tab-meta] no-build no-history profiles keep immediate writes explicit', () => {
  const meta = createMeta();

  assert.deepEqual(createStructureTabNoBuildNoHistoryMeta(meta, ' react:structure:manualWidth '), {
    source: 'react:structure:manualWidth',
    noHistory: true,
    noBuild: true,
  });

  assert.deepEqual(createStructureTabNoBuildNoHistoryImmediateMeta(meta, ' react:structure:width:auto '), {
    source: 'react:structure:width:auto',
    immediate: true,
    noHistory: true,
    via: 'noHistoryImmediate',
    noBuild: true,
  });

  const fallbackMeta = {
    uiOnlyImmediate: meta.uiOnlyImmediate,
    noBuild: meta.noBuild,
    noHistory: meta.noHistory,
    noBuildImmediate: meta.noBuildImmediate,
  };
  assert.deepEqual(
    createStructureTabNoBuildNoHistoryImmediateMeta(fallbackMeta, ' react:structure:width:fallback '),
    {
      immediate: true,
      source: 'react:structure:width:fallback',
      noHistory: true,
      noBuild: true,
    }
  );
});

test('[structure-tab-meta] ui-only and structural commit profiles choose the intended build policy', () => {
  const meta = createMeta();

  assert.deepEqual(createStructureTabUiOnlyImmediateMeta(meta, ' react:structure:cellDimsWidth:clear '), {
    source: 'react:structure:cellDimsWidth:clear',
    immediate: true,
    uiOnly: true,
    noBuild: true,
  });

  assert.deepEqual(createStructureTabStructuralCommitMeta(meta, ' react:structure:soft ', { uiOnly: true }), {
    source: 'react:structure:soft',
    immediate: true,
    uiOnly: true,
    noBuild: true,
  });

  assert.deepEqual(createStructureTabStructuralCommitMeta(meta, ' react:structure:write '), {
    source: 'react:structure:write',
    immediate: true,
    noBuild: true,
    via: 'noBuildImmediate',
  });
});

test('[structure-tab-meta] structure meta profiles fail fast without a source', () => {
  const meta = createMeta();
  assert.throws(
    () => createStructureTabRecomputeWriteMeta('  '),
    /Structure Tab recompute-write meta requires a source/
  );
  assert.throws(
    () => createStructureTabNoBuildImmediateMeta(meta, ''),
    /Structure Tab no-build immediate meta requires a source/
  );
});
