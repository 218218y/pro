import type { ActionMetaLike, AppContainer } from '../../../../../types';

import { asStringValue, getUiNamespace } from './store_actions_state.js';
import { setUiScalarSoft } from './store_actions_ui_writes.js';

function setUiActiveTab(app: AppContainer, next: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setActiveTab === 'function') {
    uiNs.setActiveTab(asStringValue(next), meta);
    return;
  }
  setUiScalarSoft(app, 'activeTab', next == null ? '' : String(next), meta);
}

function setUiSelectedModelId(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'selectedModelId', value == null ? '' : String(value), meta);
}

function setUiProjectName(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'projectName', value == null ? '' : String(value), meta);
}

function setUiOrderPdfEditorOpen(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'orderPdfEditorOpen', !!on, meta);
}

function setUiOrderPdfEditorDraft(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'orderPdfEditorDraft', value, meta);
}

function setUiOrderPdfEditorZoom(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'orderPdfEditorZoom', value, meta);
}

function setUiSite2TabsGateOpen(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'site2TabsGateOpen', !!on, meta);
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
