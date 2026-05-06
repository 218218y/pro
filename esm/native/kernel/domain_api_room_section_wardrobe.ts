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

        try {
          const cfgSnap0 = _captureConfigSnapshot();
          delete cfgSnap0.wardrobeType;

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
              savedUi
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

function patchWardrobeTypeCanonicalState(
  App: AppContainer,
  actions: ActionsNamespaceLike,
  _metaNoBuild: MetaNoBuildFn,
  source: string,
  configPatch: UnknownRecord,
  uiPatch: UiStateLike,
  meta?: ActionMetaLike | UnknownRecord | null
): boolean {
  return patchViaActions(
    App,
    {
      config: { ...configPatch },
      ui: { ...uiPatch },
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
    uiPatch
  );

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
  if (
    patchWardrobeTypeCanonicalState(
      App,
      actions,
      _metaNoBuild,
      'actions:room:setWardrobeType:init',
      { wardrobeType: next, isManualWidth: false },
      uiPatch,
      meta
    )
  ) {
    triggerRoomTypeRecompute(App, 'wardrobeType:init');
    return;
  }

  const m = _metaNoBuild(actions, meta, 'actions:room:setWardrobeType:init:autoWidth');
  setCfgWardrobeType(App, next, m);
  setCfgManualWidth(App, false, m);

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
    { source: 'actions:room:setWardrobeType:recomputeFallback', reason }
  );
}

function ensureUiStatePatch(value: UnknownRecord | null | undefined): UiStateLike {
  return value ? { ...value } : {};
}
