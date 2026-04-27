import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProjectData } from '../esm/native/io/project_schema.ts';
import { buildProjectPdfUiPatch, buildProjectUiSnapshot } from '../esm/native/io/project_io_load_helpers.ts';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test('project payload runtime: schema/load helpers normalize saved notes, pdf draft, and pre-chest state', () => {
  const normalized = normalizeProjectData({
    settings: {
      wardrobeType: 'hinged',
      projectName: 'Demo',
      preChestState: { width: 120 },
    },
    savedNotes: [{ text: 'A', style: { left: '10px', top: '20px' }, doorsOpen: true }, { bad: true }],
    orderPdfEditorDraft: {
      notes: 'Hello',
      manualEnabled: true,
      nested: { keep: 1, drop: undefined },
      items: [1, undefined, { ok: true, skip: undefined }],
      fn: () => 'nope',
    },
    orderPdfEditorZoom: '1.5',
    preChestState: { width: 120 },
  });

  assert.ok(normalized);
  assert.equal(normalized?.savedNotes?.length, 1);
  assert.equal(normalized?.savedNotes?.[0]?.text, 'A');
  assert.deepEqual(normalized?.preChestState, { width: 120 });

  const uiSnapshot = buildProjectUiSnapshot(normalized, 'Fallback Name');
  assert.equal(uiSnapshot.uiState.projectName, 'Demo');
  assert.equal(uiSnapshot.savedNotes.length, 1);
  assert.equal(uiSnapshot.savedNotes[0]?.doorsOpen, true);

  const pdfPatch = buildProjectPdfUiPatch(normalized, cloneJson);
  const draft = pdfPatch.orderPdfEditorDraft;
  assert.equal(typeof draft, 'object');
  assert.equal(draft && !Array.isArray(draft) ? draft.notes : undefined, 'Hello');
  assert.deepEqual(draft && !Array.isArray(draft) ? draft.nested : undefined, { keep: 1 });
  assert.deepEqual(draft && !Array.isArray(draft) ? draft.items : undefined, [1, null, { ok: true }]);
  assert.equal(
    draft && !Array.isArray(draft) ? Object.prototype.hasOwnProperty.call(draft, 'fn') : false,
    false
  );
  assert.equal(pdfPatch.orderPdfEditorZoom, 1.5);
});

test('project payload runtime: pdf draft clone keeps valid branches when malformed legacy leaves cannot be JSON-stringified', () => {
  const cyclic: Record<string, unknown> = { keep: 'visible' };
  cyclic.self = cyclic;

  const normalized = normalizeProjectData({
    settings: { wardrobeType: 'hinged', projectName: 'Demo' },
    orderPdfEditorDraft: {
      notes: 'Hello',
      nested: { keep: 1, badBigInt: BigInt(9) },
      pages: [{ id: 'p1', html: '<b>ok</b>' }, cyclic],
      createdAt: new Date('2025-01-02T03:04:05.000Z'),
    },
  });

  assert.ok(normalized);
  const pdfPatch = buildProjectPdfUiPatch(normalized, cloneJson);
  assert.deepEqual(pdfPatch.orderPdfEditorDraft, {
    notes: 'Hello',
    nested: { keep: 1 },
    pages: [{ id: 'p1', html: '<b>ok</b>' }, { keep: 'visible' }],
    createdAt: '2025-01-02T03:04:05.000Z',
  });
});
test('project payload runtime: schema canonicalizes structural config slices before load helpers run', () => {
  const normalized = normalizeProjectData({
    settings: {
      wardrobeType: 'hinged',
      doors: 5,
      structureSelection: '[2,2,1]',
    },
    modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '7' }] },
  });

  assert.ok(normalized);
  assert.deepEqual(
    normalized?.modulesConfiguration?.map((entry: any) => entry.doors),
    [2, 2, 1]
  );
  assert.equal((normalized?.modulesConfiguration?.[1] as any)?.layout, 'shelves');
  assert.equal((normalized?.modulesConfiguration?.[2] as any)?.customData?.storage, true);
  assert.equal((normalized?.stackSplitLowerModulesConfiguration?.[0] as any)?.extDrawersCount, 3);
  assert.equal((normalized?.cornerConfiguration as any)?.layout, 'shelves');
});

test('project payload runtime: load helpers restore top-level projectName when legacy settings.projectName is absent', () => {
  const normalized = normalizeProjectData({
    settings: {
      wardrobeType: 'hinged',
      width: 160,
      height: 240,
      depth: 55,
      doors: 4,
    },
    projectName: 'Top Level Demo',
  });

  assert.ok(normalized);
  const uiSnapshot = buildProjectUiSnapshot(normalized, 'Fallback Name');
  assert.equal(uiSnapshot.uiState.projectName, 'Top Level Demo');
});

test('project payload runtime: load helpers respect explicit empty top-level projectName instead of reviving the previous name', () => {
  const normalized = normalizeProjectData({
    settings: {
      wardrobeType: 'hinged',
      width: 160,
      height: 240,
      depth: 55,
      doors: 4,
    },
    projectName: '',
  });

  assert.ok(normalized);
  const uiSnapshot = buildProjectUiSnapshot(normalized, 'Previous Name');
  assert.equal(uiSnapshot.uiState.projectName, '');
});

test('project payload runtime: essential ui dims accept numeric strings from persisted saved-model snapshots', () => {
  const normalized = normalizeProjectData({
    settings: {
      wardrobeType: 'hinged',
      width: '160',
      height: '240',
      depth: '55',
      doors: '4',
    },
  });

  assert.ok(normalized);
  const uiSnapshot = buildProjectUiSnapshot(normalized, 'Preset Model');
  assert.equal(uiSnapshot.uiState.width, '160');
  assert.equal(uiSnapshot.uiState.height, '240');
  assert.equal(uiSnapshot.uiState.depth, '55');
  assert.equal(uiSnapshot.uiState.doors, '4');
});
