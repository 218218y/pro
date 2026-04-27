import type { AppContainer } from '../../../types';

import { applyPaintConfigSnapshot } from './canvas_picking_config_actions.js';
import { __wp_historyBatch, __wp_metaNoBuild, __wp_triggerRender } from './canvas_picking_core_helpers.js';
import { createImmediateMeta, refreshMaterialsNoBuild } from './canvas_picking_paint_flow_shared.js';
import {
  summarizePaintFlowChanges,
  type PaintFlowChangeSummary,
  type PaintFlowMutableState,
} from './canvas_picking_paint_flow_apply_state.js';

export function commitPaintFlowState(args: {
  App: AppContainer;
  state: PaintFlowMutableState;
  paintSource: string;
}): PaintFlowChangeSummary {
  const { App, state, paintSource } = args;
  const summary = summarizePaintFlowChanges(state);
  if (!summary.didChange) return summary;

  const baseMeta = createImmediateMeta(paintSource);
  __wp_historyBatch(App, baseMeta, () => {
    const meta = summary.useNoBuildMaterialRefresh ? __wp_metaNoBuild(App, paintSource, baseMeta) : baseMeta;
    applyPaintConfigSnapshot({
      App,
      individualColors: state.colors,
      curtainMap: state.curtains,
      doorSpecialMap: state.special,
      mirrorLayoutMap: state.mirrorLayout,
      meta,
    });
    return undefined;
  });

  try {
    if (summary.useNoBuildMaterialRefresh) {
      refreshMaterialsNoBuild(App);
      __wp_triggerRender(App, false);
    }
  } catch {
    // ignore render refresh failures
  }

  return summary;
}
