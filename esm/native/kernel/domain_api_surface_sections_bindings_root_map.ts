import type { ActionMetaLike, UnknownRecord } from '../../../types';

import {
  readMapKey,
  type DomainApiSurfaceSectionBindings,
  type DomainApiSurfaceSectionBindingFactory,
  type DomainApiSurfaceSectionKey,
  type DomainApiSurfaceSectionsState,
  writeSimpleMapValueWithFallback,
} from './domain_api_surface_sections_shared.js';

function createSelectRootBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    map: (mapName: unknown) => state._map(String(mapName || '')),
  };
}

function createMapActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    setKey(mapName: unknown, key: unknown, val: unknown, meta: ActionMetaLike | undefined) {
      const nextMapName = readMapKey(mapName);
      const nextMeta = state._meta(meta, 'actions:map:setKey:' + nextMapName);
      return writeSimpleMapValueWithFallback(state, nextMapName, key, val, nextMeta);
    },
  };
}

export const DOMAIN_API_ROOT_MAP_BINDING_FACTORIES: Pick<
  Record<DomainApiSurfaceSectionKey, DomainApiSurfaceSectionBindingFactory>,
  'selectRoot' | 'mapActions'
> = {
  selectRoot: createSelectRootBindings,
  mapActions: createMapActionBindings,
};

export function createDomainApiRootMapSectionBindings(
  state: DomainApiSurfaceSectionsState
): Pick<DomainApiSurfaceSectionBindings, 'selectRoot' | 'mapActions'> {
  return {
    selectRoot: DOMAIN_API_ROOT_MAP_BINDING_FACTORIES.selectRoot(state),
    mapActions: DOMAIN_API_ROOT_MAP_BINDING_FACTORIES.mapActions(state),
  };
}
