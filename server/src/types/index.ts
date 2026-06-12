// ============================================
// Shared types for Certificate Generator
// ============================================

export interface ExcelData {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface TemplateInfo {
  id: string;
  type: 'pdf' | 'png' | 'jpg' | 'jpeg';
  width: number;   // in PDF points
  height: number;  // in PDF points
  originalFileName: string;
  filePath: string;
  previewUrl: string;
}

export interface FontInfo {
  id: string;
  fileName: string;
  fontName: string;
  filePath: string;
}

export type TextOverflow = 'single-line' | 'multiline' | 'shrink-to-fit' | 'clip';
export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

export interface FieldConfig {
  id: string;
  label: string;
  excelColumn: string;
  x: number;         // PDF points from left
  y: number;         // UI coordinate: PDF points from top
  width: number;     // PDF points
  height: number;    // PDF points
  fontFamily: string;
  fontSize: number;
  fontColor: string;  // hex e.g. "#000000"
  align: HAlign;
  verticalAlign: VAlign;
  bold: boolean;
  italic: boolean;
  rotation: number;   // degrees
  letterSpacing: number;
  lineHeight: number; // multiplier, e.g. 1.2
  mode: TextOverflow;
  visible: boolean;
  maxWidth?: number;
}

export interface ExportConfig {
  mode: 'separate' | 'combined';
  fileNameTemplate: string;
  fileNameColumn: string;
  outputFolder: string;
  combinedFileName: string;
}

export interface ProjectConfig {
  version: string;
  template: {
    width: number;
    height: number;
    unit: string;
  };
  fields: FieldConfig[];
  export: ExportConfig;
}

export interface GenerateRequest {
  excelData: Record<string, string>[];
  columns: string[];
  templateId: string;
  fields: FieldConfig[];
  exportConfig: ExportConfig;
  fontIds: string[];
}

export interface GenerateResult {
  success: boolean;
  exportId: string;
  outputPath: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  files: string[];
  errors: { row: number; message: string }[];
}

export interface ReportJson {
  createdAt: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  exportMode: string;
  files: string[];
  errors: { row: number; message: string }[];
}
