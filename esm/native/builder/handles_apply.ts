import { runPlatformRenderFollowThrough } from '../runtime/platform_access.js';
import { asRecord } from '../runtime/record.js';
import { purgeHandlesForRemovedDoors } from './handles_purge.js';
import { createHandlesApplyRuntime } from './handles_apply_shared.js';
import { applyDoorHandles } from './handles_apply_doors.js';
import { applyDrawerHandles } from './handles_apply_drawers.js';

function shouldTriggerHandlesRender(ctx: unknown): boolean {
  const rec = asRecord<Record<string, unknown>>(ctx);
  return rec?.triggerRender !== false;
}

export function applyHandles(ctx: unknown): void {
  const runtime = createHandlesApplyRuntime(ctx);
  const App = runtime.App;

  runtime.syncDoorVisibilityForRemovedDoors();
  applyDoorHandles(runtime);
  applyDrawerHandles(runtime);

  if (runtime.removeDoorsEnabled) purgeHandlesForRemovedDoors(true, { App });
  if (shouldTriggerHandlesRender(ctx)) {
    runPlatformRenderFollowThrough(App, { updateShadows: false });
  }
}
