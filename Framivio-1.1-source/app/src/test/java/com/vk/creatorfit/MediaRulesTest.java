package com.vk.creatorfit;
import org.junit.Test;
import static org.junit.Assert.*;
public class MediaRulesTest {
    @Test public void validSizes(){MediaRules.dimensions(1080,1920,true);MediaRules.dimensions(4096,4096,false);}
    @Test public void oddVideoRejected(){assertThrows(IllegalArgumentException.class,()->MediaRules.dimensions(1081,1920,true));}
    @Test public void sourceTraversalRejected(){assertFalse(MediaRules.safeId("../secret.jpg"));assertFalse(MediaRules.safeId("x.html"));assertTrue(MediaRules.safeId("ABC_123-xyz.mp4"));}
    @Test public void trimValidation(){MediaRules.trim(0,2000,2000);assertThrows(IllegalArgumentException.class,()->MediaRules.trim(3000,2000,5000));}
}
