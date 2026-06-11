// Native Builder: interior layout pipeline (ESM)
//
// Thin owner over canonical custom/preset interior execution seams.

import { applyCustomInteriorLayout } from './interior_pipeline_custom.js';
import { applyPresetInteriorLayout } from './interior_pipeline_preset.js';
import { readConfig, readParams } from './interior_pipeline_shared.js';

export function applyInteriorLayout(params: unknown): boolean {
  const input = readParams(params);
  const config = readConfig(input.config);
  return config.isCustom
    ? applyCustomInteriorLayout(input, config)
    : applyPresetInteriorLayout(input, config);
}
