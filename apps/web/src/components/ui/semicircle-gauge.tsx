"use client";

/** Gradient semicircle gauge, like the reference's "Performance Trend"
    and "System Health" arcs. */
export function SemicircleGauge({
  percent,
  size = 200,
  strokeWidth = 12,
  children,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Centered content (big number, label) */
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r; // semicircle
  const dash = (clamped / 100) * circumference;
  const gradId = "gauge-grad";

  return (
    <div className="relative inline-block" style={{ width: size, height: size / 2 + strokeWidth }}>
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F5B829" />
            <stop offset="100%" stopColor="#F0876C" />
          </linearGradient>
        </defs>
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke="var(--color-canvas)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
        <g transform={`translate(${cx}, ${cy})`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-1">
        {children}
      </div>
    </div>
  );
}
