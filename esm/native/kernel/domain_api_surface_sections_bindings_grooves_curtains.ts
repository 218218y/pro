import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { toggleGrooveKey } from '../runtime/maps_access.js';
import {
  commitCanonicalPrefixedMapValue,
  grooveMapSemantics,
  normalizePrefixedMapKey,
  shouldSkipCanonicalPrefixedMapCommit,
  type DomainApiSurfaceSectionBindings,
  type DomainApiSurfaceSectionBindingFactory,
  type DomainApiSurfaceSectionKey,
  type DomainApiSurfaceSectionsState,
  writeSimpleMapValueWithFallback,
} from './domain_api_surface_sections_shared.js';

function createGroovesSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    map: () => state._map('groovesMap'),
    isOn(partIdOrKey: unknown) {
      return state.readGrooveFlag(partIdOrKey);
    },
    hasAny() {
      const map = state.readGroovesMap();
      return !!map && typeof map === 'object' && Object.values(map).some(value => value === true);
    },
  };
}

function createGroovesActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    toggle(partIdOrKey: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:grooves:toggle');
      const grooveKey = normalizePrefixedMapKey(partIdOrKey, 'groove_');
      if (!grooveKey) return;
      const next = !state.readGrooveIsOn(partIdOrKey);
      if (
        shouldSkipCanonicalPrefixedMapCommit(
          state,
          'groovesMap',
          partIdOrKey,
          grooveMapSemantics,
          next ? true : null,
          grooveKey
        )
      )
        return;
      if (toggleGrooveKey(state.App, grooveKey, nextMeta)) return;
      return commitCanonicalPrefixedMapValue(
        state,
        'groovesMap',
        partIdOrKey,
        grooveMapSemantics,
        next ? true : null,
        nextMeta,
        grooveKey
      );
    },
    set(partIdOrKey: unknown, isOn: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:grooves:set');
      const grooveKey = normalizePrefixedMapKey(partIdOrKey, 'groove_');
      if (!grooveKey) return;
      const value = !!isOn ? true : null;
      return commitCanonicalPrefixedMapValue(
        state,
        'groovesMap',
        partIdOrKey,
        grooveMapSemantics,
        value,
        nextMeta,
        grooveKey
      );
    },
  };
}

function createCurtainsSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    map: () => state._map('curtainMap'),
    get(partId: unknown) {
      const key = String(partId || '');
      if (!key) return 'none';
      const value = state.readCurtainsMap()[key];
      return value == null || value === '' ? 'none' : String(value);
    },
  };
}

function createCurtainsActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    set(partId: unknown, preset: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:curtains:set');
      const value = preset === undefined || preset === null ? null : String(preset || 'none');
      return writeSimpleMapValueWithFallback(state, 'curtainMap', partId, value, nextMeta);
    },
  };
}

export const DOMAIN_API_GROOVES_CURTAINS_BINDING_FACTORIES: Pick<
  Record<DomainApiSurfaceSectionKey, DomainApiSurfaceSectionBindingFactory>,
  'groovesSelect' | 'groovesActions' | 'curtainsSelect' | 'curtainsActions'
> = {
  groovesSelect: createGroovesSelectBindings,
  groovesActions: createGroovesActionBindings,
  curtainsSelect: createCurtainsSelectBindings,
  curtainsActions: createCurtainsActionBindings,
};

export function createDomainApiGroovesCurtainsSectionBindings(
  state: DomainApiSurfaceSectionsState
): Pick<
  DomainApiSurfaceSectionBindings,
  'groovesSelect' | 'groovesActions' | 'curtainsSelect' | 'curtainsActions'
> {
  return {
    groovesSelect: DOMAIN_API_GROOVES_CURTAINS_BINDING_FACTORIES.groovesSelect(state),
    groovesActions: DOMAIN_API_GROOVES_CURTAINS_BINDING_FACTORIES.groovesActions(state),
    curtainsSelect: DOMAIN_API_GROOVES_CURTAINS_BINDING_FACTORIES.curtainsSelect(state),
    curtainsActions: DOMAIN_API_GROOVES_CURTAINS_BINDING_FACTORIES.curtainsActions(state),
  };
}
