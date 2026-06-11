import { getDoorsArray } from '../runtime/render_access.js';
import { createHandleMeshV7 } from './handles_mesh.js';
import type { HandlesApplyRuntime } from './handles_apply_shared.js';
import type { NodeLike } from './handles_shared.js';

export function applyDoorHandles(runtime: HandlesApplyRuntime): void {
  const { App, removeDoorsEnabled, isDoorRemovedV7, getHandleType, getEdgeHandleVariant, getHandleColor } =
    runtime;
  const doorsArray = getDoorsArray(App);
  if (!Array.isArray(doorsArray)) return;

  for (const d of doorsArray) {
    const g = d && d.group;
    if (!g || !g.userData || !g.userData.partId) continue;
    if (g.userData.__wpSketchCustomHandles === true) continue;

    runtime.removeExistingHandleChildren(g);

    const id = g.userData.partId;
    if (d && d.type === 'sliding') continue;
    if (removeDoorsEnabled && isDoorRemovedV7(id)) continue;

    const __sk = g.userData && g.userData.__wpStack === 'bottom' ? 'bottom' : 'top';
    const hType = getHandleType(id, __sk);
    if (!hType || hType === 'none') continue;

    const doorW = typeof g.userData.__doorWidth === 'number' ? g.userData.__doorWidth : 0;
    const doorH = typeof g.userData.__doorHeight === 'number' ? g.userData.__doorHeight : 0;
    const isLeftHinge = !!g.userData.__hingeLeft;

    const handle = createHandleMeshV7(hType, doorW, doorH, isLeftHinge, false, {
      App,
      edgeHandleVariant: hType === 'edge' ? getEdgeHandleVariant(id) : undefined,
      handleColor: getHandleColor(id),
    });
    if (!handle) continue;

    applyDoorHandleZFlip(g, handle);
    applyDoorHandleVerticalPlacement(runtime, g, handle, doorH);
    g.add(handle);
  }
}

function applyDoorHandleZFlip(group: NodeLike, handle: NodeLike): void {
  const __hz =
    group.userData && typeof group.userData.__handleZSign === 'number'
      ? Number(group.userData.__handleZSign)
      : 1;
  if (__hz !== -1) return;

  try {
    handle.traverse?.((ch: NodeLike) => {
      if (ch && ch.position && typeof ch.position.z === 'number') ch.position.z *= -1;
    });
  } catch (_e) {
    // ignore
  }
}

function applyDoorHandleVerticalPlacement(
  runtime: HandlesApplyRuntime,
  group: NodeLike,
  handle: NodeLike,
  doorH: number
): void {
  const absY = group.userData.__handleAbsY;
  if (!Number.isFinite(absY)) return;
  const targetAbsY = runtime.clampAbsYToGroup(Number(absY), Number(group.position?.y), Number(doorH));
  handle.position.y = targetAbsY - group.position.y;
}
