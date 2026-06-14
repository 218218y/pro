import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  AppContainer,
  RuntimeStateLike,
  UiStateLike,
  UnknownRecord,
  WardrobeType,
} from '../../../types';

import { patchUiSoft } from '../runtime/ui_write_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';
import {
  cfgBatch,
  cfgPatchWithReplaceKeys,
  setCfgCornerConfiguration,
  setCfgLowerModulesConfiguration,
  setCfgManualWidth,
  setCfgModulesConfiguration,
  setCfgWardrobeType,
} from '../runtime/cfg_access.js';
import { runAppStructuralModulesRecompute } from '../runtime/modules_recompute_request_policy.js';
import { patchViaActions } from '../runtime/actions_access_mutations.js';
import type { InstallDomainApiRoomSectionArgs, MetaNoBuildFn } from './domain_api_room_section_shared.js';
import {
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
  getDefaultPerDoorWidthForWardrobeType,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  canonicalizeWardrobeTypeProfileConfigSnapshot,
  cloneUiStateSnapshot,
  normalizeWardrobeType,
  pickUiForWardrobeTypeProfile,
  readWardrobeTypeProfiles,
} from './domain_api_room_section_shared.js';

export function installRoomWardrobeTypeSurface(args: InstallDomainApiRoomSectionArgs): void {
  const {
    App,
    select,
    actions,
    roomActions,
    _cfg,
    _ui,
    _rt,
    _captureConfigSnapshot,
    _ensureObj,
    _meta,
    _metaNoBuild,
    _metaNoBuildNoHistory,
    _domainApiReportNonFatal,
  } = args;

  select.room.wardrobeType =
    select.room.wardrobeType ||
    function () {
      const cfg = _cfg();
      const v = cfg && typeof cfg.wardrobeType !== 'undefined' ? cfg.wardrobeType : undefined;
      return normalizeWardrobeType(v);
    };

  roomActions.setWardrobeType =
    roomActions.setWardrobeType ||
    function (type: WardrobeType, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:room:setWardrobeType');
      const next = normalizeWardrobeType(type);
      let result: unknown = undefined;

      try {
        const cfg0 = _cfg() || {};
        const prev = normalizeWardrobeType(cfg0.wardrobeType);
        if (prev === next) return next;
        if (isNoMainWardrobeTypeTransitionBlocked(_ui(), prev, next)) return prev;

        try {
          const cfgSnap0 = _captureConfigSnapshot();

          const uiSnap0 = pickUiForWardrobeTypeProfile(_ui());
          const rt0 = _rt() || {};
          const profiles = readWardrobeTypeProfiles(App, rt0, _ensureObj, _domainApiReportNonFatal);

          const savedUi = cloneUiStateSnapshot(App, _ensureObj, _domainApiReportNonFatal, uiSnap0);
          profiles[prev] = {
            cfg: canonicalizeWardrobeTypeProfileConfigSnapshot(
              App,
              _ensureObj,
              _domainApiReportNonFatal,
              cfgSnap0,
              savedUi,
              prev
            ),
            ui: savedUi,
          };

          const rtPatch: RuntimeStateLike = { wardrobeTypeProfiles: profiles };
          const rtMeta = _metaNoBuildNoHistory(actions, meta, 'actions:room:setWardrobeType:save');
          patchRuntime(App, rtPatch, rtMeta);
        } catch (_eSave) {
          _domainApiReportNonFatal(App, 'domain_api_room:setWardrobeType:save', _eSave, { throttleMs: 6000 });
        }

        result = next;

        try {
          const rt1 = _rt() || {};
          const profiles1 = readWardrobeTypeProfiles(App, rt1, _ensureObj, _domainApiReportNonFatal);
          const saved = profiles1[next];

          if (saved && typeof saved === 'object') {
            restoreWardrobeTypeProfile(
              App,
              actions,
              _ensureObj,
              _metaNoBuild,
              _domainApiReportNonFatal,
              saved.cfg,
              saved.ui,
              next
            );
            return result;
          }

          initWardrobeTypeDefaults(App, actions, _metaNoBuild, next, meta);
        } catch (_eRestoreAll) {
          _domainApiReportNonFatal(App, 'domain_api_room:setWardrobeType:restore', _eRestoreAll, {
            throttleMs: 6000,
          });
        }
      } catch (_e0) {
        _domainApiReportNonFatal(App, 'domain_api_room:setWardrobeType', _e0, { throttleMs: 6000 });
      }

      return result;
    };
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readRoundedFiniteInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function readUiDoorsCount(ui: UiStateLike | null | undefined): number | null {
  const uiRec = asRecord(ui);
  const raw = asRecord(uiRec?.raw);
  return readRoundedFiniteInt(raw?.doors) ?? readRoundedFiniteInt(uiRec?.doors);
}

function isNoMainWardrobeTypeTransitionBlocked(
  ui: UiStateLike | null | undefined,
  prev: WardrobeType,
  next: WardrobeType
): boolean {
  return prev !== 'sliding' && next === 'sliding' && readUiDoorsCount(ui) === 0;
}

function hasOwnKey(value: unknown, key: string): boolean {
  return !!value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);
}

