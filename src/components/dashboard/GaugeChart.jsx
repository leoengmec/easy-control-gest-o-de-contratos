export default function GaugeChart({ value, label, sublabel, color }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  const radius = 54;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - pct / 100);

  const getColor = () => {
    if (color) return color;
    if (pct >= 90) return "#ef4444";
    if (pct >= 70) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 140, height: 80 }}>
        <svg width="140" height="80" viewBox="0 0 140 80">
          {/* trilho cinza */}
          <path
            d="M 14 70 A 56 56 0 0 1 126 70"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* arco colorido */}
          <path
            d="M 14 70 A 56 56 0 0 1 126 70"
            fill="none"
            stroke={getColor()}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-xl font-bold" style={{ color: getColor() }}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="text-xs font-semibold text-gray-700 text-center mt-1">{label}</div>
      {sublabel && <div className="text-[10px] text-gray-400 text-center">{sublabel}</div>}
    </div>
  );
}