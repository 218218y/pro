import type {
  DoorTrimUiColor,
  DoorTrimUiSpan,
  HandleType,
  LayoutTypeId,
  ManualToolId,
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
} from '../../../features/sketch_drawer_sizing.js';

export type LayoutTypeOption = { id: LayoutTypeId; label: string; icon: string };
export type ManualToolOption = { id: ManualToolId; label: string };
export type HandleTypeOption = { id: HandleType; label: string };

export const INTERIOR_LAYOUT_TYPES: LayoutTypeOption[] = [
  { id: 'shelves', label: 'מדפים', icon: 'fas fa-th-large' },
  { id: 'hanging', label: 'תלייה', icon: 'fas fa-tshirt' },
  { id: 'hanging_split', label: 'תלייה כפולה', icon: 'fas fa-grip-lines' },
  { id: 'mixed', label: 'משולב', icon: 'fas fa-border-all' },
  { id: 'storage', label: 'אוגר מצעים', icon: 'fas fa-box-open' },
  { id: 'brace_shelves', label: 'מדפי קושרת', icon: 'fas fa-link' },
];

export const INTERIOR_MANUAL_TOOLS: ManualToolOption[] = [
  { id: 'shelf', label: 'מדף' },
  { id: 'rod', label: 'תלייה' },
  { id: 'storage', label: 'אוגר מצעים' },
];

export const INTERIOR_GRID_DIVS: readonly [8, 7, 6, 5, 4, 3, 2] = [8, 7, 6, 5, 4, 3, 2];
export const INTERIOR_EXT_COUNTS: readonly [1, 2, 3, 4, 5] = [1, 2, 3, 4, 5];

export const INTERIOR_HANDLE_TYPES: HandleTypeOption[] = [
  { id: 'standard', label: 'סטנדרטית' },
  { id: 'edge', label: 'רוכבת' },
  { id: 'none', label: 'ללא' },
];

export type InteriorTabLocalStateDefaults = {
  sketchShelvesOpen: boolean;
  sketchBoxHeightCm: number;
  sketchBoxWidthCm: number | '';
  sketchBoxDepthCm: number | '';
  sketchStorageHeightCm: number;
  sketchShelfDepthByVariant: Record<string, number | ''>;
  sketchBoxHeightDraft: string;
  sketchBoxWidthDraft: string;
  sketchBoxDepthDraft: string;
  sketchStorageHeightDraft: string;
  sketchBoxPanelOpen: boolean;
  sketchBoxCornicePanelOpen: boolean;
  sketchBoxCorniceType: SketchBoxCorniceType;
  sketchBoxBasePanelOpen: boolean;
  sketchBoxBaseType: SketchBoxBaseType;
  sketchBoxLegStyle: SketchBoxLegStyle;
  sketchBoxLegColor: SketchBoxLegColor;
  sketchBoxLegHeightCm: number;
  sketchBoxLegHeightDraft: string;
  sketchBoxLegWidthCm: number;
  sketchBoxLegWidthDraft: string;
  sketchExtDrawersPanelOpen: boolean;
  sketchExtDrawerCount: number;
  sketchExtDrawerHeightCm: number;
  sketchExtDrawerHeightDraft: string;
  sketchIntDrawerHeightCm: number;
  sketchIntDrawerHeightDraft: string;
  sketchShelfDepthDraftByVariant: Record<string, string>;
  doorTrimPanelOpen: boolean;
  doorTrimColor: DoorTrimUiColor;
  doorTrimHorizontalSpan: DoorTrimUiSpan;
  doorTrimHorizontalCustomCm: number | '';
  doorTrimHorizontalCustomDraft: string;
  doorTrimHorizontalCrossCm: number | '';
  doorTrimHorizontalCrossDraft: string;
  doorTrimVerticalSpan: DoorTrimUiSpan;
  doorTrimVerticalCustomCm: number | '';
  doorTrimVerticalCustomDraft: string;
  doorTrimVerticalCrossCm: number | '';
  doorTrimVerticalCrossDraft: string;
  manualRowOpen: boolean;
  sketchRowOpen: boolean;
  manualUiTool: ManualToolId;
};

export function createInteriorTabLocalStateDefaults(): InteriorTabLocalStateDefaults {
  return {
    sketchShelvesOpen: false,
    sketchBoxHeightCm: 40,
    sketchBoxWidthCm: '',
    sketchBoxDepthCm: '',
    sketchStorageHeightCm: 50,
    sketchShelfDepthByVariant: { regular: '', double: '', glass: '', brace: '' },
    sketchBoxHeightDraft: '40',
    sketchBoxWidthDraft: '',
    sketchBoxDepthDraft: '',
    sketchStorageHeightDraft: '50',
    sketchBoxPanelOpen: false,
    sketchBoxCornicePanelOpen: false,
    sketchBoxCorniceType: 'classic',
    sketchBoxBasePanelOpen: false,
    sketchBoxBaseType: 'plinth',
    sketchBoxLegStyle: 'tapered',
    sketchBoxLegColor: 'black',
    sketchBoxLegHeightCm: 12,
    sketchBoxLegHeightDraft: '12',
    sketchBoxLegWidthCm: 4,
    sketchBoxLegWidthDraft: '4',
    sketchExtDrawersPanelOpen: false,
    sketchExtDrawerCount: 1,
    sketchExtDrawerHeightCm: DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
    sketchExtDrawerHeightDraft: String(DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM),
    sketchIntDrawerHeightCm: DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
    sketchIntDrawerHeightDraft: String(DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM),
    sketchShelfDepthDraftByVariant: { regular: '', double: '', glass: '', brace: '' },
    doorTrimPanelOpen: false,
    doorTrimColor: 'nickel',
    doorTrimHorizontalSpan: 'full',
    doorTrimHorizontalCustomCm: '',
    doorTrimHorizontalCustomDraft: '',
    doorTrimHorizontalCrossCm: '',
    doorTrimHorizontalCrossDraft: '',
    doorTrimVerticalSpan: 'full',
    doorTrimVerticalCustomCm: '',
    doorTrimVerticalCustomDraft: '',
    doorTrimVerticalCrossCm: '',
    doorTrimVerticalCrossDraft: '',
    manualRowOpen: false,
    sketchRowOpen: false,
    manualUiTool: 'shelf',
  };
}
