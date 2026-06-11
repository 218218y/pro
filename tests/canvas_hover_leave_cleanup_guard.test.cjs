const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'esm', 'native', 'ui', 'interactions', 'canvas_interactions.ts'),
  path.join(__dirname, '..', 'esm', 'native', 'ui', 'interactions', 'canvas_interactions_shared.ts'),
  path.join(__dirname, '..', 'esm', 'native', 'ui', 'interactions', 'canvas_interactions_hover.ts'),
  path.join(__dirname, '..', 'esm', 'native', 'ui', 'interactions', 'canvas_interactions_pointer.ts'),
];
const src = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const owner = fs.readFileSync(files[0], 'utf8');

function expectIncludes(haystack, snippet, label) {
  if (!haystack.includes(snippet)) {
    throw new Error(`Missing ${label}: ${snippet}`);
  }
}

expectIncludes(
  owner,
  "import { createCanvasHoverInteractionOps } from './canvas_interactions_hover.js';",
  'hover seam import'
);
expectIncludes(
  owner,
  "import { createCanvasPointerInteractionOps } from './canvas_interactions_pointer.js';",
  'pointer seam import'
);
expectIncludes(
  src,
  "import { clearSketchHoverPreview, getBrowserTimers, getBuilderRenderOps } from '../../services/api.js';",
  'canvas interactions public api import'
);
if (src.includes('../../runtime/builder_service_access.js')) {
  throw new Error('canvas_interactions must not import builder render ops from runtime directly');
}
if (src.includes('../../services/canvas_picking_local_helpers.js')) {
  throw new Error(
    'canvas_interactions must not import sketch hover helpers from services internals directly'
  );
}
expectIncludes(
  src,
  'export function createClearTransientHoverPreview(App: AppContainer, domEl: HTMLElement, state: CanvasInteractionState) {',
  'clear helper seam'
);
expectIncludes(
  src,
  "ro.hideSketchPlacementPreview({ App, __reason: 'canvas.pointerleave.hideSketchPlacementPreview' });",
  'sketch preview hide'
);
if (
  !/ro\.hideInteriorLayoutHoverPreview\(\{[\s\S]*__reason: 'canvas\.pointerleave\.hideInteriorLayoutHoverPreview'[\s\S]*\}\);/.test(
    src
  )
) {
  throw new Error('Missing layout preview hide');
}
expectIncludes(src, 'clearSketchHoverPreview(App);', 'sketch hover clear');
expectIncludes(src, 'const onPointerLeave: EventListener = () => {', 'pointer leave handler');
expectIncludes(
  owner,
  "removers.push(add('pointerleave', hoverOps.onPointerLeave, { passive: true }));",
  'pointerleave binding'
);
expectIncludes(
  owner,
  "removers.push(add('mouseleave', hoverOps.onPointerLeave, { passive: true }));",
  'mouseleave binding'
);
expectIncludes(
  src,
  "if (typeof deps.triggerRender === 'function') deps.triggerRender(false);",
  'leave trigger render'
);

console.log('canvas_hover_leave_cleanup_guard: ok');
