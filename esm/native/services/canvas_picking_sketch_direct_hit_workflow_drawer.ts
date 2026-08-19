import { getDrawersArray } from '../runtime/render_access.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import type { ManualLayoutSketchDirectHitContext } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import {
  getWorldPositionY,
  readChildObjects,
  readModuleIndex,
  readVector3Ctor,
} from './canvas_picking_sketch_direct_hit_workflow_objects.js';
import { readRecordIdentity, readRecordNumber } from './canvas_picking_sketch_direct_hit_workflow_records.js';
import {
  commitCrossDrawerRemovePlan,
  findDirectCrossDrawerHitInIntersects,
  resolveCrossDrawerRemovePlan,
} from './canvas_picking_drawer_cross_family.js';
import { restoreShoeDrawerBaseIfNoShoeDrawersRemain } from './canvas_picking_shoe_drawer_base_auto_none.js';
import { decodeSketchBoxContentCommandHover } from './canvas_picking_sketch_box_content_command.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_support_errors.js';

function readStrictDrawerRemoval(hoverRec: unknown): {
  contentKind: 'drawers' | 'ext_drawers' | 'regular_ext_drawers';
  removeId: string;
  boxId: string;
} | null {
  const decoded = decodeSketchBoxContentCommandHover(hoverRec);
  if (!decoded.ok) return null;
  const { contentKind, command } = decoded.value;
  if (contentKind !== 'drawers' && contentKind !== 'ext_drawers' && contentKind !== 'regular_ext_drawers')
    return null;
  if (command.op !== 'remove' || !('removeId' in command) || !command.removeId) return null;
  return { contentKind, removeId: command.removeId, boxId: command.boxId };
}

function hoverAllowsSketchExternalRemoval(args: {
  hoverOk: boolean;
  hoverKind: string;
  hoverOp: string;
  hoverRec: unknown;
  drawerId: string;
  boxId?: string;
  listKind?: 'custom-external' | 'regular-external';
}): boolean {
  if (!args.hoverOk) return false;
  if (args.hoverKind === 'ext_drawers') {
    return (
      !args.boxId &&
      args.hoverOp === 'remove' &&
      readRecordIdentity(args.hoverRec, 'removeId') === args.drawerId
    );
  }
  const removal = readStrictDrawerRemoval(args.hoverRec);
  const expectedContentKind = args.listKind === 'regular-external' ? 'regular_ext_drawers' : 'ext_drawers';
  return !!(
    removal &&
    args.boxId &&
    removal.contentKind === expectedContentKind &&
    removal.removeId === args.drawerId &&
    removal.boxId === args.boxId
  );
}

