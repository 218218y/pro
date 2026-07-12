import type { AppContainer } from '../../../types';

import { getRenderer, getScene } from '../runtime/render_access.js';
import { runMirrorCubePass } from './render_loop_mirror_cube_pass.js';
import { runPlanarMirrorSchedule } from './render_loop_mirror_planar_scheduler.js';
import {
  asRecordOrNull,
  resolveMirrorFramePolicy,
  type MirrorDriverDeps,
} from './render_loop_mirror_shared.js';
import { resolveTrackedMirrorState } from './render_loop_mirror_tracking.js';

export function createRenderLoopMirrorDriver(app: AppContainer, deps: MirrorDriverDeps) {
  let updateErrorAtMs = -1;
  let updateErrorCount = 0;

  function updateMirrorCube(): void {
    const scene = asRecordOrNull(getScene(app));
    const renderer = asRecordOrNull(getRenderer(app));
    if (!scene || !renderer) return;

    deps.setRenderSlot(app, '__mirrorWorkPending', false);
    const policy = resolveMirrorFramePolicy(app, deps);

    try {
      const tracking = resolveTrackedMirrorState(app, deps, policy);
      if (tracking.deferredForBudget || !tracking.hasMirror) return;

      const planar = runPlanarMirrorSchedule(app, deps, policy, tracking.hasMirror);
      if (planar.stopBeforeCubePass) return;

      runMirrorCubePass({
        app,
        deps,
        policy,
        mirrors: tracking.mirrors,
        hasMirror: tracking.hasMirror,
        hasCubeMirrorSurfaces: planar.hasCubeMirrorSurfaces,
        scene,
        renderer,
      });
    } catch (error) {
      const nowMs = deps.now();
      if (updateErrorAtMs >= 0 && nowMs - updateErrorAtMs < 10000) return;
      updateErrorAtMs = nowMs;
      updateErrorCount += 1;
      deps.report(app, 'mirrorCube.update', error, {
        throttleMs: 0,
        failFast: true,
        reportMeta: { count: updateErrorCount },
      });
    }
  }

  return { updateMirrorCube };
}
