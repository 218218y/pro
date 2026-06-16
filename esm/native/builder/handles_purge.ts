import { getModeId } from '../runtime/api.js';
import { getScene, getWardrobeGroup } from '../runtime/render_access.js';
import { getBuildStateMaybe, getMode, getState, getUi } from './store_access.js';
import { appFromCtx, asNode, ensureHandlesSurface, getViewFlags, type NodeLike } from './handles_shared.js';
import { captureHandlesConfigSnapshot, createHandlesDoorRemovedReader } from './handles_config_snapshot.js';

export function purgeHandlesForRemovedDoors(forceEnabled: boolean | unknown, ctx: unknown): void {
  const App = appFromCtx(ctx);
  ensureHandlesSurface(App);

  const __st = getBuildStateMaybe(App) || getState(App) || {};
  const __mode = (__st && __st.mode) || getMode(App) || { primary: 'none', opts: {} };
  const handlesCfg = captureHandlesConfigSnapshot(App, ctx, __st);
  const __removeDoorModeId = getModeId('REMOVE_DOOR') || 'remove_door';
  const __isRemoveDoorMode = !!(__mode && __mode.primary === __removeDoorModeId);
  const __ui = (__st && __st.ui && typeof __st.ui === 'object' ? __st.ui : null) || getUi(App) || {};
  const { uiView: __uiView, stateView: __stateView } = getViewFlags(__st, __ui);

  const computedEnabled =
    !!(__ui && (__ui.removeDoorsEnabled || __ui.removeDoors)) ||
    !!(__uiView && (__uiView.removeDoorsEnabled || __uiView.removeDoors)) ||
    !!(__stateView && (__stateView.removeDoorsEnabled || __stateView.removeDoors)) ||
    __isRemoveDoorMode;
  const removeDoorsEnabled = typeof forceEnabled === 'boolean' ? forceEnabled : computedEnabled;
  if (!removeDoorsEnabled) return;

  const isDoorRemovedV7 = createHandlesDoorRemovedReader(handlesCfg.removedDoorsMap);

  const roots: NodeLike[] = [];
  const wardrobeGroup = asNode(getWardrobeGroup(App));
  if (wardrobeGroup) roots.push(wardrobeGroup);
  const scene = asNode(getScene(App));
  if (scene) roots.push(scene);

  const seen = new Set();
  const toRemove: NodeLike[] = [];

  roots.forEach((root: NodeLike) => {
    if (!root || typeof root.traverse !== 'function') return;
    if (seen.has(root)) return;
    seen.add(root);

    root.traverse?.((node: NodeLike) => {
      if (!node) return;
      const ud = node.userData || null;
      const isHandleNode = node.name === 'handle_group_v7' || (ud && (ud.__kind === 'handle' || ud.isHandle));
      if (!isHandleNode) return;

      let partId = ud && ud.partId ? ud.partId : null;
      if (!partId) {
        let p = node.parent;
        while (p) {
          if (p.userData && p.userData.partId) {
            partId = p.userData.partId;
            break;
          }
          p = p.parent;
        }
      }
      if (!partId) return;
      if (isDoorRemovedV7(partId)) toRemove.push(node);
    });
  });

  for (let i = 0; i < toRemove.length; i++) {
    const n = toRemove[i];
    if (n && n.parent && typeof n.parent.remove === 'function') n.parent.remove(n);
  }
}
