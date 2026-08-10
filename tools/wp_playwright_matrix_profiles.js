const profile = definition =>
  Object.freeze({
    ...definition,
    viewport: Object.freeze({ ...definition.viewport }),
  });

export const PLAYWRIGHT_CRITICAL_MATRIX_PROFILES = Object.freeze([
  profile({
    name: 'matrix-desktop',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: false,
    reducedMotion: 'no-preference',
  }),
  profile({
    name: 'matrix-xs-portrait',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: false,
    reducedMotion: 'no-preference',
  }),
  profile({
    name: 'matrix-xs-landscape',
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    hasTouch: false,
    reducedMotion: 'no-preference',
  }),
  profile({
    name: 'matrix-touch-dpr2',
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    hasTouch: true,
    reducedMotion: 'no-preference',
  }),
  profile({
    name: 'matrix-reduced-motion',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: false,
    reducedMotion: 'reduce',
  }),
]);

export function getPlaywrightCriticalMatrixProfile(name) {
  return PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.find(candidate => candidate.name === name) || null;
}
