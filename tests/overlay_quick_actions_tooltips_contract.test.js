import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dockSource = readFileSync('esm/native/ui/react/overlay_quick_actions_dock.tsx', 'utf8');
const stylesSource = readFileSync('css/react_styles.css', 'utf8');
const tooltipPlacementSource = readFileSync('esm/native/ui/react/components/TooltipPlacement.ts', 'utf8');

test('quick action export buttons expose structured title and detail through the shared tooltip host', () => {
  const expectedTooltips = [
    { key: 'snapshot', title: 'צילום', detail: 'תמונת תצוגה נוכחית להורדה למחשב' },
    { key: 'copy', title: 'העתק ללוח', detail: 'תמונת תצוגה נוכחית בהעתקה ללוח' },
    {
      key: 'renderAndSketch',
      title: 'סקיצה/הדמיה',
      detail: 'תמונה מזווית קבועה משולבת משתי תמונות בהעתקה ללוח',
    },
    { key: 'dualImage', title: 'פתוח/סגור', detail: 'תמונה מזווית קבועה משולבת משתי תמונות בהעתקה ללוח' },
  ];

  for (const tooltip of expectedTooltips) {
    assert.ok(
      dockSource.includes(`title: '${tooltip.title}'`),
      `missing quick-action tooltip title: ${tooltip.title}`
    );
    assert.ok(
      dockSource.includes(`detail: '${tooltip.detail}'`),
      `missing quick-action tooltip detail: ${tooltip.detail}`
    );
    assert.match(dockSource, new RegExp(`tooltip=\\{QUICK_ACTION_EXPORT_TOOLTIPS\\.${tooltip.key}\\}`));
  }

  assert.match(dockSource, /type QuickActionExportTooltipConfig/);
  assert.match(dockSource, /function QuickActionExportButton\(\{/);
  assert.match(dockSource, /className="wp-qa-btn wp-r-styled-tooltip"/);
  assert.match(dockSource, /data-tooltip-title=\{tooltip\.title\}/);
  assert.match(dockSource, /data-tooltip-detail=\{tooltip\.detail\}/);
  assert.match(dockSource, /aria-label=\{formatQuickActionExportTooltipLabel\(tooltip\)\}/);
  assert.match(tooltipPlacementSource, /const TOOLTIP_TITLE_ATTR = 'data-tooltip-title';/);
  assert.match(tooltipPlacementSource, /const TOOLTIP_DETAIL_ATTR = 'data-tooltip-detail';/);
  assert.match(
    tooltipPlacementSource,
    /return \[title, detail\]\.filter\(Boolean\)\.join\('\\n'\) \|\| undefined;/
  );
  assert.doesNotMatch(dockSource, /QuickActionExportTooltipView/);
  assert.doesNotMatch(dockSource, /className="wp-qa-tooltip-title"/);
  assert.doesNotMatch(dockSource, /className="wp-qa-tooltip-detail"/);
  assert.doesNotMatch(dockSource, /className="wp-qa-btn hint-bottom"/);
});

test('quick action menu uses the shared fixed viewport tooltip instead of an internal tooltip box', () => {
  assert.match(stylesSource, /body\.wp-ui-react \.wp-r-floating-tooltip \{[\s\S]*?white-space:\s*pre-line;/);
  assert.match(
    stylesSource,
    /body\.wp-ui-react \.wp-r-floating-tooltip \{[\s\S]*?max-width:\s*min\(320px, calc\(100vw - 16px\)\);/
  );
  assert.match(
    stylesSource,
    /body\.wp-ui-react \.wp-r-floating-tooltip-arrow\.is-below \{[\s\S]*?border-bottom-color:\s*#1e293b;/
  );
  assert.match(tooltipPlacementSource, /\.wp-qa-btn\[\$\{TOOLTIP_TITLE_ATTR\}\]/);
  assert.doesNotMatch(stylesSource, /body\.wp-ui-react \.wp-qa-menu \.wp-qa-tooltip \{/);
  assert.doesNotMatch(stylesSource, /body\.wp-ui-react \.wp-qa-menu \.wp-qa-tooltip::before/);
});

test('quick action export tooltip layer stays above the docked sketch sync button', () => {
  const quickActionsLayerRule = stylesSource.match(
    /body\.wp-ui-react \.wp-qa-sync-dock \{([\s\S]*?)\n\}\n\nbody\.wp-ui-react \.wp-qa-menu \{([\s\S]*?)\n\}/
  );

  assert.ok(quickActionsLayerRule, 'missing separated quick-action dock/menu layer rules');
  assert.match(quickActionsLayerRule[1], /z-index:\s*var\(--wp-z-quick-actions-dock\);/);
  assert.match(quickActionsLayerRule[2], /z-index:\s*var\(--wp-z-quick-actions-menu\);/);

  const tokensSource = readFileSync('css/react_tokens.css', 'utf8');
  const layerValues = Object.fromEntries(
    [...tokensSource.matchAll(/--wp-z-quick-actions-([\w-]+):\s*(\d+);/g)].map(([, name, value]) => [
      name,
      Number(value),
    ])
  );

  const tooltipLayerRule = stylesSource.match(
    /body\.wp-ui-react \.wp-qa-menu \.wp-qa-btn:hover,\nbody\.wp-ui-react \.wp-qa-menu \.wp-qa-btn:focus-visible,\nbody\.wp-ui-react \.wp-qa-anchor \.hint-bottom:hover \{([\s\S]*?)\n\}/
  )?.[1];

  assert.ok(tooltipLayerRule, 'missing shared quick-action hover layer rule');
  assert.match(tooltipLayerRule, /z-index:\s*var\(--wp-z-quick-actions-tooltip\);/);
  assert.ok(layerValues.menu > layerValues.dock, 'quick-action menu must render above sync dock');
  assert.ok(layerValues.menu > layerValues.pin, 'quick-action menu must render above sync pin buttons');
  assert.ok(layerValues.tooltip > layerValues.menu, 'tooltip layer token must stay above the menu layer');
});
