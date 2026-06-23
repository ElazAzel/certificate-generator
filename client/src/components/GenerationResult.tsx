import React, { useEffect, useRef } from 'react';
import type { GenerateResponse } from '../utils/api';
import { IconSuccess, IconWarning, IconDownload, IconSuccessPop } from './Icons';

interface GenerationResultProps {
  result: GenerateResponse;
  onClose: () => void;
}

export const GenerationResult: React.FC<GenerationResultProps> = ({
  result,
  onClose,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const downloadBtnRef = useRef<HTMLAnchorElement>(null);
  const downloadUrl = result.files.length > 1
    ? `/api/download/zip/${result.exportId}`
    : `/api/download/pdf/${result.exportId}`;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = [downloadBtnRef.current, closeBtnRef.current].filter(Boolean) as HTMLElement[];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    downloadBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="modal-overlay"
    >
      <div className="modal-card" style={{ maxWidth: '520px' }} role="dialog" aria-modal="true" aria-label="Результат генерации">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>
            {result.errorCount === 0 ? <IconSuccessPop size={40} /> : <IconWarning size={40} style={{ color: 'var(--warning)' }} />}
          </span>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {result.errorCount === 0 ? 'Всё готово!' : 'Генерация завершена'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {result.successCount} из {result.totalRows} сертификатов создано
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
          <div className="validation-alert" style={{ maxHeight: '120px', overflowY: 'auto' }}>
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
            ref={downloadBtnRef}
            href={downloadUrl}
            className="btn btn-primary"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <IconDownload size={18} /> Скачать {result.files.length > 1 ? 'ZIP-архив' : 'PDF-файл'}
          </a>
          <button
            ref={closeBtnRef}
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
