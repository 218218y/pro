import type { DrawerVisualEntryLike } from '../../../types';
import { getDrawersArray } from '../runtime/render_access.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import type { ManualLayoutSketchDirectHitContext } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import { asConfig } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import {
  getWorldPositionY,
  readChildObjects,
  readModuleIndex,
  readPartId,
  readSketchBoxId,
  readVector3Ctor,
} from './canvas_picking_sketch_direct_hit_workflow_objects.js';
import { readRecordNumber, readRecordString } from './canvas_picking_sketch_direct_hit_workflow_records.js';
import {
  findDirectCrossDrawerHitInIntersects,
  removeStandardExternalDrawerFromConfig,
  sameModuleKey,
} from './canvas_picking_drawer_cross_family.js';
import {
  removeSketchDrawerById,
  removeSketchExternalDrawerById,
} from './canvas_picking_sketch_direct_hit_workflow_drawers_shared.js';
import { restoreShoeDrawerBaseIfNoShoeDrawersRemain } from './canvas_picking_shoe_drawer_base_auto_none.js';

function readSketchInternalDrawerIdFromPartId(partId: string, moduleKey: unknown): string {
  const prefix = `div_int_sketch_${String(moduleKey)}_`;
  if (partId.startsWith(prefix)) return partId.slice(prefix.length);
  const shortPrefix = 'div_int_sketch_';
  if (!partId.startsWith(shortPrefix)) return '';
  const suffix = partId.slice(shortPrefix.length);
  const splitAt = suffix.indexOf('_');
  return splitAt >= 0 ? suffix.slice(splitAt + 1) : suffix;
}

function isSketchExternalDrawerHoverContentKind(contentKind: string): boolean {
  return contentKind === 'ext_drawers' || contentKind === 'regular_ext_drawers';
}

function hoverAllowsSketchExternalRemoval(args: {
  hoverOk: boolean;
  hoverKind: string;
  hoverOp: string;
  hoverRec: unknown;
  drawerId: string;
  boxId?: string;
}): boolean {
  if (!args.hoverOk) return true;
  if (args.hoverOp !== 'remove') return false;

  const hoverRemoveId = readRecordString(args.hoverRec, 'removeId');
  if (!hoverRemoveId || hoverRemoveId !== args.drawerId) return false;

  if (args.hoverKind === 'ext_drawers') return true;
  if (args.hoverKind !== 'box_content') return false;

  const hoverContentKind = readRecordString(args.hoverRec, 'contentKind');
  if (!isSketchExternalDrawerHoverContentKind(hoverContentKind)) return false;

  const hoverBoxId = readRecordString(args.hoverRec, 'boxId');
  return !args.boxId || !hoverBoxId || hoverBoxId === args.boxId;
}

function hoverAllowsSketchInternalRemoval(args: {
  hoverOk: boolean;
  hoverKind: string;
  hoverOp: string;
  hoverRec: unknown;
  drawerId: string;
}): boolean {
  if (!args.hoverOk) return true;
  if (args.hoverOp !== 'remove') return false;
  if (args.hoverKind !== 'drawers') return false;
  return readRecordString(args.hoverRec, 'removeId') === args.drawerId;
}

