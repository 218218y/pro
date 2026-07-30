# Offline TSX archive

Download the exact lockfile-pinned TSX package without extracting or renaming it:

```text
https://registry.npmjs.org/tsx/-/tsx-4.23.1.tgz
```

Save it exactly as:

```text
vendor/offline/tsx/tsx-4.23.1.tgz
```

TSX uses the already-vendored `esbuild 0.28.1` common package and current-platform native binary. No separate
`fsevents` archive is needed on Linux or Windows; it is an optional macOS dependency and is deliberately not
part of this focused offline slice.
