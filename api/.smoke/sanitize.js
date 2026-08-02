"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFileNameTemplate = exports.sanitizeFileName = void 0;
function sanitizeFileName(name) {
    if (!name || typeof name !== 'string')
        return '';
    let sanitized = name.replace(/[/\\:*?"<>|]/g, '_');
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
    if (sanitized.length > 200)
        sanitized = sanitized.substring(0, 200);
    return sanitized || 'unnamed';
}
exports.sanitizeFileName = sanitizeFileName;
function applyFileNameTemplate(template, row, rowIndex) {
    if (!template)
        return `certificate_${String(rowIndex + 1).padStart(3, '0')}`;
    let fileName = template.replace(/\{(\w+)\}/g, (_, key) => {
        const value = row[key];
        return value !== undefined && value !== null && value !== '' ? String(value) : '';
    });
    fileName = fileName.replace(/\.pdf$/i, '');
    fileName = sanitizeFileName(fileName);
    if (!fileName)
        fileName = `certificate_${String(rowIndex + 1).padStart(3, '0')}`;
    return fileName;
}
exports.applyFileNameTemplate = applyFileNameTemplate;
