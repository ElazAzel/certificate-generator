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
import { IconFiles, IconField, IconHistory, IconGenerate, IconTip, IconClose, IconChevronLeft, IconChevronRight } from './components/Icons';

import { useExcelData } from './hooks/useExcelData';
import { useTemplate } from './hooks/useTemplate';
import { useFields } from './hooks/useFields';

import type { FontInfo, ExportConfig, ProjectConfig, FieldConfig, CatalogFontInfo } from './types/index';
import type { GenerateResponse, SampleTemplateInfo } from './utils/api';
import { getFonts, uploadFont, generateCertificates, generateTestPdf, getTemplates, getFontCatalog, downloadGoogleFont, getSampleTemplates, downloadSampleTemplate } from './utils/api';
import { generateImages } from './utils/imageExport';

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
    getTemplateData,
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
    format: 'pdf',
  });
  const [sampleTemplates, setSampleTemplates] = useState<SampleTemplateInfo[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentProcessingRow, setCurrentProcessingRow] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [mobileSheet, setMobileSheet] = useState<'files' | 'fields' | 'export' | 'history' | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

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

  const loadSampleTemplates = async () => {
    try {
      const items = await getSampleTemplates();
      setSampleTemplates(items);
    } catch {
      // samples unavailable
    }
  };

  const handleLoadSampleTemplate = async (fileName: string) => {
    if (sampleLoading) return;
    setSampleLoading(true);
    try {
      const file = await downloadSampleTemplate(fileName);
      await handleTemplateUpload(file);
      showToast(`Шаблон «${fileName}» загружен`, 'success');
    } catch (err: any) {
      showToast(`Ошибка загрузки шаблона: ${err.message}`, 'error');
    } finally {
      setSampleLoading(false);
    }
  };

  useEffect(() => {
    loadFontsList();
    loadFontCatalog();
    loadDefaultTemplate();
    loadSampleTemplates();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheet(null);
        return;
      }
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
      format: 'pdf',
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
      if (f.contentType === 'qr') {
        if (!f.qrValueTemplate || !f.qrValueTemplate.trim()) {
          errors.push(`Для поля "${f.label}" укажите содержимое QR-кода.`);
        }
      } else if (f.excelColumn) {
        if (excelData && !excelData.columns.includes(f.excelColumn)) {
          errors.push(`Поле "${f.label}" привязано к несуществующей колонке "${f.excelColumn}".`);
        }
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
      const tplData = await getTemplateData();
      const blob = await generateTestPdf(
        row,
        template.id,
        fields,
        tplData || undefined
      );
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

    const format = exportConfig.format || 'pdf';

    try {
      if (format !== 'pdf') {
        setCurrentProcessingRow('Генерация изображений...');
        const zip = await generateImages(
          excelData,
          template,
          fields,
          format,
          exportConfig.fileNameTemplate,
          (done, total) => {
            setGenerationProgress(Math.round((done / total) * 100));
          }
        );
        setGenerationProgress(100);
        setCurrentProcessingRow('');

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportConfig.combinedFileName.replace(/\.pdf$/i, '') || 'certificates';
        a.download = `${a.download}_images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Сгенерировано изображений: ${excelData.rows.length}`, 'success');
        return;
      }

      const rows = excelData.rows;
      const total = rows.length;

      setCurrentProcessingRow('Генерация...');
      const tplData = await getTemplateData();
      const response = await generateCertificates({
        excelData: rows,
        templateId: template.id,
        fields,
        exportConfig,
        templateData: tplData?.base64,
        templateType: tplData?.type,
        templateWidth: tplData?.width,
        templateHeight: tplData?.height,
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
    if (rightCollapsed) setRightCollapsed(false);
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
    if (isMobileViewport) {
      setMobileSheet(null);
    } else {
      setMobileSheet('fields');
    }
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

  const filesTabContent = (
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
        sampleTemplates={sampleTemplates}
        onLoadSampleTemplate={handleLoadSampleTemplate}
        sampleLoading={sampleLoading}
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
  );

  const fieldsTabContent = (
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
  );

  const historyTabContent = (
    <GenerationHistory
      onDownload={(exportId, type) => {
        const url = type === 'zip'
          ? `/api/download/zip/${exportId}`
          : `/api/download/pdf/${exportId}`;
        window.open(url, '_blank');
      }}
    />
  );

  const fieldSettingsContent = (
    <>
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
    </>
  );

  const settingsContent = (
    <>
      {fieldSettingsContent}

      {!activeField && allResourcesReady && (
        <div className="tip-card" style={{ marginTop: '0.5rem' }}>
          <span className="tip-card-icon"><IconTip size={18} /></span>
          <div>
            Выберите поле на макете слева или в списке полей, чтобы настроить его параметры.
          </div>
        </div>
      )}
    </>
  );

  const exportContent = (
    <>
      {isGenerating ? (
        <>
          <ProgressBar
            progress={generationProgress}
            currentRowName={currentProcessingRow}
            total={excelData?.rows.length || 0}
            current={Math.round(((excelData?.rows.length || 0) * generationProgress) / 100)}
          />
          <div className="mobile-generating-note">
            Создание сертификатов... Индикатор выполнения внизу экрана.
          </div>
        </>
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
    </>
  );

  const mobileSheetTitle =
    mobileSheet === 'files' ? 'Загрузка данных'
    : mobileSheet === 'fields' ? 'Поля и настройки'
    : mobileSheet === 'export' ? 'Экспорт'
    : 'История';

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
        <div className="quick-tip-bar" style={{
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

      <div className={`app-workspace${leftCollapsed ? ' left-hidden' : ''}${rightCollapsed ? ' right-hidden' : ''}`}>
        <aside className={`panel panel-left${leftCollapsed ? ' collapsed' : ''}`}>
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
            <button
              className="panel-collapse"
              onClick={() => setLeftCollapsed(c => !c)}
              title={leftCollapsed ? 'Показать панель' : 'Свернуть панель'}
              aria-label={leftCollapsed ? 'Показать панель' : 'Свернуть панель'}
            >
              <IconChevronLeft size={16} />
            </button>
          </div>
          
          <div className="panel-body">
            {leftTab === 'files' ? filesTabContent : leftTab === 'fields' ? fieldsTabContent : historyTabContent}
          </div>
        </aside>

        {leftCollapsed && (
          <button
            className="workspace-toggle toggle-left"
            onClick={() => setLeftCollapsed(false)}
            title="Показать панель"
            aria-label="Показать панель загрузки"
          >
            <IconChevronRight size={18} />
          </button>
        )}

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
            onAddField={() => addField(
              excelData?.columns.find(c => /name|fio|full.?name|participant/i.test(c)) || excelData?.columns[0] || 'name',
              template?.width, template?.height
            )}
            onBackgroundClick={() => setActiveFieldId(undefined)}
          />
        </main>

        {rightCollapsed && (
          <button
            className="workspace-toggle toggle-right"
            onClick={() => setRightCollapsed(false)}
            title="Показать панель"
            aria-label="Показать панель настроек"
          >
            <IconChevronLeft size={18} />
          </button>
        )}

        <aside className={`panel panel-right${rightCollapsed ? ' collapsed' : ''}`}>
          <div className="panel-header">
            <span>Настройки поля</span>
            <button
              className="panel-collapse"
              onClick={() => setRightCollapsed(c => !c)}
              title={rightCollapsed ? 'Показать панель' : 'Свернуть панель'}
              aria-label={rightCollapsed ? 'Показать панель' : 'Свернуть панель'}
            >
              <IconChevronRight size={16} />
            </button>
          </div>
          <div className="panel-body">
            {settingsContent}
          </div>
        </aside>
      </div>

      <footer className="app-footer">
        {exportContent}
      </footer>

      <nav className="mobile-nav">
        <button
          className={`mobile-nav-btn${mobileSheet === 'files' ? ' active' : ''}`}
          onClick={() => setMobileSheet(s => s === 'files' ? null : 'files')}
        >
          <IconFiles size={20} />
          <span>Загрузка</span>
        </button>
        <button
          className={`mobile-nav-btn${mobileSheet === 'fields' ? ' active' : ''}`}
          onClick={() => setMobileSheet(s => s === 'fields' ? null : 'fields')}
          disabled={!allResourcesReady}
        >
          <IconField size={20} />
          <span>Поля</span>
        </button>
        <button
          className={`mobile-nav-btn${mobileSheet === 'export' ? ' active' : ''}`}
          onClick={() => setMobileSheet(s => s === 'export' ? null : 'export')}
        >
          <IconGenerate size={20} />
          <span>Экспорт</span>
        </button>
        <button
          className={`mobile-nav-btn${mobileSheet === 'history' ? ' active' : ''}`}
          onClick={() => setMobileSheet(s => s === 'history' ? null : 'history')}
        >
          <IconHistory size={20} />
          <span>История</span>
        </button>
      </nav>

      {isGenerating && (
        <div className="mobile-progress">
          <ProgressBar
            progress={generationProgress}
            currentRowName={currentProcessingRow}
            total={excelData?.rows.length || 0}
            current={Math.round(((excelData?.rows.length || 0) * generationProgress) / 100)}
          />
        </div>
      )}

      {mobileSheet && (
        <div className="mobile-sheet">
          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">{mobileSheetTitle}</span>
            <button
              className="mobile-sheet-close"
              onClick={() => setMobileSheet(null)}
              aria-label="Закрыть"
            >
              <IconClose size={18} />
            </button>
          </div>
          <div className="mobile-sheet-body">
            {mobileSheet === 'files' && filesTabContent}
            {mobileSheet === 'fields' && fieldsTabContent}
            {mobileSheet === 'export' && exportContent}
            {mobileSheet === 'history' && historyTabContent}
          </div>
        </div>
      )}

      {activeField && (
        <div className="mobile-inspector">
          <div className="mobile-inspector-header">
            <span className="mobile-inspector-title">
              <IconField size={14} />
              <span className="mobile-inspector-name">{activeField.label}</span>
            </span>
            <button
              className="mobile-sheet-close"
              onClick={() => setActiveFieldId(undefined)}
              aria-label="Закрыть настройки поля"
            >
              <IconClose size={16} />
            </button>
          </div>
          <div className="mobile-inspector-body">
            {fieldSettingsContent}
          </div>
        </div>
      )}

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