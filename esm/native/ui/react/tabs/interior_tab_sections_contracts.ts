import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { EdgeHandleVariant, ExtDrawerType, HandleType, HandleUiColor } from './interior_tab_helpers.js';

export type HandleTypeOption = { id: HandleType; label: string };

export type InteriorToolCardHeaderProps = {
  title: ReactNode;
  active?: boolean;
  onExit?: (() => void) | null;
  exitButtonTestId?: string;
};

export type InteriorEdgeHandleVariantRowProps = {
  selectedVariant: EdgeHandleVariant;
  onSelect: (variant: EdgeHandleVariant) => void;
  className?: string;
};

export type EmbeddedSketchExternalDrawersControlsProps = {
  isSketchToolActive: boolean;
  manualToolRaw: string;
  sketchExtDrawersPanelOpen: boolean;
  sketchExtDrawerCount: number;
  sketchExtDrawerHeightCm: number;
  sketchExtDrawerHeightDraft: string;
  setSketchShelvesOpen: Dispatch<SetStateAction<boolean>>;
  setSketchRowOpen: Dispatch<SetStateAction<boolean>>;
  setSketchExtDrawersPanelOpen: Dispatch<SetStateAction<boolean>>;
  setSketchExtDrawerCount: Dispatch<SetStateAction<number>>;
  setSketchExtDrawerHeightCm: Dispatch<SetStateAction<number>>;
  setSketchExtDrawerHeightDraft: Dispatch<SetStateAction<string>>;
  enterSketchExtDrawersTool: (count: number, drawerHeightCm: number) => void;
  exitManual: () => void;
};

export type EmbeddedSketchInternalDrawersControlsProps = {
  isSketchToolActive: boolean;
  manualToolRaw: string;
  sketchIntDrawerHeightCm: number;
  sketchIntDrawerHeightDraft: string;
  setSketchShelvesOpen: Dispatch<SetStateAction<boolean>>;
  setSketchRowOpen: Dispatch<SetStateAction<boolean>>;
  setSketchIntDrawerHeightCm: Dispatch<SetStateAction<number>>;
  setSketchIntDrawerHeightDraft: Dispatch<SetStateAction<string>>;
  enterSketchIntDrawersTool: (drawerHeightCm: number) => void;
  exitManual: () => void;
};

export type InteriorExternalDrawersSectionProps = {
  wardrobeType: 'sliding' | 'hinged';
  isExtDrawerMode: boolean;
  extDrawerType: ExtDrawerType;
  extDrawerCount: number;
  extCounts: number[];
  enterExtDrawer: (type: ExtDrawerType, count?: number) => void;
  exitExtDrawer: () => void;
  sketchControls?: EmbeddedSketchExternalDrawersControlsProps;
};

export type InteriorInternalDrawersSectionProps = {
  internalDrawersEnabled: boolean;
  isIntDrawerMode: boolean;
  setInternalDrawersEnabled: (enabled: boolean) => void;
  toggleIntDrawerMode: () => void;
  sketchControls?: EmbeddedSketchInternalDrawersControlsProps;
};

export type InteriorDividerSectionProps = {
  isDividerMode: boolean;
  toggleDividerMode: () => void;
};

export type InteriorHandlesSectionProps = {
  handleControlEnabled: boolean;
  isHandleMode: boolean;
  isManualHandlePositionMode: boolean;
  globalHandleType: HandleType;
  handleToolType: HandleType;
  globalHandleColor: HandleUiColor;
  handleToolColor: HandleUiColor;
  globalEdgeHandleVariant: EdgeHandleVariant;
  handleToolEdgeVariant: EdgeHandleVariant;
  handleTypes: HandleTypeOption[];
  setGlobalHandle: (type: HandleType) => void;
  setGlobalHandleColor: (color: HandleUiColor) => void;
  setGlobalEdgeHandleVariant: (variant: EdgeHandleVariant) => void;
  setHandleControlEnabled: (enabled: boolean) => void;
  toggleHandleMode: (type?: HandleType) => void;
  setHandleModeColor: (color: HandleUiColor) => void;
  setHandleModeEdgeVariant: (variant: EdgeHandleVariant) => void;
  enterManualHandlePositionMode: () => void;
};
