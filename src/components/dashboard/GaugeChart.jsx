import React from 'react';

const GaugeChart = ({ value, label, thresholds }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 10;
  const displayValue = Math.min(Math.max(value || 0, 0), 100);
  const offset = circumference - (displayValue / 100) * circumference;

  // Determina a cor com base nos thresholds
  let fillColor = "#6b7280"; // Cinza padrão (sem dados)
  if (value > 0) {
    fillColor = "#ef4444"; // Vermelho (>85%)
    for (const threshold of thresholds) {
      if (displayValue <= threshold.value) {
        if (threshold.color === "green") fillColor = "#16a34a";
        if (threshold.color === "yellow") fillColor = "#d97706";
        if (threshold.color === "red") fillColor = "#ef4444";
        break;
      }
    }
  }

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Background */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progresso */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-bold" style={{ color: fillColor }}>
          {displayValue.toFixed(1)}%
        </span>
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
};

export default GaugeChart;