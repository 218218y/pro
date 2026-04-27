import type { AppContainer } from '../../../types';

import { readRenderLoopMotionFrameState } from './render_loop_motion_frame_state.js';
import { updateRenderLoopDoorMotions } from './render_loop_motion_doors.js';
import { updateRenderLoopDrawerMotions } from './render_loop_motion_drawers.js';

import type { DebugLogFn, RenderLoopMotionStep, ReportFn } from './render_loop_motion_shared.js';

export type { RenderLoopMotionStep } from './render_loop_motion_shared.js';

export function createRenderLoopMotionController(
  App: AppContainer,
  deps: {
    report: ReportFn;
    now: () => number;
    debugLog: DebugLogFn;
  }
) {
  const A = App;
  const { report: __renderLoopReport, now: __now, debugLog: __wpSketchDbgLog } = deps;

  function stepFrame(_now: number): RenderLoopMotionStep {
    const frame = readRenderLoopMotionFrameState(A, __renderLoopReport);
    if (!frame.isActiveState) {
      return { isAnimating: frame.isAnimating, isActiveState: false };
    }
    updateRenderLoopDoorMotions(A, frame);
    updateRenderLoopDrawerMotions(A, frame, { now: __now, debugLog: __wpSketchDbgLog });
    return { isAnimating: frame.isAnimating, isActiveState: true };
  }

  return {
    stepFrame,
  };
}
