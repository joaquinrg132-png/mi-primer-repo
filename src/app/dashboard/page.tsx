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
  Plus, Download, Trash2, ChevronDown, ChevronRight, LogOut, User, Users,
  RefreshCw, Database, ShieldCheck, X, FileSpreadsheet, Share2, Info, UploadCloud, MessageSquare,
  Sun, Moon
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  characteristics: string | null;
  length: string | null;
  fileUrl: string | null;
  sourceFileName: string | null;
  description: string | null;
  imageUrl: string | null;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  category: { name: string };
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('qs_activeTab') || 'catalog';
    }
    return 'catalog';
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePayloads, setSharePayloads] = useState<ShareFilePayload[]>([]);
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState<boolean | string>(false);
  const [secretKey, setSecretKey] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Renaming state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  
  const [renamingBookName, setRenamingBookName] = useState<string | null>(null);
  const [renameBookValue, setRenameBookValue] = useState('');

  const importRef = useRef<HTMLInputElement>(null);

  // Nuevos estados para la vista agrupada, selección y panel lateral
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Usar rutas relativas de Next.js (funciona en local y en Vercel)
  const apiBase = '';

  const role = (session?.user as any)?.role || 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  // Theme initialization from localStorage
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
          const unread = data.conversations.some((c: any) => c.hasUnread);
          setHasUnreadMessages(unread);
        }
      } catch (e) {}
    };
    checkUnread();

    // Auto-refresco rápido (Simulación de tiempo real / onSnapshot)
    const interval = setInterval(() => {
      fetchProducts(true);
      checkUnread();
    }, 2000);
    return () => clearInterval(interval);
  }, [search, activeTab]);

  const fetchProducts = async (silent = false) => {
    if (activeTab !== 'catalog') return;
    if (!silent) setLoading(true);
    try {
      const url = search
        ? `${apiBase}/api/products?search=${encodeURIComponent(search)}`
        : `${apiBase}/api/products`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data);
      // Los grupos quedan colapsados por defecto; el usuario los abre con clic
    } catch (err) {
      // Ignorar errores de red silenciosamente durante el auto-refresco
    }
    setLoading(false);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`¿Confirma la eliminación de "${product.name}"?\n\nEsta acción no se puede deshacer.`)) return;
    await fetch(`${apiBase}/api/products?id=${product.id}`, { method: 'DELETE' });
    if (detailProduct?.id === product.id) setDetailProduct(null);
    fetchProducts();
  };

  const handleBulkDelete = async () => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (!ids.length) return;
    if (!window.confirm(`¿Confirma la eliminación en lote de los ${ids.length} productos seleccionados?\n\nEsta acción no se puede deshacer.`)) return;
    
    try {
      const res = await fetch(`${apiBase}/api/products/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids)
      });
      if (res.ok) {
        setSelectedIds({});
        // Si el producto en detalle fue eliminado, cerrar el panel
        if (detailProduct && ids.includes(detailProduct.id)) {
          setDetailProduct(null);
        }
        fetchProducts();
      } else {
        alert('Ocurrió un error al eliminar los elementos seleccionados.');
      }
    } catch {
      alert('Error de conexión con el servidor.');
    }
  };

  const handleBulkShare = () => {
    const selectedProducts = products.filter(p => selectedIds[p.id]);
    if (!selectedProducts.length) return;

    const newPayloads: ShareFilePayload[] = [];
    
    // Group selected products by groupName (sourceFileName or default)
    const groupedSelected = selectedProducts.reduce((acc, p) => {
      const gName = p.sourceFileName || 'Sin clasificar';
      if (!acc[gName]) acc[gName] = [];
      acc[gName].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    // Group ALL products to know the total size of each group
    const groupedTotal = products.reduce((acc, p) => {
      const gName = p.sourceFileName || 'Sin clasificar';
      if (!acc[gName]) acc[gName] = [];
      acc[gName].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    for (const gName of Object.keys(groupedSelected)) {
      const selectedCount = groupedSelected[gName].length;
      const totalCount = groupedTotal[gName]?.length || 0;

      // If all items in this group are selected, send 1 BOOK
      if (selectedCount === totalCount && totalCount > 0) {
        const firstItem = groupedSelected[gName][0];
        newPayloads.push({
          type: 'BOOK',
          productId: firstItem.id,
          fileName: firstItem.sourceFileName || 'libro_completo.xlsm',
          downloadUrl: `${apiBase}/api/products/download-book?id=${firstItem.id}`
        });
      } else {
        // Otherwise, send N SHEETs
        for (const item of groupedSelected[gName]) {
          newPayloads.push({
            type: 'SHEET',
            productId: item.id,
            fileName: `hoja_${item.name.replace(/[^a-z0-9]/gi, '_')}.xlsm`,
            downloadUrl: `${apiBase}/api/products/download-sheet?id=${item.id}`
          });
        }
      }
    }

    setSharePayloads(newPayloads);
    setShowShareModal(true);
  };

  const handleDownload = (product: Product) => {
    const link = document.createElement('a');
    link.href = `/api/products/download-sheet?id=${product.id}`;
    // No setear link.download para que el navegador respete el Content-Disposition del backend
    // con la extensión correcta (.xlsx, .xlsm, etc)
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFull = (product: Product) => {
    const link = document.createElement('a');
    link.href = `/api/products/download-book?id=${product.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRename = async () => {
    if (!detailProduct || !renameValue.trim()) return;
    try {
      const res = await fetch(`${apiBase}/api/products/rename?id=${detailProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue, UserId: 'system' })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === detailProduct.id ? { ...p, name: renameValue.trim() } : p));
        setDetailProduct(prev => prev ? { ...prev, name: renameValue.trim() } : null);
        setIsRenaming(false);
      } else {
        alert('Error al renombrar el producto.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  const handleRenameBook = async (oldName: string) => {
    if (!renameBookValue.trim() || renameBookValue === oldName) {
      setRenamingBookName(null);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/products/rename-book?oldName=${encodeURIComponent(oldName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameBookValue, UserId: 'system' })
      });
      if (res.ok) {
        const result = await res.json();
        setProducts(prev => prev.map(p => p.sourceFileName === oldName ? { ...p, sourceFileName: renameBookValue.trim() } : p));
        setRenamingBookName(null);
      } else {
        alert('Error al renombrar el libro.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Acceso de administrador concedido.');
        update({ role: 'ADMIN' });
      } else {
        alert(data.error || 'Clave de acceso incorrecta.');
      }
    } catch {
      alert('Error de conexión con el servidor.');
    }
  };

  const handleExportDB = () => {
    setExportLoading(true);
    setTimeout(() => {
      window.open(`/api/backup/export`, '_blank');
      setExportLoading(false);
    }, 1000);
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Esta acción reemplazará toda la base de datos de catálogos y productos. ¿Está seguro?')) {
      return;
    }

    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const backupData = JSON.parse(ev.target?.result as string);
        const res = await fetch(`/api/backup/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData),
        });
        const result = await res.json();
        if (result.success) {
          alert('Restauración completada exitosamente.');
          fetchProducts();
        } else {
          alert('Error al restaurar: ' + result.message);
        }
      } catch {
        alert('El archivo no es válido o hubo un error de red.');
      } finally {
        setImportLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Agrupar productos por su archivo de origen
  const groupedProducts: Record<string, Product[]> = {};
  products.forEach(p => {
    const key = p.sourceFileName || 'Otros Documentos';
    if (!groupedProducts[key]) groupedProducts[key] = [];
    groupedProducts[key].push(p);
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedIds(prev => ({ ...prev, [productId]: checked }));
  };

  const handleSelectGroup = (groupName: string, checked: boolean) => {
    const groupProducts = groupedProducts[groupName] || [];
    const updated = { ...selectedIds };
    groupProducts.forEach(p => {
      updated[p.id] = checked;
    });
    setSelectedIds(updated);
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
        Verificando credenciales...
      </div>
    );
  }

  const navItems = [
    { id: 'catalog',   label: 'Catálogo',     Icon: LayoutGrid },
    { id: 'messages',  label: 'Mensajes',     Icon: MessageSquare },
    ...(isAdmin ? [{ id: 'network', label: 'Directorio', Icon: Users }] : []),
    { id: 'quotes',    label: 'Cotizaciones',  Icon: FileText },
    { id: 'reports',   label: 'Reportes',      Icon: BarChart2 },
    { id: 'settings',  label: 'Configuración', Icon: Settings },
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
                  placeholder="Buscar por nombre o categoría..."
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
                Nuevo Producto
              </button>
            )}

            {/* Theme Toggle */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={toggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              style={{ padding: '0 10px', gap: 6 }}
            >
              {isDark
                ? <Sun size={15} style={{ color: '#f59e0b' }} />
                : <Moon size={15} style={{ color: '#6366f1' }} />
              }
              <span style={{ fontSize: 12 }}>{isDark ? 'Claro' : 'Oscuro'}</span>
            </button>
            <div
              className="btn btn-ghost btn-sm"
              style={{ gap: 6, position: 'relative', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              onClick={() => setUserMenuOpen(o => !o)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setUserMenuOpen(o => !o); }}
            >
              <User size={13} />
              <span>{session?.user?.name || session?.user?.email}</span>
              <span className="badge badge-admin" style={{ fontSize: 10 }}>
                {isAdmin ? 'ADMIN' : 'EMPLEADO'}
              </span>
              <ChevronDown size={12} />

              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                  minWidth: 180, zIndex: 200, overflow: 'hidden',
                  cursor: 'default'
                }}
                onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{session?.user?.name || 'Usuario'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{session?.user?.email}</div>
                  </div>
                  <div
                    className="nav-item"
                    style={{ borderRadius: 0, padding: '8px 12px', cursor: 'pointer', color: 'var(--status-error)' }}
                    onClick={() => signOut({ callbackUrl: '/' })}
                    role="menuitem"
                  >
                    <LogOut size={13} /> Cerrar Sesión
                  </div>
                </div>
              )}
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
                    Agrupado por documento original de importación
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
                  No se encontraron productos. {isAdmin && 'Utilice "Nuevo Producto" para iniciar una importación.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {Object.keys(groupedProducts).map(groupName => {
                    const groupItems = groupedProducts[groupName];
                    const isExpanded = !!expandedGroups[groupName];
                    const allGroupSelected = groupItems.every(p => selectedIds[p.id]);
                    const someGroupSelected = groupItems.some(p => selectedIds[p.id]) && !allGroupSelected;

                    return (
                      <div key={groupName} className="panel" style={{ overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                        {/* Header del Grupo (Archivo Excel) */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: 'var(--bg-elevated)',
                          borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                          justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                              type="checkbox"
                              checked={allGroupSelected}
                              ref={el => {
                                if (el) el.indeterminate = someGroupSelected;
                              }}
                              onChange={e => handleSelectGroup(groupName, e.target.checked)}
                              style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}>
                              <div onClick={() => toggleGroup(groupName)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {isExpanded ? <ChevronDown size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
                                <FileSpreadsheet size={16} style={{ color: 'var(--accent)' }} />
                              </div>
                              {renamingBookName === groupName ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input 
                                    type="text" 
                                    value={renameBookValue} 
                                    onChange={(e) => setRenameBookValue(e.target.value)}
                                    style={{ padding: '2px 6px', fontSize: 13, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}
                                    autoFocus
                                  />
                                  <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px' }} onClick={() => handleRenameBook(groupName)}>✓</button>
                                  <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => setRenamingBookName(null)}>✕</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                                    {groupName}
                                  </span>
                                  {isAdmin && (
                                    <button className="btn btn-ghost" style={{ padding: 2, height: 'auto', opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); setRenamingBookName(groupName); setRenameBookValue(groupName); }}>
                                      ✎
                                    </button>
                                  )}
                                </div>
                              )}
                              <span className="badge badge-gray" style={{ fontSize: 10, padding: '1px 6px', marginLeft: 4 }}>
                                {groupItems.length} hoja{groupItems.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 4 }}>
                            {isAdmin && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setShowUpload(groupName)} title="Sincronizar cambios (importar archivo actualizado)">
                                <UploadCloud size={14} />
                                Sincronizar
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadFull(groupItems[0])} title="Descargar libro completo original">
                              <Download size={14} />
                              Descargar Libro
                            </button>
                          </div>
                        </div>

                        {/* Listado de Hojas (Colapsable) */}
                        {isExpanded && (
                          <table className="corp-table">
                            <thead>
                              <tr>
                                <th style={{ width: 40 }}></th>
                                <th>NOMBRE DE LA HOJA (PRODUCTO)</th>
                                <th>CATEGORÍA</th>
                                <th>VERSIÓN</th>
                                <th>ÚLTIMA MODIFICACIÓN</th>
                                <th style={{ width: 180, textAlign: 'right' }}>ACCIONES</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupItems.map(p => {
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
                                          {p.length && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                              <span style={{ fontWeight: 600 }}>Long.:</span> {p.length}
                                            </div>
                                          )}
                                        </div>
                                        <Info size={12} style={{ opacity: 0.5, color: 'var(--accent)', flexShrink: 0 }} />
                                      </div>
                                    </td>
                                    <td>
                                      <span className="badge badge-gray">{p.category?.name || 'General'}</span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>v{p.version}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                      {new Date(p.updatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(p)} title="Descargar hoja activa">
                                          <Download size={12} />
                                        </button>
                                        {isAdmin && (
                                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── QUOTES ── */}
          {activeTab === 'quotes' && (
            <div className="animate-in">
              <div className="section-header">
                <h3>Cotizaciones</h3>
              </div>
              <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
                <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Módulo de cotizaciones en desarrollo.</p>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && (
            <div className="animate-in">
              <div className="section-header">
                <h3>Reportes y Métricas</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Productos en catálogo', value: products.length },
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

          {/* ── NETWORK / DIRECTORIO ── */}
          {activeTab === 'network' && (
            <NetworkTab isAdmin={isAdmin} />
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="section-header" style={{ marginBottom: 0 }}>
                <h3>Mi Perfil y Configuración</h3>
              </div>

              {/* My Profile */}
              {session?.user && (
                <MyProfile userId={(session.user as any).id} />
              )}

              {/* Admin Only Settings */}
              {isAdmin && (
                <>
                  {/* Account Info */}
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

                  {/* Backup (admin only) */}
                  <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Database size={13} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Respaldos de Base de Datos
                      </span>
                    </div>
                    <div style={{ padding: 20 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Exporte una copia completa del catálogo en formato JSON o restaure el sistema desde un archivo de respaldo previamente generado.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          id="btn-exportar-bd"
                          className="btn btn-secondary"
                          onClick={handleExportDB}
                          disabled={exportLoading}
                        >
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
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                        La importación reemplaza el catalogo completo. Se solicitará confirmación antes de proceder.
                      </p>
                    </div>
                  </div>

                  {/* System status */}
                  <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Estado del Sistema
                      </span>
                    </div>
                    <table className="corp-table">
                      <tbody>
                        {[
                          { name: 'Servidor API Principal', status: 'Operativo', badge: 'badge-green' },
                          { name: 'Base de Datos Central', status: 'Operativo', badge: 'badge-green' },
                          { name: 'Portal Web de Usuario', status: 'Operativo', badge: 'badge-green' },
                          { name: 'Sincronización de Sistemas (SYCOST)', status: 'Pendiente', badge: 'badge-gray' },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{row.name}</td>
                            <td style={{ width: 120 }}><span className={`badge ${row.badge}`}>{row.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* ── Barra de Acciones Masivas Flotante ── */}
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
            gap: 20,
            zIndex: 300,
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
            </span>
            
            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
            
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleBulkShare}>
                <Share2 size={13} />
                Compartir en Chat
              </button>
              {isAdmin && (
                <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                  <Trash2 size={13} />
                  Eliminar seleccionados
                </button>
              )}
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setSelectedIds({})}
                style={{ minWidth: 'auto', padding: '0 8px' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Panel de Detalle Lateral (Drawer) ── */}
        {/* ── DETAIL DRAWER (Ficha Técnica) ── */}
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)'
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ficha Técnica de Producto
                </span>
                <button 
                  className="modal-close" 
                  onClick={() => setDetailProduct(null)}
                  style={{ width: 24, height: 24 }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body Drawer */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Imagen del producto */}
                <div style={{
                  width: '100%',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: '#ffffff',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                  padding: 16,
                }}>
                  <img
                    src={`/api/products/image?id=${detailProduct.id}`}
                    alt={detailProduct.name}
                    style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/product_placeholder.svg'; }}
                  />
                </div>

                {/* Categoría */}
                <span className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>
                  {detailProduct.category?.name || 'General'}
                </span>

                {/* Nombre del producto */}
                <div>
                  {!isRenaming ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {detailProduct.name}
                      </h3>
                      <button className="btn btn-ghost" style={{ padding: 4, height: 'auto', opacity: 0.5 }} onClick={() => { setIsRenaming(true); setRenameValue(detailProduct.name); }}>
                        ✎
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <input 
                        type="text" 
                        value={renameValue} 
                        onChange={(e) => setRenameValue(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', flex: 1 }}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleRename}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setIsRenaming(false)}>✕</button>
                    </div>
                  )}
                  {detailProduct.characteristics && (
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                      {detailProduct.characteristics}
                    </p>
                  )}
                  {detailProduct.length && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Longitud:</span> {detailProduct.length}
                    </p>
                  )}
                </div>

                <div className="divider" style={{ margin: 0 }} />

                {/* Descripción */}
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600 }}>
                    Descripción
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                    {detailProduct.description || 'Sin descripción detallada.'}
                  </p>
                </div>

                <div className="divider" style={{ margin: 0 }} />

                {/* Metadata list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Metadatos de Archivo
                  </h4>
                  {[
                    { label: 'Documento Origen', value: detailProduct.sourceFileName || 'N/A' },
                    { label: 'Versión del Archivo', value: `v${detailProduct.version}`, mono: true },
                    { label: 'Última modificación', value: new Date(detailProduct.updatedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) },
                    { label: 'Actualizado por', value: detailProduct.updatedBy || 'Sistema' },
                  ].map((meta, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{meta.label}</span>
                      <span style={{ 
                        color: 'var(--text-primary)', 
                        fontWeight: 500, 
                        fontFamily: meta.mono ? 'monospace' : 'inherit',
                        textAlign: 'right',
                        wordBreak: 'break-all'
                      }}>
                        {meta.value}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

              {/* Footer Drawer */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
              }}>
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleDownload(detailProduct)}
                  >
                    <Download size={16} /> Descargar Hoja Activa
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleDownloadFull(detailProduct)}
                  >
                    <FileSpreadsheet size={16} /> Descargar Libro Completo
                  </button>
                </div>
                {isAdmin && (
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '0 12px', marginTop: 10, width: '100%' }}
                    onClick={() => handleDelete(detailProduct)}
                    title="Eliminar de catálogo"
                  >
                    <Trash2 size={14} />
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
          onSuccess={() => {
            setShowShareModal(false);
            setSelectedIds({});
          }}
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
