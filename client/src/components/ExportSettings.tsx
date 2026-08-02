import React from 'react';
import type { ExportConfig } from '../types/index';
import { IconTestPdf, IconGenerate, IconSpinner, IconWarning } from './Icons';

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
  const format = config.format || 'pdf';
  const isPdf = format === 'pdf';

  return (
    <div className="export-grid" style={{ width: '100%' }}>
      <div className="export-controls">
        <div className="export-field">
          <label>Формат</label>
          <select
            className="input-control input-control-sm"
            value={format}
            onChange={(e) => onUpdateConfig({ format: e.target.value as 'pdf' | 'png' | 'jpg' })}
          >
            <option value="pdf">PDF</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </div>

        <div className="export-field" style={{ display: isPdf ? undefined : 'none' }}>
          <label>Режим</label>
          <select
            className="input-control input-control-sm"
            value={config.mode}
            onChange={(e) => onUpdateConfig({ mode: e.target.value as 'separate' | 'combined' })}
          >
            <option value="separate">Раздельно</option>
            <option value="combined">Один файл</option>
          </select>
        </div>

        <div className="export-field" style={{ flex: 1, minWidth: '180px' }}>
          <label>Имя файла</label>
          <input
            type="text"
            className="input-control input-control-sm"
            value={isPdf && config.mode === 'separate' ? config.fileNameTemplate : isPdf ? config.combinedFileName : config.fileNameTemplate}
            onChange={(e) => {
              if (!isPdf) onUpdateConfig({ fileNameTemplate: e.target.value });
              else if (config.mode === 'separate') onUpdateConfig({ fileNameTemplate: e.target.value });
              else onUpdateConfig({ combinedFileName: e.target.value });
            }}
            placeholder={isPdf && config.mode === 'combined' ? 'certificates_all.pdf' : `{name}.${format}`}
            title={isPdf && config.mode === 'combined' ? 'Имя общего PDF-файла' : `Шаблон имени файла (например, {name}.${format})`}
          />
        </div>
      </div>

      <div className="export-actions">
        <button
          className="btn btn-secondary btn-sm"
          onClick={onGenerateTest}
          disabled={!isValid || isGenerating || !isPdf}
          title={isPdf ? 'Сгенерировать PDF для текущей строки' : 'Тестовое превью доступно только для PDF'}
          style={{ whiteSpace: 'nowrap' }}
        >
          <IconTestPdf size={15} /> Тест
        </button>

        <button
          className="footer-generate-btn"
          onClick={onGenerate}
          disabled={!isValid || isGenerating}
        >
          {isGenerating ? <><IconSpinner size={17} /> Генерация...</> : <><IconGenerate size={17} /> Создать</>}
        </button>

        {!isValid && !isGenerating && (
          <span className="export-error" title={excelColumns.length ? 'Устраните ошибки настройки' : undefined}>
            <IconWarning size={14} />
          </span>
        )}
      </div>
    </div>
  );
};
