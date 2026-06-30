import React, { useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, Calendar, Trash2, Phone, Mail, Edit3 } from 'lucide-react';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';

type UserProfile = {
  id: string;
  username: string;
  name: string;
  role: string;
  bio: string | null;
  phone: string | null;
  email: string | null;
  image: string | null;
  coverImage: string | null;
  createdAt: string;
};

export default function NetworkTab({ isAdmin }: { isAdmin: boolean }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Error al cargar usuarios:', e);
    }
    setLoading(false);
  };

  const handleDelete = async (user: UserProfile) => {
    if (!window.confirm(`¿Eliminar al usuario "@${user.username}"?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || 'Error al eliminar usuario');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Directorio de Personal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Conoce a los miembros del equipo y sus roles en la plataforma.
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <UserPlus size={16} />
            Añadir Usuario
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 64 }}>Cargando directorio...</div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 24 
        }}>
          {users.map(user => (
            <div key={user.id} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }}>
              {/* Cover Image */}
              <div style={{
                height: 100,
                width: '100%',
                backgroundImage: `url(${user.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />

              {/* Role Badge */}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                {user.role === 'ADMIN' && (
                  <span className="badge badge-accent" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)' }}>
                    <ShieldCheck size={12} style={{ marginRight: 4 }} /> Admin
                  </span>
                )}
              </div>

              {/* Avatar & Content */}
              <div style={{ padding: '0 20px 20px', position: 'relative', marginTop: -40 }}>
                <img 
                  src={user.image || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}&backgroundColor=b6e3f4`}
                  alt={user.name}
                  style={{
                    width: 80, height: 80, borderRadius: '50%',
                    border: '4px solid var(--bg-elevated)',
                    background: '#fff',
                    marginBottom: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {user.name}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  @{user.username}
                </p>

                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                  {user.bio || 'Miembro del equipo.'}
                </p>

                {(user.email || user.phone) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                    {user.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <Mail size={12} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                      </div>
                    )}
                    {user.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <Phone size={12} />
                        {user.phone}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <Calendar size={13} />
                  Se unió el {new Date(user.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>

                {isAdmin && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 16, paddingTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit3 size={13} />
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleDelete(user)}
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateUserModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserModal 
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
