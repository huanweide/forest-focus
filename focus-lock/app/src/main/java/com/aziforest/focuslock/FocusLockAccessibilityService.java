package com.aziforest.focuslock;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.accessibility.AccessibilityEvent;

/**
 * 专注锁机核心：无障碍服务。
 *
 * 逻辑（统一引擎的 Android 实现）：
 *   onForegroundApp(package) -> if !whitelist.contains(package) && focusActive -> bounceBack()
 *
 * 注意：无障碍只能"检测 + 弹回"，不能硬拦返回键。这是 Android 的安全模型决定的，
 * 真·不可退出需 Device Owner + Lock Task（见 MainActivity 的 PINNED 模式）。
 */
public class FocusLockAccessibilityService extends AccessibilityService {

    private WhitelistStore whitelist;
    private SharedPreferences state;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        whitelist = new WhitelistStore(this);
        state = getSharedPreferences("focuslock_state", MODE_PRIVATE);

        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            // 声明我们能拿到窗口内容，用于读取前台包名
            info.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
            setServiceInfo(info);
        }
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        // 只在专注进行中生效
        if (!state.getBoolean("focus_active", false)) return;

        String pkg = event.getPackageName().toString();
        // 本服务自身、白名单内 -> 放行
        if (whitelist.isAllowed(pkg)) return;

        // 非白名单 -> 弹回专注界面（逃生口：电话/短信已在默认白名单，不会触发）
        bounceBack();
    }

    /** 把用户拉回专注 App。覆盖层提醒可选，这里用拉起 Activity 最稳、最合规。 */
    private void bounceBack() {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        i.putExtra("bounced", true); // 让 MainActivity 显示"你分心了"提示
        startActivity(i);
    }

    /** 低电量等逃生：由 MainActivity 控制 state，这里只读取 */
    public static boolean isFocusActive(android.content.Context c) {
        return c.getSharedPreferences("focuslock_state", MODE_PRIVATE)
                .getBoolean("focus_active", false);
    }

    @Override
    public void onInterrupt() {}

    // Build.VERSION 引用占位，避免未使用告警（实际可据版本做兼容）
    @SuppressWarnings("unused")
    private static final int SDK = Build.VERSION.SDK_INT;
}
