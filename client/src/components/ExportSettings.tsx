import React from 'react';
import type { ExportConfig } from '../types/index';

interface ExportSettingsProps {
  config: ExportConfig;
  onUpdateConfig: (updates: Partial<ExportConfig>) => void;
  excelColumns: string[];
  onGenerate: () => void;
  onGenerateTest: () => void;
  isValid: boolean;
  isGenerating: boolean;
}

export const ExportSettings: React.FC<ExportSettingsProps> = ({
  config,
  onUpdateConfig,
  excelColumns,
  onGenerate,
  onGenerateTest,
  isValid,
  isGenerating,
}) => {
  return (
    <div className="export-grid" style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '2rem', flex: 1 }}>
        <div className="form-group" style={{ minWidth: '220px' }}>
          <label>Режим экспорта</label>
          <select 
            className="input-control"
            value={config.mode}
            onChange={(e) => onUpdateConfig({ mode: e.target.value as 'separate' | 'combined' })}
          >
            <option value="separate">Раздельные PDF-файлы</option>
            <option value="combined">Один общий PDF-файл</option>
          </select>
        </div>

        <div className="form-group" style={{ flex: 1, display: config.mode === 'separate' ? 'flex' : 'none' }}>
          <label>Шаблон имени файла (например, <code>{"{name}_{certificate_number}.pdf"}</code>)</label>
          <input 
            type="text" 
            className="input-control" 
            value={config.fileNameTemplate}
            onChange={(e) => onUpdateConfig({ fileNameTemplate: e.target.value })}
            placeholder="{name}.pdf"
          />
        </div>
        <div className="form-group" style={{ flex: 1, display: config.mode === 'combined' ? 'flex' : 'none' }}>
          <label>Имя общего PDF-файла</label>
          <input 
            type="text" 
            className="input-control" 
            value={config.combinedFileName}
            onChange={(e) => onUpdateConfig({ combinedFileName: e.target.value })}
            placeholder="certificates_all.pdf"
          />
        </div>

        <div className="form-group" style={{ width: '240px' }}>
          <label title="Путь к папке на сервере, куда будут сохранены PDF-файлы">Папка сохранения (на сервере)</label>
          <input 
            type="text" 
            className="input-control" 
            value={config.outputFolder}
            onChange={(e) => onUpdateConfig({ outputFolder: e.target.value })}
            placeholder="output"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button 
          className="btn btn-secondary"
          onClick={onGenerateTest}
          disabled={!isValid || isGenerating}
          title="Сгенерировать PDF-файл для текущей выбранной строки, чтобы проверить шрифты и позиции"
        >
          🔍 Тестовый PDF
        </button>
        
        <button 
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.5rem', fontWeight: '600', fontSize: '0.95rem' }}
          onClick={onGenerate}
          disabled={!isValid || isGenerating}
        >
          {isGenerating ? 'Генерация...' : '🚀 Создать сертификаты'}
        </button>
      </div>
    </div>
  );
};
