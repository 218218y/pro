import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStructureRecomputeOpts,
  getModeConst,
  getModelsService,
  structureTabReportNonFatal,
  updateEditStateToast,
} from '../esm/native/ui/react/tabs/structure_tab_shared.ts';

test('structure-tab shared readers preserve runtime seams without bag casts', () => {
  const seen: unknown[] = [];
  const modelsRoot = {
    getAll() {
      seen.push(['getAll', this]);
      return [{ id: 'm1', name: 'One' }];
    },
    onChange(fn: (models: unknown[]) => void) {
      seen.push(['onChange', this]);
      fn([{ id: 'm2', name: 'Two' }]);
    },
    offChange(fn: (models: unknown[]) => void) {
      seen.push(['offChange', this, typeof fn]);
    },
  };

  const app = {
    modes: { hinge: 'hinge-mode' },
    services: {
      models: modelsRoot,
      uiFeedback: {
        calls: [] as unknown[],
        updateEditStateToast(this: { calls: unknown[] }, message: string | null, sticky: boolean) {
          this.calls.push([message, sticky]);
          return true;
        },
      },
    },
  };

  const svc = getModelsService(app);
  assert.equal(getModeConst(app, 'hinge', 'fallback'), 'hinge-mode');
  assert.equal(getModeConst({}, 'hinge', 'fallback'), 'fallback');
  assert.deepEqual(svc.getAll(), [{ id: 'm1', name: 'One' }]);

  const unsub = svc.onChange(() => undefined);
  assert.equal(typeof unsub, 'function');
  unsub?.();

  assert.equal(updateEditStateToast(app, 'hello', true), true);
  assert.deepEqual(app.services.uiFeedback.calls, [['hello', true]]);

  assert.deepEqual(createStructureRecomputeOpts(), {
    structureChanged: true,
    preserveTemplate: true,
    anchorSide: 'left',
  });

  assert.deepEqual(seen.slice(1), [
    ['onChange', modelsRoot],
    ['offChange', modelsRoot, 'function'],
  ]);
  assert.equal(Array.isArray(seen[0]), true);
  assert.equal(seen[0]?.[0], 'getAll');
});

test('structure-tab shared non-fatal reporter dedupes normalized errors without flattening messages', () => {
  const originalError = console.error;
  const seen: unknown[][] = [];
  try {
    console.error = ((...args: unknown[]) => {
      seen.push(args);
    }) as typeof console.error;

    structureTabReportNonFatal('hinge', 'raw string failure', 10_000);
    structureTabReportNonFatal('hinge', new Error('raw string failure'), 10_000);
    structureTabReportNonFatal('hinge', { message: 'object failure', name: 'WeirdError' }, 10_000);

    assert.equal(seen.length, 2);
    assert.equal(String(seen[0]?.[0] || ''), '[WardrobePro][StructureTab] hinge');
    assert.equal(String((seen[0] || [])[1] || ''), 'raw string failure');
    assert.equal((seen[1] || [])[1]?.message, 'object failure');
  } finally {
    console.error = originalError;
  }
});
