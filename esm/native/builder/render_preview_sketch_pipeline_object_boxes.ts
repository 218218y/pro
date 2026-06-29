import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readGeometryRuntimeNumber } from './geometry_runtime_contracts.js';
import type { SketchPlacementPreviewContext } from './render_preview_sketch_pipeline_shared.js';

export function applyObjectBoxesSketchPlacementPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'object_boxes') return false;

  const previewObjects = ctx.readPreviewObjectList(ctx.input.previewObjects);
  const helperLimit = Math.min(ctx.helperMeshes.length, previewObjects.length);
  const parentGroup = ctx.asPreviewGroup(ctx.g.parent) || ctx.asPreviewGroup(ctx.wardrobeGroup(ctx.App));
  const parentInv = ctx.readMatrix4(ctx.makeCtorValue(ctx.THREE, 'Matrix4'));

  if (!previewObjects.length || !parentInv || !parentGroup?.matrixWorld) {
    ctx.g.visible = false;
    ctx.hideAll();
    return true;
  }

  try {
    ctx.callMethod(parentGroup, 'updateMatrixWorld', [true]);
  } catch {
    // ignore
  }

  if (!ctx.isFn(parentInv.multiplyMatrices)) {
    ctx.g.visible = false;
    ctx.hideAll();
    return true;
  }
  parentInv.copy(parentGroup.matrixWorld);
  parentInv.invert();

  const overlayThroughScene = ctx.input.overlayThroughScene === true;
  const boxMat = overlayThroughScene
    ? ctx.isRemove
      ? ctx.ud.__matRemoveOverlay || ctx.ud.__matRemove
      : ctx.ud.__matBoxOverlay || ctx.ud.__matBox
    : ctx.isRemove
      ? ctx.ud.__matRemove
      : ctx.ud.__matBox;
  const boxLine = overlayThroughScene
    ? ctx.isRemove
      ? ctx.ud.__lineRemoveOverlay || ctx.ud.__lineRemove
      : ctx.ud.__lineBoxOverlay || ctx.ud.__lineBox
    : ctx.isRemove
      ? ctx.ud.__lineRemove
      : ctx.ud.__lineBox;

  const padXY =
    Number.isFinite(ctx.woodThick) && ctx.woodThick > 0
      ? Math.min(
          SKETCH_BOX_DIMENSIONS.preview.objectBoxPadXYMaxM,
          Math.max(
            SKETCH_BOX_DIMENSIONS.preview.objectBoxPadXYMinM,
            ctx.woodThick * SKETCH_BOX_DIMENSIONS.preview.objectBoxPadXYWoodRatio
          )
        )
      : SKETCH_BOX_DIMENSIONS.preview.objectBoxPadXYDefaultM;
  const padZ = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.objectBoxPadZMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.objectBoxPadZMaxM,
      padXY * SKETCH_BOX_DIMENSIONS.preview.objectBoxPadZRatio
    )
  );
  ctx.g.visible = true;
  ctx.hideAll();

  for (let i = 0; i < ctx.helperMeshes.length; i += 1) {
    const helper = ctx.helperMeshes[i];
    const obj = i < helperLimit ? previewObjects[i] : null;
    if (!helper || !obj) {
      ctx.setVisible(helper, false);
      continue;
    }

    const geomRec = ctx.readValueRecord(obj.geometry);
    if (!geomRec) {
      ctx.setVisible(helper, false);
      continue;
    }
    if (!geomRec.boundingBox && typeof geomRec.computeBoundingBox === 'function') {
      try {
        geomRec.computeBoundingBox();
      } catch {
        // ignore
      }
    }
    const boundingBox = ctx.readValueRecord(geomRec.boundingBox);
    const min = ctx.readValueRecord(boundingBox?.min);
    const max = ctx.readValueRecord(boundingBox?.max);
    const minX = readGeometryRuntimeNumber(min?.x);
    const minY = readGeometryRuntimeNumber(min?.y);
    const minZ = readGeometryRuntimeNumber(min?.z);
    const maxX = readGeometryRuntimeNumber(max?.x);
    const maxY = readGeometryRuntimeNumber(max?.y);
    const maxZ = readGeometryRuntimeNumber(max?.z);
    if (minX == null || minY == null || minZ == null || maxX == null || maxY == null || maxZ == null) {
      ctx.setVisible(helper, false);
      continue;
    }

    const width0 = maxX - minX;
    const height0 = maxY - minY;
    const depth0 = maxZ - minZ;
    if (!(width0 > 0 && height0 > 0 && depth0 > 0)) {
      ctx.setVisible(helper, false);
      continue;
    }

    try {
      ctx.callMethod(obj, 'updateMatrixWorld', [true]);
    } catch {
      // ignore
    }
    const rel = ctx.readMatrix4(ctx.makeCtorValue(ctx.THREE, 'Matrix4'));
    if (!rel || !ctx.isFn(rel.multiplyMatrices) || !ctx.isFn(rel.decompose) || !obj.matrixWorld) {
      ctx.setVisible(helper, false);
      continue;
    }
    rel.multiplyMatrices(parentInv, obj.matrixWorld);

    const center = ctx.readVector3(
      ctx.makeCtorValue(ctx.THREE, 'Vector3', [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2])
    );
    const pos = ctx.readVector3(ctx.makeCtorValue(ctx.THREE, 'Vector3'));
    const quat = ctx.readQuaternion(ctx.makeCtorValue(ctx.THREE, 'Quaternion'));
    const scale = ctx.readVector3(ctx.makeCtorValue(ctx.THREE, 'Vector3', [1, 1, 1]));
    if (!center || !pos || !quat || !scale) {
      ctx.setVisible(helper, false);
      continue;
    }
    if (ctx.isFn(center.applyMatrix4)) center.applyMatrix4(rel);
    rel.decompose(pos, quat, scale);

    const helperRec = ctx.readValueRecord(helper);
    const helperQuat = ctx.readValueRecord(helperRec?.quaternion);
    ctx.setVisible(helper, true);
    ctx.resetMeshOrientation(helper);
    ctx.applyPreviewStyle(
      helper,
      boxMat,
      boxLine,
      overlayThroughScene ? 10020 : 9999,
      overlayThroughScene ? 10021 : 10000
    );
    if (typeof helper.position?.set === 'function') helper.position.set(center.x, center.y, center.z);
    if (typeof helperQuat?.copy === 'function') helperQuat.copy(quat);
    const scaleXValue = readGeometryRuntimeNumber(scale.x);
    const scaleYValue = readGeometryRuntimeNumber(scale.y);
    const scaleZValue = readGeometryRuntimeNumber(scale.z);
    if (scaleXValue == null || scaleYValue == null || scaleZValue == null) {
      ctx.setVisible(helper, false);
      continue;
    }
    const scaleX = Math.max(
      SKETCH_BOX_DIMENSIONS.preview.minScaleM,
      Math.abs(scaleXValue * (width0 + padXY * 2))
    );
    const scaleY = Math.max(
      SKETCH_BOX_DIMENSIONS.preview.minScaleM,
      Math.abs(scaleYValue * (height0 + padXY * 2))
    );
    const scaleZ = Math.max(
      SKETCH_BOX_DIMENSIONS.preview.minScaleM,
      Math.abs(scaleZValue * (depth0 + padZ * 2))
    );
    if (typeof helper.scale?.set === 'function') helper.scale.set(scaleX, scaleY, scaleZ);
  }

  return true;
}
