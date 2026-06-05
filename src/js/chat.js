/* chat.js - AI聊天系统 (DeepSeek)
 * 依赖：core.js (AppState, sessions)
 */

var chatHistory = JSON.parse(localStorage.getItem('fchat') || '[]');
var dsApiKey = localStorage.getItem('ds_key') || '';
var chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatModal').classList.toggle('open', chatOpen);
  document.getElementById('chatFab').style.display = chatOpen ? 'none' : 'flex';
  if (chatOpen) {
    document.getElementById('chatInput').focus();
    document.getElementById('chatBadge').style.display = 'none';
    updateChatStatus();
  }
}

function updateChatStatus() {
  var el = document.getElementById('chatStatus');
  if (dsApiKey) {
    el.textContent = '🟢 AI在线';
    el.style.color = '#a5d6a7';
  } else {
    el.textContent = '⚫ 离线模式';
    el.style.color = 'rgba(255,255,255,.5)';
  }
}

function sendChat() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  addChatMsg(msg, 'user');

  var body = document.getElementById('chatBody');
  var typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;

  if (dsApiKey) {
    callDeepSeek(msg).then(function(reply) {
      typing.remove();
      addChatMsg(reply, 'azusa');
    }).catch(function() {
      typing.remove();
      addChatMsg(localReply(msg), 'azusa');
      updateChatStatus();
    });
  } else {
    setTimeout(function() {
      typing.remove();
      addChatMsg(localReply(msg), 'azusa');
    }, 800 + Math.random() * 1200);
  }
}

function addChatMsg(msg, role) {
  var body = document.getElementById('chatBody');
  var div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  if (role === 'azusa') {
    div.innerHTML = '<span class="az-avatar">😊</span> ' + msg;
  } else {
    div.textContent = msg;
  }
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;

  chatHistory.push({ role: role, msg: msg, time: Date.now() });
  if (chatHistory.length > 50) chatHistory.shift();
  localStorage.setItem('fchat', JSON.stringify(chatHistory));
}

function localReply(msg) {
  var replies = {
    '你好': ['嗨！今天也要加油哦~ ✨', '你好呀！阿梓一直在等你~', '嗨嗨！想我了吗？😊'],
    '加油': ['一起加油！阿梓相信你💪', '冲鸭！今天种几棵树？🌱', '你最棒了！阿梓为你骄傲~'],
    '累了': ['休息一下吧，阿梓陪你🌙', '累了就看看窗外，或者来我这换件衣服~', '抱抱！阿梓也有累的时候呢🥺'],
    '谢谢': ['不用谢啦~ 记得种树就好！', '嘿嘿，要谢就多种几棵树吧🌳', '阿梓收到你的心意了💕'],
    '学习': ['专注学习的样子最帅了！', '今天学什么？阿梓好奇~', '学习加油！阿梓给你泡杯虚拟咖啡☕'],
    '喜欢': ['阿梓也喜欢你！', '诶嘿~ 害羞😊', '最喜欢认真专注的你了！'],
    '今天': ['今天是美好的一天！', '今天天气不错，适合种树~', '今天你的专注记录很棒哦！'],
  };
  for (var key in replies) {
    if (msg.indexOf(key) >= 0) {
      var arr = replies[key];
      return arr[Math.floor(Math.random() * arr.length)];
    }
  }
  var defaults = ['阿梓收到你的消息了~ 快去种树吧🌱', '嗯嗯！阿梓在听~ 今天要完成什么目标？', '和你聊天真开心！别忘了今天的专注哦✨', '阿梓觉得你一定能行！先种棵树怎么样？', '嘿嘿，阿梓会一直陪着你的~'];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

async function callDeepSeek(msg) {
  var todayMins = sessions.filter(function(s) {
    return s.completed && s.date === Utils.today();
  }).reduce(function(a, s) { return a + s.minutes; }, 0);
  var dates = Array.from(new Set(sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; }))).sort();
  var streak = Utils.calcStreak(dates);

  var systemPrompt = '你是阿梓，一个可爱的VTuber，也是用户的自律伙伴。说话傲娇可爱，爱用颜文字，会撒娇也会吐槽。回复简洁（50字以内）。用户今天专注' + todayMins + '分钟，连续' + streak + '天，解锁了' + (currentTreeIdx + 1) + '件衣装。';
  var resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + dsApiKey },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: msg }
      ],
      max_tokens: 120,
      temperature: 0.9
    })
  });
  var data = await resp.json();
  if (data.choices && data.choices[0]) return data.choices[0].message.content;
  throw new Error('API error');
}

function setApiKey() {
  var key = prompt('请输入 DeepSeek API Key（在 platform.deepseek.com 获取）：\n留空则使用离线模式', dsApiKey);
  if (key !== null) {
    dsApiKey = key.trim();
    localStorage.setItem('ds_key', dsApiKey);
    updateChatStatus();
    toast(dsApiKey ? '✅ DeepSeek已连接！可以和阿梓聊天了' : '⚫ 已切换到离线模式');
  }
}
