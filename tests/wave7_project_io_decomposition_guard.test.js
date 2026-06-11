import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();

function runTsModule(expr) {
  const script = [
    "import { buildProjectConfigSnapshot, buildProjectUiSnapshot, captureProjectLoadSourceFlags, preserveUiEphemeral } from './esm/native/io/project_io_load_helpers.ts';",
    "import { buildDefaultProjectDataSnapshot, finalizeProjectForSavePayload } from './esm/native/io/project_io_save_helpers.ts';",
    'const cloneJson = (value) => JSON.parse(JSON.stringify(value));',
    `const result = (${expr});`,
    'console.log(JSON.stringify(result));',
  ].join('\n');
  const out = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(out.trim());
}

test('[wave7] project load helpers shape canonical config/ui snapshots instead of depending on owner-file text layout', () => {
  const result = runTsModule(`(() => {
    const projectData = {
      settings: {
        projectName: 'Imported project',
        wardrobeType: 'sliding',
        boardMaterial: 'melamine',
        width: 240,
        height: 260,
        depth: 62,
        doors: 6,
        stackSplitEnabled: true,
        stackSplitLowerWidth: 180,
        stackSplitLowerDepth: 55,
        stackSplitLowerDoors: 4,
        cornerSide: 'left',
        structureSelection: 'grid',
        slidingTracksColor: 'black',
      },
      toggles: {
        showDimensions: false,
        notesEnabled: true,
        showContents: true,
        showHanger: false,
        sketchMode: true,
        globalClickMode: false,
        multiColor: true,
      },
      modulesConfiguration: [{ id: 'top-1' }],
      stackSplitLowerModulesConfiguration: [{ id: 'bottom-1' }],
      cornerConfiguration: { top: { cells: [{ id: 'corner-1' }] } },
      savedNotes: [{ id: 'note-1' }],
      handlesMap: { d1: 'bar' },
      hingeMap: { d1: 'left' },
      curtainMap: { d1_left: true },
      preChestState: { enabled: true },
    };
    const cfg = buildProjectConfigSnapshot(projectData);
    const uiSnap = buildProjectUiSnapshot(projectData, 'Current name');
    const legacyOnlyNotes = buildProjectUiSnapshot({ settings: { projectName: 'Legacy notes project' }, notes: [{ id: 'legacy-note-1' }] }, 'Fallback name');
    const legacyNotesProtectedFromInvalidSavedNotes = buildProjectUiSnapshot({ settings: { projectName: 'Legacy notes project' }, savedNotes: { bad: true }, notes: [{ id: 'legacy-note-2' }] }, 'Fallback name');
    return { cfg, uiSnap, legacyOnlyNotes, legacyNotesProtectedFromInvalidSavedNotes };
  })()`);
  const { cfg, uiSnap, legacyOnlyNotes, legacyNotesProtectedFromInvalidSavedNotes } = result;
  const { uiState, savedNotes } = uiSnap;
  assert.ok(Array.isArray(cfg.modulesConfiguration));
  assert.equal(cfg.modulesConfiguration[0].id, 'top-1');
  assert.equal(typeof cfg.modulesConfiguration[0].doors, 'number');
  assert.ok(Array.isArray(cfg.stackSplitLowerModulesConfiguration));
  assert.equal(cfg.stackSplitLowerModulesConfiguration[0].id, 'bottom-1');
  assert.equal(cfg.cornerConfiguration.layout, 'shelves');
  assert.deepEqual(cfg.cornerConfiguration.top.cells, [{ id: 'corner-1' }]);
  assert.equal(cfg.boardMaterial, 'melamine');
  assert.equal(cfg.showDimensions, false);
  assert.equal(cfg.isLibraryMode, false);
  assert.deepEqual({ ...cfg.handlesMap }, { d1: 'bar' });
  assert.equal(uiState.projectName, 'Imported project');
  assert.equal(uiState.cornerSide, 'left');
  assert.equal(uiState.stackSplitEnabled, true);
  assert.equal(uiState.showDimensions, false);
  assert.equal(uiState.showContents, true);
  assert.equal(uiState.showHanger, false);
  assert.equal(uiState.globalClickMode, false);
  assert.equal(uiState.multiColorEnabled, true);
  assert.equal(uiState.slidingTracksColor, 'black');
  assert.equal(uiState.currentLayoutType, undefined);
  assert.equal(uiState.raw.doors, 6);
  assert.equal(uiState.raw.width, 240);
  assert.equal(uiState.raw.height, 260);
  assert.equal(uiState.raw.depth, 62);
  assert.equal(uiState.raw.cornerSide, 'left');
  assert.equal(uiState.raw.stackSplitLowerDepth, 55);
  assert.equal(uiState.raw.stackSplitLowerWidth, 180);
  assert.equal(uiState.raw.stackSplitLowerDoors, 4);
  assert.equal(uiState.raw.stackSplitLowerDepthManual, true);
  assert.equal(uiState.raw.stackSplitLowerWidthManual, true);
  assert.equal(uiState.raw.stackSplitLowerDoorsManual, true);
  assert.equal('cornerWidth' in uiState.raw, false);
  assert.equal('stackSplitLowerHeight' in uiState.raw, false);
  assert.deepEqual(savedNotes, [{ id: 'note-1' }]);
  assert.deepEqual(legacyOnlyNotes.savedNotes, [{ id: 'legacy-note-1' }]);
  assert.equal(legacyOnlyNotes.uiState.notesEnabled, true);
  assert.deepEqual(legacyNotesProtectedFromInvalidSavedNotes.savedNotes, [{ id: 'legacy-note-2' }]);
  assert.equal(legacyNotesProtectedFromInvalidSavedNotes.uiState.notesEnabled, true);
});

