import React from 'react';
import type { FieldConfig } from '../types/index';
import { IconDuplicate, IconDelete, IconAddField, IconField } from './Icons';

interface FieldListProps {
  fields: FieldConfig[];
  activeFieldId?: string;
  onSelectField: (id: string) => void;
  onAddField: () => void;
  onDeleteField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  excelColumns: string[];
}

export const FieldList: React.FC<FieldListProps> = ({
  fields,
  activeFieldId,
  onSelectField,
  onAddField,
  onDeleteField,
  onDuplicateField,
  excelColumns,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="section-title">
          Список полей ({fields.length})
        </span>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
          onClick={onAddField}
        >
          <IconAddField size={14} /> Добавить поле
        </button>
      </div>

      {fields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <IconField size={40} style={{ opacity: 0.5 }} />
          <div>Пока нет ни одного поля. Нажмите «+ Добавить поле», чтобы разместить текст на сертификате.</div>
        </div>
      ) : (
        <div className="fields-list" style={{ overflowY: 'auto', flex: 1 }}>
          {fields.map((field) => (
            <div 
              key={field.id}
              className={`field-item ${activeFieldId === field.id ? 'active' : ''}`}
              onClick={() => onSelectField(field.id)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                <span className="field-item-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {field.label}
                </span>
                <span className="field-item-col">
                  Колонка: <code>{field.excelColumn}</code>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                <button 
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                  title="Дублировать"
                  onClick={() => onDuplicateField(field.id)}
                >
                  <IconDuplicate size={14} />
                </button>
                <button 
                  className="btn btn-danger"
                  style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', borderColor: '#fca5a5' }}
                  title="Удалить"
                  onClick={() => { if (window.confirm(`Удалить поле "${field.label}"?`)) onDeleteField(field.id); }}
                >
                  <IconDelete size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
