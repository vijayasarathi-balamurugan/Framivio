import com.vk.creatorfit.MediaRules;
public class MediaRulesCheck {
    public static void main(String[] args){
        MediaRules.dimensions(1080,1920,true);
        MediaRules.dimensions(4096,4096,false);
        MediaRules.trim(0,2000,2000);
        if(MediaRules.safeId("../photo.jpg")||!MediaRules.safeId("valid-123.mp4"))throw new AssertionError("Path validation failed");
        try{MediaRules.dimensions(1081,1920,true);throw new AssertionError("Odd resolution accepted");}catch(IllegalArgumentException expected){}
        try{MediaRules.trim(100,50,1000);throw new AssertionError("Invalid trim accepted");}catch(IllegalArgumentException expected){}
        System.out.println("MediaRules Java checks passed (6 checks).");
    }
}
