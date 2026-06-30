"use client";
import React, { useState } from 'react';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Save, X } from 'lucide-react';

type Props = {
  initialData: any[][];
  fileName: string;
  onClose: () => void;
  onSave: (data: any[][], name: string) => void;
};

export default function ExcelEditorModal({ initialData, fileName, onClose, onSave }: Props) {
  // Convert 2D array to format required by react-data-grid
  const [columns, setColumns] = useState(() => {
    const maxCols = Math.max(...initialData.map(row => row.length), 5); // at least 5 cols
    return Array.from({ length: maxCols }, (_, i) => ({
      key: `col_${i}`,
      name: String.fromCharCode(65 + i), // A, B, C...
      editable: true,
      width: 150
    }));
  });

  const [rows, setRows] = useState(() => {
    return initialData.map((row, index) => {
      const rowData: any = { id: index };
      columns.forEach((col, i) => {
        rowData[col.key] = row[i] || '';
      });
      return rowData;
    });
  });

  const [productName, setProductName] = useState(fileName.replace(/\.[^/.]+$/, "")); // remove extension

  const handleRowsChange = (newRows: any[]) => {
    setRows(newRows);
  };

  const handleSave = () => {
    // Convert back to 2D array
    const dataToSave = rows.map(row => columns.map(col => row[col.key]));
    onSave(dataToSave, productName);
  };

  return (
    <div className="editor-overlay">
      <div className="glass-panel editor-content animate-fade-in">
        <div className="editor-header">
          <div className="title-area">
            <h3>Editar Documento:</h3>
            <input 
              type="text" 
              className="input-field doc-title-input" 
              value={productName} 
              onChange={e => setProductName(e.target.value)} 
            />
          </div>
          <div className="actions">
            <button className="btn-secondary" onClick={onClose}>
              <X size={18} className="mr-2" /> Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <Save size={18} className="mr-2" /> Guardar Producto
            </button>
          </div>
        </div>
        
        <div className="grid-container">
          <DataGrid 
            columns={columns} 
            rows={rows} 
            onRowsChange={handleRowsChange}
            className="rdg-dark"
            style={{ height: '100%' }}
          />
        </div>
      </div>

      <style>{`
        .editor-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .editor-content {
          width: 95%;
          height: 90vh;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
        }
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .title-area {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .doc-title-input {
          width: 300px;
          padding: 0.5rem;
        }
        .actions {
          display: flex;
          gap: 1rem;
        }
        .mr-2 { margin-right: 0.5rem; }
        .grid-container {
          flex: 1;
          overflow: hidden;
          border-radius: var(--border-radius);
          border: 1px solid var(--glass-border);
        }
        /* react-data-grid custom dark theme */
        .rdg-dark {
          --rdg-color: var(--text-primary);
          --rdg-border-color: var(--glass-border);
          --rdg-summary-border-color: var(--glass-border);
          --rdg-background-color: var(--bg-color);
          --rdg-header-background-color: var(--bg-color-secondary);
          --rdg-row-hover-background-color: rgba(255, 255, 255, 0.05);
          --rdg-row-selected-background-color: rgba(59, 130, 246, 0.1);
          --rdg-row-selected-border-color: var(--accent-color);
          --rdg-selection-color: var(--accent-color);
        }
      `}</style>
    </div>
  );
}
