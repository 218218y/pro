import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildResetDefaultProjectData,
  readResetDefaultProjectPayload,
  resetProjectToDefault,
  resetProjectToDefaultActionResult,
} from '../esm/native/services/project_reset_default.ts';

test('reset default payload canonicalizes top modules and clears disabled structural leftovers', () => {
  const App = {
    services: {
      projectIO: {
        buildDefaultProjectData: () => ({
          settings: {
            width: 200,
            stackSplitEnabled: true,
            doors: 5,
            structureSelection: '[2,2,1]',
            wardrobeType: 'hinged',
          },
          toggles: { cornerMode: true, removeDoors: true, sketchMode: true },
          modulesConfiguration: [
            { id: 'm1', layout: 'drawers', doors: '2', sketchExtras: { hover: true } },
            null,
            { id: 'm3', customData: { storage: true }, sketchExtras: { hover: true } },
          ],
          stackSplitLowerModulesConfiguration: [
            { id: 'm2', extDrawersCount: '3', sketchExtras: { hover: true } },
          ],
          cornerConfiguration: {
            modulesConfiguration: [{ id: 'corner' }],
            stackSplitLower: { modulesConfiguration: [{ id: 'corner-lower' }] },
          },
        }),
      },
    },
  } as any;

  const next = buildResetDefaultProjectData(App);
  assert.ok(next);
  assert.equal(next?.projectName, '');
  assert.equal(next?.toggles?.cornerMode, false);
  assert.equal(next?.toggles?.removeDoors, false);
  assert.equal(next?.toggles?.sketchMode, false);
  assert.equal(next?.settings?.stackSplitEnabled, false);
  assert.equal(next?.modulesConfiguration?.length, 3);
  assert.deepEqual(
    next?.modulesConfiguration?.map((entry: any) => entry.doors),
    [2, 2, 1]
  );
  assert.equal((next?.modulesConfiguration?.[0] as any)?.layout, 'drawers');
  assert.equal((next?.modulesConfiguration?.[2] as any)?.customData?.storage, true);
  assert.equal('sketchExtras' in ((next?.modulesConfiguration?.[0] as any) || {}), false);
  assert.deepEqual(next?.stackSplitLowerModulesConfiguration, []);
  assert.deepEqual(next?.cornerConfiguration, {
    modulesConfiguration: [],
    stackSplitLower: { modulesConfiguration: [] },
  });
});

test('reset default payload reader returns canonical payload/load opts and precise failures', () => {
  const App = {
    services: {
      projectIO: {
        buildDefaultProjectData: () => ({
          settings: {
            width: 120,
            stackSplitEnabled: true,
            doors: 5,
            structureSelection: '[2,2,1]',
            wardrobeType: 'hinged',
          },
          toggles: { cornerMode: true, sketchMode: true },
          modulesConfiguration: [{ id: 'm1', sketchExtras: { preview: true } }, null, { id: 'm3' }],
          stackSplitLowerModulesConfiguration: [{ id: 'lower', extDrawersCount: '2' }],
          cornerConfiguration: { modulesConfiguration: [{ id: 'corner' }] },
        }),
      },
    },
  } as any;

  const payload = readResetDefaultProjectPayload(App);
  assert.equal(payload.ok, true);
  if (payload.ok) {
    assert.equal(payload.data.projectName, '');
    assert.deepEqual(payload.data.settings, {
      width: 120,
      stackSplitEnabled: false,
      doors: 5,
      structureSelection: '[2,2,1]',
      wardrobeType: 'hinged',
    });
    assert.deepEqual(payload.data.toggles, { cornerMode: false, sketchMode: false, removeDoors: false });
    assert.deepEqual(
      payload.data.modulesConfiguration.map((entry: any) => entry.doors),
      [2, 2, 1]
    );
    assert.equal(payload.data.modulesConfiguration[0]?.id, 'm1');
    assert.equal(payload.data.modulesConfiguration[1]?.layout, 'shelves');
    assert.equal(payload.data.modulesConfiguration[2]?.id, 'm3');
    assert.deepEqual(payload.data.stackSplitLowerModulesConfiguration, []);
    assert.deepEqual(payload.data.cornerConfiguration, {
      modulesConfiguration: [],
      stackSplitLower: { modulesConfiguration: [] },
    });
    assert.deepEqual(payload.opts, {
      toast: false,
      toastMessage: 'הארון אופס לברירת המחדל',
      meta: { source: 'react:header:resetDefault' },
    });
  }

  assert.deepEqual(readResetDefaultProjectPayload({ services: {} } as any), {
    ok: false,
    reason: 'not-installed',
  });

  const invalidApp = {
    services: {
      projectIO: {
        buildDefaultProjectData: () => null,
      },
    },
  } as any;
  assert.deepEqual(readResetDefaultProjectPayload(invalidApp), { ok: false, reason: 'invalid' });

  const errorApp = {
    services: {
      projectIO: {
        buildDefaultProjectData() {
          throw new Error('default builder exploded');
        },
      },
    },
  } as any;
  assert.deepEqual(readResetDefaultProjectPayload(errorApp), {
    ok: false,
    reason: 'error',
    message: 'default builder exploded',
  });
});

