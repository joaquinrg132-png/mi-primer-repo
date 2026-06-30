import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Users, Paperclip, Send, FileSpreadsheet, Download, Plus, Trash2, MoreVertical } from 'lucide-react';
import NewChatModal from './NewChatModal';

type Message = {
  id: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  senderId: string;
  createdAt: string;
  isDeleted?: boolean;
  sender: {
    id: string;
    name: string;
    username: string;
    image: string;
  }
};

// ────────────────────────────────────────────────────────
// UserAvatar: shows profile photo or colored initials fallback
function UserAvatar({ name, image, size = 44, status }: { name: string; image: string | null; size?: number; status?: string }) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {image ? (
        <img src={image} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.style && ((e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'); }} />
      ) : null}
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: image ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>
        {initials}
      </div>
      {status === 'ONLINE' && (
        <div style={{ position: 'absolute', bottom: 2, right: 0, width: size * 0.27, height: size * 0.27, borderRadius: '50%', background: 'var(--status-success)', border: '2.5px solid var(--bg-surface)' }} />
      )}
    </div>
  );
}

// MessageBubble: self-contained component with own hover state
// ────────────────────────────────────────────────────────
function MessageBubble({
  msg, isMe, isAdmin, showSenderInfo, canDeleteForAll, openMenuId, setOpenMenuId, onDelete
}: {
  msg: Message;
  isMe: boolean;
  isAdmin: boolean;
  showSenderInfo: boolean;
  canDeleteForAll: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onDelete: (id: string, type: 'me' | 'all') => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isMenuOpen = openMenuId === msg.id;
  const showMenu = isMe || isAdmin;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showSenderInfo && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 12 }}>
          {msg.sender.name}
        </span>
      )}

      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
        {/* Bubble */}
        <div style={{
          maxWidth: 400,
          background: msg.isDeleted ? 'transparent' : (isMe ? '#3b82f6' : 'var(--bg-elevated)'),
          color: msg.isDeleted ? 'var(--text-muted)' : (isMe ? '#fff' : 'var(--text-primary)'),
          border: `1px solid ${msg.isDeleted ? 'var(--border-subtle)' : (isMe ? '#3b82f6' : 'var(--border-subtle)')}`,
          padding: '9px 14px',
          borderRadius: 18,
          borderTopRightRadius: isMe ? 4 : 18,
          borderTopLeftRadius: isMe ? 18 : 4,
          boxShadow: msg.isDeleted ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
          wordBreak: 'break-word',
          fontStyle: msg.isDeleted ? 'italic' : 'normal'
        }}>
          {msg.isDeleted ? (
            <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.6 }}>🚫 Este mensaje fue eliminado</span>
            </div>
          ) : (
            <>
              {msg.content && (
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.content}</div>
              )}
              {msg.fileUrl && (
                <div style={{
                  marginTop: msg.content ? 8 : 0,
                  padding: 10,
                  background: isMe ? 'rgba(0,0,0,0.12)' : 'var(--bg-body)',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <FileSpreadsheet size={20} style={{ color: isMe ? '#fff' : '#3b82f6', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {msg.fileName}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>Archivo Excel</div>
                  </div>
                  <a
                    href={msg.fileUrl} download target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: '50%',
                      background: isMe ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
                      color: isMe ? '#fff' : 'var(--text-primary)', flexShrink: 0,
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={12} />
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* ⋮ Menu button — always rendered, visibility toggled */}
        {showMenu && !msg.isDeleted && (
          <div data-msg-menu="true" style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26,
                background: isMenuOpen ? 'var(--bg-elevated)' : 'transparent',
                border: `1px solid ${isMenuOpen ? 'var(--border-subtle)' : 'transparent'}`,
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                visibility: (hovered || isMenuOpen) ? 'visible' : 'hidden',
                transition: 'background 0.15s'
              }}
            >
              <MoreVertical size={14} />
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 30,
                  [isMe ? 'right' : 'left']: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  zIndex: 100, minWidth: 175, overflow: 'hidden'
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                <button
                  onMouseDown={() => onDelete(msg.id, 'me')}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '11px 16px', background: 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border-subtle)',
                    fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Eliminar para mí
                </button>
                {canDeleteForAll && (
                  <button
                    onMouseDown={() => onDelete(msg.id, 'all')}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '11px 16px', background: 'transparent',
                      border: 'none', fontSize: 13, color: '#ef4444', cursor: 'pointer'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Eliminar para todos
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

type Conversation = {
  id: string;
  type: string;
  name: string | null;
  updatedAt: string;
  participants: {
    user: {
      id: string;
      name: string;
      username: string;
      image: string;
      status: string;
      lastSeen: string;
    }
  }[];
  messages: Message[];
};

export default function MessagesTab({ currentUserId, isAdmin }: { currentUserId: string, isAdmin: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('qs_activeConvId');
    return null;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Wrapper to also persist to sessionStorage
  const setActiveConvId = (id: string | null) => {
    setActiveConvIdState(id);
    if (id) sessionStorage.setItem('qs_activeConvId', id);
    else sessionStorage.removeItem('qs_activeConvId');
  };

  const menuRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages?conversationId=${convId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations();
      if (activeConvId) {
        fetchMessages(activeConvId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  // When clicking a conversation
  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConvId) return;

    const content = inputText;
    setInputText('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConvId, content })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        fetchConversations();
      }
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId) return;
    if (!confirm('¿Eliminar esta conversación y todos sus mensajes para siempre?')) return;
    try {
      const res = await fetch(`/api/conversations?id=${activeConvId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActiveConvId(null);
        fetchConversations();
      } else {
        alert(data.error || 'Error al eliminar');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleDeleteMessage = async (msgId: string, type: 'me' | 'all') => {
    // Close the menu immediately so UI is clean
    setOpenMenuId(null);
    
    const label = type === 'all' ? '¿Eliminar este mensaje para todos?' : '¿Eliminar este mensaje solo para ti?';
    if (!confirm(label)) return;
    
    try {
      const res = await fetch(`/api/messages?id=${msgId}&type=${type}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        fetchConversations();
      } else {
        alert(data.error || 'Error al eliminar');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  // Close menu when clicking outside — use mousedown for reliability
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-msg-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (uploadData.success) {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeConvId,
            fileUrl: uploadData.fileUrl,
            fileName: uploadData.fileName
          })
        });
        const data = await res.json();
        if (data.success) {
          setMessages(prev => [...prev, data.message]);
          fetchConversations();
        }
      } else {
        alert("Error al subir archivo");
      }
    } catch (error) {
      alert("Error de conexión");
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  
  const getConvNameAndImage = (conv: Conversation) => {
    if (conv.type === 'GROUP') {
      return { name: conv.name, image: null, isGroup: true };
    }
    const other = conv.participants.find(p => p.user.id !== currentUserId)?.user;
    return { name: other?.name || 'Usuario', image: other?.image, isGroup: false, status: other?.status, lastSeen: other?.lastSeen };
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-body)' }}>
      {/* ── SIDEBAR (Chats List) ── */}
      <div style={{ width: 320, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Mensajes</h2>
          <button className="btn btn-primary btn-sm" style={{ padding: '0 8px' }} onClick={() => setShowNewChat(true)}>
            <Plus size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No tienes conversaciones aún. Empieza una nueva.
            </div>
          ) : (
            conversations.map(conv => {
              const { name, image, isGroup } = getConvNameAndImage(conv);
              const lastMsg = conv.messages[0];
              const isActive = conv.id === activeConvId;

              return (
                <div 
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(0, 112, 243, 0.05)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  {isGroup ? (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                      <Users size={20} />
                    </div>
                  ) : (
                    <UserAvatar name={name!} image={image || null} size={44} status={getConvNameAndImage(conv).status} />
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                        </span>
                        {(conv as any).hasUnread && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: 13, 
                      color: (conv as any).hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)', 
                      fontWeight: (conv as any).hasUnread ? 600 : 400, 
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontStyle: lastMsg?.isDeleted ? 'italic' : 'normal',
                      opacity: lastMsg?.isDeleted ? 0.6 : 1
                    }}>
                      {lastMsg ? (lastMsg.isDeleted ? '🚫 Este mensaje fue eliminado' : (lastMsg.content ? lastMsg.content : `📎 ${lastMsg.fileName}`)) : 'Nuevo chat'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-body)' }}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 12 }}>
              {getConvNameAndImage(activeConv).isGroup ? (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Users size={20} />
                </div>
              ) : (
                <UserAvatar
                  name={getConvNameAndImage(activeConv).name || ''}
                  image={getConvNameAndImage(activeConv).image || null}
                  size={40}
                  status={getConvNameAndImage(activeConv).status}
                />
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getConvNameAndImage(activeConv).name}
                </h3>
                {activeConv.type === 'GROUP' ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {activeConv.participants.length} participantes
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {getConvNameAndImage(activeConv).status === 'ONLINE' ? (
                      <span style={{ color: 'var(--status-success)', fontWeight: 500 }}>En línea</span>
                    ) : (
                      getConvNameAndImage(activeConv).lastSeen 
                        ? `Últ. vez ${new Date(getConvNameAndImage(activeConv).lastSeen!).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}`
                        : 'Desconectado'
                    )}
                  </span>
                )}
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ color: 'var(--text-muted)' }}
                  onClick={handleDeleteConversation}
                  title="Eliminar conversación"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUserId;
                const showSenderInfo = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                const minutesOld = (new Date().getTime() - new Date(msg.createdAt).getTime()) / 60000;
                const canDeleteForAll = isAdmin || (isMe && minutesOld <= 10);

                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={isMe}
                    isAdmin={isAdmin}
                    showSenderInfo={showSenderInfo}
                    canDeleteForAll={canDeleteForAll}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onDelete={handleDeleteMessage}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button 
                  type="button"
                  className="btn btn-ghost" 
                  style={{ padding: '0 12px', height: 44 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Adjuntar archivo Excel"
                >
                  <Paperclip size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ flex: 1, height: 44, borderRadius: 'var(--radius-full)' }}
                  placeholder="Escribe un mensaje..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ height: 44, width: 44, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
                  disabled={!inputText.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <MessageSquare size={32} style={{ color: 'var(--border-strong)' }} />
            </div>
            <h3 style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 8 }}>Tus Mensajes</h3>
            <p style={{ fontSize: 14 }}>Selecciona una conversación o crea una nueva.</p>
          </div>
        )}
      </div>

      {showNewChat && (
        <NewChatModal 
          currentUserId={currentUserId}
          onClose={() => setShowNewChat(false)}
          onSuccess={(convId) => {
            setShowNewChat(false);
            setActiveConvId(convId);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
}
