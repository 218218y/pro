import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteSavedColor,
  readTextureFileAsDataUrl,
  reorderSavedColorSwatches,
  runDeleteSavedColorFlow,
  runSaveCustomColorFlow,
  saveCustomColorByName,
  toggleSavedColorLock,
} from '../esm/native/ui/react/tabs/design_tab_color_command_flows.js';
import type { SavedColor } from '../esm/native/ui/react/tabs/design_tab_multicolor_panel.js';
import { getPerfEntries } from '../esm/native/runtime/perf_runtime_surface.ts';

function createAppHarness() {
  const state = {
    savedColors: [] as Array<Record<string, unknown>>,
    colorSwatchesOrder: [] as string[],
    customUploadedDataURL: null as string | null,
    batchCalls: 0,
    patchCalls: [] as Array<Record<string, unknown>>,
    storageCalls: [] as Array<{ key: string; value: unknown }>,
    appliedChoice: '',
    appliedSource: '',
  };

  const app = {
    actions: {
      patch(patch: Record<string, unknown>, meta?: Record<string, unknown>) {
        state.patchCalls.push({ patch, meta: meta || {} });
        const cfg =
          patch && typeof patch.config === 'object' ? (patch.config as Record<string, unknown>) : null;
        const ui = patch && typeof patch.ui === 'object' ? (patch.ui as Record<string, unknown>) : null;
        if (cfg && Array.isArray(cfg.savedColors))
          state.savedColors = cfg.savedColors.slice() as Array<Record<string, unknown>>;
        if (cfg && Array.isArray(cfg.colorSwatchesOrder))
          state.colorSwatchesOrder = cfg.colorSwatchesOrder.slice() as string[];
        if (ui && typeof ui.colorChoice === 'string') {
          state.appliedChoice = ui.colorChoice;
          state.appliedSource = typeof meta?.source === 'string' ? meta.source : '';
        }
      },
      colors: {
        setSavedColors(next: Array<Record<string, unknown>>) {
          state.savedColors = Array.isArray(next) ? next.slice() : [];
        },
        setColorSwatchesOrder(next: string[]) {
          state.colorSwatchesOrder = Array.isArray(next) ? next.slice() : [];
        },
      },
      ui: {
        setColorChoice(next: string, meta?: { source?: string }) {
          state.appliedChoice = String(next || '');
          state.appliedSource = typeof meta?.source === 'string' ? meta.source : '';
        },
      },
      config: {
        setCustomUploadedDataURL(next: string | null) {
          state.customUploadedDataURL = next == null ? null : String(next);
        },
      },
      history: {
        batch(fn: () => void) {
          state.batchCalls += 1;
          fn();
        },
      },
    },
    services: {
      storage: {
        KEYS: { SAVED_COLORS: 'savedColors' },
        setJSON(key: string, value: unknown) {
          state.storageCalls.push({ key, value });
          return true;
        },
      },
    },
  } as const;

  const applyColorChoice = (choice: string, source?: string) => {
    state.appliedChoice = String(choice || '');
    state.appliedSource = String(source || '');
  };

  return { app: app as unknown, state, applyColorChoice };
}

const BASE_SAVED_COLORS: SavedColor[] = [
  { id: 'saved_a', name: 'א', type: 'color', value: '#111111', textureData: null },
  { id: 'saved_b', name: 'ב', type: 'color', value: '#222222', textureData: null },
  { id: 'saved_c', name: 'ג', type: 'texture', value: 'saved_c', textureData: 'data:image/png;base64,ccc' },
];

