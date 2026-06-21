import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { resolveDrawerBoxPaintMaterial } from '../features/drawer_box_identity.js';
import { resolveBuilderMirrorMaterial } from '../runtime/builder_service_access.js';
import { createMaterialSnapshotBinding } from './materials_factory_material_policy.js';

import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { BuilderGetMaterialFactoryFn } from '../../../types';
import type { ApplySketchExternalDrawersArgs } from './render_interior_sketch_drawers_shared.js';
import type { SketchExternalDrawerRenderContext } from './render_interior_sketch_drawers_external_types.js';

import {
  readObject,
  resolveSketchExternalDrawerDoorFaceTopY,
  toFiniteNumber,
} from './render_interior_sketch_shared.js';
import {
  resolveSketchDoorStyle,
  resolveSketchDoorStyleMap,
} from './render_interior_sketch_input_contract.js';

export function createSketchExternalDrawerRenderContext(
  args: ApplySketchExternalDrawersArgs
): SketchExternalDrawerRenderContext | null {
  const {
    App,
    input,
    extDrawers,
    THREE,
    innerW,
    moduleDepth,
    internalDepth,
    effectiveTopY,
    woodThick,
    isFn,
  } = args;

  if (!extDrawers.length || !THREE) return null;

  const drawerDims = DRAWER_DIMENSIONS.sketch;
  const outerW = Math.max(drawerDims.externalPreviewMinWidthM, innerW);
  const outerD = Math.max(
    drawerDims.externalPreviewMinDepthM,
    moduleDepth > 0 ? moduleDepth : internalDepth + drawerDims.externalPreviewDepthClearanceM
  );
  const visualT = SKETCH_BOX_DIMENSIONS.preview.drawerPreviewThicknessM;
  const frontZ =
    toFiniteNumber(readObject<InteriorValueRecord>(input)?.externalFrontZ) ?? Math.max(0, outerD / 2);
  const outlineFn = isFn(input.addOutlines) ? input.addOutlines : null;
  const doorStyle = resolveSketchDoorStyle(input);
  const doorStyleMap = resolveSketchDoorStyleMap(input);
  const drawersArray = getDrawersArray(App);
  const doorFaceTopY = resolveSketchExternalDrawerDoorFaceTopY(effectiveTopY, woodThick);

  let didResolveMirrorMaterial = false;
  let cachedMirrorMaterial: unknown = null;
  const resolveCachedMirrorMaterial = () => {
    if (didResolveMirrorMaterial) return cachedMirrorMaterial;
    didResolveMirrorMaterial = true;
    try {
      cachedMirrorMaterial = resolveBuilderMirrorMaterial(
        App,
        THREE as never,
        { cfgSnapshot: input.cfgSnapshot, sketchMode: input.sketchMode },
        () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.01 })
      );
    } catch {
      cachedMirrorMaterial = null;
    }
    return cachedMirrorMaterial;
  };

  const inputRec = readObject<InteriorValueRecord>(input) || {};
  let didResolveDrawerBoxBaseMaterial = false;
  let cachedDrawerBoxBaseMaterial: unknown = null;
  const resolveDrawerBoxBaseMaterial = () => {
    if (didResolveDrawerBoxBaseMaterial) return cachedDrawerBoxBaseMaterial || args.bodyMat;
    didResolveDrawerBoxBaseMaterial = true;
    const explicitBase = inputRec.drawerBoxBaseMat || inputRec.drawerBoxMat || inputRec.whiteMat;
    if (explicitBase) {
      cachedDrawerBoxBaseMaterial = explicitBase;
      return cachedDrawerBoxBaseMaterial;
    }
    try {
      const services = readObject<InteriorValueRecord>(App.services);
      const builder = readObject<InteriorValueRecord>(services?.builder);
      const materials = readObject<InteriorValueRecord>(builder?.materials);
      const getMaterial = materials?.getMaterial;
      if (isFn(getMaterial)) {
        const getMaterialFactory = getMaterial as BuilderGetMaterialFactoryFn;
        cachedDrawerBoxBaseMaterial = createMaterialSnapshotBinding(getMaterialFactory, {
          cfgSnapshot: input.cfgSnapshot,
          sketchMode: input.sketchMode,
        })('#ffffff', 'body', false);
      }
    } catch {
      cachedDrawerBoxBaseMaterial = null;
    }
    return cachedDrawerBoxBaseMaterial || args.bodyMat;
  };

  const resolvePartMaterial = (partId: string): unknown => {
    try {
      if (isFn(args.getPartMaterial)) {
        const resolved = args.getPartMaterial(partId);
        if (resolved) return resolved;
      }
    } catch {
      // Keep sketch preview resilient: material lookup failures fall back to body material.
    }
    return args.bodyMat;
  };

  const resolveDrawerBoxMaterial = (drawerBoxPartId: string): unknown => {
    const fallbackMaterial = resolveDrawerBoxBaseMaterial();
    return resolveDrawerBoxPaintMaterial({
      drawerBoxPartId,
      fallbackMaterial,
      getPartColorValue: isFn(args.getPartColorValue) ? args.getPartColorValue : null,
      getPartMaterial: isFn(args.getPartMaterial) ? args.getPartMaterial : null,
    });
  };

  return {
    ...args,
    THREE,
    outerW,
    outerD,
    visualT,
    frontZ,
    outlineFn,
    doorStyle,
    doorStyleMap,
    drawersArray,
    doorFaceTopY,
    resolveCachedMirrorMaterial,
    resolvePartMaterial,
    resolveDrawerBoxMaterial,
  };
}
