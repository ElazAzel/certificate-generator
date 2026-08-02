"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTextX = exports.calculateTextBaselineY = exports.uiYToPdfY = void 0;
function uiYToPdfY(uiY, pageHeight, fieldHeight) {
    return pageHeight - uiY - fieldHeight;
}
exports.uiYToPdfY = uiYToPdfY;
function calculateTextBaselineY(fieldPdfY, fieldHeight, fontSize, verticalAlign, lineCount = 1, lineHeight = 1.2) {
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
exports.calculateTextBaselineY = calculateTextBaselineY;
function calculateTextX(fieldX, fieldWidth, textWidth, align) {
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
exports.calculateTextX = calculateTextX;
