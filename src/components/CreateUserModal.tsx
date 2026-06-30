import React, { useState, useRef } from 'react';
import { UserPlus, User, Lock, Mail, FileText, Phone, Camera, X, AlertCircle } from 'lucide-react';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateUserModal({ onClose, onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convierte la imagen a base64 para enviar como URL de datos
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPhotoUrl(result);
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, password, role, bio, email, phone, image: photoUrl || undefined })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Error al crear usuario');
        setLoading(false);
      }
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  };

  const avatarSrc = photoPreview || `https://api.dicebear.com/7.x/notionists/svg?seed=${username || 'nuevo'}&backgroundColor=b6e3f4`;

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-window" style={{ width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={15} style={{ color: 'var(--accent)' }} />
            <span className="modal-title">Registrar Nuevo Usuario</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">
          {/* Foto de perfil */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <img
                src={avatarSrc}
                alt="Foto de perfil"
                style={{
                  width: 90, height: 90, borderRadius: '50%',
                  border: '3px solid var(--border-default)',
                  objectFit: 'cover', background: 'var(--bg-muted)'
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent)', border: '2px solid var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff'
                }}
                title="Subir foto"
              >
                <Camera size={13} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Haz clic en el ícono de cámara para subir foto
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--status-error)', marginBottom: 16,
            }}>
              <AlertCircle size={14} strokeWidth={2.5} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {/* Nombre completo */}
            <div>
              <label className="form-label">Nombre Completo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Juan Pérez"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Usuario y contraseña en fila */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">Usuario (Login)</label>
                <div style={{ position: 'relative' }}>
                  <User size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 30 }}
                    placeholder="juanperez"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: 30 }}
                    placeholder="Contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Correo y Teléfono en fila */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">Correo Electrónico</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: 30 }}
                    placeholder="correo@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    className="form-input"
                    style={{ paddingLeft: 30 }}
                    placeholder="+52 33 1234 5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Rol */}
            <div>
              <label className="form-label">Rol del Usuario</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="EMPLOYEE">Empleado (Solo ver y descargar)</option>
                <option value="ADMIN">Administrador (Puede editar y borrar)</option>
              </select>
            </div>

            {/* Biografía */}
            <div>
              <label className="form-label">Biografía Breve</label>
              <div style={{ position: 'relative' }}>
                <FileText size={13} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                <textarea
                  className="form-input"
                  style={{ paddingLeft: 30, minHeight: 56, resize: 'none' }}
                  placeholder="Analista de cotizaciones corporativas..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
