/**
 * Sanitize a file name by removing/replacing forbidden characters.
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  // Remove forbidden characters for Windows/Linux/Mac
  let sanitized = name.replace(/[/\\:*?"<>|]/g, '_');
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  return sanitized || 'unnamed';
}

/**
 * Apply a file name template using row data.
 * Template example: "{name}_{certificate_number}.pdf"
 */
export function applyFileNameTemplate(
  template: string,
  row: Record<string, string>,
  rowIndex: number
): string {
  if (!template) return `certificate_${String(rowIndex + 1).padStart(3, '0')}`;

  let fileName = template;
  // Replace all {column_name} placeholders
  fileName = fileName.replace(/\{(\w+)\}/g, (_, key) => {
    const value = row[key];
    return value !== undefined && value !== null && value !== '' ? String(value) : '';
  });

  // Remove .pdf extension if present — we add it ourselves
  fileName = fileName.replace(/\.pdf$/i, '');

  // Sanitize
  fileName = sanitizeFileName(fileName);

  // Fallback if empty
  if (!fileName) {
    fileName = `certificate_${String(rowIndex + 1).padStart(3, '0')}`;
  }

  return fileName;
}

/**
 * Make file names unique by appending _2, _3, etc. for duplicates.
 */
export function makeUniqueFileNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  const result: string[] = [];

  for (const name of names) {
    const lower = name.toLowerCase();
    const count = counts.get(lower) || 0;
    counts.set(lower, count + 1);

    if (count === 0) {
      result.push(name);
    } else {
      result.push(`${name}_${count + 1}`);
    }
  }

  return result;
}
