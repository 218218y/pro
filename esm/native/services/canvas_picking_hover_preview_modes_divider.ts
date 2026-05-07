import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getCfg } from '../kernel/api.js';
import { getCamera, getWardrobeGroup } from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  __callMaybe,
  __getSketchPlacementPreviewFns,
  __readRecord,
  __withAppThree,
  type DrawerDividerHoverPreviewArgs,
} from './canvas_picking_hover_preview_modes_shared.js';

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
      hoverDrawer && hoverDrawer.dividerKey
        ? String(hoverDrawer.dividerKey)
        : hoverDrawer.id != null
          ? String(hoverDrawer.id)
          : '';
    const partId = hoverDrawer && hoverDrawer.id != null ? String(hoverDrawer.id) : '';
    const hasDivider = !!(
      dividerMap &&
      ((dividerKey && dividerMap[dividerKey]) || (partId && dividerMap[partId]))
    );

    setPreview({
      App,
      THREE,
      anchor: hoverDrawer.group,
      anchorParent: parent,
      kind: 'drawer_divider',
      x: box.centerX,
      y: box.centerY,
      z: box.centerZ,
      w: Math.max(0.03, box.width),
      h: Math.max(0.03, box.height),
      d: Math.max(0.03, box.depth),
      woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
      op: hasDivider ? 'remove' : 'add',
    });
    return true;
  } catch {
    return false;
  }
}