function hoverAllowsSketchInternalRemoval(args: {
  hoverOk: boolean;
  hoverKind: string;
  hoverOp: string;
  hoverRec: unknown;
  drawerId: string;
}): boolean {
  if (!args.hoverOk) return false;
  if (args.hoverKind === 'drawers') {
    return args.hoverOp === 'remove' && readRecordIdentity(args.hoverRec, 'removeId') === args.drawerId;
  }
  const removal = readStrictDrawerRemoval(args.hoverRec);
  return !!(removal && removal.contentKind === 'drawers' && removal.removeId === args.drawerId);
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
  return readRecordIdentity(args.hoverRec, 'removePid') === args.partId;
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
      const externalPlan = sketchExternalHit
        ? resolveCrossDrawerRemovePlan({ hit: sketchExternalHit, activeModuleKey: __activeModuleKey })
        : null;
      if (
        externalPlan?.kind === 'remove-sketch-external-drawer' &&
        hoverAllowsSketchExternalRemoval({
          hoverOk: __hoverOk,
          hoverKind: __hoverKind,
          hoverOp: __hoverOp,
          hoverRec: __hoverRec,
          drawerId: externalPlan.target.drawerId,
          ...(externalPlan.target.scope === 'box'
            ? { boxId: externalPlan.target.boxId, listKind: externalPlan.target.listKind }
            : {}),
        })
      ) {
        if (
          commitCrossDrawerRemovePlan({
            plan: externalPlan,
            patchConfigForKey: __patchConfigForKey,
            source: 'sketch.removeExternalDrawerByCrossHit',
          })
        ) {
          restoreShoeDrawerBaseIfNoShoeDrawersRemain(App, 'sketch.removeExternalDrawerByHit:autoBaseRestore');
          return true;
        }
      }
    } catch (error) {
      __wp_reportPickingIssue(App, error, {
        where: 'canvasPicking.structuralCommit',
        op: 'sketchDirectHit.drawer.externalCross',
        throttleMs: 1000,
      });
    }

    try {
      const drawerHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'sketch_internal');
      const internalPlan = drawerHit
        ? resolveCrossDrawerRemovePlan({ hit: drawerHit, activeModuleKey: __activeModuleKey })
        : null;
      if (internalPlan?.kind === 'remove-sketch-internal-drawer') {
        const pid = internalPlan.partId;
        const moduleIndex = String(internalPlan.moduleKey);
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
          for (const drawer of drawers) {
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
        } catch (error) {
          __wp_reportPickingIssue(App, error, {
            where: 'canvasPicking.structuralCommit',
            op: 'sketchDirectHit.drawer.internalBounds',
            throttleMs: 1000,
          });
        }

        if (!Number.isFinite(centerY)) centerY = Number(hitY0);
        if (!Number.isFinite(halfH)) halfH = 0.12;

        const hoverAllowsRemove = hoverAllowsSketchInternalRemoval({
          hoverOk: __hoverOk,
          hoverKind: __hoverKind,
          hoverOp: __hoverOp,
          hoverRec: __hoverRec,
          drawerId: internalPlan.drawerId,
        });
        const dy = Math.abs(Number(hitY0) - centerY);
        const directHitAllowsRemove = dy <= halfH + 0.02;
        const allowRemove = __hoverOk ? hoverAllowsRemove : directHitAllowsRemove;

        if (allowRemove) {
          if (
            commitCrossDrawerRemovePlan({
              plan: internalPlan,
              patchConfigForKey: __patchConfigForKey,
              source: 'sketch.removeInternalDrawerByHit.guardY',
            })
          ) {
            return true;
          }
        }
      }
    } catch (error) {
      __wp_reportPickingIssue(App, error, {
        where: 'canvasPicking.structuralCommit',
        op: 'sketchDirectHit.drawer.internalRemove',
        throttleMs: 1000,
      });
    }
  }

  if (__mt.startsWith('sketch_ext_drawers:')) {
    try {
      const sketchInternalHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'sketch_internal');
      const internalPlan = sketchInternalHit
        ? resolveCrossDrawerRemovePlan({ hit: sketchInternalHit, activeModuleKey: __activeModuleKey })
        : null;
      if (
        internalPlan?.kind === 'remove-sketch-internal-drawer' &&
        hoverAllowsSketchInternalRemoval({
          hoverOk: __hoverOk,
          hoverKind: __hoverKind,
          hoverOp: __hoverOp,
          hoverRec: __hoverRec,
          drawerId: internalPlan.drawerId,
        })
      ) {
        if (
          commitCrossDrawerRemovePlan({
            plan: internalPlan,
            patchConfigForKey: __patchConfigForKey,
            source: 'sketch.removeInternalDrawerByCrossHit',
          })
        ) {
          return true;
        }
      }
    } catch (error) {
      __wp_reportPickingIssue(App, error, {
        where: 'canvasPicking.structuralCommit',
        op: 'sketchDirectHit.drawer.crossInternal',
        throttleMs: 1000,
      });
    }

    const standardExternalHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'standard_external');
    const standardPlan = standardExternalHit
      ? resolveCrossDrawerRemovePlan({ hit: standardExternalHit, activeModuleKey: __activeModuleKey })
      : null;
    if (
      standardPlan?.kind === 'remove-standard-external-drawer' &&
      hoverAllowsStandardExternalRemoval({
        hoverOk: __hoverOk,
        hoverKind: __hoverKind,
        hoverOp: __hoverOp,
        hoverRec: __hoverRec,
        partId: standardPlan.partId,
      })
    ) {
      if (
        commitCrossDrawerRemovePlan({
          plan: standardPlan,
          patchConfigForKey: __patchConfigForKey,
          source: 'sketch.removeStandardExternalDrawerByHit',
        })
      ) {
        restoreShoeDrawerBaseIfNoShoeDrawersRemain(
          App,
          'sketch.removeStandardExternalDrawerByHit:autoBaseRestore'
        );
        return true;
      }
    }

    try {
      const sketchDrawerHit = findDirectCrossDrawerHitInIntersects(App, intersects, 'sketch_external');
      const externalPlan = sketchDrawerHit
        ? resolveCrossDrawerRemovePlan({ hit: sketchDrawerHit, activeModuleKey: __activeModuleKey })
        : null;
      const drawerGroup = sketchDrawerHit?.object ?? null;
      if (externalPlan?.kind === 'remove-sketch-external-drawer') {
        let allowRemove = false;

        if (__hoverOk) {
          allowRemove = hoverAllowsSketchExternalRemoval({
            hoverOk: __hoverOk,
            hoverKind: __hoverKind,
            hoverOp: __hoverOp,
            hoverRec: __hoverRec,
            drawerId: externalPlan.target.drawerId,
            ...(externalPlan.target.scope === 'box'
              ? { boxId: externalPlan.target.boxId, listKind: externalPlan.target.listKind }
              : {}),
          });
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
          } catch (error) {
            __wp_reportPickingIssue(App, error, {
              where: 'canvasPicking.structuralCommit',
              op: 'sketchDirectHit.drawer.externalPrimaryBounds',
              throttleMs: 1000,
            });
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
            } catch (error) {
              __wp_reportPickingIssue(App, error, {
                where: 'canvasPicking.structuralCommit',
                op: 'sketchDirectHit.drawer.externalChildBounds',
                throttleMs: 1000,
              });
            }
          }

          if (!Number.isFinite(centerY)) centerY = Number(hitY0);
          if (!Number.isFinite(halfH)) halfH = 0.12;
          const dy = Math.abs(Number(hitY0) - centerY);
          allowRemove = dy <= halfH + 0.02;
        }

        if (allowRemove) {
          if (
            commitCrossDrawerRemovePlan({
              plan: externalPlan,
              patchConfigForKey: __patchConfigForKey,
              source: 'sketch.removeExternalDrawerByHit',
            })
          ) {
            restoreShoeDrawerBaseIfNoShoeDrawersRemain(
              App,
              'sketch.removeExternalDrawerByHit:autoBaseRestore'
            );
            return true;
          }
        }
      }
    } catch (error) {
      __wp_reportPickingIssue(App, error, {
        where: 'canvasPicking.structuralCommit',
        op: 'sketchDirectHit.drawer.externalRemove',
        throttleMs: 1000,
      });
    }
  }

  return false;
}
