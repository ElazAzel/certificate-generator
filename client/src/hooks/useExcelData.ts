import { useState } from 'react';
import type { ExcelData } from '../types/index';
import { uploadExcel } from '../utils/api';

export function useExcelData() {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [excelName, setExcelName] = useState<string>('');
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleExcelUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await uploadExcel(file);
      setExcelData({
        columns: result.columns,
        rows: result.rows,
        totalRows: result.totalRows,
      });
      setExcelName(file.name);
      setCurrentRowIndex(0);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке Excel файла');
      setExcelData(null);
      setExcelName('');
    } finally {
      setLoading(false);
    }
  };

  const setExcelDirect = (data: ExcelData, name: string) => {
    setExcelData(data);
    setExcelName(name);
    setCurrentRowIndex(0);
  };

  return {
    excelData,
    excelName,
    currentRowIndex,
    loading,
    error,
    handleExcelUpload,
    setCurrentRowIndex,
    setExcelDirect,
  };
}
