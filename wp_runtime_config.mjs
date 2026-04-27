// WardrobePro runtime configuration (Pure ESM, static deployments)
//
// This file is optional.
// The Pro entry (esm/entry_pro_main.ts) loads it at boot (best-effort) and merges:
// - `default.flags`  -> deps.flags
// - `default.config` -> deps.config
//
// Notes:
// - Prefer Vite env vars for dev/build when available (see docs).
// - This is a *client-side* config surface. Anything here ships to the browser.
//
// Cloud Sync:
// - The anon key is PUBLIC by design (it will be shipped to the browser).
// - This setup is intentionally "open": anyone with your site URL can read/write.
//
export default {
  // Optional: runtime flags (kept separate from config).
  flags: {
    // uiFramework is enforced by the entry (react-only build), but you can keep
    // other runtime flags here if needed in the future.
    // uiFramework: 'react',
  },

  // Runtime config overrides.
  config: {
    supabaseCloudSync: {
      // Required:
      url: 'https://paqzrxrvowwndevqptdk.supabase.co',
      anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcXpyeHJ2b3d3bmRldnFwdGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDExODcsImV4cCI6MjA4NTg3NzE4N30.hX4ciLINkSumjevU20rinv36wM7a72nZKr0TQYWs30o',

      // Optional:
      table: 'wp_shared_state',
      publicRoom: 'public',

      // If set, the UI button "חדר פרטי" will use this ID (stable).
      // If empty, the app can generate a stable one and keep it in localStorage.
      privateRoom: 'bargig_private',

      // URL query param name for room selection.
      roomParam: 'room',

      // Base URL used when copying share links (customers should open Site2).
      shareBaseUrl: 'https://bargig218.netlify.app/',

      // Fallback polling interval (ms) when realtime is DISCONNECTED.
      // Aggressive fallback for near-immediate recovery when realtime drops. While realtime is connected there is NO periodic polling.
      pollMs: 1500,

      // Diagnostics (optional): console logs + published on App.services.cloudSync.status
      // You can also toggle at runtime: localStorage.setItem('WP_CLOUDSYNC_DIAG','1')
      diagnostics: false,

      // Realtime (recommended): use public Broadcast channel (no auth, no DB RLS auth pool bottleneck).
      // The app sends lightweight "hint" events and clients pull the updated rows via REST.
      realtime: true,
      realtimeMode: 'broadcast',

      // Channel prefix (actual channel = prefix + ':' + room).
      realtimeChannelPrefix: 'wp_cloud_sync',

      // Site2 (customer site) only: on first connect, auto-load an existing cloud sketch
      // if it was updated recently (prevents "must be exact same moment" misses).
      // Main site still keeps baseline-only behavior on initial connect.
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,

      // Panel in the Export tab to switch/copy room links.
      showRoomWidget: true,
    },
  },
};
