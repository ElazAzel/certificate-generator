/**
 * UI to PDF coordinate conversions on the client side.
 * 
 * We assume that the template page size has dimensions width x height in PDF points.
 * When rendered in UI, it is scaled down/up to fit the container.
 * 
 * Coordinate storage unit: PDF points (1/72 inch).
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert raw page coordinates to visual styles based on current canvas scale.
 */
export function getVisualStyles(
  field: { x: number; y: number; width: number; height: number },
  scale: number
) {
  return {
    left: `${field.x * scale}px`,
    top: `${field.y * scale}px`,
    width: `${field.width * scale}px`,
    height: `${field.height * scale}px`,
  };
}

/**
 * Scale from screen pixels back to original PDF-points.
 */
export function screenToPdfPoints(val: number, scale: number): number {
  return Math.round(val / scale);
}
