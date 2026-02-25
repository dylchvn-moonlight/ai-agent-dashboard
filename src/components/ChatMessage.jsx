import React from 'react';
import { Bot, User } from 'lucide-react';

/**
 * Reusable chat message bubble for user/assistant messages.
 */
export default function ChatMessage({ role, text, createdAt }) {
  const isUser = role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-[var(--glass)] text-[var(--blue)]'
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-md'
            : 'bg-[var(--glass)] text-[var(--tx)] border border-[var(--glassBd)] rounded-tl-md'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
