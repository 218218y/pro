#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

const errors = [];

function requirePattern(file, pattern) {
  const source = read(file);
  if (!pattern.test(source)) errors.push(`${file}: missing ${pattern}`);
}

function forbidPattern(file, pattern) {
  const source = read(file);
  if (pattern.test(source)) errors.push(`${file}: forbidden legacy pattern ${pattern}`);
}

function section(file, startText, endText) {
  const source = read(file);
  const start = source.indexOf(startText);
  if (start < 0) {
    errors.push(`${file}: missing section start ${startText}`);
    return '';
  }
  const end = source.indexOf(endText, start + startText.length);
  if (end < 0) {
    errors.push(`${file}: missing section end ${endText}`);
    return source.slice(start);
  }
  return source.slice(start, end);
}

function requirePatternIn(label, source, pattern) {
  if (!pattern.test(source)) errors.push(`${label}: missing ${pattern}`);
}

function forbidPatternIn(label, source, pattern) {
  if (pattern.test(source)) errors.push(`${label}: forbidden legacy pattern ${pattern}`);
}

requirePattern(
  'esm/native/ui/react/components/ColorSwatch.tsx',
  /type ColorSwatchProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' \| 'onKeyDown' \| 'title'>/
);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /children\?: ReactNode/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /special\?: boolean/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /className=\{cx\(/);
requirePattern(
  'esm/native/ui/react/components/ColorSwatch.tsx',
  /type ColorSwatchItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' \| 'onKeyDown' \| 'title'>/
);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /export function ColorSwatchItem/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /function handleActivation/);

requirePattern(
  'esm/native/ui/react/components/AppErrorBoundary.tsx',
  /import \{ Button \} from '\.\/Button\.js';/
);
requirePattern(
  'esm/native/ui/react/components/AppErrorBoundary.tsx',
  /<Button[\s\S]*variant="save"[\s\S]*onClick=\{\(\) => tryReloadViaDi\(this\.props\.app\)\}[\s\S]*רענן/
);
forbidPattern('esm/native/ui/react/components/AppErrorBoundary.tsx', /className="btn btn-save"/);
requirePattern(
  'esm/native/ui/react/components/LazyErrorBoundary.tsx',
  /import \{ Button \} from '\.\/Button\.js';/
);
requirePattern(
  'esm/native/ui/react/components/LazyErrorBoundary.tsx',
  /<Button[\s\S]*variant="save"[\s\S]*onClick=\{\(\) => tryRecoverOrReload\(this\.props\.app, error\)\}[\s\S]*רענן/
);
forbidPattern('esm/native/ui/react/components/LazyErrorBoundary.tsx', /className="btn btn-save"/);

requirePattern('esm/native/ui/react/components/IconButton.tsx', /type IconButtonVariant =[\s\S]*\| 'camera'/);
requirePattern('esm/native/ui/react/components/IconButton.tsx', /case 'camera':[\s\S]*return 'cam-btn';/);
requirePattern('esm/native/ui/react/components/IconButton.tsx', /import \{ forwardRef \} from 'react';/);
requirePattern(
  'esm/native/ui/react/components/IconButton.tsx',
  /export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>\(function IconButton\(/
);
requirePattern('esm/native/ui/react/components/IconButton.tsx', /ref=\{ref\}/);
requirePattern(
  'esm/native/ui/react/components/IconButton.tsx',
  /className=\{cx\(variantToClass\(variant\), className\)\}/
);
requirePattern(
  'esm/native/ui/react/overlay_top_controls.tsx',
  /import \{ IconButton \} from '\.\/components\/IconButton\.js';/
);
const undoRedoControls = section(
  'esm/native/ui/react/overlay_top_controls.tsx',
  'function UndoRedoControls()',
  'function CameraControls()'
);
requirePatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx UndoRedoControls',
  undoRedoControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*className="wp-r-styled-tooltip hint-bottom"[\s\S]*data-tooltip="[^"]*Ctrl\+Z\)"[\s\S]*disabled=\{!status\.canUndo\}[\s\S]*event\.preventDefault\(\);[\s\S]*undo\(\);[\s\S]*fas fa-undo/
);
requirePatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx UndoRedoControls',
  undoRedoControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*className="wp-r-styled-tooltip hint-bottom"[\s\S]*data-tooltip="[^"]*Ctrl\+Y\)"[\s\S]*disabled=\{!status\.canRedo\}[\s\S]*event\.preventDefault\(\);[\s\S]*redo\(\);[\s\S]*fas fa-redo/
);
forbidPatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx UndoRedoControls',
  undoRedoControls,
  /className="cam-btn hint-bottom"/
);
const cameraControls = section(
  'esm/native/ui/react/overlay_top_controls.tsx',
  'function CameraControls()',
  'export function OverlayTopControls()'
);
requirePatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx CameraControls',
  cameraControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*onClick=\{\(\) => move\('front'\)\}[\s\S]*fas fa-border-all/
);
requirePatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx CameraControls',
  cameraControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*onClick=\{\(\) => move\('front-zoom'\)\}[\s\S]*fas fa-search-plus/
);
requirePatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx CameraControls',
  cameraControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*onClick=\{\(\) => move\('perspective'\)\}[\s\S]*fas fa-cube[\s\S]*scaleX\(-1\)/
);
requirePatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx CameraControls',
  cameraControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*onClick=\{\(\) => move\('perspective-left'\)\}[\s\S]*fas fa-cube/
);
forbidPatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx CameraControls',
  cameraControls,
  /className="cam-btn"/
);
forbidPatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx CameraControls',
  cameraControls,
  /role="button"/
);
forbidPatternIn(
  'esm/native/ui/react/overlay_top_controls.tsx CameraControls',
  cameraControls,
  /tabIndex=\{0\}/
);

