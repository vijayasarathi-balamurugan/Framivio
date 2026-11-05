import com.framivio.core.MediaRules;

public final class MediaRulesCheck {
    private static void expectRejected(Runnable action, String message) {
        try {
            action.run();
            throw new AssertionError(message);
        } catch (IllegalArgumentException expected) {
            // Expected validation failure.
        }
    }

    public static void main(String[] args) {
        MediaRules.dimensions(1080, 1920, false);
        MediaRules.dimensions(1920, 1080, true);
        MediaRules.trim(1000, 5000, 10000);
        MediaRules.trim(9950, 10050, 10000); // tolerated 100 ms encoder overrun
        if (!MediaRules.safeId("export_01.mp4")) throw new AssertionError("Expected safe ID");
        if (MediaRules.safeId("../secret.mp4")) throw new AssertionError("Unsafe ID accepted");
        expectRejected(() -> MediaRules.dimensions(1081, 1920, true), "Invalid video dimensions accepted");
        expectRejected(() -> MediaRules.trim(0, 100, 0), "Zero duration accepted");
        expectRejected(() -> MediaRules.trim(10001, 10050, 10000), "Start after duration accepted");
        expectRejected(() -> MediaRules.trim(100, 10201, 10000), "Excessive end overrun accepted");
        System.out.println("MediaRules checks passed");
    }
}
