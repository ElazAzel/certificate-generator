import { useState, useCallback } from 'react';
import type { FieldConfig } from '../types/index';

export function useFields() {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | undefined>(undefined);
  const [undoStack, setUndoStack] = useState<FieldConfig[][]>([]);
  const [redoStack, setRedoStack] = useState<FieldConfig[][]>([]);

  const pushHistory = useCallback((prev: FieldConfig[]) => {
    setUndoStack(s => [...s.slice(-50), prev]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, fields]);
    setFields(prev);
  }, [undoStack, fields]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    setUndoStack(s => [...s, fields]);
    setFields(next);
  }, [redoStack, fields]);

  const setFieldsWithHistory = useCallback((newFields: FieldConfig[] | ((prev: FieldConfig[]) => FieldConfig[])) => {
    setFields(prev => {
      const next = typeof newFields === 'function' ? newFields(prev) : newFields;
      if (JSON.stringify(prev) !== JSON.stringify(next)) pushHistory(prev);
      return next;
    });
  }, [pushHistory]);

  const addField = (defaultColumn: string, templateWidth?: number, templateHeight?: number) => {
    const tW = templateWidth && templateWidth > 0 ? templateWidth : 842;
    const tH = templateHeight && templateHeight > 0 ? templateHeight : 595;
    const width = 400;
    const height = 50;
    const x = Math.round((tW - width) / 2);
    const y = Math.round((tH - height) / 2);
    const id = `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newField: FieldConfig = {
      id,
      label: `Поле ${fields.length + 1}`,
      excelColumn: defaultColumn || 'name',
      x: x > 0 ? x : 50,
      y: y > 0 ? y : 50,
      width,
      height,
      fontFamily: 'Arial',
      fontSize: 24,
      fontColor: '#000000',
      align: 'center',
      verticalAlign: 'middle',
      bold: false,
      italic: false,
      rotation: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
      mode: 'shrink-to-fit',
      visible: true,
    };

    setFieldsWithHistory([...fields, newField]);
    setActiveFieldId(id);
  };

  const updateField = (id: string, updates: Partial<FieldConfig>) => {
    setFields(prev => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      if (JSON.stringify(prev) !== JSON.stringify(next)) pushHistory(prev);
      return next;
    });
  };

  const deleteField = (id: string) => {
    setFields(prev => {
      const next = prev.filter((f) => f.id !== id);
      pushHistory(prev);
      if (activeFieldId === id) setActiveFieldId(undefined);
      return next;
    });
  };

  const duplicateField = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;

    const newId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const duplicated: FieldConfig = {
      ...field,
      id: newId,
      label: `${field.label} (Копия)`,
      x: field.x + 20,
      y: field.y + 20,
    };

    setFieldsWithHistory([...fields, duplicated]);
    setActiveFieldId(newId);
  };

  const activeField = fields.find((f) => f.id === activeFieldId);

  return {
    fields,
    setFields: setFieldsWithHistory,
    activeFieldId,
    setActiveFieldId,
    activeField,
    addField,
    updateField,
    deleteField,
    duplicateField,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
  };
}