function createWardrobeTypeOpenStateResetPatch(): RuntimeStateLike {
  return {
    doorsOpen: false,
    drawersOpenId: null,
    doorsLastToggleTime: Date.now(),
  };
}

function markWardrobeTypeOpenStateBoundary(App: AppContainer): void {
  const appRec = asRecord(App);
  if (appRec) {
    appRec.__wpSkipNextLocalOpenCapture = true;
    appRec.__wpSkipNextLocalDoorSync = true;
  }

  const services = asRecord(appRec?.services);
  const doorsService = asRecord(services?.doors);
  const doorsRuntime = asRecord(doorsService?.runtime);
  if (!doorsRuntime) return;

  doorsRuntime.open = false;
  doorsRuntime.prevOpen = false;
  doorsRuntime.closeDelayUntil = 0;
  doorsRuntime.hardCloseUntil = 0;
  doorsRuntime.localOpenSnapshot = null;

  const editHold = asRecord(doorsRuntime.editHold);
  if (editHold) {
    editHold.active = false;
    editHold.snapshot = null;
    editHold.includeDrawers = false;
  } else {
    doorsRuntime.editHold = { active: false, snapshot: null, includeDrawers: false };
  }
}

function resetWardrobeTypeRuntimeOpenState(
  App: AppContainer,
  actions: ActionsNamespaceLike,
  _metaNoBuild: MetaNoBuildFn,
  source: string,
  meta?: ActionMetaLike | UnknownRecord | null
): void {
  markWardrobeTypeOpenStateBoundary(App);
  try {
    patchRuntime(App, createWardrobeTypeOpenStateResetPatch(), _metaNoBuild(actions, meta, source));
  } catch {
    // Best-effort fallback only: the canonical root patch path carries the same runtime reset.
  }
}

type StripSketchExternalDrawerResult<T> = {
  value: T;
  changed: boolean;
};

function hasSketchExtrasPayload(value: UnknownRecord): boolean {
  return Object.keys(value).length > 0;
}

function stripExternalDrawersFromSketchBox(value: unknown): StripSketchExternalDrawerResult<unknown> {
  const rec = asRecord(value);
  if (!rec) return { value, changed: false };

  let next: UnknownRecord | null = null;
  const ensureNext = (): UnknownRecord => {
    if (!next) next = { ...rec };
    return next;
  };

  if (hasOwnKey(rec, 'extDrawers')) {
    delete ensureNext().extDrawers;
  }

  const nestedBoxes = rec.boxes;
  if (Array.isArray(nestedBoxes)) {
    let boxesChanged = false;
    const boxes = nestedBoxes.map(box => {
      const stripped = stripExternalDrawersFromSketchBox(box);
      if (stripped.changed) boxesChanged = true;
      return stripped.value;
    });
    if (boxesChanged) ensureNext().boxes = boxes;
  }

  return next ? { value: next, changed: true } : { value, changed: false };
}

function stripExternalDrawersFromSketchExtras(
  value: unknown
): StripSketchExternalDrawerResult<UnknownRecord | null> {
  const rec = asRecord(value);
  if (!rec) return { value: null, changed: false };

  let next: UnknownRecord | null = null;
  const ensureNext = (): UnknownRecord => {
    if (!next) next = { ...rec };
    return next;
  };

  if (hasOwnKey(rec, 'extDrawers')) {
    delete ensureNext().extDrawers;
  }

  if (Array.isArray(rec.boxes)) {
    let boxesChanged = false;
    const boxes = rec.boxes.map(box => {
      const stripped = stripExternalDrawersFromSketchBox(box);
      if (stripped.changed) boxesChanged = true;
      return stripped.value;
    });
    if (boxesChanged) ensureNext().boxes = boxes;
  }

  if (!next) return { value: rec, changed: false };
  return { value: hasSketchExtrasPayload(next) ? next : null, changed: true };
}

function stripModuleSketchExternalDrawers(value: unknown): StripSketchExternalDrawerResult<unknown> {
  const rec = asRecord(value);
  if (!rec) return { value, changed: false };
  if (!hasOwnKey(rec, 'sketchExtras')) return { value, changed: false };

  const stripped = stripExternalDrawersFromSketchExtras(rec.sketchExtras);
  if (!stripped.changed) return { value, changed: false };

  const next: UnknownRecord = { ...rec };
  if (stripped.value) next.sketchExtras = stripped.value;
  else delete next.sketchExtras;
  return { value: next, changed: true };
}

