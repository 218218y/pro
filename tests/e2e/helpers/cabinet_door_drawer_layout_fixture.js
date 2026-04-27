function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function ensureModuleArray(value) {
  return Array.isArray(value) ? value.map(item => ({ ...asRecord(item) })) : [];
}

function upsertModule(modules, index, patch) {
  while (modules.length <= index) modules.push({});
  modules[index] = { ...asRecord(modules[index]), ...patch };
  return modules;
}

function normalizeTruthyRecordKeys(value) {
  return Object.entries(asRecord(value))
    .filter(([, entry]) => entry != null && entry !== false)
    .map(([key]) => String(key))
    .sort();
}

function isSegmentedDoorBaseId(value) {
  return (
    /^(?:lower_)?d\d+$/i.test(String(value || '')) ||
    /^(?:lower_)?corner_door_\d+$/i.test(String(value || '')) ||
    /^(?:lower_)?corner_pent_door_\d+$/i.test(String(value || ''))
  );
}

function canonicalSegmentedDoorKey(value) {
  const key = String(value || '');
  if (!key) return '';
  if (/(?:_(?:full|top|bot|mid))$/i.test(key)) return key;
  return isSegmentedDoorBaseId(key) ? `${key}_full` : key;
}

function isEnabledToggleEntry(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === 'null') return false;
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }
  return !!value;
}

function normalizeRemovedDoorKeys(value) {
  return Object.entries(asRecord(value))
    .filter(([, entry]) => isEnabledToggleEntry(entry))
    .map(([key]) => {
      const bareKey = String(key || '').startsWith('removed_') ? String(key).slice(8) : String(key || '');
      const canonicalKey = canonicalSegmentedDoorKey(bareKey);
      return canonicalKey ? `removed_${canonicalKey}` : '';
    })
    .filter(Boolean)
    .sort();
}