test('[wave7] project load helpers preserve runtime UI ephemera and capture source flags semantically', () => {
  const result = runTsModule(`(() => ({
    historyFlags: captureProjectLoadSourceFlags({ meta: { source: 'history.undoRedo' } }),
    cloudFlags: captureProjectLoadSourceFlags({ meta: { source: 'cloudSketch.restore' } }),
    preserved: preserveUiEphemeral(
      { projectName: 'Imported project' },
      { activeTab: 'notes', selectedModelId: 'm-42', site2TabsGateOpen: true, site2TabsGateUntil: 1234, site2TabsGateBy: 'tester' }
    ),
  }))()`);
  assert.deepEqual(result.historyFlags, {
    source: 'history.undoRedo',
    isHistoryApply: true,
    isModelApply: false,
    isCloudApply: false,
  });
  assert.deepEqual(result.cloudFlags, {
    source: 'cloudSketch.restore',
    isHistoryApply: false,
    isModelApply: false,
    isCloudApply: true,
  });
  assert.deepEqual(result.preserved, {
    projectName: 'Imported project',
    activeTab: 'notes',
    selectedModelId: 'm-42',
    site2TabsGateOpen: true,
    site2TabsGateUntil: 1234,
    site2TabsGateBy: 'tester',
  });
});

