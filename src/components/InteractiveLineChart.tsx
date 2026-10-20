import React, { useState } from 'react';
import { SensorReading, Thresholds } from '../types';

interface InteractiveLineChartProps {
  data: SensorReading[];
  thresholds: Thresholds;
  defaultMetric?: 'moisture' | 'temperature' | 'humidity' | 'light';
  height?: number;
  showMetricSelector?: boolean;
}

export const InteractiveLineChart: React.FC<InteractiveLineChartProps> = ({
  data,
  thresholds,
  defaultMetric = 'moisture',
  height = 220,
  showMetricSelector = true,
}) => {
  const [activeMetric, setActiveMetric] = useState<'moisture' | 'temperature' | 'humidity' | 'light'>(defaultMetric);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const metricConfig = {
    moisture: {
      label: 'Moisture',
      unit: '%',
      color: '#2563EB', // blue
      bgGrad: 'rgba(37, 99, 235, 0.15)',
      minTarget: thresholds.moistureMin,
      maxTarget: thresholds.moistureMax,
      defaultMin: 0,
      defaultMax: 100,
    },
    temperature: {
      label: 'Temp',
      unit: '°C',
      color: '#D97706', // amber
      bgGrad: 'rgba(217, 119, 6, 0.15)',
      minTarget: thresholds.tempMin,
      maxTarget: thresholds.tempMax,
      defaultMin: 10,
      defaultMax: 40,
    },
    humidity: {
      label: 'Humidity',
      unit: '%',
      color: '#0D9488', // teal
      bgGrad: 'rgba(13, 148, 136, 0.15)',
      minTarget: thresholds.humidityMin,
      maxTarget: thresholds.humidityMax,
      defaultMin: 20,
      defaultMax: 95,
    },
    light: {
      label: 'Light',
      unit: 'lux',
      color: '#CA8A04', // golden yellow
      bgGrad: 'rgba(202, 138, 4, 0.15)',
      minTarget: thresholds.lightMin,
      maxTarget: thresholds.lightMax,
      defaultMin: 0,
      defaultMax: 1500,
    },
  }[activeMetric];

  if (!data || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-400 text-xs p-6"
        style={{ height }}
      >
        <span>No telemetry data available for this range.</span>
        <span className="text-[10px] mt-1 text-stone-400">Connect hardware or enable Demo Mode.</span>
      </div>
    );
  }

  // Extract values
  const values = data.map((d) => d[activeMetric]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Compute scale min/max with nice buffer
  const yMin = Math.max(0, Math.floor(Math.min(minVal, metricConfig.minTarget) * 0.85));
  const yMax = Math.ceil(Math.max(maxVal, metricConfig.maxTarget) * 1.15);
  const yRange = yMax - yMin === 0 ? 1 : yMax - yMin;

  const width = 360; // internal SVG coordinate width
  const padLeft = 32;
  const padRight = 14;
  const padTop = 15;
  const padBottom = 26;

  const graphWidth = width - padLeft - padRight;
  const graphHeight = height - padTop - padBottom;

  const points = data.map((d, idx) => {
    const val = d[activeMetric];
    const x = padLeft + (idx / Math.max(1, data.length - 1)) * graphWidth;
    const y = padTop + graphHeight - ((val - yMin) / yRange) * graphHeight;
    return { x, y, val, timestamp: d.timestamp, condition: d.condition };
  });

  const lineD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${lineD} L ${points[points.length - 1].x} ${padTop + graphHeight} L ${points[0].x} ${padTop + graphHeight} Z`;

  // Target safe band coordinates
  const safeTopY = padTop + graphHeight - ((metricConfig.maxTarget - yMin) / yRange) * graphHeight;
  const safeBottomY = padTop + graphHeight - ((metricConfig.minTarget - yMin) / yRange) * graphHeight;
  const safeHeight = Math.max(2, safeBottomY - safeTopY);

  const hoveredPoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="w-full">
      {/* Metric Selector Tabs */}
      {showMetricSelector && (
        <div className="flex items-center gap-1.5 p-1 bg-cream-200/70 rounded-xl mb-3 text-xs">
          {(['moisture', 'temperature', 'humidity', 'light'] as const).map((m) => {
            const isSel = activeMetric === m;
            const labels = { moisture: 'Soil %', temperature: 'Temp °C', humidity: 'Humidity %', light: 'Light lux' };
            return (
              <button
                key={m}
                onClick={() => {
                  setActiveMetric(m);
                  setHoveredIndex(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                  isSel
                    ? 'bg-white text-forest-900 shadow-soft font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>
      )}

      {/* Main SVG Container */}
      <div className="relative bg-white rounded-2xl border border-cream-200 p-3 shadow-soft overflow-hidden">
        {/* Metric Summary Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: metricConfig.color }}
            />
            <span className="text-xs font-semibold text-stone-700">
              {metricConfig.label} ({metricConfig.unit})
            </span>
          </div>

          <div className="text-[11px] text-stone-500 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-emerald-100 border border-emerald-300" />
              Target: {metricConfig.minTarget}–{metricConfig.maxTarget}{metricConfig.unit}
            </span>
          </div>
        </div>

        {/* Hovered details tooltip */}
        {hoveredPoint ? (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-forest-900/90 text-white text-[11px] px-3 py-1 rounded-full shadow-lg pointer-events-none flex items-center gap-2 z-10">
            <span className="font-bold">
              {hoveredPoint.val} {metricConfig.unit}
            </span>
            <span className="text-stone-300">
              {new Date(hoveredPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-emerald-300">({hoveredPoint.condition})</span>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={`chart-grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricConfig.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={metricConfig.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Shaded Species Target Zone */}
          {safeHeight > 0 && (
            <rect
              x={padLeft}
              y={safeTopY}
              width={graphWidth}
              height={safeHeight}
              fill="#ECFDF5"
              opacity="0.6"
            />
          )}

          {/* Grid lines & Y axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + graphHeight * (1 - ratio);
            const val = Math.round(yMin + ratio * yRange);
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + graphWidth}
                  y2={y}
                  stroke="#F3F4F6"
                  strokeWidth="1"
                  strokeDasharray={ratio === 0 || ratio === 1 ? 'none' : '3 3'}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#9CA3AF"
                  fontFamily="sans-serif"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Species Target Line markers */}
          <line
            x1={padLeft}
            y1={safeTopY}
            x2={padLeft + graphWidth}
            y2={safeTopY}
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.7"
          />
          <line
            x1={padLeft}
            y1={safeBottomY}
            x2={padLeft + graphWidth}
            y2={safeBottomY}
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.7"
          />

          {/* Area Fill */}
          <path d={areaD} fill={`url(#chart-grad-${activeMetric})`} />

          {/* Main Line */}
          <path
            d={lineD}
            fill="none"
            stroke={metricConfig.color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points / Interaction Zones */}
          {points.map((pt, i) => (
            <g key={i} className="cursor-pointer">
              {/* Invisible wide hit target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="10"
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
              {/* Visible circle on hover or last point */}
              {(hoveredIndex === i || i === points.length - 1) && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === i ? 4.5 : 3}
                  fill={metricConfig.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all"
                />
              )}
            </g>
          ))}

          {/* X axis start & end timestamps */}
          <text
            x={padLeft}
            y={height - 6}
            textAnchor="start"
            fontSize="9"
            fill="#9CA3AF"
          >
            {new Date(data[0].timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
          </text>
          <text
            x={padLeft + graphWidth}
            y={height - 6}
            textAnchor="end"
            fontSize="9"
            fill="#9CA3AF"
          >
            {new Date(data[data.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
        </svg>
      </div>
    </div>
  );
};
