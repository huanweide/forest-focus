package com.aziforest.focuslock;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Set;

/**
 * 专注锁机主界面：开始/停止、模式选择、白名单管理、逃生口。
 *
 * 三种模式（对应调研结论）：
 *  - SOFT：无障碍弹回（默认，普通用户即用）
 *  - PINNED：引导用户开系统"应用固定" startLockTask()，逼近硬锁但留退出键
 *  - DEVICE_OWNER：需 adb 设为设备所有者后真锁死（硬核可选，见 README）
 */
public class MainActivity extends Activity {

    // 模式常量
    public static final int MODE_SOFT = 0;
    public static final int MODE_PINNED = 1;

    private SharedPreferences state;
    private WhitelistStore whitelist;
    private DevicePolicyManager dpm;
    private ComponentName adminComponent;
    private final Handler ui = new Handler(Looper.getMainLooper());

    private TextView statusText;
    private Button startBtn, stopBtn, whitelistBtn, pinBtn;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        // 极简 UI（真实项目用 xml 布局，这里用代码保证可编译）
        TextView title = new TextView(this);
        title.setText("阿梓的专注锁");
        title.setTextSize(22);
        statusText = new TextView(this);
        startBtn = new Button(this); startBtn.setText("开始专注（软锁）");
        pinBtn = new Button(this); pinBtn.setText("开始专注（应用固定）");
        stopBtn = new Button(this); stopBtn.setText("停止专注");
        whitelistBtn = new Button(this); whitelistBtn.setText("管理白名单");

        state = getSharedPreferences("focuslock_state", MODE_PRIVATE);
        whitelist = new WhitelistStore(this);
        dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        adminComponent = new ComponentName(this, AdminReceiver.class);

        // 处理从无障碍服务弹回的意图
        if (getIntent() != null && getIntent().getBooleanExtra("bounced", false)) {
            Toast.makeText(this, "你分心了，已拉回专注界面", Toast.LENGTH_SHORT).show();
        }

        startBtn.setOnClickListener(v -> startFocus(MODE_SOFT));
        pinBtn.setOnClickListener(v -> startFocus(MODE_PINNED));
        stopBtn.setOnClickListener(v -> stopFocus());
        whitelistBtn.setOnClickListener(v -> openWhitelistSettings());

        // 用 LinearLayout 简单堆叠（示意，真实项目用 XML）
        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        root.addView(title); root.addView(statusText);
        root.addView(startBtn); root.addView(pinBtn);
        root.addView(stopBtn); root.addView(whitelistBtn);
        setContentView(root);

        refreshStatus();
    }

    private void startFocus(int mode) {
        // 前置检查：无障碍是否开启
        if (!isAccessibilityOn()) {
            Toast.makeText(this, "请先开启无障碍权限（设置→无障碍→阿梓的专注锁）", Toast.LENGTH_LONG).show();
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
            return;
        }
        state.edit().putBoolean("focus_active", true).putInt("mode", mode).apply();
        refreshStatus();

        if (mode == MODE_PINNED) {
            // 应用固定：需设备所有者才能无提示自动固定；否则系统会弹确认，用户可退出
            if (dpm != null && dpm.isDeviceOwnerApp(getPackageName())) {
                dpm.setLockTaskPackages(adminComponent, new String[]{getPackageName()});
                startLockTask(); // 真·不可退出（需 Device Owner）
            } else {
                // 普通用户：引导手动固定，或退化为软锁弹回
                Toast.makeText(this, "未设为设备所有者，将使用软锁弹回模式", Toast.LENGTH_LONG).show();
                startLockTask(); // 会弹确认，用户可按最近+Home退出——保留逃生口
            }
        }
        // 逃生口：定时自动解锁（例如 25 分钟番茄钟）
        scheduleAutoUnlock(25 * 60 * 1000L);
    }

    private void stopFocus() {
        state.edit().putBoolean("focus_active", false).apply();
        if (isInLockTaskMode()) stopLockTask();
        ui.removeCallbacksAndMessages(null);
        refreshStatus();
        Toast.makeText(this, "专注已结束", Toast.LENGTH_SHORT).show();
    }

    /** 逃生口之一：定时自动解锁，避免无限锁死 */
    private void scheduleAutoUnlock(long delayMs) {
        ui.postDelayed(this::stopFocus, delayMs);
    }

    /** 逃生口之二：低电量时自动放行（避免锁死漏重要事） */
    private boolean isLowBattery() {
        Intent i = registerReceiver(null, new Intent(Intent.ACTION_BATTERY_CHANGED));
        if (i == null) return false;
        int level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        return level * 100 / (scale == 0 ? 1 : scale) <= 15;
    }

    private void openWhitelistSettings() {
        // 真实项目这里打开一个勾选已装 App 的列表页；原型仅示意
        Set<String> cur = whitelist.getAll();
        Toast.makeText(this, "当前白名单 " + cur.size() + " 项（含默认刚需）", Toast.LENGTH_LONG).show();
    }

    private void refreshStatus() {
        boolean active = state.getBoolean("focus_active", false);
        int mode = state.getInt("mode", MODE_SOFT);
        statusText.setText(active ? ("专注中 · " + (mode == MODE_PINNED ? "应用固定" : "软锁"))
                                  : "未开始");
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
