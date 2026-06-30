"use client";

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, Loader, FileSpreadsheet } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', { redirect: false, username, password });
    if (result?.error) {
      setError('Credenciales no válidas. Verifique su usuario y contraseña.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── LEFT: Corporate Branding Panel ── */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(145deg, #0b1120 0%, #0f172a 50%, #111e38 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '52px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Decorative grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Decorative glow */}
        <div style={{
          position: 'absolute',
          top: -120, left: -120,
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(29,110,234,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -80, right: -80,
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 72 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #1d6eea, #6366f1)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(29,110,234,0.4)',
            }}>
              <FileSpreadsheet size={18} color="white" strokeWidth={2} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>QuoteSys</span>
          </div>

          <h1 style={{
            fontSize: '2.4rem', fontWeight: 800, color: '#f8fafc',
            lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.03em'
          }}>
            Sistema de<br />Cotizaciones<br />
            <span style={{ background: 'linear-gradient(90deg, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Corporativo
            </span>
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.75, maxWidth: 310 }}>
            Plataforma centralizada para la gestión del catálogo de productos, generación de cotizaciones y control de documentos Excel.
          </p>
        </div>

        {/* Features */}
        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            'Catálogo de productos con hojas Excel',
            'Acceso por roles: Empleado y Administrador',
            'Mensajería y colaboración interna',
            'Base de datos centralizada en la nube',
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(29,110,234,0.2)',
                border: '1px solid rgba(29,110,234,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Bottom tag */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 32 }}>
          <span style={{ fontSize: 11, color: '#475569', letterSpacing: '0.06em' }}>
            ACCESO RESTRINGIDO · PERSONAL AUTORIZADO
          </span>
        </div>
      </div>

      {/* ── RIGHT: Login Form Panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '48px',
        position: 'relative',
      }}>
        {/* Subtle background pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.5,
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: '#1d6eea', textTransform: 'uppercase', marginBottom: 8 }}>
              Bienvenido de vuelta
            </p>
            <h2 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em', color: '#0f172a', lineHeight: 1.2 }}>
              Iniciar Sesión
            </h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 28,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13, color: '#ef4444',
                }}>
                  <AlertCircle size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Nombre de Usuario
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    id="login-username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    style={{
                      width: '100%', height: 42,
                      paddingLeft: 36, paddingRight: 12,
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 14, color: '#0f172a',
                      background: '#f8fafc',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#1d6eea')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{
                      width: '100%', height: 42,
                      paddingLeft: 36, paddingRight: 12,
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 14, color: '#0f172a',
                      background: '#f8fafc',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#1d6eea')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                id="btn-login"
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 44,
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1d6eea, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 4,
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(29,110,234,0.35)',
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? (
                  <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
                ) : (
                  'Acceder al Sistema'
                )}
              </button>
            </form>
          </div>

          <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            Para recuperar acceso, contacte al administrador.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #cbd5e1; }
      `}</style>
    </div>
  );
}