function stripModuleListSketchExternalDrawers(value: unknown): StripSketchExternalDrawerResult<unknown> {
  if (!Array.isArray(value)) return { value, changed: false };

  let changed = false;
  const list = value.map(item => {
    const stripped = stripModuleSketchExternalDrawers(item);
    if (stripped.changed) changed = true;
    return stripped.value;
  });

  return changed ? { value: list, changed: true } : { value, changed: false };
}

function stripCornerSketchExternalDrawers(value: unknown): StripSketchExternalDrawerResult<unknown> {
  const rec = asRecord(value);
  if (!rec) return { value, changed: false };

  let next: UnknownRecord | null = null;
  const ensureNext = (): UnknownRecord => {
    if (!next) next = { ...rec };
    return next;
  };

  const rootModule = stripModuleSketchExternalDrawers(rec);
  if (rootModule.changed && asRecord(rootModule.value)) {
    const rootNext = rootModule.value as UnknownRecord;
    if (hasOwnKey(rootNext, 'sketchExtras')) ensureNext().sketchExtras = rootNext.sketchExtras;
    else delete ensureNext().sketchExtras;
  }

  const topModules = stripModuleListSketchExternalDrawers(rec.modulesConfiguration);
  if (topModules.changed) ensureNext().modulesConfiguration = topModules.value;

  const stackSplitLower = asRecord(rec.stackSplitLower);
  if (stackSplitLower) {
    const lowerModules = stripModuleListSketchExternalDrawers(stackSplitLower.modulesConfiguration);
    if (lowerModules.changed) {
      ensureNext().stackSplitLower = {
        ...stackSplitLower,
        modulesConfiguration: lowerModules.value,
      };
    }
  }

  return next ? { value: next, changed: true } : { value, changed: false };
}

function buildSlidingSketchExternalDrawersCleanupPatch(
  cfg: UnknownRecord | null | undefined,
  next: WardrobeType
): UnknownRecord {
  if (next !== 'sliding') return {};
  const rec = asRecord(cfg);
  if (!rec) return {};

  const patch: UnknownRecord = {};

  const topModules = stripModuleListSketchExternalDrawers(rec.modulesConfiguration);
  if (topModules.changed) patch.modulesConfiguration = topModules.value;

  const lowerModules = stripModuleListSketchExternalDrawers(rec.stackSplitLowerModulesConfiguration);
  if (lowerModules.changed) patch.stackSplitLowerModulesConfiguration = lowerModules.value;

  const cornerConfiguration = stripCornerSketchExternalDrawers(rec.cornerConfiguration);
  if (cornerConfiguration.changed) patch.cornerConfiguration = cornerConfiguration.value;

  const rootSketchExtras = stripExternalDrawersFromSketchExtras(rec.sketchExtras);
  if (rootSketchExtras.changed) patch.sketchExtras = rootSketchExtras.value;

  return patch;
}

const WARDROBE_TYPE_PROFILE_STRUCTURAL_KEYS = [
  'modulesConfiguration',
  'stackSplitLowerModulesConfiguration',
  'cornerConfiguration',
] as const;

function withWardrobeTypeProfileStructuralReplaceKeys(configPatch: UnknownRecord): UnknownRecord {
  const replaceKeys = WARDROBE_TYPE_PROFILE_STRUCTURAL_KEYS.filter(key => hasOwnKey(configPatch, key));
  return replaceKeys.length
    ? (cfgPatchWithReplaceKeys(configPatch, replaceKeys) as UnknownRecord)
    : configPatch;
}

function patchWardrobeTypeCanonicalState(
  App: AppContainer,
  actions: ActionsNamespaceLike,
  _metaNoBuild: MetaNoBuildFn,
  source: string,
  configPatch: UnknownRecord,
  uiPatch: UiStateLike,
  meta?: ActionMetaLike | UnknownRecord | null
): boolean {
  markWardrobeTypeOpenStateBoundary(App);
  return patchViaActions(
    App,
    {
      config: withWardrobeTypeProfileStructuralReplaceKeys({ ...configPatch }),
      ui: { ...uiPatch },
      runtime: createWardrobeTypeOpenStateResetPatch(),
    },
    _metaNoBuild(actions, meta, source)
  );
}

