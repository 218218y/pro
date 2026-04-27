// Minimal Node-ish globals used in a few ESM entry points.
// We intentionally keep this tiny to avoid pulling full @types/node into the browser build.

declare const process:
  | {
      env?: Record<string, string | undefined>;
      versions?: Record<string, unknown> & { node?: string };
    }
  | undefined;
