import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { useSocket } from '../hooks/useSocket';
import type { ChatMessage } from '../types';
import './GlobalChat.css';

type Sock = ReturnType<typeof useSocket>;

interface Props {
  sock: Sock;
}

export default function GlobalChat({ sock }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  const messages: ChatMessage[] = sock.chatMessages;

  // Track unread
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      if (!open) {
        setUnread((u) => u + (messages.length - prevLenRef.current));
      }
    }
    prevLenRef.current = messages.length;
  }, [messages.length, open]);

  // Scroll to bottom
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  function handleSend() {
    const trimmed = msg.trim();
    if (!trimmed) return;
    sock.sendChat(trimmed);
    setMsg('');
  }

  function handleOpen() {
    setOpen(!open);
    if (!open) setUnread(0);
  }

  return (
    <div className="global-chat">
      {open && (
        <div className="chat-panel glass">
          <div className="chat-header">
            <span>{t('chat.title')}</span>
            <button className="btn btn-ghost chat-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chat-messages" ref={listRef}>
            {messages.length === 0 && (
              <p className="chat-empty">{t('chat.empty')}</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="chat-msg">
                <span className="chat-sender">{m.playerName}</span>
                <span className="chat-text">{m.message}</span>
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="input chat-input"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder={t('chat.inputPlaceholder')}
              maxLength={200}
            />
            <button className="btn btn-primary chat-send" onClick={handleSend}>{t('chat.send')}</button>
          </div>
        </div>
      )}
      <button className="btn btn-ghost chat-toggle-btn" onClick={handleOpen} title={t('chat.title')}>
        💬
        {unread > 0 && <span className="chat-badge">{unread}</span>}
      </button>
    </div>
  );
}
