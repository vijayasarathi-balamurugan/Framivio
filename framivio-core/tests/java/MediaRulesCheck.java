import com.framivio.core.MediaRules;

public final class MediaRulesCheck {
    public static void main(String[] args) {
        MediaRules.dimensions(1080, 1920, false);
        MediaRules.dimensions(1920, 1080, true);
        MediaRules.trim(1000, 5000, 10000);
        if (!MediaRules.safeId("export_01.mp4")) throw new AssertionError("Expected safe ID");
        if (MediaRules.safeId("../secret.mp4")) throw new AssertionError("Unsafe ID accepted");
        boolean rejected = false;
        try { MediaRules.dimensions(1081, 1920, true); }
        catch (IllegalArgumentException expected) { rejected = true; }
        if (!rejected) throw new AssertionError("Invalid video dimensions accepted");
        System.out.println("MediaRules checks passed");
    }
}
