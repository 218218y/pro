// WardrobePro site profile: רהיטי ברגיג
//
// This file controls only store-specific build/runtime values.
// Shared application code remains in the project root.
// Bargig keeps using the root default assets so there is one canonical copy for the current live store.

export default {
  id: 'bargig',
  displayName: 'רהיטי ברגיג',

  // Keep Bargig empty for backward-compatible localStorage keys.
  // New stores get a namespace so browser-local saved data does not mix under the same domain.
  storageNamespace: '',

  assets: {
    // The existing/default Bargig build still reads these files from the project root.
    // Point the profile at that same source instead of keeping duplicate files under sites/bargig.
    logoData: '../../wp_logo_data.js',
    orderPdfTemplate: '../../public/order_template.pdf',
  },

  supabase: {
    url: 'https://paqzrxrvowwndevqptdk.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcXpyeHJ2b3d3bmRldnFwdGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDExODcsImV4cCI6MjA4NTg3NzE4N30.hX4ciLINkSumjevU20rinv36wM7a72nZKr0TQYWs30o',

    // Same Supabase project/account; separate table/channel per store to prevent collisions.
    table: 'wp_shared_state',
    publicRoom: 'public',
    privateRoom: '',
    roomParam: 'room',
    shareBaseUrl: 'https://bargig218.netlify.app/',
    pollMs: 1500,
    diagnostics: false,
    realtime: true,
    realtimeMode: 'broadcast',
    realtimeChannelPrefix: 'wp_cloud_sync',
    site2SketchInitialAutoLoad: true,
    site2SketchInitialMaxAgeHours: 12,
    showRoomWidget: true,
  },

  variants: {
    main: {
      title: 'עיצוב ארונות PRO - רהיטי ברגיג',
      showRoomWidget: true,
      orderPdfTemplateUrl: 'order_template.pdf',
    },

    site2: {
      title: 'עיצוב ארונות PRO - רהיטי ברגיג לקוחות',
      site2EnabledTabs: ['structure', 'design', 'interior', 'sketch', 'settings'],
      showRoomWidget: false,
      orderPdfTemplateUrl: 'order_template.pdf',
    },
  },
};
