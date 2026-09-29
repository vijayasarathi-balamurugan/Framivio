package com.vk.creatorfit;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.BitmapOverlay;
import androidx.media3.effect.OverlayEffect;
import androidx.media3.effect.Presentation;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.ProgressHolder;
import androidx.media3.transformer.Transformer;
import org.json.JSONObject;
import java.io.File;
import java.util.ArrayList;
import java.util.Collections;

@UnstableApi
final class VideoExporter {
    private final MainActivity activity;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private Transformer transformer;
    private File output;
    private Bitmap watermark;
    private boolean running;
    VideoExporter(MainActivity activity){this.activity=activity;}
    boolean isRunning(){return running;}
    void start(JSONObject options) throws Exception {
        if(running)throw new IllegalStateException("An export is already running.");
        int w=options.getInt("w"),h=options.getInt("h");MediaRules.dimensions(w,h,true);
        File input=activity.imported(options.getString("id"));
        long duration;
        MediaMetadataRetriever metadata=new MediaMetadataRetriever();
        try {metadata.setDataSource(input.getAbsolutePath());duration=Long.parseLong(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));}
        finally {metadata.release();}
        long start=options.getLong("startMs"),end=options.getLong("endMs");MediaRules.trim(start,end,duration);
        if(activity.getCacheDir().getUsableSpace()<input.length()*3+100L*1024*1024)throw new IllegalStateException("Free more device storage before exporting this video.");
        output=new File(activity.getCacheDir(),"video-"+java.util.UUID.randomUUID()+".mp4");
        MediaItem media=new MediaItem.Builder().setUri(Uri.fromFile(input)).setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder().setStartPositionMs(start).setEndPositionMs(Math.min(end,duration)).build()).build();
        ArrayList<Effect> effects=new ArrayList<>();
        effects.add(Presentation.createForWidthAndHeight(w,h,"crop".equals(options.optString("mode"))?Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP:Presentation.LAYOUT_SCALE_TO_FIT));
        JSONObject mark=options.optJSONObject("mark");
        if(mark!=null&&!mark.optString("text").isEmpty()) {
            watermark=drawWatermark(w,h,mark);
            effects.add(new OverlayEffect(Collections.singletonList(BitmapOverlay.createStaticBitmapOverlay(watermark))));
        }
        EditedMediaItem edited=new EditedMediaItem.Builder(media).setRemoveAudio(options.optBoolean("mute")).setEffects(new Effects(Collections.emptyList(),effects)).build();
        transformer=new Transformer.Builder(activity).setVideoMimeType(MimeTypes.VIDEO_H264).setAudioMimeType(MimeTypes.AUDIO_AAC).addListener(new Transformer.Listener(){
            @Override public void onCompleted(Composition composition,ExportResult result){
                File completed=output;output=null;stopResources();
                if(completed==null||!completed.isFile()||completed.length()==0){activity.error("The device returned an empty video.");return;}
                // Hardware encoders may fall back to a supported resolution: inspect actual output.
                int actualW=w,actualH=h;
                MediaMetadataRetriever check=new MediaMetadataRetriever();
                try {check.setDataSource(completed.getAbsolutePath());actualW=Integer.parseInt(check.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));actualH=Integer.parseInt(check.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));String r=check.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);if("90".equals(r)||"270".equals(r)){int t=actualW;actualW=actualH;actualH=t;}}
                catch(Exception ignored) { }
                finally {try{check.release();}catch(Exception ignored){}}
                if(actualW!=w||actualH!=h)activity.notifyUser("Your encoder used "+actualW+" × "+actualH+" instead of the requested size.");
                activity.videoCompleted(completed,actualW,actualH);
            }
            @Override public void onError(Composition composition,ExportResult result,ExportException error){cleanupOutput();stopResources();activity.error("Video export failed on this device ("+error.getErrorCodeName()+"). Try a smaller canvas or a different clip.");}
        }).build();
        running=true;activity.keepAwake(true);
        try {transformer.start(edited,output.getAbsolutePath());poll();}
        catch(Exception e){cleanupOutput();stopResources();throw e;}
    }
    private void poll(){if(!running||transformer==null)return;ProgressHolder progress=new ProgressHolder();int status=transformer.getProgress(progress);activity.event("progress",MainActivity.json("percent",status==Transformer.PROGRESS_STATE_AVAILABLE?progress.progress:JSONObject.NULL,"message","Rendering on your device. Keep Framivio open."));handler.postDelayed(this::poll,400);}
    private Bitmap drawWatermark(int w,int h,JSONObject mark){
        Bitmap b=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(b);
        Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);p.setTypeface(android.graphics.Typeface.create("sans-serif",android.graphics.Typeface.BOLD));
        float font=(float)(Math.min(w,h)*Math.max(2,Math.min(10,mark.optDouble("size",4)))/100.0);p.setTextSize(font);
        String text=mark.optString("text");if(text.length()>60)text=text.substring(0,60);
        if(p.measureText(text)>w*.9f){font*=w*.9f/p.measureText(text);p.setTextSize(font);}
        try{p.setColor(Color.parseColor(mark.optString("color","#ffffff")));}catch(Exception e){p.setColor(Color.WHITE);}
        p.setAlpha((int)(255*Math.max(.2,Math.min(1,mark.optDouble("opacity",.9)))));
        p.setShadowLayer(Math.max(1,font/8),0,1,0x99000000);
        android.graphics.Rect bounds=new android.graphics.Rect();p.getTextBounds(text,0,text.length(),bounds);
        float tw=p.measureText(text),th=bounds.height(),pad=Math.min(w,h)*.04f,cx=w/2f,cy=h/2f;
        String pos=mark.optString("position","br");
        if("manual".equals(pos)){cx=(float)(Math.max(0,Math.min(1,mark.optDouble("x",.5)))*w);cy=(float)(Math.max(0,Math.min(1,mark.optDouble("y",.5)))*h);}
        else if(!"center".equals(pos)){cx=pos.endsWith("l")?pad+tw/2:w-pad-tw/2;cy=pos.startsWith("t")?pad+th/2:h-pad-th/2;}
        cx=Math.max(tw/2,Math.min(w-tw/2,cx));cy=Math.max(th/2,Math.min(h-th/2,cy));
        p.setTextAlign(Paint.Align.LEFT);canvas.drawText(text,cx-tw/2,cy-th/2-bounds.top,p);return b;
    }
    void cancel(){if(!running)return;if(transformer!=null)transformer.cancel();cleanupOutput();stopResources();activity.event("cancelled",MainActivity.json());}
    private void cleanupOutput(){if(output!=null){output.delete();output=null;}}
    private void stopResources(){running=false;handler.removeCallbacksAndMessages(null);activity.keepAwake(false);transformer=null;if(watermark!=null){watermark.recycle();watermark=null;}}
    void release(){if(transformer!=null)transformer.cancel();cleanupOutput();stopResources();}
}
