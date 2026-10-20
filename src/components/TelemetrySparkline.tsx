import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  min?: number;
  max?: number;
  showPoints?: boolean;
}

export const TelemetrySparkline: React.FC<SparklineProps> = ({
  data,
  color = '#2D6A4F',
  height = 36,
  width = 90,
  min: propMin,
  max: propMax,
  showPoints = true,
}) => {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-stone-400 bg-stone-50 rounded"
        style={{ height, width }}
      >
        Waiting data...
      </div>
    );
  }

  // Take the most recent 16 points for clean sparklines
  const points = data.slice(-16);
  const min = propMin !== undefined ? propMin : Math.min(...points);
  const max = propMax !== undefined ? propMax : Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;

  const padding = 3;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  const coordinates = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1)) * drawWidth;
    const y = height - padding - ((val - min) / range) * drawHeight;
    return { x, y };
  });

  const pathD = coordinates.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${coordinates[coordinates.length - 1].x} ${height} L ${coordinates[0].x} ${height} Z`;

  const lastPt = coordinates[coordinates.length - 1];

  const gradientId = `spark-grad-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showPoints && lastPt && (
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="2.5"
          fill={color}
          className="animate-pulse ring-2 ring-white"
        />
      )}
    </svg>
  );
};
