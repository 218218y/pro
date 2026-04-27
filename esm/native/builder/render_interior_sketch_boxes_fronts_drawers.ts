import { computeExternalDrawersOpsForModule } from './pure_api.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { resolveBuilderMirrorMaterial } from '../runtime/builder_service_access.js';
import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';

import type { DrawerVisualEntryLike } from '../../../types';
import type { InteriorGroupLike, InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';

import {
  applySketchExternalDrawerFaceOverrides,
  asMesh,
  asRecordArray,
  asValueRecord,
  readObject,
  resolveSketchExternalDrawerFaceVerticalAlignment,
  toFiniteNumber,
} from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta, applySketchBoxPickMetaDeep } from './render_interior_sketch_pick_meta.js';
import { resolveSketchFrontVisualState } from './render_interior_sketch_visuals_door_state.js';

import type {
  SketchBoxPartMaterialResolver,
  SketchDoorStyle,
  SketchDoorStyleMap,
} from './render_interior_sketch_boxes_fronts_support.js';

export type RenderSketchBoxExternalDrawersArgs = {
  frontsArgs: RenderSketchBoxFrontsArgs;
  doorStyle: SketchDoorStyle;
  doorStyleMap: SketchDoorStyleMap;
  resolvePartMaterial: SketchBoxPartMaterialResolver;
};

