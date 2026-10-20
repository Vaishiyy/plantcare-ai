import { PlantCondition, SensorReading, Thresholds } from '../../types';

export interface ConditionDiagnostic {
  condition: PlantCondition;
  headline: string;
  explanation: string;
  recommendedAction: string;
  urgency: 'low' | 'moderate' | 'high' | 'critical';
  color: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    ring: string;
  };
  factorWeights: {
    moisture: number; // 0 - 100
    temperature: number;
    humidity: number;
    light: number;
  };
  confidenceDisplay?: string;
}

/**
 * Diagnostic explanations and color definitions for the 4 ML categories
 */
export const CONDITION_METADATA: Record<PlantCondition, Omit<ConditionDiagnostic, 'factorWeights' | 'explanation' | 'confidenceDisplay'>> = {
  Healthy: {
    condition: 'Healthy',
    headline: 'Vibrant & Thriving',
    recommendedAction: 'Maintain current routine. Inspect soil periodically and allow natural dry-down cycle.',
    urgency: 'low',
    color: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800',
      ring: '#10B981',
    },
  },
  'Needs Water': {
    condition: 'Needs Water',
    headline: 'Moisture Depleted',
    recommendedAction: 'Check soil moisture 2 inches below the surface. Provide thorough, even watering.',
    urgency: 'moderate',
    color: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badge: 'bg-amber-100 text-amber-800',
      ring: '#F59E0B',
    },
  },
  'Too Dry': {
    condition: 'Too Dry',
    headline: 'Severe Drought Stress',
    recommendedAction: 'Immediate thorough watering required. Ensure water reaches root ball; aerate compacted soil if needed.',
    urgency: 'high',
    color: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-800',
      ring: '#EA580C',
    },
  },
  'Poor Environment': {
    condition: 'Poor Environment',
    headline: 'Adverse Microclimate',
    recommendedAction: 'Review lighting exposure and airflow. Relocate away from heat vents, cold drafts, or dark corners.',
    urgency: 'critical',
    color: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
      badge: 'bg-rose-100 text-rose-800',
      ring: '#E11D48',
    },
  },
};

/**
 * Evaluates telemetry against species thresholds and generates detailed reasoning
 * for why the STM32 ML model output the given condition.
 */
export function analyzeTelemetry(
  reading: SensorReading,
  thresholds: Thresholds
): ConditionDiagnostic {
  const meta = CONDITION_METADATA[reading.condition];

  // Calculate environmental deviations from thresholds
  const moistureBelowMin = thresholds.moistureMin - reading.moisture;
  const tempAboveMax = reading.temperature - thresholds.tempMax;
  const tempBelowMin = thresholds.tempMin - reading.temperature;
  const humidityBelowMin = thresholds.humidityMin - reading.humidity;
  const humidityAboveMax = reading.humidity - thresholds.humidityMax;
  const lightBelowMin = thresholds.lightMin - reading.light;
  const lightAboveMax = reading.light - thresholds.lightMax;

  // Compute factor attribution weights (estimating input feature relevance for ML output)
  let wMoisture = 25;
  let wTemp = 25;
  let wHumidity = 25;
  let wLight = 25;

  let explanation = '';

  switch (reading.condition) {
    case 'Healthy':
      wMoisture = 30;
      wTemp = 25;
      wHumidity = 25;
      wLight = 20;
      explanation = `All four environmental sensors are balanced within the recommended ranges for this species (${reading.moisture}% moisture, ${reading.temperature.toFixed(1)}°C, ${reading.humidity}% humidity, ${reading.light} lux).`;
      break;

    case 'Needs Water':
      wMoisture = 65;
      wTemp = 15;
      wHumidity = 10;
      wLight = 10;
      explanation = `The on-chip classifier detected sub-optimal soil moisture (${reading.moisture}% vs recommended ${thresholds.moistureMin}-${thresholds.moistureMax}%). Temperature and humidity remain within acceptable operational tolerances.`;
      break;

    case 'Too Dry':
      wMoisture = 80;
      wTemp = 10;
      wHumidity = 5;
      wLight = 5;
      explanation = `Critically low soil moisture level (${reading.moisture}%) detected by the ADC soil sensor. Extended exposure in this zone leads to root shrinkage and permanent wilting.`;
      break;

    case 'Poor Environment':
      wMoisture = 15;
      wTemp = 40;
      wHumidity = 25;
      wLight = 20;

      const anomalies: string[] = [];
      if (tempAboveMax > 0) anomalies.push(`excessive heat (${reading.temperature.toFixed(1)}°C > ${thresholds.tempMax}°C)`);
      if (tempBelowMin > 0) anomalies.push(`cold chill (${reading.temperature.toFixed(1)}°C < ${thresholds.tempMin}°C)`);
      if (humidityAboveMax > 0) anomalies.push(`stagnant humidity (${reading.humidity}% > ${thresholds.humidityMax}%)`);
      if (humidityBelowMin > 0) anomalies.push(`dry air (${reading.humidity}% < ${thresholds.humidityMin}%)`);
      if (lightAboveMax > 0) anomalies.push(`scorching light (${reading.light} lux > ${thresholds.lightMax} lux)`);
      if (lightBelowMin > 0) anomalies.push(`insufficient light (${reading.light} lux < ${thresholds.lightMin} lux)`);

      const anomalyText = anomalies.length > 0 ? anomalies.join(', ') : 'microclimate stress combination';
      explanation = `The microcontroller identified microclimate stress driven by ${anomalyText}. While soil moisture may be present, ambient stressors inhibit healthy transpiration.`;
      break;
  }

  return {
    ...meta,
    explanation,
    factorWeights: {
      moisture: wMoisture,
      temperature: wTemp,
      humidity: wHumidity,
      light: wLight,
    },
    confidenceDisplay: reading.confidence !== undefined 
      ? `${Math.round(reading.confidence * 100)}%` 
      : undefined,
  };
}

/**
 * Fallback soft-classifier used in demo mode or when testing custom sensor inputs
 */
export function classifyReadingSimulated(
  reading: Omit<SensorReading, 'condition'>,
  thresholds: Thresholds
): PlantCondition {
  // Severe dry soil takes priority
  if (reading.moisture < thresholds.moistureMin * 0.5) {
    return 'Too Dry';
  }
  // Moderate dry soil
  if (reading.moisture < thresholds.moistureMin) {
    return 'Needs Water';
  }
  // Ambient extreme stress
  if (
    reading.temperature > thresholds.tempMax + 4 ||
    reading.temperature < thresholds.tempMin - 4 ||
    reading.light < thresholds.lightMin * 0.4 ||
    reading.humidity > thresholds.humidityMax + 20 ||
    reading.humidity < thresholds.humidityMin * 0.6
  ) {
    return 'Poor Environment';
  }
  // Else healthy
  return 'Healthy';
}
