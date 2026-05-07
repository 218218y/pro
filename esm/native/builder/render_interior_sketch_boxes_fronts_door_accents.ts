import { CONTENT_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { normalizeGrooveLinesCount, resolveGrooveLinesCount } from './groove_lines_count.js';

import type { AppContainer } from '../../../types/index.js';
import type {
  InteriorGroupLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import { asMaterial, readObject } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta } from './render_interior_sketch_pick_meta.js';

export function appendClassicDoorAccentAndGrooves(args: {
  App: AppContainer;
  THREE: InteriorTHREESurface;
  doorGroup: InteriorGroupLike;
  doorPid: string;
  doorId: string;
  moduleKeyStr: string;
  bid: string;
  isFreePlacement: boolean;
  slabLocalX: number;
  doorW: number;
  doorH: number;
  doorD: number;
  boxDoor: { groove?: unknown; grooveLinesCount?: unknown };
}): void {
  const {
    App,
    THREE,
    doorGroup,
    doorPid,
    doorId,
    moduleKeyStr,
    bid,
    isFreePlacement,
    slabLocalX,
    doorW,
    doorH,
    doorD,
    boxDoor,
  } = args;
  const accentMat = new THREE.MeshBasicMaterial({
    color: 0x2b2b2b,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const grooveMat = new THREE.MeshBasicMaterial({
    color: 0x1f1f1f,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  try {
    const accentMaterial = asMaterial(accentMat);
    if (accentMaterial) accentMaterial.__keepMaterial = true;
    const grooveMaterial = asMaterial(grooveMat);
    if (grooveMaterial) grooveMaterial.__keepMaterial = true;
  } catch {
    // ignore
  }

  const classicDims = CONTENT_VISUAL_DIMENSIONS.sketchBoxClassic;
  const accentInset = Math.max(
    classicDims.accentInsetMinM,
    Math.min(classicDims.accentInsetMaxM, Math.min(doorW, doorH) * classicDims.accentInsetDoorRatio)
  );
  const accentT = Math.max(
    classicDims.accentLineThicknessMinM,
    Math.min(
      classicDims.accentLineThicknessMaxM,
      Math.min(doorW, doorH) * classicDims.accentLineThicknessDoorRatio
    )
  );
  const accentInnerW = Math.max(classicDims.accentInnerMinM, doorW - accentInset * 2);
  const accentInnerH = Math.max(classicDims.accentInnerMinM, doorH - accentInset * 2);
  const accentZ = doorD / 2 + classicDims.accentSurfaceOffsetM;
  const addAccent = (partId: string, w: number, h: number, x: number, y: number) => {
    if (!(w > 0) || !(h > 0)) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, classicDims.accentStripDepthM), accentMat);
    mesh.position?.set?.(slabLocalX + x, y, accentZ);
    mesh.renderOrder = 3;
    applySketchBoxPickMeta(mesh, partId, moduleKeyStr, bid, { door: true });
    mesh.userData = {
      ...(readObject<InteriorValueRecord>(mesh.userData) || {}),
      __wpSketchBoxDoorId: doorId,
      __wpSketchFreePlacement: isFreePlacement === true,
    };
    doorGroup.add?.(mesh);
  };
  addAccent(`${doorPid}_accent_top`, accentInnerW, accentT, 0, accentInnerH / 2 - accentT / 2);
  addAccent(`${doorPid}_accent_bottom`, accentInnerW, accentT, 0, -(accentInnerH / 2 - accentT / 2));
  addAccent(
    `${doorPid}_accent_left`,
    accentT,
    Math.max(classicDims.accentInnerMinM, accentInnerH),
    -(accentInnerW / 2 - accentT / 2),
    0
  );
  addAccent(
    `${doorPid}_accent_right`,
    accentT,
    Math.max(classicDims.accentInnerMinM, accentInnerH),
    accentInnerW / 2 - accentT / 2,
    0
  );

  if (boxDoor.groove === true) {
    const grooveFillMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.9,
    });
    try {
      const grooveFillMaterial = asMaterial(grooveFillMat);
      if (grooveFillMaterial) grooveFillMaterial.__keepMaterial = true;
    } catch {
      // ignore
    }
    const grooveCount =
      normalizeGrooveLinesCount(boxDoor.grooveLinesCount) ??
      resolveGrooveLinesCount(App, doorW, undefined, doorPid);
    const grooveGap = doorW / (grooveCount + 1);
    const grooveStripW = classicDims.grooveStripWidthM;
    const grooveStripH = Math.max(classicDims.grooveHeightMinM, doorH - classicDims.grooveHeightClearanceM);
    const grooveDepth = classicDims.grooveDepthM;
    const grooveZ = doorD / 2 + classicDims.grooveSurfaceOffsetM;
    for (let grooveIndex = 1; grooveIndex <= grooveCount; grooveIndex++) {
      const grooveX = -doorW / 2 + grooveIndex * grooveGap;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(grooveStripW, grooveStripH, grooveDepth),
        grooveFillMat
      );
      mesh.position?.set?.(slabLocalX + grooveX, 0, grooveZ);
      mesh.renderOrder = 4;
      applySketchBoxPickMeta(mesh, doorPid, moduleKeyStr, bid, { door: true });
      mesh.userData = {
        ...(readObject<InteriorValueRecord>(mesh.userData) || {}),
        __wpSketchBoxDoorId: doorId,
        __wpSketchFreePlacement: isFreePlacement === true,
      };
      doorGroup.add?.(mesh);
    }
  }
}
