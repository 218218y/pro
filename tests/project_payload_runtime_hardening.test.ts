import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProjectData } from '../esm/native/io/project_schema.ts';
import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from '../esm/shared/project_schema_constants.ts';
import { buildProjectPdfUiPatch, buildProjectUiSnapshot } from '../esm/native/io/project_io_load_helpers.ts';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function currentProject(input: Record<string, any>): Record<string, any> {
  const { settings, toggles, ...rest } = input;
  return {
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    ...rest,
    settings: {
      wardrobeType: 'hinged',
      width: 160,
      height: 240,
      depth: 55,
      doors: 4,
      ...(settings || {}),
    },
    toggles: { ...(toggles || {}) },
  };
}

test('project payload runtime: persisted removeDoors toggle materializes canonical builder UI state', () => {
  const normalized = normalizeProjectData(
    currentProject({
      projectName: 'Removed doors project',
      toggles: { removeDoors: true },
    })
  );

  assert.ok(normalized);
  const loadSnapshot = buildProjectUiSnapshot(normalized, 'Fallback Name');
  assert.equal(loadSnapshot.uiState.removeDoorsEnabled, true);
  assert.equal(Object.prototype.hasOwnProperty.call(loadSnapshot.uiState, 'removeDoors'), false);
});

test('project payload runtime: schema/load helpers normalize saved notes, pdf draft, and pre-chest state', () => {
  const normalized = normalizeProjectData(
    currentProject({
      projectName: 'Demo',
      savedNotes: [{ text: 'A', style: { left: '10px', top: '20px' }, doorsOpen: true }],
      orderPdfEditorDraft: {
        notes: 'Hello',
        manualEnabled: true,
        nested: { keep: 1, drop: undefined },
        items: [1, undefined, { ok: true, skip: undefined }],
        fn: () => 'nope',
      },
      orderPdfEditorZoom: 1.5,
      preChestState: { width: 120 },
    })
  );

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

test('project payload runtime: pdf draft clone keeps valid branches when unsupported leaves cannot be JSON-stringified', () => {
  const cyclic: Record<string, unknown> = { keep: 'visible' };
  cyclic.self = cyclic;

  const normalized = normalizeProjectData(
    currentProject({
      projectName: 'Demo',
      orderPdfEditorDraft: {
        notes: 'Hello',
        nested: { keep: 1, badBigInt: BigInt(9) },
        pages: [{ id: 'p1', html: '<b>ok</b>' }, cyclic],
        createdAt: new Date('2025-01-02T03:04:05.000Z'),
      },
    })
  );

  assert.ok(normalized);
  const pdfPatch = buildProjectPdfUiPatch(normalized, cloneJson);
  assert.deepEqual(pdfPatch.orderPdfEditorDraft, {
    notes: 'Hello',
    nested: { keep: 1 },
    pages: [{ id: 'p1', html: '<b>ok</b>' }, { keep: 'visible' }],
    createdAt: '2025-01-02T03:04:05.000Z',
  });
});
test('project payload runtime: schema rejects structural config slices that require migration', () => {
  const normalized = normalizeProjectData(
    currentProject({
      settings: {
        wardrobeType: 'hinged',
        doors: 5,
        structureSelection: '[2,2,1]',
      },
      modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
      cornerConfiguration: { modulesConfiguration: [{ doors: '7' }] },
    })
  );

  assert.equal(normalized, null);
});

test('project payload runtime: load helpers read the canonical top-level projectName', () => {
  const normalized = normalizeProjectData(
    currentProject({
      settings: {
        wardrobeType: 'hinged',
        width: 160,
        height: 240,
        depth: 55,
        doors: 4,
      },
      projectName: 'Top Level Demo',
    })
  );

  assert.ok(normalized);
  const uiSnapshot = buildProjectUiSnapshot(normalized, 'Fallback Name');
  assert.equal(uiSnapshot.uiState.projectName, 'Top Level Demo');
});

test('project payload runtime: load helpers respect explicit empty top-level projectName instead of reviving the previous name', () => {
  const normalized = normalizeProjectData(
    currentProject({
      settings: {
        wardrobeType: 'hinged',
        width: 160,
        height: 240,
        depth: 55,
        doors: 4,
      },
      projectName: '',
    })
  );

  assert.ok(normalized);
  const uiSnapshot = buildProjectUiSnapshot(normalized, 'Previous Name');
  assert.equal(uiSnapshot.uiState.projectName, '');
});

test('project payload runtime: essential ui dimensions reject numeric strings', () => {
  const normalized = normalizeProjectData(
    currentProject({
      settings: {
        wardrobeType: 'hinged',
        width: '160',
        height: '240',
        depth: '55',
        doors: '4',
      },
    })
  );

  assert.equal(normalized, null);
});

test('project payload runtime: load helper mirrors structural module controls into ui.raw', () => {
  const normalized = normalizeProjectData(
    currentProject({
      settings: {
        wardrobeType: 'hinged',
        width: 160,
        height: 240,
        depth: 55,
        doors: 3,
        structureSelection: '[2,1]',
        singleDoorPos: 'right',
      },
    })
  );

  assert.ok(normalized);
  const uiSnapshot = buildProjectUiSnapshot(normalized, 'Project');
  assert.equal((uiSnapshot.uiState.raw as any).structureSelect, '[2,1]');
  assert.equal((uiSnapshot.uiState.raw as any).singleDoorPos, 'right');
  assert.equal(uiSnapshot.uiState.structureSelect, '[2,1]');
  assert.equal(uiSnapshot.uiState.singleDoorPos, 'right');
});
