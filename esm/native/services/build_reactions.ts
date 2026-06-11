// Native ESM build reactions service (post-build side effects).
//
// Purpose:
// - Keep builder core/build_runner dependency-free: no UI/scene/camera imports in builder.
// - Centralize post-build side effects (lights + camera nudges) in the services layer.
// - Only apply reactions when the relevant UI mode changed (avoid fighting user orbiting).
//
// This service is best-effort: failures should not break builds.

export { installBuildReactionsService } from './build_reactions_install.js';
