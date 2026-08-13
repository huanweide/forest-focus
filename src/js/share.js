/* share.js - 微信 / 链接分享系统
 * 依赖：core.js (AppState, Utils, EventBus)
 * 策略：优先 navigator.share（移动端系统分享，含微信）；微信内置浏览器引导右上角转发；
 *       其余环境复制「专注日报」文案 + 链接到剪贴板，用户自行粘贴到微信。
 */
function _todayFocusMinutes() {
  var t = Utils.today();
  return (AppState.sessions || []).filter(function(s) { return s.date === t && s.completed; })
    .reduce(function(a, s) { return a + (s.minutes || 0); }, 0);
}
function _todayCount() {
  var t = Utils.today();
  return (AppState.sessions || []).filter(function(s) { return s.date === t && s.completed; }).length;
}

function openShare() {
  var modal = document.getElementById('shareModal');
  if (!modal) return;
  var mins = _todayFocusMinutes(), cnt = _todayCount();
  var preview =
    '🌿 我的专注日报\n' +
    '————————\n' +
    '📅 ' + Utils.today() + '\n' +
    '⏱ 今日专注：' + Utils.fmtMins(mins) + '\n' +
    '🌳 完成专注：' + cnt + ' 次\n' +
    '🔥 累计专注：' + (AppState.totalCompletions || 0) + ' 次\n' +
    '🪙 金币：' + AppState.coins + '\n' +
    '————————\n' +
    '用「专注森林」种下每一分钟的成长 🌱';
  var pv = document.getElementById('sharePreview');
  if (pv) pv.textContent = preview;
  var tip = document.getElementById('shareTip');
  if (tip) tip.textContent = '';
  modal.classList.add('show');
}

function closeShare() {
  var modal = document.getElementById('shareModal');
  if (modal) modal.classList.remove('show');
}

function shareToWeChat() {
  var preview = document.getElementById('sharePreview');
  var text = preview ? preview.textContent : '';
  var url = location.href;
  var tip = document.getElementById('shareTip');
  var shareData = { title: '专注森林 · 我的专注日报', text: text, url: url };

  if (navigator.share) {
    navigator.share(shareData).then(function() { closeShare(); })
      .catch(function() { if (tip) tip.textContent = '已取消分享'; });
  } else if (/MicroMessenger/i.test(navigator.userAgent)) {
    if (tip) tip.textContent = '请点击右上角“···” → 发送给朋友 / 分享到朋友圈';
  } else {
    copyShareLink();
    if (tip) tip.textContent = '已复制，去微信粘贴发送给好友吧~';
  }
}

function copyShareLink() {
  var preview = document.getElementById('sharePreview');
  var text = preview ? preview.textContent : '';
  var full = text + '\n' + location.href;
  var tip = document.getElementById('shareTip');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(full).then(function() {
      if (tip) tip.textContent = '✅ 分享文案与链接已复制';
    }).catch(function() { _fallbackCopy(full, tip); });
  } else {
    _fallbackCopy(full, tip);
  }
}

function _fallbackCopy(text, tip) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    if (tip) tip.textContent = '✅ 分享文案与链接已复制';
  } catch (e) {
    if (tip) tip.textContent = '复制失败，请手动长按复制';
  }
}

// 点击弹窗背景关闭
document.addEventListener('click', function(e) {
  var modal = document.getElementById('shareModal');
  if (modal && modal.classList.contains('show') && e.target === modal) closeShare();
});
