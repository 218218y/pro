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
import type { ApplySketchExternalDrawersArgs } from './render_interior_sketch_drawers_shared.js';

import {
  applySketchExternalDrawerFaceOverrides,
  asMesh,
  asRecordArray,
  asValueRecord,
  readObject,
  resolveSketchExternalDrawerDoorFaceTopY,
  resolveSketchExternalDrawerFaceVerticalAlignment,
  toFiniteNumber,
} from './render_interior_sketch_shared.js';
import {
  applySketchModulePickMeta,
  applySketchModulePickMetaDeep,
} from './render_interior_sketch_pick_meta.js';
import {
  createSketchDrawerMotionPoint,
  resolveSketchDoorStyle,
  resolveSketchDoorStyleMap,
  resolveSketchExternalDrawerModuleIndexValue,
  resolveSketchExternalDrawerStackKey,
} from './render_interior_sketch_drawers_shared.js';
import { resolveSketchFrontVisualState } from './render_interior_sketch_visuals_door_state.js';

export function applySketchExternalDrawers(args: ApplySketchExternalDrawersArgs): void {
  const {
    App,
    input,
    extDrawers,
    THREE,
    group,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    innerW,
    moduleDepth,
    internalDepth,
    internalCenterX,
    moduleIndex,
    moduleKeyStr,
    woodThick,
    bodyMat,
    getPartMaterial,
    moduleDoorFaceSpan,
    isFn,
    renderOpsHandleCatch,
  } = args;

  if (!extDrawers.length || !THREE) return;

  try {
    const outerW = Math.max(0.08, innerW);
    const outerD = Math.max(0.1, moduleDepth > 0 ? moduleDepth : internalDepth + 0.05);
    const visualT = 0.02;
    const frontZ =
      toFiniteNumber(readObject<InteriorValueRecord>(input)?.externalFrontZ) ?? Math.max(0, outerD / 2);
    const createInternalDrawerBox = input.createInternalDrawerBox;
    const addOutlines = input.addOutlines;
    const outlineFn = isFn(addOutlines) ? addOutlines : null;
    const doorStyle = resolveSketchDoorStyle(App, input);
    const doorStyleMap = resolveSketchDoorStyleMap(App, input);
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
          () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.01 })
        );
      } catch {
        cachedMirrorMaterial = null;
      }
      return cachedMirrorMaterial;
    };

    for (let i = 0; i < extDrawers.length; i++) {
      const item = extDrawers[i] || null;
      if (!item) continue;
      const countRaw = toFiniteNumber(item.count);
      const drawerCount = countRaw != null ? Math.max(1, Math.min(5, Math.floor(countRaw))) : 1;
      const metrics = resolveSketchExternalDrawerMetrics({
        drawerCount,
        drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
        availableHeightM: Math.max(0, effectiveTopY - effectiveBottomY),
      });
      const drawerH = metrics.drawerH;
      const stackH = metrics.stackH;
      const clampCenterY = (yCenter: number) => {
        const lo = effectiveBottomY + stackH / 2;
        const hi = effectiveTopY - stackH / 2;
        if (!(hi > lo)) return Math.max(effectiveBottomY, Math.min(effectiveTopY, yCenter));
        return Math.max(lo, Math.min(hi, yCenter));
      };

      const yNormC = toFiniteNumber(item.yNormC);
      const yNormBase = toFiniteNumber(item.yNorm);
      let centerY: number | null = null;
      if (yNormC != null) {
        centerY = clampCenterY(effectiveBottomY + Math.max(0, Math.min(1, yNormC)) * spanH);
      } else if (yNormBase != null) {
        centerY = clampCenterY(effectiveBottomY + Math.max(0, Math.min(1, yNormBase)) * spanH + stackH / 2);
      }
      if (centerY == null) continue;
      const baseY = centerY - stackH / 2;
      const drawerId = item.id != null && String(item.id) ? String(item.id) : String(i);
      const keyPrefix = moduleKeyStr
        ? `sketch_ext_drawers_${moduleKeyStr}_${drawerId}_`
        : `sketch_ext_drawers_${drawerId}_`;
      const drawerFaceW = moduleDoorFaceSpan?.spanW ?? outerW;
      const drawerFaceOffsetX = (moduleDoorFaceSpan?.centerX ?? internalCenterX) - internalCenterX;
      const opsRec = asValueRecord(
        computeExternalDrawersOpsForModule({
          wardrobeType: 'hinged',
          moduleIndex: moduleIndex >= 0 ? moduleIndex : 0,
          startDoorId: 1,
          externalCenterX: internalCenterX,
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
      for (let j = 0; j < drawerOps.length; j++) {
        const op = asValueRecord(drawerOps[j]);
        if (!op) continue;
        const closed = asValueRecord(op.closed);
        const open = asValueRecord(op.open);
        const px = toFiniteNumber(closed?.x) ?? internalCenterX;
        const py = toFiniteNumber(closed?.y) ?? centerY;
        const pz = toFiniteNumber(closed?.z) ?? frontZ + 0.01;
        const partId = `${keyPrefix}${j + 1}`;
        const frontMat = (() => {
          try {
            if (isFn(getPartMaterial)) {
              const resolved = getPartMaterial(partId);
              if (resolved) return resolved;
            }
          } catch {
            // ignore
          }
          return bodyMat;
        })();
        const visualW = Math.max(0.05, toFiniteNumber(op.visualW) ?? outerW - 0.004);
        const faceW = Math.max(0.05, toFiniteNumber(op.faceW) ?? visualW);
        const faceOffsetX = toFiniteNumber(op.faceOffsetX) ?? 0;
        const visualHRaw = Math.max(0.05, toFiniteNumber(op.visualH) ?? drawerH - 0.008);
        const faceVertical = resolveSketchExternalDrawerFaceVerticalAlignment({
          drawerIndex: j,
          drawerCount: drawerOps.length || drawerCount,
          centerY: py,
          visualH: visualHRaw,
          stackMinY: baseY,
          stackMaxY: baseY + stackH,
          containerMinY: effectiveBottomY,
          containerMaxY: effectiveTopY,
          flushTargetMaxY: doorFaceTopY,
        });
        const visualH = Math.max(0.05, faceVertical.height);
        const visualD = Math.max(0.005, toFiniteNumber(op.visualT) ?? visualT);
        const boxW = Math.max(0.05, toFiniteNumber(op.boxW) ?? outerW - 0.044);
        const boxH = Math.max(0.05, toFiniteNumber(op.boxH) ?? drawerH - 0.04);
        const boxD = Math.max(0.05, toFiniteNumber(op.boxD) ?? Math.max(woodThick, outerD - 0.1));
        const boxOffsetZ = toFiniteNumber(op.boxOffsetZ) ?? -outerD / 2 + 0.005;
        const connectorW = toFiniteNumber(op.connectW);
        const connectorH = toFiniteNumber(op.connectH);
        const connectorD = toFiniteNumber(op.connectD);
        const connectorZ = toFiniteNumber(op.connectZ) ?? -0.01 - 0.03 / 2 - 0.003;

        const groupNode = new THREE.Group();
        groupNode.position?.set?.(px, py, pz);
        const groupUd = readObject<InteriorValueRecord>(groupNode.userData) || {};
        const resolvedModuleIndex = resolveSketchExternalDrawerModuleIndexValue(moduleKeyStr, moduleIndex);
        const resolvedStackKey = resolveSketchExternalDrawerStackKey(input, moduleKeyStr);
        groupUd.partId = partId;
        groupUd.moduleIndex = resolvedModuleIndex || moduleIndex;
        groupUd.__wpStack = resolvedStackKey;
        groupUd.__doorWidth = faceW;
        groupUd.__doorHeight = visualH;
        groupUd.__wpFaceOffsetX = faceOffsetX;
        groupUd.__wpFaceOffsetY = faceVertical.offsetY;
        groupUd.__wpFaceMinY = faceVertical.minY;
        groupUd.__wpFaceMaxY = faceVertical.maxY;
        groupUd.__wpFrontZ = frontZ;
        groupUd.__wpType = 'extDrawer';
        groupUd.__wpSketchExtDrawerId = drawerId;
        groupUd.__wpSketchModuleKey = moduleKeyStr;
        groupNode.userData = groupUd;

        const frontVisualState = resolveSketchFrontVisualState(input, partId);
        let frontFaceMat = frontMat;
        let frontBaseMat = bodyMat || frontMat;
        if (frontVisualState.isMirror) {
          const resolvedMirrorMat = resolveCachedMirrorMaterial();
          if (resolvedMirrorMat) {
            frontFaceMat = resolvedMirrorMat;
            if (frontBaseMat === frontFaceMat) frontBaseMat = bodyMat || frontMat;
          } else {
            frontFaceMat = frontMat;
            frontBaseMat = bodyMat || frontMat;
          }
        }

        let visual: unknown = null;
        if (isFn(input.createDoorVisual)) {
          try {
            visual = input.createDoorVisual(
              faceW,
              visualH,
              visualD,
              frontFaceMat,
              frontVisualState.isGlass ? 'glass' : resolveEffectiveDoorStyle(doorStyle, doorStyleMap, partId),
              false,
              frontVisualState.isMirror,
              frontVisualState.curtainType,
              frontVisualState.isMirror ? frontBaseMat : bodyMat || frontMat,
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
        applySketchModulePickMetaDeep(visualObj, partId, moduleKeyStr, {
          __wpSketchExtDrawer: true,
          __wpSketchExtDrawerId: drawerId,
        });
        if (outlineFn) outlineFn(visualObj);
        groupNode.add?.(visualObj);

        const drawerBox = isFn(createInternalDrawerBox)
          ? createInternalDrawerBox(boxW, boxH, boxD, bodyMat, bodyMat, addOutlines, false, false)
          : new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxD), bodyMat);
        const drawerBoxObj = readObject<InteriorGroupLike>(drawerBox) ?? null;
        if (drawerBoxObj) {
          drawerBoxObj.position?.set?.(0, 0, boxOffsetZ);
          applySketchModulePickMetaDeep(drawerBoxObj, partId, moduleKeyStr, {
            __wpSketchExtDrawer: true,
            __wpSketchExtDrawerId: drawerId,
          });
          if (outlineFn) outlineFn(drawerBoxObj);
          groupNode.add?.(drawerBoxObj);
        }

        if (
          connectorW != null &&
          connectorH != null &&
          connectorD != null &&
          connectorW > 0 &&
          connectorH > 0 &&
          connectorD > 0
        ) {
          const connector = new THREE.Mesh(
            new THREE.BoxGeometry(connectorW, connectorH, connectorD),
            bodyMat
          );
          connector.position?.set?.(0, 0, connectorZ);
          applySketchModulePickMeta(connector, partId, moduleKeyStr, {
            __wpSketchExtDrawer: true,
            __wpSketchExtDrawerId: drawerId,
          });
          if (outlineFn) outlineFn(connector);
          groupNode.add?.(connector);
        }

        applySketchModulePickMetaDeep(groupNode, partId, moduleKeyStr, {
          __wpSketchExtDrawer: true,
          __wpSketchExtDrawerId: drawerId,
        });
        group.add?.(groupNode);

        const closedPos = createSketchDrawerMotionPoint(THREE, px, py, pz);
        const openPos = createSketchDrawerMotionPoint(
          THREE,
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
  } catch (error) {
    renderOpsHandleCatch(App, 'applyInteriorSketchExtras.extDrawers', error, undefined, {
      failFast: false,
      throttleMs: 5000,
    });
  }
}
