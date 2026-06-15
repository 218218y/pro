// Post-build sketch external-drawer door-cut runtime resolver assembly (Pure ESM)
//
// Owns runtime surface resolution for segmented sketch-door rebuild flows.

import { resolveConfiguredHandleColor } from './handle_finish_runtime.js';
import {
  EDGE_HANDLE_VARIANT_GLOBAL_KEY,
  edgeHandleVariantPartKey,
  normEdgeHandleVariant,
} from './handles_shared.js';
import { readDoorStyleMap } from '../features/door_style_overrides.js';
import { readManualHandlePositionForPart } from '../features/manual_handle_position.js';
import { makeDoorRemovalChecker } from './doors_state_utils.js';
import { readDoorVisualMapValue, readDoorVisualMirrorLayout } from './door_visual_lookup_state.js';
import { resolveSketchGroovesEnabledFromBuildContext } from './render_interior_sketch_grooves_visibility.js';

import {
  asRecord,
  readCtxCreateSurface,
  readCtxResolversSurface,
  readCtxStringsSurface,
  readFunction,
  readKey,
} from './post_build_extras_shared.js';

import type {
  SketchDoorCutsRuntime,
  SketchDoorCutsRuntimeArgs,
} from './post_build_sketch_door_cuts_contracts.js';

export function createSketchDoorCutsRuntime(args: SketchDoorCutsRuntimeArgs): SketchDoorCutsRuntime {
  const { App, THREE, ctx, cfg, bodyMat, globalFrontMat, getMirrorMaterial = null } = args;
  const stackKey = args.stackKey === 'bottom' ? 'bottom' : 'top';
  const createRec = readCtxCreateSurface(ctx);
  const resolversRec = readCtxResolversSurface(ctx);
  const stringsRec = readCtxStringsSurface(ctx);

  const createDoorVisual = readFunction(createRec, 'createDoorVisual');
  const createHandleMesh = readFunction(createRec, 'createHandleMesh');
  const getHandleType = readFunction(resolversRec, 'getHandleType');
  const getPartMaterial = readFunction(resolversRec, 'getPartMaterial');
  const doorStyle = (() => {
    const raw = readKey(stringsRec, 'doorStyle');
    return typeof raw === 'string' && raw ? raw : '';
  })();

  const groovesMap = asRecord(readKey(cfg, 'groovesMap'));
  const groovesEnabled = resolveSketchGroovesEnabledFromBuildContext(ctx);
  const doorTrimMap = asRecord(readKey(cfg, 'doorTrimMap'));
  const curtainMap = asRecord(readKey(cfg, 'curtainMap'));
  const specialMap = asRecord(readKey(cfg, 'doorSpecialMap'));
  const mirrorLayoutMap = asRecord(readKey(cfg, 'mirrorLayoutMap'));
  const doorStyleMap = readDoorStyleMap(readKey(cfg, 'doorStyleMap'));
  const isDoorRemoved = makeDoorRemovalChecker(cfg);
  const handlesMap = asRecord(readKey(cfg, 'handlesMap'));

  const resolveCurtain = (partId: string): string | null => {
    const raw = readDoorVisualMapValue(curtainMap, partId);
    return typeof raw === 'string' && raw && raw !== 'none' ? raw : null;
  };
  const resolveSpecial = (partId: string, curtain: string | null): 'mirror' | 'glass' | null => {
    const raw = readDoorVisualMapValue(specialMap, partId);
    if (raw === 'mirror' || raw === 'glass') return raw;
    return curtain ? 'glass' : null;
  };
  const resolveHandleType = (partId: string): string => {
    try {
      const value = getHandleType ? getHandleType(partId, stackKey) : null;
      return typeof value === 'string' && value ? value : 'standard';
    } catch {
      return 'standard';
    }
  };
  const resolveMirrorLayout = (partId: string): unknown =>
    readDoorVisualMirrorLayout(mirrorLayoutMap, partId);
  const resolveHandleColor = (partId: string): string =>
    resolveConfiguredHandleColor(readKey(cfg, 'handlesMap'), partId);
  const stripSuffix = (partId: string): string => partId.replace(/_(top|mid\d*|bot|full)$/, '');
  const resolveManualHandlePosition = (partId: string) => {
    const base = stripSuffix(partId);
    return readManualHandlePositionForPart(handlesMap, partId, base);
  };
  const readHandleOverride = (key: string): string | undefined => {
    if (!handlesMap || !Object.prototype.hasOwnProperty.call(handlesMap, key)) return undefined;
    const value = handlesMap[key];
    return value == null || value === '' ? undefined : String(value);
  };
  const resolveEdgeHandleVariant = (partId: string): 'short' | 'long' => {
    const base = stripSuffix(partId);
    const partValue =
      readHandleOverride(edgeHandleVariantPartKey(partId)) ??
      (base !== partId ? readHandleOverride(edgeHandleVariantPartKey(base)) : undefined);
    if (partValue === 'long') return 'long';
    if (partValue === 'short') return 'short';
    return normEdgeHandleVariant(readHandleOverride(EDGE_HANDLE_VARIANT_GLOBAL_KEY));
  };

  return {
    App,
    THREE,
    bodyMat,
    globalFrontMat,
    createDoorVisual,
    createHandleMesh,
    getPartMaterial,
    getMirrorMaterial,
    resolveHandleType,
    resolveEdgeHandleVariant,
    resolveHandleColor,
    resolveManualHandlePosition,
    resolveCurtain,
    resolveSpecial,
    doorStyle,
    doorStyleMap,
    groovesMap,
    groovesEnabled,
    doorTrimMap,
    resolveMirrorLayout,
    isDoorRemoved,
  };
}
