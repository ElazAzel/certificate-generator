export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  let sanitized = name.replace(/[/\\:*?"<>|]/g, '_');
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
  if (sanitized.length > 200) sanitized = sanitized.substring(0, 200);
  return sanitized || 'unnamed';
}

export function applyFileNameTemplate(
  template: string, row: Record<string, string>, rowIndex: number
): string {
  if (!template) return `certificate_${String(rowIndex + 1).padStart(3, '0')}`;
  let fileName = template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = row[key];
    return value !== undefined && value !== null && value !== '' ? String(value) : '';
  });
  fileName = fileName.replace(/\.pdf$/i, '');
  fileName = sanitizeFileName(fileName);
  if (!fileName) fileName = `certificate_${String(rowIndex + 1).padStart(3, '0')}`;
  return fileName;
}
