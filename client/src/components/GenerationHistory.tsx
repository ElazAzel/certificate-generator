import React, { useState, useEffect } from 'react';
import { getGenerationHistory, type GenerationHistoryItem } from '../utils/api';

interface GenerationHistoryProps {
  onDownload: (exportId: string, type: 'zip' | 'pdf') => void;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({ onDownload }) => {
  const [items, setItems] = useState<GenerationHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGenerationHistory(p);
      setItems(data.items);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(page);
  }, [page]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (loading && items.length === 0) {
    return <div className="settings-empty">Загрузка...</div>;
  }

  if (error) {
    return <div className="settings-empty" style={{ color: 'var(--danger-color)' }}>{error}</div>;
  }

  if (items.length === 0) {
    return <div className="settings-empty">Пока нет записей о генерациях.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {item.successCount}/{item.totalRows}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              {formatDate(item.createdAt)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              background: item.errorCount > 0 ? 'var(--danger-bg)' : 'var(--success-bg)',
              color: item.errorCount > 0 ? 'var(--danger-color)' : 'var(--success-color)',
            }}>
              {item.exportMode === 'separate' ? 'Раздельные' : 'Общий PDF'}
            </span>
            {item.errorCount > 0 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--danger-color)' }}>
                {item.errorCount} ошиб.
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                onClick={() => onDownload(item.id, 'pdf')}
              >
                PDF
              </button>
              {item.exportMode === 'separate' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                  onClick={() => onDownload(item.id, 'zip')}
                >
                  ZIP
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ←
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};
