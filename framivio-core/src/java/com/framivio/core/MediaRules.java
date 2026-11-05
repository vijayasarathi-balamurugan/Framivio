package com.framivio.core;

/** Platform-independent media dimension, trim, and export-name validation. */
public final class MediaRules {
    private MediaRules() {}

    public static void dimensions(int width, int height, boolean video) {
        if (width < 64 || height < 64 || width > 4096 || height > 4096)
            throw new IllegalArgumentException("Use dimensions between 64 and 4096 pixels.");
        if (video && (width > 1920 || height > 1920 || width % 2 != 0 || height % 2 != 0))
            throw new IllegalArgumentException("Video sizes must be even and no larger than 1920 px per side.");
    }

    public static void trim(long startMs, long endMs, long durationMs) {
        if (durationMs <= 0 || startMs < 0 || startMs >= durationMs || endMs <= startMs) {
            throw new IllegalArgumentException("Invalid trim range.");
        }
        // Preserve the existing 100 ms encoder-tolerance policy without risking overflow.
        if (endMs > durationMs && endMs - durationMs > 100) {
            throw new IllegalArgumentException("Invalid trim range.");
        }
    }

    public static boolean safeId(String id) {
        return id != null && id.matches("[a-zA-Z0-9_-]{1,80}\\.(jpg|png|webp|mp4|source|pdf)");
    }
}
