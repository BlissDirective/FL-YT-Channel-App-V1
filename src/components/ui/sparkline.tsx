import { cn } from "@/lib/cn";

/**
 * Tiny inline-SVG sparkline — no chart lib, renders in server components.
 * Draws a warm amber line with a soft gradient fill under it. Flat/short
 * series degrade gracefully (a single point shows a dot).
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const id = `spark-${Math.round(min)}-${Math.round(max)}-${data.length}`;

  const points = data.map((v, i) => {
    const x = pad + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
    const y = pad + h - ((v - min) / span) * h;
    return [x, y] as const;
  });

  if (points.length === 0) return null;

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${pad + h} ${line} ${pad + w},${pad + h}`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Trend sparkline"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10D48E" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10D48E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 1 && <polygon points={area} fill={`url(#${id})`} />}
      <polyline
        points={line}
        fill="none"
        stroke="#10D48E"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="#10D48E" />
    </svg>
  );
}
