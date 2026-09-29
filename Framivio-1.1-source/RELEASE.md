# Release checklist — not yet completed

This source package is **not ready for direct Play Store production upload**. These are required owner/configuration and verification steps, not optional polish.

## 1. Build and device acceptance

- [ ] For version 1.1, test preset close X and saved thumbnails, drag watermark on phone, all quality settings, multipage PDF Downloads save/open/share, and Edit again without modifying the older file.

- [ ] Run the provided CI: renderer tests, actual browser UI tests, Android unit tests, Android lint and debug compilation.
- [ ] Install the generated APK on physical Android phones (including a lower-memory device and Android 16).
- [ ] Confirm the launcher icon, splash, system bars, keyboard behavior, dark mode and font-size accessibility.
- [ ] Import portrait/landscape/EXIF-rotated JPG, transparent PNG, WebP, HEIC if supported, and files from multiple picker providers.
- [ ] Test fit/crop corners, drag positioning, rotate/flip, transparent export, every watermark position, quality differences and actual output pixel dimensions.
- [ ] Confirm gallery saves and share grants work, original files remain unchanged, and deleting the app copy does not delete gallery media.
- [ ] Verify metadata with an EXIF inspector using an actual geotagged source.
- [ ] Batch export 12 different photos; cancel partway through; check completed/remaining counts and low-space failures.
- [ ] Export real H.264 and HEVC video inputs, portrait rotation, audio/mute, short trim ranges and every supported output shape.
- [ ] Test HDR and unsupported input behavior; never claim all codecs work. Check actual output dimensions after hardware fallback.
- [ ] Cancel video; put app in background; rotate device; kill/reopen app; confirm temporary files and UI state are safe.
- [ ] Test offline launch/edit/export with airplane mode; no media network requests should occur.
- [ ] Test at Android large font/display sizes and with TalkBack. Browser viewport tests are not accessibility certification.
- [ ] Run Play pre-launch report and resolve crashes/accessibility/security findings.

## 2. Your account-owned release configuration

The following values are read from environment variables or an uncommitted `release.properties`. **Do not share signing passwords in chat or commit them to GitHub.** Keep secure backups of your upload key.

| Setting | Where it comes from | GitHub storage |
| --- | --- | --- |
| `UPLOAD_KEY_BASE64` | Base64 encoding of your upload keystore, for CI only | Actions secret |
| `KEYSTORE_PASSWORD` | Your upload keystore password | Actions secret |
| `KEY_ALIAS` | Alias of your upload key | Actions secret |
| `KEY_PASSWORD` | Password of that key | Actions secret |
| `APPLICATION_ID` | Final unique ID; default is `com.vk.creatorfit` | Actions variable |
| `SUPPORT_EMAIL` | Your real public support address | Actions variable |
| `PRIVACY_URL` | Your published HTTPS privacy-policy page | Actions variable |
| `MONETIZATION_ENABLED` | Set exactly `true` only after Google services are configured | Actions variable |
| `ADMOB_APP_ID` | Your AdMob application ID | Actions variable |
| `ADMOB_INTERSTITIAL_ID` | Your real interstitial ad unit | Actions variable |
| `BILLING_PUBLIC_KEY` | Play Console licensing/public purchase verification key | Actions secret (not a signing private key) |
| `PRO_PRODUCT_ID` | Activated one-time product; default `creatorfit_pro_lifetime` | Actions variable |

For local signed builds, also supply `KEYSTORE_PATH`. CI sets it after decoding your keystore into its temporary directory.

`release.properties.example` shows the names, not usable credentials. Fill in a private copy named `release.properties`; it is excluded by `.gitignore`. The exact same source can build a non-monetized release with `MONETIZATION_ENABLED=false`, but that release earns nothing from ads or Pro.

## 3. Monetization acceptance

- [ ] Create/verify AdMob app and ad unit. Complete its setup/review and publish the required app-ads.txt on your declared developer website.
- [ ] Configure and publish regional privacy messages in Google UMP/AdMob. Test consent required/not required, consent rejection, privacy options and offline startup.
- [ ] Create the Pro product as a **one-time buy**, not a rental or subscription. Set country availability and localized prices in Play Console.
- [ ] Use Play license testers and an internal-test installation with the correct application ID. A `.debug` sideload is not proof that release billing works.
- [ ] Verify successful, pending, cancelled, duplicate, restored and refunded purchases. Confirm purchase acknowledgement completes.
- [ ] Confirm a purchased user sees no ads, and that free users retain offline single-photo and video editing.
- [ ] Verify frequency: at most one post-export interstitial every four successful export actions, and at least three minutes between displays within a session. Ads must not appear during editing/export.
- [ ] Review actual SDK data disclosures. Do not select “no data collected” merely because your own media pipeline is offline.

There are no rewarded ads, subscriptions or revenue estimates in this version. No revenue is guaranteed.

## 4. Store publication

- [ ] Confirm Framivio name/branding and application-ID availability; this handoff has not performed trademark clearance.
- [ ] Finish the privacy template with your owner identity and support contact; publish it and set `PRIVACY_URL`.
- [ ] Capture real on-device screenshots. A 512px Play icon and 1024×500 feature graphic are included in `store/graphics/`; review them before use. They are original graphics, not claimed app screenshots.
- [ ] Adapt `store/LISTING.md` after actual tests; omit anything not verified on supported devices.
- [ ] Complete content rating, target audience, ads declaration, Data safety, app access and country distribution. “Worldwide” means the supported countries you enable in Play, not guaranteed access in every jurisdiction/device.
- [ ] Meet any account-specific testing/production-access requirements shown by Play Console.
- [ ] Actions → Framivio Android → Run workflow → check the signed-release option. Download the `Framivio-play-store-aab` artifact only after every job passes.
- [ ] Upload the signed `.aab` to an internal/closed track first, then seek production approval.

## Technical references used during implementation

- [Media3 Transformer setup and export lifecycle](https://developer.android.com/media/media3/transformer/getting-started)
- [Media3 Presentation framing](https://developer.android.com/reference/androidx/media3/effect/Presentation)
- [Media3 bitmap overlays](https://developer.android.com/reference/androidx/media3/effect/BitmapOverlay)
- [Play Billing integration](https://developer.android.com/google/play/billing/integrate)
- [Google UMP consent setup](https://developers.google.com/admob/android/privacy)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)

The project targets API 36. Store rules and dependency requirements can change; check the console and documentation before release. Dependency API type compatibility still requires the Android build to run.
