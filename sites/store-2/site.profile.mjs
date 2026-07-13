// WardrobePro site profile: חנות 2
//
// This file controls only store-specific build/runtime values.
// Shared application code remains in the project root.
// Replace ./wp_logo_data.js and ./order_template.pdf here when this store gets its own branding.

export default {
  id: 'store-2',
  displayName: 'חנות 2',
  releaseStatus: 'draft',

  // Keep Bargig empty for backward-compatible localStorage keys.
  // New stores get a namespace so browser-local saved data does not mix under the same domain.
  storageNamespace: 'wp_store_2',

  assets: {
    logoData: './wp_logo_data.js',
    orderPdfTemplate: './order_template.pdf',
  },

  supabase: {
    url: 'https://paqzrxrvowwndevqptdk.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcXpyeHJ2b3d3bmRldnFwdGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDExODcsImV4cCI6MjA4NTg3NzE4N30.hX4ciLINkSumjevU20rinv36wM7a72nZKr0TQYWs30o',

    gatewayFunction: 'wp-cloud-sync-room',
    publicRoom: 'public',
    roomParam: 'room',
    roomTokenParam: 'roomToken',
    shareBaseUrl: 'https://store-2-client.example.com/',
    pollMs: 1500,
    diagnostics: false,
    realtime: true,
    realtimeMode: 'broadcast',
    realtimeChannelPrefix: 'wp_cloud_sync_store_2',
    site2SketchInitialAutoLoad: true,
    site2SketchInitialMaxAgeHours: 12,
    showRoomWidget: true,
  },

  variants: {
    main: {
      title: 'עיצוב ארונות PRO - חנות 2',
      showRoomWidget: true,
      orderPdfTemplateUrl: 'order_template.pdf',
    },

    site2: {
      title: 'עיצוב ארונות PRO - חנות 2 לקוחות',
      site2EnabledTabs: ['structure', 'design', 'interior', 'sketch', 'settings'],
      showRoomWidget: false,
      orderPdfTemplateUrl: 'order_template.pdf',
    },
  },
};