requirePattern(
  'esm/native/ui/react/overlay_notes_controls.tsx',
  /import \{ IconButton \} from '\.\/components\/IconButton\.js';/
);
const viewerNotesControls = read('esm/native/ui/react/overlay_notes_controls.tsx');
requirePatternIn(
  'esm/native/ui/react/overlay_notes_controls.tsx',
  viewerNotesControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*wp-viewer-note-btn hint-bottom[\s\S]*data-testid="viewer-note-draw-mode-button"[\s\S]*stopViewerNotesControlEvent\(event\);[\s\S]*toggleNoteEditMode\(\);/
);
requirePatternIn(
  'esm/native/ui/react/overlay_notes_controls.tsx',
  viewerNotesControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*wp-viewer-contents-btn hint-bottom[\s\S]*data-testid="viewer-contents-toggle-button"[\s\S]*stopViewerNotesControlEvent\(event\);[\s\S]*toggleContentsVisibility\(\);/
);
requirePatternIn(
  'esm/native/ui/react/overlay_notes_controls.tsx',
  viewerNotesControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*wp-viewer-measurement-btn hint-bottom[\s\S]*data-testid="viewer-measurement-toggle-button"[\s\S]*stopViewerNotesControlEvent\(event\);[\s\S]*toggleMeasurementMode\(\);/
);
requirePatternIn(
  'esm/native/ui/react/overlay_notes_controls.tsx',
  viewerNotesControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*wp-viewer-measurement-mode-btn hint-bottom[\s\S]*data-testid="viewer-measurement-mode-part-button"[\s\S]*stopViewerNotesControlEvent\(event\);[\s\S]*selectMeasurementToolMode\('part'\);/
);
requirePatternIn(
  'esm/native/ui/react/overlay_notes_controls.tsx',
  viewerNotesControls,
  /<IconButton[\s\S]*variant="camera"[\s\S]*wp-viewer-measurement-mode-btn hint-bottom[\s\S]*data-testid="viewer-measurement-mode-points-button"[\s\S]*stopViewerNotesControlEvent\(event\);[\s\S]*selectMeasurementToolMode\('points'\);/
);
forbidPattern('esm/native/ui/react/overlay_notes_controls.tsx', /className=\{`cam-btn/);
forbidPattern('esm/native/ui/react/overlay_notes_controls.tsx', /className="cam-btn/);

requirePattern(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx',
  /import \{ IconButton \} from '\.\/components\/IconButton\.js';/
);
const quickActionsDock = read('esm/native/ui/react/overlay_quick_actions_dock.tsx');
requirePatternIn(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx quick-actions toggle',
  quickActionsDock,
  /<IconButton[\s\S]*ref=\{toggleRef\}[\s\S]*variant="camera"[\s\S]*className="wp-qa-toggle wp-r-styled-tooltip hint-bottom"[\s\S]*data-testid="quick-actions-toggle-button"[\s\S]*data-tooltip=\{menuOpen \?[\s\S]*aria-label=\{menuOpen \?[\s\S]*quickActionsController\.toggleMenu\(\{[\s\S]*event,[\s\S]*op: 'quick-actions:toggle-menu',[\s\S]*setMenuOpen,[\s\S]*fas fa-times[\s\S]*fas fa-arrow-right/
);
forbidPattern(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx',
  /className="cam-btn wp-qa-toggle hint-bottom"/
);
requirePatternIn(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx QuickActionExportButton',
  quickActionsDock,
  /function QuickActionExportButton\(\{[\s\S]*className="wp-qa-btn wp-r-styled-tooltip"[\s\S]*data-tooltip-title=\{tooltip\.title\}[\s\S]*data-tooltip-detail=\{tooltip\.detail\}[\s\S]*aria-label=\{formatQuickActionExportTooltipLabel\(tooltip\)\}[\s\S]*keepOpen: keepOpenRef\.current[\s\S]*<i className=\{iconClassName\} \/>/
);
requirePatternIn(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx export buttons',
  quickActionsDock,
  /<QuickActionExportButton[\s\S]*action=\{\(\) => exp\.exportTakeSnapshot\(\)\}[\s\S]*closeMenu=\{closeMenu\}[\s\S]*iconClassName="fas fa-camera"[\s\S]*keepOpenRef=\{menuPinnedOpenRefState\}[\s\S]*op="quick-actions:snapshot"[\s\S]*runAction=\{quickActionsController\.runAction\}[\s\S]*tooltip=\{QUICK_ACTION_EXPORT_TOOLTIPS\.snapshot\}/
);
requirePatternIn(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx export buttons',
  quickActionsDock,
  /<QuickActionExportButton[\s\S]*action=\{\(\) => exp\.exportCopyToClipboard\(\)\}[\s\S]*closeMenu=\{closeMenu\}[\s\S]*iconClassName="fas fa-copy"[\s\S]*keepOpenRef=\{menuPinnedOpenRefState\}[\s\S]*op="quick-actions:copy"[\s\S]*runAction=\{quickActionsController\.runAction\}[\s\S]*tooltip=\{QUICK_ACTION_EXPORT_TOOLTIPS\.copy\}/
);
requirePatternIn(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx export buttons',
  quickActionsDock,
  /<QuickActionExportButton[\s\S]*action=\{\(\) => exp\.exportRenderAndSketch\(\)\}[\s\S]*closeMenu=\{closeMenu\}[\s\S]*iconClassName="fas fa-images"[\s\S]*keepOpenRef=\{menuPinnedOpenRefState\}[\s\S]*op="quick-actions:render-and-sketch"[\s\S]*runAction=\{quickActionsController\.runAction\}[\s\S]*tooltip=\{QUICK_ACTION_EXPORT_TOOLTIPS\.renderAndSketch\}/
);
requirePatternIn(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx export buttons',
  quickActionsDock,
  /<QuickActionExportButton[\s\S]*action=\{\(\) => exp\.exportDualImage\(\)\}[\s\S]*closeMenu=\{closeMenu\}[\s\S]*iconClassName="fas fa-columns"[\s\S]*keepOpenRef=\{menuPinnedOpenRefState\}[\s\S]*op="quick-actions:dual-image"[\s\S]*runAction=\{quickActionsController\.runAction\}[\s\S]*tooltip=\{QUICK_ACTION_EXPORT_TOOLTIPS\.dualImage\}/
);
forbidPattern(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx',
  /data-tooltip-title=\{QUICK_ACTION_EXPORT_TOOLTIPS\.[\w.]+\.title\}/
);
forbidPattern(
  'esm/native/ui/react/overlay_quick_actions_dock.tsx',
  /aria-label=\{formatQuickActionExportTooltipLabel\(QUICK_ACTION_EXPORT_TOOLTIPS\./
);

requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /import \{ Button, ColorSwatch, OptionButton, OptionButtonGroup, ToggleRow \}/
);
requirePattern('esm/native/ui/react/components/Button.tsx', /type ButtonVariant =[\s\S]*\| 'danger'/);
requirePattern('esm/native/ui/react/components/Button.tsx', /type ButtonVariant =[\s\S]*\| 'cancel'/);
requirePattern('esm/native/ui/react/components/Button.tsx', /case 'cancel':[\s\S]*return 'btn btn-cancel';/);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<Button[\s\S]*variant="light"[\s\S]*wp-r-mirror-draft-reset-btn/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<Button[\s\S]*variant="danger"[\s\S]*size="sm"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<ColorSwatch[\s\S]*special=\{dot\.isSpecial\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-door-style-options">/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButton[\s\S]*data-door-style=\{option\.id\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-curtain-options">/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className="curtain-btn"[\s\S]*selected=\{props\.curtainChoice === curtain\.id\}/
);

forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /import type \{ CSSProperties/
);
forbidPattern('esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx', /<button\b/);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{\s*'color-dot-swatch wp-r-color-swatch'/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{\s*'type-option type-option--compact type-option--iconrow/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{'curtain-btn' \+/
);

requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /import \{ Button, ColorSwatchItem \} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<ColorSwatchItem[\s\S]*data-testid="design-color-swatch-item"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="delete"[\s\S]*data-testid="design-selected-color-delete-button"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*inline[\s\S]*data-testid="design-selected-color-lock-button"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="delete"[\s\S]*className="wp-r-btn-xs wp-r-mt-1"[\s\S]*onClick=\{model\.removeTexture\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="save"[\s\S]*data-testid="design-custom-color-save-button"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<Button[\s\S]*variant="accent"[\s\S]*data-testid="design-custom-color-cancel-button"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /const className = 'color-dot-swatch'/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<div className=\{className\} style=\{style\} aria-hidden="true"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-delete wp-r-btn-compact"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-inline wp-r-btn-compact"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-delete wp-r-btn-xs wp-r-mt-1"/
);
forbidPattern('esm/native/ui/react/tabs/design_tab_color_section.tsx', /className="btn btn-save wp-r-mt-4"/);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /className="btn btn-accent wp-r-mt-1"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
  /import \{ Button, InlineNotice, ModeToggleButton \} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
  /function CellDimResetButton[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-cell-dims-reset-dim-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_platform_overhang_field.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_platform_overhang_field.tsx',
  /<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-platform-overhang-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_platform_overhang_field.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-platform-overhang-reset-btn wp-r-styled-tooltip hint-bottom"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /export function SketchBoxPlatformOverhangField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-platform-overhang-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-platform-overhang-reset-btn wp-r-styled-tooltip hint-bottom"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /export function SketchBoxNumericField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-box-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-sketch-box-reset-btn wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_controls.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_controls.tsx',
  /function DoorMountThicknessField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-door-thickness-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_controls.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-door-thickness-reset-btn wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx',
  /export function SketchDrawerHeightField[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
  /function SketchFieldResetButton[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  /wp-r-sketch-box-plinth-height-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn[\s\S]*resetSketchBoxPlinthHeight\(props\)/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
  /wp-r-base-plinth-height-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*wp-r-sketch-drawer-height-reset-btn[\s\S]*DEFAULT_BASE_PLINTH_HEIGHT_CM/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_sections_door_features.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_sections_door_features.tsx',
  /wp-r-groove-lines-row[\s\S]*<Button[\s\S]*variant="light"[\s\S]*inline[\s\S]*className="wp-r-groove-reset-btn"[\s\S]*onClick=\{model\.resetGrooveLinesCount\}/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_sections_door_features.tsx',
  /className="btn btn-light btn-inline wp-r-groove-reset-btn"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /export function SavedModelsPrimaryActions[\s\S]*<Button[\s\S]*id="btnSaveModel"[\s\S]*variant="save"[\s\S]*className="wp-r-savedmodels-btn"[\s\S]*onClick=\{props\.saveCurrent\}/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /export function SavedModelsPrimaryActions[\s\S]*<Button[\s\S]*id="btnDeleteModel"[\s\S]*variant="delete"[\s\S]*className="wp-r-savedmodels-btn"[\s\S]*onClick=\{props\.deleteSelected\}/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /export function SavedModelsPrimaryActions[\s\S]*<Button[\s\S]*id="btnMoveModelUp"[\s\S]*variant="accent"[\s\S]*className="wp-r-savedmodels-arrow wp-r-styled-tooltip hint-bottom"[\s\S]*onClick=\{\(\) => props\.moveSelected\('up'\)\}[\s\S]*data-tooltip=[\s\S]*aria-label=[\s\S]*aria-disabled=\{false\}[\s\S]*fas fa-arrow-up/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /export function SavedModelsPrimaryActions[\s\S]*<Button[\s\S]*id="btnMoveModelDown"[\s\S]*variant="accent"[\s\S]*className="wp-r-savedmodels-arrow wp-r-styled-tooltip hint-bottom"[\s\S]*onClick=\{\(\) => props\.moveSelected\('down'\)\}[\s\S]*data-tooltip=[\s\S]*aria-label=[\s\S]*aria-disabled=\{false\}[\s\S]*fas fa-arrow-down/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /className="btn btn-save wp-r-savedmodels-btn"/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /className="btn btn-delete wp-r-savedmodels-btn"/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
  /className="btn btn-accent wp-r-savedmodels-arrow wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /function SavedModelsRowActions[\s\S]*<Button[\s\S]*variant=\{props\.row\.locked \? 'accent' : 'default'\}[\s\S]*inline[\s\S]*size="sm"[\s\S]*className="wp-r-savedmodels-rowicon wp-r-styled-tooltip hint-bottom"[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*props\.onSetSelected\(props\.row\.id\);[\s\S]*props\.onToggleLock\(props\.row\.id\)/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /function SavedModelsRowActions[\s\S]*<Button[\s\S]*variant="accent"[\s\S]*inline[\s\S]*size="sm"[\s\S]*className="wp-r-savedmodels-rowicon wp-r-styled-tooltip hint-bottom"[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*props\.onSetSelected\(props\.row\.id\);[\s\S]*props\.onOverwriteById\(props\.row\.id\)/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /function SavedModelsRowActions[\s\S]*<Button[\s\S]*variant="danger"[\s\S]*inline[\s\S]*size="sm"[\s\S]*className="wp-r-savedmodels-rowicon wp-r-styled-tooltip hint-bottom"[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*props\.onSetSelected\(props\.row\.id\);[\s\S]*props\.onDeleteById\(props\.row\.id\)/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /btn btn-accent btn-inline btn-sm wp-r-savedmodels-rowicon wp-r-styled-tooltip hint-bottom/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /btn btn-inline btn-sm wp-r-savedmodels-rowicon wp-r-styled-tooltip hint-bottom/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /btn btn-danger btn-inline btn-sm wp-r-savedmodels-rowicon wp-r-styled-tooltip hint-bottom/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /export function StructureTabSavedModelsListRow[\s\S]*<Button[\s\S]*inline[\s\S]*size="sm"[\s\S]*className="wp-r-styled-tooltip hint-bottom"[\s\S]*data-tooltip=\{props\.row\.name\}/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /export function StructureTabSavedModelsListRow[\s\S]*props\.listType === 'preset'[\s\S]*width: '100%'[\s\S]*textAlign: 'right'[\s\S]*justifyContent: 'flex-start'[\s\S]*direction: 'rtl'[\s\S]*: \{ textAlign: 'right', justifyContent: 'flex-start', direction: 'rtl' \}/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /onClick=\{\(\) => \{[\s\S]*props\.onSetSelected\(props\.row\.id\);\s*if \(props\.row\.id\) props\.onApplySelected\(props\.row\.id\);/
);
requirePattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /<span style=\{\{ display: 'inline-flex', alignItems: 'center', gap: 6 \}\}>[\s\S]*<span>\{props\.row\.name\}<\/span>/
);
forbidPattern(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
  /className="btn btn-inline btn-sm wp-r-styled-tooltip hint-bottom"/
);

requirePattern(
  'esm/native/ui/react/tabs/interior_tab_sections_controls.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/interior_tab_sections_controls.tsx',
  /export function InteriorToolCardHeader[\s\S]*props\.active && props\.onExit \? \([\s\S]*<Button[\s\S]*variant="danger"[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid=\{props\.exitButtonTestId\}[\s\S]*onClick=\{props\.onExit\}/
);
forbidPattern(
  'esm/native/ui/react/tabs/interior_tab_sections_controls.tsx',
  /className="btn btn-danger btn-inline btn-sm"/
);

requirePattern(
  'esm/native/ui/react/pdf/order_pdf_overlay_inline_confirm.tsx',
  /import \{ Button \} from '\.\.\/components\/Button\.js';/
);
requirePattern(
  'esm/native/ui/react/pdf/order_pdf_overlay_inline_confirm.tsx',
  /id="orderPdfInlineConfirmModal"[\s\S]*<Button[\s\S]*variant="save"[\s\S]*onClick=\{onConfirm\}[\s\S]*אישור[\s\S]*<Button[\s\S]*variant="cancel"[\s\S]*onClick=\{onCancel\}[\s\S]*ביטול/
);
forbidPattern('esm/native/ui/react/pdf/order_pdf_overlay_inline_confirm.tsx', /className="btn btn-save"/);
forbidPattern('esm/native/ui/react/pdf/order_pdf_overlay_inline_confirm.tsx', /className="btn btn-cancel"/);
requirePattern(
  'esm/native/ui/react/overlay_feedback_host.tsx',
  /import \{ Button \} from '\.\/components\/Button\.js';/
);
requirePattern(
  'esm/native/ui/react/overlay_feedback_host.tsx',
  /id="modalConfirmBtn"[\s\S]*variant=\{modal\.open && modal\.mode === 'confirm' \? 'danger' : 'save'\}[\s\S]*onClick=\{confirmOk\}[\s\S]*אישור/
);
requirePattern(
  'esm/native/ui/react/overlay_feedback_host.tsx',
  /id="modalCancelBtn"[\s\S]*variant="cancel"[\s\S]*onClick=\{\(\) => close\(\{ cancelled: true \}\)\}[\s\S]*ביטול/
);
requirePattern(
  'esm/native/ui/react/overlay_feedback_host.tsx',
  /modal\.mode === 'acknowledge' \? 'קראתי והבנתי' : 'אישור'/
);
requirePattern(
  'esm/native/ui/react/overlay_feedback_host.tsx',
  /modal\.open && modal\.mode === 'acknowledge' \? null : \([\s\S]*id="modalCancelBtn"/
);
forbidPattern(
  'esm/native/ui/react/overlay_feedback_host.tsx',
  /className=\{modal\.open && modal\.mode === 'confirm' \? 'btn btn-danger' : 'btn btn-save'\}/
);
forbidPattern('esm/native/ui/react/overlay_feedback_host.tsx', /className="btn btn-save"/);
forbidPattern('esm/native/ui/react/overlay_feedback_host.tsx', /className="btn btn-cancel"/);

requirePattern(
  'esm/native/ui/react/panels/SettingsBackupPanel.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/panels/SettingsBackupPanel.tsx',
  /<Button[\s\S]*variant="primary"[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid="settings-backup-export-button"/
);
requirePattern(
  'esm/native/ui/react/panels/SettingsBackupPanel.tsx',
  /<Button[\s\S]*variant="accent"[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid="settings-backup-import-button"/
);
forbidPattern(
  'esm/native/ui/react/panels/SettingsBackupPanel.tsx',
  /className="btn btn-primary btn-inline btn-sm"/
);
forbidPattern(
  'esm/native/ui/react/panels/SettingsBackupPanel.tsx',
  /className="btn btn-accent btn-inline btn-sm"/
);

requirePattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /import \{[^}]*\bButton\b[^}]*\} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /<Button[\s\S]*variant="primary"[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid="cloud-sync-room-mode-button"/
);
requirePattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /<Button[\s\S]*variant="accent"[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid="cloud-sync-copy-link-button"/
);
requirePattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /<Button[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid="cloud-sync-sync-sketch-button"/
);
requirePattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /<Button[\s\S]*variant="danger"[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid="cloud-sync-delete-models-button"/
);
requirePattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /<Button[\s\S]*variant="danger"[\s\S]*inline[\s\S]*size="sm"[\s\S]*data-testid="cloud-sync-delete-colors-button"/
);
forbidPattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /className="btn btn-primary btn-inline btn-sm"/
);
forbidPattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /className="btn btn-accent btn-inline btn-sm"/
);
forbidPattern('esm/native/ui/react/panels/CloudSyncPanel.tsx', /className="btn btn-inline btn-sm"/);
forbidPattern(
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  /className="btn btn-danger btn-inline btn-sm"/
);

if (errors.length) {
  console.error('[ui-design-system-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[ui-design-system-contract] ok');
