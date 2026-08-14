package com.aziforest.focuslock;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.ListView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 白名单可视化页：扫描已安装 App，勾选允许在专注时打开的包名。
 *
 * - 默认刚需（电话/短信/微信/支付/桌面）锁定不可取消，避免误锁漏重要事；
 * - 用户自定义项可自由勾选，实时写入 {@link WhitelistStore}（SharedPreferences 持久化）。
 */
public class WhitelistActivity extends Activity {

    private WhitelistStore whitelist;
    private PackageManager pm;
    private final List<AppEntry> apps = new ArrayList<>();

    /** 列表项数据模型 */
    static class AppEntry {
        String pkg;
        String label;
        boolean locked;  // 默认刚需，锁定不可取消
        boolean checked; // 当前是否勾选
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_whitelist);

        whitelist = new WhitelistStore(this);
        pm = getPackageManager();

        loadApps();

        ListView list = findViewById(R.id.appList);
        list.setEmptyView(null);
        list.setAdapter(new AppAdapter());

        Button done = findViewById(R.id.doneBtn);
        done.setOnClickListener(v -> finish());
    }

    /** 读取全部已装 App，并按白名单状态初始化勾选 */
    private void loadApps() {
        // MATCH_ALL：Android 11+ 需 QUERY_ALL_PACKAGES 才能拿到完整列表
        List<ApplicationInfo> installed = pm.getInstalledApplications(PackageManager.MATCH_ALL);
        for (ApplicationInfo ai : installed) {
            AppEntry e = new AppEntry();
            e.pkg = ai.packageName;
            e.label = pm.getApplicationLabel(ai).toString();
            e.locked = whitelist.isDefaultRequired(pkg(ai));
            e.checked = whitelist.isAllowed(pkg(ai));
            apps.add(e);
        }
        // 按应用名排序，体验更顺
        Collections.sort(apps, (a, b) -> a.label.compareToIgnoreCase(b.label));
    }

    private static String pkg(ApplicationInfo ai) {
        return ai.packageName;
    }

    /** 勾选变化：刚需锁定不可改；自定义项写入/移除白名单 */
    private void onToggle(AppEntry e, boolean checked) {
        if (e.locked) return; // 刚需锁定
        if (checked) whitelist.add(e.pkg);
        else whitelist.remove(e.pkg);
        e.checked = checked;
    }

    private class AppAdapter extends BaseAdapter {
        @Override
        public int getCount() {
            return apps.size();
        }

        @Override
        public Object getItem(int i) {
            return apps.get(i);
        }

        @Override
        public long getItemId(int i) {
            return i;
        }

        @Override
        public View getView(int i, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = getLayoutInflater().inflate(R.layout.item_app, parent, false);
            }
            AppEntry e = apps.get(i);

            TextView label = convertView.findViewById(R.id.appLabel);
            TextView pkgText = convertView.findViewById(R.id.appPackage);
            CheckBox cb = convertView.findViewById(R.id.checkBox);
            TextView locked = convertView.findViewById(R.id.lockedTag);

            label.setText(e.label);
            pkgText.setText(e.pkg);
            locked.setVisibility(e.locked ? View.VISIBLE : View.GONE);

            // 先断开监听器再设值，避免 ListView 复用 View 时触发伪回调
            cb.setOnCheckedChangeListener(null);
            cb.setChecked(e.checked);
            cb.setEnabled(!e.locked);
            cb.setOnCheckedChangeListener((v, isChecked) -> onToggle(e, isChecked));

            return convertView;
        }
    }
}
