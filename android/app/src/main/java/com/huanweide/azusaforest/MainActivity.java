package com.huanweide.azusaforest;

import android.annotation.SuppressLint;
import android.app.AppOpsManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.KeyEvent;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private static final String MAIN_URL = "https://huanweide.github.io/forest-focus/";
    private static final int REQUEST_OVERLAY = 100;
    private static final int REQUEST_USAGE = 101;
    private static final int REQUEST_NOTIFY = 102;
    private WebView webView;
    private boolean focusActive = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        CookieManager.getInstance().setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }

        // JS桥接：网页调原生功能
        webView.addJavascriptInterface(new AzusaBridge(), "AzusaNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!url.startsWith("https://huanweide.github.io")
                        && !url.startsWith("https://api.deepseek.com")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                    catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(MAIN_URL);
        requestAllPermissions();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "azusa_timer", "阿梓专注计时", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("专注计时进行中");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private void requestAllPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                startActivityForResult(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())), REQUEST_OVERLAY);
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, REQUEST_NOTIFY);
            }
        }
    }

    /** JS桥接：网页调原生锁App */
    public class AzusaBridge {
        @JavascriptInterface
        public void startFocus(int minutes) {
            runOnUiThread(() -> {
                focusActive = true;
                Intent service = new Intent(MainActivity.this, FocusService.class);
                service.putExtra("minutes", minutes);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(service);
                } else { startService(service); }
                Toast.makeText(MainActivity.this, "专注开始！阿梓在守护你", Toast.LENGTH_SHORT).show();
            });
        }

        @JavascriptInterface
        public void stopFocus() {
            runOnUiThread(() -> {
                focusActive = false;
                stopService(new Intent(MainActivity.this, FocusService.class));
            });
        }

        @JavascriptInterface
        public boolean hasOverlayPermission() {
            return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(MainActivity.this);
        }

        @JavascriptInterface
        public boolean hasUsagePermission() {
            try {
                AppOpsManager appOps = (AppOpsManager) getSystemService(Context.APP_OPS_SERVICE);
                int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), getPackageName());
                return mode == AppOpsManager.MODE_ALLOWED;
            } catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public void requestUsagePermission() {
            runOnUiThread(() -> {
                try { startActivityForResult(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS), REQUEST_USAGE); }
                catch (Exception e) { Toast.makeText(MainActivity.this, "请手动开启使用情况访问权限", Toast.LENGTH_LONG).show(); }
            });
        }

        @JavascriptInterface
        public boolean isFocusActive() { return focusActive; }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) { webView.goBack(); return true; }
        moveTaskToBack(true); return true;
    }

    @Override
    protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }
    @Override
    protected void onPause() { super.onPause(); if (webView != null) webView.onPause(); }
    @Override
    protected void onDestroy() {
        if (webView != null) { webView.loadUrl("about:blank"); webView.clearHistory(); webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
