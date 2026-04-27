import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFirstExisting } from './_read_src.js';

function exists(rel) {
  return fs.existsSync(new URL(`../${rel}`, import.meta.url));
}

const sidebarApp = [
  readFirstExisting(['../esm/native/ui/react/sidebar_app.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/sidebar_header.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/use_sidebar_view_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/sidebar_header_actions.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/sidebar_shared.ts'], import.meta.url),
].join('\n');
const interiorTab = [
  readFirstExisting(['../esm/native/ui/react/tabs/InteriorTab.view.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_interior_tab_view_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_interior_tab_view_state_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_interior_tab_view_state_sync.ts'], import.meta.url),
].join('\n');
const orderPdfOverlay = [
  readFirstExisting(['../esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_component_state.ts'], import.meta.url),
].join('\n');
const structureTab = [
  readFirstExisting(['../esm/native/ui/react/tabs/StructureTab.view.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_view_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_view_state_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx'],
    import.meta.url
  ),
].join('\n');
const structureTabControls = readFirstExisting(
  ['../esm/native/ui/react/tabs/structure_tab_controls.tsx'],
  import.meta.url
);
const designTab = readFirstExisting(['../esm/native/ui/react/tabs/DesignTab.view.tsx'], import.meta.url);
const designController = [
  readFirstExisting(['../esm/native/ui/react/tabs/use_design_tab_controller.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_design_tab_controller_state.ts'], import.meta.url),
].join('\n');
const designMultiColor = readFirstExisting(
  ['../esm/native/ui/react/tabs/design_tab_multicolor_panel.tsx'],
  import.meta.url
);
const renderTab = [
  readFirstExisting(['../esm/native/ui/react/tabs/use_render_tab_controller.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_render_tab_controller_state.ts'], import.meta.url),
].join('\n');
const libraryPresetIndexUrl = '../esm/native/features/library_preset/index.ts';

