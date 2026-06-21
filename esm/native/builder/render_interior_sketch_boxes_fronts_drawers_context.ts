import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveDrawerBoxPaintMaterial } from '../features/drawer_box_identity.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { resolveBuilderMirrorMaterial } from '../runtime/builder_service_access.js';
import { readSketchBoxRegularExternalDrawersForRender } from '../features/sketch_box_regular_external_drawers.js';
import { createMaterialSnapshotBinding } from './materials_factory_material_policy.js';

import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { BuilderGetMaterialFactoryFn } from '../../../types';
import type {
  RenderSketchBoxExternalDrawersArgs,
  SketchBoxExternalDrawersContext,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { asRecordArray, readObject } from './render_interior_sketch_shared.js';

export function createSketchBoxExternalDrawersContext(
  args: RenderSketchBoxExternalDrawersArgs
): SketchBoxExternalDrawersContext | null {
  const { frontsArgs } = args;
  const { shell, resolveBoxDrawerSpan } = frontsArgs;
  const {
    App,
    input,
    group,
    woodThick,
    shelfThick,
    moduleIndex,
    moduleKeyStr,
    createDoorVisual,
    THREE,
    isFn,
  } = frontsArgs.args;
  const { box, geometry: boxGeo, innerBottomY, innerTopY } = shell;

  const boxExtDrawers = asRecordArray<InteriorValueRecord>(box.extDrawers);
  const renderBoxExtDrawers = boxExtDrawers.concat(
    readSketchBoxRegularExternalDrawersForRender(box) as InteriorValueRecord[]
  );
  if (!(renderBoxExtDrawers.length && THREE)) return null;

  const drawerDims = DRAWER_DIMENSIONS.sketch;
  const outerD = Math.max(drawerDims.externalPreviewMinDepthM, boxGeo.outerD);
  const visualT = SKETCH_BOX_DIMENSIONS.preview.drawerPreviewThicknessM;
  const frontZ = Number.isFinite(shell.frontZ) ? shell.frontZ : boxGeo.centerZ + boxGeo.outerD / 2;
  const drawersArray = getDrawersArray(App);
  const createInternalDrawerBox = input.createInternalDrawerBox;
  const inputRec = readObject<InteriorValueRecord>(input) || {};

  let didResolveDrawerBoxBaseMaterial = false;
  let cachedDrawerBoxBaseMaterial: unknown = null;
  const resolveDrawerBoxBaseMaterial = () => {
    if (didResolveDrawerBoxBaseMaterial) return cachedDrawerBoxBaseMaterial || shell.boxMat;
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
    return cachedDrawerBoxBaseMaterial || shell.boxMat;
  };

  const resolveDrawerBoxMaterial = (drawerBoxPartId: string): unknown => {
    const fallbackMaterial = resolveDrawerBoxBaseMaterial();
    return resolveDrawerBoxPaintMaterial({
      drawerBoxPartId,
      fallbackMaterial,
      getPartColorValue: isFn(frontsArgs.args.getPartColorValue) ? frontsArgs.args.getPartColorValue : null,
      getPartMaterial: partId => args.resolvePartMaterial(partId, fallbackMaterial),
    });
  };

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

  const clampDrawerCenterY = (centerY: number, stackH: number): number => {
    const lo = innerBottomY + stackH / 2;
    const hi = innerTopY - woodThick - stackH / 2;
    if (!(hi > lo)) return Math.max(innerBottomY + woodThick, Math.min(innerTopY - woodThick, centerY));
    return Math.max(lo, Math.min(hi, centerY));
  };

  return {
    ...args,
    shell,
    resolveBoxDrawerSpan,
    App,
    input,
    group,
    woodThick,
    shelfThick,
    moduleIndex,
    moduleKeyStr,
    createDoorVisual,
    THREE,
    isFn,
    boxExtDrawers: renderBoxExtDrawers,
    createInternalDrawerBox,
    outerD,
    visualT,
    frontZ,
    drawersArray,
    resolveCachedMirrorMaterial,
    clampDrawerCenterY,
    resolveDrawerBoxMaterial,
  };
}
