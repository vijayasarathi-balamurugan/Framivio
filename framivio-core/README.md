# Framivio Core

[![Framivio Core CI](https://github.com/vijayasarathi-balamurugan/Framivio/actions/workflows/framivio-core-ci.yml/badge.svg)](https://github.com/vijayasarathi-balamurugan/Framivio/actions/workflows/framivio-core-ci.yml)

A small, platform-independent library extracted from the Framivio Android app. It contains reusable photo/video framing geometry, starter aspect-ratio presets, trim validation, export-name cleanup, watermark anchor calculations, and Java media-limit checks.

> **Scope:** This repository folder contains the reusable core only. It does not contain the Framivio Android application, UI, monetization, billing, ads, store assets, or release signing configuration. It is not a complete photo/video editor and does not encode media files.

## What's included

- `src/js/fit-core.js` — pure JavaScript geometry and framing helpers; usable in browsers and Node.js.
- `src/java/com/framivio/core/MediaRules.java` — Android-independent Java validation helpers.
- `tests/js/` — Node.js regression tests.
- `tests/java/` — Java smoke tests.

## Requirements

- Node.js 18 or later (CI currently uses Node.js 20).
- JDK 17 or later.

## Installation

Clone the repository and move into the core directory:

```sh
git clone https://github.com/vijayasarathi-balamurugan/Framivio.git
cd Framivio/framivio-core
```

The core currently has no third-party npm dependencies and is consumed from source. It has not been published to the npm registry, so use the local source path rather than `npm install framivio-core`.

## JavaScript usage

From the `framivio-core` directory:

```js
const FitCore = require('./src/js/fit-core.js');

// Validate output dimensions.
const output = FitCore.size(1080, 1920, false);

// Calculate fit/crop placement inside the output frame.
const placement = FitCore.placement(1920, 1080, output.w, output.h, 'fit');

// Validate a trim range (seconds in, milliseconds out).
const trim = FitCore.trim(1.25, 4.5, 10);

// Calculate a watermark anchor.
const watermark = FitCore.markCenter('bottom-right');

console.log({ output, placement, trim, watermark });
```

The JavaScript module exports:

- `PRESETS` — starter aspect-ratio presets.
- `clamp(value, min, max)` — clamp a number to a range.
- `size(width, height, video?)` — validate output dimensions.
- `placement(sourceWidth, sourceHeight, width, height, mode?, x?, y?, zoom?)` — calculate fit/crop geometry.
- `cleanName(name)` — create a filesystem-friendly export name.
- `trim(startSeconds, endSeconds, durationSeconds)` — validate and convert a trim range to milliseconds.
- `markCenter(position, x?, y?)` — calculate a supported watermark anchor.

## Java usage

The Java helper is platform-independent and has no Android SDK dependency:

```java
import com.framivio.core.MediaRules;

MediaRules.dimensions(1920, 1080, true);
MediaRules.trim(1000, 5000, 10000);
boolean valid = MediaRules.safeId("export_01.mp4");
```

## Run tests locally

Run the JavaScript regression tests:

```sh
npm test
```

Compile and run the Java smoke tests:

```sh
mkdir -p build/java
javac -Xlint:all -d build/java src/java/com/framivio/core/MediaRules.java tests/java/MediaRulesCheck.java
java -cp build/java MediaRulesCheck
```

The dedicated **Framivio Core CI** workflow runs both test suites on pushes and pull requests that change `framivio-core/`, and can also be started manually from the GitHub Actions tab. The separate Android APK build workflow is unchanged.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).

The preset data refers to third-party platforms (for example Instagram, YouTube, TikTok, Facebook, LinkedIn, X, WhatsApp, and Pinterest) for descriptive compatibility only. Their names and marks belong to their respective owners; no endorsement or affiliation is implied. This project does not include third-party logos.

## Relationship to Framivio

This is a separate open-source core extracted from Framivio. The full Framivio app remains a separate project. Contributions here should improve generic framing and validation utilities rather than reproduce private app features.
