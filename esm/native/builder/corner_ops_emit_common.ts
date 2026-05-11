// Shared corner-ops helpers.
//
// Keep tiny shared runtime seams here so the heavy connector/wing emitters can
// stay focused on geometry/material policy rather than mode-store probing.

import { readModeStateFromStore } from '../runtime/root_state_access.js';
import { MODES } from '../runtime/api.js';

import type { AppContainer, Object3DLike, ThreeLike, UnknownCallable, UnknownRecord } from '../../../types';

type CornerWingMaterialsResult = ReturnType<typeof import('./corner_materials.js').createCornerWingMaterials>;

type ShadowNodeLike = Object3DLike & {
  castShadow?: boolean;
  receiveShadow?: boolean;
  isMesh?: boolean;
  material?: { transparent?: boolean; opacity?: number } | null | undefined;
  traverse?: (fn: (obj: ShadowNodeLike) => void) => void;
};

export interface CornerOpsEmitContext extends UnknownRecord {
  App: AppContainer;
  THREE: ThreeLike;
  mainD: number;
  woodThick: number;
  startY: number;
  wingH: number;
  wingD: number;
  wingW: number;
  activeWidth: number;
  blindWidth: number;
  uiAny: UnknownRecord;
  cornerWallL: number;
  roomCornerX: number;
  roomCornerZ: number;
  __mirrorX: number;
  __stackKey: string;
  __stackSplitEnabled: boolean;
  __stackOffsetZ: number;
  stackOffsetY: number;
  baseType: string;
  baseLegStyle: string;
  baseLegColor: string;
  basePlinthHeightCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseH: number;
  cabinetBodyHeight: number;
  cornerConnectorEnabled: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
  __cfg: unknown;
  config: unknown;
  __stackScopePartKey: (partId: unknown) => string;
  __handlesMap: unknown;
  __doorSpecialMap: unknown;
  __individualColors: Record<string, unknown>;
  backPanelMaterialArray: unknown[];
  bodyMat: unknown;
  frontMat: unknown;
  wingGroup: Object3DLike;
  __isDoorRemoved: (partId: unknown) => boolean;
  __readScopedMapVal: CornerWingMaterialsResult['readScopedMapVal'];
  __readScopedReader: CornerWingMaterialsResult['readScopedReader'];
  __getMirrorMat: CornerWingMaterialsResult['getMirrorMat'];
  __resolveSpecial: CornerWingMaterialsResult['resolveSpecial'];
  getCornerMat: CornerWingMaterialsResult['getCornerMat'];
  addOutlines: (obj: unknown) => unknown;
  getMaterial: UnknownCallable;
  __applyStableShadowsToModule: (obj: ShadowNodeLike | null | undefined) => void;
  __sketchMode: boolean;
  [k: string]: unknown;
}

type AppWithStore = { store?: unknown };
type ModeStateLike = { primary?: unknown };
type ModesLike = { NONE?: unknown };

function asModesLike(value: unknown): ModesLike | null {
  return value && typeof value === 'object' ? value : null;
}

function asAppWithStore(value: unknown): AppWithStore | null {
  return value && typeof value === 'object' ? value : null;
}

function asModeStateLike(value: unknown): ModeStateLike | null {
  return value && typeof value === 'object' ? value : null;
}

function readNoneMode(): string {
  const modes = asModesLike(MODES);
  return typeof modes?.NONE === 'string' ? modes.NONE : 'none';
}

function readStore(app: unknown): unknown {
  return asAppWithStore(app)?.store;
}

function readPrimaryMode(app: unknown): string | null {
  const modeState = asModeStateLike(readModeStateFromStore(readStore(app)));
  return typeof modeState?.primary === 'string' ? modeState.primary : null;
}

export function isPrimaryMode(App: unknown, modeId: unknown): boolean {
  const NONE = readNoneMode();
  const target = String(modeId || '');
  if (!target) return false;
  try {
    const primary = readPrimaryMode(App) ?? NONE;
    return String(primary || NONE) === target;
  } catch {
    return NONE === target;
  }
}
