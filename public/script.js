// DOM Elements
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const submitButton = document.getElementById('submit-btn') || chatForm.querySelector('button[type="submit"]');
const resetBtn = document.getElementById('reset-btn');
const quickChips = document.querySelectorAll('.chip-btn');

// Conversation state array for Gemini API context
// Format: [{ role: 'user' | 'model', text: string }]
const conversation = [];

// Lightweight Markdown Formatter (Bold, Italic, Lists, Line breaks)
function formatMarkdown(text) {
  if (!text) return '';

  // 1. Escape HTML to prevent XSS
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Bold (**text**) and Italic (*text*)
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // 3. Format Lists & Paragraphs
  const lines = safe.split('\n');
  let html = '';
  let inList = false;
  let listType = '';

  for (let line of lines) {
    const trimmed = line.trim();

    // Bullet points (- or * )
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        if (inList) html += `</${listType}>`;
        html += '<ul>';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${trimmed.replace(/^[-*]\s+/, '')}</li>`;
    }
    // Numbered lists (1. 2. etc.)
    else if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        if (inList) html += `</${listType}>`;
        html += '<ol>';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`;
    } else {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
        listType = '';
      }
      if (trimmed) {
        html += `<p>${trimmed}</p>`;
      }
    }
  }

  if (inList) {
    html += `</${listType}>`;
  }

  return html || safe;
}

// Appends message to chat box with sporty avatar and bubble
function appendMessage(sender, text, isHtml = false) {
  const row = document.createElement('div');
  row.classList.add('message-row', sender === 'user' ? 'user-row' : 'bot-row');

  // Avatar Icon
  const avatar = document.createElement('div');
  avatar.classList.add('row-avatar');
  avatar.textContent = sender === 'user' ? '👟' : '🎾';

  // Bubble Container
  const bubbleContainer = document.createElement('div');
  bubbleContainer.classList.add('bubble-container');

  // Sender Label
  const senderLabel = document.createElement('span');
  senderLabel.classList.add('sender-label');
  senderLabel.textContent = sender === 'user' ? 'Anda (Player)' : 'Coach Padeladict';

  // Message Bubble
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  if (isHtml) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }

  bubbleContainer.appendChild(senderLabel);
  bubbleContainer.appendChild(msg);
  row.appendChild(avatar);
  row.appendChild(bubbleContainer);
  chatBox.appendChild(row);

  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

// Shows animated sporty "Thinking..." bot indicator
function appendThinkingMessage() {
  const row = document.createElement('div');
  row.classList.add('message-row', 'bot-row');

  const avatar = document.createElement('div');
  avatar.classList.add('row-avatar');
  avatar.textContent = '🎾';

  const bubbleContainer = document.createElement('div');
  bubbleContainer.classList.add('bubble-container');

  const senderLabel = document.createElement('span');
  senderLabel.classList.add('sender-label');
  senderLabel.textContent = 'Coach Padeladict';

  const msg = document.createElement('div');
  msg.classList.add('message', 'bot');
  msg.innerHTML = `
    <div class="typing-indicator" title="Thinking...">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-text">Thinking... Meracik strategi game 🎾</span>
    </div>
  `;

  bubbleContainer.appendChild(senderLabel);
  bubbleContainer.appendChild(msg);
  row.appendChild(avatar);
  row.appendChild(bubbleContainer);
  chatBox.appendChild(row);

  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

// Display Initial Welcome Coach Message
function displayWelcomeMessage() {
  const welcomeText = `**Halo Atlet! 🎾 Selamat datang di Padeladict Coaching Zone!**\n\nSaya siap dampingi perjalanan olahragamu biar makin fit, bertenaga, dan jago di lapangan:\n- ⚡ **Rekomendasi Raket:** Temukan raket ideal sesuai level, gaya main & budget.\n- 🔥 **Drill & Skill:** Kuasai teknik smash, bandeja, vibora, hingga positioning.\n- 🏃 **Kebugaran:** Pemanasan 10 menit, drill kelincahan, dan tips stamina.\n\n*Ayo gerak, jangan mager! Mau mulai konsultasi raket atau drill latihan hari ini?* 💪🔥`;

  const botMsg = appendMessage('bot', '');
  botMsg.innerHTML = formatMarkdown(welcomeText);
}

// Form Submit Handler
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // 1. Add user's message to chat box and conversation state
  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });

  // Clear input
  userInput.value = '';

  // 2. Show temporary "Thinking..." bot message with animated dots
  const botMessageElement = appendThinkingMessage();

  // Disable controls while awaiting response
  userInput.disabled = true;
  if (submitButton) submitButton.disabled = true;

  try {
    // 3. Send POST request to /api/chat
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 4. When response arrives, replace "Thinking..." with AI's reply
    if (data && typeof data.result === 'string' && data.result.trim()) {
      botMessageElement.innerHTML = formatMarkdown(data.result);
      conversation.push({ role: 'model', text: data.result });
    } else {
      botMessageElement.textContent = 'Sorry, no response received.';
      conversation.pop(); // Remove unmatched user message to keep alternating state valid
    }
  } catch (error) {
    // 5. Error handling
    console.error('Chat error:', error);
    botMessageElement.textContent = 'Failed to get response from server.';
    conversation.pop(); // Remove unmatched user message to keep alternating state valid
  } finally {
    // Re-enable controls and refocus
    userInput.disabled = false;
    if (submitButton) submitButton.disabled = false;
    userInput.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

// Interactive Quick Prompt Chips
quickChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const promptText = chip.getAttribute('data-prompt');
    if (promptText && !userInput.disabled) {
      userInput.value = promptText;
      chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
});

// Interactive Reset / New Session Button
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    conversation.length = 0;
    chatBox.innerHTML = '';
    displayWelcomeMessage();
    userInput.value = '';
    userInput.focus();
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  displayWelcomeMessage();
  userInput.focus();
});
