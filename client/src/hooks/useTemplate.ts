import { useState } from 'react';
import type { TemplateInfo } from '../types/index';
import { uploadTemplate } from '../utils/api';

export function useTemplate() {
  const [template, setTemplate] = useState<TemplateInfo | undefined>(undefined);
  const [templateName, setTemplateName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await uploadTemplate(file);
      setTemplate(result);
      setTemplateName(file.name);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки шаблона');
      setTemplate(undefined);
      setTemplateName('');
    } finally {
      setLoading(false);
    }
  };

  const setTemplateDirect = (info: TemplateInfo, name: string) => {
    setTemplate(info);
    setTemplateName(name);
  };

  return {
    template,
    templateName,
    loading,
    error,
    handleTemplateUpload,
    setTemplateDirect,
  };
}
