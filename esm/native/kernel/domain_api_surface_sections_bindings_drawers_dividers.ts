import type { ActionMetaLike, DrawersOpenIdLike, UnknownRecord } from '../../../types';

import { getTools } from '../runtime/service_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';
import { toggleDivider } from '../runtime/maps_access.js';
import {
  shouldSkipSimpleMapWrite,
  toggleSimpleBooleanMapValueWithFallback,
  type DomainApiSurfaceSectionBindings,
  type DomainApiSurfaceSectionBindingFactory,
  type DomainApiSurfaceSectionKey,
  type DomainApiSurfaceSectionsState,
  writeSimpleMapValueWithFallback,
} from './domain_api_surface_sections_shared.js';

function createDrawersSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    openId() {
      const tools = getTools(state.App);
      if (typeof tools.getDrawersOpenId === 'function') return tools.getDrawersOpenId();
      return state._rt().drawersOpenId || null;
    },
  };
}

function createDrawersActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    setOpenId(id: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:drawers:setOpenId');
      const cleanId: DrawersOpenIdLike = typeof id === 'string' || typeof id === 'number' ? id : null;
      const tools = getTools(state.App);
      if (typeof tools.setDrawersOpenId === 'function') return tools.setDrawersOpenId(cleanId, nextMeta);
      return patchRuntime(state.App, { drawersOpenId: cleanId }, nextMeta);
    },
  };
}

function createDividersSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    map: () => state._map('drawerDividersMap'),
    isOn(dividerKey: unknown) {
      const key = String(dividerKey || '');
      if (!key) return false;
      const map = state.readDividersMap();
      return !!(map && typeof map === 'object' && map[key]);
    },
    has(primaryKey: unknown, altKey: unknown) {
      return state.readDividerIsOn(primaryKey) || (!!altKey && state.readDividerIsOn(altKey));
    },
  };
}

function createDividersActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    toggle(dividerKey: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:dividers:toggle');
      const key = String(dividerKey || '');
      if (!key) return;
      const nextValue = state.readDividerIsOn(key) ? null : true;
      if (shouldSkipSimpleMapWrite(state, 'drawerDividersMap', key, nextValue)) return;
      if (toggleDivider(state.App, dividerKey, nextMeta)) return;
      return toggleSimpleBooleanMapValueWithFallback(
        state,
        'drawerDividersMap',
        dividerKey,
        readKey => state.readDividerIsOn(readKey),
        nextMeta
      );
    },
    set(dividerKey: unknown, isOn: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:dividers:set');
      return writeSimpleMapValueWithFallback(
        state,
        'drawerDividersMap',
        dividerKey,
        !!isOn ? true : null,
        nextMeta
      );
    },
  };
}

export const DOMAIN_API_DRAWERS_DIVIDERS_BINDING_FACTORIES: Pick<
  Record<DomainApiSurfaceSectionKey, DomainApiSurfaceSectionBindingFactory>,
  'drawersSelect' | 'drawersActions' | 'dividersSelect' | 'dividersActions'
> = {
  drawersSelect: createDrawersSelectBindings,
  drawersActions: createDrawersActionBindings,
  dividersSelect: createDividersSelectBindings,
  dividersActions: createDividersActionBindings,
};

export function createDomainApiDrawersDividersSectionBindings(
  state: DomainApiSurfaceSectionsState
): Pick<
  DomainApiSurfaceSectionBindings,
  'drawersSelect' | 'drawersActions' | 'dividersSelect' | 'dividersActions'
> {
  return {
    drawersSelect: DOMAIN_API_DRAWERS_DIVIDERS_BINDING_FACTORIES.drawersSelect(state),
    drawersActions: DOMAIN_API_DRAWERS_DIVIDERS_BINDING_FACTORIES.drawersActions(state),
    dividersSelect: DOMAIN_API_DRAWERS_DIVIDERS_BINDING_FACTORIES.dividersSelect(state),
    dividersActions: DOMAIN_API_DRAWERS_DIVIDERS_BINDING_FACTORIES.dividersActions(state),
  };
}
