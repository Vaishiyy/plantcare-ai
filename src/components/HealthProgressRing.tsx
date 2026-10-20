import React from 'react';
import { PlantCondition } from '../types';

interface HealthProgressRingProps {
  condition: PlantCondition;
  confidence?: number;
  size?: number;
  strokeWidth?: number;
}

export const HealthProgressRing: React.FC<HealthProgressRingProps> = ({
  condition,
  confidence,
  size = 120,
  strokeWidth = 9,
}) => {
  // Score mapping based on condition
  let score = 96;
  let strokeColor = '#10B981'; // green
  let glowColor = 'rgba(16, 185, 129, 0.2)';
  let conditionLabel = 'Healthy';

  switch (condition) {
    case 'Healthy':
      score = 96;
      strokeColor = '#10B981';
      glowColor = 'rgba(16, 185, 129, 0.25)';
      conditionLabel = 'Optimal';
      break;
    case 'Needs Water':
      score = 68;
      strokeColor = '#F59E0B'; // amber
      glowColor = 'rgba(245, 158, 11, 0.25)';
      conditionLabel = 'Thirsty';
      break;
    case 'Too Dry':
      score = 38;
      strokeColor = '#EA580C'; // orange
      glowColor = 'rgba(234, 88, 12, 0.25)';
      conditionLabel = 'Critical Dry';
      break;
    case 'Poor Environment':
      score = 45;
      strokeColor = '#E11D48'; // rose
      glowColor = 'rgba(225, 29, 72, 0.25)';
      conditionLabel = 'Stressed';
      break;
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 2px 6px ${glowColor})` }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold font-display text-forest-900 leading-none">
          {score}%
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mt-1">
          {conditionLabel}
        </span>
        {confidence !== undefined && (
          <span className="text-[9px] text-stone-400 mt-0.5">
            {Math.round(confidence * 100)}% conf
          </span>
        )}
      </div>
    </div>
  );
};
