import type { DrawerVisualEntryLike } from '../../../types';

import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { getCfg } from '../kernel/api.js';
import { getCamera, getWardrobeGroup } from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { getTools } from '../runtime/service_access.js';
import { drawerVisualMatchesId } from '../runtime/drawer_visual_identity.js';
import {
  __callMaybe,
  __getSketchPlacementPreviewFns,
  __readRecord,
  __withAppThree,
  type DrawerDividerHoverPreviewArgs,
} from './canvas_picking_hover_preview_modes_shared.js';

type Vec3Like = { x: number; y: number; z: number };

type DrawerDividerPreviewMotion = {
  box: { centerX: number; centerY: number; centerZ: number; width: number; height: number; depth: number };
  offset: Vec3Like;
  closed: Vec3Like;
  targetId: string | number | null;
};

function readFiniteVec3(value: unknown): Vec3Like | null {
  const rec = __readRecord(value);
  if (!rec) return null;
  const x = Number(rec.x);
  const y = Number(rec.y);
  const z = Number(rec.z);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
}

function readForcedOpenDrawerId(App: DrawerDividerHoverPreviewArgs['App']): string | number | null {
  try {
    const tools = getTools(App);
    if (typeof tools.getDrawersOpenId !== 'function') return null;
    const id = tools.getDrawersOpenId();
    return typeof id === 'string' || typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}

function asDrawerVisualEntryLike(
  drawer: Record<string, unknown> | null | undefined
): DrawerVisualEntryLike | null {
  return drawer ? (drawer as unknown as DrawerVisualEntryLike) : null;
}

function drawerIsForcedOpenDividerTarget(
  App: DrawerDividerHoverPreviewArgs['App'],
  drawer: Record<string, unknown>
): boolean {
  const forcedOpenId = readForcedOpenDrawerId(App);
  if (forcedOpenId == null) return false;
  return drawerVisualMatchesId(asDrawerVisualEntryLike(drawer), forcedOpenId);
}

function readDrawerDividerPreviewTrackId(
  App: DrawerDividerHoverPreviewArgs['App'],
  drawer: Record<string, unknown>
): string | number | null {
  const forcedOpenId = readForcedOpenDrawerId(App);
  if (forcedOpenId != null && drawerVisualMatchesId(asDrawerVisualEntryLike(drawer), forcedOpenId))
    return forcedOpenId;
  const id = drawer.id;
  if (typeof id === 'string' || typeof id === 'number') return id;
  const partId = drawer.partId;
  return typeof partId === 'string' || typeof partId === 'number' ? partId : null;
}

function resolveDrawerDividerPreviewMotion(args: {
  App: DrawerDividerHoverPreviewArgs['App'];
  drawer: Record<string, unknown>;
  box: { centerX: number; centerY: number; centerZ: number; width: number; height: number; depth: number };
}): DrawerDividerPreviewMotion {
  const { App, drawer, box } = args;
  const group = __readRecord(drawer.group);
  const current = readFiniteVec3(group?.position);
  const closed = readFiniteVec3(drawer.closed);
  const open = readFiniteVec3(drawer.open);

  // The hover must track the live drawer transform, not the drawer's final open
  // target.  A forced-open divider drawer starts its animation from the closed
  // transform; projecting the hover straight to `open` makes the preview jump
  // while the drawer itself is still moving.
  if (current && closed) {
    const offset = {
      x: current.x - closed.x,
      y: current.y - closed.y,
      z: current.z - closed.z,
    };
    return {
      box,
      offset,
      closed,
      targetId: readDrawerDividerPreviewTrackId(App, drawer),
    };
  }

  if ((drawer.isOpen === true || drawerIsForcedOpenDividerTarget(App, drawer)) && open && closed) {
    return {
      box: {
        ...box,
        centerX: box.centerX + (open.x - closed.x),
        centerY: box.centerY + (open.y - closed.y),
        centerZ: box.centerZ + (open.z - closed.z),
      },
      offset: {
        x: open.x - closed.x,
        y: open.y - closed.y,
        z: open.z - closed.z,
      },
      closed,
      targetId: readDrawerDividerPreviewTrackId(App, drawer),
    };
  }

  return {
    box,
    offset: { x: 0, y: 0, z: 0 },
    closed: closed || { x: 0, y: 0, z: 0 },
    targetId: readDrawerDividerPreviewTrackId(App, drawer),
  };
}

export function tryHandleDrawerDividerHoverPreview(args: DrawerDividerHoverPreviewArgs): boolean {
  if (!args.isDividerEditMode) return false;
  try {
    const { App, ndcX, ndcY, raycaster, mouse, hideLayoutPreview, resolveDrawerHoverPreviewTarget } = args;
    const THREE = getThreeMaybe(App);
    __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));
    const { hidePreview, setPreview } = __getSketchPlacementPreviewFns(App);
    if (!setPreview || !getCamera(App) || !getWardrobeGroup(App)) {
      __callMaybe(hidePreview, __withAppThree(App, THREE));
      return false;
    }

    const hoverTarget = resolveDrawerHoverPreviewTarget(App, raycaster, mouse, ndcX, ndcY);
    const hoverDrawer = hoverTarget ? __readRecord(hoverTarget.drawer) : null;
    const parent = hoverTarget ? __readRecord(hoverTarget.parent) : null;
    const box = hoverTarget ? hoverTarget.box : null;

    if (
      !hoverDrawer ||
      !hoverDrawer.group ||
      !parent ||
      !box ||
      !(box.width > 0) ||
      !(box.height > 0) ||
      !(box.depth > 0)
    ) {
      __callMaybe(hidePreview, __withAppThree(App, THREE));
      return false;
    }

    const cfg = __readRecord(getCfg(App));
    const dividerMap = __readRecord(cfg?.drawerDividersMap);
    const dividerKey =
      formatIdentityValue(readIdentityValue(hoverDrawer?.dividerKey)) ||
      formatIdentityValue(readIdentityValue(hoverDrawer?.id));
    const partId = formatIdentityValue(readIdentityValue(hoverDrawer?.id));
    const hasDivider = !!(
      dividerMap &&
      ((dividerKey && dividerMap[dividerKey]) || (partId && dividerMap[partId]))
    );

    const motion = resolveDrawerDividerPreviewMotion({ App, drawer: hoverDrawer, box });
    const previewBox = motion.box;

    setPreview({
      App,
      THREE,
      anchor: hoverDrawer.group,
      anchorParent: parent,
      kind: 'drawer_divider',
      x: previewBox.centerX,
      y: previewBox.centerY,
      z: previewBox.centerZ,
      w: Math.max(0.03, previewBox.width),
      h: Math.max(0.03, previewBox.height),
      d: Math.max(0.03, previewBox.depth),
      woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
      op: hasDivider ? 'remove' : 'add',
      drawerMotionPreview: true,
      drawerMotionDrawerId: motion.targetId,
      drawerMotionOffsetX: motion.offset.x,
      drawerMotionOffsetY: motion.offset.y,
      drawerMotionOffsetZ: motion.offset.z,
      drawerMotionClosedX: motion.closed.x,
      drawerMotionClosedY: motion.closed.y,
      drawerMotionClosedZ: motion.closed.z,
    });
    return true;
  } catch {
    return false;
  }
}