test('[react-hotspots] grouped shallow selectors remain the canonical pattern in sidebar/interior/order-pdf', () => {
  assert.match(sidebarApp, /useUiSelectorShallow\(/);
  assert.match(sidebarApp, /const fallbackSite2GateState = useUiSelectorShallow\(selectSite2GateState\)/);
  assert.match(
    sidebarApp,
    /useUiSelectorShallow\(ui => \(\{[\s\S]*open:\s*selectSite2GateState\(ui\)\.open,[\s\S]*storeActive:\s*selectActiveTabId\(ui\)[\s\S]*\}\)\)/
  );
  assert.doesNotMatch(sidebarApp, /const gateUntilRaw = useUiSelector\(/);
  assert.doesNotMatch(sidebarApp, /const storeActive = useUiSelector\(/);

  assert.match(interiorTab, /useUiSelectorShallow(?:<[^>]+>)?\(readInteriorTabUiSnapshot\)/);
  assert.match(interiorTab, /useCfgSelectorShallow(?:<[^>]+>)?\(readInteriorTabHandleCfgSnapshot\)/);
  assert.match(interiorTab, /useModeSelectorShallow(?:<[^>]+>)?\(readInteriorTabModeSnapshot\)/);
  assert.match(interiorTab, /const hasIntDrawerData = useCfgSelector\(selectHasInternalDrawersData\)/);
  assert.doesNotMatch(interiorTab, /const ui = useUiSelector\(x => x as AnyRecord\)/);
  assert.doesNotMatch(interiorTab, /const cfg = useCfgSelector\(x => x as AnyRecord\)/);
  assert.doesNotMatch(interiorTab, /const mode = useModeSelector\(x => x as AnyRecord\)/);

  assert.match(orderPdfOverlay, /const \{ open, draftFromUi, zoomFromUi \} = useUiSelectorShallow\(ui => \{/);
  assert.match(orderPdfOverlay, /draftFromUi:\s*(?:(?:\(ui as AnyRecord\))|ui)\.orderPdfEditorDraft/);
  assert.match(orderPdfOverlay, /zoomFromUi:\s*typeof z === 'number'/);
  assert.doesNotMatch(orderPdfOverlay, /const open = useUiSelector\(/);
  assert.doesNotMatch(orderPdfOverlay, /const draftFromUi = useUiSelector\(/);
  assert.doesNotMatch(orderPdfOverlay, /const zoomFromUi = useUiSelector\(/);
});

test('[react-hotspots] StructureTab, DesignTab, and RenderTab keep grouped selector boundaries', () => {
  assert.match(
    structureTabControls,
    /const \{ wardrobeType, boardMaterial \} = useCfgSelectorShallow\(cfg => \(\{/
  );
  assert.doesNotMatch(structureTabControls, /const wardrobeType = useCfgSelector\(/);
  assert.doesNotMatch(structureTabControls, /const boardMaterial = useCfgSelector\(/);

  assert.match(
    structureTab,
    /const \{ wardrobeType, isManualWidth, preChestState, isLibraryMode, hingeMap \} =\s*useCfgSelectorShallow/
  );
  assert.match(
    structureTab,
    /const\s*(?:primaryMode|\{[^}]*\bprimaryMode\b[^}]*\})\s*=\s*useModeSelectorShallow/
  );
  assert.match(structureTab, /readStructureTabStackSplitUiState\(ui, \{ depth, width, doors \}\)/);
  assert.match(structureTab, /readStructureTabCellDimsState\(ui\)/);
  assert.doesNotMatch(structureTab, /const width = useUiSelector\(/);
  assert.doesNotMatch(structureTab, /const cornerMode = useUiSelector\(/);
  assert.doesNotMatch(structureTab, /const hingeMap = useCfgSelector\(/);
  assert.doesNotMatch(structureTab, /const primaryMode = useModeSelector\(/);
  assert.doesNotMatch(structureTab, /const stackSplitEnabled = useUiSelector\(/);
  assert.doesNotMatch(structureTab, /const cellDimsWidth = useUiSelector\(/);

  assert.match(designTab, /useDesignTabController\(/);
  assert.match(designController, /useCfgSelectorShallow\(cfg => readDesignTabCfgState\(cfg\)\)/);
  assert.match(designController, /useUiSelectorShallow\(ui => readDesignTabUiState\(ui\)\)/);
  assert.match(
    designController,
    /(?:const \{ primaryMode, splitVariant \} =\s*useModeSelectorShallow\(mode => |const modeState = useModeSelectorShallow\(mode => )/
  );
  assert.match(designController, /deriveDesignTabDoorFeaturesState\(/);
  assert.doesNotMatch(designController, /const hasCornice = useUiSelector\(/);
  assert.doesNotMatch(designController, /const savedColorsRaw = useCfgSelector\(/);
  assert.doesNotMatch(designController, /const colorSwatchesOrderRaw = useCfgSelector\(/);

  assert.match(designMultiColor, /const enabled = useCfgSelector\(selectIsMultiColorMode\);/);
  assert.match(designMultiColor, /const savedRaw = useCfgSelector\(selectSavedColors\);/);
  assert.match(
    designMultiColor,
    /const curtainChoiceRaw = useUiSelector\(ui => String\(ui\.currentCurtainChoice \|\| 'none'\)\);/
  );
  assert.match(
    designMultiColor,
    /const primaryMode = useModeSelector\(mode => String\(mode\.primary \|\| 'none'\)\);/
  );
  assert.doesNotMatch(designMultiColor, /useStoreSelectorShallow\(st => \{/);

  assert.match(renderTab, /useCfgSelectorShallow\(cfg => readRenderTabCfgState\(cfg\)\)/);
  assert.match(renderTab, /useUiSelectorShallow\(ui => readRenderTabUiState\(ui\)\)/);
  assert.match(renderTab, /useRuntimeSelectorShallow\(rt => readRenderTabRuntimeState\(rt\)\)/);
  assert.doesNotMatch(renderTab, /const lightAmb = useUiSelector\(/);
  assert.doesNotMatch(renderTab, /const globalClickRt = useRuntimeSelector\(/);
  assert.doesNotMatch(renderTab, /selectSavedNotesCount\(cfg\),/);
  assert.doesNotMatch(renderTab, /readConfigArrayFromSnapshot\(cfg, 'savedNotes'/);
});

test('[react-hotspots] StructureTab and PDF/library preset surfaces stay on the cleaned architecture', () => {
  assert.match(structureTab, /features\/library_preset\/library_preset\.js/);
  assert.doesNotMatch(structureTab, /features\/library_preset\/index\.js/);
  assert.equal(exists(libraryPresetIndexUrl), false);
});
