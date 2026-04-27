import type { AppContainer } from '../../../types';

import { readUiStateFromApp } from '../runtime/root_state_access.js';
import { reportErrorViaPlatform } from '../runtime/platform_access.js';

export type BuildReactionsRecord = Record<string, unknown>;

export function isBuildReactionsRecord(value: unknown): value is BuildReactionsRecord {
  return !!value && typeof value === 'object';
}

export function getBuildReactionsUiSnapshot(App: AppContainer): BuildReactionsRecord {
  try {
    const ui = readUiStateFromApp(App);
    return isBuildReactionsRecord(ui) ? ui : {};
  } catch {
    return {};
  }
}

export function readBuildReactionsString(
  record: BuildReactionsRecord | null | undefined,
  key: string
): string | null {
  const value = record ? record[key] : null;
  return typeof value === 'string' && value ? value : null;
}

export function readBuildReactionsBoolean(
  record: BuildReactionsRecord | null | undefined,
  key: string
): boolean | null {
  const value = record ? record[key] : null;
  return typeof value === 'boolean' ? value : null;
}

export function getBuildReactionsCornerKey(ui: BuildReactionsRecord): string {
  const raw = isBuildReactionsRecord(ui.raw) ? ui.raw : null;

  const cornerMode = !!(
    readBuildReactionsBoolean(ui, 'cornerMode') ??
    readBuildReactionsBoolean(ui, 'isCornerMode') ??
    readBuildReactionsBoolean(raw, 'cornerMode') ??
    readBuildReactionsBoolean(raw, 'isCornerMode') ??
    readBuildReactionsBoolean(ui, 'cornerConnectorEnabled') ??
    readBuildReactionsBoolean(raw, 'cornerConnectorEnabled')
  );

  const sideValue =
    readBuildReactionsString(ui, 'cornerSide') ??
    readBuildReactionsString(raw, 'cornerSide') ??
    readBuildReactionsString(ui, 'cornerDirection') ??
    readBuildReactionsString(raw, 'cornerDirection');

  let cornerSide: 'left' | 'right' | null =
    sideValue === 'left' ? 'left' : sideValue === 'right' ? 'right' : null;

  if (cornerMode && !cornerSide) cornerSide = 'right';

  return cornerMode ? `corner:${cornerSide}` : 'normal';
}

export function getBuildReactionsCameraKey(ui: BuildReactionsRecord): string {
  const raw = isBuildReactionsRecord(ui.raw) ? ui.raw : null;
  const chestMode = !!(
    readBuildReactionsBoolean(ui, 'isChestMode') ??
    readBuildReactionsBoolean(ui, 'chestMode') ??
    readBuildReactionsBoolean(raw, 'isChestMode') ??
    readBuildReactionsBoolean(raw, 'chestMode')
  );

  if (chestMode) return 'chest';
  return getBuildReactionsCornerKey(ui);
}

export function reportBuildReactionsSoftError(
  App: AppContainer | null | undefined,
  where: string,
  error: unknown
): void {
  try {
    if (reportErrorViaPlatform(App, error, { where, fatal: false })) return;
  } catch {}
  try {
    console.warn(`[WardrobePro][build_reactions] ${where} failed:`, error);
  } catch {}
}
