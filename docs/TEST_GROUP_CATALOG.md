# Test group catalog

Generated: 2026-08-05T15:59:45.446Z

## Summary

- Catalog groups: 43
- Package script bindings owned by the catalog: 43
- Catalog test-file references: 452
- Direct package.json test-file references still remaining: 38
- Catalog definition issues: 0
- Package binding issues: 0

## Groups

| Group                               | Script                                         | Role    | Runner     | Environment | Files | Owners                                                               |
| ----------------------------------- | ---------------------------------------------- | ------- | ---------- | ----------- | ----: | -------------------------------------------------------------------- |
| `builder-support-surfaces`          | `test:builder-support-surfaces`                | focused | serial-tsx | tsx         |    24 | builder/support, services/materials, services/scene-view             |
| `builder-surfaces`                  | `test:builder-surfaces`                        | focused | tsx-test   | tsx         |     6 | builder/public-surface                                               |
| `canonical-access-surfaces`         | `test:canonical-access-surfaces`               | focused | tsx-test   | tsx         |    11 | runtime/access, services/access                                      |
| `canvas-interaction-surfaces`       | `test:canvas-interaction-surfaces`             | focused | serial-tsx | tsx         |    14 | services/canvas-picking                                              |
| `canvas-surfaces`                   | `test:canvas-surfaces`                         | primary | tsx-test   | tsx         |    14 | services/canvas-picking                                              |
| `cloud-sync-lifecycle`              | `test:cloud-sync-surfaces:lifecycle`           | focused | serial-tsx | tsx         |    16 | services/cloud-sync/lifecycle                                        |
| `cloud-sync-main-row`               | `test:cloud-sync-surfaces:main-row`            | focused | serial-tsx | tsx         |     8 | services/cloud-sync/main-row                                         |
| `cloud-sync-panel-controller`       | `test:cloud-sync-surfaces:panel-controller`    | focused | tsx-test   | tsx         |     2 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-install`          | `test:cloud-sync-surfaces:panel-install`       | focused | tsx-test   | tsx         |     2 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-snapshots`        | `test:cloud-sync-surfaces:panel-snapshots`     | focused | tsx-test   | tsx         |     3 | ui/cloud-sync-panel                                                  |
| `cloud-sync-panel-subscriptions`    | `test:cloud-sync-surfaces:panel-subscriptions` | focused | tsx-test   | tsx         |     3 | ui/cloud-sync-panel                                                  |
| `cloud-sync-sync-ops`               | `test:cloud-sync-surfaces:sync-ops`            | focused | serial-tsx | tsx         |    13 | services/cloud-sync/sync-ops                                         |
| `cloud-sync-tabs-ui`                | `test:cloud-sync-surfaces:tabs-ui`             | focused | tsx-test   | tsx         |     5 | ui/cloud-sync-tabs                                                   |
| `domain-surfaces`                   | `test:domain-surfaces`                         | focused | serial-tsx | tsx         |    15 | kernel/domain-api, ui/actions, ui/feedback                           |
| `door-build-surfaces`               | `test:door-build-surfaces`                     | focused | serial-tsx | tsx         |    11 | builder/doors, builder/post-build                                    |
| `mirror-runtime`                    | `test:mirror-runtime`                          | focused | tsx-test   | tsx         |     6 | platform/render-loop, runtime/planar-reflector                       |
| `no-main-surfaces`                  | `test:no-main-surfaces`                        | focused | serial-tsx | tsx         |     5 | builder/no-main, services/canvas-picking                             |
| `order-pdf-export-builders`         | `test:order-pdf-surfaces:export-builders`      | focused | tsx-test   | tsx         |     3 | ui/export/order-pdf                                                  |
| `order-pdf-export-capture`          | `test:order-pdf-surfaces:export-capture`       | focused | tsx-test   | tsx         |     3 | ui/export/order-pdf                                                  |
| `order-pdf-export-overlay`          | `test:order-pdf-surfaces:export-overlay`       | focused | tsx-test   | tsx         |     3 | ui/order-pdf/export-overlay                                          |
| `order-pdf-export-text`             | `test:order-pdf-surfaces:export-text`          | focused | tsx-test   | tsx         |     2 | ui/export/order-pdf                                                  |
| `order-pdf-overlay-core`            | `test:order-pdf-surfaces:overlay-core`         | focused | tsx-test   | tsx         |    10 | ui/order-pdf                                                         |
| `order-pdf-pdf-render`              | `test:order-pdf-surfaces:pdf-render`           | focused | tsx-test   | tsx         |     5 | ui/order-pdf/pdf-runtime                                             |
| `order-pdf-sketch`                  | `test:order-pdf-surfaces:sketch`               | focused | tsx-test   | tsx         |     6 | ui/order-pdf/sketch                                                  |
| `overlay-export-family-runtime`     | `test:overlay-export-family-runtime`           | focused | tsx-test   | tsx         |     9 | ui/overlays, ui/export                                               |
| `perf-e2e-runtime-core`             | `test:perf-e2e-runtime-core`                   | focused | tsx-test   | tsx         |     7 | runtime/perf, ui/action-events                                       |
| `perf-toolchain-core`               | `test:perf-toolchain-core`                     | focused | node-test  | node        |     6 | toolchain/performance, toolchain/verification                        |
| `project-surfaces`                  | `test:project-surfaces`                        | primary | tsx-test   | tsx         |    18 | io/project, ui/project-session                                       |
| `public-surfaces`                   | `test:public-surfaces`                         | primary | tsx-test   | tsx         |    20 | public-api, platform/browser, services/models                        |
| `render-surfaces`                   | `test:render-surfaces`                         | focused | tsx-test   | tsx         |    14 | runtime/render, services/scene-view                                  |
| `runtime-access-surfaces`           | `test:runtime-access-surfaces`                 | focused | serial-tsx | tsx         |    17 | runtime/access, platform/access, state/history                       |
| `runtime-platform-core-family-core` | `test:runtime-platform-core-family-core`       | focused | node-test  | node        |     7 | runtime, platform, kernel                                            |
| `service-canonical-surfaces`        | `test:service-canonical-surfaces`              | focused | tsx-test   | tsx         |     8 | services/public-surface                                              |
| `sketch-box-content-protocol`       | `test:sketch-box-content-protocol`             | focused | tsx-test   | tsx         |    13 | services/canvas-picking, features/sketch-box                         |
| `sketch-box-hover`                  | `test:sketch-surfaces:box-hover`               | focused | tsx-test   | tsx         |     6 | services/canvas-picking/sketch-box                                   |
| `sketch-free-boxes`                 | `test:sketch-surfaces:free-boxes`              | focused | tsx-test   | tsx         |     9 | services/canvas-picking/sketch-free-boxes                            |
| `sketch-manual-hover`               | `test:sketch-surfaces:manual-hover`            | focused | tsx-test   | tsx         |    10 | services/canvas-picking/manual-layout                                |
| `sketch-render-visuals`             | `test:sketch-surfaces:render-visuals`          | focused | tsx-test   | tsx         |     7 | builder/render-sketch                                                |
| `state-config-kernel-surfaces`      | `test:state-config-kernel-surfaces`            | focused | serial-tsx | tsx         |     8 | kernel/state, runtime/config                                         |
| `structure-tab-family-core`         | `test:structure-tab-family-core`               | focused | serial-tsx | tsx         |    22 | ui/structure-tab, ui/interior-tab                                    |
| `tab-surfaces`                      | `test:tab-surfaces`                            | primary | serial-tsx | tsx         |    51 | ui/structure-tab, ui/design-tab, ui/settings-visual, ui/interior-tab |
| `toolchain-surfaces`                | `test:toolchain-surfaces`                      | primary | node-test  | node        |    26 | toolchain                                                            |
| `verification-control-plane`        | `test:verification-control-plane`              | focused | node-test  | node        |     4 | toolchain/verification                                               |

## Policy

Large or ownership-significant test lanes belong in this catalog rather than as repeated file lists in package.json. Primary portfolio groups must not overlap each other. Focused and architecture groups may intentionally reuse tests while preserving a clear owner, environment, runner, and serial execution policy.
