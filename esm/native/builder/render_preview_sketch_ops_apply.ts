import type { AppContainer } from '../../../types';
import type { PreviewTHREESurface, SketchPlacementPreviewArgs } from './render_preview_ops_contracts.js';
import { applySketchPlacementPreview } from './render_preview_sketch_pipeline.js';
import { ensureSketchPlacementPreviewOwner } from './render_preview_sketch_ops_state.js';
import { readSketchPlacementPreviewMeshSlots } from './render_preview_sketch_ops_meshes.js';
import type { RenderPreviewSketchOpsContext } from './render_preview_sketch_ops_types.js';

function resolveTHREEForApply(
  owner: RenderPreviewSketchOpsContext,
  input: SketchPlacementPreviewArgs,
  App: AppContainer
): PreviewTHREESurface | null {
  const maybeTHREE = input.THREE || owner.getThreeMaybe(App);
  let THREE = owner.deps.asObject<PreviewTHREESurface>(maybeTHREE) || null;
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

function attachSketchPlacementPreviewToDesiredParent(
  owner: RenderPreviewSketchOpsContext,
  App: AppContainer,
  input: SketchPlacementPreviewArgs,
  group: unknown
): void {
  try {
    const previewGroup = owner.shared.asPreviewGroup(group);
    if (!previewGroup) return;

    const anchorObj = owner.shared.asPreviewGroup(input.anchor) || owner.shared.asPreviewMesh(input.anchor);
    const anchorParent = owner.shared.asPreviewGroup(input.anchorParent);
    const desiredParent =
      anchorParent || (anchorObj && owner.shared.asPreviewGroup(anchorObj.parent)) || null;
    const root = owner.wardrobeGroup(App);

    if (desiredParent && typeof desiredParent.add === 'function') {
      if (previewGroup.parent !== desiredParent) desiredParent.add(previewGroup);
    } else if (root && previewGroup.parent !== root && typeof root.add === 'function') {
      root.add(previewGroup);
    }
  } catch {
    // keep preview application resilient to stale hover anchors
  }
}

export function setSketchPlacementPreviewOwner(owner: RenderPreviewSketchOpsContext, args: unknown) {
  const input = owner.shared.readArgs(args);
  const App = owner.app(input);
  owner.ops(App);

  const initialTHREE =
    owner.deps.asObject<PreviewTHREESurface>(input.THREE || owner.getThreeMaybe(App)) || null;
  const group = owner.shared.asPreviewGroup(
    ensureSketchPlacementPreviewOwner(owner, { App, THREE: initialTHREE })
  );
  if (!group) return null;

  const THREE = initialTHREE || resolveTHREEForApply(owner, input, App);
  if (!THREE) return null;

  attachSketchPlacementPreviewToDesiredParent(owner, App, input, group);

  const userData = owner.shared.readUserData(group.userData);
  const slots = readSketchPlacementPreviewMeshSlots(group, owner.shared);

  return applySketchPlacementPreview({
    App,
    input,
    THREE,
    g: group,
    ud: userData,
    meshes: {
      ...slots,
      helperMeshes: [
        slots.shelfA,
        slots.boxTop,
        slots.boxBottom,
        slots.boxLeft,
        slots.boxRight,
        slots.boxBack,
      ],
    },
    shared: owner.shared,
    wardrobeGroup: owner.wardrobeGroup,
    asObject: owner.deps.asObject,
  });
}
