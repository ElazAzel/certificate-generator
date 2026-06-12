import React, { useRef } from 'react';

interface FileUploadProps {
  onExcelUpload: (file: File) => void;
  onTemplateUpload: (file: File) => void;
  excelName?: string;
  templateName?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onExcelUpload,
  onTemplateUpload,
  excelName,
  templateName,
}) => {
  const excelRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLInputElement>(null);

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onExcelUpload(file);
    e.target.value = '';
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onTemplateUpload(file);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div 
          className={excelName ? 'upload-box uploaded' : 'upload-box'}
          onClick={() => excelRef.current?.click()}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') excelRef.current?.click(); }}
        >
          <div className="upload-icon" style={excelName ? { color: 'var(--success-color)' } : {}}>📊</div>
          <div className="upload-title">
            {excelName ? 'Таблица Excel загружена' : 'Загрузите Excel-таблицу'}
          </div>
          <div className="upload-subtitle">
            {excelName ? excelName : 'Поддерживаются форматы .xlsx, .xls'}
          </div>
          <input 
            type="file" 
            ref={excelRef} 
            onChange={handleExcelChange} 
            accept=".xlsx,.xls" 
            style={{ display: 'none' }} 
          />
        </div>
        <a 
          href="/api/download/excel-template" 
          download="template.xlsx"
          className="download-link"
          title="Скачать пример шаблона Excel с правильной структурой полей"
        >
          📥 Скачать шаблонный Excel-файл
        </a>
      </div>

        <div 
          className={templateName ? 'upload-box uploaded' : 'upload-box'}
          onClick={() => templateRef.current?.click()}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') templateRef.current?.click(); }}
        >
        <div className="upload-icon" style={templateName ? { color: 'var(--success-color)' } : {}}>🖼️</div>
        <div className="upload-title">
          {templateName ? 'Шаблон загружен' : 'Загрузите шаблон сертификата'}
        </div>
        <div className="upload-subtitle">
          {templateName ? templateName : 'Изображения (PNG/JPG) или PDF'}
        </div>
        <input 
          type="file" 
          ref={templateRef} 
          onChange={handleTemplateChange} 
          accept=".png,.jpg,.jpeg,.pdf" 
          style={{ display: 'none' }} 
        />
      </div>
    </div>
  );
};
