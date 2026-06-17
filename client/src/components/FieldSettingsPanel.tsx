import React from 'react';
import type { FieldConfig, FontInfo, HAlign, VAlign, TextOverflow } from '../types/index';

interface FieldSettingsPanelProps {
  field?: FieldConfig;
  onUpdateField: (updates: Partial<FieldConfig>) => void;
  excelColumns: string[];
  fonts: FontInfo[];
}

export const FieldSettingsPanel: React.FC<FieldSettingsPanelProps> = ({
  field,
  onUpdateField,
  excelColumns,
  fonts,
}) => {
  if (!field) {
    return (
      <div className="settings-empty">
        Выберите или добавьте поле на макете для настройки параметров.
      </div>
    );
  }

  const allFontsList = fonts.length > 0
    ? fonts.map(f => f.fontName)
    : ['Arial'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="form-group">
        <label>Название поля</label>
        <input 
          type="text" 
          className="input-control" 
          value={field.label}
          onChange={(e) => onUpdateField({ label: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Колонка Excel</label>
        {excelColumns.length > 0 ? (
          <select 
            className="input-control"
            value={field.excelColumn}
            onChange={(e) => onUpdateField({ excelColumn: e.target.value })}
          >
            {excelColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className="input-control"
            value={field.excelColumn}
            onChange={(e) => onUpdateField({ excelColumn: e.target.value })}
            placeholder="Имя колонки (например, name)"
          />
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Координата X (pt)</label>
          <input 
            type="number" 
            className="input-control"
            value={field.x}
            onChange={(e) => onUpdateField({ x: Number(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label>Координата Y (pt)</label>
          <input 
            type="number" 
            className="input-control"
            value={field.y}
            onChange={(e) => onUpdateField({ y: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Ширина (pt)</label>
          <input 
            type="number" 
            className="input-control"
            value={field.width}
            onChange={(e) => onUpdateField({ width: Number(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label>Высота (pt)</label>
          <input 
            type="number" 
            className="input-control"
            value={field.height}
            onChange={(e) => onUpdateField({ height: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Шрифт</label>
          <select 
            className="input-control"
            value={field.fontFamily}
            onChange={(e) => onUpdateField({ fontFamily: e.target.value })}
          >
            {allFontsList.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Размер шрифта (pt)</label>
          <input 
            type="number" 
            className="input-control"
            value={field.fontSize}
            onChange={(e) => onUpdateField({ fontSize: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ justifyContent: 'center' }}>
          <label>Стиль</label>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              className={`align-btn ${field.bold ? 'active' : ''}`}
              onClick={() => onUpdateField({ bold: !field.bold })}
              title="Полужирный"
              style={{ fontWeight: 'bold', minWidth: '2rem' }}
            >
              Ж
            </button>
            <button
              type="button"
              className={`align-btn ${field.italic ? 'active' : ''}`}
              onClick={() => onUpdateField({ italic: !field.italic })}
              title="Курсив"
              style={{ fontStyle: 'italic', minWidth: '2rem' }}
            >
              К
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Межбуквенный интервал</label>
          <input 
            type="number" 
            step="0.5"
            className="input-control"
            value={field.letterSpacing}
            onChange={(e) => onUpdateField({ letterSpacing: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-row" style={{ alignItems: 'end' }}>
        <div className="form-group">
          <label>Цвет текста</label>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <input 
              type="color" 
              value={field.fontColor}
              onChange={(e) => onUpdateField({ fontColor: e.target.value })}
            />
            <input 
              type="text" 
              className="input-control" 
              value={field.fontColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') {
                  onUpdateField({ fontColor: v || '#000000' });
                }
              }}
              placeholder="#000000"
              style={{ flex: 1, fontSize: '0.8rem' }}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Поворот (град.)</label>
          <input 
            type="number" 
            className="input-control"
            value={field.rotation}
            onChange={(e) => onUpdateField({ rotation: Number(e.target.value) })}
            min="-360"
            max="360"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Горизонтальное выравнивание</label>
        <div className="align-group">
          {(['left', 'center', 'right'] as HAlign[]).map((align) => (
            <button
              key={align}
              type="button"
              className={`align-btn ${field.align === align ? 'active' : ''}`}
              onClick={() => onUpdateField({ align })}
            >
              {align === 'left' ? '⬅️' : align === 'center' ? '↔️' : '➡️'}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Вертикальное выравнивание</label>
        <div className="align-group">
          {(['top', 'middle', 'bottom'] as VAlign[]).map((valign) => (
            <button
              key={valign}
              type="button"
              className={`align-btn ${field.verticalAlign === valign ? 'active' : ''}`}
              onClick={() => onUpdateField({ verticalAlign: valign })}
            >
              {valign === 'top' ? '⬆️' : valign === 'middle' ? '↕️' : '⬇️'}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Поведение при переполнении</label>
        <select 
          className="input-control"
          value={field.mode}
          onChange={(e) => onUpdateField({ mode: e.target.value as TextOverflow })}
        >
          <option value="single-line">В одну строку (выход за границы)</option>
          <option value="shrink-to-fit">Автоуменьшение шрифта (shrink)</option>
          <option value="multiline">Перенос строк (multiline)</option>
          <option value="clip">Обрезать текст (clip)</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Высота строки (коэф.)</label>
          <input 
            type="number" 
            step="0.1"
            className="input-control"
            value={field.lineHeight}
            onChange={(e) => onUpdateField({ lineHeight: Number(e.target.value) })}
            disabled={field.mode !== 'multiline'}
          />
        </div>
        <div className="form-group" style={{ justifyContent: 'center', alignSelf: 'center' }}>
          <label className="input-checkbox">
            <input 
              type="checkbox"
              checked={field.visible}
              onChange={(e) => onUpdateField({ visible: e.target.checked })}
            />
            <span>Видимое поле</span>
          </label>
        </div>
      </div>
    </div>
  );
};
