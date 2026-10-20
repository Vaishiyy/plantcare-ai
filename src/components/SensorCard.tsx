import React from 'react';
import { TelemetrySparkline } from './TelemetrySparkline';
import { LucideIcon } from 'lucide-react';

interface SensorCardProps {
  title: string;
  value: number;
  unit: string;
  minTarget: number;
  maxTarget: number;
  icon: LucideIcon;
  sparklineData: number[];
  colorTheme: 'moisture' | 'temperature' | 'humidity' | 'light';
  onClick?: () => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  title,
  value,
  unit,
  minTarget,
  maxTarget,
  icon: Icon,
  sparklineData,
  colorTheme,
  onClick,
}) => {
  // Determine status relative to species target
  let status: 'optimal' | 'low' | 'high' | 'critical_low' | 'critical_high' = 'optimal';
  if (value < minTarget * 0.5) {
    status = 'critical_low';
  } else if (value < minTarget) {
    status = 'low';
  } else if (value > maxTarget * 1.3) {
    status = 'critical_high';
  } else if (value > maxTarget) {
    status = 'high';
  }

  // Visual status pill configuration
  let statusLabel = 'Optimal';
  let statusPillClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let sparkColor = '#2D6A4F';

  switch (status) {
    case 'optimal':
      statusLabel = 'Optimal';
      statusPillClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      sparkColor = '#10B981';
      break;
    case 'low':
      statusLabel = 'Low';
      statusPillClass = 'bg-amber-50 text-amber-800 border-amber-200';
      sparkColor = '#F59E0B';
      break;
    case 'critical_low':
      statusLabel = 'Too Dry';
      statusPillClass = 'bg-orange-50 text-orange-800 border-orange-200';
      sparkColor = '#EA580C';
      break;
    case 'high':
      statusLabel = 'High';
      statusPillClass = 'bg-amber-50 text-amber-800 border-amber-200';
      sparkColor = '#F59E0B';
      break;
    case 'critical_high':
      statusLabel = 'Excessive';
      statusPillClass = 'bg-rose-50 text-rose-800 border-rose-200';
      sparkColor = '#E11D48';
      break;
  }

  // Theme icons & tints
  const themeStyles = {
    moisture: {
      iconBg: 'bg-blue-50 text-blue-700',
    },
    temperature: {
      iconBg: 'bg-amber-50 text-amber-700',
    },
    humidity: {
      iconBg: 'bg-teal-50 text-teal-700',
    },
    light: {
      iconBg: 'bg-yellow-50 text-yellow-700',
    },
  }[colorTheme];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className="p-3.5 bg-white rounded-2xl border border-cream-200 shadow-soft hover:shadow-card transition-all duration-200 flex flex-col justify-between cursor-pointer group"
    >
      {/* Top Header: Icon, Title, and Status Pill */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${themeStyles.iconBg}`}>
            <Icon className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-stone-700 group-hover:text-forest-700 transition-colors">
              {title}
            </h3>
            <span className="text-[10px] text-stone-400 block leading-tight">
              Ideal: {minTarget}–{maxTarget}{unit}
            </span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Main Metric Value and Sparkline */}
      <div className="flex items-end justify-between mt-1">
        <div>
          <span className="text-2xl font-bold font-display text-forest-900 tracking-tight">
            {typeof value === 'number' && !isNaN(value) ? value : '--'}
          </span>
          <span className="text-xs font-medium text-stone-500 ml-1">{unit}</span>
        </div>

        <div className="w-[85px] h-[32px] flex items-end justify-end">
          <TelemetrySparkline
            data={sparklineData}
            color={sparkColor}
            height={30}
            width={85}
          />
        </div>
      </div>
    </div>
  );
};
