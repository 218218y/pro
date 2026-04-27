import { test, expect, type Page } from '@playwright/test';

import {
  applyCellDimsToReachableLinearModule,
  collectRuntimeIssues,
  expectCabinetCoreFingerprint,
  expectCabinetDoorDrawerAuthoringFingerprint,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  loadProjectViaHeader,
  measureBuildAndRenderDelta,
  readBuildDebugStats,
  readCabinetCoreFingerprint,
  readCabinetDoorDrawerAuthoringFingerprint,
  readChestStructureFingerprint,
  readCornerStructureFingerprint,
  readLibraryStructureFingerprint,
  readLinearModuleSpecialDims,
  readRenderDebugStats,
  readSavedProjectPayload,
  readStackSplitFingerprint,
  readStructureBaseFingerprint,
  resetBuildDebugStats,
  resetRenderDebugStats,
  resetAllCellDimsOverrides,
  saveProjectViaHeader,
  setBoardMaterial,
  setCellDimsDraft,
  setCellDimsMode,
  setChestDrawersCount,
  setChestMode,
  setCornerDimension,
  setCornerMode,
  setCornerSide,
  setDoorFeatureToggle,
  setDoorStyle,
  setExternalDrawerSelection,
  setGrooveLinesCount,
  setInternalDrawersEnabled,
  setLibraryMode,
  setStackSplitDimension,
  setStackSplitEnabled,
  setStructureDoors,
  setStructureDimension,
  setStructureType,
  type BuildAndRenderDelta,
  type CabinetCoreFingerprint,
  type CabinetDoorDrawerAuthoringFingerprint,
  type ModuleSpecialDimsSnapshot,
  type StructureBaseFingerprint,
  type StructureChestFingerprint,
  type StructureCornerFingerprint,
  type StructureLibraryFingerprint,
  type StructureStackSplitFingerprint,
} from './helpers/project_flows';

type CanonicalAuthoringTargets = {
  width: number;
  height: number;
  depth: number;
  boardMaterial: 'melamine' | 'sandwich';
};

function createCanonicalAuthoringTargets(initialCore: CabinetCoreFingerprint): CanonicalAuthoringTargets {
  const width = Math.max(90, Number(initialCore.width) + 19);
  const height = Math.max(120, Number(initialCore.height) + 7);
  const depth = Math.max(35, Number(initialCore.depth) + 4);
  const boardMaterial = initialCore.boardMaterial === 'sandwich' ? 'melamine' : 'sandwich';
  return {
    width,
    height,
    depth,
    boardMaterial,
  };
}

async function applyCanonicalAuthoringTargets(
  page: Page,
  targets: CanonicalAuthoringTargets,
  initialCore: CabinetCoreFingerprint
): Promise<void> {
  await setStructureDimension(page, 'width', targets.width);
  await setStructureDimension(page, 'height', targets.height);
  await setStructureDimension(page, 'depth', targets.depth);
  if (initialCore.wardrobeType !== 'hinged') {
    await setStructureType(page, 'hinged');
  } else {
    await setStructureType(page, 'sliding');
    await setStructureType(page, 'hinged');
  }
  await setBoardMaterial(page, targets.boardMaterial);
  await setDoorStyle(page, 'profile');
  await setDoorFeatureToggle(page, 'groovesEnabled', true);
  await setGrooveLinesCount(page, 12);
  await setDoorFeatureToggle(page, 'splitDoors', true);
  await setDoorFeatureToggle(page, 'removeDoorsEnabled', true);
  await setInternalDrawersEnabled(page, true);
  await setExternalDrawerSelection(page, 'regular', 3, { exitAfterSelect: true });
}

async function mutateAwayFromCanonical(page: Page, targets: CanonicalAuthoringTargets): Promise<void> {
  await setStructureDimension(page, 'width', targets.width + 11);
  await setStructureDimension(page, 'height', Math.max(120, targets.height - 5));
  await setStructureDimension(page, 'depth', targets.depth + 3);
  await setBoardMaterial(page, targets.boardMaterial === 'sandwich' ? 'melamine' : 'sandwich');
  await setDoorStyle(page, 'post');
  await setDoorFeatureToggle(page, 'groovesEnabled', false);
  await setDoorFeatureToggle(page, 'splitDoors', false);
  await setDoorFeatureToggle(page, 'removeDoorsEnabled', false);
  await setInternalDrawersEnabled(page, false);
  await setExternalDrawerSelection(page, 'shoe', undefined, { exitAfterSelect: true });
}

