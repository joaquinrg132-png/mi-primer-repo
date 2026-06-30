"use client";
import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{user: string, text: string, time: string}[]>([]);
  const [input, setInput] = useState('');

  // Simular historial
  useEffect(() => {
    setMessages([
      { user: 'Admin', text: 'Bienvenido al chat de equipo.', time: '10:00 AM' },
      { user: 'Ventas 1', text: '¿Alguien tiene el precio actualizado del arnés?', time: '11:42 AM' }
    ]);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, {
      user: 'Tú',
      text: input,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);
    setInput('');
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setIsOpen(true)}>
        <MessageSquare size={24} />
      </button>

      {isOpen && (
        <div className="chat-window glass-panel animate-fade-in">
          <div className="chat-header">
            <h4>Chat de Empleados</h4>
            <button className="icon-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.user === 'Tú' ? 'message-own' : ''}`}>
                <span className="msg-user">{msg.user}</span>
                <div className="msg-bubble">
                  {msg.text}
                </div>
                <span className="msg-time">{msg.time}</span>
              </div>
            ))}
          </div>
          
          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Escribe un mensaje..." 
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary send-btn">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        .chat-fab {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--gradient-primary);
          color: white;
          border: none;
          box-shadow: var(--shadow-md), 0 0 15px var(--accent-glow);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
          z-index: 50;
        }
        .chat-fab:hover { transform: scale(1.1); }
        
        .chat-window {
          position: fixed;
          bottom: 6rem;
          right: 2rem;
          width: 350px;
          height: 500px;
          display: flex;
          flex-direction: column;
          z-index: 50;
          overflow: hidden;
        }
        .chat-header {
          padding: 1rem;
          background: rgba(255,255,255,0.05);
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chat-header h4 { margin: 0; font-size: 1rem; }
        .icon-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; }
        
        .chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .message {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: 80%;
        }
        .message-own {
          align-self: flex-end;
          align-items: flex-end;
        }
        .msg-user { font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
        .msg-bubble {
          background: var(--bg-color-secondary);
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border-top-left-radius: 0;
          font-size: 0.875rem;
          border: 1px solid var(--glass-border);
        }
        .message-own .msg-bubble {
          background: var(--accent-color);
          color: white;
          border-top-left-radius: 12px;
          border-top-right-radius: 0;
          border-color: transparent;
        }
        .msg-time { font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.25rem; }
        
        .chat-input-area {
          padding: 1rem;
          border-top: 1px solid var(--glass-border);
          display: flex;
          gap: 0.5rem;
        }
        .send-btn { padding: 0.5rem 1rem; border-radius: var(--border-radius); }
      `}</style>
    </>
  );
}