function restoreWardrobeTypeProfile(
  App: AppContainer,
  actions: ActionsNamespaceLike,
  _ensureObj: InstallDomainApiRoomSectionArgs['_ensureObj'],
  _metaNoBuild: MetaNoBuildFn,
  _domainApiReportNonFatal: InstallDomainApiRoomSectionArgs['_domainApiReportNonFatal'],
  cfgSaved: unknown,
  uiSaved: unknown,
  next: WardrobeType
): void {
  const uiPatch = ensureUiStatePatch(_ensureObj(uiSaved));
  const cfgPatch = canonicalizeWardrobeTypeProfileConfigSnapshot(
    App,
    _ensureObj,
    _domainApiReportNonFatal,
    cfgSaved,
    uiPatch,
    next
  );

  Object.assign(cfgPatch, buildSlidingSketchExternalDrawersCleanupPatch(cfgPatch, next));
  cfgPatch.wardrobeType = next;

  if (
    patchWardrobeTypeCanonicalState(
      App,
      actions,
      _metaNoBuild,
      'actions:room:setWardrobeType:restore',
      cfgPatch,
      uiPatch,
      { immediate: true }
    )
  ) {
    triggerRoomTypeRecompute(App, 'wardrobeType:restore');
    return;
  }

  resetWardrobeTypeRuntimeOpenState(
    App,
    actions,
    _metaNoBuild,
    'actions:room:setWardrobeType:restore:runtime',
    { immediate: true }
  );

  const restoreMeta = _metaNoBuild(actions, { immediate: true }, 'actions:room:setWardrobeType:restore');
  cfgBatch(
    App,
    function () {
      setCfgWardrobeType(App, next, restoreMeta);
      const cfgNoType = cfgPatch;
      delete cfgNoType.wardrobeType;
      for (const key of Object.keys(cfgNoType)) {
        if (key === 'modulesConfiguration') {
          setCfgModulesConfiguration(App, cfgNoType[key], restoreMeta);
        } else if (key === 'stackSplitLowerModulesConfiguration') {
          setCfgLowerModulesConfiguration(App, cfgNoType[key], restoreMeta);
        } else if (key === 'cornerConfiguration') {
          setCfgCornerConfiguration(App, cfgNoType[key], restoreMeta);
        } else if (key === 'isManualWidth') {
          setCfgManualWidth(App, cfgNoType[key], restoreMeta);
        } else {
          actions.setCfgScalar?.(key, cfgNoType[key], restoreMeta);
        }
      }
    },
    restoreMeta
  );

  patchUiSoft(
    App,
    uiPatch,
    _metaNoBuild(actions, { immediate: true }, 'actions:room:setWardrobeType:restore:ui')
  );

  triggerRoomTypeRecompute(App, 'wardrobeType:restore');
}

function initWardrobeTypeDefaults(
  App: AppContainer,
  actions: ActionsNamespaceLike,
  _metaNoBuild: MetaNoBuildFn,
  next: WardrobeType,
  meta: ActionMetaLike | UnknownRecord | null | undefined
): void {
  const rawPatch: Record<string, unknown> = {};
  const doorsI = getDefaultDoorsForWardrobeType(next);
  rawPatch.doors = doorsI;

  const perDoor = getDefaultPerDoorWidthForWardrobeType(next);
  rawPatch.width = doorsI * perDoor;
  rawPatch.depth = getDefaultDepthForWardrobeType(next);

  const uiPatch: UiStateLike = { raw: rawPatch };
  const configPatch = {
    wardrobeType: next,
    isManualWidth: false,
    modulesConfiguration: [],
    stackSplitLowerModulesConfiguration: [],
    cornerConfiguration: {},
  };
  if (
    patchWardrobeTypeCanonicalState(
      App,
      actions,
      _metaNoBuild,
      'actions:room:setWardrobeType:init',
      configPatch,
      uiPatch,
      meta
    )
  ) {
    triggerRoomTypeRecompute(App, 'wardrobeType:init');
    return;
  }

  resetWardrobeTypeRuntimeOpenState(
    App,
    actions,
    _metaNoBuild,
    'actions:room:setWardrobeType:init:runtime',
    meta
  );

  const m = _metaNoBuild(actions, meta, 'actions:room:setWardrobeType:init:autoWidth');
  setCfgWardrobeType(App, next, m);
  setCfgManualWidth(App, false, m);
  setCfgModulesConfiguration(App, [], m);
  setCfgLowerModulesConfiguration(App, [], m);
  setCfgCornerConfiguration(App, {}, m);

  const uiMeta = _metaNoBuild(actions, { immediate: true }, 'actions:room:setWardrobeType:init:ui');
  patchUiSoft(App, uiPatch, uiMeta);

  triggerRoomTypeRecompute(App, 'wardrobeType:init');
}

function triggerRoomTypeRecompute(App: AppContainer, reason: string): void {
  runAppStructuralModulesRecompute(
    App,
    null,
    null,
    { source: 'actions:room:setWardrobeType:recompute', force: true },
    { structureChanged: true },
    { source: 'actions:room:setWardrobeType:recomputeRecovery', reason }
  );
}

function ensureUiStatePatch(value: UnknownRecord | null | undefined): UiStateLike {
  return value ? { ...value } : {};
}