function expectMeaningfulBuildAndRenderDelta(name: string, delta: BuildAndRenderDelta): void {
  expect(delta.build.requestCount, `${name}: expected a real build request`).toBeGreaterThanOrEqual(1);
  expect(delta.build.executeCount, `${name}: expected a real build execution`).toBeGreaterThanOrEqual(1);
  expect(
    Object.keys(delta.build.reasons),
    `${name}: expected canonical build reasons to be recorded`
  ).not.toEqual([]);
  expect(
    delta.build.lastExecuteReason,
    `${name}: expected the build debug surface to expose the last execute reason`
  ).not.toBe('');
  expect(
    delta.build.staleDebouncedTimerFireCount + delta.build.staleBuilderWaitWakeupCount,
    `${name}: stale builder wakeups should stay at zero`
  ).toBe(0);
  expect(
    delta.render.renderRequestCount,
    `${name}: expected render follow-through work`
  ).toBeGreaterThanOrEqual(1);
  expect(
    delta.render.triggerRenderCount + delta.render.ensureRenderLoopCount,
    `${name}: expected triggerRender or ensureRenderLoop follow-through`
  ).toBeGreaterThanOrEqual(1);
}

function expectAuthoringIntent(
  core: CabinetCoreFingerprint,
  authoring: CabinetDoorDrawerAuthoringFingerprint,
  targets: CanonicalAuthoringTargets
): void {
  expect(core.width).toBe(targets.width);
  expect(core.height).toBe(targets.height);
  expect(core.depth).toBe(targets.depth);
  expect(core.wardrobeType).toBe('hinged');
  expect(core.boardMaterial).toBe(targets.boardMaterial);
  expect(core.doorStyle).toBe('profile');
  expect(core.groovesEnabled).toBe(true);
  expect(core.splitDoors).toBe(true);
  expect(core.removeDoorsEnabled).toBe(true);
  expect(core.internalDrawersEnabled).toBe(true);

  expect(authoring.groovesEnabled).toBe(true);
  expect(authoring.splitDoors).toBe(true);
  expect(authoring.removeDoorsEnabled).toBe(true);
  expect(authoring.internalDrawersEnabled).toBe(true);
}

type StructureModeProjectPayload = Record<string, unknown>;

type CornerAuthoringTargets = {
  cornerSide: 'left' | 'right';
  cornerDoors: number;
  cornerWidth: number;
  cornerHeight: number;
  cornerDepth: number;
};

type ChestAuthoringTargets = {
  chestDrawersCount: number;
  width: number;
  height: number;
  depth: number;
};

type LibraryAuthoringTargets = {
  width: number;
  height: number;
  depth: number;
};

type SlidingAuthoringTargets = StructureBaseFingerprint;

