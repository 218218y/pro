import type { AppContainer } from '../../../types';

import { applyPaintConfigSnapshot } from './canvas_picking_config_actions.js';
import {
  __wp_historyBatch,
  __wp_reportPickingIssue,
  __wp_triggerRender,
} from './canvas_picking_core_helpers.js';
import {
  createCanvasPickingPaintMaterialRefreshMeta,
  createCanvasPickingPaintStructuralMeta,
} from './canvas_picking_paint_meta.js';
import { refreshMaterialsNoBuild } from './canvas_picking_paint_flow_shared.js';
import {
  summarizePaintFlowChanges,
  type PaintFlowChangeSummary,
  type PaintFlowMutableState,
} from './canvas_picking_paint_flow_apply_state.js';
import type { PaintInvalidationKind } from './canvas_picking_paint_command.js';

export function commitPaintFlowState(args: {
  App: AppContainer;
  state: PaintFlowMutableState;
  paintSource: string;
  invalidationKind: PaintInvalidationKind;
}): PaintFlowChangeSummary {
  const { App, state, paintSource, invalidationKind } = args;
  const summary = summarizePaintFlowChanges(state, invalidationKind);
  if (!summary.didChange) return summary;

  const baseMeta = createCanvasPickingPaintStructuralMeta(paintSource);
  let commitCompleted = false;
  __wp_historyBatch(App, baseMeta, () => {
    const meta = summary.useNoBuildMaterialRefresh
      ? createCanvasPickingPaintMaterialRefreshMeta(App, paintSource, baseMeta)
      : baseMeta;
    applyPaintConfigSnapshot({
      App,
      individualColors: state.colors,
      curtainMap: state.curtains,
      doorSpecialMap: state.special,
      doorStyleMap: summary.styleChanged ? state.style : undefined,
      mirrorLayoutMap: state.mirrorLayout,
      meta,
    });
    commitCompleted = true;
    return undefined;
  });

  if (!commitCompleted) {
    __wp_reportPickingIssue(
      App,
      new Error('[WardrobePro][canvasPicking.paint] config commit did not complete'),
      { where: 'canvasPicking.paint', op: 'commit', throttleMs: 1000 }
    );
    return summary;
  }

  if (summary.useNoBuildMaterialRefresh) {
    try {
      refreshMaterialsNoBuild(App);
      __wp_triggerRender(App, false);
    } catch (error) {
      __wp_reportPickingIssue(App, error, {
        where: 'canvasPicking.paint',
        op: 'refreshAfterCommit',
        throttleMs: 1000,
      });
    }
  }

  return summary;
}
