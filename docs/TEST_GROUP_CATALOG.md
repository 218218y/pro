# Test group catalog

Generated: 2026-08-16T10:46:56.043Z

## Summary

- Catalog groups: 67
- Generic package runner: `test:group`
- Catalog-owned direct test-file references: 484
- Resolved file references across aggregate sequences: 126
- Direct package.json test-file references still remaining: 16
- Catalog definition issues: 0
- Generic runner issues: 0
- Legacy per-group package facades: 0

## Groups

| Group                                       | Role         | Runner         | Direct files | Resolved files | Child groups | Owners                                                               |
| ------------------------------------------- | ------------ | -------------- | -----------: | -------------: | -----------: | -------------------------------------------------------------------- |
| `app-boot-browser-project-family-contracts` | architecture | node-test      |            1 |              1 |            0 | boot, io/project                                                     |
| `app-boot-project-family-core`              | architecture | node-test      |            3 |              3 |            0 | boot, io/project, platform/runtime-config                            |
| `browser-feedback-family-contracts`         | architecture | node-test      |            1 |              1 |            0 | platform/browser-feedback                                            |
| `builder-support-surfaces`                  | focused      | serial-tsx     |           24 |             24 |            0 | builder/support, services/materials, services/scene-view             |
| `builder-surface-family-core`               | architecture | node-test      |            1 |              1 |            0 | builder                                                              |
| `builder-surfaces`                          | focused      | tsx-test       |            6 |              6 |            0 | builder/public-surface                                               |
| `canonical-access-surfaces`                 | focused      | tsx-test       |           11 |             11 |            0 | runtime/access, services/access                                      |
| `canvas-interaction-surfaces`               | focused      | serial-tsx     |           15 |             15 |            0 | services/canvas-picking                                              |
| `canvas-surfaces`                           | primary      | tsx-test       |           14 |             14 |            0 | services/canvas-picking                                              |
| `cloud-sync-family-contracts`               | architecture | node-test      |            1 |              1 |            0 | services/cloud-sync                                                  |
| `cloud-sync-lifecycle`                      | focused      | serial-tsx     |           16 |             16 |            0 | services/cloud-sync/lifecycle                                        |
| `cloud-sync-main-row`                       | focused      | serial-tsx     |            8 |              8 |            0 | services/cloud-sync/main-row                                         |
| `cloud-sync-panel`                          | focused      | group-sequence |            0 |             10 |            4 | ui/cloud-sync                                                        |
| `cloud-sync-panel-controller`               | focused      | tsx-test       |            2 |              2 |            0 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-install`                  | focused      | tsx-test       |            2 |              2 |            0 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-snapshots`                | focused      | tsx-test       |            3 |              3 |            0 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-subscriptions`            | focused      | tsx-test       |            3 |              3 |            0 | ui/cloud-sync-panel                                                  |
| `cloud-sync-surfaces`                       | focused      | group-sequence |            0 |             52 |            5 | services/cloud-sync, ui/cloud-sync                                   |
| `cloud-sync-sync-ops`                       | focused      | serial-tsx     |           13 |             13 |            0 | services/cloud-sync/sync-ops                                         |
| `cloud-sync-tabs-ui`                        | focused      | tsx-test       |            5 |              5 |            0 | ui/cloud-sync-tabs                                                   |
| `domain-codecs`                             | focused      | tsx-test       |            1 |              1 |            0 | shared/domain-codecs                                                 |
| `domain-surfaces`                           | focused      | serial-tsx     |           16 |             16 |            0 | kernel/domain-api, ui/actions, ui/feedback                           |
| `door-build-surfaces`                       | focused      | serial-tsx     |           14 |             14 |            0 | builder/doors, builder/post-build                                    |
| `export-overlay-errors-family-contracts`    | architecture | node-test      |            1 |              1 |            0 | ui/overlays, ui/export                                               |
| `mirror-runtime`                            | focused      | tsx-test       |            6 |              6 |            0 | platform/render-loop, runtime/planar-reflector                       |
| `no-main-surfaces`                          | focused      | serial-tsx     |            5 |              5 |            0 | builder/no-main, services/canvas-picking                             |
| `order-pdf-export-builders`                 | focused      | tsx-test       |            3 |              3 |            0 | ui/export/order-pdf                                                  |
| `order-pdf-export-capture`                  | focused      | tsx-test       |            3 |              3 |            0 | ui/export/order-pdf                                                  |
| `order-pdf-export-overlay`                  | focused      | tsx-test       |            3 |              3 |            0 | ui/order-pdf/export-overlay                                          |
| `order-pdf-export-text`                     | focused      | tsx-test       |            2 |              2 |            0 | ui/export/order-pdf                                                  |
| `order-pdf-overlay-core`                    | focused      | tsx-test       |           10 |             10 |            0 | ui/order-pdf                                                         |
| `order-pdf-pdf-render`                      | focused      | tsx-test       |            5 |              5 |            0 | ui/order-pdf/pdf-runtime                                             |
| `order-pdf-sketch`                          | focused      | tsx-test       |            6 |              6 |            0 | ui/order-pdf/sketch                                                  |
| `order-pdf-surfaces`                        | focused      | group-sequence |            0 |             32 |            7 | ui/order-pdf, ui/export/order-pdf                                    |
| `overlay-export-family-runtime`             | focused      | tsx-test       |            9 |              9 |            0 | ui/overlays, ui/export                                               |
| `perf-e2e-runtime-core`                     | focused      | tsx-test       |            9 |              9 |            0 | runtime/perf, ui/action-events                                       |
| `perf-toolchain-core`                       | focused      | node-test      |            6 |              6 |            0 | toolchain/performance, toolchain/verification                        |
| `project-migration-selector-hardening`      | focused      | tsx-test       |            1 |              1 |            0 | io/project                                                           |
| `project-surfaces`                          | primary      | tsx-test       |           18 |             18 |            0 | io/project, ui/project-session                                       |
| `public-surfaces`                           | primary      | tsx-test       |           20 |             20 |            0 | public-api, platform/browser, services/models                        |
| `render-surfaces`                           | focused      | tsx-test       |           14 |             14 |            0 | runtime/render, services/scene-view                                  |
| `residual-families-core`                    | architecture | node-test      |            2 |              2 |            0 | builder, ui/export                                                   |
| `runtime-access-surfaces`                   | focused      | serial-tsx     |           17 |             17 |            0 | runtime/access, platform/access, state/history                       |
| `runtime-platform-core-family-contracts`    | architecture | node-test      |            1 |              1 |            0 | runtime, platform                                                    |
| `runtime-platform-core-family-core`         | focused      | node-test      |            8 |              8 |            0 | runtime, platform, kernel                                            |
| `runtime-surface-family-core`               | architecture | node-test      |            1 |              1 |            0 | runtime                                                              |
| `service-canonical-surfaces`                | focused      | tsx-test       |            8 |              8 |            0 | services/public-surface                                              |
| `sketch-box-content-protocol`               | focused      | tsx-test       |           13 |             13 |            0 | services/canvas-picking, features/sketch-box                         |
| `sketch-box-hover`                          | focused      | tsx-test       |            6 |              6 |            0 | services/canvas-picking/sketch-box                                   |
| `sketch-free-boxes`                         | focused      | tsx-test       |            9 |              9 |            0 | services/canvas-picking/sketch-free-boxes                            |
| `sketch-manual-hover`                       | focused      | tsx-test       |           10 |             10 |            0 | services/canvas-picking/manual-layout                                |
| `sketch-render-visuals`                     | focused      | tsx-test       |            7 |              7 |            0 | builder/render-sketch                                                |
| `sketch-surfaces`                           | focused      | group-sequence |            0 |             32 |            4 | services/canvas-picking, features/sketch-box                         |
| `state-config-kernel-surfaces`              | focused      | serial-tsx     |            9 |              9 |            0 | kernel/state, runtime/config                                         |
| `structure-tab-family-contracts`            | architecture | node-test      |            1 |              1 |            0 | ui/structure-tab                                                     |
| `structure-tab-family-core`                 | focused      | serial-tsx     |           22 |             22 |            0 | ui/structure-tab, ui/interior-tab                                    |
| `tab-surfaces`                              | primary      | serial-tsx     |           51 |             51 |            0 | ui/structure-tab, ui/design-tab, ui/settings-visual, ui/interior-tab |
| `toolchain-surfaces`                        | primary      | node-test      |           26 |             26 |            0 | toolchain                                                            |
| `ui-actions-family-contracts`               | architecture | node-test      |            1 |              1 |            0 | ui/actions                                                           |
| `ui-lean-contracts`                         | architecture | node-test      |            1 |              1 |            0 | ui/types                                                             |
| `ui-order-pdf-lean-contracts`               | architecture | node-test      |            1 |              1 |            0 | ui/order-pdf/types                                                   |
| `ui-portable-typecheck-contracts`           | architecture | node-test      |            1 |              1 |            0 | ui/types                                                             |
| `ui-react-import-hardening-contracts`       | architecture | node-test      |            1 |              1 |            0 | ui/react                                                             |
| `ui-react-jsx-hardening-contracts`          | architecture | node-test      |            1 |              1 |            0 | ui/react                                                             |
| `ui-type-hardening-contracts`               | architecture | node-test      |            1 |              1 |            0 | ui/types                                                             |
| `verification-control-plane`                | focused      | node-test      |            4 |              4 |            0 | toolchain/verification                                               |
| `visual-surface-family-contracts`           | architecture | node-test      |            1 |              1 |            0 | builder/render, ui/visuals                                           |

## Policy

Named test ownership lives only in this catalog. package.json exposes one generic `test:group` runner; it must not mirror every catalog entry as a package-script facade. Aggregate suites are `group-sequence` entries that compose canonical child groups without duplicating their file inventories. Primary portfolio groups must not overlap each other; focused and architecture groups may intentionally reuse tests.
