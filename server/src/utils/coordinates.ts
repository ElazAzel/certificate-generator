/**
 * Coordinate conversion utilities.
 * 
 * In the browser (UI): origin is top-left, Y increases downward.
 * In PDF: origin is bottom-left, Y increases upward.
 * 
 * All coordinates are stored in PDF points (1 pt = 1/72 inch).
 */

/**
 * Convert UI Y-coordinate to PDF Y-coordinate.
 * UI: y from top of page
 * PDF: y from bottom of page
 */
export function uiYToPdfY(uiY: number, pageHeight: number, fieldHeight: number): number {
  return pageHeight - uiY - fieldHeight;
}

/**
 * Calculate the baseline Y position for text within a field,
 * considering vertical alignment and font metrics.
 */
export function calculateTextBaselineY(
  fieldPdfY: number,
  fieldHeight: number,
  fontSize: number,
  verticalAlign: 'top' | 'middle' | 'bottom',
  lineCount: number = 1,
  lineHeight: number = 1.2
): number {
  const totalTextHeight = fontSize * lineHeight * lineCount;
  const ascent = fontSize * 0.8; // approximate ascender

  switch (verticalAlign) {
    case 'top':
      return fieldPdfY + fieldHeight - ascent;
    case 'bottom':
      return fieldPdfY + totalTextHeight - ascent;
    case 'middle':
    default:
      return fieldPdfY + (fieldHeight + totalTextHeight) / 2 - ascent;
  }
}

/**
 * Calculate the X position for text within a field,
 * considering horizontal alignment.
 */
export function calculateTextX(
  fieldX: number,
  fieldWidth: number,
  textWidth: number,
  align: 'left' | 'center' | 'right'
): number {
  switch (align) {
    case 'center':
      return fieldX + (fieldWidth - textWidth) / 2;
    case 'right':
      return fieldX + fieldWidth - textWidth;
    case 'left':
    default:
      return fieldX;
  }
}
