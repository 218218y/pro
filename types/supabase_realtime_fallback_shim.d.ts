declare module '@supabase/supabase-js' {
  export type SupabaseRealtimeClientLike = {
    channel?: (name: string, options?: Record<string, unknown>) => unknown;
    removeChannel?: (channel: unknown) => unknown;
  };

  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): SupabaseRealtimeClientLike;

  const supabase: {
    createClient?: typeof createClient;
  };

  export default supabase;
}
