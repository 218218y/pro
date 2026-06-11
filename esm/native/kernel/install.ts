// Kernel install surface (TypeScript, Pure ESM)
//
// Boot (and only boot) should import installers from here.
// Other layers should prefer `./api.ts` for read-only access.

export { installCfgMeta } from './cfg_meta.js';
export { installSplitDoorsNormalizers } from './splitdoors_normalizer.js';
export { installKernel } from './kernel.js';
export { installStateApi } from './state_api.js';
export { installDomainApi } from './domain_api.js';
export { installMapsApi } from './maps_api.js';
