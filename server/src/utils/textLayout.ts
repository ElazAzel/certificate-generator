import type { PDFFont } from 'pdf-lib';

/**
 * Measure the width of text using a PDF font.
 */
export function measureTextWidth(text: string, font: PDFFont, fontSize: number): number {
  try {
    return font.widthOfTextAtSize(text, fontSize);
  } catch {
    // If font doesn't support some characters, estimate
    return text.length * fontSize * 0.5;
  }
}

/**
 * Wrap text into lines that fit within maxWidth.
 */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  if (!text) return [''];
  if (maxWidth <= 0) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = measureTextWidth(testLine, font, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Find the maximum font size that fits text within the given width.
 * Uses binary search for efficiency.
 */
export function shrinkTextToFit(
  text: string,
  font: PDFFont,
  maxFontSize: number,
  maxWidth: number,
  maxHeight: number,
  lineHeight: number = 1.2,
  multiline: boolean = false
): number {
  let low = 1;
  let high = maxFontSize;
  let bestSize = low;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;

    if (multiline) {
      const lines = wrapText(text, font, mid, maxWidth);
      const totalHeight = lines.length * mid * lineHeight;
      if (totalHeight <= maxHeight) {
        bestSize = mid;
        low = mid;
      } else {
        high = mid;
      }
    } else {
      const width = measureTextWidth(text, font, mid);
      const height = mid;
      if (width <= maxWidth && height <= maxHeight) {
        bestSize = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    if (high - low < 0.5) break;
  }

  return Math.floor(bestSize);
}
