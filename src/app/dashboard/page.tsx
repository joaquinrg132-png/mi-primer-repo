"use client";

import React, { useState, useEffect, useRef } from 'react';
import ExcelUploadModal from '@/components/ExcelUploadModal';
import NetworkTab from '@/components/NetworkTab';
import MyProfile from '@/components/MyProfile';
import MessagesTab from '@/components/MessagesTab';
import ShareToChatModal, { ShareFilePayload } from '@/components/ShareToChatModal';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid, FileText, BarChart2, Settings, Search,
  Plus, Download, Trash2, LogOut, User, Users,
  RefreshCw, Database, X, FileSpreadsheet, Share2, Info, UploadCloud, MessageSquare,
  Sun, Moon, Edit2, Check, Tag
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  code: string | null;
  characteristics: string | null;
  length: string | null;
  fileUrl: string | null;
  sourceFileName: string | null;
  description: string | null;
  imageUrl: string | null;
  version: number;
  updatedAt: string;
  fileLastModified: string | null;
  updatedBy: string | null;
  category: { name: string };
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('qs_activeTab') || 'catalog';
    return 'catalog';
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePayloads, setSharePayloads] = useState<ShareFilePayload[]>([]);
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState<boolean | string>(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Inline editing in detail drawer
  const [editingField, setEditingField] = useState<'name' | 'code' | 'category' | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: session, status } = useSession();
  const router = useRouter();

  const role = (session?.user as any)?.role || 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';

  // Security: redirect if unauthenticated + prevent back button access
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  useEffect(() => {
    // On mount, push a state so back button triggers popstate
    window.history.pushState({ dashboard: true }, '');
    const handlePop = () => {
      if (status === 'authenticated') {
        window.history.pushState({ dashboard: true }, '');
      } else {
        router.replace('/');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [status, router]);

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved !== 'light';
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    fetchProducts();
    const checkUnread = async () => {
      try {
        const res = await fetch('/api/conversations');
        const data = await res.json();
        if (data.success && data.conversations) {
          setHasUnreadMessages(data.conversations.some((c: any) => c.hasUnread));
        }
      } catch (e) {}
    };
    checkUnread();
    const interval = setInterval(() => { fetchProducts(true); checkUnread(); }, 3000);
    return () => clearInterval(interval);
  }, [search, activeTab]);

  const fetchProducts = async (silent = false) => {
    if (activeTab !== 'catalog') return;
    if (!silent) setLoading(true);
    try {
      const url = search
        ? `/api/products?search=${encodeURIComponent(search)}`
        : `/api/products`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {}
    setLoading(false);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`¿Confirma la eliminación de "${product.name}"?\n\nEsta acción no se puede deshacer.`)) return;
    await fetch(`/api/products?id=${product.id}`, { method: 'DELETE' });
    if (detailProduct?.id === product.id) setDetailProduct(null);
    fetchProducts();
  };

  const handleBulkDelete = async () => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (!ids.length) return;
    if (!window.confirm(`¿Confirma la eliminación de ${ids.length} productos?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/products/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids)
      });
      if (res.ok) {
        setSelectedIds({});
        if (detailProduct && ids.includes(detailProduct.id)) setDetailProduct(null);
        fetchProducts();
      }
    } catch { alert('Error de conexión con el servidor.'); }
  };

  const handleDownload = (product: Product) => {
    const link = document.createElement('a');
    link.href = `/api/products/download-sheet?id=${product.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDownload = async () => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (!ids.length) return;
    try {
      const res = await fetch('/api/products/download-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids)
      });
      if (!res.ok) { alert('Error al generar el ZIP.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hojas_seleccionadas.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch { alert('Error de conexión.'); }
  };

  const handleBulkShare = () => {
    const selectedProducts = products.filter(p => selectedIds[p.id]);
    if (!selectedProducts.length) return;
    const newPayloads: ShareFilePayload[] = selectedProducts.map(item => ({
      type: 'SHEET',
      productId: item.id,
      fileName: `${item.name.replace(/[^a-z0-9]/gi, '_')}.xlsm`,
      downloadUrl: `/api/products/download-sheet?id=${item.id}`
    }));
    setSharePayloads(newPayloads);
    setShowShareModal(true);
  };

  // Inline edit in detail drawer
  const startEdit = (field: 'name' | 'code' | 'category') => {
    if (!detailProduct) return;
    setEditingField(field);
    setEditValue(
      field === 'name' ? detailProduct.name :
      field === 'code' ? (detailProduct.code || '') :
      detailProduct.category?.name || ''
    );
  };

  const saveEdit = async () => {
    if (!detailProduct || !editingField) return;
    try {
      const body: any = {};
      if (editingField === 'name') body.name = editValue.trim();
      if (editingField === 'code') body.code = editValue.trim();
      if (editingField === 'category') body.categoryName = editValue.trim();

      const res = await fetch(`/api/products?id=${detailProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const updated = await res.json();
        setDetailProduct(updated);
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        alert('Error al guardar cambios.');
      }
    } catch { alert('Error de conexión.'); }
    setEditingField(null);
  };

  const handleExportDB = () => {
    setExportLoading(true);
    setTimeout(() => { window.open('/api/backup/export', '_blank'); setExportLoading(false); }, 1000);
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Esta acción reemplazará toda la base de datos. ¿Está seguro?')) return;
    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const backupData = JSON.parse(ev.target?.result as string);
        const res = await fetch('/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData),
        });
        const result = await res.json();
        if (result.success) { alert('Restauración completada.'); fetchProducts(); }
        else alert('Error al restaurar: ' + result.message);
      } catch { alert('El archivo no es válido.'); }
      finally { setImportLoading(false); e.target.value = ''; }
    };
    reader.readAsText(file);
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedIds(prev => ({ ...prev, [productId]: checked }));
  };

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    products.forEach(p => { updated[p.id] = checked; });
    setSelectedIds(updated);
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const allSelected = products.length > 0 && products.every(p => selectedIds[p.id]);

  const formatDate = (product: Product) => {
    const dateStr = product.fileLastModified || product.updatedAt;
    return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
        Verificando credenciales...
      </div>
    );
  }

  const navItems = [
    { id: 'catalog',   label: 'Catálogo',      Icon: LayoutGrid },
    { id: 'messages',  label: 'Mensajes',       Icon: MessageSquare },
    ...(isAdmin ? [{ id: 'network', label: 'Directorio', Icon: Users }] : []),
    { id: 'quotes',    label: 'Cotizaciones',   Icon: FileText },
    { id: 'reports',   label: 'Reportes',       Icon: BarChart2 },
    { id: 'settings',  label: 'Configuración',  Icon: Settings },
  ];

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-name">QuoteSys</div>
          <div className="logo-sub">Gestión de Cotizaciones</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Módulos</div>
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(id);
                sessionStorage.setItem('qs_activeTab', id);
                setDetailProduct(null);
                if (id === 'messages') setHasUnreadMessages(false);
              }}
              style={{ position: 'relative' }}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
              {id === 'messages' && hasUnreadMessages && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#ef4444', boxShadow: '0 0 0 2px var(--sidebar-bg)'
                }} />
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            style={{ width: '100%', color: 'var(--status-error)' }}
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut size={15} strokeWidth={1.75} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="main-area" style={{ position: 'relative' }}>
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {activeTab === 'catalog' ? (
              <div className="search-field">
                <Search size={13} strokeWidth={2} />
                <input
                  id="catalog-search"
                  type="text"
                  placeholder="Buscar por nombre, código o categoría..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            ) : (
              <span className="topbar-title">
                {navItems.find(n => n.id === activeTab)?.label}
              </span>
            )}
          </div>

          <div className="topbar-actions">
            {isAdmin && activeTab === 'catalog' && (
              <button id="btn-nuevo-producto" className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
                <Plus size={13} strokeWidth={2.5} />
                Nueva Hoja
              </button>
            )}

            <button
              className="btn btn-ghost btn-sm"
              onClick={toggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              style={{ padding: '0 10px', gap: 6 }}
            >
              {isDark ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} style={{ color: '#6366f1' }} />}
              <span style={{ fontSize: 12 }}>{isDark ? 'Claro' : 'Oscuro'}</span>
            </button>

            <div
              className="btn btn-ghost btn-sm"
              style={{ gap: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              onClick={() => signOut({ callbackUrl: '/' })}
              role="button"
              tabIndex={0}
            >
              <User size={13} />
              <span>{session?.user?.name || session?.user?.email}</span>
              <span className="badge badge-admin" style={{ fontSize: 10 }}>
                {isAdmin ? 'ADMIN' : 'EMPLEADO'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content" style={{ paddingRight: detailProduct ? '406px' : '24px', transition: 'padding-right 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}>

          {/* ── CATALOG ── */}
          {activeTab === 'catalog' && (
            <div className="animate-in">
              <div className="section-header">
                <div>
                  <h3>Catálogo Corporativo</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {products.length} hoja{products.length !== 1 ? 's' : ''} en el catálogo
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => fetchProducts()}>
                    <RefreshCw size={13} />
                    Actualizar
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Cargando registros del servidor...
                </div>
              ) : products.length === 0 ? (
                <div className="panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No se encontraron hojas. {isAdmin && 'Utilice "Nueva Hoja" para importar.'}
                </div>
              ) : (
                <div className="panel" style={{ overflow: 'hidden' }}>
                  <table className="corp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={e => handleSelectAll(e.target.checked)}
                            style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
                          />
                        </th>
                        <th>NOMBRE DE LA HOJA</th>
                        <th style={{ width: 100 }}>CÓDIGO</th>
                        <th style={{ width: 130 }}>CATEGORÍA</th>
                        <th style={{ width: 60 }}>VER.</th>
                        <th style={{ width: 120 }}>ÚLTIMA MOD.</th>
                        <th style={{ width: 100, textAlign: 'right' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => {
                        const isSelected = !!selectedIds[p.id];
                        const isCurrentDetail = detailProduct?.id === p.id;
                        return (
                          <tr
                            key={p.id}
                            style={{
                              background: isCurrentDetail ? 'var(--accent-subtle)' : isSelected ? 'rgba(255,255,255,0.02)' : 'transparent',
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => handleSelectProduct(p.id, e.target.checked)}
                                style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
                              />
                            </td>
                            <td
                              style={{ fontWeight: 500, cursor: 'pointer' }}
                              onClick={() => setDetailProduct(p)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div>
                                  <div>{p.name}</div>
                                  {p.characteristics && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400, marginTop: 1 }}>
                                      {p.characteristics}
                                    </div>
                                  )}
                                </div>
                                <Info size={12} style={{ opacity: 0.5, color: 'var(--accent)', flexShrink: 0 }} />
                              </div>
                            </td>
                            <td>
                              {p.code ? (
                                <span className="badge badge-gray" style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.code}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-gray">{p.category?.name || 'General'}</span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>v{p.version}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                              {formatDate(p)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(p)} title="Descargar hoja">
                                  <Download size={12} />
                                </button>
                                {isAdmin && (
                                  <>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowUpload(p.sourceFileName || true)} title="Actualizar hoja">
                                      <UploadCloud size={12} />
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── QUOTES ── */}
          {activeTab === 'quotes' && (
            <div className="animate-in">
              <div className="section-header"><h3>Cotizaciones</h3></div>
              <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
                <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Módulo de cotizaciones en desarrollo.</p>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && (
            <div className="animate-in">
              <div className="section-header"><h3>Reportes y Métricas</h3></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Hojas en catálogo', value: products.length },
                  { label: 'Categorías registradas', value: new Set(products.map(p => p.category?.name)).size },
                  { label: 'Cotizaciones este mes', value: 0 },
                ].map((stat, i) => (
                  <div key={i} className="panel" style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab === 'messages' && (
            <MessagesTab currentUserId={(session?.user as any)?.id} isAdmin={isAdmin} />
          )}

          {/* ── NETWORK ── */}
          {activeTab === 'network' && (
            <NetworkTab isAdmin={isAdmin} />
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="section-header" style={{ marginBottom: 0 }}>
                <h3>Mi Perfil y Configuración</h3>
              </div>

              {session?.user && <MyProfile userId={(session.user as any).id} />}

              {isAdmin && (
                <>
                  <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Información de Cuenta
                      </span>
                    </div>
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Correo electrónico', value: session?.user?.email },
                        { label: 'Nombre de usuario', value: session?.user?.name || '—' },
                        { label: 'Nivel de acceso', value: isAdmin ? 'Administrador' : 'Empleado' },
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 180, flexShrink: 0 }}>{row.label}</span>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Database size={13} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Respaldos de Base de Datos
                      </span>
                    </div>
                    <div style={{ padding: 20 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Exporte una copia completa del catálogo o restaure el sistema desde un archivo de respaldo.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button id="btn-exportar-bd" className="btn btn-secondary" onClick={handleExportDB} disabled={exportLoading}>
                          <Download size={13} />
                          {exportLoading ? 'Generando...' : 'Exportar Respaldo (.json)'}
                        </button>
                        <label htmlFor="import-backup-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                          <Database size={13} />
                          {importLoading ? 'Restaurando...' : 'Importar Respaldo'}
                          <input
                            id="import-backup-input"
                            ref={importRef}
                            type="file"
                            accept=".json"
                            onChange={handleImportDB}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* ── Barra de Acciones Masivas ── */}
        {selectedCount > 0 && activeTab === 'catalog' && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            left: 'calc(50% + 110px)',
            transform: 'translateX(-50%)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 300,
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
            </span>

            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleBulkDownload}>
                <Download size={13} />
                Descargar hojas seleccionadas
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleBulkShare}>
                <Share2 size={13} />
                Compartir en Chat
              </button>
              {isAdmin && (
                <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                  <Trash2 size={13} />
                  Eliminar
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds({})} style={{ minWidth: 'auto', padding: '0 8px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Panel de Detalle Lateral ── */}
        <div style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 390,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          transform: detailProduct ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {detailProduct && (
            <>
              {/* Header Drawer */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)'
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ficha Técnica de Producto
                </span>
                <button className="modal-close" onClick={() => setDetailProduct(null)} style={{ width: 24, height: 24 }}>
                  <X size={14} />
                </button>
              </div>

              {/* Body Drawer */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Imagen */}
                <div style={{
                  width: '100%', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: '#ffffff', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 180, padding: 16,
                }}>
                  <img
                    key={detailProduct.id}
                    src={`/api/products/image?id=${detailProduct.id}&t=${detailProduct.updatedAt}`}
                    alt={detailProduct.name}
                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/product_placeholder.svg'; }}
                  />
                </div>

                {/* Categoría (editable) */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Categoría</div>
                  {editingField === 'category' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', flex: 1 }}
                        autoFocus onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingField(null); }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}><Check size={12} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingField(null)}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-blue">{detailProduct.category?.name || 'General'}</span>
                      <button className="btn btn-ghost" style={{ padding: 3, height: 'auto', opacity: 0.5 }} onClick={() => startEdit('category')}><Edit2 size={11} /></button>
                    </div>
                  )}
                </div>

                {/* Nombre (editable) */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Nombre</div>
                  {editingField === 'name' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', flex: 1 }}
                        autoFocus onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingField(null); }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}><Check size={12} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingField(null)}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {detailProduct.name}
                      </h3>
                      <button className="btn btn-ghost" style={{ padding: 3, height: 'auto', opacity: 0.5 }} onClick={() => startEdit('name')}><Edit2 size={11} /></button>
                    </div>
                  )}
                  {detailProduct.characteristics && (
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                      {detailProduct.characteristics}
                    </p>
                  )}
                  {detailProduct.length && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Longitud:</span> {detailProduct.length}
                    </p>
                  )}
                </div>

                {/* Código (editable) */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Código</div>
                  {editingField === 'code' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', flex: 1, fontFamily: 'monospace' }}
                        autoFocus onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingField(null); }}
                        placeholder="Ej: P-001"
                      />
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}><Check size={12} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingField(null)}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {detailProduct.code || <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin código asignado</span>}
                      </span>
                      <button className="btn btn-ghost" style={{ padding: 3, height: 'auto', opacity: 0.5 }} onClick={() => startEdit('code')}><Edit2 size={11} /></button>
                    </div>
                  )}
                </div>

                <div className="divider" style={{ margin: 0 }} />

                {/* Metadatos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 600 }}>
                    Información del Archivo
                  </h4>
                  {[
                    { label: 'Versión', value: `v${detailProduct.version}`, mono: true },
                    {
                      label: 'Última modificación',
                      value: detailProduct.fileLastModified
                        ? new Date(detailProduct.fileLastModified).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
                        : new Date(detailProduct.updatedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
                    },
                    { label: 'Actualizado por', value: detailProduct.updatedBy || 'Sistema' },
                  ].map((meta, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{meta.label}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: meta.mono ? 'monospace' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>
                        {meta.value}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

              {/* Footer Drawer */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleDownload(detailProduct)}
                >
                  <Download size={16} /> Descargar Hoja
                </button>
                {isAdmin && (
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0 12px', marginTop: 10, width: '100%' }}
                    onClick={() => handleDelete(detailProduct)}
                  >
                    <Trash2 size={14} /> Eliminar del Catálogo
                  </button>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {showUpload !== false && (
        <ExcelUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchProducts(); }}
          syncTargetBook={typeof showUpload === 'string' ? showUpload : undefined}
        />
      )}

      {showShareModal && (
        <ShareToChatModal
          currentUserId={(session?.user as any)?.id}
          files={sharePayloads}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => { setShowShareModal(false); setSelectedIds({}); }}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