test('[wave7] save helpers normalize persisted payloads and default project snapshots by data meaning, not file structure', () => {
  const result = runTsModule(`(() => {
    const finalized = finalizeProjectForSavePayload(
      {
        hingeMap: { d1: 'left' },
        groovesMap: { groove_a: true },
        curtainMap: { d1_left: 'linen', d2_right: 'glass', other: null },
        splitDoorsMap: { d1: 2 },
        splitDoorsBottomMap: { d2: 3 },
        mirrorLayoutMap: { d1_full: [{ widthCm: 40, heightCm: 80 }, { widthCm: 0 }], bad: { nope: true } },
        doorTrimMap: { d1_full: [{ axis: 'vertical', span: 'half', color: 'gold' }, { axis: 'bad' }], bad: 7 },
        __app: {},
      },
      { cloneJson, schemaId: 'wardrobepro.test', schemaVersion: 77, buildTags: { channel: 'test' }, userAgent: 'node:test' }
    );
    const defaultSnapshot = buildDefaultProjectDataSnapshot({
      ui: {
        raw: {
          doors: 5, width: 220, height: 250, depth: 60, chestDrawersCount: 4,
          stackSplitLowerHeight: 80, stackSplitLowerDepth: 52, stackSplitLowerWidth: 160, stackSplitLowerDoors: 3,
          stackSplitLowerDepthManual: true, stackSplitLowerWidthManual: false, stackSplitLowerDoorsManual: true,
        },
        colorChoice: '#abcdef', baseType: 'legs', slidingTracksColor: 'black', doorStyle: 'flat', corniceType: 'wave', structureSelect: 'grid',
        isChestMode: true, cornerMode: true, showContents: true, showHanger: false, showDimensions: true, globalClickMode: false,
        notesEnabled: true, sketchMode: true, multiColorEnabled: true, handleControl: true, groovesEnabled: true, internalDrawersEnabled: false,
        splitDoors: true, hingeDirection: true, cornerWidth: 90, cornerDoors: 2, cornerHeight: 230, cornerDepth: 60,
      }
    });
    return { finalized, defaultSnapshot };
  })()`);
  const { finalized, defaultSnapshot } = result;
  assert.deepEqual({ ...finalized.hingeMap }, { d1: 'left' });
  assert.equal(Object.prototype.hasOwnProperty.call(finalized, 'hingeDoorsMap'), false);
  assert.deepEqual({ ...finalized.groovesMap }, { groove_a: true });
  assert.equal(Object.prototype.hasOwnProperty.call(finalized, 'grooveMap'), false);
  assert.equal(finalized.curtainMap.d1_left, 'linen');
  assert.equal(finalized.curtainMap.d2_right, 'glass');
  assert.ok(Object.prototype.hasOwnProperty.call(finalized.curtainMap, 'other'));
  assert.equal(finalized.curtainMap.other, null);
  assert.deepEqual({ ...finalized.mirrorLayoutMap }, { d1_full: [{ widthCm: 40, heightCm: 80 }] });
  assert.equal(Array.isArray(finalized.doorTrimMap?.d1_full), true);
  assert.equal(finalized.doorTrimMap.d1_full.length, 2);
  assert.equal(finalized.doorTrimMap.d1_full[0].axis, 'vertical');
  assert.equal(finalized.doorTrimMap.d1_full[0].color, 'gold');
  assert.equal(finalized.doorTrimMap.d1_full[1].axis, 'horizontal');
  assert.equal(Object.prototype.hasOwnProperty.call(finalized.doorTrimMap, 'bad'), false);
  assert.equal(finalized.__schema, 'wardrobepro.test');
  assert.equal(finalized.__version, 77);
  assert.deepEqual(finalized.__app.buildTags, { channel: 'test' });
  assert.equal(finalized.__app.userAgent, 'node:test');
  assert.equal(typeof finalized.__createdAt, 'string');
  assert.equal(defaultSnapshot.settings.doors, 5);
  assert.equal(defaultSnapshot.settings.width, 220);
  assert.equal(defaultSnapshot.settings.height, 250);
  assert.equal(defaultSnapshot.settings.depth, 60);
  assert.equal(defaultSnapshot.settings.cornerWidth, 90);
  assert.equal(defaultSnapshot.toggles.cornerMode, true);
  assert.equal(defaultSnapshot.settings.structureSelection, 'grid');
  assert.equal(defaultSnapshot.toggles.showContents, true);
  assert.equal(defaultSnapshot.toggles.showHanger, false);
  assert.equal(defaultSnapshot.toggles.notesEnabled, true);
  assert.equal(defaultSnapshot.toggles.globalClickMode, false);
  assert.equal(defaultSnapshot.savedNotes.length, 0);
});
