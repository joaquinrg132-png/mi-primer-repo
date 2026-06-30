import React, { useEffect, useState } from 'react';
import { X, Search, Users, MessageSquare } from 'lucide-react';

type User = {
  id: string;
  name: string;
  username: string;
  image: string;
  role: string;
  status: string;
  lastSeen: string;
};

type Props = {
  currentUserId: string;
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
};

export default function NewChatModal({ currentUserId, onClose, onSuccess }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Filter out current user
          setUsers(data.users.filter((u: User) => u.id !== currentUserId));
        }
        setLoading(false);
      });
  }, [currentUserId]);

  const toggleUser = (id: string) => {
    if (!isGroup) {
      setSelectedIds([id]);
    } else {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    }
  };

  const handleCreate = async () => {
    if (selectedIds.length === 0) return;
    if (isGroup && selectedIds.length < 1) return;
    if (isGroup && !groupName.trim()) {
      alert("Ingrese un nombre para el grupo");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isGroup ? 'GROUP' : 'DIRECT',
          name: isGroup ? groupName : null,
          participantIds: selectedIds
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.conversation.id);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error de red");
    }
    setCreating(false);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-window" style={{ width: 440, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        <div className="modal-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={15} style={{ color: 'var(--accent)' }} />
            <span className="modal-title">Nueva Conversación</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', gap: 8, background: 'var(--bg-elevated)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button 
              className="btn" 
              style={{ flex: 1, justifyContent: 'center', background: !isGroup ? 'var(--bg-body)' : 'transparent', boxShadow: !isGroup ? 'var(--shadow-sm)' : 'none' }}
              onClick={() => { setIsGroup(false); setSelectedIds(selectedIds.slice(0, 1)); }}
            >
              Chat Directo
            </button>
            <button 
              className="btn" 
              style={{ flex: 1, justifyContent: 'center', background: isGroup ? 'var(--bg-body)' : 'transparent', boxShadow: isGroup ? 'var(--shadow-sm)' : 'none' }}
              onClick={() => setIsGroup(true)}
            >
              Nuevo Grupo
            </button>
          </div>

          {isGroup && (
            <div>
              <label className="form-label">Nombre del Grupo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Ventas 2024"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
              />
            </div>
          )}

          <div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar usuario..."
                style={{ paddingLeft: 34 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 8 }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Cargando directorio...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No se encontraron usuarios</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredUsers.map(user => {
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      onClick={() => toggleUser(user.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', 
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        background: isSelected ? 'rgba(0, 112, 243, 0.08)' : 'transparent',
                        border: isSelected ? '1px solid rgba(0, 112, 243, 0.2)' : '1px solid transparent'
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img src={user.image} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-muted)' }} />
                        {user.status === 'ONLINE' && (
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--status-success)', border: '2px solid var(--bg-surface)' }} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          @{user.username} {user.status !== 'ONLINE' && user.lastSeen ? `· últ. vez ${new Date(user.lastSeen).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}` : ''}
                        </div>
                      </div>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '4px solid var(--accent)' : '1px solid var(--border-strong)' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={creating}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating || selectedIds.length === 0}>
              {creating ? 'Iniciando...' : 'Iniciar Chat'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
