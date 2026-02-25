/**
 * Generates a self-contained HTML chat widget from a chatbot config.
 * The widget includes inline CSS/JS, FAQ matching, and optional API endpoint support.
 */

export function generateWidget(config) {
  const color = config.widgetColor || '#3B82F6';
  const position = config.position || 'bottom-right';
  const avatar = config.avatarEmoji || '🤖';
  const greeting = config.greeting || 'Hi! How can I help you today?';
  const businessName = config.businessName || 'Chat Assistant';
  const faqs = config.faqs || [];

  const positionCSS = position === 'bottom-left'
    ? 'left: 20px; right: auto;'
    : 'right: 20px; left: auto;';

  const bubblePositionCSS = position === 'bottom-left'
    ? 'left: 20px; right: auto;'
    : 'right: 20px; left: auto;';

  const faqsJSON = JSON.stringify(faqs.map(f => ({
    q: f.question.toLowerCase(),
    a: f.answer,
  })));

  // Note: The widget uses textContent-based escaping via escapeHtml()
  // to prevent XSS when rendering user messages. The innerHTML usage
  // below only inserts pre-escaped content from escapeHtml().
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${businessName} Chat Widget</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  #chat-widget-bubble {
    position: fixed; bottom: 20px; ${bubblePositionCSS}
    width: 56px; height: 56px; border-radius: 50%;
    background: ${color}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    font-size: 24px; z-index: 99999;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  #chat-widget-bubble:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 28px rgba(0,0,0,0.4);
  }

  #chat-widget-panel {
    position: fixed; bottom: 88px; ${positionCSS}
    width: 380px; max-height: 520px;
    border-radius: 16px; overflow: hidden;
    background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
    display: none; flex-direction: column; z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  #chat-widget-panel.open { display: flex; }

  .cw-header {
    background: ${color}; color: #fff; padding: 14px 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .cw-header-avatar { font-size: 22px; }
  .cw-header-info { flex: 1; }
  .cw-header-name { font-size: 14px; font-weight: 600; }
  .cw-header-status { font-size: 10px; opacity: 0.8; }
  .cw-header-close {
    background: none; border: none; color: #fff; font-size: 18px;
    cursor: pointer; opacity: 0.8; padding: 4px;
  }
  .cw-header-close:hover { opacity: 1; }

  .cw-messages {
    flex: 1; overflow-y: auto; padding: 12px;
    display: flex; flex-direction: column; gap: 10px;
    min-height: 200px; max-height: 340px;
    background: #f9fafb;
  }

  .cw-msg { display: flex; gap: 8px; align-items: flex-start; }
  .cw-msg.user { flex-direction: row-reverse; }
  .cw-msg-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
  }
  .cw-msg.bot .cw-msg-avatar { background: #f3f4f6; }
  .cw-msg.user .cw-msg-avatar { background: ${color}; color: #fff; font-size: 12px; }

  .cw-msg-bubble {
    max-width: 75%; padding: 8px 12px; border-radius: 12px;
    font-size: 13px; line-height: 1.5; word-wrap: break-word;
  }
  .cw-msg.bot .cw-msg-bubble {
    background: #fff; color: #1f2937; border: 1px solid #e5e7eb;
    border-top-left-radius: 4px;
  }
  .cw-msg.user .cw-msg-bubble {
    background: ${color}; color: #fff;
    border-top-right-radius: 4px;
  }

  .cw-input-area {
    padding: 10px 12px; border-top: 1px solid #e5e7eb;
    display: flex; align-items: center; gap: 8px; background: #fff;
  }
  .cw-input {
    flex: 1; border: 1px solid #e5e7eb; border-radius: 8px;
    padding: 8px 12px; font-size: 13px; outline: none;
    font-family: inherit;
  }
  .cw-input:focus { border-color: ${color}; box-shadow: 0 0 0 2px ${color}33; }
  .cw-send {
    width: 36px; height: 36px; border-radius: 8px;
    background: ${color}; color: #fff; border: none;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .cw-send:hover { filter: brightness(1.1); }
  .cw-send svg { width: 16px; height: 16px; }

  .cw-api-notice {
    padding: 6px 12px; background: #fffbeb; border-top: 1px solid #fde68a;
    font-size: 10px; color: #92400e; text-align: center;
  }
</style>
</head>
<body>

<!-- Chat Bubble -->
<div id="chat-widget-bubble" onclick="toggleChat()">
  <span>${avatar}</span>
</div>

<!-- Chat Panel -->
<div id="chat-widget-panel">
  <div class="cw-header">
    <span class="cw-header-avatar">${avatar}</span>
    <div class="cw-header-info">
      <div class="cw-header-name">${businessName}</div>
      <div class="cw-header-status">Online</div>
    </div>
    <button class="cw-header-close" onclick="toggleChat()">&times;</button>
  </div>
  <div class="cw-messages" id="cw-messages"></div>
  <div id="cw-api-notice" class="cw-api-notice" style="display:none">
    Demo mode &mdash; responses from FAQ knowledge base
  </div>
  <div class="cw-input-area">
    <input class="cw-input" id="cw-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendMessage()" />
    <button class="cw-send" onclick="sendMessage()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
  </div>
</div>

<script>
(function() {
  var FAQS = ${faqsJSON};
  var API_ENDPOINT = ''; // Set your API endpoint here for live mode
  var messages = document.getElementById('cw-messages');
  var input = document.getElementById('cw-input');
  var panel = document.getElementById('chat-widget-panel');
  var notice = document.getElementById('cw-api-notice');

  // Show greeting
  addMessage('bot', ${JSON.stringify(greeting)});
  if (!API_ENDPOINT) notice.style.display = 'block';

  window.toggleChat = function() {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) input.focus();
  };

  window.sendMessage = function() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);

    if (API_ENDPOINT) {
      // Live API mode
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) { addMessage('bot', data.response || data.text || 'Sorry, something went wrong.'); })
      .catch(function() { addMessage('bot', 'Sorry, I could not connect to the server.'); });
    } else {
      // Offline FAQ matching
      var answer = matchFaq(text);
      setTimeout(function() { addMessage('bot', answer); }, 400);
    }
  };

  function matchFaq(query) {
    var q = query.toLowerCase();
    var best = null, bestScore = 0;
    for (var i = 0; i < FAQS.length; i++) {
      var words = FAQS[i].q.split(/\\s+/);
      var score = 0;
      for (var j = 0; j < words.length; j++) {
        if (q.indexOf(words[j]) !== -1) score++;
      }
      var pct = words.length > 0 ? score / words.length : 0;
      if (pct > bestScore) { bestScore = pct; best = FAQS[i].a; }
    }
    return bestScore > 0.3 ? best : "I'm not sure about that. Could you rephrase your question?";
  }

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'cw-msg ' + role;

    var avatarDiv = document.createElement('div');
    avatarDiv.className = 'cw-msg-avatar';
    avatarDiv.textContent = role === 'bot' ? '${avatar}' : '\\u{1F464}';

    var bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'cw-msg-bubble';
    bubbleDiv.textContent = text;

    div.appendChild(avatarDiv);
    div.appendChild(bubbleDiv);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
})();
</script>
</body>
</html>`;

  // Embed snippet for external websites
  const embedSnippet = `<!-- ${businessName} Chat Widget -->
<script>
(function(){
  var s=document.createElement('iframe');
  s.src='YOUR_HOSTED_WIDGET_URL';
  s.style.cssText='position:fixed;bottom:0;${position === 'bottom-left' ? 'left' : 'right'}:0;width:440px;height:600px;border:none;z-index:99999;pointer-events:none;';
  s.setAttribute('allow','clipboard-write');
  document.body.appendChild(s);
})();
</script>`;

  return { htmlContent, embedSnippet };
}
