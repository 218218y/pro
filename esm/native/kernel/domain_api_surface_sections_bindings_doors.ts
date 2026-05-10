import type { ActionMetaLike, HandleType, HingeDir, UnknownRecord } from '../../../types';

import {
  getDoorsOpenViaService,
  setDoorsOpenViaService,
  toggleDoorsViaService,
} from '../runtime/doors_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';
import { cfgBatch, setCfgGlobalHandleType, setCfgHandlesMap } from '../runtime/cfg_access.js';
import {
  splitBottomKey,
  splitKey,
  writeHandle,
  writeHinge,
  writeSplit,
  writeSplitBottom,
} from '../runtime/maps_access.js';
import { readUiRawIntFromSnapshot } from '../runtime/ui_raw_selectors.js';
import {
  canonicalRemovedDoorPartId,
  commitCanonicalMapValue,
  listRemovedDoorCleanupKeys,
  listRemovedDoorLookupKeys,
  patchCanonicalPrefixedMapFallback,
  shouldSkipCanonicalPrefixedMapCommit,
  shouldSkipSimpleMapWrite,
  splitDoorBottomMapSemantics,
  splitDoorMapSemantics,
  type DomainApiSurfaceSectionBindings,
  type DomainApiSurfaceSectionBindingFactory,
  type DomainApiSurfaceSectionKey,
  type DomainApiSurfaceSectionsState,
  writeSimpleMapValueWithFallback,
} from './domain_api_surface_sections_shared.js';

function createDoorsSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    count() {
      let n: number | null = null;
      const n0 = readUiRawIntFromSnapshot(state._ui(), 'doors', -999);
      if (Number.isFinite(n0) && n0 !== -999) n = n0;
      if (n == null) n = state._num(state._rt().wardrobeDoorsCount);
      if (n == null) n = 4;
      return Math.max(0, Math.round(n));
    },
    isOpen() {
      const open = getDoorsOpenViaService(state.App);
      if (open !== null) return !!open;
      return !!state._rt().doorsOpen;
    },
    splitMap: () => state._map('splitDoorsMap'),
    splitBottomMap: () => state._map('splitDoorsBottomMap'),
    removedMap: () => state._map('removedDoorsMap'),
    hingeMap: () => state._map('hingeMap'),
    handlesMap: () => state._map('handlesMap'),
    isRemoved(partId: unknown) {
      const map = state.readDoorsRemovedMap();
      return listRemovedDoorLookupKeys(partId).some(key => map[key] === true);
    },
    isSplit(doorBaseId: unknown) {
      return state.readSplitFlag(doorBaseId);
    },
    isSplitBottom(doorBaseId: unknown) {
      return state.readSplitBottomFlag(doorBaseId);
    },
    hingeDir(hingeKey: unknown, def: unknown) {
      const map = state.readDoorsHingeMap();
      const key = String(hingeKey || '');
      const value = key ? map[key] : null;
      return value === 'right' || value === 'left' ? value : def || 'left';
    },
    handleType(doorId: unknown, defaultHandleType: unknown) {
      const handlesMap = state.readDoorsHandlesMap();
      const id = String(doorId || '');
      const value =
        handlesMap && typeof handlesMap === 'object' && id && id in handlesMap ? handlesMap[id] : undefined;
      if (typeof value !== 'undefined' && value !== null && value !== '') return value;
      const globalHandleType =
        typeof state.doorsSelect.globalHandleType === 'function'
          ? state.doorsSelect.globalHandleType()
          : null;
      return globalHandleType != null ? globalHandleType : defaultHandleType || 'standard';
    },
    globalHandleType() {
      const cfg = state._cfg();
      return cfg && typeof cfg.globalHandleType !== 'undefined' ? cfg.globalHandleType || null : null;
    },
  };
}

function createDoorsActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    setOpen(open: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:setOpen');
      if (setDoorsOpenViaService(state.App, !!open, nextMeta)) return;
      return patchRuntime(state.App, { doorsOpen: !!open, doorsLastToggleTime: Date.now() }, nextMeta);
    },
    toggle(meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:toggle');
      if (toggleDoorsViaService(state.App, nextMeta)) return;
      return state.doorsActions.setOpen?.(!state.readDoorsIsOpen(), nextMeta);
    },
    setRemoved(doorId: unknown, isRemoved: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:setRemoved');
      const canonicalPartId = canonicalRemovedDoorPartId(doorId);
      if (!canonicalPartId) return;
      const removedKey = 'removed_' + canonicalPartId;
      const value = !!isRemoved ? true : null;
      const cleanupKeys = listRemovedDoorCleanupKeys(doorId);
      return commitCanonicalMapValue(state, 'removedDoorsMap', removedKey, value, nextMeta, cleanupKeys);
    },
    setSplit(doorId: unknown, isSplit: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:setSplit');
      const value = !!isSplit ? true : false;
      const canonicalKey = splitKey(doorId);
      if (
        shouldSkipCanonicalPrefixedMapCommit(
          state,
          'splitDoorsMap',
          doorId,
          splitDoorMapSemantics,
          value,
          canonicalKey
        )
      )
        return;
      if (writeSplit(state.App, doorId, !!isSplit, nextMeta)) return;
      return patchCanonicalPrefixedMapFallback(
        state,
        'splitDoorsMap',
        doorId,
        splitDoorMapSemantics,
        value,
        nextMeta,
        canonicalKey
      );
    },
    setSplitBottom(doorId: unknown, isOn: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:setSplitBottom');
      const value = !!isOn ? true : null;
      const canonicalKey = splitBottomKey(doorId);
      if (
        shouldSkipCanonicalPrefixedMapCommit(
          state,
          'splitDoorsBottomMap',
          doorId,
          splitDoorBottomMapSemantics,
          value,
          canonicalKey
        )
      )
        return;
      if (writeSplitBottom(state.App, doorId, !!isOn, nextMeta)) return;
      return patchCanonicalPrefixedMapFallback(
        state,
        'splitDoorsBottomMap',
        doorId,
        splitDoorBottomMapSemantics,
        value,
        nextMeta,
        canonicalKey
      );
    },
    setHinge(doorId: unknown, hinge: HingeDir | UnknownRecord | string, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:setHinge');
      const key = String(doorId || '');
      if (!key) return;
      if (shouldSkipSimpleMapWrite(state, 'hingeMap', key, hinge)) return;
      if (writeHinge(state.App, key, hinge, nextMeta)) return;
      return writeSimpleMapValueWithFallback(state, 'hingeMap', key, hinge, nextMeta);
    },
    setHandle(doorId: unknown, handleType: HandleType | string | null, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:setHandle');
      const key = String(doorId || '');
      if (!key) return;
      if (shouldSkipSimpleMapWrite(state, 'handlesMap', key, handleType)) return;
      if (writeHandle(state.App, key, handleType, nextMeta)) return;
      return writeSimpleMapValueWithFallback(state, 'handlesMap', key, handleType, nextMeta);
    },
    setGlobalHandleType(handleType: HandleType | string | null, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:doors:setGlobalHandleType');
      const nextType = typeof handleType === 'undefined' ? null : handleType;
      return cfgBatch(
        state.App,
        function () {
          setCfgGlobalHandleType(state.App, nextType, nextMeta);
          setCfgHandlesMap(state.App, {}, nextMeta);
        },
        nextMeta
      );
    },
  };
}

export const DOMAIN_API_DOORS_BINDING_FACTORIES: Pick<
  Record<DomainApiSurfaceSectionKey, DomainApiSurfaceSectionBindingFactory>,
  'doorsSelect' | 'doorsActions'
> = {
  doorsSelect: createDoorsSelectBindings,
  doorsActions: createDoorsActionBindings,
};

export function createDomainApiDoorsSectionBindings(
  state: DomainApiSurfaceSectionsState
): Pick<DomainApiSurfaceSectionBindings, 'doorsSelect' | 'doorsActions'> {
  return {
    doorsSelect: DOMAIN_API_DOORS_BINDING_FACTORIES.doorsSelect(state),
    doorsActions: DOMAIN_API_DOORS_BINDING_FACTORIES.doorsActions(state),
  };
}
