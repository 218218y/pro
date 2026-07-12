# Test group catalog

Generated: 2026-07-12T17:35:43.876Z

## Summary

- Catalog groups: 29
- Package script bindings owned by the catalog: 29
- Catalog test-file references: 348
- Direct package.json test-file references still remaining: 191
- Catalog definition issues: 0
- Package binding issues: 0

## Groups

| Group                            | Script                                         | Role         | Runner     | Environment | Files | Owners                                                               |
| -------------------------------- | ---------------------------------------------- | ------------ | ---------- | ----------- | ----: | -------------------------------------------------------------------- |
| `canvas-surfaces`                | `test:canvas-surfaces`                         | primary      | tsx-test   | tsx         |    14 | services/canvas-picking                                              |
| `cloud-sync-lifecycle`           | `test:cloud-sync-surfaces:lifecycle`           | focused      | serial-tsx | tsx         |    16 | services/cloud-sync/lifecycle                                        |
| `cloud-sync-main-row`            | `test:cloud-sync-surfaces:main-row`            | focused      | serial-tsx | tsx         |     7 | services/cloud-sync/main-row                                         |
| `cloud-sync-panel-controller`    | `test:cloud-sync-surfaces:panel-controller`    | focused      | tsx-test   | tsx         |     2 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-install`       | `test:cloud-sync-surfaces:panel-install`       | focused      | tsx-test   | tsx         |     2 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-snapshots`     | `test:cloud-sync-surfaces:panel-snapshots`     | focused      | tsx-test   | tsx         |     3 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-subscriptions` | `test:cloud-sync-surfaces:panel-subscriptions` | focused      | tsx-test   | tsx         |     3 | ui/cloud-sync-panel                                                  |
| `cloud-sync-sync-ops`            | `test:cloud-sync-surfaces:sync-ops`            | focused      | serial-tsx | tsx         |     9 | services/cloud-sync/sync-ops                                         |
| `cloud-sync-tabs-ui`             | `test:cloud-sync-surfaces:tabs-ui`             | focused      | tsx-test   | tsx         |     5 | ui/cloud-sync-tabs                                                   |
| `mirror-runtime`                 | `test:mirror-runtime`                          | focused      | tsx-test   | tsx         |     6 | platform/render-loop, runtime/planar-reflector                       |
| `order-pdf-export-builders`      | `test:order-pdf-surfaces:export-builders`      | focused      | tsx-test   | tsx         |     3 | ui/export/order-pdf                                                  |
| `order-pdf-export-capture`       | `test:order-pdf-surfaces:export-capture`       | focused      | tsx-test   | tsx         |     3 | ui/export/order-pdf                                                  |
| `order-pdf-export-overlay`       | `test:order-pdf-surfaces:export-overlay`       | focused      | tsx-test   | tsx         |     3 | ui/order-pdf/export-overlay                                          |
| `order-pdf-export-text`          | `test:order-pdf-surfaces:export-text`          | focused      | tsx-test   | tsx         |     2 | ui/export/order-pdf                                                  |
| `order-pdf-overlay-core`         | `test:order-pdf-surfaces:overlay-core`         | focused      | tsx-test   | tsx         |    10 | ui/order-pdf                                                         |
| `order-pdf-pdf-render`           | `test:order-pdf-surfaces:pdf-render`           | focused      | tsx-test   | tsx         |     5 | ui/order-pdf/pdf-runtime                                             |
| `order-pdf-sketch`               | `test:order-pdf-surfaces:sketch`               | focused      | tsx-test   | tsx         |     6 | ui/order-pdf/sketch                                                  |
| `project-surfaces`               | `test:project-surfaces`                        | primary      | tsx-test   | tsx         |    19 | io/project, ui/project-session                                       |
| `public-surfaces`                | `test:public-surfaces`                         | primary      | tsx-test   | tsx         |    20 | public-api, platform/browser, services/models                        |
| `refactor-stage-guards`          | `test:refactor-stage-guards`                   | architecture | node-test  | node        |    61 | architecture/control-plane                                           |
| `sketch-box-content-protocol`    | `test:sketch-box-content-protocol`             | focused      | tsx-test   | tsx         |    13 | services/canvas-picking, features/sketch-box                         |
| `sketch-box-hover`               | `test:sketch-surfaces:box-hover`               | focused      | tsx-test   | tsx         |     6 | services/canvas-picking/sketch-box                                   |
| `sketch-free-boxes`              | `test:sketch-surfaces:free-boxes`              | focused      | tsx-test   | tsx         |     9 | services/canvas-picking/sketch-free-boxes                            |
| `sketch-manual-hover`            | `test:sketch-surfaces:manual-hover`            | focused      | tsx-test   | tsx         |    10 | services/canvas-picking/manual-layout                                |
| `sketch-render-visuals`          | `test:sketch-surfaces:render-visuals`          | focused      | tsx-test   | tsx         |     7 | builder/render-sketch                                                |
| `structure-tab-family-core`      | `test:structure-tab-family-core`               | focused      | serial-tsx | tsx         |    22 | ui/structure-tab, ui/interior-tab                                    |
| `tab-surfaces`                   | `test:tab-surfaces`                            | primary      | serial-tsx | tsx         |    51 | ui/structure-tab, ui/design-tab, ui/settings-visual, ui/interior-tab |
| `toolchain-surfaces`             | `test:toolchain-surfaces`                      | primary      | node-test  | node        |    27 | toolchain                                                            |
| `verification-control-plane`     | `test:verification-control-plane`              | focused      | node-test  | node        |     4 | toolchain/verification                                               |

## Policy

Large or ownership-significant test lanes belong in this catalog rather than as repeated file lists in package.json. Primary portfolio groups must not overlap each other. Focused and architecture groups may intentionally reuse tests while preserving a clear owner, environment, runner, and serial execution policy.