test('reorderSavedColorSwatches updates order and persists saved-color order when needed', () => {
  const { app, state } = createAppHarness();
  const result = reorderSavedColorSwatches(
    app as never,
    BASE_SAVED_COLORS,
    BASE_SAVED_COLORS,
    'saved_a',
    'saved_c',
    'after'
  );

  assert.equal(result?.ok, true);
  assert.deepEqual(state.colorSwatchesOrder, ['saved_b', 'saved_c', 'saved_a']);
  assert.deepEqual(
    state.savedColors.map(color => String(color.id)),
    ['saved_b', 'saved_c', 'saved_a']
  );
  assert.equal(state.batchCalls, 0);
  assert.equal(state.patchCalls.length, 1);
  assert.deepEqual(state.patchCalls[0]?.meta, {
    source: 'react:design:colorSwatches:reorder',
    immediate: false,
    noBuild: true,
  });
  assert.deepEqual(
    state.storageCalls.map(call => call.key),
    ['savedColors', 'savedColors:order']
  );
});

test('toggleSavedColorLock flips locked flag through canonical saved-colors write', () => {
  const { app, state } = createAppHarness();
  const result = toggleSavedColorLock(app as never, BASE_SAVED_COLORS, 'saved_b');

  assert.deepEqual(result, {
    ok: true,
    kind: 'toggle-lock',
    id: 'saved_b',
    name: 'ב',
    locked: true,
  });
  assert.deepEqual(
    state.savedColors.find(color => color.id === 'saved_b'),
    {
      id: 'saved_b',
      name: 'ב',
      type: 'color',
      value: '#222222',
      textureData: null,
      locked: true,
    }
  );
  assert.deepEqual(state.patchCalls[0]?.meta, {
    source: 'react:design:savedColors:toggleLock',
    immediate: false,
    noBuild: true,
  });
  assert.deepEqual(
    state.storageCalls.map(call => call.key),
    ['savedColors']
  );
});

test('deleteSavedColor removes color, trims order, and resets active choice when deleted color was selected', () => {
  const { app, state, applyColorChoice } = createAppHarness();
  const result = deleteSavedColor(
    app as never,
    BASE_SAVED_COLORS,
    BASE_SAVED_COLORS,
    'saved_b',
    'saved_b',
    applyColorChoice
  );

  assert.equal(result.ok, true);
  assert.deepEqual(
    state.savedColors.map(color => String(color.id)),
    ['saved_a', 'saved_c']
  );
  assert.deepEqual(state.colorSwatchesOrder, ['saved_a', 'saved_c']);
  assert.equal(state.appliedChoice, '#ffffff');
  assert.equal(state.appliedSource, 'react:design:savedColors:delete');
  assert.deepEqual(state.patchCalls[0]?.meta, {
    source: 'react:design:savedColors:delete',
    immediate: false,
  });
  assert.equal(state.batchCalls, 0);
});

test('deleteSavedColor removes an unselected color without requesting a build', () => {
  const { app, state, applyColorChoice } = createAppHarness();
  const result = deleteSavedColor(
    app as never,
    BASE_SAVED_COLORS,
    BASE_SAVED_COLORS,
    'saved_a',
    'saved_b',
    applyColorChoice
  );

  assert.equal(result.ok, true);
  assert.deepEqual(
    state.savedColors.map(color => String(color.id)),
    ['saved_a', 'saved_c']
  );
  assert.deepEqual(state.colorSwatchesOrder, ['saved_a', 'saved_c']);
  assert.equal(state.appliedChoice, '');
  assert.deepEqual(state.patchCalls[0]?.meta, {
    source: 'react:design:savedColors:delete',
    immediate: false,
    noBuild: true,
  });
  assert.deepEqual(
    state.storageCalls.map(call => call.key),
    ['savedColors', 'savedColors:order']
  );
  assert.equal(state.batchCalls, 0);
});

