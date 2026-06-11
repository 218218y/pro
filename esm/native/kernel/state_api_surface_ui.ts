import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  UiActionsNamespaceLike,
  UiRawScalarKey,
  UiRawScalarValueMap,
  UiSlicePatch,
  UnknownRecord,
} from '../../../types';
import { buildUiRawScalarPatch } from '../../../types/ui_raw.js';

import { asMeta, asUiPatch, buildUiScalarPatch, normMeta, shallowCloneObj } from './state_api_shared.js';
import type { MetaNs } from './state_api_shared.js';

interface StateApiSurfaceUiContext {
  actions: ActionsNamespaceLike;
  metaActionsNs: MetaNs | null;
  uiNs: UiActionsNamespaceLike;
  commitUiPatch(patch: UiSlicePatch, meta: ActionMetaLike): unknown;
  isObj(value: unknown): value is UnknownRecord;
  safeCall(fn: () => unknown): unknown;
}

export function installStateApiUiSurface(ctx: StateApiSurfaceUiContext): void {
  const { actions, metaActionsNs, uiNs, commitUiPatch, isObj, safeCall } = ctx;
  const uiOnlyMeta = (
    meta: ActionMetaLike | UnknownRecord | null | undefined,
    source: string
  ): ActionMetaLike => {
    const metaIn = asMeta(meta);
    return metaActionsNs && typeof metaActionsNs.uiOnly === 'function'
      ? metaActionsNs.uiOnly(metaIn, source)
      : normMeta(metaIn, source);
  };

  if (typeof uiNs.patch !== 'function') {
    uiNs.patch = function patch(uiPartial?: UiSlicePatch, meta?: ActionMetaLike) {
      return commitUiPatch(asUiPatch(uiPartial), normMeta(meta, 'actions.ui:patch'));
    };
  }
  if (typeof uiNs.patchSoft !== 'function') {
    uiNs.patchSoft = function patchSoft(uiPartial?: UiSlicePatch, meta?: ActionMetaLike) {
      const patch = asUiPatch(uiPartial);
      const metaIn = asMeta(meta);
      const src = typeof metaIn.source === 'string' && metaIn.source ? metaIn.source : 'actions.ui:patchSoft';
      const mm =
        metaActionsNs && typeof metaActionsNs.uiOnly === 'function'
          ? metaActionsNs.uiOnly(metaIn, src)
          : normMeta(metaIn, src);
      return commitUiPatch(patch, mm);
    };
  }
  if (typeof uiNs.setActiveTab !== 'function') {
    uiNs.setActiveTab = function setActiveTab(next: unknown, meta?: ActionMetaLike) {
      return uiNs.patchSoft?.(
        { activeTab: next == null ? '' : String(next) },
        normMeta(meta, 'actions.ui:setActiveTab')
      );
    };
  }
  if (typeof uiNs.setDoorStyle !== 'function') {
    uiNs.setDoorStyle = function setDoorStyle(style: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.(
        { doorStyle: style == null ? '' : String(style) },
        normMeta(meta, 'actions.ui:setDoorStyle')
      );
    };
  }
  if (typeof uiNs.setCorniceType !== 'function') {
    uiNs.setCorniceType = function setCorniceType(value: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.(
        { corniceType: value == null ? '' : String(value) },
        normMeta(meta, 'actions.ui:setCorniceType')
      );
    };
  }
  if (typeof uiNs.setColorChoice !== 'function') {
    uiNs.setColorChoice = function setColorChoice(choice: unknown, meta?: ActionMetaLike) {
      const v = choice == null ? '' : String(choice);
      if (!v) return undefined;
      return uiNs.patch?.({ colorChoice: v }, normMeta(meta, 'actions.ui:setColorChoice'));
    };
  }
  if (typeof uiNs.setFlag !== 'function') {
    uiNs.setFlag = function setFlag(key: unknown, on: unknown, meta?: ActionMetaLike) {
      const k = String(key == null ? '' : key).trim();
      if (!k || !/^[a-zA-Z0-9_]+$/.test(k)) return undefined;
      return uiNs.patch?.(buildUiScalarPatch(k, !!on), normMeta(meta, 'actions.ui:setFlag'));
    };
  }
  if (typeof uiNs.setNotesEnabled !== 'function') {
    uiNs.setNotesEnabled = function setNotesEnabled(on: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.({ notesEnabled: !!on }, uiOnlyMeta(meta, 'actions.ui:setNotesEnabled'));
    };
  }
  if (typeof uiNs.setGlobalClickUi !== 'function') {
    uiNs.setGlobalClickUi = function setGlobalClickUi(on: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.({ globalClickMode: !!on }, uiOnlyMeta(meta, 'actions.ui:setGlobalClickUi'));
    };
  }
  if (typeof uiNs.setShowContents !== 'function') {
    uiNs.setShowContents = function setShowContents(on: unknown, meta?: ActionMetaLike) {
      const enabled = !!on;
      return uiNs.patch?.(
        { showContents: enabled, showHanger: enabled ? false : true },
        normMeta(meta, 'actions.ui:setShowContents')
      );
    };
  }
  if (typeof uiNs.setShowHanger !== 'function') {
    uiNs.setShowHanger = function setShowHanger(on: unknown, meta?: ActionMetaLike) {
      const enabled = !!on;
      return uiNs.patch?.(
        enabled ? { showHanger: true, showContents: false } : { showHanger: false },
        normMeta(meta, 'actions.ui:setShowHanger')
      );
    };
  }
  if (typeof uiNs.setCurrentFloorType !== 'function') {
    uiNs.setCurrentFloorType = function setCurrentFloorType(value: unknown, meta?: ActionMetaLike) {
      return uiNs.patchSoft?.(
        { currentFloorType: value == null ? '' : String(value) },
        uiOnlyMeta(meta, 'actions.ui:setCurrentFloorType')
      );
    };
  }
  if (typeof uiNs.setCurrentLayoutType !== 'function') {
    uiNs.setCurrentLayoutType = function setCurrentLayoutType(value: unknown, meta?: ActionMetaLike) {
      return uiNs.patchSoft?.(
        { currentLayoutType: value == null ? '' : String(value) },
        uiOnlyMeta(meta, 'actions.ui:setCurrentLayoutType')
      );
    };
  }
  if (typeof uiNs.setGridDivisionsState !== 'function') {
    uiNs.setGridDivisionsState = function setGridDivisionsState(
      divisions: unknown,
      perCellGridMap: unknown,
      activeGridCellId: unknown,
      meta?: ActionMetaLike
    ) {
      const divsNum = typeof divisions === 'number' ? divisions : parseFloat(String(divisions || ''));
      const divs = Number.isFinite(divsNum) ? divsNum : 4;
      const perCell = isObj(perCellGridMap) ? shallowCloneObj(perCellGridMap) : undefined;
      const active = activeGridCellId == null ? null : String(activeGridCellId || '') || null;
      const patch: UiSlicePatch = { currentGridDivisions: divs, activeGridCellId: active };
      if (typeof perCell !== 'undefined') patch.perCellGridMap = perCell;
      return uiNs.patchSoft?.(patch, uiOnlyMeta(meta, 'actions.ui:setGridDivisionsState'));
    };
  }
  if (typeof uiNs.setGridShelfVariantState !== 'function') {
    uiNs.setGridShelfVariantState = function setGridShelfVariantState(
      variant: unknown,
      meta?: ActionMetaLike
    ) {
      const raw = variant == null ? '' : String(variant || '');
      const v0 = raw.trim().toLowerCase();
      const v = v0 === 'regular' || v0 === 'double' || v0 === 'glass' || v0 === 'brace' ? v0 : 'regular';
      return uiNs.patchSoft?.(
        { currentGridShelfVariant: v },
        uiOnlyMeta(meta, 'actions.ui:setGridShelfVariantState')
      );
    };
  }
  if (typeof uiNs.setExtDrawerSelection !== 'function') {
    uiNs.setExtDrawerSelection = function setExtDrawerSelection(
      drawerType: unknown,
      count: unknown,
      meta?: ActionMetaLike
    ) {
      const countNum = typeof count === 'number' ? count : parseFloat(String(count || ''));
      return uiNs.patchSoft?.(
        {
          currentExtDrawerType: drawerType == null ? '' : String(drawerType || ''),
          currentExtDrawerCount: Number.isFinite(countNum) ? countNum : 2,
        },
        uiOnlyMeta(meta, 'actions.ui:setExtDrawerSelection')
      );
    };
  }
  if (typeof uiNs.setBaseType !== 'function') {
    uiNs.setBaseType = function setBaseType(value: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.(
        { baseType: value == null ? '' : String(value) },
        normMeta(meta, 'actions.ui:setBaseType')
      );
    };
  }
  if (typeof uiNs.setHingeDirection !== 'function') {
    uiNs.setHingeDirection = function setHingeDirection(on: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.({ hingeDirection: !!on }, uiOnlyMeta(meta, 'actions.ui:setHingeDirection'));
    };
  }
  if (typeof uiNs.setStructureSelect !== 'function') {
    uiNs.setStructureSelect = function setStructureSelect(value: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.(
        { structureSelect: value == null ? '' : String(value) },
        normMeta(meta, 'actions.ui:setStructureSelect')
      );
    };
  }
  if (typeof uiNs.setSingleDoorPos !== 'function') {
    uiNs.setSingleDoorPos = function setSingleDoorPos(value: unknown, meta?: ActionMetaLike) {
      return uiNs.patch?.(
        { singleDoorPos: value == null ? '' : String(value) },
        normMeta(meta, 'actions.ui:setSingleDoorPos')
      );
    };
  }
  if (typeof uiNs.setRawScalar !== 'function') {
    uiNs.setRawScalar = function setRawScalar(
      key: UiRawScalarKey | string,
      value: UiRawScalarValueMap[UiRawScalarKey] | unknown,
      meta?: ActionMetaLike
    ) {
      const k = String(key == null ? '' : key);
      if (!k) return undefined;
      return actions.setUiRawScalar?.(k, value, normMeta(meta, 'actions.ui:setRawScalar'));
    };
  }
  if (typeof uiNs.setScalar !== 'function') {
    uiNs.setScalar = function setScalar(key: string, value: unknown, meta?: ActionMetaLike) {
      const k = String(key == null ? '' : key);
      if (!k || typeof value === 'function') return undefined;
      return uiNs.patch?.(buildUiScalarPatch(k, value), normMeta(meta, 'actions.ui:setScalar'));
    };
  }
  if (typeof uiNs.setScalarSoft !== 'function') {
    uiNs.setScalarSoft = function setScalarSoft(key: string, value: unknown, meta?: ActionMetaLike) {
      const fn = uiNs['setScalar'];
      if (typeof fn !== 'function') return undefined;
      return fn(key, value, uiOnlyMeta(meta, 'actions.ui:setScalarSoft'));
    };
  }
  if (typeof actions.commitUiSnapshot !== 'function') {
    actions.commitUiSnapshot = function commitUiSnapshot(uiSnapshot?: UnknownRecord, meta?: ActionMetaLike) {
      const snap = isObj(uiSnapshot) ? { ...uiSnapshot } : {};
      return commitUiPatch(
        asUiPatch({ ...snap, __snapshot: true, __capturedAt: Date.now() }),
        normMeta(meta, 'actions:commitUiSnapshot')
      );
    };
  }
  if (typeof actions.setUiRawScalar !== 'function') {
    actions.setUiRawScalar = function setUiRawScalar<K extends UiRawScalarKey>(
      key: K | string,
      value: UiRawScalarValueMap[K] | unknown,
      meta?: ActionMetaLike
    ) {
      const mergedMeta = normMeta(meta, 'actions:setUiRawScalar');
      return safeCall(() => {
        const k = String(key == null ? '' : key);
        if (!k || typeof value === 'function') return undefined;
        return uiNs.patch?.({ raw: buildUiRawScalarPatch(k, value) }, mergedMeta);
      });
    };
  }
}
