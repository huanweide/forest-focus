package com.aziforest.focuslock;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * 设备管理员接收器。空实现即可获得 lockNow() 锁屏能力。
 * 若要"不可退出"硬核模式，需把本应用设为 Device Owner（见 README 的 adb 命令），
 * 再配合 Lock Task Mode 禁用 Home/Recent/Back 键。
 */
public class AdminReceiver extends DeviceAdminReceiver {
    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
    }
}
