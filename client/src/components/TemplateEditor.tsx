import React, { useRef, useState, useEffect } from 'react';
import type { FieldConfig, TemplateInfo } from '../types/index';

interface TemplateEditorProps {
  template?: TemplateInfo;
  fields: FieldConfig[];
  activeFieldId?: string;
  onSelectField: (id: string) => void;
  onUpdateField: (id: string, updates: Partial<FieldConfig>) => void;
  currentRowData?: Record<string, string>;
  scale: number;
  onScaleChange: (scale: number) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  fields,
  activeFieldId,
  onSelectField,
  onUpdateField,
  currentRowData = {},
  scale,
  onScaleChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fitScheduled = useRef(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dragState, setDragState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    startFieldX: number;
    startFieldY: number;
    type: 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw';
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Auto-fit function
  const handleFit = () => {
    if (!template || !containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 48;
    const containerH = containerRef.current.clientHeight - 48;
    const scaleW = containerW / template.width;
    const scaleH = containerH / template.height;
    const fitScale = Math.min(scaleW, scaleH, 1.5);
    onScaleChange(Math.round(fitScale * 100) / 100);
  };

  useEffect(() => {
    if (!template || !containerRef.current) return;
    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      if (!fitScheduled.current) {
        fitScheduled.current = true;
        requestAnimationFrame(() => { fitScheduled.current = false; handleFit(); });
      }
    });
    observer.observe(container);
    handleFit();
    return () => observer.disconnect();
  }, [template]);

