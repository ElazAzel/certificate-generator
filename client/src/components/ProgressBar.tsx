import React from 'react';

interface ProgressBarProps {
  progress: number;
  currentRowName: string;
  total: number;
  current: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  currentRowName,
  total,
  current,
}) => {
  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>Создание PDF-сертификатов...</span>
        <span>{current} / {total} ({progress}%)</span>
      </div>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-status">
        {currentRowName ? `Обработка: ${currentRowName}` : 'Пожалуйста, подождите...'}
      </div>
    </div>
  );
};
