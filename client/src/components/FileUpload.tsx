import React, { useRef, useState } from 'react';
import { IconExcel, IconImage, IconCheckCircle, IconError, IconSpinner, IconDownload } from './Icons';

interface FileUploadProps {
  onExcelUpload: (file: File) => void;
  onTemplateUpload: (file: File) => void;
  excelName?: string;
  templateName?: string;
  excelLoading?: boolean;
  templateLoading?: boolean;
  excelError?: string | null;
  templateError?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onExcelUpload,
  onTemplateUpload,
  excelName,
  templateName,
  excelLoading,
  templateLoading,
  excelError,
  templateError,
}) => {
  const excelRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLInputElement>(null);
  const [excelDrag, setExcelDrag] = useState(false);
  const [tmplDrag, setTmplDrag] = useState(false);

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

  const dragHandlers = (type: 'excel' | 'template') => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); (type === 'excel' ? setExcelDrag : setTmplDrag)(true); },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); (type === 'excel' ? setExcelDrag : setTmplDrag)(false); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); (type === 'excel' ? setExcelDrag : setTmplDrag)(false); const f = e.dataTransfer.files[0]; if (f) (type === 'excel' ? onExcelUpload : onTemplateUpload)(f); },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div 
          className={`upload-box${excelName ? ' uploaded' : ''}${excelDrag ? ' drag-over' : ''}`}
          onClick={() => excelRef.current?.click()}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') excelRef.current?.click(); }}
          {...dragHandlers('excel')}
        >
          <div className="upload-icon" style={excelName ? { color: 'var(--success-color)' } : excelError ? { color: 'var(--error-color)' } : {}}>
            {excelLoading ? <IconSpinner size={32} /> : excelError ? <IconError size={32} /> : excelName ? <IconCheckCircle size={32} /> : <IconExcel size={32} />}
          </div>
          <div className="upload-title">
            {excelLoading ? 'Загрузка...' : excelName ? 'Таблица Excel загружена' : 'Загрузите Excel-таблицу'}
          </div>
          <div className="upload-subtitle">
            {excelError ? excelError : excelLoading ? 'Подождите...' : excelName ? `Файл: ${excelName}` : 'Поддерживаются форматы .xlsx, .xls — перетащите файл или нажмите для выбора'}
          </div>
          <input 
            type="file" 
            ref={excelRef} 
            onChange={handleExcelChange} 
            accept=".xlsx,.xls" 
            style={{ display: 'none' }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a 
            href="/api/download/excel-template" 
            download="template.xlsx"
            className="download-link"
            title="Скачать пример шаблона Excel с правильной структурой полей"
            style={{ flex: 1 }}
          >
            <IconDownload size={14} /> Скачать шаблонный Excel-файл
          </a>
          {excelName && (
            <span className="badge badge-success">Готово</span>
          )}
        </div>
      </div>

        <div 
          className={`upload-box${templateName ? ' uploaded' : ''}${tmplDrag ? ' drag-over' : ''}`}
          onClick={() => templateRef.current?.click()}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') templateRef.current?.click(); }}
          {...dragHandlers('template')}
        >
          <div className="upload-icon" style={templateName ? { color: 'var(--success-color)' } : templateError ? { color: 'var(--error-color)' } : {}}>
            {templateLoading ? <IconSpinner size={32} /> : templateError ? <IconError size={32} /> : templateName ? <IconCheckCircle size={32} /> : <IconImage size={32} />}
          </div>
        <div className="upload-title">
          {templateLoading ? 'Загрузка...' : templateName ? 'Шаблон загружен' : 'Загрузите шаблон сертификата'}
        </div>
        <div className="upload-subtitle">
          {templateError ? templateError : templateLoading ? 'Подождите...' : templateName ? `Файл: ${templateName}` : 'Изображения (PNG/JPG) или PDF — перетащите файл или нажмите для выбора'}
        </div>
        <input 
          type="file" 
          ref={templateRef} 
          onChange={handleTemplateChange} 
          accept=".png,.jpg,.jpeg,.pdf" 
          style={{ display: 'none' }} 
        />
      </div>
      {templateName && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span className="badge badge-success">Готово</span>
        </div>
      )}
    </div>
  );
};
