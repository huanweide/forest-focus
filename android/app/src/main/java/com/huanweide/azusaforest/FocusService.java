package com.huanweide.azusaforest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

public class FocusService extends Service {

    private static final int NOTIFY_ID = 8848;
    private static final String CHANNEL_ID = "azusa_timer";
    private CountDownTimer timer;
    private WindowManager windowManager;
    private View lockOverlay;
    private int remainingSeconds;
    private String lastBlockedPackage = "";
    private long lastBlockTime = 0;

    private static final String[] DEFAULT_BLACKLIST = {
        "com.tencent.mm", "com.tencent.mobileqq",
        "com.ss.android.ugc.aweme", "com.sina.weibo",
        "com.zhihu.android", "com.bilibili.app.in",
        "com.taobao.taobao", "com.xunmeng.pinduoduo",
        "com.kuaishou.nebula", "com.tencent.tmgp.sgame",
        "com.tencent.ig",
    };

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int minutes = intent != null ? intent.getIntExtra("minutes", 25) : 25;
        remainingSeconds = minutes * 60;
        startForeground(NOTIFY_ID, buildNotification(minutes));
        startTimer(minutes);
        startLockMonitor();
        return START_STICKY;
    }

    private Notification buildNotification(int minutes) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "阿梓专注计时", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        Intent i = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("阿梓在陪伴你专注")
            .setContentText("还剩 " + minutes + " 分钟")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true).setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_LOW).build();
    }

    private void updateNotification(int remaining) {
        int min = remaining / 60, sec = remaining % 60;
        String text = String.format("还剩 %d:%02d · 坚持住！", min, sec);
        Notification notif = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("阿梓在陪伴你专注").setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true).setPriority(NotificationCompat.PRIORITY_LOW).build();
        getSystemService(NotificationManager.class).notify(NOTIFY_ID, notif);
    }

    private void startTimer(int minutes) {
        timer = new CountDownTimer(minutes * 60 * 1000L, 1000L) {
            public void onTick(long millisUntilFinished) {
                remainingSeconds = (int)(millisUntilFinished / 1000);
                updateNotification(remainingSeconds);
            }
            public void onFinish() {
                remainingSeconds = 0; stopLockMonitor(); removeLockOverlay();
                Notification notif = new NotificationCompat.Builder(FocusService.this, CHANNEL_ID)
                    .setContentTitle("专注完成！").setContentText("太棒了！阿梓为你骄傲")
                    .setSmallIcon(android.R.drawable.ic_lock_idle_lock).setOngoing(false).build();
                getSystemService(NotificationManager.class).notify(NOTIFY_ID, notif);
                stopSelf();
            }
        };
        timer.start();
    }

    private void startLockMonitor() {
        new Thread(() -> {
            while (timer != null && remainingSeconds > 0) {
                try { Thread.sleep(1500); } catch (Exception ignored) {}
                try {
                    String fg = getForegroundPackage();
                    if (fg != null && isBlocked(fg)) showLockOverlay(fg);
                    else if (!getPackageName().equals(fg)) removeLockOverlay();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void stopLockMonitor() { removeLockOverlay(); }

    private String getForegroundPackage() {
        try {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            long now = System.currentTimeMillis();
            List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 5000, now);
            if (stats == null || stats.isEmpty()) return null;
            SortedMap<Long, UsageStats> sorted = new TreeMap<>();
            for (UsageStats s : stats) sorted.put(s.getLastTimeUsed(), s);
            return sorted.get(sorted.lastKey()).getPackageName();
        } catch (Exception e) { return null; }
    }

    private boolean isBlocked(String pkg) {
        for (String b : DEFAULT_BLACKLIST) if (pkg.equals(b)) return true;
        return false;
    }

    private void showLockOverlay(String blockedPkg) {
        long now = System.currentTimeMillis();
        if (blockedPkg.equals(lastBlockedPackage) && now - lastBlockTime < 3000) return;
        lastBlockedPackage = blockedPkg; lastBlockTime = now;
        if (!Settings.canDrawOverlays(this)) return;
        removeLockOverlay();

        int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            overlayType, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.CENTER;

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xEE1a1a2e);
        layout.setPadding(40, 40, 40, 40);

        TextView icon = new TextView(this);
        icon.setText("🌸"); icon.setTextSize(60); icon.setGravity(Gravity.CENTER);
        layout.addView(icon);

        TextView title = new TextView(this);
        title.setText("阿梓在等你回去！"); title.setTextSize(22);
        title.setTextColor(0xFFFFFFFF); title.setGravity(Gravity.CENTER);
        title.setPadding(0, 20, 0, 8);
        layout.addView(title);

        int min = remainingSeconds / 60, sec = remainingSeconds % 60;
        TextView sub = new TextView(this);
        sub.setText("还剩 " + min + " 分 " + sec + " 秒\n不要刷手机了，快回去种树吧");
        sub.setTextSize(14); sub.setTextColor(0xFFAAAAAA); sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, 0, 0, 30);
        layout.addView(sub);

        Button btn = new Button(this);
        btn.setText("回去继续专注"); btn.setTextColor(0xFFFFFFFF);
        btn.setBackgroundColor(0xFF5C6BC0);
        btn.setOnClickListener(v -> {
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            startActivity(i); removeLockOverlay();
        });
        layout.addView(btn);

        lockOverlay = layout;
        try { windowManager.addView(lockOverlay, params); } catch (Exception ignored) {}
    }

    private void removeLockOverlay() {
        if (lockOverlay != null && windowManager != null) {
            try { windowManager.removeView(lockOverlay); } catch (Exception ignored) {}
            lockOverlay = null;
        }
    }

    @Override public void onDestroy() {
        if (timer != null) { timer.cancel(); timer = null; }
        removeLockOverlay(); super.onDestroy();
    }

    @Nullable @Override
    public IBinder onBind(Intent intent) { return null; }
}
