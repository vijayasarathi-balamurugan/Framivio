# Framivio Core validation patch

This patch hardens input validation while preserving the current public API and the existing 100 ms end-of-video encoder tolerance.

## Changes
- Validate that trim duration is finite and positive in JavaScript.
- Reject trim ranges whose start is at/after the duration, whose end exceeds the existing 100 ms tolerance, or whose rounded millisecond range is empty.
- Mirror the duration/start/end checks in Java and avoid overflow in the 100 ms tolerance comparison.
- Validate placement mode and reject non-finite coordinates/zoom.
- Accept only the documented watermark anchors (`center`, `manual`, `top-left`, `top-right`, `bottom-left`, `bottom-right`); reject unknown or null positions.
- Add regression tests for the cases above.

## Apply
Copy the files under `src/` and `tests/` into the matching paths in `framivio-core/`. Review the diff, run `npm test`, then run the Java compile/check commands from the project's README before committing.
