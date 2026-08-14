package com.aziforest.focuslock;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Button;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

/**
 * 专注锁机主界面：开始/停止、模式选择（RadioGroup）、白名单管理、逃生口、PWA 深链唤起。
 *
 * 三种模式（对应调研结论）：
 *  - SOFT：无障碍弹回（默认，普通用户即用）
 *  - PINNED：引导用户开系统"应用固定" startLockTask()，逼近硬锁但留退出键
 *
 * 深链：网页/PWA 通过 aziforest://start?mode=soft|pinned 唤起本 App 并直接开始对应模式。
 */
public class MainActivity extends Activity {

    public static final int MODE_SOFT = 0;
    public static final int MODE_PINNED = 1;

    private SharedPreferences state;
    private WhitelistStore whitelist;
    private DevicePolicyManager dpm;
    private ComponentName adminComponent;
    private final Handler ui = new Handler(Looper.getMainLooper());

    private TextView statusText;
    private RadioGroup modeGroup;
    private Button startBtn, stopBtn, whitelistBtn;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_main);

        state = getSharedPreferences("focuslock_state", MODE_PRIVATE);
        whitelist = new WhitelistStore(this);
        dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        adminComponent = new ComponentName(this, AdminReceiver.class);

        statusText = findViewById(R.id.statusText);
        modeGroup = findViewById(R.id.modeGroup);
        startBtn = findViewById(R.id.startBtn);
        stopBtn = findViewById(R.id.stopBtn);
        whitelistBtn = findViewById(R.id.whitelistBtn);

        // 处理从无障碍服务弹回的意图
        if (getIntent() != null && getIntent().getBooleanExtra("bounced", false)) {
            Toast.makeText(this, R.string.toast_bounced, Toast.LENGTH_SHORT).show();
        }

        startBtn.setOnClickListener(v -> startFocus(currentMode()));
        stopBtn.setOnClickListener(v -> stopFocus());
        whitelistBtn.setOnClickListener(v -> startActivity(new Intent(this, WhitelistActivity.class)));

        // 处理来自 PWA / 网页的深链唤起（如 aziforest://start?mode=soft）
        handleDeepLink(getIntent());

        refreshStatus();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    /** 当前选中的模式 */
    private int currentMode() {
        int id = modeGroup.getCheckedRadioButtonId();
        return (id == R.id.modePinned) ? MODE_PINNED : MODE_SOFT;
    }

    /** 解析 aziforest:// 深链：自动选中模式并立即开始专注 */
    private void handleDeepLink(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        if (uri == null) return;
        if (!"aziforest".equals(uri.getScheme())) return;

        String mode = uri.getQueryParameter("mode");
        int m = "pinned".equals(mode) ? MODE_PINNED : MODE_SOFT;
        modeGroup.check(m == MODE_PINNED ? R.id.modePinned : R.id.modeSoft);
        Toast.makeText(this, getString(R.string.toast_deeplink_mode, mode == null ? "soft" : mode),
                Toast.LENGTH_SHORT).show();
        startFocus(m);
    }

    private void startFocus(int mode) {
        // 前置检查：无障碍是否开启
        if (!isAccessibilityOn()) {
            Toast.makeText(this, R.string.hint_accessibility_off, Toast.LENGTH_LONG).show();
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
            return;
        }
        // 逃生口之二：低电量直接放行，避免锁死漏重要事
        if (isLowBattery()) {
            Toast.makeText(this, R.string.toast_low_battery_skip, Toast.LENGTH_SHORT).show();
            return;
        }

        state.edit().putBoolean("focus_active", true).putInt("mode", mode).apply();
        refreshStatus();

        if (mode == MODE_PINNED) {
            // 应用固定：Device Owner 下不可退出；否则系统弹确认，用户可退出（保留逃生口）
            if (dpm != null && dpm.isDeviceOwnerApp(getPackageName())) {
                dpm.setLockTaskPackages(adminComponent, new String[]{getPackageName()});
                startLockTask();
            } else {
                Toast.makeText(this, R.string.toast_pinned_fallback, Toast.LENGTH_LONG).show();
                startLockTask(); // 弹确认，用户可按最近+Home退出
            }
        }
        // 逃生口之一：定时自动解锁（25 分钟番茄钟）
        scheduleAutoUnlock(25 * 60 * 1000L);
        Toast.makeText(this, R.string.toast_started, Toast.LENGTH_SHORT).show();
    }

    private void stopFocus() {
        state.edit().putBoolean("focus_active", false).apply();
        if (isInLockTaskMode()) stopLockTask();
        ui.removeCallbacksAndMessages(null);
        refreshStatus();
        Toast.makeText(this, R.string.toast_stopped, Toast.LENGTH_SHORT).show();
    }

    /** 逃生口之一：定时自动解锁，避免无限锁死 */
    private void scheduleAutoUnlock(long delayMs) {
        ui.postDelayed(this::stopFocus, delayMs);
    }

    /** 逃生口之二：低电量时自动放行 */
    private boolean isLowBattery() {
        Intent i = registerReceiver(null, new Intent(Intent.ACTION_BATTERY_CHANGED));
        if (i == null) return false;
        int level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        return level * 100 / (scale == 0 ? 1 : scale) <= 15;
    }

    private void refreshStatus() {
        boolean active = state.getBoolean("focus_active", false);
        int mode = state.getInt("mode", MODE_SOFT);
        if (active) {
            statusText.setText(mode == MODE_PINNED ? R.string.status_active_pinned
                    : R.string.status_active_soft);
        } else {
            statusText.setText(R.string.status_idle);
        }
    }

    private boolean isAccessibilityOn() {
        String id = getPackageName() + "/.FocusLockAccessibilityService";
        String enabled = Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        return enabled != null && enabled.contains(id);
    }

    private boolean isInLockTaskMode() {
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        return am != null && am.isInLockTaskMode();
    }
}
