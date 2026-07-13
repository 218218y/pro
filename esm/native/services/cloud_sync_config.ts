// Cloud Sync config helpers.
//
// Canonical public seam over focused config readers, browser URL helpers, and
// pure shared normalization helpers.

export {
  type SupabaseCfg,
  type SupabaseCfgRaw,
  type SupabaseImportMetaEnvLike,
  asSupabaseCfgRaw,
  asString,
  asNumber,
  asBool,
  mergeCfgRaw,
  hasAnySupabaseCfgKey,
  randomCloudSyncIdSegment,
  normalizeRealtimeMode,
  buildGatewayUrl,
  makeHeaders,
} from './cloud_sync_config_shared.js';

export { readCfgFromDepsConfig, readCfgFromImportMetaEnv, readCfg } from './cloud_sync_config_sources.js';

export {
  getRoomFromUrl,
  removeRoomTokenFromUrl,
  setRoomCredentialInUrl,
  isExplicitSite2Bundle,
} from './cloud_sync_config_browser.js';
