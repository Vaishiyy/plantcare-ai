import React from 'react';
import { PlantCondition } from '../types';

interface HealthProgressRingProps {
  condition: PlantCondition;
  healthScore?: number;
  mlClassCode?: 0 | 1 | 2;
  confidence?: number;
  size?: number;
  strokeWidth?: number;
}

export const HealthProgressRing: React.FC<HealthProgressRingProps> = ({
  condition,
  healthScore,
  mlClassCode,
  confidence,
  size = 120,
  strokeWidth = 9,
}) => {
  const condStr = (condition || '').toLowerCase();

  const isHighStress =
    mlClassCode === 0 ||
    condStr.includes('high') ||
    condStr.includes('critical') ||
    condStr.includes('dry') ||
    condStr.includes('poor');

  const isModerateStress =
    mlClassCode === 1 ||
    condStr.includes('moderate') ||
    condStr.includes('water') ||
    condStr.includes('thirsty') ||
    condStr.includes('attention') ||
    condStr.includes('warning');

  let score = 96;
  let strokeColor = '#10B981'; // green
  let glowColor = 'rgba(16, 185, 129, 0.25)';
  let conditionLabel = 'Optimal';

  if (isHighStress) {
    score = healthScore !== undefined ? healthScore : 26;
    strokeColor = '#E11D48'; // red
    glowColor = 'rgba(225, 29, 72, 0.35)';
    conditionLabel = 'Critical';
  } else if (isModerateStress) {
    score = healthScore !== undefined ? healthScore : 62;
    strokeColor = '#F59E0B'; // amber
    glowColor = 'rgba(245, 158, 11, 0.35)';
    conditionLabel = 'Needs Care';
  } else {
    score = healthScore !== undefined ? healthScore : 96;
    strokeColor = '#10B981'; // green
    glowColor = 'rgba(16, 185, 129, 0.25)';
    conditionLabel = 'Optimal';
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F1F3F5"
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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
        <span
          className="text-2xl font-bold font-display leading-none transition-colors duration-500"
          style={{ color: isHighStress ? '#BE123C' : isModerateStress ? '#B45309' : '#065F46' }}
        >
          {score}%
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-full transition-colors duration-500"
          style={{
            backgroundColor: isHighStress ? '#FFE4E6' : isModerateStress ? '#FEF3C7' : '#D1FAE5',
            color: isHighStress ? '#9F1239' : isModerateStress ? '#92400E' : '#065F46',
          }}
        >
          {conditionLabel}
        </span>
        {confidence !== undefined && (
          <span className="text-[9px] text-stone-400 mt-0.5 font-medium">
            {Math.round(confidence * 100)}% conf
          </span>
        )}
      </div>
    </div>
  );
};