function hoverAllowsStandardExternalRemoval(args: {
  hoverOk: boolean;
  hoverKind: string;
  hoverOp: string;
  hoverRec: unknown;
  partId: string;
}): boolean {
  if (!args.hoverOk) return true;
  if (args.hoverOp !== 'remove') return false;
  if (args.hoverKind !== 'ext_drawers') return false;
  return readRecordString(args.hoverRec, 'removePid') === args.partId;
}
export function tryApplySketchDirectHitDrawerActions(args: ManualLayoutSketchDirectHitContext): boolean {
  const {
    App,
    __mt,
    __activeModuleKey,
    hitY0,
    intersects,
    __patchConfigForKey,
    __hoverOk,
    __hoverKind,
    __hoverOp,
    __hoverRec,
  } = args;

  if (isSketchInternalDrawersTool(__mt)) {
    try {
      const sketchExternalHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'sketch_external');
      if (
        sketchExternalHit &&
        (!sketchExternalHit.moduleIndex || sameModuleKey(sketchExternalHit.moduleIndex, __activeModuleKey))
      ) {
        const drawerGroup = sketchExternalHit.object ?? null;
        const drawerId =
          sketchExternalHit.sketchExtDrawerId ||
          readRecordString(drawerGroup?.userData, '__wpSketchExtDrawerId');
        const boxId = sketchExternalHit.sketchBoxId || readSketchBoxId(drawerGroup);
        if (
          drawerId &&
          hoverAllowsSketchExternalRemoval({
            hoverOk: __hoverOk,
            hoverKind: __hoverKind,
            hoverOp: __hoverOp,
            hoverRec: __hoverRec,
            drawerId,
            boxId: boxId || undefined,
          })
        ) {
          __patchConfigForKey(
            __activeModuleKey,
            cfg0 => {
              const cfg = asConfig(cfg0);
              removeSketchExternalDrawerById(cfg, drawerId, boxId || undefined);
            },
            createCanvasPickingConfigStructuralPatchMeta('sketch.removeExternalDrawerByCrossHit')
          );
          restoreShoeDrawerBaseIfNoShoeDrawersRemain(App, 'sketch.removeExternalDrawerByHit:autoBaseRestore');
          return true;
        }
      }
    } catch {
      // ignore
    }

    try {
      const drawerHit = findDirectCrossDrawerHitInIntersects(App, intersects, ['sketch_internal']);
      const drawerGroup = drawerHit?.object ?? null;
      const pid = readPartId(drawerGroup);
      const moduleIndex = readModuleIndex(drawerGroup);
      if (pid && moduleIndex && moduleIndex === String(__activeModuleKey)) {
        let centerY = NaN;
        let halfH = NaN;
        try {
          const tmp = (() => {
            const Vector3Ctor = readVector3Ctor(App);
            return Vector3Ctor ? new Vector3Ctor() : null;
          })();
          let minY = Infinity;
          let maxY = -Infinity;
          let cnt = 0;
          const drawers = getDrawersArray(App);
          for (let k = 0; k < drawers.length; k++) {
            const drawer: DrawerVisualEntryLike = drawers[k];
            if (!drawer || String(drawer.id || '') !== pid) continue;
            const group = drawer.group;
            if (!group) continue;
            const groupModuleIndex = readModuleIndex(group);
            if (groupModuleIndex && groupModuleIndex !== moduleIndex) continue;
            const y = getWorldPositionY(group, tmp);
            if (y == null) continue;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            cnt++;
          }
          if (cnt >= 1 && Number.isFinite(minY) && Number.isFinite(maxY)) {
            centerY = (minY + maxY) / 2;
            const diff = Math.max(0, maxY - minY);
            halfH = Math.max(0.035, diff - 0.01);
          }
        } catch {
          // ignore
        }

        if (!Number.isFinite(centerY)) centerY = Number(hitY0);
        if (!Number.isFinite(halfH)) halfH = 0.12;

        const removeId = readSketchInternalDrawerIdFromPartId(pid, __activeModuleKey);
        const hoverAllowsRemove = removeId
          ? hoverAllowsSketchInternalRemoval({
              hoverOk: __hoverOk,
              hoverKind: __hoverKind,
              hoverOp: __hoverOp,
              hoverRec: __hoverRec,
              drawerId: removeId,
            })
          : false;
        const dy = Math.abs(Number(hitY0) - centerY);
        const directHitAllowsRemove = dy <= halfH + 0.02;
        const allowRemove = __hoverOk ? hoverAllowsRemove : directHitAllowsRemove;

        if (allowRemove && removeId) {
          __patchConfigForKey(
            __activeModuleKey,
            cfg0 => {
              const cfg = asConfig(cfg0);
              removeSketchDrawerById(cfg, removeId);
            },
            createCanvasPickingConfigStructuralPatchMeta('sketch.removeInternalDrawerByHit.guardY')
          );
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  if (__mt.startsWith('sketch_ext_drawers:')) {
    try {
      const sketchInternalHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'sketch_internal');
      if (
        sketchInternalHit &&
        (!sketchInternalHit.moduleIndex || sameModuleKey(sketchInternalHit.moduleIndex, __activeModuleKey))
      ) {
        const drawerGroup = sketchInternalHit.object ?? null;
        const pid = sketchInternalHit.partId || readPartId(drawerGroup);
        const removeId = pid ? readSketchInternalDrawerIdFromPartId(pid, __activeModuleKey) : '';
        if (
          removeId &&
          hoverAllowsSketchInternalRemoval({
            hoverOk: __hoverOk,
            hoverKind: __hoverKind,
            hoverOp: __hoverOp,
            hoverRec: __hoverRec,
            drawerId: removeId,
          })
        ) {
          __patchConfigForKey(
            __activeModuleKey,
            cfg0 => {
              const cfg = asConfig(cfg0);
              removeSketchDrawerById(cfg, removeId);
            },
            createCanvasPickingConfigStructuralPatchMeta('sketch.removeInternalDrawerByCrossHit')
          );
          return true;
        }
      }
    } catch {
      // ignore
    }

    const standardExternalHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'standard_external');
    if (
      standardExternalHit &&
      (!standardExternalHit.moduleIndex ||
        sameModuleKey(standardExternalHit.moduleIndex, __activeModuleKey)) &&
      hoverAllowsStandardExternalRemoval({
        hoverOk: __hoverOk,
        hoverKind: __hoverKind,
        hoverOp: __hoverOp,
        hoverRec: __hoverRec,
        partId: standardExternalHit.partId,
      })
    ) {
      __patchConfigForKey(
        __activeModuleKey,
        cfg0 => {
          const cfg = asConfig(cfg0);
          removeStandardExternalDrawerFromConfig(cfg, standardExternalHit.partId);
        },
        createCanvasPickingConfigStructuralPatchMeta('sketch.removeStandardExternalDrawerByHit')
      );
      restoreShoeDrawerBaseIfNoShoeDrawersRemain(
        App,
        'sketch.removeStandardExternalDrawerByHit:autoBaseRestore'
      );
      return true;
    }

    try {
      const sketchDrawerHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'sketch_external');
      const drawerGroup = sketchDrawerHit?.object ?? null;
      const pid = readPartId(drawerGroup);
      const moduleIndex = readModuleIndex(drawerGroup);
      const drawerId = drawerGroup?.userData
        ? readRecordString(drawerGroup.userData, '__wpSketchExtDrawerId')
        : '';
      const boxId = readSketchBoxId(drawerGroup);
      if (pid && drawerId && moduleIndex && moduleIndex === String(__activeModuleKey)) {
        let allowRemove = false;

        if (__hoverOk) {
          const hoverRemoveId = readRecordString(__hoverRec, 'removeId');
          const hoverBoxId = readRecordString(__hoverRec, 'boxId');
          const hoverContentKind = readRecordString(__hoverRec, 'contentKind');
          const hoverRemovesModuleDrawer =
            __hoverKind === 'ext_drawers' && __hoverOp === 'remove' && hoverRemoveId === drawerId;
          const hoverRemovesBoxDrawer =
            __hoverKind === 'box_content' &&
            (hoverContentKind === 'ext_drawers' || hoverContentKind === 'regular_ext_drawers') &&
            __hoverOp === 'remove' &&
            hoverRemoveId === drawerId &&
            (!boxId || !hoverBoxId || hoverBoxId === boxId);
          allowRemove = hoverRemovesModuleDrawer || hoverRemovesBoxDrawer;
        } else {
          let centerY = Number.NaN;
          let halfH = Number.NaN;
          const Vector3Ctor = readVector3Ctor(App);
          const tmp = Vector3Ctor ? new Vector3Ctor(0, 0, 0) : null;

          try {
            if (drawerGroup) {
              centerY = getWorldPositionY(drawerGroup, tmp) ?? Number.NaN;
              const ud = drawerGroup.userData ?? null;
              const h0 = ud ? readRecordNumber(ud, '__doorHeight') : null;
              if (typeof h0 === 'number' && Number.isFinite(h0) && h0 > 0) halfH = h0 / 2;
            }
          } catch {
            // ignore
          }

          if (!Number.isFinite(centerY) || !Number.isFinite(halfH)) {
            let minY = Infinity;
            let maxY = -Infinity;
            let cnt = 0;
            try {
              const kids = readChildObjects(drawerGroup);
              for (let i = 0; i < kids.length; i++) {
                const child = kids[i];
                const y = getWorldPositionY(child, tmp);
                if (y == null) continue;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                cnt++;
              }
              if (cnt >= 1 && Number.isFinite(minY) && Number.isFinite(maxY)) {
                centerY = (minY + maxY) / 2;
                const diff = Math.max(0, maxY - minY);
                halfH = Math.max(0.05, diff / 2 + 0.015);
              }
            } catch {
              // ignore
            }
          }

          if (!Number.isFinite(centerY)) centerY = Number(hitY0);
          if (!Number.isFinite(halfH)) halfH = 0.12;
          const dy = Math.abs(Number(hitY0) - centerY);
          allowRemove = dy <= halfH + 0.02;
        }

        if (allowRemove) {
          __patchConfigForKey(
            __activeModuleKey,
            cfg0 => {
              const cfg = asConfig(cfg0);
              removeSketchExternalDrawerById(cfg, drawerId, boxId || undefined);
            },
            createCanvasPickingConfigStructuralPatchMeta('sketch.removeExternalDrawerByHit')
          );
          restoreShoeDrawerBaseIfNoShoeDrawersRemain(App, 'sketch.removeExternalDrawerByHit:autoBaseRestore');
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
}
