import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';

const structureOwner = readSource('../esm/native/ui/react/tabs/StructureTab.view.tsx', import.meta.url);
const structureBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/StructureTab.view.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_state.ts',
    '../esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_effects.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_render.tsx',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts',
    '../esm/native/ui/react/tabs/structure_tab_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_core.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_models.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_numbers.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_recompute.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_mutations.ts',
    '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_optional_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx',
    '../esm/native/ui/react/tabs/structure_tab_library_helpers.ts',
  ],
  import.meta.url
);

const notesOwner = readSource('../esm/native/ui/react/notes/NotesOverlay.tsx', import.meta.url);
const notesBundle = bundleSources(
  [
    '../esm/native/ui/react/notes/NotesOverlay.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_style.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_services.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_note_card_preview.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_toolbar.tsx',
    '../esm/native/ui/react/notes/notes_overlay_controller.tsx',
    '../esm/native/ui/react/notes/notes_overlay_controller_types.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_runtime.tsx',
    '../esm/native/ui/react/notes/notes_overlay_controller_state.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_interactions.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_interactions_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_palette.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_pointer.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_effects.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_mode_effects.ts',
    '../esm/native/ui/react/notes/notes_overlay_controller_commit_effects.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_workflows.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_workflow_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_workflow_core.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_workflow_selection.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_workflow_persistence.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_workflow_session.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_workflow_events.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor_state.ts',
  ],
  import.meta.url
);

const orderPdfOwner = readSource(
  '../esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx',
  import.meta.url
);
const orderPdfBundle = bundleSources(
  [
    '../esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx',
    '../esm/native/ui/react/pdf/order_pdf_overlay_component_state.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_controller.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_controller_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_controller_shared_domain.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_controller_shared_state.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_window.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_pdfjs.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_api.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_loader.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_regions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_insertions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_details_merge.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_constants.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_extract.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_pages.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_interactive.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_draft_state.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_attachment.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_gmail_ops.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_interactions_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_stage_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_file_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_load.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_canvas.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_toolbar.tsx',
    '../esm/native/ui/react/pdf/order_pdf_overlay_layout.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_rich_editors.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_editor_surface.tsx',
  ],
  import.meta.url
);

const interiorOwner = readSource('../esm/native/ui/react/tabs/InteriorTab.view.tsx', import.meta.url);
const interiorBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/InteriorTab.view.tsx',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_state.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_sync.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_bindings_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_sketch.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_trim.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_manual.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_drawers.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_handles.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_trim.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers.tsx',
  ],
  import.meta.url
);

const designOwner = readSource('../esm/native/ui/react/tabs/DesignTab.view.tsx', import.meta.url);
const designBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/DesignTab.view.tsx',
    '../esm/native/ui/react/tabs/use_design_tab_controller.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_contracts.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_state.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_sections.ts',
    '../esm/native/ui/react/tabs/design_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_design_tab_color_manager.ts',
    '../esm/native/ui/react/tabs/use_design_tab_edit_modes.ts',
    '../esm/native/ui/react/tabs/design_tab_edit_modes_controller_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_sections.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_controls.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_door_style.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_door_features.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_cornice.tsx',
    '../esm/native/ui/react/tabs/design_tab_color_section.tsx',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel.tsx',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel_state.ts',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  ],
  import.meta.url
);

