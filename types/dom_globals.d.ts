// Global DOM augmentations for gradual TypeScript adoption.
//
// Keep this file small and focused: only declare *actual* custom globals
// used in the codebase, so `checkJs` can stay strict without peppering
// the code with `any` casts.

export {};

import type {
  WardrobeProDebugConsoleSurface,
  WardrobeProFatalOverlayController,
  WardrobeProPerfConsoleSurface,
} from './runtime';

declare global {
  interface Window {
    /** Optional helper element shown in Notes UI. */
    noteInstruction?: HTMLElement | null;

    /** Data URI for the embedded WardrobePro logo (set by wp_logo_data.js). */
    WP_LOGO_DATA_URI?: string;

    /** Applies the embedded WardrobePro logo to matching <img> elements. */
    applyWardrobeProLogo?: () => void;

    // --- WardrobePro runtime globals (minimal) ---------------------------

    /** Fatal boot overlay controller (installed at runtime). */
    __WARDROBE_PRO_FATAL_OVERLAY__?: WardrobeProFatalOverlayController;

    /** Optional asset version string injected by the build/runtime. */
    __WP_ASSET_VERSION__?: string;

    /** Minimal browser-console debug helpers (no global App exposure). */
    __WP_DEBUG__?: WardrobeProDebugConsoleSurface;

    /** Browser-console perf helpers for real user flow timings. */
    __WP_PERF__?: WardrobeProPerfConsoleSurface;
  }
}
