# Verification record

## 1.1 update

32 JavaScript tests and 6 compiled Java-only checks pass. Added custom watermark coordinates and pointer-drag behavior checks, quality-label alignment, dialog close wiring, PDF binary/page coverage, and re-edit wiring. A production-generated 3-page PDF was opened with Poppler and all rendered pages were visually inspected. Browser and Android runtime tests remain blocked as below.

The original handoff checks are recorded below. See CHANGES-1.1.md for update details.

Recorded during this source handoff, 15 September 2026.

## Passed locally

- JavaScript syntax checks (`node --check`) for production `core.js` and `app.js`.
- **18 automated geometry/rendering tests**, using the actual production rendering functions with a Skia-backed Canvas implementation. Coverage: preset validity, dimension and trim rejection, filename handling, fit/crop positions, 10,000 generated geometry combinations, solid background pixels, transparent pixels, rotation/flip, blurred fill, text watermark, before/after behavior, and actual PNG/JPEG/WebP encoding/dimensions/no EXIF.
- **6 Java-only rule checks**, compiling and running `MediaRules` via the locally installed JDK compiler module (the `javac` command itself was absent).
- **5 static checks** for unique HTML IDs/JS selectors, offline asset references, narrow permissions, release signing gates and exact standalone-preview script parity/syntax. Total JavaScript tests: **23**.
- All five Android XML files parse successfully. Store icon/feature graphic generated from original vector artwork; the feature graphic was visually inspected. This is not visual QA of the app UI.
- Syntax parsing of the five Java source files present at that stage. This is **not Android API type checking**, DEX compilation or a runtime test.
- The single-file `PREVIEW.html` is generated from production assets rather than maintained as a separate mockup.

The rendering tests found and fixed a partially transparent blurred-background edge. Geometry tests also caught negative-zero coordinates, now normalized.

## Not run / blocked

| Check | Status and reason |
| --- | --- |
| Android compilation, dependency resolution, lint, APK/AAB | Not run. Android SDK and Gradle unavailable; SDK network request timed out. |
| Browser UI execution / screenshots | Not run. Playwright package exists but Chromium executable is absent. |
| On-phone UI / gallery / picker / sharing | Not run. No Android device or emulator available. |
| Media3 video export | Not run on hardware or emulator. Native code is provided, not certified working. |
| Real billing, purchase signature/acknowledgement/restore | Not run. No configured Play account/product/key or license-test installation. |
| Ad loading, consent forms, privacy options | Not run. No owner AdMob configuration or device execution. |
| Play Store upload / production approval | Not attempted. No signed release artifact exists. |

`tests/ui.test.cjs` is an authored but **unexecuted** browser suite. It checks navigation, search, custom presets, fit/crop pixels, exports, persistence, removal and horizontal overflow at five widths. The GitHub workflow runs it before the Android build and uploads screenshots if it gets that far.

Skia Canvas tests support the rendering logic, but they do not prove Android WebView behavior, interactions, accessibility or device performance. The UI has not had visual QA in an actual browser here.

## Delivery status

**Source implementation with partial automated verification. Not a completed, upload-ready release.**

See `RELEASE.md` for the exact remaining owner configuration and acceptance tests. Do not mistake the ZIP, HTML preview, or test pass count for an APK/AAB or a full-system test.
