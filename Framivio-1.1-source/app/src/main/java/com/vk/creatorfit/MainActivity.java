package com.vk.creatorfit;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.ImageDecoder;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.FileProvider;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@androidx.annotation.OptIn(markerClass = androidx.media3.common.util.UnstableApi.class)
public class MainActivity extends ComponentActivity {
    private static final int PICK = 40;
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private WebView web;
    private File imports, exports;
    private VideoExporter video;
    private Commerce commerce;
    private boolean destroyed, pageReady, pickingVideo;
    private final ArrayList<String> pendingEvents = new ArrayList<>();

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        imports = new File(getCacheDir(), "imports");
        exports = new File(getFilesDir(), "exports");
        imports.mkdirs(); exports.mkdirs();
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(247,245,240));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            androidx.core.graphics.Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            return insets;
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // All content in this privileged WebView is local. No external navigation.
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost())) return empty(403,"Forbidden");
                String path=uri.getPath();
                if (path!=null && (path.startsWith("/media/") || path.startsWith("/output/"))) {
                    String id=uri.getLastPathSegment();
                    if(!MediaRules.safeId(id)) return empty(404,"Not Found");
                    File file=new File(path.startsWith("/media/")?imports:exports,id);
                    try {
                        if(!file.isFile()) return empty(404,"Not Found");
                        return new WebResourceResponse(mime(id),null,new FileInputStream(file));
                    } catch(Exception e) { return empty(404,"Not Found"); }
                }
                WebResourceResponse response=loader.shouldInterceptRequest(uri);
                return response!=null?response:empty(404,"Not Found");
            }
            @Override public void onPageFinished(WebView view,String url) { /* JS ready establishes the bridge lifecycle. */ }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(),"Android");
        video = new VideoExporter(this);
        commerce = new Commerce(this);
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                web.evaluateJavascript("window.Framivio ? Framivio.back() : false", result -> {
                    if("false".equals(result)) finish();
                });
            }
        });
        web.loadUrl(ORIGIN+"/assets/index.html");
    }
    private static WebResourceResponse empty(int status,String reason) {
        return new WebResourceResponse("text/plain","utf-8",status,reason,java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
    }
    static String mime(String name) {
        if(name.endsWith(".pdf")) return "application/pdf";
        if(name.endsWith(".png")) return "image/png";
        if(name.endsWith(".webp")) return "image/webp";
        if(name.endsWith(".mp4")||name.endsWith(".source")) return "video/mp4";
        return "image/jpeg";
    }
    void event(String type,Object value) {
        final String script="window.Framivio && Framivio.onNative("+JSONObject.quote(type)+","+String.valueOf(value)+");";
        runOnUiThread(()->{if(destroyed)return;if(!pageReady){pendingEvents.add(script);return;}web.evaluateJavascript(script,null);});
    }
    static JSONObject json(Object... pairs) {
        JSONObject object=new JSONObject();
        try { for(int i=0;i<pairs.length;i+=2) object.put(String.valueOf(pairs[i]),pairs[i+1]); }
        catch(Exception ignored) { }
        return object;
    }
    void error(String message) { event("error",json("message",message)); }
    void notifyUser(String message) { event("toast",json("message",message)); }
    File imported(String id) {
        if(!MediaRules.safeId(id)) throw new IllegalArgumentException("Invalid source file.");
        File f=new File(imports,id);
        if(!f.isFile()) throw new IllegalArgumentException("Source is unavailable. Please select it again.");
        return f;
    }
    void keepAwake(boolean on) {
        if(on)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    private void pickMedia(String type) {
        if(video.isRunning())return;
        pickingVideo="video".equals(type);
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(pickingVideo?"video/*":"image/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,!pickingVideo);
        try { startActivityForResult(intent,PICK); }
        catch(Exception e) { error("No file picker is installed on this device."); }
    }
    @SuppressWarnings("deprecation")
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request!=PICK||result!=Activity.RESULT_OK||data==null)return;
        ArrayList<Uri> uris=new ArrayList<>();
        ClipData clips=data.getClipData();
        if(clips!=null) for(int i=0;i<Math.min(clips.getItemCount(),12);i++) uris.add(clips.getItemAt(i).getUri());
        else if(data.getData()!=null) uris.add(data.getData());
        final boolean asVideo=pickingVideo;
        notifyUser("Preparing media on your device…");
        io.execute(()->{
            JSONArray items=new JSONArray();
            String failed=null;
            for(Uri uri:uris) {
                try { items.put(importMedia(uri,asVideo)); }
                catch(Exception e) { failed=e.getMessage(); }
                catch(OutOfMemoryError e) { failed="This file needs more memory than your device has. Try a smaller file."; }
            }
            if(items.length()>0) event("media",items);
            if(failed!=null) notifyUser("Some media could not be imported: "+failed);
            if(items.length()==0) error("No media was imported. "+(failed==null?"Select another file.":failed));
        });
    }
    private JSONObject importMedia(Uri uri,boolean asVideo) throws Exception {
        if(!"content".equals(uri.getScheme()))throw new IllegalArgumentException("Select media using the system file picker.");
        if(cacheBytes()>1024L*1024*1024)throw new IllegalArgumentException("Import cache is full. Clear it in Settings first.");
        String name="media";
        try(android.database.Cursor cursor=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)) {
            if(cursor!=null&&cursor.moveToFirst())name=cursor.getString(0);
        }
        String id=UUID.randomUUID().toString();
        if(!asVideo) {
            Bitmap bitmap=ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(),uri),(decoder,info,source)->{
                decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                int w=info.getSize().getWidth(),h=info.getSize().getHeight();
                if(w<1||h<1||w>100000||h>100000)throw new IllegalArgumentException("Unsupported image dimensions.");
                double scale=Math.min(1,Math.min(4096.0/Math.max(w,h),Math.sqrt(12000000.0/((double)w*h))));
                decoder.setTargetSize(Math.max(1,(int)(w*scale)),Math.max(1,(int)(h*scale)));
            });
            String fileName=id+".png";
            File f=new File(imports,fileName);
            try {
                try(OutputStream out=new FileOutputStream(f)) { if(!bitmap.compress(Bitmap.CompressFormat.PNG,100,out))throw new IllegalArgumentException("Image decode failed."); }
                return json("id",fileName,"name",name,"type","photo","w",bitmap.getWidth(),"h",bitmap.getHeight(),"url",ORIGIN+"/media/"+fileName);
            } finally { bitmap.recycle(); }
        }
        String fileName=id+".source";
        File f=new File(imports,fileName),posterFile=new File(imports,id+".jpg");
        try {
            if(imports.getUsableSpace()<600L*1024*1024)throw new IllegalArgumentException("Free at least 600 MB of space to import video.");
            try(InputStream in=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(f)) {
                if(in==null)throw new IllegalArgumentException("Could not read this file.");
                byte[] buffer=new byte[65536];long total=0;int read;
                while((read=in.read(buffer))!=-1) { total+=read;if(total>512L*1024*1024)throw new IllegalArgumentException("Choose a video smaller than 512 MB.");out.write(buffer,0,read); }
            }
            MediaMetadataRetriever retriever=new MediaMetadataRetriever();
            try {
                retriever.setDataSource(f.getAbsolutePath());
                int w=Integer.parseInt(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));
                int h=Integer.parseInt(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
                long duration=Long.parseLong(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));
                if(duration<=0||duration>600000)throw new IllegalArgumentException("Choose a video up to 10 minutes long.");
                String rotation=retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);
                if("90".equals(rotation)||"270".equals(rotation)){int t=w;w=h;h=t;}
                Bitmap poster=retriever.getScaledFrameAtTime(0,MediaMetadataRetriever.OPTION_CLOSEST_SYNC,Math.max(2,(int)(w*Math.min(1,900.0/Math.max(w,h)))),Math.max(2,(int)(h*Math.min(1,900.0/Math.max(w,h)))));
                if(poster==null)throw new IllegalArgumentException("This device cannot read that video's codec.");
                try(OutputStream out=new FileOutputStream(posterFile)){poster.compress(Bitmap.CompressFormat.JPEG,90,out);}finally{poster.recycle();}
                return json("id",fileName,"name",name,"type","video","w",w,"h",h,"duration",duration/1000.0,"poster",ORIGIN+"/media/"+id+".jpg");
            } finally { retriever.release(); }
        } catch(Exception e) { f.delete();posterFile.delete();throw e; }
    }
    private long cacheBytes(){long total=0;File[] files=imports.listFiles();if(files!=null)for(File f:files)total+=f.length();return total;}
    private JSONObject saveOutput(File source,String displayName,int w,int h,String mime) throws Exception {
        return saveOutput(source,displayName,w,h,mime,0);
    }
    private JSONObject saveOutput(File source,String displayName,int w,int h,String mime,int pages) throws Exception {
        boolean pdf=mime.equals("application/pdf");
        String ext=pdf?"pdf":mime.equals("video/mp4")?"mp4":mime.equals("image/png")?"png":mime.equals("image/webp")?"webp":"jpg";
        String id=UUID.randomUUID().toString()+"."+ext;
        File outFile=new File(exports,id),meta=new File(exports,id+".json");
        Uri galleryUri=null;
        try {
            Files.copy(source.toPath(),outFile.toPath());
            ContentValues values=new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME,displayName);
            values.put(MediaStore.MediaColumns.MIME_TYPE,mime);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH,pdf?"Download/Framivio":mime.startsWith("video/")?"Movies/Framivio":"Pictures/Framivio");
            values.put(MediaStore.MediaColumns.IS_PENDING,1);
            Uri collection=pdf?MediaStore.Downloads.EXTERNAL_CONTENT_URI:mime.startsWith("video/")?MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY):MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            galleryUri=getContentResolver().insert(collection,values);
            if(galleryUri==null)throw new IllegalStateException("Gallery storage is unavailable.");
            try(InputStream in=new FileInputStream(outFile);OutputStream out=getContentResolver().openOutputStream(galleryUri)) {
                if(out==null)throw new IllegalStateException("Gallery write was denied.");
                byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);
            }
            JSONObject info=json("id",id,"name",displayName,"w",w,"h",h,"mime",mime,"pages",pages,"size",outFile.length(),"date",System.currentTimeMillis(),"url",ORIGIN+"/output/"+id);
            Files.write(meta.toPath(),info.toString().getBytes(StandardCharsets.UTF_8));
            values.clear();values.put(MediaStore.MediaColumns.IS_PENDING,0);
            if(getContentResolver().update(galleryUri,values,null,null)<1)throw new IllegalStateException("Could not publish the gallery item.");
            return info;
        } catch(Exception e) {
            outFile.delete();meta.delete();
            if(galleryUri!=null)getContentResolver().delete(galleryUri,null,null);
            throw e;
        }
    }
    void videoCompleted(File output,int w,int h) {
        io.execute(()->{
            try { JSONObject result=saveOutput(output,"Framivio_"+System.currentTimeMillis()+".mp4",w,h,"video/mp4");event("videoSaved",result); }
            catch(Exception e) { error("Video rendered, but saving failed: "+e.getMessage()); }
            finally { output.delete(); }
        });
    }
    private void listOutputs(){io.execute(()->{JSONArray result=new JSONArray();File[] files=exports.listFiles((dir,name)->name.endsWith(".json"));if(files!=null){java.util.Arrays.sort(files,(a,b)->Long.compare(b.lastModified(),a.lastModified()));for(File f:files)try{JSONObject info=new JSONObject(new String(Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8));if(new File(exports,info.getString("id")).isFile())result.put(info);}catch(Exception ignored){}}event("exports",result);});}
    private void shareFile(File f,String type) {
        try {
            Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",f);
            Intent intent=new Intent(Intent.ACTION_SEND).setType(type).putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.setClipData(ClipData.newRawUri("Framivio export",uri));
            startActivity(Intent.createChooser(intent,"Share your creation"));
        } catch(Exception e) { notifyUser("No compatible sharing app found."); }
    }
    public class Bridge {
        @JavascriptInterface public void ready(){runOnUiThread(()->{pageReady=true;for(String script:pendingEvents)web.evaluateJavascript(script,null);pendingEvents.clear();commerce.start();});}
        @JavascriptInterface public void pick(String type){runOnUiThread(()->pickMedia(type));}
        @JavascriptInterface public void setTheme(boolean dark){runOnUiThread(()->{View decor=getWindow().getDecorView();decor.setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);((View)web.getParent()).setBackgroundColor(dark?Color.rgb(22,28,25):Color.rgb(247,245,240));});}
        @JavascriptInterface public void saveImage(String metadata,String base64) {
            io.execute(()->{
                File temp=null;
                try {
                    JSONObject m=new JSONObject(metadata);int w=m.getInt("w"),h=m.getInt("h");MediaRules.dimensions(w,h,false);
                    if(base64.length()>64*1024*1024)throw new IllegalArgumentException("Export is too large. Use JPG or a smaller canvas.");
                    String type=m.getString("mime");if(!type.matches("image/(jpeg|png|webp)"))throw new IllegalArgumentException("Unsupported export format.");
                    byte[] bytes=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);
                    android.graphics.BitmapFactory.Options bounds=new android.graphics.BitmapFactory.Options();bounds.inJustDecodeBounds=true;android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);
                    if(bounds.outWidth!=w||bounds.outHeight!=h||!type.equals(bounds.outMimeType))throw new IllegalArgumentException("Export dimensions or format do not match.");
                    temp=File.createTempFile("photo-",".tmp",getCacheDir());
                    try(OutputStream out=new FileOutputStream(temp)){out.write(bytes);}
                    event("imageSaved",saveOutput(temp,m.getString("name").replaceAll("[^a-zA-Z0-9_.-]","_"),w,h,type));
                } catch(Exception e) {error(e.getMessage()==null?"Could not save image.":e.getMessage());}
                catch(OutOfMemoryError e){error("Not enough memory. Export a smaller image or use JPG.");}
                finally {if(temp!=null)temp.delete();}
            });
        }
        @JavascriptInterface public void exportVideo(String config){runOnUiThread(()->{try{video.start(new JSONObject(config));}catch(Exception e){error(e.getMessage());}});}
        @JavascriptInterface public void savePdf(String metadata,String base64){
            io.execute(()->{
                File temp=null;
                try{
                    JSONObject info=new JSONObject(metadata);
                    int w=info.getInt("w"),h=info.getInt("h");MediaRules.dimensions(w,h,false);
                    if(base64.length()>64*1024*1024)throw new IllegalArgumentException("PDF is too large. Use Medium quality or a smaller canvas.");
                    byte[] bytes=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);
                    temp=File.createTempFile("pdf-",".pdf",getCacheDir());
                    try(OutputStream out=new FileOutputStream(temp)){out.write(bytes);}
                    int pages;
                    try(android.graphics.pdf.PdfRenderer reader=new android.graphics.pdf.PdfRenderer(android.os.ParcelFileDescriptor.open(temp,android.os.ParcelFileDescriptor.MODE_READ_ONLY))){pages=reader.getPageCount();}
                    if(pages<1||pages>100||pages!=info.getInt("pages"))throw new IllegalArgumentException("PDF page validation failed.");
                    event("imageSaved",saveOutput(temp,info.getString("name").replaceAll("[^a-zA-Z0-9_.-]","_"),w,h,"application/pdf",pages));
                }catch(Exception e){error("Could not save PDF: "+e.getMessage());}
                catch(OutOfMemoryError e){error("Not enough memory to save this PDF. Try a smaller canvas.");}
                finally{if(temp!=null)temp.delete();}
            });
        }
        @JavascriptInterface public void editExport(String id){
            if(!MediaRules.safeId(id)||!mime(id).startsWith("image/"))return;
            io.execute(()->{
                File copy=null;
                try{
                    File source=new File(exports,id),meta=new File(exports,id+".json");
                    if(!source.isFile()||!meta.isFile())throw new IllegalArgumentException("Saved image is unavailable.");
                    if(cacheBytes()+source.length()>1024L*1024*1024)throw new IllegalArgumentException("Clear the import cache in Settings first.");
                    JSONObject info=new JSONObject(new String(Files.readAllBytes(meta.toPath()),StandardCharsets.UTF_8));
                    String newId=UUID.randomUUID()+id.substring(id.lastIndexOf('.'));copy=new File(imports,newId);
                    Files.copy(source.toPath(),copy.toPath());
                    event("reedit",json("id",newId,"name",info.getString("name"),"type","photo","mime",info.getString("mime"),"w",info.getInt("w"),"h",info.getInt("h"),"url",ORIGIN+"/media/"+newId));
                }catch(Exception e){if(copy!=null)copy.delete();error("Could not open saved image: "+e.getMessage());}
            });
        }
        @JavascriptInterface public void openExport(String id){
            if(!MediaRules.safeId(id))return;
            runOnUiThread(()->{try{File file=new File(exports,id);if(!file.isFile())throw new IllegalArgumentException("File missing");Uri uri=FileProvider.getUriForFile(MainActivity.this,getPackageName()+".files",file);startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,mime(id)).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));}catch(Exception e){notifyUser("Install a compatible PDF viewer to open this export. It is also saved in Downloads/Framivio.");}});
        }
        @JavascriptInterface public void cancelExport(){runOnUiThread(()->video.cancel());}
        @JavascriptInterface public void listExports(){listOutputs();}
        @JavascriptInterface public void share(String id){if(!MediaRules.safeId(id))return;runOnUiThread(()->{File f=new File(exports,id);if(f.isFile())shareFile(f,mime(id));else notifyUser("Export not found.");});}
        @JavascriptInterface public void openSource(String id){runOnUiThread(()->{try{File f=imported(id);Uri uri=FileProvider.getUriForFile(MainActivity.this,getPackageName()+".files",f);startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"video/*").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));}catch(Exception e){notifyUser("No video player is available for this source.");}});}
        @JavascriptInterface public void deleteExport(String id){if(!MediaRules.safeId(id))return;io.execute(()->{File f=new File(exports,id);if(f.exists()&&!f.delete()){notifyUser("Could not remove this export.");return;}new File(exports,id+".json").delete();listOutputs();});}
        @JavascriptInterface public void clearCache(){io.execute(()->{File[] files=imports.listFiles();if(files!=null)for(File f:files)f.delete();event("cacheCleared",json());});}
        @JavascriptInterface public void purchase(){runOnUiThread(()->commerce.purchase());}
        @JavascriptInterface public void restore(){runOnUiThread(()->commerce.restore());}
        @JavascriptInterface public void adPrivacy(){runOnUiThread(()->commerce.privacy());}
        @JavascriptInterface public void exportFinished(){runOnUiThread(()->commerce.afterExport());}
        @JavascriptInterface public void support(){runOnUiThread(()->{if(BuildConfig.SUPPORT_EMAIL.isEmpty()){notifyUser("Support contact has not been configured in this build.");return;}try{startActivity(new Intent(Intent.ACTION_SENDTO,Uri.parse("mailto:"+Uri.encode(BuildConfig.SUPPORT_EMAIL,"@"))).putExtra(Intent.EXTRA_SUBJECT,"Framivio support"));}catch(Exception e){notifyUser("Email: "+BuildConfig.SUPPORT_EMAIL);}});}
    }
    @Override protected void onResume(){super.onResume();if(commerce!=null)commerce.refreshIfReady();}
    @Override protected void onStop(){super.onStop();if(video!=null&&video.isRunning()){video.cancel();notifyUser("Video export stopped because the app left the foreground. Keep Framivio open while exporting.");}}
    @Override protected void onDestroy(){destroyed=true;if(video!=null)video.release();if(commerce!=null)commerce.close();io.shutdown();handler.removeCallbacksAndMessages(null);if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
}
