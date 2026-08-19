# Modernization current state

Generated at: 2026-08-19T07:30:50.357Z

> Generated source of truth for mutable modernization metrics. Living architecture documents should describe policy and ownership, not copy these counts.

## Gate status

- Overall: **PASS**
- Silent-catch policy: **PASS**
- Compatibility audit: **PASS**
- Private-owner boundary: **PASS**
- Test portfolio: **PASS**

## Error observability

- Statement-free catches: **515**
- Bare catches: **0**
- Vague catch comments: **0**
- Files containing statement-free catches: **280**

## Compatibility debt

- Categorized occurrences: **559**
- Files with categorized occurrences: **218**
- Growth-ratcheted compatibility occurrences: **21** across **12** files
- Project migration: **1**
- External API compatibility: **4**
- Explicit compatibility boundaries: **16**
- Legacy runtime risk: **0**
- Unknown classifications: **0**

## Ownership topology

- Registered topology families: **42**
- Private owners: **248**
- Guarded private-owner import sites: **511**
- Identity facades: **132**
- Explicitly inventoried identity facades: **111**

## Test portfolio

- Classified test files: **1249**
- Unit/runtime files: **1240**
- Playwright E2E files: **9**
- Canonical contracts: **21**
- Historical architecture proof files: **0**
- Portfolio failures: **0**

## Policy

- This report is generated from the canonical audits; do not edit its counts by hand.
- Reductions in compatibility or statement-free catch debt must ratchet their owning policy in the same change so removed debt cannot return.
- A new modernization lane is justified only by a measured regression, duplicated ownership, a live compatibility seam, or an actively changed family with proven source-shape friction.
