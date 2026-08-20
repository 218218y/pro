import type { AppContainer } from '../../../types';

import {
  applyCanvasFreeBoxCellDimsMutation,
  resolveCanvasFreeBoxCellDimsTarget,
  type CanvasFreeBoxCellDimsCoreArgs,
  type CanvasFreeBoxCellDimsMutationOutcome,
} from './canvas_picking_cell_dims_free_box_core.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import { readToastFn } from './canvas_picking_cell_dims_linear_shared.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';
import { commitCanvasModuleStructuralPatch } from './canvas_picking_structural_commit.js';

export type CanvasFreeBoxCellDimsArgs = CanvasFreeBoxCellDimsCoreArgs & { App: AppContainer };

function emitToast(App: AppContainer, message: string): void {
  const fn = readToastFn(App);
  if (typeof fn === 'function') fn(message, true);
}

export function tryHandleCanvasFreeBoxCellDimsClick(args: CanvasFreeBoxCellDimsArgs): boolean {
  const target = resolveCanvasFreeBoxCellDimsTarget(args);
  if (!target) return false;

  let outcome: CanvasFreeBoxCellDimsMutationOutcome = {
    changed: false,
    removedHex: false,
    appliedHex: false,
    blockedMessage: null,
  };
  const source = args.hexCellMode ? 'cellDims.freeBox.hex.apply' : 'cellDims.freeBox.apply';
  const commit = commitCanvasModuleStructuralPatch({
    App: args.App,
    stack: args.isBottomStack ? 'bottom' : 'top',
    moduleKey: target.moduleKey,
    mutate: cfg => {
      outcome = applyCanvasFreeBoxCellDimsMutation({
        cfg,
        boxId: target.boxId,
        clickArgs: args,
      });
      return outcome.changed;
    },
    meta: createCanvasPickingModulesStructuralPatchMeta(source),
    op: 'cellDims.freeBox',
  });

  if (outcome.blockedMessage) {
    __wp_toast(args.App, outcome.blockedMessage, 'error');
    return true;
  }
  if (!commit.committed || !commit.changed || !outcome.changed) return true;

  if (outcome.removedHex) emitToast(args.App, 'הקופסא חזרה לתא רגיל');
  else if (outcome.appliedHex) emitToast(args.App, 'הקופסא הוגדרה כתא משושה');
  else emitToast(args.App, 'הוחלו מידות מיוחדות על הקופסא');
  return true;
}
