import { PRESET_MODELS_RAW } from './preset_models_data.js';
import { normalizeModelList } from './model_record_normalizer.js';

export { PRESET_MODELS_RAW } from './preset_models_data.js';

// Normalize preset/user models to the canonical persisted shape.
export const PRESET_MODELS = normalizeModelList(PRESET_MODELS_RAW);

// Public aliases (kept stable for new ESM code).
export { normalizeModelRecord, normalizeModelList } from './model_record_normalizer.js';
