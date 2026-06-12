import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { ExcelPreview } from './components/ExcelPreview';
import { FieldList } from './components/FieldList';
import { FieldSettingsPanel } from './components/FieldSettingsPanel';
import { TemplateEditor } from './components/TemplateEditor';
import { ExportSettings } from './components/ExportSettings';
import { ProgressBar } from './components/ProgressBar';
import { GenerationResult } from './components/GenerationResult';

import { useExcelData } from './hooks/useExcelData';
import { useTemplate } from './hooks/useTemplate';
import { useFields } from './hooks/useFields';

import type { FontInfo, ExportConfig, ProjectConfig, FieldConfig } from './types/index';
import type { GenerateResponse } from './utils/api';
import { getFonts, uploadFont, generateCertificates, generateTestPdf } from './utils/api';


import './styles/global.css';

export default function App() {
  // 1. Hook states
  const {
    excelData,
    excelName,
    currentRowIndex,
    loading: excelLoading,
    error: excelError,
    handleExcelUpload,
    setCurrentRowIndex,
    setExcelDirect,
    resetExcelData,
  } = useExcelData();

  const {
    template,
    templateName,
    loading: templateLoading,
    error: templateError,
    handleTemplateUpload,
    setTemplateDirect,
    resetTemplate,
  } = useTemplate();

  const {
    fields,
    setFields,
    activeFieldId,
    setActiveFieldId,
    activeField,
    addField,
    updateField,
    deleteField,
    duplicateField,
  } = useFields();

  // 2. Local states
  const [leftTab, setLeftTab] = useState<'files' | 'fields'>('files');
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [scale, setScale] = useState<number>(0.8);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    mode: 'separate',
    fileNameTemplate: '{name}.pdf',
    fileNameColumn: 'name',
    outputFolder: 'output',
    combinedFileName: 'certificates_all.pdf',
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Generation progress
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentProcessingRow, setCurrentProcessingRow] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 3. Load custom fonts list on mount
  const loadFontsList = async () => {
    try {
      const list = await getFonts();
      setFonts(list);
    } catch {
    }
  };

  useEffect(() => {
    loadFontsList();
  }, []);

  const handleFontUpload = async (file: File) => {
    try {
      await uploadFont(file);
      showToast('Шрифт успешно загружен', 'success');
      loadFontsList();
    } catch (err: any) {
      showToast(`Ошибка при загрузке шрифта: ${err.message}`, 'error');
    }
  };

  // 4. Load config JSON
  const handleLoadConfig = (config: ProjectConfig) => {
    if (config.fields) {
      setFields(config.fields);
      setLeftTab('fields');
    }
    if (config.export) {
      setExportConfig(config.export);
    }
    showToast('Конфигурация полей загружена', 'success');
  };

  // Reset all data
  const handleReset = () => {
    resetExcelData();
    resetTemplate();
    setFields([]);
    setActiveFieldId(undefined);
    setExportConfig({
      mode: 'separate',
      fileNameTemplate: '{name}.pdf',
      fileNameColumn: 'name',
      outputFolder: 'output',
      combinedFileName: 'certificates_all.pdf',
    });
    setLeftTab('files');
    showToast('Все данные сброшены', 'success');
  };

  // Save config JSON to file
  const handleSaveConfig = () => {
    if (!template) return;
    const config: ProjectConfig = {
      version: '1.0.0',
      template: {
        width: template.width,
        height: template.height,
        unit: 'pdf-points',
      },
      fields,
      export: exportConfig,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'certificate_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 5. Validation Check
  useEffect(() => {
    const errors: string[] = [];

    if (!excelData) {
      errors.push('Загрузите Excel-файл с данными участников.');
    }
    if (!template) {
      errors.push('Загрузите шаблон сертификата (PNG, JPG или PDF).');
    }
    if (fields.length === 0) {
      errors.push('Добавьте хотя бы одно текстовое поле.');
    }

    // Validate fields individual fields
    fields.forEach((f) => {
      if (!f.excelColumn) {
        errors.push(`Для поля "${f.label}" не выбрана колонка Excel.`);
      } else if (excelData && !excelData.columns.includes(f.excelColumn)) {
        errors.push(`Поле "${f.label}" привязано к несуществующей колонке "${f.excelColumn}".`);
      }

      if (f.fontSize <= 0) {
        errors.push(`Для поля "${f.label}" размер шрифта должен быть больше 0.`);
      }

      // Border bounds check
      if (template) {
        if (f.x < 0 || f.x > template.width || f.y < 0 || f.y > template.height) {
          errors.push(`Поле "${f.label}" частично или полностью выходит за границы макета.`);
        }
      }
    });

    if (exportConfig.mode === 'separate' && !exportConfig.fileNameTemplate) {
      errors.push('Укажите шаблон имени файла.');
    }

    setValidationErrors(errors);
  }, [excelData, template, fields, exportConfig]);

  // 6. Test PDF generation for active row
  const handleGenerateTestPdf = async () => {
    if (!excelData || !template) return;
    if (currentRowIndex < 0 || currentRowIndex >= excelData.rows.length) return;
    const row = excelData.rows[currentRowIndex];
    if (!row) return;
    try {
      const blob = await generateTestPdf(row, template.id, fields);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      showToast(`Ошибка при генерации тестового PDF: ${err.message}`, 'error');
    }
  };

  // 7. Full batch generation
  const handleGenerateAll = async () => {
    if (!excelData || !template) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationResult(null);

    try {
      const rows = excelData.rows;
      const total = rows.length;

      setCurrentProcessingRow('Генерация...');
      const response = await generateCertificates({
        excelData: rows,
        templateId: template.id,
        fields,
        exportConfig,
      });

      setGenerationProgress(100);
      setCurrentProcessingRow('');
      setGenerationResult(response);
    } catch (err: any) {
      showToast(`Ошибка генерации: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectField = (id: string) => {
    setActiveFieldId(id);
    setLeftTab('fields');
  };

  const hasExcel = !!excelData;
  const hasTemplate = !!template;
  const isReadyToGenerate = validationErrors.length === 0;

  return (
    <div className="app-container">
      <Header
        onLoadConfig={handleLoadConfig}
        onSaveConfig={handleSaveConfig}
        onFontUpload={handleFontUpload}
        onReset={handleReset}
        uploadedFonts={fonts}
        isConfigLoaded={fields.length > 0 && !!template}
      />

      <div className="app-workspace">
        {/* Left Control Panel */}
        <aside className="panel panel-left">
          <div className="tab-group">
            <button 
              className={`tab-btn ${leftTab === 'files' ? 'active' : ''}`}
              onClick={() => setLeftTab('files')}
            >
              📁 Файлы данных
            </button>
            <button 
              className={`tab-btn ${leftTab === 'fields' ? 'active' : ''}`}
              onClick={() => setLeftTab('fields')}
            >
              ✏️ Поля разметки ({fields.length})
            </button>
          </div>
          
          <div className="panel-body">
            {leftTab === 'files' ? (
              <>
                <FileUpload
                  onExcelUpload={handleExcelUpload}
                  onTemplateUpload={handleTemplateUpload}
                  excelName={excelName}
                  templateName={templateName}
                />

                {(excelError || templateError) && (
                  <div className="validation-alert" style={{ marginTop: '0px' }}>
                    {excelError && <div>{excelError}</div>}
                    {templateError && <div>{templateError}</div>}
                  </div>
                )}

                {excelData && (
                  <ExcelPreview
                    data={excelData}
                    currentRowIndex={currentRowIndex}
                    onRowChange={(idx) => setCurrentRowIndex(idx)}
                  />
                )}
              </>
            ) : (
              <FieldList
                fields={fields}
                activeFieldId={activeFieldId}
                onSelectField={handleSelectField}
                onAddField={() => addField(excelData?.columns[0] || 'name', template?.width, template?.height)}
                onDeleteField={deleteField}
                onDuplicateField={duplicateField}
                excelColumns={excelData?.columns || []}
              />
            )}
          </div>
        </aside>

        {/* Center Editor */}
        <main style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <TemplateEditor
            template={template}
            fields={fields}
            activeFieldId={activeFieldId}
            onSelectField={handleSelectField}
            onUpdateField={updateField}
            currentRowData={excelData?.rows?.[currentRowIndex]}
            scale={scale}
            onScaleChange={setScale}
          />
        </main>

        {/* Right Settings Panel */}
        <aside className="panel panel-right">
          <div className="panel-header">
            <span>Параметры поля</span>
          </div>
          <div className="panel-body" style={{ overflowY: 'auto' }}>
            <FieldSettingsPanel
              field={activeField}
              onUpdateField={(updates) => activeFieldId && updateField(activeFieldId, updates)}
              excelColumns={excelData?.columns || []}
              fonts={fonts}
            />

            {validationErrors.length > 0 && (
              <div className="validation-alert" style={{ marginTop: '1rem' }}>
                <strong>Ошибки настройки:</strong>
                <ul>
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Footer export controls */}
      <footer className="app-footer">
        {isGenerating ? (
          <ProgressBar
            progress={generationProgress}
            currentRowName={currentProcessingRow}
            total={excelData?.rows.length || 0}
            current={Math.round(((excelData?.rows.length || 0) * generationProgress) / 100)}
          />
        ) : (
          <ExportSettings
            config={exportConfig}
            onUpdateConfig={(updates) => setExportConfig({ ...exportConfig, ...updates })}
            excelColumns={excelData?.columns || []}
            onGenerate={handleGenerateAll}
            onGenerateTest={handleGenerateTestPdf}
            isValid={isReadyToGenerate}
            isGenerating={isGenerating}
          />
        )}
      </footer>

      {generationResult && (
        <GenerationResult
          result={generationResult}
          onClose={() => setGenerationResult(null)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: toast.type === 'success' ? '#065f46' : '#991b1b',
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
          animation: 'slideIn 0.2s ease',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
