# Framivio Core

A small, platform-independent library extracted from the Framivio Android app. It contains reusable photo/video framing geometry, starter aspect-ratio presets, trim validation, export-name cleanup, watermark anchor calculations, and Java media-limit checks.

> **Scope:** This repository is the reusable core only. It does not contain the Framivio Android application, UI, monetization, billing, ads, store assets, or release signing configuration. It is not a complete photo/video editor and does not encode media files.

## What's included

- `src/js/fit-core.js` — pure JavaScript geometry and framing helpers; usable in browsers and Node.js.
- `src/java/com/framivio/core/MediaRules.java` — Android-independent Java validation helpers.
- `tests/` — Node.js and Java smoke tests.

## JavaScript usage

```js
const FitCore = require('./src/js/fit-core.js');

const output = FitCore.size(1080, 1920, false);
const placement = FitCore.placement(1920, 1080, output.w, output.h, 'fit');
console.log(placement);
```

The JavaScript module also exports `PRESETS`, `clamp`, `size`, `placement`, `cleanName`, `trim`, and `markCenter`.

## Run tests

Requires Node.js 18 or later and JDK 17 or later.

```sh
npm test
mkdir -p build/java
javac -d build/java src/java/com/framivio/core/MediaRules.java tests/java/MediaRulesCheck.java
java -cp build/java MediaRulesCheck
```

GitHub Actions runs the JavaScript tests and Java checks on pushes and pull requests.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).

The preset data refers to third-party platforms (for example Instagram, YouTube, TikTok, Facebook, LinkedIn, X, WhatsApp, and Pinterest) for descriptive compatibility only. Their names and marks belong to their respective owners; no endorsement or affiliation is implied. This project does not include third-party logos.

## Relationship to Framivio

This is a separate open-source core extracted from Framivio. The full Framivio app remains a separate project. Contributions here should improve generic framing and validation utilities rather than reproduce private app features.
