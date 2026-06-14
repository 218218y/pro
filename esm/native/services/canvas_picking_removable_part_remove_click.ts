import type { AppContainer } from '../../../types';

import { callDoorsAction, hasDoorsAction } from '../runtime/actions_access_domains.js';
import {
  isCanvasRemovablePartId,
  canonicalRemovablePartKey,
  readRemovableFrameSideFromPartId,
  readRemovableSketchBoxSideFromPartId,
} from '../features/removable_parts.js';
import {
  createCanvasPickingDoorAuthoringRefreshGatedMeta,
  createCanvasPickingDoorAuthoringStructuralMeta,
} from './canvas_picking_door_authoring_meta.js';
import {
  __wp_reportPickingIssue,
  __wp_isRemoved,
  __wp_historyBatch,
  __wp_toast,
} from './canvas_picking_core_helpers.js';
import { requestDoorAuthoringBurstRefresh } from './canvas_picking_door_authoring_burst.js';

export interface CanvasRemovablePartRemoveClickArgs {
  App: AppContainer;
  partId: string | null | undefined;
}

export function handleCanvasRemovablePartRemoveClick(args: CanvasRemovablePartRemoveClickArgs): boolean {
  const { App } = args;
  const partId = canonicalRemovablePartKey(args.partId);
  if (!partId || !isCanvasRemovablePartId(partId)) return false;

  const structuralMeta = createCanvasPickingDoorAuthoringStructuralMeta('removeParts:smart');
  const refreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta(
    App,
    'removeParts:smart',
    structuralMeta
  );

  const hasRemoved = (pid: string): boolean => {
    try {
      return __wp_isRemoved(App, pid);
    } catch (err) {
      __wp_reportPickingIssue(App, err, {
        where: 'canvasPicking',
        op: 'removePart.readRemovedState',
        throttleMs: 1000,
      });
      return false;
    }
  };

  const setRemoved = (pid: string, on: boolean): unknown => {
    try {
      if (hasDoorsAction(App, 'setRemoved')) {
        return callDoorsAction(App, 'setRemoved', pid, !!on, refreshGatedMeta);
      }
    } catch (error) {
      __wp_reportPickingIssue(App, error, { where: 'canvasPicking', op: 'removePart.setRemovedCall' });
    }

    const err = new Error('[WardrobePro] Missing doors.setRemoved action (domain API not loaded)');
    __wp_reportPickingIssue(
      App,
      err,
      { where: 'canvasPicking', op: 'removePart.missingDomainApi' },
      { failFast: true }
    );
  };

  const nextRemoved = !hasRemoved(partId);

  __wp_historyBatch(App, structuralMeta, () => {
    setRemoved(partId, nextRemoved);
    return undefined;
  });

  const frameSide = readRemovableFrameSideFromPartId(partId);
  const sketchBoxSide = readRemovableSketchBoxSideFromPartId(partId);
  if (nextRemoved && frameSide) {
    const cellLabel = frameSide === 'left' ? 'השמאלי' : 'הימני';
    __wp_toast(App, `הדופן הוסרה — המדפים בתא ${cellLabel} הפכו למדפי קושרת.`, 'info');
  } else if (nextRemoved && sketchBoxSide) {
    const cellLabel = sketchBoxSide.side === 'left' ? 'השמאלי' : 'הימני';
    __wp_toast(App, `דופן הקופסא הוסרה — המדפים בצד ${cellLabel} הפכו למדפי קושרת.`, 'info');
  }

  requestDoorAuthoringBurstRefresh(App, 'removeParts:smart');
  return true;
}
