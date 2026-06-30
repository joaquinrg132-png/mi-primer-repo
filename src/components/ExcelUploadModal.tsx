"use client";

import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { X, Upload, FileSpreadsheet, Check, AlertTriangle, Loader } from 'lucide-react';

type SheetEntry = {
  sheetName: string;
  productName: string;
  code: string;
  characteristics: string;
  length: string;
  category: string;
  rowCount: number;
  selected: boolean;
  sourceFile: string;
  sourceFileObj: File;
  fileLastModified: number; // timestamp ms
};

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  syncTargetBook?: string;
};

function readExcelSheets(file: File): Promise<SheetEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);

        const wb = XLSX.read(data, { type: 'array', bookVBA: false });

        // Extraer imágenes con JSZip
        let zip: JSZip | null = null;
        try {
          const JSZipLib = (await import('jszip')).default;
          zip = await JSZipLib.loadAsync(arrayBuffer);
        } catch (e) {
          console.warn("Could not load zip for image extraction", e);
        }

        const entries: SheetEntry[] = [];
        for (const name of wb.SheetNames) {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          const dataRows = rows.filter(r => r.some(c => c !== null && c !== undefined && c !== ''));

          let productName = name;
          if (ws['C19']?.v) productName = String(ws['C19'].v).trim();

          let characteristics = '';
          if (ws['C20']?.v) characteristics = String(ws['C20'].v).trim();

          let length = '';
          if (ws['C23']?.v) length = String(ws['C23'].v).trim();

          let description = '';
          if (ws['C21']?.v) description += String(ws['C21'].v).trim() + '\n';
          if (ws['C22']?.v) description += String(ws['C22'].v).trim();
          description = description.trim();

          // Extraer imagen
          let imageUrl = '';
          if (zip) {
            try {
              const wbXml = await zip.file('xl/workbook.xml')?.async('string');
              if (wbXml) {
                const sheetRegex = new RegExp(`<sheet[^>]*name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*r:id="([^"]+)"`, 'i');
                const sheetMatch = wbXml.match(sheetRegex);
                if (sheetMatch) {
                  const wbRels = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
                  if (wbRels) {
                    const relMatch = wbRels.match(new RegExp(`<Relationship[^>]*Id="${sheetMatch[1]}"[^>]*Target="([^"]+)"`, 'i'));
                    if (relMatch) {
                      let sheetTarget = relMatch[1].replace(/^\/xl\//, '');
                      const sheetXml = await zip.file('xl/' + sheetTarget)?.async('string');
                      if (sheetXml) {
                        const drawingMatch = sheetXml.match(/<drawing r:id="([^"]+)"/i);
                        if (drawingMatch) {
                          const sheetParts = sheetTarget.split('/');
                          const sheetFileName = sheetParts.pop();
                          const sheetDir = sheetParts.join('/');
                          const sheetRelsPath = `xl/${sheetDir}/_rels/${sheetFileName}.rels`;
                          const sheetRelsXml = await zip.file(sheetRelsPath)?.async('string');
                          if (sheetRelsXml) {
                            const drawingRelMatch = sheetRelsXml.match(new RegExp(`<Relationship[^>]*Id="${drawingMatch[1]}"[^>]*Target="([^"]+)"`, 'i'));
                            if (drawingRelMatch) {
                              let drawingTarget = drawingRelMatch[1];
                              let absDrawingTarget = `xl/${sheetDir}/${drawingTarget}`.replace(/worksheets\/\.\.\//, '');
                              const drawingXml = await zip.file(absDrawingTarget)?.async('string');
                              if (drawingXml) {
                                const anchors = drawingXml.match(/<xdr:[a-zA-Z]+CellAnchor>[\s\S]*?<\/xdr:[a-zA-Z]+CellAnchor>/gi);
                                if (anchors) {
                                  for (const anchor of anchors) {
                                    const embedMatch = anchor.match(/r:embed="([^"]+)"/i);
                                    if (embedMatch) {
                                      const drawingParts = absDrawingTarget.split('/');
                                      const drawingFileName = drawingParts.pop();
                                      const drawingDir = drawingParts.join('/');
                                      const drawingRelsXml = await zip.file(`${drawingDir}/_rels/${drawingFileName}.rels`)?.async('string');
                                      if (drawingRelsXml) {
                                        const imgRelMatch = drawingRelsXml.match(new RegExp(`<Relationship[^>]*Id="${embedMatch[1]}"[^>]*Target="([^"]+)"`, 'i'));
                                        if (imgRelMatch) {
                                          const imgTarget = imgRelMatch[1];
                                          const absImgTarget = `${drawingDir}/${imgTarget}`.replace(/drawings\/\.\.\//, '');
                                          const imgFile = zip.file(absImgTarget);
                                          if (imgFile) {
                                            const imgBase64 = await imgFile.async('base64');
                                            let ext = absImgTarget.split('.').pop()?.toLowerCase() || 'png';
                                            if (ext === 'jpeg') ext = 'jpg';
                                            imageUrl = `data:image/${ext};base64,${imgBase64}`;
                                          }
                                        }
                                      }
                                      break;
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.warn("Error extracting image for sheet", name, e);
            }
          }

          entries.push({
            sheetName: name,
            productName,
            code: '',
            characteristics,
            length,
            category: 'General',
            description,
            imageUrl,
            rowCount: Math.max(0, dataRows.length - 1),
            selected: true,
            sourceFile: file.name,
            sourceFileObj: file,
            fileLastModified: file.lastModified,
          } as any);
        }

        resolve(entries);
      } catch (e) {
        reject(new Error('No se pudo leer el Excel. Verifica que el archivo no esté dañado.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

export default function ExcelUploadModal({ onClose, onSuccess, syncTargetBook }: Props) {
  const [step, setStep] = useState<'drop' | 'review' | 'uploading' | 'done'>('drop');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetEntry[]>([]);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  const parseFile = async (file: File) => {
    setErrorMsg('');
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const excelFiles: File[] = [];
        const promises: Promise<void>[] = [];
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir && /\.(xlsx|xlsm|xls)$/i.test(relativePath)) {
            promises.push(
              zipEntry.async('arraybuffer').then(buf => {
                excelFiles.push(new File([buf], zipEntry.name.split('/').pop() || zipEntry.name,
                  { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: Date.now() }));
              })
            );
          }
        });
        await Promise.all(promises);
        if (!excelFiles.length) { setErrorMsg('El ZIP no contiene archivos Excel (.xlsx, .xlsm).'); return; }
        const allSheets: SheetEntry[] = [];
        for (const excelFile of excelFiles) {
          const s = await readExcelSheets(excelFile);
          allSheets.push(...s);
        }
        setOriginalFile(file);
        setFileName(`${file.name} (${excelFiles.length} libro${excelFiles.length > 1 ? 's' : ''})`);
        setSheets(allSheets);
        setStep('review');
      } else {
        const entries = await readExcelSheets(file);
        if (!entries.length) { setErrorMsg('El archivo no contiene hojas válidas.'); return; }
        setOriginalFile(file);
        setFileName(file.name);
        setSheets(entries);
        setStep('review');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo leer el archivo.');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const updateSheet = (index: number, field: keyof SheetEntry, value: any) => {
    setSheets(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const selectedCount = sheets.filter(s => s.selected).length;

  const handleImport = async () => {
    if (!originalFile) return;
    const toImport = sheets.filter(s => s.selected);
    if (!toImport.length) { setErrorMsg('Seleccione al menos una hoja para importar.'); return; }

    // Validar que todos los seleccionados tengan código
    const sinCodigo = toImport.filter(s => !s.code.trim());
    if (sinCodigo.length > 0) {
      setErrorMsg(`Asigne un código a todas las hojas seleccionadas. Faltan: ${sinCodigo.map(s => s.productName).join(', ')}`);
      return;
    }

    setStep('uploading');
    const log: string[] = [];

    try {
      const groups = new Map<File, SheetEntry[]>();
      for (const s of toImport) {
        if (!groups.has(s.sourceFileObj)) groups.set(s.sourceFileObj, []);
        groups.get(s.sourceFileObj)!.push(s);
      }

      for (const [fileObj, fileSheets] of groups.entries()) {
        const fileDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Error al leer archivo'));
          reader.readAsDataURL(fileObj);
        });

        let createdCount = 0;
        for (const s of fileSheets) {
          const res = await fetch(`/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: s.productName,
              code: s.code.trim(),
              categoryName: s.category || 'General',
              sheetName: s.sheetName,
              characteristics: s.characteristics,
              length: s.length,
              description: (s as any).description,
              imageUrl: (s as any).imageUrl,
              sourceFileName: fileObj.name,
              fileUrl: fileDataUri,
              fileLastModified: s.fileLastModified,
              userId: 'system',
              ...(syncTargetBook ? { syncTargetBook } : {}),
            })
          });
          if (res.ok) createdCount++;
        }
        log.push(`OK  — '${fileObj.name}' importado (${createdCount} hojas).`);
      }
    } catch (err) {
      log.push(`ERR — Sin conexión con el servidor.`);
    }

    setUploadLog(log);
    setStep('done');
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-window" style={{ width: step === 'review' ? 760 : 480 }}>

        {/* Title Bar */}
        <div className="modal-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={14} style={{ color: 'var(--accent)' }} />
            <span className="modal-title">
              {step === 'drop'      && 'Importar Hoja de Excel'}
              {step === 'review'   && `Revisión de Hojas — ${fileName}`}
              {step === 'uploading' && 'Importando registros...'}
              {step === 'done'     && 'Importación Completada'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        {/* ── STEP 1: Drop zone ── */}
        {step === 'drop' && (
          <>
            <div className="modal-body">
              {errorMsg && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--status-error)', marginBottom: 16,
                }}>
                  <AlertTriangle size={14} strokeWidth={2.5} />
                  {errorMsg}
                </div>
              )}

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-lg)',
                  background: dragging ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                  padding: '48px 32px',
                  textAlign: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <Upload size={32} style={{ color: dragging ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 14 }} />
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Arrastre el archivo aquí</p>
                <p style={{ marginTop: 12, marginBottom: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
                  Arrastra una hoja Excel (.xlsx, .xlsm) o un archivo comprimido (.zip)
                </p>
                <label className="btn btn-primary">
                  Examinar Archivo
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept=".xlsx,.xls,.xlsm,.zip,application/zip,application/x-zip-compressed"
                    onChange={handleFileInput}
                  />
                </label>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
                Al importar deberás asignar un <strong>código único</strong> a cada hoja. El sistema evitará crear duplicados automáticamente.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="modal-body" style={{ padding: 0 }}>
              <div style={{ padding: '14px 20px', background: 'var(--accent-subtle)', borderBottom: '1px solid var(--accent-border)', fontSize: 13, color: 'var(--accent)' }}>
                Se detectaron <strong>{sheets.length} hoja{sheets.length !== 1 ? 's' : ''}</strong>. Asigna un <strong>código obligatorio</strong> a cada hoja antes de importar.
              </div>

              {errorMsg && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 16px',
                  background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.25)',
                  fontSize: 12, color: 'var(--status-error)',
                }}>
                  <AlertTriangle size={14} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
                  {errorMsg}
                </div>
              )}

              <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                <table className="corp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}>Imp.</th>
                      <th style={{ width: 120 }}>Archivo</th>
                      <th style={{ width: 100 }}>Pestaña</th>
                      <th>Nombre del Producto</th>
                      <th style={{ width: 100 }}>
                        Código <span style={{ color: 'var(--status-error)' }}>*</span>
                      </th>
                      <th style={{ width: 110 }}>Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheets.map((sheet, i) => (
                      <tr key={i} style={{ opacity: sheet.selected ? 1 : 0.45 }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={sheet.selected}
                            onChange={e => updateSheet(i, 'selected', e.target.checked)}
                            style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                          />
                        </td>
                        <td>
                          <span className="badge badge-gray" style={{ fontFamily: 'monospace', fontSize: 10, maxWidth: 110, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sheet.sourceFile}>
                            {sheet.sourceFile}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-gray" style={{ fontFamily: 'monospace', fontSize: 11 }}>{sheet.sheetName}</span>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: 28, fontSize: 12 }}
                            value={sheet.productName}
                            onChange={e => updateSheet(i, 'productName', e.target.value)}
                            disabled={!sheet.selected}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{
                              height: 28, fontSize: 12,
                              borderColor: sheet.selected && !sheet.code.trim() ? 'var(--status-error)' : undefined,
                            }}
                            value={sheet.code}
                            onChange={e => updateSheet(i, 'code', e.target.value)}
                            disabled={!sheet.selected}
                            placeholder="Ej: P-001"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: 28, fontSize: 12 }}
                            value={sheet.category}
                            onChange={e => updateSheet(i, 'category', e.target.value)}
                            disabled={!sheet.selected}
                            placeholder="General"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
                {selectedCount} de {sheets.length} hoja{sheets.length !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
              </span>
              <button className="btn btn-ghost" onClick={() => { setStep('drop'); setSheets([]); setErrorMsg(''); }}>Volver</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={selectedCount === 0}>
                Importar {selectedCount > 0 ? `${selectedCount} hoja${selectedCount !== 1 ? 's' : ''}` : ''}
              </button>
            </div>
          </>
        )}

        {step === 'uploading' && (
          <div className="modal-body" style={{ padding: '48px 32px', textAlign: 'center' }}>
            <Loader size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Importando registros...</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Por favor no cierre esta ventana.</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {step === 'done' && (
          <>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Check size={18} style={{ color: 'var(--status-success)' }} />
                <span style={{ fontWeight: 600 }}>Proceso completado</span>
              </div>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                fontFamily: 'Menlo, Consolas, monospace',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.8,
              }}>
                {uploadLog.map((line, i) => (
                  <div key={i} style={{ color: line.startsWith('ERR') ? 'var(--status-error)' : 'var(--status-success)' }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={onSuccess}>
                Cerrar y Actualizar Catálogo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