type StackSplitAuthoringTargets = StructureStackSplitFingerprint & {
  cellWidth: number;
  cellHeight: number;
  cellDepth: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readFiniteNumber(value: unknown): number | null {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : null;
}

function hasGlassDoorSpecial(mapValue: unknown): boolean {
  return Object.values(asRecord(mapValue)).some(value => value === 'glass');
}

function createCornerAuthoringTargets(initialCore: CabinetCoreFingerprint): CornerAuthoringTargets {
  return {
    cornerSide: 'left',
    cornerDoors: 4,
    cornerWidth: Math.max(140, Math.round(Number(initialCore.width) * 0.7)),
    cornerHeight: Math.max(210, Number(initialCore.height) - 12),
    cornerDepth: Math.max(40, Number(initialCore.depth) + 6),
  };
}

function createChestAuthoringTargets(_initialCore: CabinetCoreFingerprint): ChestAuthoringTargets {
  return {
    chestDrawersCount: 4,
    width: 130,
    height: 95,
    depth: 45,
  };
}

function createLibraryAuthoringTargets(initialCore: CabinetCoreFingerprint): LibraryAuthoringTargets {
  return {
    width: Math.max(100, Number(initialCore.width) + 17),
    height: Math.max(160, Number(initialCore.height) + 9),
    depth: Math.max(35, Number(initialCore.depth) + 4),
  };
}

function createSlidingAuthoringTargets(initialCore: CabinetCoreFingerprint): SlidingAuthoringTargets {
  return {
    wardrobeType: 'sliding',
    boardMaterial: initialCore.boardMaterial === 'sandwich' ? 'melamine' : 'sandwich',
    doors: Math.max(3, Math.min(6, Math.round(Number(initialCore.width) / 48))),
    width: Math.max(140, Number(initialCore.width) + 14),
    height: Math.max(180, Number(initialCore.height) + 8),
    depth: Math.max(40, Number(initialCore.depth) + 3),
  };
}

function createStackSplitAuthoringTargets(initialCore: CabinetCoreFingerprint): StackSplitAuthoringTargets {
  const width = Math.max(180, Number(initialCore.width) + 22);
  const height = Math.max(230, Number(initialCore.height) + 10);
  const depth = Math.max(45, Number(initialCore.depth) + 5);
  const doors = Math.max(4, Math.min(6, Math.round(width / 45)));

  return {
    wardrobeType: 'hinged',
    boardMaterial: initialCore.boardMaterial === 'sandwich' ? 'melamine' : 'sandwich',
    doors,
    width,
    height,
    depth,
    stackSplitEnabled: true,
    stackSplitLowerHeight: Math.max(85, Math.min(height - 70, 105)),
    stackSplitLowerDepth: Math.max(40, depth + 5),
    stackSplitLowerWidth: Math.max(100, Math.round(width * 0.62)),
    stackSplitLowerDoors: Math.max(2, Math.min(doors - 1, 3)),
    cellWidth: 82,
    cellHeight: Math.max(160, height - 18),
    cellDepth: Math.max(35, depth - 4),
  };
}

async function applyCornerAuthoringTargets(page: Page, targets: CornerAuthoringTargets): Promise<void> {
  await setCornerMode(page, true);
  await setCornerSide(page, targets.cornerSide);
  await setCornerDimension(page, 'cornerDoors', targets.cornerDoors);
  await setCornerDimension(page, 'cornerWidth', targets.cornerWidth);
  await setCornerDimension(page, 'cornerHeight', targets.cornerHeight);
  await setCornerDimension(page, 'cornerDepth', targets.cornerDepth);
}

async function applyChestAuthoringTargets(page: Page, targets: ChestAuthoringTargets): Promise<void> {
  await setChestMode(page, true);
  await setChestDrawersCount(page, targets.chestDrawersCount);
  await setStructureDimension(page, 'width', targets.width);
  await setStructureDimension(page, 'height', targets.height);
  await setStructureDimension(page, 'depth', targets.depth);
}

async function applyLibraryAuthoringTargets(page: Page, targets: LibraryAuthoringTargets): Promise<void> {
  await setLibraryMode(page, true);
  await setStructureDimension(page, 'width', targets.width);
  await setStructureDimension(page, 'height', targets.height);
  await setStructureDimension(page, 'depth', targets.depth);
}

async function applySlidingAuthoringTargets(page: Page, targets: SlidingAuthoringTargets): Promise<void> {
  await setStructureType(page, 'sliding');
  await setStructureDoors(page, targets.doors);
  await setStructureDimension(page, 'width', targets.width);
  await setStructureDimension(page, 'height', targets.height);
  await setStructureDimension(page, 'depth', targets.depth);
  await setBoardMaterial(page, targets.boardMaterial as 'melamine' | 'sandwich');
}

async function applyStackSplitAuthoringTargets(
  page: Page,
  targets: StackSplitAuthoringTargets
): Promise<void> {
  await setStructureType(page, 'hinged');
  await setStructureDoors(page, targets.doors);
  await setStructureDimension(page, 'width', targets.width);
  await setStructureDimension(page, 'height', targets.height);
  await setStructureDimension(page, 'depth', targets.depth);
  await setBoardMaterial(page, targets.boardMaterial as 'melamine' | 'sandwich');
  await setStackSplitEnabled(page, true);
  await setStackSplitDimension(page, 'stackSplitLowerHeight', targets.stackSplitLowerHeight);
  await setStackSplitDimension(page, 'stackSplitLowerDepth', targets.stackSplitLowerDepth);
  await setStackSplitDimension(page, 'stackSplitLowerWidth', targets.stackSplitLowerWidth);
  await setStackSplitDimension(page, 'stackSplitLowerDoors', targets.stackSplitLowerDoors);
}

function expectCornerIntent(fingerprint: StructureCornerFingerprint, targets: CornerAuthoringTargets): void {
  expect(fingerprint).toEqual({
    cornerMode: true,
    cornerSide: targets.cornerSide,
    cornerDoors: targets.cornerDoors,
    cornerWidth: targets.cornerWidth,
    cornerHeight: targets.cornerHeight,
    cornerDepth: targets.cornerDepth,
  });
}

function expectChestIntent(fingerprint: StructureChestFingerprint, targets: ChestAuthoringTargets): void {
  expect(fingerprint).toEqual({
    isChestMode: true,
    chestDrawersCount: targets.chestDrawersCount,
    width: targets.width,
    height: targets.height,
    depth: targets.depth,
  });
}

function expectLibraryIntent(
  fingerprint: StructureLibraryFingerprint,
  targets: LibraryAuthoringTargets
): void {
  expect(fingerprint).toEqual({
    isLibraryMode: true,
    width: targets.width,
    height: targets.height,
    depth: targets.depth,
  });
}

function expectSlidingIntent(fingerprint: StructureBaseFingerprint, targets: SlidingAuthoringTargets): void {
  expect(fingerprint).toEqual(targets);
}

function expectStackSplitIntent(
  fingerprint: StructureStackSplitFingerprint,
  targets: StackSplitAuthoringTargets
): void {
  expect(fingerprint).toEqual({
    wardrobeType: 'hinged',
    boardMaterial: targets.boardMaterial,
    doors: targets.doors,
    width: targets.width,
    height: targets.height,
    depth: targets.depth,
    stackSplitEnabled: true,
    stackSplitLowerHeight: targets.stackSplitLowerHeight,
    stackSplitLowerDepth: targets.stackSplitLowerDepth,
    stackSplitLowerWidth: targets.stackSplitLowerWidth,
    stackSplitLowerDoors: targets.stackSplitLowerDoors,
  });
}

function expectCornerProjectPayload(
  project: StructureModeProjectPayload,
  targets: CornerAuthoringTargets
): void {
  const settings = asRecord(project.settings);
  const toggles = asRecord(project.toggles);

  expect(toggles.cornerMode).toBe(true);
  expect(String(settings.cornerSide || '')).toBe(targets.cornerSide);
  expect(readFiniteNumber(settings.cornerDoors)).toBe(targets.cornerDoors);
  expect(readFiniteNumber(settings.cornerWidth)).toBe(targets.cornerWidth);
  expect(readFiniteNumber(settings.cornerHeight)).toBe(targets.cornerHeight);
  expect(readFiniteNumber(settings.cornerDepth)).toBe(targets.cornerDepth);
}

function expectChestProjectPayload(
  project: StructureModeProjectPayload,
  targets: ChestAuthoringTargets
): void {
  const settings = asRecord(project.settings);
  const toggles = asRecord(project.toggles);

  expect(toggles.chestMode).toBe(true);
  expect(readFiniteNumber(settings.chestDrawersCount)).toBe(targets.chestDrawersCount);
  expect(readFiniteNumber(settings.width)).toBe(targets.width);
  expect(readFiniteNumber(settings.height)).toBe(targets.height);
  expect(readFiniteNumber(settings.depth)).toBe(targets.depth);
  expect(readFiniteNumber(settings.doors)).toBe(0);
  expect(String(settings.baseType || '')).toBe('legs');
}

function expectLibraryProjectPayload(
  project: StructureModeProjectPayload,
  targets: LibraryAuthoringTargets
): void {
  const settings = asRecord(project.settings);

  expect(project.isLibraryMode).toBe(true);
  expect(readFiniteNumber(settings.width)).toBe(targets.width);
  expect(readFiniteNumber(settings.height)).toBe(targets.height);
  expect(readFiniteNumber(settings.depth)).toBe(targets.depth);
  expect(settings.stackSplitEnabled).toBe(true);
  expect(Array.isArray(project.modulesConfiguration)).toBe(true);
  expect(Array.isArray(project.stackSplitLowerModulesConfiguration)).toBe(true);
  expect((project.modulesConfiguration as unknown[]).length).toBeGreaterThan(0);
  expect((project.stackSplitLowerModulesConfiguration as unknown[]).length).toBeGreaterThan(0);
  expect(hasGlassDoorSpecial(project.doorSpecialMap)).toBe(true);
}

function expectSlidingProjectPayload(
  project: StructureModeProjectPayload,
  targets: SlidingAuthoringTargets
): void {
  const settings = asRecord(project.settings);

  expect(String(settings.wardrobeType || '')).toBe('sliding');
  expect(String(settings.boardMaterial || '')).toBe(targets.boardMaterial);
  expect(readFiniteNumber(settings.doors)).toBe(targets.doors);
  expect(readFiniteNumber(settings.width)).toBe(targets.width);
  expect(readFiniteNumber(settings.height)).toBe(targets.height);
  expect(readFiniteNumber(settings.depth)).toBe(targets.depth);
}

function expectStackSplitProjectPayload(
  project: StructureModeProjectPayload,
  targets: StructureStackSplitFingerprint
): void {
  const settings = asRecord(project.settings);

  expect(String(settings.wardrobeType || '')).toBe('hinged');
  expect(String(settings.boardMaterial || '')).toBe(targets.boardMaterial);
  expect(readFiniteNumber(settings.doors)).toBe(targets.doors);
  expect(readFiniteNumber(settings.width)).toBe(targets.width);
  expect(readFiniteNumber(settings.height)).toBe(targets.height);
  expect(readFiniteNumber(settings.depth)).toBe(targets.depth);
  expect(settings.stackSplitEnabled).toBe(true);
  expect(readFiniteNumber(settings.stackSplitLowerHeight)).toBe(targets.stackSplitLowerHeight);
  expect(readFiniteNumber(settings.stackSplitLowerDepth)).toBe(targets.stackSplitLowerDepth);
  expect(readFiniteNumber(settings.stackSplitLowerWidth)).toBe(targets.stackSplitLowerWidth);
  expect(readFiniteNumber(settings.stackSplitLowerDoors)).toBe(targets.stackSplitLowerDoors);
  expect(Array.isArray(project.stackSplitLowerModulesConfiguration)).toBe(true);
}

function expectProjectContainsModuleSpecialDims(
  project: StructureModeProjectPayload,
  expectedModule: ModuleSpecialDimsSnapshot
): void {
  const modules = Array.isArray(project.modulesConfiguration) ? project.modulesConfiguration : [];
  const moduleValue = modules[expectedModule.moduleIndex];
  const specialDims = asRecord(asRecord(moduleValue).specialDims);

  expect(readFiniteNumber(specialDims.widthCm)).toBe(expectedModule.widthCm);
  expect(readFiniteNumber(specialDims.baseWidthCm)).toBe(expectedModule.baseWidthCm);
  expect(readFiniteNumber(specialDims.heightCm)).toBe(expectedModule.heightCm);
  expect(readFiniteNumber(specialDims.baseHeightCm)).toBe(expectedModule.baseHeightCm);
  expect(readFiniteNumber(specialDims.depthCm)).toBe(expectedModule.depthCm);
  expect(readFiniteNumber(specialDims.baseDepthCm)).toBe(expectedModule.baseDepthCm);
}

test.describe('Playwright authoring build coverage', () => {
  test('structure, design, and interior authoring steps trigger real build and render work', async ({
    page,
  }) => {
    test.slow();
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const initialCore = await readCabinetCoreFingerprint(page);
    const targets = createCanonicalAuthoringTargets(initialCore);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const structureDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await setStructureDimension(page, 'width', targets.width);
        await setStructureDimension(page, 'height', targets.height);
        await setStructureDimension(page, 'depth', targets.depth);
        if (initialCore.wardrobeType !== 'hinged') {
          await setStructureType(page, 'hinged');
        } else {
          await setStructureType(page, 'sliding');
          await setStructureType(page, 'hinged');
        }
        await setBoardMaterial(page, targets.boardMaterial);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('structure-authoring', structureDelta);

    const designDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await setDoorStyle(page, 'profile');
        await setDoorFeatureToggle(page, 'groovesEnabled', true);
        await setGrooveLinesCount(page, 12);
        await setDoorFeatureToggle(page, 'splitDoors', true);
        await setDoorFeatureToggle(page, 'removeDoorsEnabled', true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('design-authoring', designDelta);

    const interiorDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await setInternalDrawersEnabled(page, true);
        await setExternalDrawerSelection(page, 'regular', 3, { exitAfterSelect: true });
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('interior-authoring', interiorDelta);

    const canonicalCore = await readCabinetCoreFingerprint(page);
    const canonicalAuthoring = await readCabinetDoorDrawerAuthoringFingerprint(page);
    expectAuthoringIntent(canonicalCore, canonicalAuthoring, targets);

    const totalBuild = await readBuildDebugStats(page);
    const totalRender = await readRenderDebugStats(page);
    expect(totalBuild.executeCount).toBeGreaterThanOrEqual(3);
    expect(totalBuild.staleDebouncedTimerFireCount + totalBuild.staleBuilderWaitWakeupCount).toBe(0);
    expect(totalRender.renderRequestCount).toBeGreaterThanOrEqual(3);

    expectNoRuntimeIssues(issues);
  });

  test('authored structure, design, and interior state rebuilds cleanly after project load', async ({
    page,
  }) => {
    test.slow();
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const initialCore = await readCabinetCoreFingerprint(page);
    const targets = createCanonicalAuthoringTargets(initialCore);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const configureDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await applyCanonicalAuthoringTargets(page, targets, initialCore);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('configure-canonical-authoring', configureDelta);
    const canonicalCore = await readCabinetCoreFingerprint(page);
    const canonicalAuthoring = await readCabinetDoorDrawerAuthoringFingerprint(page);
    expectAuthoringIntent(canonicalCore, canonicalAuthoring, targets);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'authoring-build-roundtrip');
    expect(saveDetail.ok).toBe(true);
    const savedProjectPath = await download.path();
    expect(savedProjectPath).toBeTruthy();

    const mutationDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await mutateAwayFromCanonical(page, targets);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('mutate-away-authoring', mutationDelta);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const loadDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        const loadDetail = await loadProjectViaHeader(page, savedProjectPath!);
        expect(loadDetail.ok).toBe(true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('load-authored-project', loadDelta);

    await expectCabinetCoreFingerprint(page, canonicalCore);
    await expectCabinetDoorDrawerAuthoringFingerprint(page, canonicalAuthoring);

    const postLoadBuild = await readBuildDebugStats(page);
    const postLoadRender = await readRenderDebugStats(page);
    expect(postLoadBuild.staleDebouncedTimerFireCount + postLoadBuild.staleBuilderWaitWakeupCount).toBe(0);
    expect(postLoadRender.renderRequestCount).toBeGreaterThanOrEqual(1);

    expectNoRuntimeIssues(issues);
  });

  test('corner cabinet authoring triggers real build work and roundtrips through project load', async ({
    page,
  }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const initialCore = await readCabinetCoreFingerprint(page);
    const targets = createCornerAuthoringTargets(initialCore);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const configureDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await applyCornerAuthoringTargets(page, targets);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('corner-authoring', configureDelta);

    const expectedCornerFingerprint = await readCornerStructureFingerprint(page);
    expectCornerIntent(expectedCornerFingerprint, targets);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'corner-build-roundtrip');
    expect(saveDetail.ok).toBe(true);
    const savedProjectPath = await download.path();
    expect(savedProjectPath).toBeTruthy();
    expectCornerProjectPayload(await readSavedProjectPayload(savedProjectPath!), targets);

    const mutationDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await setCornerMode(page, false);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('corner-mutate-away', mutationDelta);
    expect(await readCornerStructureFingerprint(page)).not.toEqual(expectedCornerFingerprint);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const loadDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        const loadDetail = await loadProjectViaHeader(page, savedProjectPath!);
        expect(loadDetail.ok).toBe(true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('corner-load-project', loadDelta);
    expect(await readCornerStructureFingerprint(page)).toEqual(expectedCornerFingerprint);

    expectNoRuntimeIssues(issues);
  });

  test('chest authoring triggers real build work and roundtrips through project load', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const initialCore = await readCabinetCoreFingerprint(page);
    const targets = createChestAuthoringTargets(initialCore);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const configureDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await applyChestAuthoringTargets(page, targets);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('chest-authoring', configureDelta);

    const expectedChestFingerprint = await readChestStructureFingerprint(page);
    expectChestIntent(expectedChestFingerprint, targets);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'chest-build-roundtrip');
    expect(saveDetail.ok).toBe(true);
    const savedProjectPath = await download.path();
    expect(savedProjectPath).toBeTruthy();
    expectChestProjectPayload(await readSavedProjectPayload(savedProjectPath!), targets);

    const mutationDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await setChestMode(page, false);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('chest-mutate-away', mutationDelta);
    expect(await readChestStructureFingerprint(page)).not.toEqual(expectedChestFingerprint);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const loadDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        const loadDetail = await loadProjectViaHeader(page, savedProjectPath!);
        expect(loadDetail.ok).toBe(true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('chest-load-project', loadDelta);
    expect(await readChestStructureFingerprint(page)).toEqual(expectedChestFingerprint);

    expectNoRuntimeIssues(issues);
  });

  test('library authoring triggers real build work and roundtrips through project load', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const initialCore = await readCabinetCoreFingerprint(page);
    const targets = createLibraryAuthoringTargets(initialCore);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const configureDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await applyLibraryAuthoringTargets(page, targets);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('library-authoring', configureDelta);

    const expectedLibraryFingerprint = await readLibraryStructureFingerprint(page);
    expectLibraryIntent(expectedLibraryFingerprint, targets);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'library-build-roundtrip');
    expect(saveDetail.ok).toBe(true);
    const savedProjectPath = await download.path();
    expect(savedProjectPath).toBeTruthy();
    expectLibraryProjectPayload(await readSavedProjectPayload(savedProjectPath!), targets);

    const mutationDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await setLibraryMode(page, false);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('library-mutate-away', mutationDelta);
    expect(await readLibraryStructureFingerprint(page)).not.toEqual(expectedLibraryFingerprint);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const loadDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        const loadDetail = await loadProjectViaHeader(page, savedProjectPath!);
        expect(loadDetail.ok).toBe(true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('library-load-project', loadDelta);
    expect(await readLibraryStructureFingerprint(page)).toEqual(expectedLibraryFingerprint);

    expectNoRuntimeIssues(issues);
  });

  test('sliding structure authoring rebuilds cleanly after project load', async ({ page }) => {
    test.slow();
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const initialCore = await readCabinetCoreFingerprint(page);
    const targets = createSlidingAuthoringTargets(initialCore);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const configureDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await applySlidingAuthoringTargets(page, targets);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('sliding-authoring', configureDelta);

    const expectedStructureFingerprint = await readStructureBaseFingerprint(page);
    expectSlidingIntent(expectedStructureFingerprint, targets);
    const expectedAuthoringFingerprint = await readCabinetDoorDrawerAuthoringFingerprint(page);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'sliding-build-roundtrip');
    expect(saveDetail.ok).toBe(true);
    const savedProjectPath = await download.path();
    expect(savedProjectPath).toBeTruthy();
    expectSlidingProjectPayload(await readSavedProjectPayload(savedProjectPath!), targets);

    const mutationDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await setStructureType(page, 'hinged');
        await setStructureDoors(page, Math.max(2, targets.doors + 1));
        await setStructureDimension(page, 'width', targets.width + 16);
        await setStructureDimension(page, 'height', Math.max(180, targets.height - 12));
        await setStructureDimension(page, 'depth', targets.depth + 4);
        await setBoardMaterial(page, targets.boardMaterial === 'sandwich' ? 'melamine' : 'sandwich');
        await setDoorStyle(page, 'profile');
        await setDoorFeatureToggle(page, 'splitDoors', true);
        await setDoorFeatureToggle(page, 'removeDoorsEnabled', true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('sliding-mutate-away', mutationDelta);
    expect(await readStructureBaseFingerprint(page)).not.toEqual(expectedStructureFingerprint);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const loadDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        const loadDetail = await loadProjectViaHeader(page, savedProjectPath!);
        expect(loadDetail.ok).toBe(true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('sliding-load-project', loadDelta);
    expect(await readStructureBaseFingerprint(page)).toEqual(expectedStructureFingerprint);
    await expectCabinetDoorDrawerAuthoringFingerprint(page, expectedAuthoringFingerprint);

    expectNoRuntimeIssues(issues);
  });

  test('stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated', async ({
    page,
  }) => {
    test.slow();
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const initialCore = await readCabinetCoreFingerprint(page);
    const targets = createStackSplitAuthoringTargets(initialCore);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const stackSplitDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await applyStackSplitAuthoringTargets(page, targets);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('stack-split-authoring', stackSplitDelta);

    const expectedStackSplitFingerprint = await readStackSplitFingerprint(page);
    expectStackSplitIntent(expectedStackSplitFingerprint, targets);

    await setCellDimsMode(page, true);
    await setCellDimsDraft(page, 'cellDimsWidth', targets.cellWidth);
    await setCellDimsDraft(page, 'cellDimsHeight', targets.cellHeight);
    await setCellDimsDraft(page, 'cellDimsDepth', targets.cellDepth);

    let expectedTopOverride: ModuleSpecialDimsSnapshot | null = null;
    const cellDimsDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        expectedTopOverride = await applyCellDimsToReachableLinearModule(
          page,
          {
            widthCm: targets.cellWidth,
            heightCm: targets.cellHeight,
            depthCm: targets.cellDepth,
          },
          { stack: 'top' }
        );
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('cell-dims-authoring', cellDimsDelta);
    expect(expectedTopOverride).toBeTruthy();

    const expectedTopModule = expectedTopOverride!;
    const expectedRoundtripStackSplitFingerprint = await readStackSplitFingerprint(page);
    expect(expectedRoundtripStackSplitFingerprint.wardrobeType).toBe('hinged');
    expect(expectedRoundtripStackSplitFingerprint.boardMaterial).toBe(targets.boardMaterial);
    expect(expectedRoundtripStackSplitFingerprint.doors).toBe(targets.doors);
    expect(expectedRoundtripStackSplitFingerprint.stackSplitEnabled).toBe(true);
    expect(expectedRoundtripStackSplitFingerprint.stackSplitLowerHeight).toBe(targets.stackSplitLowerHeight);
    expect(expectedRoundtripStackSplitFingerprint.stackSplitLowerDepth).toBe(targets.stackSplitLowerDepth);
    expect(expectedRoundtripStackSplitFingerprint.stackSplitLowerWidth).toBe(targets.stackSplitLowerWidth);
    expect(expectedRoundtripStackSplitFingerprint.stackSplitLowerDoors).toBe(targets.stackSplitLowerDoors);
    expect(await readLinearModuleSpecialDims(page, 'top')).toEqual([expectedTopModule]);
    expect(await readLinearModuleSpecialDims(page, 'bottom')).toEqual([]);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'stack-split-cell-dims');
    expect(saveDetail.ok).toBe(true);
    const savedProjectPath = await download.path();
    expect(savedProjectPath).toBeTruthy();
    const savedProject = await readSavedProjectPayload(savedProjectPath!);
    expectStackSplitProjectPayload(savedProject, expectedRoundtripStackSplitFingerprint);
    expectProjectContainsModuleSpecialDims(savedProject, expectedTopModule);

    const mutationDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        await resetAllCellDimsOverrides(page);
        await setCellDimsMode(page, false);
        await setStackSplitEnabled(page, false);
        await setStructureDoors(page, Math.max(2, targets.doors - 1));
        await setStructureDimension(page, 'width', targets.width + 18);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('stack-split-mutate-away', mutationDelta);
    expect(await readLinearModuleSpecialDims(page, 'top')).toEqual([]);
    expect((await readStackSplitFingerprint(page)).stackSplitEnabled).toBe(false);

    await resetBuildDebugStats(page);
    await resetRenderDebugStats(page);

    const loadDelta = await measureBuildAndRenderDelta(
      page,
      async () => {
        const loadDetail = await loadProjectViaHeader(page, savedProjectPath!);
        expect(loadDetail.ok).toBe(true);
      },
      { minBuildRequests: 1, minBuildExecutes: 1, minRenderRequests: 1 }
    );
    expectMeaningfulBuildAndRenderDelta('stack-split-load-project', loadDelta);
    expect(await readStackSplitFingerprint(page)).toEqual(expectedRoundtripStackSplitFingerprint);
    expect(await readLinearModuleSpecialDims(page, 'top')).toEqual([expectedTopModule]);
    expect(await readLinearModuleSpecialDims(page, 'bottom')).toEqual([]);

    expectNoRuntimeIssues(issues);
  });
});
