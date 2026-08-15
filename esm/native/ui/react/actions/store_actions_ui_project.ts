import type { ActionMetaLike } from '../../../../../types';

import type { StoreUiActionRuntime } from './store_actions_ui_contracts.js';
import { asStringValue } from './store_actions_value_shared.js';
import { setUiScalarSoft } from './store_actions_ui_writes.js';

function setUiActiveTab(runtime: StoreUiActionRuntime, next: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setActiveTab === 'function') {
    uiNs.setActiveTab(asStringValue(next), meta);
    return;
  }
  setUiScalarSoft(runtime, 'activeTab', asStringValue(next), meta);
}

function setUiSelectedModelId(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'selectedModelId', asStringValue(value), meta);
}

function setUiProjectName(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'projectName', asStringValue(value), meta);
}

function setUiOrderPdfEditorOpen(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'orderPdfEditorOpen', !!on, meta);
}

function setUiOrderPdfEditorDraft(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalarSoft(runtime, 'orderPdfEditorDraft', value, meta);
}

function setUiOrderPdfEditorZoom(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'orderPdfEditorZoom', value, meta);
}

function setUiSite2TabsGateOpen(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'site2TabsGateOpen', !!on, meta);
}

export {
  setUiActiveTab,
  setUiOrderPdfEditorDraft,
  setUiOrderPdfEditorOpen,
  setUiOrderPdfEditorZoom,
  setUiProjectName,
  setUiSelectedModelId,
  setUiSite2TabsGateOpen,
};
