import { getCacheBag } from './cache_access.js';

const ADHESIVE_GLASS_DESIGN_INTENT_TRIGGER_KEY = '__wpAdhesiveGlassDesignIntentWarmupTrigger';

export function registerAdhesiveGlassDesignIntentWarmup(App: unknown, trigger: () => void): void {
  getCacheBag(App)[ADHESIVE_GLASS_DESIGN_INTENT_TRIGGER_KEY] = trigger;
}

export function triggerAdhesiveGlassDesignIntentWarmup(App: unknown): void {
  const trigger = getCacheBag(App)[ADHESIVE_GLASS_DESIGN_INTENT_TRIGGER_KEY];
  if (typeof trigger === 'function') trigger();
}
