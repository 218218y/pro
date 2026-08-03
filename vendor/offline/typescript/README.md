# Offline TypeScript archives

TypeScript 7 uses a common launcher package plus the matching Linux x64 native compiler package.
`package-lock.json` owns both exact versions, URLs, and integrity values.

Print the required official URLs and destination paths with:

```bash
node tools/wp_refresh_offline_npm_vendor.mjs --component typescript --print-downloads
```

Synchronize automatically, or adopt files downloaded manually:

```bash
node tools/wp_refresh_offline_npm_vendor.mjs --component typescript
node tools/wp_refresh_offline_npm_vendor.mjs --component typescript --adopt-existing
node tools/wp_refresh_offline_npm_vendor.mjs --component typescript --check
```

The synchronizer enforces aligned package versions, verifies both archives and the native `lib/tsc` layout,
and updates the manifest atomically.
