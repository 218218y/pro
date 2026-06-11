import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { patchRuntime } from '../runtime/runtime_write_access.js';
import { setCfgCustomUploadedDataURL } from '../runtime/cfg_access.js';
import { readRuntimeFlag } from './domain_api_shared.js';
import type {
  DomainApiSurfaceSectionBindings,
  DomainApiSurfaceSectionBindingFactory,
  DomainApiSurfaceSectionKey,
  DomainApiSurfaceSectionsState,
} from './domain_api_surface_sections_shared.js';

function createViewSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    sketchMode: () => readRuntimeFlag(state._rt(), 'sketchMode', false),
  };
}

function createViewActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    setSketchMode(v: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:view:setSketchMode');
      return patchRuntime(state.App, { sketchMode: !!v }, nextMeta);
    },
  };
}

function createFlagsSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    globalClickMode: () => readRuntimeFlag(state._rt(), 'globalClickMode', true),
    isRestoring: () => readRuntimeFlag(state._rt(), 'restoring', false),
  };
}

function createFlagsActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    setGlobalClickMode(v: boolean, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:flags:setGlobalClickMode');
      return patchRuntime(state.App, { globalClickMode: !!v }, nextMeta);
    },
  };
}

function createTexturesSelectBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    customUploadedDataURL() {
      const cfg = state._cfg();
      return cfg && typeof cfg.customUploadedDataURL !== 'undefined'
        ? cfg.customUploadedDataURL || null
        : null;
    },
  };
}

function createTexturesActionBindings(state: DomainApiSurfaceSectionsState): UnknownRecord {
  return {
    setCustomUploadedDataURL(dataUrl: unknown, meta: ActionMetaLike | undefined) {
      const nextMeta = state._meta(meta, 'actions:textures:setCustomUploadedDataURL');
      const next = dataUrl === undefined || dataUrl === null || dataUrl === '' ? null : String(dataUrl);
      return setCfgCustomUploadedDataURL(state.App, next, nextMeta);
    },
  };
}

export const DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES: Pick<
  Record<DomainApiSurfaceSectionKey, DomainApiSurfaceSectionBindingFactory>,
  'viewSelect' | 'viewActions' | 'flagsSelect' | 'flagsActions' | 'texturesSelect' | 'texturesActions'
> = {
  viewSelect: createViewSelectBindings,
  viewActions: createViewActionBindings,
  flagsSelect: createFlagsSelectBindings,
  flagsActions: createFlagsActionBindings,
  texturesSelect: createTexturesSelectBindings,
  texturesActions: createTexturesActionBindings,
};

export function createDomainApiViewFlagsTexturesSectionBindings(
  state: DomainApiSurfaceSectionsState
): Pick<
  DomainApiSurfaceSectionBindings,
  'viewSelect' | 'viewActions' | 'flagsSelect' | 'flagsActions' | 'texturesSelect' | 'texturesActions'
> {
  return {
    viewSelect: DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES.viewSelect(state),
    viewActions: DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES.viewActions(state),
    flagsSelect: DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES.flagsSelect(state),
    flagsActions: DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES.flagsActions(state),
    texturesSelect: DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES.texturesSelect(state),
    texturesActions: DOMAIN_API_VIEW_FLAGS_TEXTURES_BINDING_FACTORIES.texturesActions(state),
  };
}
