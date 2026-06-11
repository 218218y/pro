// WardrobePro — Export canvas scene + notes helpers (Native ESM)

import type { AppContainer } from '../../../../types/app.js';
import type { NotesExportTransformLike } from './export_canvas_engine.js';
import { readRuntimeScalarOrDefaultFromApp, applyViewportSketchMode } from '../../services/api.js';
import { applyExportWallColorOverride } from './export_canvas_scene_wall.js';
import {
  getProjectNameForExport,
  refreshSceneAndRebuildForExport,
  renderSceneForExport,
} from './export_canvas_scene_render.js';
import {
  isNotesEnabledForExport,
  renderAllNotesForExportCanvas,
  setBodyDoorStatusForExportNotes,
  setDoorsOpenForExportScene,
} from './export_canvas_scene_notes.js';

export function _applyExportWallColorOverride(App: AppContainer): () => void {
  return applyExportWallColorOverride(App);
}

function _refreshSceneAndRebuild(App: AppContainer): void {
  void readRuntimeScalarOrDefaultFromApp;
  void applyViewportSketchMode;
  refreshSceneAndRebuildForExport(App);
}

export function _renderSceneForExport(
  App: AppContainer,
  rendererIn: unknown,
  sceneIn: unknown,
  cameraIn: unknown
): void {
  renderSceneForExport(App, rendererIn, sceneIn, cameraIn);
}

export function _getProjectName(App: AppContainer): string {
  return getProjectNameForExport(App);
}

export function _isNotesEnabled(App: AppContainer): boolean {
  return isNotesEnabledForExport(App);
}

export async function _renderAllNotesToCanvas(
  App: AppContainer,
  ctx: CanvasRenderingContext2D,
  originalWidth: number,
  originalHeight: number,
  titleOffset: number,
  opts: NotesExportTransformLike | null | undefined
): Promise<unknown> {
  return await renderAllNotesForExportCanvas(App, ctx, originalWidth, originalHeight, titleOffset, opts);
}

export function _setDoorsOpenForExport(App: AppContainer, isOpen: boolean): void {
  setDoorsOpenForExportScene(App, isOpen);
}

export function _setBodyDoorStatusForNotes(App: AppContainer, isOpen: boolean): void {
  setBodyDoorStatusForExportNotes(App, isOpen);
}

void _refreshSceneAndRebuild;
