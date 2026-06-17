export function uiYToPdfY(uiY: number, pageHeight: number, fieldHeight: number): number {
  return pageHeight - uiY - fieldHeight;
}

export function calculateTextBaselineY(
  fieldPdfY: number,
  fieldHeight: number,
  fontSize: number,
  verticalAlign: 'top' | 'middle' | 'bottom',
  lineCount: number = 1,
  lineHeight: number = 1.2
): number {
  const totalTextHeight = fontSize * lineHeight * lineCount;
  const ascent = fontSize * 0.8;
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
