# Offline ESLint strict-JS profile

This directory stores the untouched npm tarballs required by the repository's
`lint:js:strict` command on Linux x64 glibc.

The complete dependency closure is generated from `package-lock.json`; do not
maintain package names or versions manually. Print the exact official npm URLs
and destination paths with:

```bash
npm run vendor:offline:packages:downloads
```

After placing the missing archives in this directory, adopt and verify the
complete standard offline package set with:

```bash
npm run vendor:offline:packages:adopt
npm run vendor:offline:packages:check
```

The focused `vendor:offline:eslint-js-strict:*` commands are available for
maintenance, but the normal refresh command already includes this profile.

Some DefinitelyTyped tarballs use a package-specific top-level directory
instead of the usual `package/` directory. The verifier and installer support
both layouts while still requiring a single safe root and matching lockfile
integrity/name/version metadata. Successfully verified downloads are cached
immediately, so rerunning `vendor:offline:packages:refresh` resumes after the
last completed archive instead of restarting the entire ESLint closure.
