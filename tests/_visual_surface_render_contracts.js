import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const CASES = [
  {
    name: 'render access state keeps the canonical bag/runtime seam',
    owner: 'esm/native/runtime/render_access_state.ts',
    includes: [/render_access_state_bags\.js/, /render_access_state_runtime\.js/],
    excludes: [/function getRenderCache\(/],
    helpers: [
      [
        'esm/native/runtime/render_access_state_bags.ts',
        [/export function getRenderCache\(/, /export function ensureRenderMaterialSlots\(/],
      ],
      [
        'esm/native/runtime/render_access_state_runtime.ts',
        [/export function ensureRenderRuntimeState\(/, /export function readAutoHideFloorCache\(/],
      ],
    ],
  },
  {
    name: 'render ops keep the primitive/install/shared split at the canonical owner seam',
    owner: 'esm/native/builder/render_ops.ts',
    includes: [
      /render_ops_shared\.js/,
      /render_ops_primitives\.js/,
      /render_ops_install\.js/,
      /createBuilderRenderPrimitiveOps\(/,
      /createBuilderRenderOpsInstall\(/,
    ],
    excludes: [/function __commonArgs\(/],
    helpers: [
      [
        'esm/native/builder/render_ops_shared.ts',
        [/render_ops_shared_args\.js/, /render_ops_shared_state\.js/, /render_ops_shared_mirror\.js/],
      ],
      ['esm/native/builder/render_ops_primitives.ts', [/export function createBuilderRenderPrimitiveOps\(/]],
      ['esm/native/builder/render_ops_install.ts', [/export function createBuilderRenderOpsInstall\(/]],
      ['esm/native/builder/render_ops_shared_args.ts', [/export function __commonArgs\(/]],
      ['esm/native/builder/render_ops_shared_state.ts', [/export function __matCache\(/]],
      ['esm/native/builder/render_ops_shared_mirror.ts', [/export function __tagAndTrackMirrorSurfaces\(/]],
      ['esm/native/builder/render_ops_shared_errors.ts', [/export function __renderOpsHandleCatch\(/]],
      ['esm/native/builder/render_ops_shared_registry.ts', [/export function __reg\(/]],
    ],
  },
  {
    name: 'render carcass flow stays routed through focused carcass owners',
    owner: 'esm/native/builder/render_carcass_ops.ts',
    includes: [
      /render_carcass_ops_base\.js/,
      /render_carcass_ops_cornice\.js/,
      /applyCarcassBaseOps\(/,
      /applyCarcassCorniceOps\(/,
    ],
    excludes: [/function applyBaseSupport\(/, /function applyCorniceSegment\(/],
    helpers: [
      [
        'esm/native/builder/render_carcass_ops_shared.ts',
        [
          /render_carcass_ops_shared_readers\.js/,
          /render_carcass_ops_shared_runtime\.js/,
          /render_carcass_ops_shared_geometry\.js/,
        ],
      ],
      ['esm/native/builder/render_carcass_ops_base.ts', [/function applyCarcassBaseOps\(/]],
      ['esm/native/builder/render_carcass_ops_cornice.ts', [/render_carcass_ops_cornice_apply\.js/]],
      ['esm/native/builder/render_carcass_ops_cornice_apply.ts', [/function applyCarcassCorniceOps\(/]],
      [
        'esm/native/builder/render_carcass_ops_cornice_segments.ts',
        [/export function createWaveFrontSegment\(/],
      ],
      ['esm/native/builder/render_carcass_ops_cornice_miter.ts', [/export function applyMiterTrims\(/]],
      [
        'esm/native/builder/render_carcass_ops_cornice_finalize.ts',
        [/export function finalizeCorniceMesh\(/],
      ],
      ['esm/native/builder/render_carcass_ops_shared_readers.ts', [/export function __asContext\(/]],
      ['esm/native/builder/render_carcass_ops_shared_runtime.ts', [/export function __readThreeCtorLike\(/]],
      ['esm/native/builder/render_carcass_ops_shared_geometry.ts', [/export function __stripMiterCaps\(/]],
    ],
  },
  {
    name: 'render dimension flow keeps main/corner dimensions behind dedicated owners',
    owner: 'esm/native/builder/render_dimension_ops.ts',
    includes: [
      /render_dimension_ops_shared\.js/,
      /render_dimension_ops_main\.js/,
      /render_dimension_ops_corner\.js/,
    ],
    excludes: [/function applyMainWardrobeDimensionOps\(/],
    helpers: [
      [
        'esm/native/builder/render_dimension_ops_shared.ts',
        [/export function createRenderDimensionContext\(/],
      ],
      [
        'esm/native/builder/render_dimension_ops_main.ts',
        [/export function applyMainWardrobeDimensionOps\(/],
      ],
      ['esm/native/builder/render_dimension_ops_corner.ts', [/export function applyCornerDimensionOps\(/]],
    ],
  },
  {
    name: 'render door flow keeps shared/sliding/hinged ownership explicit',
    owner: 'esm/native/builder/render_door_ops.ts',
    includes: [
      /render_door_ops_shared\.js/,
      /render_door_ops_sliding\.js/,
      /render_door_ops_hinged\.js/,
      /createApplySlidingDoorsOps\(/,
      /createApplyHingedDoorsOps\(/,
    ],
    excludes: [/function applySlidingDoorsOps\(/, /function applyHingedDoorsOps\(/],
    helpers: [
      [
        'esm/native/builder/render_door_ops_shared.ts',
        [
          /render_door_ops_shared_core\.js/,
          /render_door_ops_shared_config\.js/,
          /render_door_ops_shared_ops\.js/,
          /render_door_ops_shared_materials\.js/,
        ],
      ],
      ['esm/native/builder/render_door_ops_sliding.ts', [/export function createApplySlidingDoorsOps\(/]],
      ['esm/native/builder/render_door_ops_hinged.ts', [/export function createApplyHingedDoorsOps\(/]],
      [
        'esm/native/builder/render_door_ops_shared_core.ts',
        [/export function readCurtainType\(/, /export function readDoorVisualFactory\(/],
      ],
      ['esm/native/builder/render_door_ops_shared_config.ts', [/export function resolveDoorVisualStyle\(/]],
      [
        'esm/native/builder/render_door_ops_shared_ops.ts',
        [/export function readSlidingDoorOp\(/, /export function readHingedDoorOp\(/],
      ],
      [
        'esm/native/builder/render_door_ops_shared_materials.ts',
        [/export function createSlidingTrackPalette\(/, /export function buildRailGroup\(/],
      ],
    ],
  },
  {
    name: 'render drawer flow keeps shared/external/internal drawer owners explicit',
    owner: 'esm/native/builder/render_drawer_ops.ts',
    includes: [
      /render_drawer_ops_shared\.js/,
      /render_drawer_ops_external\.js/,
      /render_drawer_ops_internal\.js/,
    ],
    excludes: [/function applyExternalDrawersOps\(/, /function applyInternalDrawersOps\(/],
    helpers: [
      [
        'esm/native/builder/render_drawer_ops_shared.ts',
        [/render_drawer_ops_shared_ops\.js/, /render_drawer_ops_shared_visual_state\.js/],
      ],
      [
        'esm/native/builder/render_drawer_ops_shared_ops.ts',
        [/export function readExternalDrawerOp\(/, /export function readInternalDrawerOp\(/],
      ],
      [
        'esm/native/builder/render_drawer_ops_shared_visual_state.ts',
        [/export function resolveDrawerVisualState\(/],
      ],
      [
        'esm/native/builder/render_drawer_ops_external.ts',
        [/export function createApplyExternalDrawersOps\(/],
      ],
      [
        'esm/native/builder/render_drawer_ops_internal.ts',
        [/export function createApplyInternalDrawersOps\(/],
      ],
    ],
  },
  {
    name: 'render interior custom/preset flows stay behind focused wall-face and shelf seams',
    owner: 'esm/native/builder/render_interior_custom_ops.ts',
    includes: [
      /render_interior_custom_ops_shared\.js/,
      /render_interior_custom_ops_wall_faces\.js/,
      /render_interior_custom_ops_shelves\.js/,
      /render_interior_custom_ops_layout\.js/,
    ],
    excludes: [/const addShelfPins = \(/, /const __computeModuleInnerFaces = \(\)/],
    helpers: [
      [
        'esm/native/builder/render_interior_custom_ops_shared.ts',
        [/export type InteriorCustomInput =/, /export function buildRodMap\(/],
      ],
      [
        'esm/native/builder/render_interior_custom_ops_wall_faces.ts',
        [/export function computeCustomModuleInnerFaces\(/],
      ],
      [
        'esm/native/builder/render_interior_custom_ops_shelves.ts',
        [/export function createAddCustomGridShelf\(/],
      ],
      [
        'esm/native/builder/render_interior_custom_ops_layout.ts',
        [/export function applyCustomInteriorGridLayout\(/, /export function applyCustomStorageBarrier\(/],
      ],
      [
        'esm/native/builder/render_interior_preset_ops.ts',
        [
          /render_interior_preset_ops_shared\.js/,
          /render_interior_preset_ops_wall_faces\.js/,
          /render_interior_preset_ops_shelves\.js/,
        ],
      ],
      [
        'esm/native/builder/render_interior_preset_ops_shared.ts',
        [/export type InteriorPresetInput =/, /export function buildBraceShelfIndexSet\(/],
      ],
      [
        'esm/native/builder/render_interior_preset_ops_wall_faces.ts',
        [/export function computePresetModuleInnerFaces\(/],
      ],
      ['esm/native/builder/render_interior_preset_ops_shelves.ts', [/export function createAddGridShelf\(/]],
    ],
  },
  {
    name: 'render extras keep shared dimensions/outlines routed through focused seams',
    owner: 'esm/native/builder/render_ops_extras.ts',
    includes: [
      /render_ops_extras_shared\.js/,
      /render_ops_extras_dimensions\.js/,
      /render_ops_extras_outlines\.js/,
      /export \{ getDimLabelEntry, addDimensionLine, addOutlines \};/,
    ],
    excludes: [/export function getDimLabelEntry\(/, /export function addOutlines\(/],
    helpers: [
      ['esm/native/builder/render_ops_extras_shared.ts', [/export function ensureRenderOpsExtrasRuntime\(/]],
      [
        'esm/native/builder/render_ops_extras_dimensions.ts',
        [/export function getDimLabelEntry\(/, /export function addDimensionLine\(/],
      ],
      ['esm/native/builder/render_ops_extras_outlines.ts', [/export function addOutlines\(/]],
    ],
  },
  {
    name: 'render preview interior-hover flow keeps shared/cache/apply ownership explicit',
    owner: 'esm/native/builder/render_preview_interior_hover_ops.ts',
    includes: [
      /render_preview_interior_hover_shared\.js/,
      /render_preview_interior_hover_cache\.js/,
      /render_preview_interior_hover_apply\.js/,
    ],
    excludes: [/function ensureInteriorLayoutHoverPreview\(/, /function setInteriorLayoutHoverPreview\(/],
    helpers: [
      [
        'esm/native/builder/render_preview_interior_hover_shared.ts',
        [/export function createRenderPreviewInteriorHoverShared\(/],
      ],
      [
        'esm/native/builder/render_preview_interior_hover_cache.ts',
        [/export function ensureInteriorLayoutHoverPreview\(/],
      ],
      [
        'esm/native/builder/render_preview_interior_hover_apply.ts',
        [
          /export function setInteriorLayoutHoverPreview\(/,
          /export function hideInteriorLayoutHoverPreview\(/,
        ],
      ],
    ],
  },
  {
    name: 'render preview sketch pipeline keeps object/box/linear helpers split by intent',
    owner: 'esm/native/builder/render_preview_sketch_pipeline.ts',
    includes: [
      /render_preview_sketch_pipeline_box_content\.js/,
      /render_preview_sketch_pipeline_linear\.js/,
      /render_preview_sketch_pipeline_object_boxes\.js/,
    ],
    excludes: [/if \(kind === 'object_boxes'\) \{/, /if \(kind === 'drawers'\) \{/],
    helpers: [
      [
        'esm/native/builder/render_preview_sketch_pipeline_shared.ts',
        [/export function createSketchPlacementPreviewContext\(/],
      ],
      [
        'esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts',
        [/export function applyObjectBoxesSketchPlacementPreview\(/],
      ],
      [
        'esm/native/builder/render_preview_sketch_pipeline_box_content.ts',
        [
          /render_preview_sketch_pipeline_box_content_drawers\.js/,
          /render_preview_sketch_pipeline_box_content_box\.js/,
        ],
      ],
      [
        'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts',
        [/function applyDrawersPreview\(/],
      ],
      [
        'esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts',
        [/export function applyBoxVolumeSketchPlacementPreview\(/],
      ],
      [
        'esm/native/builder/render_preview_sketch_pipeline_linear.ts',
        [/applyLinearSketchPlacementPreview/, /showPrimaryBody/],
      ],
    ],
  },
  {
    name: 'render tab shared owner keeps contracts/room/lighting/interactions separated',
    owner: 'esm/native/ui/react/tabs/render_tab_shared.ts',
    includes: [
      /render_tab_shared_contracts\.js/,
      /render_tab_shared_normalize\.js/,
      /render_tab_shared_lighting\.js/,
      /render_tab_shared_room\.js/,
      /render_tab_shared_interactions\.js/,
    ],
    excludes: [/LIGHT_PRESETS/, /getRoomDesignData\(/, /syncGlobalClickMode\(/],
    helpers: [
      [
        'esm/native/ui/react/tabs/render_tab_shared_contracts.ts',
        [/export type RenderTabFloorType/, /export const DEFAULT_WALL_COLOR/],
      ],
      ['esm/native/ui/react/tabs/render_tab_shared_normalize.ts', [/export function normalizeFloorStyle\(/]],
      [
        'esm/native/ui/react/tabs/render_tab_shared_lighting.ts',
        [/export const LIGHT_PRESETS/, /export function getLightBounds\(/],
      ],
      ['esm/native/ui/react/tabs/render_tab_shared_room.ts', [/export function getRoomDesignData\(/]],
      [
        'esm/native/ui/react/tabs/render_tab_shared_interactions.ts',
        [/export function syncGlobalClickMode\(/, /export function getUiNotesControls\(/],
      ],
    ],
  },
];

test('render family keeps one thin structural contract across canonical seams', async t => {
  for (const spec of CASES) {
    await t.test(spec.name, () => {
      const owner = read(spec.owner);
      for (const pattern of spec.includes ?? []) assert.match(owner, pattern);
      for (const pattern of spec.excludes ?? []) assert.doesNotMatch(owner, pattern);
      for (const [rel, patterns] of spec.helpers ?? []) {
        const source = read(rel);
        for (const pattern of patterns) assert.match(source, pattern, `${rel} missing ${pattern}`);
      }
    });
  }
});
