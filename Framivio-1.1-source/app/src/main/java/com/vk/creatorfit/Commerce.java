package com.vk.creatorfit;

import android.content.SharedPreferences;
import android.util.Base64;
import androidx.annotation.NonNull;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Collections;
import java.util.List;

/** Optional Google services only. Media processing never depends on these services. */
final class Commerce {
    private final MainActivity activity;
    private final SharedPreferences prefs;
    private BillingClient billing;
    private ProductDetails product;
    private ConsentInformation consent;
    private InterstitialAd ad;
    private boolean started, pro, adLoading, adsInitialized, closed;
    private long lastAd;
    private int exports;
    Commerce(MainActivity activity){this.activity=activity;prefs=activity.getSharedPreferences("store",0);pro=validCachedPurchase();}
    private boolean validCachedPurchase(){
        try {Purchase p=new Purchase(prefs.getString("purchase",""),prefs.getString("signature",""));return verify(p);}
        catch(Exception ignored){return false;}
    }
    private boolean verify(Purchase purchase){
        try {
            if(BuildConfig.BILLING_PUBLIC_KEY.isEmpty()||purchase.getPurchaseState()!=Purchase.PurchaseState.PURCHASED||!purchase.getProducts().contains(BuildConfig.PRO_PRODUCT_ID)||!activity.getPackageName().equals(purchase.getPackageName()))return false;
            byte[] key=Base64.decode(BuildConfig.BILLING_PUBLIC_KEY,Base64.DEFAULT);
            Signature signature=Signature.getInstance("SHA1withRSA");
            signature.initVerify(KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(key)));
            signature.update(purchase.getOriginalJson().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return signature.verify(Base64.decode(purchase.getSignature(),Base64.DEFAULT));
        } catch(Exception e){return false;}
    }
    void config(){activity.event("config",MainActivity.json("monetized",BuildConfig.MONETIZATION_ENABLED,"pro",pro,"price",product!=null&&product.getOneTimePurchaseOfferDetails()!=null?product.getOneTimePurchaseOfferDetails().getFormattedPrice():""));}
    void start(){
        config();if(started||!BuildConfig.MONETIZATION_ENABLED)return;started=true;
        billing=BillingClient.newBuilder(activity).setListener((result,purchases)->{
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK&&purchases!=null)handlePurchases(purchases,false);
            else if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED)activity.notifyUser("Purchase cancelled. No changes made.");
            else if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)restore();
            else activity.notifyUser("Purchase could not finish. Please try again through Google Play.");
        }).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build();
        billing.startConnection(new BillingClientStateListener(){
            @Override public void onBillingSetupFinished(@NonNull BillingResult result){if(closed)return;if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){queryProduct();restoreInternal(false);}else activity.notifyUser("Store unavailable. Offline editing still works.");}
            @Override public void onBillingServiceDisconnected(){/* Auto reconnection on next API call. */}
        });
        consent=UserMessagingPlatform.getConsentInformation(activity);
        consent.requestConsentInfoUpdate(activity,new ConsentRequestParameters.Builder().build(),()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity,error->initializeAds()),error->initializeAds());
        initializeAds();
    }
    private void queryProduct(){
        if(billing==null||!billing.isReady())return;
        QueryProductDetailsParams.Product item=QueryProductDetailsParams.Product.newBuilder().setProductId(BuildConfig.PRO_PRODUCT_ID).setProductType(BillingClient.ProductType.INAPP).build();
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(item)).build(),(result,details)->activity.runOnUiThread(()->{
            if(closed)return;
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK&&!details.getProductDetailsList().isEmpty())product=details.getProductDetailsList().get(0);
            config();
        }));
    }
    void purchase(){
        if(!BuildConfig.MONETIZATION_ENABLED){activity.notifyUser("This build has all features enabled without purchases.");return;}
        if(pro){activity.notifyUser("Pro is already active.");return;}
        if(billing==null||!billing.isReady()){activity.notifyUser("Connect to the internet and open Google Play, then try again.");return;}
        if(product==null){queryProduct();activity.notifyUser("Pro is not available from Google Play yet. Check your connection and store listing.");return;}
        BillingFlowParams.ProductDetailsParams.Builder item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product);
        if(product.getOneTimePurchaseOfferDetails()!=null&&product.getOneTimePurchaseOfferDetails().getOfferToken()!=null)item.setOfferToken(product.getOneTimePurchaseOfferDetails().getOfferToken());
        BillingResult result=billing.launchBillingFlow(activity,BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build())).build());
        if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK)activity.notifyUser("Google Play could not open the purchase screen. Please try again.");
    }
    void restore(){restoreInternal(true);}
    private void restoreInternal(boolean notify){
        if(billing==null||!billing.isReady()){if(notify)activity.notifyUser("Purchase restore needs an internet connection and Google Play.");return;}
        billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(result,purchases)->{
            if(closed)return;
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){handlePurchases(purchases,true);if(notify)activity.notifyUser(pro?"Pro purchase restored.":"No completed Pro purchase found for this Google account.");}
            else if(notify)activity.notifyUser("Could not check purchases. Your previous offline access is unchanged.");
        });
    }
    private void handlePurchases(List<Purchase> purchases,boolean authoritative){
        boolean found=false;
        for(Purchase p:purchases){
            if(!p.getProducts().contains(BuildConfig.PRO_PRODUCT_ID))continue;
            if(p.getPurchaseState()==Purchase.PurchaseState.PENDING){activity.notifyUser("Payment is pending. Pro unlocks after Google Play confirms it.");continue;}
            if(!verify(p)){activity.notifyUser("Purchase verification failed. Please restore again or contact support.");continue;}
            found=true;pro=true;prefs.edit().putString("purchase",p.getOriginalJson()).putString("signature",p.getSignature()).apply();
            if(!p.isAcknowledged())billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),result->{if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK)activity.notifyUser("Reconnect soon to finish confirming your purchase. Google may refund unconfirmed purchases.");});
        }
        if(authoritative&&!found){pro=false;prefs.edit().remove("purchase").remove("signature").apply();}
        if(pro)ad=null;
        config();
    }
    void refreshIfReady(){if(started&&billing!=null&&billing.isReady())restoreInternal(false);}
    private void initializeAds(){
        if(closed||pro||consent==null||!consent.canRequestAds()||BuildConfig.AD_UNIT_ID.isEmpty())return;
        if(adsInitialized){loadAd();return;}adsInitialized=true;
        MobileAds.initialize(activity,status->activity.runOnUiThread(this::loadAd));
    }
    private void loadAd(){
        if(closed||pro||adLoading||ad!=null||consent==null||!consent.canRequestAds())return;
        adLoading=true;
        InterstitialAd.load(activity,BuildConfig.AD_UNIT_ID,new AdRequest.Builder().build(),new InterstitialAdLoadCallback(){
            @Override public void onAdLoaded(@NonNull InterstitialAd loaded){adLoading=false;if(!closed&&!pro)ad=loaded;}
            @Override public void onAdFailedToLoad(@NonNull LoadAdError error){adLoading=false;ad=null;}
        });
    }
    void afterExport(){
        if(!BuildConfig.MONETIZATION_ENABLED||pro)return;
        exports++;
        if(exports%4!=0||ad==null||System.currentTimeMillis()-lastAd<180000){loadAd();return;}
        if(consent==null||!consent.canRequestAds())return;
        InterstitialAd showing=ad;ad=null;lastAd=System.currentTimeMillis();
        showing.setFullScreenContentCallback(new FullScreenContentCallback(){
            @Override public void onAdDismissedFullScreenContent(){loadAd();}
            @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError error){loadAd();}
        });
        showing.show(activity);
    }
    void privacy(){
        if(!BuildConfig.MONETIZATION_ENABLED||consent==null){activity.notifyUser("Ads are disabled in this build.");return;}
        if(consent.getPrivacyOptionsRequirementStatus()!=ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED){activity.notifyUser("No additional ad privacy form is required in your region at this time.");return;}
        UserMessagingPlatform.showPrivacyOptionsForm(activity,error->{ad=null;if(error!=null)activity.notifyUser("Privacy form unavailable. Try again online.");else initializeAds();});
    }
    void close(){closed=true;if(billing!=null)billing.endConnection();ad=null;}
}