test('reset default preserves healthy project branches when draft payload contains bigint/cycle junk', () => {
  const toxicDraft: any = {
    title: 'stable draft',
    nested: {
      keep: { text: 'still here' },
      toxicBigInt: 9n,
    },
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
  };
  toxicDraft.circular = toxicDraft;

  const App = {
    services: {
      projectIO: {
        buildDefaultProjectData: () => ({
          settings: {
            width: 120,
            stackSplitEnabled: true,
            doors: 5,
            structureSelection: '[2,2,1]',
            wardrobeType: 'hinged',
          },
          toggles: { cornerMode: true, sketchMode: true },
          modulesConfiguration: [{ id: 'm1' }, null, { id: 'm3' }],
          orderPdfEditorDraft: toxicDraft,
        }),
      },
    },
  } as any;

  const payload = readResetDefaultProjectPayload(App);
  assert.equal(payload.ok, true);
  if (!payload.ok) return;

  const draft = payload.data.orderPdfEditorDraft as any;
  assert.ok(draft);
  assert.notEqual(draft, toxicDraft);
  assert.equal(draft.title, 'stable draft');
  assert.equal(draft.nested?.keep?.text, 'still here');
  assert.equal('toxicBigInt' in (draft.nested || {}), false);
  assert.equal('circular' in draft, false);
  assert.equal(draft.createdAt, '2026-01-02T03:04:05.000Z');
  toxicDraft.nested.keep.text = 'mutated after clone';
  assert.equal(draft.nested?.keep?.text, 'still here');
});

test('reset default action result keeps canonical defaults but allows explicit load option overrides', () => {
  const calls: Array<{ data: any; opts: any }> = [];
  const App = {
    services: {
      projectIO: {
        buildDefaultProjectData: () => ({ settings: {}, toggles: {}, modulesConfiguration: [] }),
        loadProjectData(data: unknown, opts?: unknown) {
          calls.push({ data, opts });
          return { ok: true, restoreGen: 11 };
        },
      },
    },
  } as any;

  assert.deepEqual(
    resetProjectToDefaultActionResult(App, {
      toast: true,
      toastMessage: 'custom toast',
      meta: { source: 'custom.reset' },
    }),
    { ok: true, restoreGen: 11 }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts.toast, true);
  assert.equal(calls[0].opts.toastMessage, 'custom toast');
  assert.equal(calls[0].opts.meta.source, 'custom.reset');
});

test('reset default command routes the cleaned payload through canonical project io load semantics', () => {
  const calls: Array<{ data: any; opts: any }> = [];
  const App = {
    services: {
      projectIO: {
        buildDefaultProjectData: () => ({
          settings: {
            width: 120,
            stackSplitEnabled: true,
            doors: 5,
            structureSelection: '[2,2,1]',
            wardrobeType: 'hinged',
          },
          toggles: { cornerMode: true, sketchMode: true },
          modulesConfiguration: [{ id: 'm1', sketchExtras: { preview: true } }, null, { id: 'm3' }],
          stackSplitLowerModulesConfiguration: [{ id: 'lower', extDrawersCount: '2' }],
          cornerConfiguration: { modulesConfiguration: [{ id: 'corner' }] },
        }),
        loadProjectData: (data: unknown, opts?: unknown) => {
          calls.push({ data, opts });
          return { ok: true, restoreGen: 9 };
        },
      },
    },
  } as any;

  const result = resetProjectToDefault(App);
  assert.deepEqual(result, { ok: true, restoreGen: 9 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].data.toggles.cornerMode, false);
  assert.equal(calls[0].data.toggles.sketchMode, false);
  assert.deepEqual(
    calls[0].data.modulesConfiguration.map((entry: any) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(calls[0].data.modulesConfiguration[0]?.id, 'm1');
  assert.equal(calls[0].data.modulesConfiguration[2]?.id, 'm3');
  assert.deepEqual(calls[0].data.cornerConfiguration, {
    modulesConfiguration: [],
    stackSplitLower: { modulesConfiguration: [] },
  });
  assert.equal(calls[0].opts.toast, false);
  assert.equal(calls[0].opts.toastMessage, 'הארון אופס לברירת המחדל');
  assert.equal(calls[0].opts.meta.source, 'react:header:resetDefault');
});

test('reset default reports not-installed when project io default builder is unavailable', () => {
  assert.deepEqual(resetProjectToDefault({ services: {} } as any), { ok: false, reason: 'not-installed' });
});

test('reset default preserves builder/load failure causes instead of flattening them', () => {
  const buildFailApp = {
    services: {
      projectIO: {
        buildDefaultProjectData() {
          throw new Error('default builder exploded');
        },
      },
    },
  } as any;
  assert.deepEqual(resetProjectToDefault(buildFailApp), {
    ok: false,
    reason: 'error',
    message: 'default builder exploded',
  });

  const loadFailApp = {
    services: {
      projectIO: {
        buildDefaultProjectData: () => ({ settings: {}, toggles: {}, modulesConfiguration: [] }),
        loadProjectData() {
          throw new Error('default load exploded');
        },
      },
    },
  } as any;
  assert.deepEqual(resetProjectToDefault(loadFailApp), {
    ok: false,
    reason: 'error',
    message: 'default load exploded',
  });
});