test('[stage7-ui] StructureTab bundle preserves controls/models/library seams while keeping the owner focused', () => {
  assertMatchesAll(
    assert,
    structureOwner,
    [
      /structure_tab_controls\.js/,
      /structure_tab_saved_models_panel\.js/,
      /use_structure_tab_view_state\.js/,
      /use_structure_tab_workflows\.js/,
    ],
    'structure owner'
  );
  assertMatchesAll(
    assert,
    structureBundle,
    [
      /export function TypeSelector\(/,
      /export function DimField\(/,
      /export function OptionalDimField\(/,
      /export function useStructureDraft\(/,
      /export function SavedModelsPanel\(/,
      /export function getModelsService\(/,
      /export function createStructureTabLibraryEnv\(/,
      /export function useStructureTabWorkflowControllers\(/,
      /export function useStructureTabWorkflowControllerEffects\(/,
      /export function useStructureTabRenderStackLinkBadge\(/,
      /export const STRUCTURE_CELL_DIMS_MODE_MESSAGE/,
    ],
    'structure bundle'
  );
});

test('[stage7-ui] Notes and Order PDF bundles preserve helper-heavy seams across owner + helper modules', () => {
  assertMatchesAll(
    assert,
    notesOwner,
    [/notes_overlay_helpers\.js/, /notes_overlay_note_card\.js/, /notes_overlay_controller\.js/],
    'notes owner'
  );
  assertMatchesAll(
    assert,
    notesBundle,
    [
      /export const NoteEditor =/,
      /export function ensureNotesNamespace\(/,
      /export function NoteCard\(/,
      /export function useNotesOverlayController\(/,
      /export function useNotesOverlayControllerEffects\(/,
      /export function useNotesOverlayEditorWorkflows\(/,
      /export function useNotesOverlayEditorWorkflowCore\(/,
      /export function useNotesOverlayEditorWorkflowSelection\(/,
      /export function useNotesOverlayEditorWorkflowPersistence\(/,
      /export function useNotesOverlayEditorWorkflowSession\(/,
      /export function useNotesOverlayEditorWorkflowEvents\(/,
      /export function useNotesOverlayPaletteLayout\(/,
      /export function useNotesOverlayPointerWorkflows\(/,
      /export function getSelectionOffsetsForEditor\(/,
      /export function applyInteractionToNote\(/,
      /export function commitOverlayNotes\(/,
    ],
    'notes bundle'
  );

  assertMatchesAll(
    assert,
    orderPdfOwner,
    [
      /order_pdf_overlay_component_state\.js/,
      /order_pdf_overlay_component_runtime\.js/,
      /order_pdf_overlay_controller\.js/,
      /order_pdf_overlay_toolbar\.js/,
      /order_pdf_overlay_layout\.js/,
      /order_pdf_overlay_editor_surface\.js/,
    ],
    'orderPdf owner'
  );
  assertMatchesAll(
    assert,
    orderPdfBundle,
    [
      /export const GMAIL_SUBJECT_TEMPLATE =/,
      /export function createSilentPdfJsWorkerUrl\(/,
      /export function bindExportApiFromModule\(/,
      /export function mergeAutoDetailsWithInlineManual\(/,
      /export type OrderPdfDraft =/,
      /export type InteractivePdfBuildResult =/,
      /export async function extractLoadedPdfDraftFields\(/,
      /export function createOrderPdfInitialDraft\(/,
      /export function resolveOrderPdfRefreshAuto\(/,
      /export async function buildInteractivePdfBlobForEditorDraft\(/,
      /export function createOrderPdfOverlayExportOps\(/,
      /export function createOrderPdfOverlayGmailOps\(/,
      /export function installOrderPdfOverlayKeyboardGuards\(/,
      /export function installOrderPdfOverlayFocusTrap\(/,
      /export async function ensureOrderPdfJs\(/,
      /export function scheduleOrderPdfCanvasRender\(/,
      /export function computeOrderPdfOverlayLayout\(/,
      /export function createOrderPdfDetailsEditorHandlers\(/,
      /export function OrderPdfOverlayEditorSurface\(/,
      /export function OrderPdfOverlayToolbar\(/,
    ],
    'orderPdf bundle'
  );
});

test('[stage7-ui] Interior and Design bundles preserve helper-heavy UI sections behind stable owners', () => {
  assertMatchesAll(
    assert,
    interiorOwner,
    [/use_interior_tab_view_state\.js/, /use_interior_tab_workflows\.js/, /interior_tab_sections\.js/],
    'interior owner'
  );
  assertMatchesAll(
    assert,
    interiorBundle,
    [/export function OptionBtn\(/, /export function parseSketchBoxTool\(/],
    'interior bundle'
  );

  assertMatchesAll(
    assert,
    designOwner,
    [/use_design_tab_controller\.js/, /design_tab_color_section\.js/, /design_tab_sections\.js/],
    'design owner'
  );
  assertMatchesAll(
    assert,
    designBundle,
    [
      /export function MultiColorPanel\(/,
      /export function MultiColorPanelView\(/,
      /export function createDesignTabMulticolorViewState\(/,
      /export function useDesignTabController\(/,
      /export function createDesignTabControllerRuntime\(/,
      /export function useDesignTabColorManager\(/,
      /export function useDesignTabEditModes\(/,
    ],
    'design bundle'
  );
});
