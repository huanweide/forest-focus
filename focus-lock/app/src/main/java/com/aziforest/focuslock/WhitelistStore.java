package com.aziforest.focuslock;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.HashSet;
import java.util.Set;

/**
 * 白名单存储：用 SharedPreferences 持久化允许在专注时打开的 App 包名。
 * 默认内置"通信/支付"刚需预设，避免误锁导致漏电话、付不了款。
 */
public class WhitelistStore {
    private static final String PREFS = "focuslock_whitelist";
    private static final String KEY = "packages";

    // 默认白名单：电话、短信、微信、支付宝、系统桌面、本应用自身
    private static final String[] DEFAULTS = {
            "com.android.dialer", "com.android.mms", "com.tencent.mm",
            "com.eg.android.AlipayGphone", "com.huawei.android.launcher",
            "com.miui.home", "com.aziforest.focuslock"
    };

    private final SharedPreferences sp;

    public WhitelistStore(Context ctx) {
        sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (sp.getStringSet(KEY, null) == null) {
            setAll(new HashSet<>()); // 首次初始化
        }
    }

    public Set<String> getAll() {
        // 始终合并默认刚需，用户加减只影响额外项
        Set<String> base = new HashSet<>();
        for (String d : DEFAULTS) base.add(d);
        base.addAll(sp.getStringSet(KEY, new HashSet<>()));
        return base;
    }

    /** 纯用户自定义白名单（不含默认刚需），供白名单 UI 区分显示 */
    public Set<String> getCustom() {
        return new HashSet<>(sp.getStringSet(KEY, new HashSet<>()));
    }

    /** 是否为默认刚需（电话/短信/微信/支付/桌面），锁定不可取消 */
    public boolean isDefaultRequired(String pkg) {
        if (pkg == null) return false;
        for (String d : DEFAULTS) if (d.equals(pkg)) return true;
        return false;
    }

    public void add(String pkg) {
        Set<String> cur = new HashSet<>(sp.getStringSet(KEY, new HashSet<>()));
        cur.add(pkg);
        sp.edit().putStringSet(KEY, cur).apply();
    }

    public void remove(String pkg) {
        Set<String> cur = new HashSet<>(sp.getStringSet(KEY, new HashSet<>()));
        cur.remove(pkg);
        sp.edit().putStringSet(KEY, cur).apply();
    }

    private void setAll(Set<String> set) {
        sp.edit().putStringSet(KEY, set).apply();
    }

    /** 是否允许该包名（含默认刚需） */
    public boolean isAllowed(String pkg) {
        if (pkg == null) return true;
        return getAll().contains(pkg);
    }
}
