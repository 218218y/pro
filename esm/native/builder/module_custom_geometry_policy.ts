import { moduleHasHexCell } from '../features/hex_cell/index.js';
import { getActiveDepthCmFromConfig, getActiveHeightCmFromConfig } from '../features/special_dims/index.js';

/**
 * A width override changes the allocation of the existing module openings, not
 * the cross-section of a divider. Only depth/height/hex geometry needs separate
 * full-depth side panels. Door-count edits rebase width overrides on *every*
 * module; treating those as custom walls would put an extra wall inside each
 * following opening (covering its left shelf supports).
 */
export function moduleRequiresCustomBoundaryGeometry(cfgMod: unknown, heightOffsetCm: number): boolean {
  return (
    getActiveDepthCmFromConfig(cfgMod) != null ||
    getActiveHeightCmFromConfig(cfgMod, heightOffsetCm) != null ||
    moduleHasHexCell(cfgMod)
  );
}
