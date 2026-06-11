import { getModeId } from '../runtime/api.js';
import { readMapOrEmpty } from '../runtime/maps_access.js';
import { getScene, getWardrobeGroup } from '../runtime/render_access.js';
import { getBuildStateMaybe, getMode, getState, getUi } from './store_access.js';
import { appFromCtx, asNode, ensureHandlesSurface, getViewFlags, type NodeLike } from './handles_shared.js';

export function purgeHandlesForRemovedDoors(forceEnabled: boolean | unknown, ctx: unknown): void {
  const App = appFromCtx(ctx);
  ensureHandlesSurface(App);

  const __st = getBuildStateMaybe(App) || getState(App) || {};
  const __mode = (__st && __st.mode) || getMode(App) || { primary: 'none', opts: {} };
  const __removeDoorModeId = getModeId(App, 'REMOVE_DOOR') || 'remove_door';
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

  const m = readMapOrEmpty(App, 'removedDoorsMap');
  if (!m) return;

  const isDoorRemovedV7 = (partId: unknown): boolean => {
    const raw = String(partId || '');
    if (!raw) return false;

    const canon = (id0: string): string => {
      let id = String(id0 || '');
      if (!id) return '';
      if (!/(?:_(?:full|top|bot|mid))$/i.test(id)) {
        if (
          /^(?:lower_)?d\d+$/.test(id) ||
          /^(?:lower_)?corner_door_\d+$/.test(id) ||
          /^(?:lower_)?corner_pent_door_\d+$/.test(id)
        ) {
          id = id + '_full';
        }
      }
      return id;
    };

    const isRemoved = (id0: string): boolean => {
      const id = canon(id0);
      if (!id) return false;
      if (m[`removed_${id}`] === true) return true;
      if (id.endsWith('_top') || id.endsWith('_mid') || id.endsWith('_bot')) {
        const full = id.replace(/_(top|mid|bot)$/i, '_full');
        return m[`removed_${full}`] === true;
      }
      return false;
    };

    return isRemoved(raw);
  };

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
