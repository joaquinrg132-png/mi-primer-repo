import React, { useState } from 'react';
import { X, User, Lock, Mail, Phone, FileText } from 'lucide-react';

type Props = {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditUserModal({ user, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    username: user.username || '',
    name: user.name || '',
    password: '',
    role: user.role || 'EMPLOYEE',
    bio: user.bio || '',
    email: user.email || '',
    phone: user.phone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username) {
      setError('El nombre de usuario es obligatorio');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...formData })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Error al editar usuario');
      }
    } catch (e) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-window" style={{ width: 480, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="modal-titlebar">
          <span className="modal-title">Editar Usuario</span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body" style={{ padding: 24, overflowY: 'auto' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form id="edit-user-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Nombre de Usuario *</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: 34 }}
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Nombre Completo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Nueva Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    className="form-input" 
                    style={{ paddingLeft: 34 }}
                    placeholder="Dejar en blanco para no cambiar"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Rol del Sistema</label>
                <select 
                  className="form-input"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="EMPLOYEE">Empleado</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Correo Electrónico</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                  <input 
                    type="email" 
                    className="form-input" 
                    style={{ paddingLeft: 34 }}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: 34 }}
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Biografía o Puesto</label>
              <div style={{ position: 'relative' }}>
                <FileText size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                <textarea 
                  className="form-input" 
                  style={{ paddingLeft: 34, height: 80, resize: 'none' }}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
            </div>

          </form>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--bg-elevated)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" form="edit-user-form" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
