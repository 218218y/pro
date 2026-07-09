import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dockSource = readFileSync('esm/native/ui/react/overlay_quick_actions_dock.tsx', 'utf8');
const stylesSource = readFileSync('css/react_styles.css', 'utf8');

test('quick action export buttons expose structured title and detail tooltips', () => {
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
  assert.match(dockSource, /function QuickActionExportTooltipView\(\{\s*tooltip,?\s*\}/);
  assert.match(dockSource, /function QuickActionExportButton\(\{/);
  assert.match(dockSource, /data-tooltip-title=\{tooltip\.title\}/);
  assert.match(dockSource, /data-tooltip-detail=\{tooltip\.detail\}/);
  assert.match(dockSource, /aria-label=\{formatQuickActionExportTooltipLabel\(tooltip\)\}/);
  assert.match(dockSource, /<QuickActionExportTooltipView tooltip=\{tooltip\} \/>/);
  assert.match(dockSource, /keepOpen: keepOpenRef\.current/);
  assert.doesNotMatch(dockSource, /type QuickActionExportTooltip\s*=/);
  assert.match(dockSource, /className="wp-qa-tooltip-title"/);
  assert.match(dockSource, /className="wp-qa-tooltip-detail"/);
  assert.doesNotMatch(dockSource, /צילום - תמונת תצוגה נוכחית/);
  assert.doesNotMatch(dockSource, /className="wp-qa-btn hint-bottom"/);
});

test('quick action menu tooltips render as compact centered two-line boxes below each button', () => {
  const quickActionTooltipRule = stylesSource.match(
    /body\.wp-ui-react \.wp-qa-menu \.wp-qa-tooltip \{([\s\S]*?)\n\}/
  )?.[1];
  const quickActionTooltipTitleRule = stylesSource.match(
    /body\.wp-ui-react \.wp-qa-menu \.wp-qa-tooltip-title \{([\s\S]*?)\n\}/
  )?.[1];
  const quickActionTooltipDetailRule = stylesSource.match(
    /body\.wp-ui-react \.wp-qa-menu \.wp-qa-tooltip-detail \{([\s\S]*?)\n\}/
  )?.[1];

  assert.ok(quickActionTooltipRule, 'missing quick-action tooltip style rule');
  assert.ok(quickActionTooltipTitleRule, 'missing quick-action tooltip title style rule');
  assert.ok(quickActionTooltipDetailRule, 'missing quick-action tooltip detail style rule');
  assert.match(quickActionTooltipRule, /left:\s*50%;/);
  assert.match(quickActionTooltipRule, /right:\s*auto;/);
  assert.match(quickActionTooltipRule, /transform:\s*translateX\(-50%\);/);
  assert.match(quickActionTooltipRule, /direction:\s*rtl;/);
  assert.match(quickActionTooltipRule, /text-align:\s*center;/);
  assert.match(quickActionTooltipRule, /width:\s*min\(144px, calc\(100vw - 96px\)\);/);
  assert.match(quickActionTooltipRule, /min-width:\s*0;/);
  assert.match(quickActionTooltipRule, /white-space:\s*normal;/);
  assert.match(quickActionTooltipRule, /font-size:\s*0\.8rem;/);
  assert.match(quickActionTooltipRule, /line-height:\s*1\.35;/);
  assert.match(quickActionTooltipRule, /padding:\s*6px 7px;/);
  assert.doesNotMatch(quickActionTooltipRule, /z-index\s*:/);
  assert.match(quickActionTooltipTitleRule, /font-size:\s*0\.94rem;/);
  assert.match(quickActionTooltipTitleRule, /font-weight:\s*800;/);
  assert.match(quickActionTooltipDetailRule, /font-family:\s*'Heebo', sans-serif;/);
  assert.match(quickActionTooltipDetailRule, /font-size:\s*0\.75rem;/);
  assert.match(quickActionTooltipDetailRule, /font-weight:\s*450;/);
  assert.match(quickActionTooltipDetailRule, /line-height:\s*1\.2;/);
  assert.doesNotMatch(quickActionTooltipRule, /text-align:\s*right;/);
  assert.doesNotMatch(quickActionTooltipRule, /680px/);
});

test('quick action menu tooltip arrow stays centered under the button', () => {
  const quickActionTooltipArrowRule = stylesSource.match(
    /body\.wp-ui-react \.wp-qa-menu \.wp-qa-tooltip::before \{([\s\S]*?)\n\}/
  )?.[1];

  assert.ok(quickActionTooltipArrowRule, 'missing quick-action tooltip arrow style rule');
  assert.match(quickActionTooltipArrowRule, /left:\s*50%;/);
  assert.match(quickActionTooltipArrowRule, /right:\s*auto;/);
  assert.match(quickActionTooltipArrowRule, /transform:\s*translateX\(-50%\);/);
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
    /body\.wp-ui-react \.wp-qa-menu \.wp-qa-tooltip,\nbody\.wp-ui-react \.wp-qa-menu \.wp-qa-btn:hover,\nbody\.wp-ui-react \.wp-qa-menu \.wp-qa-btn:focus-visible,\nbody\.wp-ui-react \.wp-qa-anchor \.hint-bottom:hover \{([\s\S]*?)\n\}/
  )?.[1];

  assert.ok(tooltipLayerRule, 'missing shared quick-action tooltip/hover layer rule');
  assert.match(tooltipLayerRule, /z-index:\s*var\(--wp-z-quick-actions-tooltip\);/);
  assert.ok(layerValues.menu > layerValues.dock, 'quick-action menu must render above sync dock');
  assert.ok(layerValues.menu > layerValues.pin, 'quick-action menu must render above sync pin buttons');
  assert.ok(layerValues.tooltip > layerValues.menu, 'tooltip layer token must stay above the menu layer');
});
