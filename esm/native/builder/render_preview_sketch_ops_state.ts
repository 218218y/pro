import type { AppContainer } from '../../../types';
import type { PreviewGroupLike, PreviewTHREESurface } from './render_preview_ops_contracts.js';
import { hideSketchPlacementMeasurements } from './render_preview_sketch_measurements.js';
import { createSketchPlacementPreviewMaterials } from './render_preview_sketch_ops_materials.js';
import {
  createSketchPlacementPreviewGroup,
  readSketchPlacementPreviewMeshSlots,
} from './render_preview_sketch_ops_meshes.js';
import type { RenderPreviewSketchOpsContext } from './render_preview_sketch_ops_types.js';

function resolveTHREEForEnsure(
  owner: RenderPreviewSketchOpsContext,
  App: AppContainer,
  value: unknown
): PreviewTHREESurface | null {
  let THREE = owner.deps.asObject<PreviewTHREESurface>(value);
  if (THREE) return THREE;

  try {
    THREE = owner.deps.asObject<PreviewTHREESurface>(
      owner.assertTHREE(App, 'native/builder/render_ops.sketchPlacementPreview')
    );
    return THREE || null;
  } catch {
    return null;
  }
}

function hasAttachedSketchPreviewChildren(
  group: PreviewGroupLike,
  owner: RenderPreviewSketchOpsContext
): boolean {
  const { shared } = owner;
  const slots = readSketchPlacementPreviewMeshSlots(group, shared);
  const isAttached = (mesh: unknown): boolean => {
    const candidate = shared.asPreviewMesh(mesh) || shared.asPreviewGroup(mesh);
    return !!(candidate && candidate.parent === group);
  };

  const hasCoreMesh =
    !!slots.shelfA &&
    !!slots.shelfA.geometry &&
    typeof slots.shelfA.position?.set === 'function' &&
    typeof slots.shelfA.scale?.set === 'function' &&
    isAttached(slots.shelfA);

  return (
    hasCoreMesh &&
    isAttached(slots.boxTop) &&
    isAttached(slots.boxBottom) &&
    isAttached(slots.boxLeft) &&
    isAttached(slots.boxRight) &&
    isAttached(slots.boxBack)
  );
}

function detachInvalidSketchPreviewGroup(group: PreviewGroupLike, owner: RenderPreviewSketchOpsContext) {
  try {
    const parent = owner.shared.asPreviewGroup(group.parent);
    if (parent && typeof parent.remove === 'function') parent.remove(group);
  } catch {
    // ignore stale preview cleanup failures
  }
}

function restoreSketchPreviewAttachment(
  previewGroup: PreviewGroupLike,
  wardrobeGroup: unknown,
  owner: RenderPreviewSketchOpsContext
) {
  if (previewGroup.parent) return;
  const group = owner.shared.asPreviewGroup(wardrobeGroup);
  if (group && owner.shared.isFn(group.add)) group.add(previewGroup);
}

export function ensureSketchPlacementPreviewOwner(
  owner: RenderPreviewSketchOpsContext,
  args: unknown
): PreviewGroupLike | null {
  const input = owner.shared.readArgs(args);
  const App = owner.app(input);
  owner.ops(App);
  const THREE = resolveTHREEForEnsure(owner, App, input.THREE);
  if (!THREE) return null;

  try {
    const wardrobeGroup = owner.wardrobeGroup(App);
    if (!wardrobeGroup) return null;

    const existing = owner.cacheValue(App, 'sketchPlacementPreview');
    const previewGroup = existing ? owner.shared.asPreviewGroup(existing) : null;
    if (previewGroup?.isGroup) {
      if (hasAttachedSketchPreviewChildren(previewGroup, owner)) {
        restoreSketchPreviewAttachment(previewGroup, wardrobeGroup, owner);
        return previewGroup;
      }
      detachInvalidSketchPreviewGroup(previewGroup, owner);
      owner.writeCacheValue(App, 'sketchPlacementPreview', null);
    }

    const materials = createSketchPlacementPreviewMaterials(THREE, owner.shared);
    const nextGroup = createSketchPlacementPreviewGroup({ THREE, shared: owner.shared, materials });
    owner.writeCacheValue(App, 'sketchPlacementPreview', nextGroup);
    wardrobeGroup.add(nextGroup);
    return nextGroup;
  } catch (error) {
    owner.renderOpsHandleCatch(App, 'ensureSketchPlacementPreview', error, undefined, {
      failFast: false,
      throttleMs: 5000,
    });
    return null;
  }
}

export function hideSketchPlacementPreviewOwner(
  owner: RenderPreviewSketchOpsContext,
  args: unknown
): undefined {
  const input = owner.shared.readArgs(args);
  const App = owner.app(input);
  owner.ops(App);
  try {
    const group = owner.shared.asPreviewGroup(owner.cacheValue(App, 'sketchPlacementPreview'));
    if (group) {
      group.visible = false;
      const userData = owner.shared.readUserData(group.userData);
      for (const key of owner.shared.sketchMeshKeys) {
        const mesh = owner.shared.asPreviewMesh(userData[key]);
        if (!mesh) continue;
        mesh.visible = false;
        try {
          owner.shared.setOutlineVisible(mesh, false);
        } catch {
          // ignore stale outline cleanup failures
        }
      }
      hideSketchPlacementMeasurements(group, owner.shared);
    }
  } catch {
    // preserve historical fire-and-forget hide behavior
  }
  return undefined;
}
