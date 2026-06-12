import { useState } from 'react';
import type { FieldConfig } from '../types/index';

export function useFields() {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | undefined>(undefined);

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

    setFields([...fields, newField]);
    setActiveFieldId(id);
  };

  const updateField = (id: string, updates: Partial<FieldConfig>) => {
    setFields(
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (activeFieldId === id) {
      setActiveFieldId(undefined);
    }
  };

  const duplicateField = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;

    const newId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Shift duplicated field slightly down-right
    const duplicated: FieldConfig = {
      ...field,
      id: newId,
      label: `${field.label} (Копия)`,
      x: Math.min(field.x + 20, 800),
      y: Math.min(field.y + 20, 500),
    };

    setFields([...fields, duplicated]);
    setActiveFieldId(newId);
  };

  const activeField = fields.find((f) => f.id === activeFieldId);

  return {
    fields,
    setFields,
    activeFieldId,
    setActiveFieldId,
    activeField,
    addField,
    updateField,
    deleteField,
    duplicateField,
  };
}
