# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keep class com.huanweide.azusaforest.** { *; }
-keepclassmembers class com.huanweide.azusaforest.MainActivity$AzusaBridge {
    @android.webkit.JavascriptInterface <methods>;
}