  // Render PDF first page as image preview
  useEffect(() => {
    if (template?.type !== 'pdf') { setPdfPreviewUrl(null); return; }
    let cancelled = false;
    setPdfLoading(true);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const pdf = await pdfjs.getDocument({ url: template.previewUrl }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        if (!cancelled) setPdfPreviewUrl(canvas.toDataURL());
      } catch (e) {
        if (!cancelled) { console.warn('PDF preview failed:', e); setPdfPreviewUrl(null); }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [template?.id]);

  // Handles starting drag/resize operations
  const handleMouseDown = (
    e: React.MouseEvent,
    field: FieldConfig,
    actionType: 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectField(field.id);

    setDragState({
      fieldId: field.id,
      startX: e.clientX,
      startY: e.clientY,
      startFieldX: field.x,
      startFieldY: field.y,
      type: actionType,
      startWidth: field.width,
      startHeight: field.height,
    });
  };

  // Dragging mousemove handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !template) return;

      const dx = (e.clientX - dragState.startX) / scale;
      const dy = (e.clientY - dragState.startY) / scale;

      const field = fields.find((f) => f.id === dragState.fieldId);
      if (!field) return;

      if (dragState.type === 'move') {
        const newX = Math.max(0, Math.min(template.width - field.width, dragState.startFieldX + dx));
        const newY = Math.max(0, Math.min(template.height - field.height, dragState.startFieldY + dy));
        onUpdateField(field.id, { x: Math.round(newX), y: Math.round(newY) });
      } else if (dragState.type === 'resize-se') {
        const newWidth = Math.max(20, Math.min(template.width - field.x, dragState.startWidth + dx));
        const newHeight = Math.max(10, Math.min(template.height - field.y, dragState.startHeight + dy));
        onUpdateField(field.id, { width: Math.round(newWidth), height: Math.round(newHeight) });
      } else if (dragState.type === 'resize-sw') {
        const newWidth = Math.max(20, dragState.startWidth - dx);
        const newX = dragState.startFieldX + (dragState.startWidth - newWidth);
        const newHeight = Math.max(10, Math.min(template.height - field.y, dragState.startHeight + dy));
        if (newX >= 0) {
          onUpdateField(field.id, { 
            x: Math.round(newX), 
            width: Math.round(newWidth),
            height: Math.round(newHeight)
          });
        }
      } else if (dragState.type === 'resize-ne') {
        const newWidth = Math.max(20, Math.min(template.width - field.x, dragState.startWidth + dx));
        const newHeight = Math.max(10, dragState.startHeight - dy);
        const newY = dragState.startFieldY + (dragState.startHeight - newHeight);
        if (newY >= 0) {
          onUpdateField(field.id, { 
            y: Math.round(newY), 
            width: Math.round(newWidth),
            height: Math.round(newHeight)
          });
        }
      } else if (dragState.type === 'resize-nw') {
        const newWidth = Math.max(20, dragState.startWidth - dx);
        const newX = dragState.startFieldX + (dragState.startWidth - newWidth);
        const newHeight = Math.max(10, dragState.startHeight - dy);
        const newY = dragState.startFieldY + (dragState.startHeight - newHeight);
        if (newX >= 0 && newY >= 0) {
          onUpdateField(field.id, { 
            x: Math.round(newX), 
            y: Math.round(newY), 
            width: Math.round(newWidth),
            height: Math.round(newHeight)
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, scale, template, fields]);

  if (!template) {
    return (
      <div className="editor-workspace">
        <div className="editor-canvas-container" style={{ minHeight: '380px' }}>
          <div className="empty-state">
            <span className="empty-state-icon">🖼️</span>
            <h3>Редактор макета</h3>
            <p>Загрузите шаблон сертификата, чтобы настроить расположение текстовых полей.</p>
          </div>
        </div>
      </div>
    );
  }

  const canvasWidth = template.width * scale;
  const canvasHeight = template.height * scale;

  return (
    <div className="editor-workspace" ref={containerRef}>
      <div className="editor-toolbar">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Масштаб:</span>
          <select 
            className="input-control" 
            value={scale} 
            onChange={(e) => onScaleChange(Number(e.target.value))}
            style={{ width: '80px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
          </select>
          <button 
            className="btn btn-secondary" 
            onClick={handleFit}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            По размеру экрана
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Размер документа: <strong>{template.width} × {template.height} pt</strong> ({template.type.toUpperCase()})
        </div>
      </div>

      <div className="editor-canvas-container">
        <div 
          className="canvas-wrapper" 
          ref={canvasRef}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
          }}
        >
          {template.type === 'pdf' && pdfLoading ? (
            <div className="canvas-bg-pdf" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 500 }}>
                ⏳ Загрузка PDF...
              </span>
            </div>
          ) : template.type === 'pdf' && pdfPreviewUrl ? (
            <img 
              className="canvas-bg-img" 
              src={pdfPreviewUrl} 
              alt="PDF шаблон" 
              style={{ width: '100%', height: '100%' }}
            />
          ) : template.type === 'pdf' ? (
            <div className="canvas-bg-pdf" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 500 }}>
                PDF не удалось загрузить для предпросмотра
              </span>
            </div>
          ) : (
            <img 
              className="canvas-bg-img" 
              src={template.previewUrl} 
              alt="Шаблон" 
              style={{ width: '100%', height: '100%' }}
            />
          )}

          {fields.map((field) => {
            const isActive = field.id === activeFieldId;
            const textValue = currentRowData[field.excelColumn] || `{${field.excelColumn}}`;
            
            const getTextAlignStyle = () => {
              if (field.align === 'center') return 'center';
              if (field.align === 'right') return 'right';
              return 'left';
            };

            const getVerticalAlignStyle = () => {
              if (field.verticalAlign === 'middle') return 'center';
              if (field.verticalAlign === 'bottom') return 'flex-end';
              return 'flex-start';
            };

            return (
              <div
                key={field.id}
                className={`visual-field ${isActive ? 'active' : ''}`}
                style={{
                  left: `${field.x * scale}px`,
                  top: `${field.y * scale}px`,
                  width: `${field.width * scale}px`,
                  height: `${field.height * scale}px`,
                  opacity: field.visible ? 1 : 0.4,
                  transform: field.rotation ? `rotate(${field.rotation}deg)` : undefined,
                }}
                onMouseDown={(e) => handleMouseDown(e, field, 'move')}
              >
                <div 
                  className="visual-field-content"
                  style={{
                    alignItems: getVerticalAlignStyle(),
                    justifyContent: getTextAlignStyle() === 'center' ? 'center' : getTextAlignStyle() === 'right' ? 'flex-end' : 'flex-start',
                    color: field.fontColor,
                    fontSize: `${field.fontSize * scale}px`,
                    fontFamily: field.fontFamily,
                    textAlign: getTextAlignStyle(),
                    lineHeight: field.lineHeight || 1.2,
                    fontWeight: field.bold ? 'bold' : 'normal',
                    fontStyle: field.italic ? 'italic' : 'normal',
                    whiteSpace: field.mode === 'multiline' ? 'normal' : 'nowrap',
                    textOverflow: field.mode === 'clip' ? 'ellipsis' : 'clip',
                    overflow: 'hidden',
                  }}
                >
                  {textValue}
                </div>

                {isActive && (
                  <>
                    <div 
                      className="resize-handle resize-handle-nw" 
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize-nw')}
                    />
                    <div 
                      className="resize-handle resize-handle-ne" 
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize-ne')}
                    />
                    <div 
                      className="resize-handle resize-handle-sw" 
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize-sw')}
                    />
                    <div 
                      className="resize-handle resize-handle-se" 
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize-se')}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};