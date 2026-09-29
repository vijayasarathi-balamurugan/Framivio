# Framivio 1.1 · Android source handoff

See `CHANGES-1.1.md` for the updated preset thumbnails, close control, draggable watermark, quality labels, multipage PDF export and Edit again.

An offline-first photo and video reframing app, with a warm ivory / charcoal / coral interface. Built for Android 10+ using Java, a bundled local HTML Canvas editor, and native Media3 video export. This is not a remotely hosted website, and it does not need a media server.

## Read this first

**This package is source code, not a tested release APK or upload-ready AAB.** Android compilation, device execution, Google billing and ads have not been verified in the authoring environment. The Android SDK and Gradle were unavailable; the SDK download timed out. A local browser executable was also unavailable. See `VERIFICATION.md` for the precise checks that did run.

Do not publish to production before the workflow and device acceptance tests pass. The release build deliberately fails if your upload signing key, support contact or published privacy URL is missing. Monetized releases also require your own real advertising IDs and billing public key. None of those values are invented or embedded in this package.

## Quick start — without installing tools on your laptop

1. Create an empty GitHub repository for Framivio (or use an explicitly chosen empty repository).
2. Extract this ZIP. Upload its **contents** to the repository root. At the same root level there must be `settings.gradle`, `build.gradle`, `app/`, `package.json`, and `.github/workflows/android.yml`. Do not nest everything inside another `creatorfit/` folder. Mac Finder may hide `.github`; make sure it is included.
3. Open **Actions → Framivio Android**. A push to `main` or `master` runs the workflow. You can also use **Run workflow**, leaving the release box unchecked.
4. Editor tests must pass, then Android unit tests/lint/build run. Download the `Framivio-debug-apk` artifact when all checks pass. The artifact is a ZIP containing the APK.
5. Install the debug APK on a **personal** Android 10+ phone. The debug application ID ends in `.debug`; it is separate from the eventual store installation.
6. Complete the checklist in `RELEASE.md` before making a signed Play Store bundle.

The CI workflow is provided, not run or pushed to GitHub by this handoff. The account owner must supply their own repository and release configuration. No existing repository was changed.

## Preview the real interface locally

Open `PREVIEW.html` in a current desktop browser. It is bundled from the same production HTML/CSS/JavaScript as the Android UI, not a different mockup.

- Photo import and local photo download are implemented in the browser preview.
- Video conversion, Android gallery save/share, Play billing and ads require the Android build; the preview never fakes them.
- Browser exports are session-only. Settings/custom presets use browser local storage. Native Android exports persist in app storage and the gallery.
- Multiple browser downloads may require allowing multiple files in your browser.

The local preview has not been visually inspected in a running browser in this environment. A Playwright suite is included to capture screenshots and check it in CI.

## Implemented feature scope

| Area | Implementation |
| --- | --- |
| Photo import | System file picker, up to 12 selected files, orientation-aware native image decoding |
| Photo limits | Imports downsample to at most 4096 px on the long edge and 12 MP for memory; 64–4096 px output |
| Canvas presets | 12 starter formats for Instagram, YouTube, TikTok, Facebook, LinkedIn, X, WhatsApp, Pinterest and square |
| Preset management | Search, favorites, up to 30 named custom presets stored on device |
| Photo framing | Fit, fill/crop, drag position, horizontal/vertical sliders, zoom, rotate, flip |
| Photo background | Blurred image, selected color, transparent PNG/WebP |
| Text watermark | User text, five positions plus manual drag, size, color, opacity; no forced Framivio watermark |
| Safe zones | Approximate preview guides; never drawn into the output |
| Photo export | JPG, PNG, WebP and multipage PDF; High 100% / Medium 80% / Small 60%; JPG automatically switches to PNG for a transparent canvas |
| Metadata | Re-encoded photo output does not copy source EXIF/GPS; it does not redact visible private information |
| Batch | Sequential photo export using the same settings; cancel stops before the next file, completed saves remain |
| Video | One source, up to 512 MB and 10 minutes; native MP4/H.264 export, fit/crop, trim, mute, text watermark |
| Video limits | Even output dimensions up to 1920 px per side; black fit background; centered crop |
| Video preview | Poster shows framing/watermark; play opens original in an installed video player; not an edited-video live preview |
| Android exports | MediaStore gallery save plus app-local export history; shares through a scoped FileProvider |
| PDF | A4 multipage image document; width fit; continuous-column hint; Downloads/Framivio save |
| Edit again | Reopen saved images as new flattened-image edits; originals preserved |
| Deletion | Removes the app copy only; the independent gallery copy stays |
| Interface | Studio, Presets, Exports, Settings; dark theme; reduced motion; adaptive icon and animated in-app splash |
| Monetization integration | Optional UMP consent, low-frequency post-export AdMob interstitial, one-time Play Pro purchase/restore |

