"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shrinkTextToFit = exports.wrapText = exports.measureTextWidth = void 0;
function measureTextWidth(text, font, fontSize) {
    try {
        return font.widthOfTextAtSize(text, fontSize);
    }
    catch {
        return text.length * fontSize * 0.5;
    }
}
exports.measureTextWidth = measureTextWidth;
function wrapText(text, font, fontSize, maxWidth) {
    if (!text)
        return [''];
    if (maxWidth <= 0)
        return [text];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = measureTextWidth(testLine, font, fontSize);
        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        }
        else {
            currentLine = testLine;
        }
    }
    if (currentLine)
        lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
}
exports.wrapText = wrapText;
function shrinkTextToFit(text, font, maxFontSize, maxWidth, maxHeight, lineHeight = 1.2, multiline = false) {
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
            }
            else {
                high = mid;
            }
        }
        else {
            const width = measureTextWidth(text, font, mid);
            const height = mid;
            if (width <= maxWidth && height <= maxHeight) {
                bestSize = mid;
                low = mid;
            }
            else {
                high = mid;
            }
        }
        if (high - low < 0.5)
            break;
    }
    return Math.floor(bestSize);
}
exports.shrinkTextToFit = shrinkTextToFit;
