// Tools runtime state installer (Pure ESM)
//
// Purpose:
// - Own transient "tool selection" runtime keys that historically lived on root slots.
// - Canonical store-backed state: store.runtime.*
// - Install stable helper fns onto App.services.tools so call sites can remain simple.
//
// Keys owned:
// - paintColor
// - handlesType
// - interiorManualTool
// - drawersOpenId (typed runtime scalar key)
//
// This is the canonical home for these helpers
// in the new Zustand-first architecture.

import type {
  ActionMetaLike,
  AppContainer,
  DrawersOpenIdLike,
  HandleType,
  RuntimeStateLike,
  ToolsNamespaceLike,
} from '../../../types/index.js';

import { getTools } from './service_access.js';
import { readRuntimeStateFromStore } from './root_state_access.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';
import { readRuntimeScalarOrDefaultFromStore } from './runtime_selectors.js';
import { setRuntimeScalar } from './runtime_write_access.js';
import { metaTransient } from './meta_profiles_access.js';

type RuntimeToolsState = Pick<
  RuntimeStateLike,
  'paintColor' | 'handlesType' | 'interiorManualTool' | 'drawersOpenId'
>;

type ToolsRuntimeMeta = ActionMetaLike | undefined;

function readToolsRuntimeState(App: AppContainer): RuntimeToolsState {
  return readRuntimeStateFromStore(getStoreSurfaceMaybe(App));
}

function normalizeHandleType(value: HandleType | string | null): HandleType {
  return value === 'edge' || value === 'none' ? value : 'standard';
}

function buildTransientMeta(App: AppContainer, meta?: ActionMetaLike): ActionMetaLike {
  return metaTransient(App, meta, 'tools:runtime');
}

export function installToolsRuntimeState(App: AppContainer): ToolsNamespaceLike {
  const tools = getTools(App);

  if (typeof tools.getPaintColor !== 'function') {
    tools.getPaintColor = function (): string | null {
      const r = readToolsRuntimeState(App);
      return typeof r.paintColor !== 'undefined' ? r.paintColor : null;
    };
  }
  if (typeof tools.setPaintColor !== 'function') {
    tools.setPaintColor = function (v: string | null, m?: ToolsRuntimeMeta) {
      setRuntimeScalar(App, 'paintColor', typeof v === 'undefined' ? null : v, buildTransientMeta(App, m));
    };
  }

  if (typeof tools.getHandlesType !== 'function') {
    tools.getHandlesType = function (): HandleType | string | null {
      const r = readToolsRuntimeState(App);
      return r.handlesType || 'standard';
    };
  }
  if (typeof tools.setHandlesType !== 'function') {
    tools.setHandlesType = function (v: HandleType | string | null, m?: ToolsRuntimeMeta) {
      setRuntimeScalar(App, 'handlesType', normalizeHandleType(v), buildTransientMeta(App, m));
    };
  }

  if (typeof tools.getInteriorManualTool !== 'function') {
    tools.getInteriorManualTool = function (): string | null {
      const r = readToolsRuntimeState(App);
      return typeof r.interiorManualTool !== 'undefined' ? r.interiorManualTool : null;
    };
  }
  if (typeof tools.setInteriorManualTool !== 'function') {
    tools.setInteriorManualTool = function (v: string | null, m?: ToolsRuntimeMeta) {
      setRuntimeScalar(
        App,
        'interiorManualTool',
        typeof v === 'undefined' ? null : v,
        buildTransientMeta(App, m)
      );
    };
  }

  if (typeof tools.getDrawersOpenId !== 'function') {
    tools.getDrawersOpenId = function (): DrawersOpenIdLike {
      return readRuntimeScalarOrDefaultFromStore(getStoreSurfaceMaybe(App), 'drawersOpenId', null);
    };
  }
  if (typeof tools.setDrawersOpenId !== 'function') {
    tools.setDrawersOpenId = function (v: DrawersOpenIdLike, m?: ToolsRuntimeMeta) {
      setRuntimeScalar(App, 'drawersOpenId', typeof v === 'undefined' ? null : v, buildTransientMeta(App, m));
    };
  }

  return tools;
}
