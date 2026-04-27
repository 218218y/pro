import type { DrawerVisualEntryLike } from '../../../types';
import { getDrawersArray } from '../runtime/render_access.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import type { ManualLayoutSketchDirectHitContext } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import { asConfig } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import {
  findPartAncestor,
  getWorldPositionY,
  readChildObjects,
  readModuleIndex,
  readPartId,
  readSketchBoxId,
  readVector3Ctor,
} from './canvas_picking_sketch_direct_hit_workflow_objects.js';
import { readRecordNumber, readRecordString } from './canvas_picking_sketch_direct_hit_workflow_records.js';
import {
  removeInternalDrawerSlot,
  removeSketchDrawerById,
  removeSketchExternalDrawerById,
} from './canvas_picking_sketch_direct_hit_workflow_drawers_shared.js';

export function tryApplySketchDirectHitDrawerActions(args: ManualLayoutSketchDirectHitContext): boolean {
  const {
    App,
    __mt,
    __activeModuleKey,
    hitY0,
    intersects,
    __patchConfigForKey,
    __wp_isViewportRoot,
    __hoverOk,
    __hoverKind,
    __hoverOp,
    __hoverRec,
  } = args;

  if (isSketchInternalDrawersTool(__mt)) {
    try {
      const drawerGroup = findPartAncestor(App, intersects, 'div_int_', __wp_isViewportRoot);
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

        const dy = Math.abs(Number(hitY0) - centerY);
        const allowRemove = dy <= halfH + 0.02;

        if (allowRemove) {
          __patchConfigForKey(
            __activeModuleKey,
            cfg0 => {
              const cfg = asConfig(cfg0);
              const prefix = `div_int_sketch_${String(__activeModuleKey)}_`;
              if (pid.startsWith(prefix)) {
                removeSketchDrawerById(cfg, pid.slice(prefix.length));
                return;
              }

              const match = pid.match(/_slot_(\d+)/);
              const slot = match ? Number(match[1]) : NaN;
              if (!Number.isFinite(slot)) return;
              removeInternalDrawerSlot(cfg, slot);
            },
            { source: 'sketch.removeInternalDrawerByHit.guardY', immediate: true }
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
      const drawerGroup = findPartAncestor(App, intersects, 'sketch_ext_drawers_', __wp_isViewportRoot);
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
            hoverContentKind === 'ext_drawers' &&
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
            { source: 'sketch.removeExternalDrawerByHit', immediate: true }
          );
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
}
