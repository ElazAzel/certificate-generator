import React, { useRef, useState } from 'react';
import type { ProjectConfig } from '../types/index';

interface HeaderProps {
  onLoadConfig: (config: ProjectConfig) => void;
  onSaveConfig: () => void;
  onFontUpload: (file: File) => void;
  onReset: () => void;
  uploadedFonts: { id: string; fileName: string; fontName: string }[];
  isConfigLoaded: boolean;
  showToast: (msg: string, type: 'success' | 'error') => void;
  theme: string;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadConfig,
  onSaveConfig,
  onFontUpload,
  onReset,
  uploadedFonts,
  isConfigLoaded,
  showToast,
  theme,
  onToggleTheme,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [fontLoading, setFontLoading] = useState(false);

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        if (config.version && config.fields) {
          onLoadConfig(config);
        } else {
          showToast('Неверный формат JSON-конфигурации', 'error');
        }
      } catch {
        showToast('Ошибка при чтении файла конфигурации', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFontFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontLoading(true);
    try {
      await onFontUpload(file);
    } finally {
      setFontLoading(false);
    }
    e.target.value = '';
  };

  return (
    <header className="app-header">
      <div className="header-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4F46E5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h1>Генератор сертификатов</h1>
      </div>

      <div className="header-actions">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => fontInputRef.current?.click()}
            disabled={fontLoading}
          >
            {fontLoading ? '⏳ Загрузка...' : '🔤 Шрифт'}
          </button>
          <input 
            type="file" 
            ref={fontInputRef} 
            onChange={handleFontFileChange} 
            accept=".ttf,.otf" 
            style={{ display: 'none' }} 
          />

          {uploadedFonts.length > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              {uploadedFonts.length}
            </span>
          )}
        </div>

        <span className="header-divider" />

        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => fileInputRef.current?.click()}
          data-tooltip="Загрузить JSON-конфигурацию полей"
        >
          📥 Импорт
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleJsonUpload} 
          accept=".json" 
          style={{ display: 'none' }} 
        />

        <button 
          className="btn btn-primary btn-sm"
          onClick={onSaveConfig}
          disabled={!isConfigLoaded}
        >
          📤 Экспорт
        </button>

        <button 
          className="btn btn-ghost btn-sm"
          onClick={onReset}
          data-tooltip="Сбросить все данные"
        >
          🗑️
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onToggleTheme}
          data-tooltip={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};
