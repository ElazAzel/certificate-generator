import React from 'react';
import type { ExcelData } from '../types/index';

interface ExcelPreviewProps {
  data: ExcelData;
  currentRowIndex: number;
  onRowChange: (index: number) => void;
}

export const ExcelPreview: React.FC<ExcelPreviewProps> = ({
  data,
  currentRowIndex,
  onRowChange,
}) => {
  const { columns, rows } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="section-title">
          Строки таблицы ({rows.length})
        </span>
        <div className="row-navigator">
          <button 
            className="row-nav-btn" 
            title="Первая строка"
            onClick={() => onRowChange(0)}
            disabled={currentRowIndex === 0}
          >
            «
          </button>
          <button 
            className="row-nav-btn" 
            title="Предыдущая"
            onClick={() => onRowChange(currentRowIndex - 1)}
            disabled={currentRowIndex === 0}
          >
            ‹
          </button>
          <span className="row-indicator">
            {currentRowIndex + 1} / {rows.length}
          </span>
          <button 
            className="row-nav-btn" 
            title="Следующая"
            onClick={() => onRowChange(currentRowIndex + 1)}
            disabled={currentRowIndex === rows.length - 1}
          >
            ›
          </button>
          <button 
            className="row-nav-btn" 
            title="Последняя"
            onClick={() => onRowChange(rows.length - 1)}
            disabled={currentRowIndex === rows.length - 1}
          >
            »
          </button>
        </div>
      </div>

      <div className="table-preview-container">
        <table className="table-preview">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>№</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr 
                key={idx}
                onClick={() => onRowChange(idx)}
                className={idx === currentRowIndex ? 'active' : ''}
              >
                <td>{idx + 1}</td>
                {columns.map((col) => (
                  <td key={col} title={row[col]}>
                    {row[col] ?? <span style={{ color: 'var(--text-light)' }}>-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
