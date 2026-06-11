import { useMemo, useState } from 'react';

import type {
  DoorTrimUiColor,
  DoorTrimUiSpan,
  ManualToolId,
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';
import {
  createInteriorTabLocalStateDefaults,
  INTERIOR_EXT_COUNTS,
  INTERIOR_GRID_DIVS,
  INTERIOR_HANDLE_TYPES,
  INTERIOR_LAYOUT_TYPES,
  INTERIOR_MANUAL_TOOLS,
} from './interior_tab_local_state_shared.js';

export type {
  HandleTypeOption,
  InteriorTabLocalStateDefaults,
  LayoutTypeOption,
  ManualToolOption,
} from './interior_tab_local_state_shared.js';

export type InteriorTabLocalStateModel = ReturnType<typeof useInteriorTabLocalState>;

export function useInteriorTabLocalState() {
  const defaults = useMemo(() => createInteriorTabLocalStateDefaults(), []);

  const [sketchShelvesOpen, setSketchShelvesOpen] = useState<boolean>(() => defaults.sketchShelvesOpen);
  const [sketchBoxHeightCm, setSketchBoxHeightCm] = useState<number>(() => defaults.sketchBoxHeightCm);
  const [sketchBoxWidthCm, setSketchBoxWidthCm] = useState<number | ''>(() => defaults.sketchBoxWidthCm);
  const [sketchBoxDepthCm, setSketchBoxDepthCm] = useState<number | ''>(() => defaults.sketchBoxDepthCm);
  const [sketchStorageHeightCm, setSketchStorageHeightCm] = useState<number>(
    () => defaults.sketchStorageHeightCm
  );
  const [sketchShelfDepthByVariant, setSketchShelfDepthByVariant] = useState<Record<string, number | ''>>(
    () => defaults.sketchShelfDepthByVariant
  );

  const [sketchBoxHeightDraft, setSketchBoxHeightDraft] = useState<string>(
    () => defaults.sketchBoxHeightDraft
  );
  const [sketchBoxWidthDraft, setSketchBoxWidthDraft] = useState<string>(() => defaults.sketchBoxWidthDraft);
  const [sketchBoxDepthDraft, setSketchBoxDepthDraft] = useState<string>(() => defaults.sketchBoxDepthDraft);
  const [sketchStorageHeightDraft, setSketchStorageHeightDraft] = useState<string>(
    () => defaults.sketchStorageHeightDraft
  );
  const [sketchBoxPanelOpen, setSketchBoxPanelOpen] = useState<boolean>(() => defaults.sketchBoxPanelOpen);
  const [sketchBoxCornicePanelOpen, setSketchBoxCornicePanelOpen] = useState<boolean>(
    () => defaults.sketchBoxCornicePanelOpen
  );
  const [sketchBoxCorniceType, setSketchBoxCorniceType] = useState<SketchBoxCorniceType>(
    () => defaults.sketchBoxCorniceType
  );
  const [sketchBoxBasePanelOpen, setSketchBoxBasePanelOpen] = useState<boolean>(
    () => defaults.sketchBoxBasePanelOpen
  );
  const [sketchBoxBaseType, setSketchBoxBaseType] = useState<SketchBoxBaseType>(
    () => defaults.sketchBoxBaseType
  );
  const [sketchBoxLegStyle, setSketchBoxLegStyle] = useState<SketchBoxLegStyle>(
    () => defaults.sketchBoxLegStyle
  );
  const [sketchBoxLegColor, setSketchBoxLegColor] = useState<SketchBoxLegColor>(
    () => defaults.sketchBoxLegColor
  );
  const [sketchBoxLegHeightCm, setSketchBoxLegHeightCm] = useState<number>(
    () => defaults.sketchBoxLegHeightCm
  );
  const [sketchBoxLegHeightDraft, setSketchBoxLegHeightDraft] = useState<string>(
    () => defaults.sketchBoxLegHeightDraft
  );
  const [sketchBoxLegWidthCm, setSketchBoxLegWidthCm] = useState<number>(() => defaults.sketchBoxLegWidthCm);
  const [sketchBoxLegWidthDraft, setSketchBoxLegWidthDraft] = useState<string>(
    () => defaults.sketchBoxLegWidthDraft
  );
  const [sketchExtDrawersPanelOpen, setSketchExtDrawersPanelOpen] = useState<boolean>(
    () => defaults.sketchExtDrawersPanelOpen
  );
  const [sketchExtDrawerCount, setSketchExtDrawerCount] = useState<number>(
    () => defaults.sketchExtDrawerCount
  );
  const [sketchExtDrawerHeightCm, setSketchExtDrawerHeightCm] = useState<number>(
    () => defaults.sketchExtDrawerHeightCm
  );
  const [sketchExtDrawerHeightDraft, setSketchExtDrawerHeightDraft] = useState<string>(
    () => defaults.sketchExtDrawerHeightDraft
  );
  const [sketchIntDrawerHeightCm, setSketchIntDrawerHeightCm] = useState<number>(
    () => defaults.sketchIntDrawerHeightCm
  );
  const [sketchIntDrawerHeightDraft, setSketchIntDrawerHeightDraft] = useState<string>(
    () => defaults.sketchIntDrawerHeightDraft
  );
  const [sketchShelfDepthDraftByVariant, setSketchShelfDepthDraftByVariant] = useState<
    Record<string, string>
  >(() => defaults.sketchShelfDepthDraftByVariant);

  const [doorTrimPanelOpen, setDoorTrimPanelOpen] = useState<boolean>(() => defaults.doorTrimPanelOpen);
  const [doorTrimColor, setDoorTrimColor] = useState<DoorTrimUiColor>(() => defaults.doorTrimColor);
  const [doorTrimHorizontalSpan, setDoorTrimHorizontalSpan] = useState<DoorTrimUiSpan>(
    () => defaults.doorTrimHorizontalSpan
  );
  const [doorTrimHorizontalCustomCm, setDoorTrimHorizontalCustomCm] = useState<number | ''>(
    () => defaults.doorTrimHorizontalCustomCm
  );
  const [doorTrimHorizontalCustomDraft, setDoorTrimHorizontalCustomDraft] = useState<string>(
    () => defaults.doorTrimHorizontalCustomDraft
  );
  const [doorTrimHorizontalCrossCm, setDoorTrimHorizontalCrossCm] = useState<number | ''>(
    () => defaults.doorTrimHorizontalCrossCm
  );
  const [doorTrimHorizontalCrossDraft, setDoorTrimHorizontalCrossDraft] = useState<string>(
    () => defaults.doorTrimHorizontalCrossDraft
  );
  const [doorTrimVerticalSpan, setDoorTrimVerticalSpan] = useState<DoorTrimUiSpan>(
    () => defaults.doorTrimVerticalSpan
  );
  const [doorTrimVerticalCustomCm, setDoorTrimVerticalCustomCm] = useState<number | ''>(
    () => defaults.doorTrimVerticalCustomCm
  );
  const [doorTrimVerticalCustomDraft, setDoorTrimVerticalCustomDraft] = useState<string>(
    () => defaults.doorTrimVerticalCustomDraft
  );
  const [doorTrimVerticalCrossCm, setDoorTrimVerticalCrossCm] = useState<number | ''>(
    () => defaults.doorTrimVerticalCrossCm
  );
  const [doorTrimVerticalCrossDraft, setDoorTrimVerticalCrossDraft] = useState<string>(
    () => defaults.doorTrimVerticalCrossDraft
  );

  const [manualRowOpen, setManualRowOpen] = useState<boolean>(() => defaults.manualRowOpen);
  const [sketchRowOpen, setSketchRowOpen] = useState<boolean>(() => defaults.sketchRowOpen);
  const [manualUiTool, setManualUiTool] = useState<ManualToolId>(() => defaults.manualUiTool);

  return {
    sketchShelvesOpen,
    sketchBoxHeightCm,
    sketchBoxWidthCm,
    sketchBoxDepthCm,
    sketchStorageHeightCm,
    sketchShelfDepthByVariant,
    sketchBoxHeightDraft,
    sketchBoxWidthDraft,
    sketchBoxDepthDraft,
    sketchStorageHeightDraft,
    sketchBoxPanelOpen,
    sketchBoxCornicePanelOpen,
    sketchBoxCorniceType,
    sketchBoxBasePanelOpen,
    sketchBoxBaseType,
    sketchBoxLegStyle,
    sketchBoxLegColor,
    sketchBoxLegHeightCm,
    sketchBoxLegHeightDraft,
    sketchBoxLegWidthCm,
    sketchBoxLegWidthDraft,
    sketchExtDrawersPanelOpen,
    sketchExtDrawerCount,
    sketchExtDrawerHeightCm,
    sketchExtDrawerHeightDraft,
    sketchIntDrawerHeightCm,
    sketchIntDrawerHeightDraft,
    sketchShelfDepthDraftByVariant,
    doorTrimPanelOpen,
    doorTrimColor,
    doorTrimHorizontalSpan,
    doorTrimHorizontalCustomCm,
    doorTrimHorizontalCustomDraft,
    doorTrimHorizontalCrossCm,
    doorTrimHorizontalCrossDraft,
    doorTrimVerticalSpan,
    doorTrimVerticalCustomCm,
    doorTrimVerticalCustomDraft,
    doorTrimVerticalCrossCm,
    doorTrimVerticalCrossDraft,
    manualRowOpen,
    sketchRowOpen,
    manualUiTool,
    setSketchShelvesOpen,
    setSketchBoxHeightCm,
    setSketchBoxHeightDraft,
    setSketchBoxWidthCm,
    setSketchBoxWidthDraft,
    setSketchBoxDepthCm,
    setSketchBoxDepthDraft,
    setSketchStorageHeightCm,
    setSketchStorageHeightDraft,
    setSketchBoxPanelOpen,
    setSketchBoxCornicePanelOpen,
    setSketchBoxCorniceType,
    setSketchBoxBasePanelOpen,
    setSketchBoxBaseType,
    setSketchBoxLegStyle,
    setSketchBoxLegColor,
    setSketchBoxLegHeightCm,
    setSketchBoxLegHeightDraft,
    setSketchBoxLegWidthCm,
    setSketchBoxLegWidthDraft,
    setSketchExtDrawersPanelOpen,
    setSketchExtDrawerCount,
    setSketchExtDrawerHeightCm,
    setSketchExtDrawerHeightDraft,
    setSketchIntDrawerHeightCm,
    setSketchIntDrawerHeightDraft,
    setSketchShelfDepthByVariant,
    setSketchShelfDepthDraftByVariant,
    setDoorTrimPanelOpen,
    setDoorTrimColor,
    setDoorTrimHorizontalSpan,
    setDoorTrimHorizontalCustomCm,
    setDoorTrimHorizontalCustomDraft,
    setDoorTrimHorizontalCrossCm,
    setDoorTrimHorizontalCrossDraft,
    setDoorTrimVerticalSpan,
    setDoorTrimVerticalCustomCm,
    setDoorTrimVerticalCustomDraft,
    setDoorTrimVerticalCrossCm,
    setDoorTrimVerticalCrossDraft,
    setManualRowOpen,
    setSketchRowOpen,
    setManualUiTool,
    layoutTypes: INTERIOR_LAYOUT_TYPES,
    manualTools: INTERIOR_MANUAL_TOOLS,
    gridDivs: INTERIOR_GRID_DIVS,
    extCounts: INTERIOR_EXT_COUNTS,
    handleTypes: INTERIOR_HANDLE_TYPES,
  };
}
