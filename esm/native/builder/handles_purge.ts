import { getScene, getWardrobeGroup } from '../runtime/render_access.js';
import { asRecord } from '../runtime/record.js';
import {
  appFromCtx,
  asNode,
  ensureHandlesSurface,
  requireHandlesRemoveDoorsEnabled,
  type HandlesPurgeContext,
  type NodeLike,
  type ValueRecord,
} from './handles_shared.js';
import { captureHandlesConfigSnapshot, createHandlesDoorRemovedReader } from './handles_config_snapshot.js';

export function purgeHandlesForRemovedDoors(ctx: HandlesPurgeContext): void {
  const App = appFromCtx(ctx);
  ensureHandlesSurface(App);

  const ctxRecord = asRecord<ValueRecord>(ctx);
  const handlesCfg = captureHandlesConfigSnapshot(ctxRecord?.cfgSnapshot);
  const removeDoorsEnabled = requireHandlesRemoveDoorsEnabled(ctxRecord?.removeDoorsEnabled);
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
