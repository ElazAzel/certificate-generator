import * as XLSX from 'xlsx';
import * as fs from 'fs';
import type { ExcelData } from '../types/index.js';

/**
 * Parse an Excel file and return column headers + row data.
 */
export function parseExcelFile(filePath: string): ExcelData {
  if (!fs.existsSync(filePath)) {
    throw new Error('Excel файл не найден');
  }

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  if (workbook.SheetNames.length === 0) {
    throw new Error('Excel файл не содержит листов');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error('Не удалось прочитать лист Excel');
  }

  // Convert to JSON with header row
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (rawData.length === 0) {
    throw new Error('Excel файл пуст или не содержит данных');
  }

  // Get column headers from first row keys
  const columns = Object.keys(rawData[0]);

  // Convert all values to strings
  const rows: Record<string, string>[] = rawData.map(row => {
    const stringRow: Record<string, string> = {};
    for (const key of columns) {
      const val = row[key];
      stringRow[key] = val !== undefined && val !== null ? String(val) : '';
    }
    return stringRow;
  });

  return {
    columns,
    rows,
    totalRows: rows.length,
  };
}
