import React, { useEffect, useRef } from 'react';
import type { GenerateResponse } from '../utils/api';

interface GenerationResultProps {
  result: GenerateResponse;
  onClose: () => void;
}

export const GenerationResult: React.FC<GenerationResultProps> = ({
  result,
  onClose,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const downloadUrl = `/api/download/${result.exportId}${result.files.length > 1 ? '?type=zip' : '?type=pdf'}`;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        maxWidth: '550px',
        width: '90%',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2.5rem' }}>
            {result.errorCount === 0 ? '🎉' : '⚠️'}
          </span>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Генерация завершена!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Результат сохранен на сервере в папку <code>{result.outputPath}</code>
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span>Всего строк в Excel:</span>
            <strong>{result.totalRows}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: 'var(--success-color)' }}>
            <span>Успешно создано:</span>
            <strong>{result.successCount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: result.errorCount > 0 ? 'var(--danger-color)' : 'var(--text-muted)' }}>
            <span>С ошибками:</span>
            <strong>{result.errorCount}</strong>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div style={{
            maxHeight: '120px',
            overflowY: 'auto',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            fontSize: '0.75rem',
            color: 'var(--danger-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}>
            <strong>Ошибки в строках:</strong>
            <ul style={{ paddingLeft: '1.25rem' }}>
              {result.errors.slice(0, 10).map((err, idx) => (
                <li key={idx}>Строка {err.row}: {err.message}</li>
              ))}
              {result.errors.length > 10 && <li>... и еще {result.errors.length - 10} ошибок.</li>}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <a 
            href={downloadUrl} 
            className="btn btn-primary"
            style={{ flex: 1, textDecoration: 'none' }}
            target="_blank" 
            rel="noopener noreferrer"
          >
            📥 Скачать {result.files.length > 1 ? 'ZIP-архив' : 'PDF-файл'}
          </a>
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: '100px' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};