test('runDeleteSavedColorFlow resolves cancelled when confirm rejects', async () => {
  const { app, applyColorChoice } = createAppHarness();
  const result = await runDeleteSavedColorFlow({
    app: app as never,
    savedColors: BASE_SAVED_COLORS,
    orderedSwatches: BASE_SAVED_COLORS,
    colorChoice: 'saved_a',
    id: 'saved_a',
    applyColorChoice,
    feedback: {
      toast() {},
      prompt(_title, _defaultValue, cb) {
        cb(null);
      },
      confirm(_title, _message, _onYes, onNo) {
        if (typeof onNo === 'function') onNo();
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'cancelled');
});

test('saveCustomColorByName writes new saved color, order, and activates it', () => {
  const { app, state, applyColorChoice } = createAppHarness();
  const result = saveCustomColorByName(
    app as never,
    BASE_SAVED_COLORS,
    BASE_SAVED_COLORS,
    '#abcdef',
    null,
    'גוון חדש',
    applyColorChoice,
    () => 'saved_fixed'
  );

  assert.equal(result.ok, true);
  assert.equal(result.id, 'saved_fixed');
  assert.equal(result.name, 'גוון חדש');
  assert.deepEqual(state.savedColors.at(-1), {
    id: 'saved_fixed',
    name: 'גוון חדש',
    type: 'color',
    value: '#abcdef',
    textureData: null,
  });
  assert.deepEqual(state.colorSwatchesOrder.at(-1), 'saved_fixed');
  assert.equal(state.appliedChoice, 'saved_fixed');
  assert.equal(state.appliedSource, 'react:design:savedColors:add');
  assert.deepEqual(state.patchCalls[0]?.meta, {
    source: 'react:design:savedColors:add',
    immediate: false,
  });
  assert.equal(state.batchCalls, 0);
});

test('saved color add records stage-level perf entries for diagnosis', () => {
  const { app, applyColorChoice } = createAppHarness();
  const result = saveCustomColorByName(
    app as never,
    BASE_SAVED_COLORS,
    BASE_SAVED_COLORS,
    '#abcdef',
    null,
    'גוון מדוד',
    applyColorChoice,
    () => 'saved_measured'
  );

  assert.equal(result.ok, true);
  const metricNames = getPerfEntries(app as never).map(entry => entry.name);
  assert.ok(metricNames.includes('design.savedColor.add.prepare'));
  assert.ok(metricNames.includes('design.savedColor.add.order'));
  assert.ok(metricNames.includes('design.savedColor.add.mutation'));
  assert.ok(metricNames.includes('design.savedColor.add.patch'));
  assert.ok(metricNames.includes('design.savedColor.add.storage'));
  assert.ok(metricNames.includes('design.savedColor.storage.write'));
});

test('saved color atomic fallback still persists storage exactly once per branch', () => {
  const { app, state, applyColorChoice } = createAppHarness();
  delete (app as { actions?: { patch?: unknown } }).actions?.patch;

  const result = saveCustomColorByName(
    app as never,
    BASE_SAVED_COLORS,
    BASE_SAVED_COLORS,
    '#abcdef',
    null,
    'גוון fallback',
    applyColorChoice,
    () => 'saved_fallback'
  );

  assert.equal(result.ok, true);
  assert.equal(state.batchCalls, 1);
  assert.equal(state.patchCalls.length, 0);
  assert.deepEqual(
    state.storageCalls.map(call => call.key),
    ['savedColors', 'savedColors:order']
  );
  assert.deepEqual(state.colorSwatchesOrder.at(-1), 'saved_fallback');
  assert.equal(state.appliedChoice, 'saved_fallback');
});

test('deleteSavedColor no-op guards avoid patch and storage writes', () => {
  const { app, state, applyColorChoice } = createAppHarness();
  const lockedSavedColors: SavedColor[] = [
    BASE_SAVED_COLORS[0] as SavedColor,
    { ...(BASE_SAVED_COLORS[1] as SavedColor), locked: true },
    BASE_SAVED_COLORS[2] as SavedColor,
  ];
  const missing = deleteSavedColor(
    app as never,
    lockedSavedColors,
    lockedSavedColors,
    'saved_a',
    'saved_missing',
    applyColorChoice
  );
  const locked = deleteSavedColor(
    app as never,
    lockedSavedColors,
    lockedSavedColors,
    'saved_a',
    'saved_b',
    applyColorChoice
  );

  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'missing');
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, 'locked');
  assert.equal(state.patchCalls.length, 0);
  assert.equal(state.storageCalls.length, 0);
});

test('runSaveCustomColorFlow uses prompt default and returns cancelled on empty name', async () => {
  const { app, applyColorChoice } = createAppHarness();
  let promptDefault = '';
  const result = await runSaveCustomColorFlow({
    app: app as never,
    feedback: {
      toast() {},
      prompt(_title, defaultValue, cb) {
        promptDefault = defaultValue;
        cb('');
      },
      confirm() {},
    },
    savedColors: BASE_SAVED_COLORS,
    orderedSwatches: BASE_SAVED_COLORS,
    draftColor: '#123456',
    draftTextureData: null,
    applyColorChoice,
  });

  assert.equal(promptDefault, 'הגוון שלי 4');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'cancelled');
});

