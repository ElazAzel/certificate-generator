import type { ExcelData, TemplateInfo, FontInfo, FieldConfig, ExportConfig, CatalogFontInfo } from '../types/index';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function uploadExcel(file: File): Promise<ExcelData & { filePath: string }> {
  const formData = new FormData();
  formData.append('excel', file);

  const response = await fetch(`${BASE_URL}/upload/excel`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Ошибка загрузки Excel файла');
  }

  return response.json();
}

export async function uploadTemplate(file: File): Promise<TemplateInfo> {
  const formData = new FormData();
  formData.append('template', file);

  const response = await fetch(`${BASE_URL}/upload/template`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Ошибка загрузки шаблона');
  }

  return response.json();
}

export async function uploadFont(file: File): Promise<FontInfo> {
  const formData = new FormData();
  formData.append('font', file);

  const response = await fetch(`${BASE_URL}/upload/font`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Ошибка загрузки шрифта');
  }

  return response.json();
}

export async function getFonts(): Promise<FontInfo[]> {
  const response = await fetch(`${BASE_URL}/upload/fonts`);
  if (!response.ok) {
    throw new Error('Не удалось получить список шрифтов');
  }
  return response.json();
}

export interface GenerateParams {
  excelData: Record<string, string>[];
  templateId: string;
  fields: FieldConfig[];
  exportConfig: ExportConfig;
}

export interface GenerateResponse {
  success: boolean;
  exportId: string;
  outputPath: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  files: string[];
  errors: { row: number; message: string }[];
}

export async function generateCertificates(params: GenerateParams): Promise<GenerateResponse> {
  const response = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Ошибка генерации сертификатов');
  }

  return response.json();
}

export async function getTemplates(): Promise<TemplateInfo[]> {
  const response = await fetch(`${BASE_URL}/upload/templates`);
  if (!response.ok) throw new Error('Не удалось получить список шаблонов');
  return response.json();
}

export interface GenerationHistoryItem {
  id: string;
  templateId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  exportMode: string;
  outputPath: string;
  createdAt: string;
}

export async function getGenerationHistory(page = 1, limit = 20): Promise<{
  items: GenerationHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const response = await fetch(`${BASE_URL}/generate/history?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Не удалось получить историю генераций');
  return response.json();
}

export async function generateTestPdf(
  row: Record<string, string>,
  templateId: string,
  fields: FieldConfig[]
): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/generate/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ row, templateId, fields }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Ошибка генерации тестового превью');
  }

  return response.blob();
}

export async function getFontCatalog(search?: string): Promise<{ items: CatalogFontInfo[]; total: number }> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', '200');
  const response = await fetch(`${BASE_URL}/fonts/catalog?${params}`);
  if (!response.ok) throw new Error('Не удалось получить каталог шрифтов');
  return response.json();
}

export async function downloadGoogleFont(fontName: string): Promise<FontInfo> {
  const response = await fetch(`${BASE_URL}/fonts/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fontName, weight: 'Regular' }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Ошибка загрузки шрифта');
  }
  return response.json();
}
