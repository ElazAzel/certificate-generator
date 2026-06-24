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
import { GenerationHistory } from './components/GenerationHistory';
import { StepProgressBar } from './components/StepProgressBar';
import { IconFiles, IconField, IconHistory, IconGenerate, IconTip } from './components/Icons';

import { useExcelData } from './hooks/useExcelData';
import { useTemplate } from './hooks/useTemplate';
import { useFields } from './hooks/useFields';

import type { FontInfo, ExportConfig, ProjectConfig, FieldConfig, CatalogFontInfo } from './types/index';
import type { GenerateResponse } from './utils/api';
import { getFonts, uploadFont, generateCertificates, generateTestPdf, getTemplates, getFontCatalog, downloadGoogleFont } from './utils/api';

import './styles/global.css';

const STEPS = [
  { key: 'data', label: 'Загрузка данных' },
  { key: 'layout', label: 'Разметка полей' },
  { key: 'export', label: 'Экспорт' },
];

export default function App() {
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
    canUndo,
    canRedo,
    undo,
    redo,
  } = useFields();

  const [leftTab, setLeftTab] = useState<'files' | 'fields' | 'history'>('files');
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [fontCatalog, setFontCatalog] = useState<CatalogFontInfo[]>([]);
  const [scale, setScale] = useState<number>(0.8);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light');
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    mode: 'separate',
    fileNameTemplate: '{name}.pdf',
    fileNameColumn: 'name',
    outputFolder: 'output',
    combinedFileName: 'certificates_all.pdf',
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentProcessingRow, setCurrentProcessingRow] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  const loadFontsList = async () => {
    try {
      const list = await getFonts();
      setFonts(list);
    } catch (e) {
      console.warn('Fonts API:', e);
    }
  };

  const loadFontCatalog = async () => {
    try {
      const { items } = await getFontCatalog();
      setFontCatalog(items);
    } catch (e) {
      console.warn('Font catalog API:', e);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      const templates = await getTemplates();
      if (templates.length > 0 && !template) {
        setTemplateDirect(templates[0], templates[0].originalFileName);
      }
    } catch {
      // no templates available
    }
  };

  useEffect(() => {
    loadFontsList();
    loadFontCatalog();
    loadDefaultTemplate();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const handleFontUpload = async (file: File) => {
    try {
      await uploadFont(file);
      showToast('Шрифт успешно загружен', 'success');
      loadFontsList();
    } catch (err: any) {
      showToast(`Ошибка при загрузке шрифта: ${err.message}`, 'error');
    }
  };

  const handleDownloadGoogleFont = async (fontName: string) => {
    try {
      showToast(`Загрузка ${fontName}...`, 'success');
      await downloadGoogleFont(fontName);
      showToast(`Шрифт ${fontName} установлен`, 'success');
      loadFontsList();
      loadFontCatalog();
    } catch (err: any) {
      showToast(`Ошибка: ${err.message}`, 'error');
    }
  };

  const handleLoadConfig = (config: ProjectConfig) => {
    if (config.fields) {
      setFields(config.fields);
      setLeftTab('fields');
    }
    if (config.export) {
      setExportConfig(config.export);
    }
    showToast('Конфигурация полей загружена', 'success');
    setShowOnboarding(false);
  };

  const handleReset = () => {
    if (!excelData && !template && fields.length === 0) return;
    if (!window.confirm('Сбросить все данные? Это действие нельзя отменить.')) return;
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
    setShowOnboarding(true);
    showToast('Все данные сброшены', 'success');
  };

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

    fields.forEach((f) => {
      if (!f.excelColumn) {
        errors.push(`Для поля "${f.label}" не выбрана колонка Excel.`);
      } else if (excelData && !excelData.columns.includes(f.excelColumn)) {
        errors.push(`Поле "${f.label}" привязано к несуществующей колонке "${f.excelColumn}".`);
      }

      if (f.fontSize <= 0) {
        errors.push(`Для поля "${f.label}" размер шрифта должен быть больше 0.`);
      }

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

  const completedSteps = new Set<string>();
  if (hasExcel && hasTemplate) completedSteps.add('data');
  if (fields.length > 0) completedSteps.add('layout');
  if (isReadyToGenerate && generationResult) completedSteps.add('export');

  let currentStep = 0;
  if (!hasExcel || !hasTemplate) currentStep = 0;
  else if (fields.length === 0) currentStep = 1;
  else currentStep = 2;

  const allResourcesReady = hasExcel && hasTemplate;

  // Onboarding screen
  if (showOnboarding && !excelData && !template && fields.length === 0) {
    return (
      <div className="app-container">
        <Header
          onLoadConfig={handleLoadConfig}
          onSaveConfig={handleSaveConfig}
          onFontUpload={handleFontUpload}
          onReset={handleReset}
          uploadedFonts={fonts}
          isConfigLoaded={fields.length > 0 && !!template}
          showToast={showToast}
          theme={theme}
          onToggleTheme={toggleTheme}
          canUndo={canUndo} canRedo={canRedo}
          onUndo={undo} onRedo={redo}
        />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div className="onboarding-overlay">
            <span className="onboarding-icon"><IconGenerate size={64} style={{ color: 'var(--primary)' }} /></span>
            <h2 className="onboarding-title">Генератор сертификатов</h2>
            <p className="onboarding-subtitle">
              Создавайте именные PDF-сертификаты за 3 простых шага.<br />
              Загрузите Excel-таблицу с участниками и шаблон сертификата — остальное приложение сделает само.
            </p>
            <div className="onboarding-steps">
              <div className="onboarding-step-card">
                <div className="onboarding-step-number">1</div>
                <h4>Загрузите данные</h4>
                <p>Excel-файл с именами участников и шаблон сертификата (PNG, JPG или PDF)</p>
              </div>
              <div className="onboarding-step-card">
                <div className="onboarding-step-number">2</div>
                <h4>Настройте поля</h4>
                <p>Разместите текстовые поля на макете: перетаскивайте, меняйте шрифты, цвета и размеры</p>
              </div>
              <div className="onboarding-step-card">
                <div className="onboarding-step-number">3</div>
                <h4>Создайте PDF</h4>
                <p>Нажмите кнопку генерации и получите готовые сертификаты одним архивом</p>
              </div>
            </div>
            <button
              className="onboarding-cta"
              onClick={() => setShowOnboarding(false)}
            >
              Начать работу →
            </button>
          </div>
        </div>
        {toast && (
          <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header
        onLoadConfig={handleLoadConfig}
        onSaveConfig={handleSaveConfig}
        onFontUpload={handleFontUpload}
        onReset={handleReset}
        uploadedFonts={fonts}
        isConfigLoaded={fields.length > 0 && !!template}
        showToast={showToast}
        theme={theme}
        onToggleTheme={toggleTheme}
        canUndo={canUndo} canRedo={canRedo}
        onUndo={undo} onRedo={redo}
      />

      <StepProgressBar
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Quick tip when files not loaded */}
      {!allResourcesReady && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '0.5rem 1.5rem',
          background: 'rgba(99, 102, 241, 0.04)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div className="tip-card" style={{ maxWidth: '700px', width: '100%' }}>
            <span className="tip-card-icon"><IconTip size={18} /></span>
            <div>
              {!hasExcel && !hasTemplate
                ? 'Начните с загрузки Excel-файла с участниками и шаблона сертификата в левой панели.'
                : !hasExcel
                  ? 'Загрузите Excel-файл с данными участников, чтобы продолжить.'
                  : 'Загрузите шаблон сертификата, чтобы перейти к разметке полей.'}
            </div>
          </div>
        </div>
      )}

      <div className="app-workspace">
        <aside className="panel panel-left">
          <div className="tab-group">
            <button 
              className={`tab-btn ${leftTab === 'files' ? 'active' : ''}`}
              onClick={() => setLeftTab('files')}
            >
              <IconFiles size={14} /> Загрузка
            </button>
            <button 
              className={`tab-btn ${leftTab === 'fields' ? 'active' : ''}`}
              onClick={() => setLeftTab('fields')}
              disabled={!allResourcesReady}
            >
              <IconField size={14} /> Поля ({fields.length})
            </button>
            <button 
              className={`tab-btn ${leftTab === 'history' ? 'active' : ''}`}
              onClick={() => setLeftTab('history')}
            >
              <IconHistory size={14} /> История
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
                  excelLoading={excelLoading}
                  templateLoading={templateLoading}
                  excelError={excelError}
                  templateError={templateError}
                />

                {(excelError || templateError) && (
                  <div className="validation-alert">
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

                {allResourcesReady && fields.length === 0 && (
                  <div className="quick-start-card">
                    <h4>Следующий шаг: добавьте поля</h4>
                    <p>Перейдите на вкладку «Поля» и нажмите «+ Добавить поле», чтобы разместить текст на сертификате.</p>
                  </div>
                )}
              </>
            ) : leftTab === 'fields' ? (
              <FieldList
                fields={fields}
                activeFieldId={activeFieldId}
                onSelectField={handleSelectField}
                onAddField={() => addField(
                  excelData?.columns.find(c => /name|fio|full.?name|participant/i.test(c)) || excelData?.columns[0] || 'name',
                  template?.width, template?.height
                )}
                onDeleteField={deleteField}
                onDuplicateField={duplicateField}
                excelColumns={excelData?.columns || []}
              />
            ) : (
              <GenerationHistory
                onDownload={(exportId, type) => {
                  const url = type === 'zip'
                    ? `/api/download/zip/${exportId}`
                    : `/api/download/pdf/${exportId}`;
                  window.open(url, '_blank');
                }}
              />
            )}
          </div>
        </aside>

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
            excelLoaded={hasExcel}
            fieldsCount={fields.length}
          />
        </main>

        <aside className="panel panel-right">
          <div className="panel-header">
            Настройки поля
          </div>
          <div className="panel-body">
            <FieldSettingsPanel
              field={activeField}
              onUpdateField={(updates) => activeFieldId && updateField(activeFieldId, updates)}
              excelColumns={excelData?.columns || []}
              fonts={fonts}
              fontCatalog={fontCatalog}
              onDownloadGoogleFont={handleDownloadGoogleFont}
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

            {!activeField && allResourcesReady && (
              <div className="tip-card" style={{ marginTop: '0.5rem' }}>
                <span className="tip-card-icon"><IconTip size={18} /></span>
                <div>
                  Выберите поле на макете слева или в списке полей, чтобы настроить его параметры.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="app-footer">
        {isGenerating ? (
          <ProgressBar
            progress={generationProgress}
            currentRowName={currentProcessingRow}
            total={excelData?.rows.length || 0}
            current={Math.round(((excelData?.rows.length || 0) * generationProgress) / 100)}
          />
        ) : (
          <>
            <ExportSettings
              config={exportConfig}
              onUpdateConfig={(updates) => setExportConfig({ ...exportConfig, ...updates })}
              excelColumns={excelData?.columns || []}
              onGenerate={handleGenerateAll}
              onGenerateTest={handleGenerateTestPdf}
              isValid={isReadyToGenerate}
              isGenerating={isGenerating}
            />
            <div className="auth-notice"><span className="badge badge-primary">API Auth</span> Vercel: set <code>ADMIN_PASSWORD</code> env</div>
          </>
        )}
      </footer>

      {generationResult && (
        <GenerationResult
          result={generationResult}
          onClose={() => setGenerationResult(null)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}