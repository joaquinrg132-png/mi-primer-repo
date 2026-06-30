import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Calendar, Mail, Phone, Camera, Activity } from 'lucide-react';

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
  status: string;
  lastSeen: string;
  createdAt: string;
};

export default function MyProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const me = data.users.find((u: any) => u.id === userId);
          if (me) setUser(me);
        }
      });
  };

  useEffect(() => {
    fetchProfile();
    // Ping lastSeen every minute
    const interval = setInterval(() => {
      if (user && user.status === 'ONLINE') {
        fetch('/api/users/profile', { method: 'POST' });
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [userId, user?.status]);

  const handleStatusChange = async (newStatus: string) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, status: newStatus } : null);
    await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchProfile();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Usar el endpoint de upload general
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        // Actualizar el perfil
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: data.fileUrl })
        });
        fetchProfile();
      } else {
        alert('Error al subir imagen');
      }
    } catch (err) {
      alert('Error de conexión');
    }
    setUploadingImage(false);
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 360, width: '100%', marginBottom: 32 }}>
      <div style={{
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
          {user.role === 'ADMIN' ? (
            <span className="badge badge-accent" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)' }}>
              <ShieldCheck size={12} style={{ marginRight: 4 }} /> Admin
            </span>
          ) : (
            <span className="badge badge-gray" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)' }}>
              Empleado
            </span>
          )}
        </div>

        {/* Avatar & Content */}
        <div style={{ padding: '0 20px 20px', position: 'relative', marginTop: -40 }}>
          
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <img 
              src={user.image || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}&backgroundColor=b6e3f4`}
              alt={user.name}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                border: '4px solid var(--bg-elevated)',
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                objectFit: 'cover',
                opacity: uploadingImage ? 0.5 : 1
              }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: 4, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff', border: '2px solid var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}
              title="Cambiar foto de perfil"
            >
              <Camera size={14} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {user.name}
            </h3>
            <select
              value={user.status}
              onChange={e => handleStatusChange(e.target.value)}
              style={{
                background: user.status === 'ONLINE' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-muted)',
                color: user.status === 'ONLINE' ? 'var(--status-success)' : 'var(--text-secondary)',
                border: 'none', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', outline: 'none'
              }}
            >
              <option value="ONLINE">En línea</option>
              <option value="OFFLINE">Desconectado</option>
            </select>
          </div>

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
        </div>
      </div>
    </div>
  );
}
