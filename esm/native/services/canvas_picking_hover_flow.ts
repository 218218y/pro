// Canvas picking hover flow.
//
// Keep this file as the canonical hover entrypoint for canvas_picking_core.ts
// while the actual mode preparation / split / non-split routing lives in
// focused hover-flow owners.
import type { AppContainer } from '../../../types';
import { handleCanvasHoverNDCImpl } from './canvas_picking_hover_flow_core.js';

export function __coreHandleCanvasHoverNDC(App: AppContainer, ndcX: number, ndcY: number): boolean {
  return handleCanvasHoverNDCImpl(App, ndcX, ndcY);
}