test('readTextureFileAsDataUrl normalizes successful file read result', async () => {
  const blob = new Blob(['demo'], { type: 'image/png' }) as Blob & { name?: string };
  blob.name = 'texture.png';

  class FakeReader {
    result: string | null = null;
    error: unknown = null;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    readAsDataURL(_file: Blob): void {
      this.result = 'data:image/png;base64,AAA';
      this.onload?.();
    }
  }

  const result = await readTextureFileAsDataUrl(blob as Blob, {
    createReader: () => new FakeReader() as unknown as FileReader,
  });

  assert.deepEqual(result, {
    ok: true,
    kind: 'upload-texture',
    textureName: 'texture.png',
    dataUrl: 'data:image/png;base64,AAA',
  });
});

test('runSaveCustomColorFlow preserves prompt failures with message', async () => {
  const { app, applyColorChoice } = createAppHarness();
  const result = await runSaveCustomColorFlow({
    app: app as never,
    feedback: {
      toast() {},
      prompt() {
        throw new Error('prompt exploded');
      },
      confirm() {},
    },
    savedColors: BASE_SAVED_COLORS,
    orderedSwatches: BASE_SAVED_COLORS,
    draftColor: '#123456',
    draftTextureData: null,
    applyColorChoice,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'save-custom-color',
    reason: 'error',
    message: 'prompt exploded',
  });
});

test('runDeleteSavedColorFlow preserves confirm failures with message', async () => {
  const { app, applyColorChoice } = createAppHarness();
  const result = await runDeleteSavedColorFlow({
    app: app as never,
    savedColors: BASE_SAVED_COLORS,
    orderedSwatches: BASE_SAVED_COLORS,
    colorChoice: 'saved_a',
    id: 'saved_a',
    applyColorChoice,
    feedback: {
      toast() {},
      prompt(_title, _defaultValue, cb) {
        cb(null);
      },
      confirm() {
        throw new Error('confirm exploded');
      },
    },
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'delete-color',
    reason: 'error',
    message: 'confirm exploded',
    id: 'saved_a',
    name: 'א',
  });
});

test('readTextureFileAsDataUrl preserves file reader failure message', async () => {
  const blob = new Blob(['demo'], { type: 'image/png' }) as Blob & { name?: string };
  blob.name = 'texture.png';

  class FakeReader {
    result: string | null = null;
    error: unknown = new Error('reader exploded');
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    readAsDataURL(_file: Blob): void {
      this.onerror?.();
    }
  }

  const result = await readTextureFileAsDataUrl(blob as Blob, {
    createReader: () => new FakeReader() as unknown as FileReader,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'upload-texture',
    reason: 'read-failed',
    message: 'reader exploded',
  });
});

test('readTextureFileAsDataUrl reports unavailable separately when no file reader exists', async () => {
  const OriginalFileReader = globalThis.FileReader;
  // @ts-expect-error test shim
  delete globalThis.FileReader;
  try {
    const blob = new Blob(['demo'], { type: 'image/png' }) as Blob & { name?: string };
    blob.name = 'texture.png';
    const result = await readTextureFileAsDataUrl(blob);
    assert.deepEqual(result, {
      ok: false,
      kind: 'upload-texture',
      reason: 'unavailable',
      message: 'טעינת תמונה לא זמינה כרגע',
    });
  } finally {
    if (OriginalFileReader) globalThis.FileReader = OriginalFileReader;
  }
});
