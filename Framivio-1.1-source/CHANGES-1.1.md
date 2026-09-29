# Framivio 1.1.0

Requested changes implemented in source and bundled preview:

- Save-preset dialog has its own accessible close X; closing it discards the unsaved fields.
- The Presets screen renders the selected photo/video poster in each preset's aspect ratio. Newly saved custom presets retain a small preview on device; older presets show their placeholder until a photo is selected.
- Drag watermark text on the preview with a mouse or touch. When the Watermark tab is open, tapping an empty position also places the watermark there. Photo movement remains separate. Coordinates scale with export size; Android video export uses the same normalized custom position.
- Quality is explicitly High 100%, Medium 80%, Small 60%. These are encoder quality settings, not promised file-size reduction percentages. PNG is lossless and disables this control.
- PDF export creates A4 portrait pages, fits the canvas width without stretching, and continues long images across pages with no missing source rows. It asks compatible readers for continuous single-column layout; actual scrolling controls belong to the PDF viewer. Transparent areas become white. PDF is a raster image document, not searchable/OCR text.
- Android PDFs save to Downloads/Framivio and app Exports, with Open PDF and Share actions. Browser preview downloads the PDF.
- Saved image entries have Edit again. They open as a new flattened-image edit, with old edit controls reset; a later export creates a separate new file. Previous baked-in text/background cannot be separated back into editable layers.
- Android versionCode 2 / versionName 1.1.0.

Verification: 32 local JavaScript/renderer/static tests pass, 6 Java-only checks pass, all Android Java files parse. The production PDF writer generated a three-page test PDF, opened successfully in Poppler, and all three rendered pages were visually inspected.

Browser gesture tests are also included for CI. Actual browser execution and Android build/device verification remain unavailable in the current environment. This is an updated source handoff, not an APK or a certified release build.
