// Service access helpers (Canonical surface)
//
// Goal:
// - Give the codebase a single, stable path to access cross-cutting services.
// - Avoid importing from `platform/` so this file can be used from any layer.

import type {
  ToolsNamespaceLike,
  UiFeedbackConfirmFn,
  UiFeedbackEditToastFn,
  UiFeedbackNamespaceLike,
  UiFeedbackPromptFn,
  UiFeedbackStableLike,
  UiFeedbackToastFn,
} from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import { ensureUiFeedbackStable } from './ui_feedback_stable.js';

function asToolsLike(value: unknown): ToolsNamespaceLike | null {
  return asRecord<ToolsNamespaceLike>(value);
}

function asUiFeedbackLike(value: unknown): UiFeedbackNamespaceLike | null {
  return asRecord<UiFeedbackNamespaceLike>(value);
}

function ensureToolsNamespace(App: unknown): ToolsNamespaceLike {
  return ensureServiceSlot<ToolsNamespaceLike>(App, 'tools');
}

function ensureUiFeedbackNamespace(App: unknown): UiFeedbackNamespaceLike {
  return ensureServiceSlot<UiFeedbackNamespaceLike>(App, 'uiFeedback');
}

export function getToolsServiceMaybe(App: unknown): ToolsNamespaceLike | null {
  return asToolsLike(getServiceSlotMaybe<ToolsNamespaceLike>(App, 'tools'));
}

export function ensureToolsService(App: unknown): ToolsNamespaceLike {
  return ensureToolsNamespace(App);
}

export function getUiFeedbackServiceMaybe(App: unknown): UiFeedbackNamespaceLike | null {
  return asUiFeedbackLike(getServiceSlotMaybe<UiFeedbackNamespaceLike>(App, 'uiFeedback'));
}

export function ensureUiFeedbackService(App: unknown): UiFeedbackNamespaceLike {
  return ensureUiFeedbackNamespace(App);
}

export type { UiFeedbackToastFn, UiFeedbackPromptFn, UiFeedbackConfirmFn, UiFeedbackEditToastFn };
export type UiFeedbackStable = UiFeedbackStableLike;

export function getTools(App: unknown): ToolsNamespaceLike {
  return getToolsServiceMaybe(App) || ensureToolsService(App);
}

export function getUiFeedback(App: unknown): UiFeedbackStable {
  const feedback = getUiFeedbackServiceMaybe(App) || ensureUiFeedbackService(App);
  return ensureUiFeedbackStable(App, feedback);
}
