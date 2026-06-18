import React, { useState, useEffect, useRef } from 'react';
import type { FieldConfig, FontInfo, CatalogFontInfo, HAlign, VAlign, TextOverflow } from '../types/index';
import { getFontCatalog } from '../utils/api';

interface FieldSettingsPanelProps {
  field?: FieldConfig;
  onUpdateField: (updates: Partial<FieldConfig>) => void;
  excelColumns: string[];
  fonts: FontInfo[];
  fontCatalog: CatalogFontInfo[];
  onDownloadGoogleFont: (fontName: string) => void;
}

export const FieldSettingsPanel: React.FC<FieldSettingsPanelProps> = ({
  field,
  onUpdateField,
  excelColumns,
  fonts,
  fontCatalog,
  onDownloadGoogleFont,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogFontInfo[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

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

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const result = await getFontCatalog(q);
      setSearchResults(result.items);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleDownload = async (fontName: string) => {
    setDownloading(fontName);
    await onDownloadGoogleFont(fontName);
    setDownloading(null);
    setSearchResults(null);
    setSearchQuery('');
  };

  // Font preview
  const selectedFontRec = fonts.find(f => f.fontName === field.fontFamily);
  const fontFileUrl = selectedFontRec ? `/api/fonts/file/${selectedFontRec.id}` : null;
  const fontFaceName = useRef<string>('');

  useEffect(() => {
    const prev = fontFaceName.current;
    const url = fontFileUrl;
    if (!url || !selectedFontRec) { fontFaceName.current = ''; return; }
    const name = `fprev-${selectedFontRec.id}`;
    fontFaceName.current = name;

    const style = document.createElement('style');
    style.id = `ffstyle-${selectedFontRec.id}`;
    style.textContent = `@font-face{font-family:'${name}';src:url('${url}') format('truetype');font-display:swap}`;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById(`ffstyle-${selectedFontRec.id}`);
      if (el) el.remove();
    };
  }, [fontFileUrl]);

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

      {/* Font preview */}
      {fontFileUrl && fontFaceName.current && (
        <div style={{
          marginTop: '-0.5rem', marginBottom: '0.25rem',
          padding: '0.5rem', borderRadius: '6px',
          background: 'var(--surface-secondary, #f5f5f5)',
          border: '1px solid var(--border, #ddd)',
          fontSize: `${Math.min(field.fontSize * 0.6, 18)}px`,
          lineHeight: 1.5, overflow: 'hidden',
        }}>
          <div style={{ fontFamily: fontFaceName.current, marginBottom: '0.25rem' }}>
            {field.label || 'Образец текста'}
          </div>
          <div style={{
            fontFamily: fontFaceName.current, fontSize: '0.7em',
            color: 'var(--text-tertiary, #999)', opacity: 0.7,
          }}>
            Аа Бб Вв Гг Дд Её Жж Зз Ии Йй Кк Лл Мм Нн Оо Пп Рр Сс Тт Уу Фф Хх Цц Чч Шш Щщ Ъъ Ыы Ьь Ээ Юю Яя
          </div>
        </div>
      )}

      {/* Google Fonts search */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Загрузить из Google Fonts...
          </summary>
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
            <input
              type="text"
              className="input-control"
              placeholder="Название шрифта (например, Roboto)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, fontSize: '0.8rem' }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              {searching ? '...' : 'Найти'}
            </button>
          </div>

          {/* Search results */}
          {searchResults && searchResults.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
              Шрифты не найдены
            </div>
          )}
          {searchResults && searchResults.length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
              {searchResults.map((f) => {
                const alreadyInstalled = fonts.some(ff => ff.fontName === f.fontName);
                return (
                  <div key={f.fontName} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--border)',
                    fontSize: '0.8rem',
                  }}>
                    <span>
                      <strong>{f.fontName}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: '0.4rem' }}>
                        {f.category}
                      </span>
                    </span>
                    {alreadyInstalled ? (
                      <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Установлен</span>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDownload(f.fontName)}
                        disabled={downloading === f.fontName}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {downloading === f.fontName ? '...' : '⬇ Загрузить'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Popular fonts quick-list */}
          {!searchResults && (
            <div style={{ marginTop: '0.4rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                Популярные:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {fontCatalog.filter(f => !fonts.some(ff => ff.fontName === f.fontName)).slice(0, 12).map(f => (
                  <button
                    key={f.fontName}
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDownload(f.fontName)}
                    disabled={downloading === f.fontName}
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                  >
                    {downloading === f.fontName ? '...' : `+${f.fontName}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </details>
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
