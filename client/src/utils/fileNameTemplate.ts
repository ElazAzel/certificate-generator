/**
 * Replaces placeholders in fileNameTemplate using Excel row data.
 * E.g., "{name}_{certificate_number}" -> "Иван Иванов_123"
 */
export function formatFileName(
  template: string,
  row: Record<string, string>,
  fallbackIndex: number
): string {
  if (!template) {
    return `certificate_${String(fallbackIndex + 1).padStart(3, '0')}`;
  }

  let name = template;
  name = name.replace(/\{(\w+)\}/g, (_, key) => {
    const value = row[key];
    return value !== undefined && value !== null && value !== '' ? String(value) : '';
  });

  // Strip .pdf extension if typed
  name = name.replace(/\.pdf$/i, '');

  // Strip invalid file characters
  name = name.replace(/[/\\:*?"<>|]/g, '_');

  // Strip leading/trailing dots/spaces
  name = name.replace(/^[\s.]+|[\s.]+$/g, '');

  if (!name) {
    return `certificate_${String(fallbackIndex + 1).padStart(3, '0')}`;
  }

  return name;
}