function normalizeFiniteNumberEntries(value) {
  return Object.entries(asRecord(value))
    .map(([key, entry]) => [String(key), Number(entry)])
    .filter(([, entry]) => Number.isFinite(entry) && entry > 0)
    .map(([key, entry]) => [key, Math.max(1, Math.floor(entry))])
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function normalizeDoorTrimEntries(value) {
  return Object.entries(asRecord(value))
    .map(([doorKey, trims]) => {
      const normalizedTrims = Array.isArray(trims)
        ? trims
            .map(trim => {
              const rec = asRecord(trim);
              const span = String(rec.span || '');
              return {
                axis: String(rec.axis || ''),
                color: String(rec.color || ''),
                span,
                sizeCm:
                  span === 'custom' && Number.isFinite(Number(rec.sizeCm))
                    ? Math.max(0, Math.floor(Number(rec.sizeCm)))
                    : null,
              };
            })
            .filter(trim => trim.axis || trim.color || trim.span || trim.sizeCm != null)
        : [];
      return {
        doorKey: String(doorKey),
        trims: normalizedTrims,
      };
    })
    .filter(entry => entry.trims.length > 0)
    .sort((left, right) => left.doorKey.localeCompare(right.doorKey));
}

function normalizeModulesConfiguration(value) {
  return ensureModuleArray(value)
    .map((module, index) => {
      const intDrawersList = Array.isArray(module.intDrawersList)
        ? module.intDrawersList
            .map(entry => Number(entry))
            .filter(Number.isFinite)
            .map(entry => Math.max(0, Math.floor(entry)))
        : [];
      const intDrawersSlot = Number.isFinite(Number(module.intDrawersSlot))
        ? Math.max(0, Math.floor(Number(module.intDrawersSlot)))
        : null;
      const extDrawersCount = Number.isFinite(Number(module.extDrawersCount))
        ? Math.max(0, Math.floor(Number(module.extDrawersCount)))
        : 0;
      return {
        index,
        intDrawersList,
        intDrawersSlot,
        extDrawersCount,
      };
    })
    .filter(
      entry => entry.intDrawersList.length > 0 || entry.intDrawersSlot != null || entry.extDrawersCount > 0
    );
}

export function readCabinetDoorDrawerLayoutProjectSubset(sourceProject) {
  const project = asRecord(sourceProject);
  const settings = asRecord(project.settings);
  const toggles = asRecord(project.toggles);
  return {
    wardrobeType: String(settings.wardrobeType || ''),
    boardMaterial: String(settings.boardMaterial || ''),
    doorStyle: String(settings.doorStyle || ''),
    groovesEnabled: !!toggles.grooves,
    splitDoors: !!toggles.splitDoors,
    removeDoorsEnabled: !!toggles.removeDoors,
    internalDrawersEnabled: !!toggles.internalDrawers,
    grooveLinesCount:
      project.grooveLinesCount == null || project.grooveLinesCount === ''
        ? null
        : Number.isFinite(Number(project.grooveLinesCount))
          ? Math.max(1, Math.floor(Number(project.grooveLinesCount)))
          : null,
    groovesMapKeys: normalizeTruthyRecordKeys(project.groovesMap),
    grooveLinesCountEntries: normalizeFiniteNumberEntries(project.grooveLinesCountMap),
    splitDoorKeys: normalizeTruthyRecordKeys(project.splitDoorsMap),
    splitDoorBottomKeys: normalizeTruthyRecordKeys(project.splitDoorsBottomMap),
    removedDoorKeys: normalizeRemovedDoorKeys(project.removedDoorsMap),
    drawerDividerKeys: normalizeTruthyRecordKeys(project.drawerDividersMap),
    doorTrimSummary: normalizeDoorTrimEntries(project.doorTrimMap),
    modulesConfiguration: normalizeModulesConfiguration(project.modulesConfiguration),
    stackSplitLowerModulesConfiguration: normalizeModulesConfiguration(
      project.stackSplitLowerModulesConfiguration
    ),
  };
}

function createFingerprint(base) {
  return {
    wardrobeType: String(base.wardrobeType || ''),
    boardMaterial: String(base.boardMaterial || ''),
    doorStyle: String(base.doorStyle || ''),
    groovesEnabled: !!base.groovesEnabled,
    grooveLinesCount:
      base.grooveLinesCount == null
        ? null
        : Math.max(1, Math.floor(Number(base.grooveLinesCount) || 0)) || null,
    splitDoors: !!base.splitDoors,
    removeDoorsEnabled: !!base.removeDoorsEnabled,
    internalDrawersEnabled: !!base.internalDrawersEnabled,
    groovesMapCount: Math.max(0, Math.floor(Number(base.groovesMapCount) || 0)),
    grooveLinesCountMapCount: Math.max(0, Math.floor(Number(base.grooveLinesCountMapCount) || 0)),
    splitDoorMapCount: Math.max(0, Math.floor(Number(base.splitDoorMapCount) || 0)),
    splitDoorBottomMapCount: Math.max(0, Math.floor(Number(base.splitDoorBottomMapCount) || 0)),
    removedDoorMapCount: Math.max(0, Math.floor(Number(base.removedDoorMapCount) || 0)),
    doorTrimCount: Math.max(0, Math.floor(Number(base.doorTrimCount) || 0)),
    drawerDividerCount: Math.max(0, Math.floor(Number(base.drawerDividerCount) || 0)),
    internalDrawerPlacementCount: Math.max(0, Math.floor(Number(base.internalDrawerPlacementCount) || 0)),
    externalDrawerSelectionCount: Math.max(0, Math.floor(Number(base.externalDrawerSelectionCount) || 0)),
  };
}

function applyBaseCabinetDoorDrawerState(project) {
  project.settings = { ...asRecord(project.settings) };
  project.toggles = { ...asRecord(project.toggles) };
  project.settings.wardrobeType = 'hinged';
  project.settings.boardMaterial = 'sandwich';
  project.settings.doorStyle = 'profile';
  project.toggles.grooves = false;
  project.toggles.splitDoors = false;
  project.toggles.removeDoors = false;
  project.toggles.internalDrawers = false;
  project.grooveLinesCount = null;
  project.groovesMap = {};
  project.grooveLinesCountMap = {};
  project.splitDoorsMap = {};
  project.splitDoorsBottomMap = {};
  project.removedDoorsMap = {};
  project.drawerDividersMap = {};
  project.doorTrimMap = {};
  project.modulesConfiguration = [];
  project.stackSplitLowerModulesConfiguration = [];
}

function applyModules(project, config) {
  const modulesConfiguration = ensureModuleArray(project.modulesConfiguration);
  const stackSplitLowerModulesConfiguration = ensureModuleArray(project.stackSplitLowerModulesConfiguration);
  for (const [index, patch] of Object.entries(asRecord(config?.modulesConfiguration))) {
    upsertModule(modulesConfiguration, Number(index), patch);
  }
  for (const [index, patch] of Object.entries(asRecord(config?.stackSplitLowerModulesConfiguration))) {
    upsertModule(stackSplitLowerModulesConfiguration, Number(index), patch);
  }
  project.modulesConfiguration = modulesConfiguration;
  project.stackSplitLowerModulesConfiguration = stackSplitLowerModulesConfiguration;
}

const SCENARIO_BUILDERS = {
  'mixed-layout': project => {
    project.settings.wardrobeType = 'hinged';
    project.settings.boardMaterial = 'sandwich';
    project.settings.doorStyle = 'profile';
    project.toggles.grooves = true;
    project.toggles.splitDoors = true;
    project.toggles.removeDoors = true;
    project.toggles.internalDrawers = true;
    project.grooveLinesCount = 12;
    project.groovesMap = {
      groove_d1_full: true,
      groove_d2_full: true,
      groove_d3_full: true,
    };
    project.grooveLinesCountMap = {
      groove_d1_full: 12,
      groove_d2_full: 8,
    };
    project.splitDoorsMap = {
      split_d1: true,
      split_d2: true,
    };
    project.splitDoorsBottomMap = {
      splitb_d1: true,
    };
    project.removedDoorsMap = {
      removed_d3_full: true,
      removed_d4_full: true,
    };
    project.drawerDividersMap = {
      'div:int_4': true,
      'div:ext_2': true,
    };
    project.doorTrimMap = {
      d1_full: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: 12 }],
      d2_full: [{ axis: 'horizontal', color: 'black', span: 'half' }],
    };
    applyModules(project, {
      modulesConfiguration: {
        0: { intDrawersList: [2, 4], intDrawersSlot: 0, extDrawersCount: 3 },
        1: { intDrawersList: [], intDrawersSlot: 3, extDrawersCount: 0 },
      },
      stackSplitLowerModulesConfiguration: {
        0: { intDrawersList: [1], intDrawersSlot: 0, extDrawersCount: 1 },
      },
    });
    return createFingerprint({
      wardrobeType: 'hinged',
      boardMaterial: 'sandwich',
      doorStyle: 'profile',
      groovesEnabled: true,
      grooveLinesCount: 12,
      splitDoors: true,
      removeDoorsEnabled: true,
      internalDrawersEnabled: true,
      groovesMapCount: 3,
      grooveLinesCountMapCount: 2,
      splitDoorMapCount: 2,
      splitDoorBottomMapCount: 1,
      removedDoorMapCount: 2,
      doorTrimCount: 2,
      drawerDividerCount: 2,
      internalDrawerPlacementCount: 4,
      externalDrawerSelectionCount: 4,
    });
  },
  'split-heavy-cut': project => {
    project.settings.wardrobeType = 'hinged';
    project.settings.boardMaterial = 'sandwich';
    project.settings.doorStyle = 'profile';
    project.toggles.grooves = true;
    project.toggles.splitDoors = true;
    project.toggles.removeDoors = false;
    project.toggles.internalDrawers = true;
    project.grooveLinesCount = 9;
    project.groovesMap = {
      groove_d1_full: true,
      groove_d2_full: true,
      groove_d3_full: true,
      groove_d4_full: true,
    };
    project.grooveLinesCountMap = {
      groove_d1_full: 9,
      groove_d2_full: 7,
      groove_d4_full: 5,
    };
    project.splitDoorsMap = {
      split_d1: true,
      split_d2: true,
      split_d3: true,
      split_d4: true,
    };
    project.splitDoorsBottomMap = {
      splitb_d1: true,
      splitb_d3: true,
    };
    project.drawerDividersMap = {
      'div:int_2': true,
    };
    project.doorTrimMap = {
      d1_full: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: 10 }],
      d2_full: [{ axis: 'horizontal', color: 'black', span: 'half' }],
      d4_full: [{ axis: 'vertical', color: 'silver', span: 'third' }],
    };
    applyModules(project, {
      modulesConfiguration: {
        0: { intDrawersList: [1], intDrawersSlot: 2, extDrawersCount: 1 },
        1: { intDrawersList: [], intDrawersSlot: 0, extDrawersCount: 0 },
      },
      stackSplitLowerModulesConfiguration: {
        0: { intDrawersList: [1], intDrawersSlot: 0, extDrawersCount: 0 },
      },
    });
    return createFingerprint({
      wardrobeType: 'hinged',
      boardMaterial: 'sandwich',
      doorStyle: 'profile',
      groovesEnabled: true,
      grooveLinesCount: 9,
      splitDoors: true,
      removeDoorsEnabled: false,
      internalDrawersEnabled: true,
      groovesMapCount: 4,
      grooveLinesCountMapCount: 3,
      splitDoorMapCount: 4,
      splitDoorBottomMapCount: 2,
      removedDoorMapCount: 0,
      doorTrimCount: 3,
      drawerDividerCount: 1,
      internalDrawerPlacementCount: 3,
      externalDrawerSelectionCount: 1,
    });
  },
  'open-niche-remove': project => {
    project.settings.wardrobeType = 'hinged';
    project.settings.boardMaterial = 'melamine';
    project.settings.doorStyle = 'tom';
    project.toggles.grooves = false;
    project.toggles.splitDoors = false;
    project.toggles.removeDoors = true;
    project.toggles.internalDrawers = false;
    project.removedDoorsMap = {
      removed_d1_full: true,
      removed_d2_full: true,
      removed_d3_full: true,
      removed_d4_full: true,
    };
    project.drawerDividersMap = {
      'div:ext_1': true,
    };
    applyModules(project, {
      modulesConfiguration: {
        0: { intDrawersList: [], intDrawersSlot: 0, extDrawersCount: 2 },
        1: { intDrawersList: [], intDrawersSlot: 0, extDrawersCount: 1 },
      },
    });
    return createFingerprint({
      wardrobeType: 'hinged',
      boardMaterial: 'melamine',
      doorStyle: 'tom',
      groovesEnabled: false,
      grooveLinesCount: null,
      splitDoors: false,
      removeDoorsEnabled: true,
      internalDrawersEnabled: false,
      groovesMapCount: 0,
      grooveLinesCountMapCount: 0,
      splitDoorMapCount: 0,
      splitDoorBottomMapCount: 0,
      removedDoorMapCount: 4,
      doorTrimCount: 0,
      drawerDividerCount: 1,
      internalDrawerPlacementCount: 0,
      externalDrawerSelectionCount: 3,
    });
  },
  'drawer-stack-heavy': project => {
    project.settings.wardrobeType = 'hinged';
    project.settings.boardMaterial = 'sandwich';
    project.settings.doorStyle = 'post';
    project.toggles.grooves = false;
    project.toggles.splitDoors = false;
    project.toggles.removeDoors = false;
    project.toggles.internalDrawers = true;
    project.drawerDividersMap = {
      'div:int_1': true,
      'div:int_2': true,
      'div:int_3': true,
      'div:ext_1': true,
    };
    project.doorTrimMap = {
      d1_full: [{ axis: 'vertical', color: 'nickel', span: 'custom', sizeCm: 6 }],
    };
    applyModules(project, {
      modulesConfiguration: {
        0: { intDrawersList: [1, 2, 3], intDrawersSlot: 4, extDrawersCount: 2 },
        1: { intDrawersList: [1, 3], intDrawersSlot: 2, extDrawersCount: 2 },
      },
      stackSplitLowerModulesConfiguration: {
        0: { intDrawersList: [2], intDrawersSlot: 1, extDrawersCount: 1 },
      },
    });
    return createFingerprint({
      wardrobeType: 'hinged',
      boardMaterial: 'sandwich',
      doorStyle: 'post',
      groovesEnabled: false,
      grooveLinesCount: null,
      splitDoors: false,
      removeDoorsEnabled: false,
      internalDrawersEnabled: true,
      groovesMapCount: 0,
      grooveLinesCountMapCount: 0,
      splitDoorMapCount: 0,
      splitDoorBottomMapCount: 0,
      removedDoorMapCount: 0,
      doorTrimCount: 1,
      drawerDividerCount: 4,
      internalDrawerPlacementCount: 9,
      externalDrawerSelectionCount: 5,
    });
  },
};

export const cabinetDoorDrawerLayoutScenarioIds = Object.freeze(Object.keys(SCENARIO_BUILDERS));

export function createCabinetDoorDrawerLayoutFixture(sourceProject, scenario = 'mixed-layout') {
  const scenarioBuilder = SCENARIO_BUILDERS[scenario];
  if (!scenarioBuilder) {
    throw new Error(`Unknown cabinet door/drawer layout scenario: ${String(scenario)}`);
  }
  const project = cloneJson(asRecord(sourceProject));
  applyBaseCabinetDoorDrawerState(project);
  const expectedFingerprint = scenarioBuilder(project);
  return {
    scenario,
    project,
    expectedFingerprint,
  };
}

export function createCabinetDoorDrawerLayoutScenarioMatrix(
  sourceProject,
  scenarioIds = cabinetDoorDrawerLayoutScenarioIds
) {
  return Array.from(scenarioIds, scenario => createCabinetDoorDrawerLayoutFixture(sourceProject, scenario));
}
