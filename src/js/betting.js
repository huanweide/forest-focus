/* betting.js - 赌博押注系统 (Phase 2 增强)
 * 依赖：core.js (AppState, EventBus)
 * 增强：时长系数、连赢/连败、盈亏记录、成就联动
 */

// 押注配置
const BET_OPTIONS = [0, 5, 10, 20, 50, 100];
const TIME_MULTIPLIERS = { 20: 1.2, 25: 1.5, 30: 1.8, 45: 2.0, 60: 2.5 };

// 押注状态
var currentBet = 0;
var betHistory = JSON.parse(localStorage.getItem('fbet_history') || '[]');
var consecutiveWins = parseInt(localStorage.getItem('fcbetwins') || '0');
var consecutiveLosses = 0;

// 计算押注回报
function calcBetReturn(betAmount, minutes) {
  if (betAmount <= 0) return 0;
  var multiplier = TIME_MULTIPLIERS[minutes] || 1.5;
  return Math.floor(betAmount * multiplier);
}

// 更新押注UI
function updateBetInfo() {
  var sel = document.getElementById('betAmount');
  if (!sel) return;
  currentBet = parseInt(sel.value);
  var durSel = document.querySelector('#chips .chip.sel');
  var mins = 25; // 默认
  if (durSel) {
    var match = durSel.textContent.match(/(\d+)/);
    if (match) mins = parseInt(match[1]);
  }
  var info = document.getElementById('betInfo');
  if (currentBet > 0) {
    var ret = calcBetReturn(currentBet, mins);
    info.textContent = '完成得🪙' + ret + ' | 放弃-🪙' + currentBet;
    info.style.color = '#f57f17';
  } else {
    info.textContent = '';
  }
}

// 押注胜利
function onBetWin(betAmount, minutes) {
  if (betAmount <= 0) return 0;
  var win = calcBetReturn(betAmount, minutes);
  AppState.addCoins(win, 'bet_win');

  consecutiveWins++;
  consecutiveLosses = 0;
  localStorage.setItem('fcbetwins', String(consecutiveWins));

  // 记录
  betHistory.push({ time: Date.now(), bet: betAmount, result: 'win', netGain: win, balance: AppState.coins });
  if (betHistory.length > 200) betHistory.shift();
  localStorage.setItem('fbet_history', JSON.stringify(betHistory));

  // 连赢奖励
  if (consecutiveWins === 3) {
    AppState.addCoins(50, 'bet_combo_3');
    toast('🔥 三连押注胜利！额外奖励50币');
  }
  if (consecutiveWins >= 5) {
    var comboMsg = '🎰 ' + consecutiveWins + '连押注胜利！';
    if (consecutiveWins === 5) toast(comboMsg);
  }

  return win;
}

// 押注失败
function onBetLose(betAmount) {
  if (betAmount <= 0) return;
  AppState.spendCoins(betAmount, 'bet_lose');

  consecutiveLosses++;
  consecutiveWins = 0;
  localStorage.setItem('fcbetwins', '0');

  betHistory.push({ time: Date.now(), bet: betAmount, result: 'lose', netGain: -betAmount, balance: AppState.coins });
  if (betHistory.length > 200) betHistory.shift();
  localStorage.setItem('fbet_history', JSON.stringify(betHistory));

  // 连败安慰
  if (consecutiveLosses >= 3) {
    AppState.addCoins(5, 'bet_comfort');
    showAzusaSpeech('别灰心！阿梓给你一个小护身符~', 3000);
    toast('💔 连败3次...阿梓送你5币安慰一下');
  }
}

// 获取押注统计
function getBetStats() {
  var totalBets = betHistory.length;
  var wins = betHistory.filter(function(b) { return b.result === 'win'; }).length;
  var totalProfit = betHistory.reduce(function(s, b) { return s + b.netGain; }, 0);
  return { totalBets: totalBets, wins: wins, winRate: totalBets > 0 ? Math.round(wins / totalBets * 100) : 0, totalProfit: totalProfit };
}

console.log('🎲 押注系统已加载: ' + BET_OPTIONS.length + '档');