export function renderSketchBoxExternalDrawers(args: RenderSketchBoxExternalDrawersArgs): void {
  const { frontsArgs, doorStyle, doorStyleMap, resolvePartMaterial } = args;
  const { shell, resolveBoxDrawerSpan } = frontsArgs;
  const { App, input, group, woodThick, moduleIndex, moduleKeyStr, createDoorVisual, THREE, isFn } =
    frontsArgs.args;
  const {
    box,
    boxId: bid,
    boxPid,
    isFreePlacement,
    height: hM,
    halfH,
    centerY: cy,
    boxMat,
    geometry: boxGeo,
    innerBottomY,
    innerTopY,
  } = shell;

  const boxExtDrawers = asRecordArray<InteriorValueRecord>(box.extDrawers);
  if (!(boxExtDrawers.length && THREE)) return;

  const createInternalDrawerBox = input.createInternalDrawerBox;
  const outerD = Math.max(0.1, boxGeo.outerD);
  const visualT = 0.02;
  const frontZ = boxGeo.centerZ + boxGeo.outerD / 2;
  const drawersArray = getDrawersArray(App);
  let didResolveMirrorMaterial = false;
  let cachedMirrorMaterial: unknown = null;
  const resolveCachedMirrorMaterial = () => {
    if (didResolveMirrorMaterial) return cachedMirrorMaterial;
    didResolveMirrorMaterial = true;
    try {
      cachedMirrorMaterial = resolveBuilderMirrorMaterial(
        App,
        THREE as never,
        () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.01 })
      );
    } catch {
      cachedMirrorMaterial = null;
    }
    return cachedMirrorMaterial;
  };
  const clampDrawerCenterY = (centerY: number, stackH: number) => {
    const lo = innerBottomY + stackH / 2;
    const hi = innerTopY - woodThick - stackH / 2;
    if (!(hi > lo)) return Math.max(innerBottomY + woodThick, Math.min(innerTopY - woodThick, centerY));
    return Math.max(lo, Math.min(hi, centerY));
  };

  for (let edi = 0; edi < boxExtDrawers.length; edi++) {
    const item = boxExtDrawers[edi] || null;
    if (!item) continue;
    const countRaw = toFiniteNumber(item.count);
    const drawerCount = countRaw != null ? Math.max(1, Math.min(5, Math.floor(countRaw))) : 1;
    const metrics = resolveSketchExternalDrawerMetrics({
      drawerCount,
      drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
      availableHeightM: Math.max(0, innerTopY - woodThick - innerBottomY),
    });
    const drawerH = metrics.drawerH;
    const stackH = metrics.stackH;
    const yNormC = toFiniteNumber(item.yNormC);
    const yNormBase = toFiniteNumber(item.yNorm);
    let centerY: number | null = null;
    if (yNormC != null)
      centerY = clampDrawerCenterY(cy - halfH + Math.max(0, Math.min(1, yNormC)) * hM, stackH);
    else if (yNormBase != null)
      centerY = clampDrawerCenterY(
        cy - halfH + Math.max(0, Math.min(1, yNormBase)) * hM + stackH / 2,
        stackH
      );
    if (centerY == null) continue;

    const baseY = centerY - stackH / 2;
    const drawerId = item.id != null && String(item.id) ? String(item.id) : String(edi);
    const keyPrefix = `${boxPid}_ext_drawers_${drawerId}_`;
    const span = resolveBoxDrawerSpan(item);
    const outerW = Math.max(0.08, span.outerW);
    const drawerFaceW = span.faceW;
    const drawerFaceOffsetX = span.faceCenterX - span.outerCenterX;
    const opsRec = asValueRecord(
      computeExternalDrawersOpsForModule({
        wardrobeType: 'hinged',
        moduleIndex: moduleIndex >= 0 ? moduleIndex : 0,
        startDoorId: 1,
        externalCenterX: span.outerCenterX,
        externalW: outerW,
        depth: outerD,
        frontZ,
        startY: baseY - woodThick,
        woodThick,
        keyPrefix,
        regCount: drawerCount,
        regDrawerHeight: drawerH,
        hasShoe: false,
      })
    );
    const drawerOps = asRecordArray(opsRec?.drawers);
    applySketchExternalDrawerFaceOverrides(drawerOps, drawerFaceW, drawerFaceOffsetX, frontZ);

    for (let drawerIndex = 0; drawerIndex < drawerOps.length; drawerIndex++) {
      const op = asValueRecord(drawerOps[drawerIndex]);
      if (!op) continue;
      const closed = asValueRecord(op.closed);
      const open = asValueRecord(op.open);
      const px = toFiniteNumber(closed?.x) ?? boxGeo.centerX;
      const py = toFiniteNumber(closed?.y) ?? centerY;
      const pz = toFiniteNumber(closed?.z) ?? frontZ + 0.01;
      const partId = `${keyPrefix}${drawerIndex + 1}`;
      const frontMat = resolvePartMaterial(partId, boxMat);
      const visualW = Math.max(0.05, toFiniteNumber(op.visualW) ?? outerW - 0.004);
      const faceW = Math.max(0.05, toFiniteNumber(op.faceW) ?? visualW);
      const faceOffsetX = toFiniteNumber(op.faceOffsetX) ?? 0;
      const visualHRaw = Math.max(0.05, toFiniteNumber(op.visualH) ?? drawerH - 0.008);
      const faceVertical = resolveSketchExternalDrawerFaceVerticalAlignment({
        drawerIndex,
        drawerCount: drawerOps.length || drawerCount,
        centerY: py,
        visualH: visualHRaw,
        stackMinY: baseY,
        stackMaxY: baseY + stackH,
        containerMinY: innerBottomY,
        containerMaxY: innerTopY - woodThick,
      });
      const visualH = Math.max(0.05, faceVertical.height);
      const visualD = Math.max(0.005, toFiniteNumber(op.visualT) ?? visualT);
      const boxW = Math.max(0.05, toFiniteNumber(op.boxW) ?? outerW - 0.044);
      const boxH2 = Math.max(0.05, toFiniteNumber(op.boxH) ?? drawerH - 0.04);
      const boxD = Math.max(0.05, toFiniteNumber(op.boxD) ?? Math.max(woodThick, outerD - 0.1));
      const boxOffsetZ = toFiniteNumber(op.boxOffsetZ) ?? -outerD / 2 + 0.005;
      const connectorW = toFiniteNumber(op.connectW);
      const connectorH = toFiniteNumber(op.connectH);
      const connectorD = toFiniteNumber(op.connectD);
      const connectorZ = toFiniteNumber(op.connectZ) ?? -0.01 - 0.03 / 2 - 0.003;

      const groupNode = new THREE.Group();
      groupNode.position?.set?.(px, py, pz);
      groupNode.userData = {
        ...(readObject<InteriorValueRecord>(groupNode.userData) || {}),
        partId,
        moduleIndex,
        __wpStack: typeof moduleKeyStr === 'string' && moduleKeyStr.startsWith('lower_') ? 'bottom' : 'top',
        __doorWidth: faceW,
        __doorHeight: visualH,
        __wpFaceOffsetX: faceOffsetX,
        __wpFaceOffsetY: faceVertical.offsetY,
        __wpFaceMinY: faceVertical.minY,
        __wpFaceMaxY: faceVertical.maxY,
        __wpFrontZ: frontZ,
        __wpType: 'extDrawer',
        __wpSketchExtDrawer: true,
        __wpSketchExtDrawerId: drawerId,
        __wpSketchModuleKey: moduleKeyStr,
        __wpSketchBoxId: bid,
        __wpSketchFreePlacement: isFreePlacement === true,
      };

      const frontVisualState = resolveSketchFrontVisualState(input, partId);
      let frontFaceMat = frontMat;
      let frontBaseMat = boxMat || frontMat;
      if (frontVisualState.isMirror) {
        const resolvedMirrorMat = resolveCachedMirrorMaterial();
        if (resolvedMirrorMat) {
          frontFaceMat = resolvedMirrorMat;
          if (frontBaseMat === frontFaceMat) frontBaseMat = boxMat || frontMat;
        } else {
          frontFaceMat = frontMat;
          frontBaseMat = boxMat || frontMat;
        }
      }

      let visual: unknown = null;
      if (isFn(createDoorVisual)) {
        try {
          visual = createDoorVisual(
            faceW,
            visualH,
            visualD,
            frontFaceMat,
            frontVisualState.isGlass ? 'glass' : resolveEffectiveDoorStyle(doorStyle, doorStyleMap, partId),
            false,
            frontVisualState.isMirror,
            frontVisualState.curtainType,
            frontVisualState.isMirror ? frontBaseMat : boxMat || frontMat,
            1,
            false,
            frontVisualState.mirrorLayout,
            partId
          );
        } catch {
          visual = null;
        }
      }
      const visualObj =
        (readObject<InteriorGroupLike>(visual) || asMesh(visual)) ??
        new THREE.Mesh(
          new THREE.BoxGeometry(faceW, visualH, visualD),
          frontVisualState.isMirror ? frontFaceMat : frontMat
        );
      visualObj.position?.set?.(faceOffsetX, faceVertical.offsetY, 0);
      applySketchBoxPickMetaDeep(visualObj, partId, moduleKeyStr, bid, {
        __wpSketchExtDrawer: true,
        __wpSketchFreePlacement: isFreePlacement === true,
      });
      if (isFn(input.addOutlines)) input.addOutlines(visualObj);
      groupNode.add?.(visualObj);

      const drawerBox = isFn(createInternalDrawerBox)
        ? createInternalDrawerBox(boxW, boxH2, boxD, boxMat, boxMat, input.addOutlines, false, false)
        : new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH2, boxD), boxMat);
      const drawerBoxObj = (readObject<InteriorGroupLike>(drawerBox) || asMesh(drawerBox)) ?? null;
      if (drawerBoxObj) {
        drawerBoxObj.position?.set?.(0, 0, boxOffsetZ);
        applySketchBoxPickMetaDeep(drawerBoxObj, partId, moduleKeyStr, bid, {
          __wpSketchExtDrawer: true,
          __wpSketchFreePlacement: isFreePlacement === true,
        });
        groupNode.add?.(drawerBoxObj);
      }

      if (connectorW != null && connectorH != null && connectorD != null) {
        const connector = new THREE.Mesh(new THREE.BoxGeometry(connectorW, connectorH, connectorD), boxMat);
        connector.position?.set?.(0, 0, connectorZ);
        applySketchBoxPickMeta(connector, partId, moduleKeyStr, bid);
        connector.userData = {
          ...(readObject<InteriorValueRecord>(connector.userData) || {}),
          __wpSketchExtDrawer: true,
        };
        groupNode.add?.(connector);
      }

      applySketchBoxPickMetaDeep(groupNode, partId, moduleKeyStr, bid, {
        __wpSketchExtDrawer: true,
        __wpSketchFreePlacement: isFreePlacement === true,
      });
      group.add?.(groupNode);

      const makeDrawerMotionPoint = (x: number, y: number, z: number): DrawerVisualEntryLike['closed'] =>
        typeof THREE.Vector3 === 'function' ? new THREE.Vector3(x, y, z) : { x, y, z };
      const closedPos = makeDrawerMotionPoint(px, py, pz);
      const openPos = makeDrawerMotionPoint(
        toFiniteNumber(open?.x) ?? px,
        toFiniteNumber(open?.y) ?? py,
        toFiniteNumber(open?.z) ?? pz + 0.35
      );
      const drawerEntry: DrawerVisualEntryLike = {
        group: groupNode,
        closed: closedPos,
        open: openPos,
        id: partId,
      };
      drawersArray.push(drawerEntry);
    }
  }
}
