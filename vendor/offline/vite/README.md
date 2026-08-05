# Offline Vite build archives

This directory is populated from the lock-derived `vite-build` profile for Linux x64 with glibc. It contains
Vite, `@vitejs/plugin-react`, their required JavaScript dependencies, and only the matching native Rolldown
and Lightning CSS bindings.

Print the official download URLs and exact destination filenames without downloading anything:

```bash
npm run vendor:offline:vite-build:downloads
```

After placing every untouched `.tgz` file here, validate and adopt them atomically:

```bash
npm run vendor:offline:vite-build:adopt
npm run vendor:offline:vite-build:check
```

The generated plan is synchronized separately from the archives:

```bash
npm run vendor:offline:vite-build:plan
npm run vendor:offline:vite-build:check-plan
```

Do not add macOS, Windows, ARM, musl, `fsevents`, or WASI fallback packages to this directory.
