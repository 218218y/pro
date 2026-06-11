import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearStructureCellDimsOverrides,
  computeStructureAutoWidth,
  createStructureTabWorkflowController,
} from '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts';

test('structure workflows controller clears special cell-dims overrides, syncs library preset, and delegates side effects canonically', () => {
  const toasts: Array<{ message: string; type: string }> = [];
  const commits: Array<{ nextList: unknown[]; source: string }> = [];
  const clears: string[] = [];
  const autoWidths: number[] = [];
  const reports: Array<{ op: string; err: unknown }> = [];
  const libraryCalls: Array<{ op: string; args: unknown }> = [];

  const state = {
    isLibraryMode: false,
    wardrobeType: 'sliding',
    width: 240,
    height: 220,
    depth: 60,
    doors: 3,
    stackSplitEnabled: true,
    stackSplitLowerHeight: 90,
    stackSplitLowerDepth: 55,
    stackSplitLowerWidth: 70,
    stackSplitLowerDoors: 1,
    stackSplitLowerDepthManual: true,
    stackSplitLowerWidthManual: false,
    stackSplitLowerDoorsManual: true,
    modulesCount: 4,
  } as const;

  const list = [
    {
      id: 'm1',
      specialDims: {
        widthCm: 80,
        baseWidthCm: 81,
        heightCm: 90,
        baseHeightCm: 91,
        depthCm: 50,
        baseDepthCm: 51,
        keepMe: 777,
      },
    },
    { id: 'm2' },
  ];

  const controller = createStructureTabWorkflowController({
    fb: { toast: (message, type) => toasts.push({ message, type }) },
    libraryEnv: {} as never,
    libraryPreset: {
      toggleLibraryMode: (_env, args) => libraryCalls.push({ op: 'toggle', args }),
      ensureInvariants: (_env, args) => libraryCalls.push({ op: 'ensure', args }),
      resetPreState: () => libraryCalls.push({ op: 'reset', args: null }),
    },
    state: { ...state },
    mergeUiOverride: (_baseUi, patch) => patch,
    ops: {
      getModulesConfiguration: () => list as never,
      commitModulesConfiguration: (nextList, source) => commits.push({ nextList, source }),
      clearCellDim: key => clears.push(key),
      setAutoWidth: nextWidth => autoWidths.push(nextWidth),
      reportNonFatal: (op, err) => reports.push({ op, err }),
    },
  });

  controller.syncLibraryModePreState();
  controller.ensureLibraryInvariants();
  controller.toggleLibraryMode();
  controller.resetAllCellDimsOverrides();
  controller.clearCellDimsWidth();
  controller.clearCellDimsHeight();
  controller.clearCellDimsDepth();
  controller.resetAutoWidth();

  assert.equal(libraryCalls[0]?.op, 'reset');
  assert.deepEqual(libraryCalls[1], {
    op: 'ensure',
    args: {
      isLibraryMode: false,
      wardrobeType: 'sliding',
      doors: 3,
      stackSplitLowerDoors: 1,
      modulesCount: 4,
    },
  });
  assert.deepEqual(libraryCalls[2], {
    op: 'toggle',
    args: {
      isLibraryMode: false,
      wardrobeType: 'sliding',
      width: 240,
      height: 220,
      depth: 60,
      doors: 3,
      stackSplitEnabled: true,
      stackSplitLowerHeight: 90,
      stackSplitLowerDepth: 55,
      stackSplitLowerWidth: 70,
      stackSplitLowerDoors: 1,
      stackSplitLowerDepthManual: true,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: true,
      modulesCount: 4,
    },
  });

  assert.equal(commits.length, 1);
  assert.equal(commits[0]?.source, 'react:cellDims:resetAll');
  assert.deepEqual((commits[0]?.nextList as Array<any>)[0].specialDims, { keepMe: 777 });
  assert.deepEqual(clears, ['width', 'height', 'depth']);
  assert.deepEqual(autoWidths, [240]);
  assert.equal(toasts[0]?.message, 'חזרנו למידות כלליות שוות לכל התאים');
  assert.equal(toasts[0]?.type, 'success');
  assert.equal(reports.length, 0);
});

test('structure workflows controller reports empty reset as info and helper keeps immutable override cleanup semantics', () => {
  const toasts: Array<{ message: string; type: string }> = [];
  const baseList = [
    {
      id: 'm1',
      specialDims: { widthCm: 50, keep: 1 },
    },
  ];
  const cleaned = clearStructureCellDimsOverrides(baseList as never);
  assert.deepEqual((cleaned[0] as any).specialDims, { keep: 1 });
  assert.deepEqual((baseList[0] as any).specialDims, { widthCm: 50, keep: 1 });
  assert.equal(computeStructureAutoWidth('hinged', 4.4), 160);

  const controller = createStructureTabWorkflowController({
    fb: { toast: (message, type) => toasts.push({ message, type }) },
    libraryEnv: {} as never,
    libraryPreset: {
      toggleLibraryMode: () => undefined,
      ensureInvariants: () => undefined,
      resetPreState: () => undefined,
    },
    state: {
      isLibraryMode: true,
      wardrobeType: 'hinged',
      width: 160,
      height: 220,
      depth: 60,
      doors: 4,
      stackSplitEnabled: false,
      stackSplitLowerHeight: 0,
      stackSplitLowerDepth: 0,
      stackSplitLowerWidth: 0,
      stackSplitLowerDoors: 0,
      stackSplitLowerDepthManual: false,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: false,
      modulesCount: 2,
    },
    mergeUiOverride: (_baseUi, patch) => patch,
    ops: {
      getModulesConfiguration: () => [],
      commitModulesConfiguration: () => {
        throw new Error('should not commit');
      },
      clearCellDim: () => undefined,
      setAutoWidth: () => undefined,
    },
  });

  controller.resetAllCellDimsOverrides();
  assert.deepEqual(toasts, [{ message: 'אין מידות מיוחדות לביטול', type: 'info' }]);
});
