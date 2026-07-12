# Test group catalog

Generated: 2026-07-12T15:02:36.140Z

## Summary

- Catalog groups: 11
- Package script bindings owned by the catalog: 11
- Catalog test-file references: 247
- Direct package.json test-file references still remaining: 291
- Catalog definition issues: 0
- Package binding issues: 0

## Groups

| Group                         | Script                                 | Role         | Runner     | Environment | Files | Owners                                                               |
| ----------------------------- | -------------------------------------- | ------------ | ---------- | ----------- | ----: | -------------------------------------------------------------------- |
| `canvas-surfaces`             | `test:canvas-surfaces`                 | primary      | tsx-test   | tsx         |    14 | services/canvas-picking                                              |
| `mirror-runtime`              | `test:mirror-runtime`                  | focused      | tsx-test   | tsx         |     6 | platform/render-loop, runtime/planar-reflector                       |
| `order-pdf-overlay-core`      | `test:order-pdf-surfaces:overlay-core` | focused      | tsx-test   | tsx         |    10 | ui/order-pdf                                                         |
| `project-surfaces`            | `test:project-surfaces`                | primary      | tsx-test   | tsx         |    19 | io/project, ui/project-session                                       |
| `public-surfaces`             | `test:public-surfaces`                 | primary      | tsx-test   | tsx         |    20 | public-api, platform/browser, services/models                        |
| `refactor-stage-guards`       | `test:refactor-stage-guards`           | architecture | node-test  | node        |    61 | architecture/control-plane                                           |
| `sketch-box-content-protocol` | `test:sketch-box-content-protocol`     | focused      | tsx-test   | tsx         |    13 | services/canvas-picking, features/sketch-box                         |
| `structure-tab-family-core`   | `test:structure-tab-family-core`       | focused      | serial-tsx | tsx         |    22 | ui/structure-tab, ui/interior-tab                                    |
| `tab-surfaces`                | `test:tab-surfaces`                    | primary      | serial-tsx | tsx         |    51 | ui/structure-tab, ui/design-tab, ui/settings-visual, ui/interior-tab |
| `toolchain-surfaces`          | `test:toolchain-surfaces`              | primary      | node-test  | node        |    27 | toolchain                                                            |
| `verification-control-plane`  | `test:verification-control-plane`      | focused      | node-test  | node        |     4 | toolchain/verification                                               |

## Policy

Large or ownership-significant test lanes belong in this catalog rather than as repeated file lists in package.json. Primary portfolio groups must not overlap each other. Focused and architecture groups may intentionally reuse tests while preserving a clear owner, environment, runner, and serial execution policy.
