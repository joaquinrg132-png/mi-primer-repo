import React, { useEffect, useState } from 'react';
import { X, Send, MessageSquare, FileSpreadsheet } from 'lucide-react';

export type ShareFilePayload = {
  type: 'BOOK' | 'SHEET';
  productId: string;
  fileName: string;
  downloadUrl: string;
};

type Conversation = {
  id: string;
  type: string;
  name: string | null;
  participants: {
    user: {
      id: string;
      name: string;
      image: string;
    }
  }[];
};

type Props = {
  currentUserId: string;
  files: ShareFilePayload[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function ShareToChatModal({ currentUserId, files, onClose, onSuccess }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConversations(data.conversations);
        }
        setLoading(false);
      });
  }, []);

  const handleSend = async () => {
    if (!selectedConvId) return;
    setSending(true);

    try {
      // Create a message for each file sequentially
      for (const file of files) {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selectedConvId,
            fileUrl: file.downloadUrl,
            fileName: file.fileName
          })
        });
      }

      onSuccess();
    } catch (e) {
      alert("Error al enviar archivos.");
    }
    setSending(false);
  };

  const getConvName = (conv: Conversation) => {
    if (conv.type === 'GROUP') return conv.name;
    const other = conv.participants.find(p => p.user.id !== currentUserId)?.user;
    return other?.name || 'Usuario';
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-window" style={{ width: 440, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        <div className="modal-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={15} style={{ color: 'var(--accent)' }} />
            <span className="modal-title">Enviar al Chat</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflow: 'hidden', minHeight: 0 }}>
          
          <div style={{ background: 'rgba(0, 112, 243, 0.05)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 112, 243, 0.2)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Se enviarán {files.length} archivo(s):
            </p>
            <div style={{ maxHeight: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <FileSpreadsheet size={12} />
                  <span style={{ fontWeight: 500 }}>{f.type === 'BOOK' ? '[Libro Completo]' : '[Hoja]'}</span>
                  <span>{f.fileName}</span>
                </div>
              ))}
            </div>
          </div>

          <label className="form-label">Selecciona el destinatario (Chat existente)</label>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 8 }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Cargando chats...</div>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No tienes conversaciones activas. Inicia una primero en la pestaña Mensajes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {conversations.map(conv => {
                  const isSelected = selectedConvId === conv.id;
                  const name = getConvName(conv);
                  return (
                    <div 
                      key={conv.id} 
                      onClick={() => setSelectedConvId(conv.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', 
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        background: isSelected ? 'rgba(0, 112, 243, 0.08)' : 'transparent',
                        border: isSelected ? '1px solid rgba(0, 112, 243, 0.2)' : '1px solid transparent'
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{conv.type === 'GROUP' ? 'Grupo' : 'Chat Directo'}</div>
                      </div>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '4px solid var(--accent)' : '1px solid var(--border-strong)' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={sending}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSend} disabled={sending || !selectedConvId}>
              {sending ? 'Enviando...' : 'Enviar al Chat'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
