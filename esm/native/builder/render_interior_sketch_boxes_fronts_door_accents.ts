import { SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY } from '../../shared/dimensions/sketch_box_classic_door_visual_policy.js';
import { appendGrooveStrips } from './visuals_and_contents_door_visual_grooves.js';

import type { AppContainer, GrooveLayoutList } from '../../../types/index.js';
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
  grooveLayout?: GrooveLayoutList | null;
  groovesEnabled?: boolean;
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
    groovesEnabled = true,
  } = args;
  const accentMat = new THREE.MeshBasicMaterial({
    color: 0x2b2b2b,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  try {
    const accentMaterial = asMaterial(accentMat);
    if (accentMaterial) accentMaterial.__keepMaterial = true;
  } catch {
    // builder-material-metadata-fallback: keep-material metadata is advisory for generated door accents
  }

  const classicDims = SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY;
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
      ...readObject<InteriorValueRecord>(mesh.userData),
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

  const grooveSurfaceGroup = new THREE.Group();
  grooveSurfaceGroup.position?.set?.(slabLocalX, 0, 0);
  applySketchBoxPickMeta(grooveSurfaceGroup, doorPid, moduleKeyStr, bid, { door: true });
  grooveSurfaceGroup.userData = {
    ...readObject<InteriorValueRecord>(grooveSurfaceGroup.userData),
    __wpSketchBoxDoorId: doorId,
    __wpSketchFreePlacement: isFreePlacement === true,
  };
  doorGroup.add?.(grooveSurfaceGroup);
  appendGrooveStrips({
    App,
    THREE: THREE as never,
    visualGroup: grooveSurfaceGroup as never,
    tagDoorVisualPart(node) {
      applySketchBoxPickMeta(node as never, doorPid, moduleKeyStr, bid, { door: true });
    },
    hasGrooves: groovesEnabled && boxDoor.groove === true,
    isSketch: true,
    groovePartId: doorPid,
    zSign: 1,
    targetW: doorW,
    targetH: doorH,
    zOffset: doorD / 2,
    linesCountOverride: boxDoor.grooveLinesCount,
    grooveLayout: args.grooveLayout ?? null,
  });
}
