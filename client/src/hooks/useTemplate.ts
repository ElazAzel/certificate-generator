import { useState, useRef, useCallback } from 'react';
import type { TemplateInfo } from '../types/index';
import { uploadTemplate } from '../utils/api';

export function useTemplate() {
  const [template, setTemplate] = useState<TemplateInfo | undefined>(undefined);
  const [templateName, setTemplateName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const applyPreview = useCallback((info: TemplateInfo, file?: File) => {
    releaseObjectUrl();
    if (file) {
      fileRef.current = file;
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      return { ...info, previewUrl: url };
    }
    return info;
  }, [releaseObjectUrl]);

  const handleTemplateUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await uploadTemplate(file);
      const withPreview = applyPreview(result, file);
      setTemplate(withPreview);
      setTemplateName(file.name);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки шаблона');
      setTemplate(undefined);
      setTemplateName('');
      fileRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const setTemplateDirect = (info: TemplateInfo, name: string) => {
    const withPreview = applyPreview(info, info.previewUrl && info.previewUrl.startsWith('blob:') ? fileRef.current || undefined : undefined);
    setTemplate(withPreview);
    setTemplateName(name);
  };

  const resetTemplate = () => {
    releaseObjectUrl();
    fileRef.current = null;
    setTemplate(undefined);
    setTemplateName('');
  };

  /** File bytes as base64 for sending template with generate requests (serverless-safe) */
  const getTemplateData = async (): Promise<{ base64: string; type: string; width: number; height: number } | null> => {
    const file = fileRef.current;
    const t = template;
    if (!file || !t) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve({ base64, type: t.type, width: t.width, height: t.height });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  return {
    template,
    templateName,
    loading,
    error,
    handleTemplateUpload,
    setTemplateDirect,
    resetTemplate,
    getTemplateData,
  };
}