**Not implemented:** automatic face/text-aware cropping, AI editing, photo logo-image overlays, video blurred/colored backgrounds, manual video crop position, background video export, batch video conversion, multi-language translations, user accounts, cloud sync, subscriptions or rewarded ads. Text watermark is supported. All these distinctions are reflected in the UI; no fake AI controls or purchase-success dialogs are included.

Some features from the initial broad proposal are therefore not in this handoff. In particular, automatic subject detection and rewarded ads were not implemented, and this package cannot satisfy a promise of a complete, no-changes-needed store release.

## Project layout

```text
settings.gradle                 Android project root
app/build.gradle                Android configuration + release gates
app/src/main/java/...           Native picker, storage, video, billing/ads
app/src/main/assets/            Production local editor UI and renderer
app/src/main/res/               Theme, adaptive launcher icon, sharing paths
.github/workflows/android.yml   Editor tests → Android tests/lint/APK/AAB
tests/                          Geometry, rendering, Java, browser tests
PREVIEW.html                    Self-contained local UI preview
RELEASE.md                      Signing and store acceptance checklist
VERIFICATION.md                 Honest test status and limitations
store/                          Draft listing and privacy-policy template
```

## Developer commands

Android tooling: JDK 17, Gradle 8.13, SDK platform 36 and build tools 36.0.0. Dependencies download from Google Maven/Maven Central on the first build. No Gradle wrapper binary is supplied; CI explicitly installs the pinned Gradle version.

```sh
gradle testDebugUnitTest lintDebug assembleDebug
npm install
npm test
npx playwright install chromium
npm run test:ui
npm run preview:bundle
```

For Java-only limit checks, without the Android SDK:

```sh
javac -d /tmp/creatorfit-java-check app/src/main/java/com/vk/creatorfit/MediaRules.java tests/MediaRulesCheck.java
java -cp /tmp/creatorfit-java-check MediaRulesCheck
java tests/ParseJava.java
```

Use only devices and development environments where you have permission to build/install apps. You do not need to bypass any office-device policy to use the GitHub workflow.

## Privacy architecture and trade-offs

The privileged Android WebView serves only bundled assets and app-selected local images over `appassets.androidplatform.net`. External navigation is blocked. File access is disabled. A restrictive content security policy limits scripts to packaged files. Source files are selected using the Android file picker; there are no broad media-library permissions. Release backups are disabled.

Internet permission is for optional Google monetization services, not media uploads. No own backend, accounts or analytics service is implemented. Ads/payment providers are still external services; “no server to operate” does not mean “no online services.” A privacy-policy page and, for AdMob, app-ads.txt hosting may still be needed.

Local signature verification plus Play purchase queries supports offline Pro access. It cannot provide the anti-tamper or immediate refund/revocation guarantees of a backend. Refunds are reflected on a later successful Play query. Purchases require real licensed-account testing before launch.

Media codecs, HDR inputs, encoder resolution fallback, large images, free space and backgrounding behavior depend on the phone. Export may increase file size; this is a resizer, not a guaranteed compressor.
