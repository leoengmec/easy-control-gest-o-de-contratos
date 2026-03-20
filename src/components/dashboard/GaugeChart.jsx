import React from 'react';

export default function GaugeChart({ value, label, sublabel, rawValue, color = "#3b82f6" }) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  const formatCurrency = (v) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  return (
    <div className="flex flex-col items-center p-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
          <circle 
            cx="48" cy="48" r={radius} stroke={color} strokeWidth="8" fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-sm font-black text-[#1a2e4a]">{clampedValue.toFixed(0)}%</span>
        </div>
      </div>
      <div className="text-center mt-2">
        <div className="text-[10px] font-bold uppercase text-gray-400 tracking-tighter">{label}</div>
        <div className="text-[11px] font-bold text-[#1a2e4a]">{formatCurrency(rawValue)}</div>
        <div className="text-[9px] text-gray-400">{sublabel}</div>
      </div>
    </div>
  );
}