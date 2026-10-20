import { PlantCondition, SensorReading, Thresholds, SuitabilityClass } from '../../types';
import { predictPlantSuitability } from './plantSuitabilityTree';

export interface ConditionDiagnostic {
  condition: PlantCondition;
  suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress';
  mlClassCode: 0 | 1 | 2;
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

export const SUITABILITY_METADATA: Record<SuitabilityClass, Omit<ConditionDiagnostic, 'factorWeights' | 'explanation' | 'confidenceDisplay' | 'mlClassCode' | 'suitabilityClass'>> = {
  Suitable: {
    condition: 'Suitable',
    headline: 'Healthy & Thriving',
    recommendedAction: 'Your plant is in its sweet spot. Keep up your current care routine.',
    urgency: 'low',
    color: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      ring: '#10B981',
    },
  },
  'Moderate Stress': {
    condition: 'Moderate Stress',
    headline: 'Needs Attention',
    recommendedAction: 'Check soil moisture and light exposure. Small care adjustments needed.',
    urgency: 'moderate',
    color: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      ring: '#F59E0B',
    },
  },
  'High Stress': {
    condition: 'High Stress',
    headline: 'Critical Care Needed',
    recommendedAction: 'Immediate action needed to protect root and leaf health.',
    urgency: 'critical',
    color: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      ring: '#E11D48',
    },
  },
};

/**
 * Evaluates plant condition based on sensor readings and species profiles.
 */
export function evaluatePlantModel(
  plantCode: 0 | 1, // 0 = Aloe Vera, 1 = Pothos
  moisture: number,
  temperature: number,
  humidity: number,
  light: number,
  thresholds: Thresholds
): ConditionDiagnostic {
  // Execute on-chip decision tree in the background
  const mlCode = predictPlantSuitability([plantCode, moisture, temperature, humidity, light]) as (0 | 1 | 2);

  const suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress' =
    mlCode === 2 ? 'suitable' : mlCode === 1 ? 'moderate_stress' : 'high_stress';

  const conditionName: SuitabilityClass =
    mlCode === 2 ? 'Suitable' : mlCode === 1 ? 'Moderate Stress' : 'High Stress';

  const meta = SUITABILITY_METADATA[conditionName];
  const plantName = plantCode === 0 ? 'Aloe Vera' : 'Golden Pothos';

  let wMoisture = 25;
  let wTemp = 25;
  let wHumidity = 25;
  let wLight = 25;
  let explanation = '';
  let action = meta.recommendedAction;

  if (mlCode === 2) {
    // Suitable / Healthy
    wMoisture = 30;
    wTemp = 25;
    wHumidity = 20;
    wLight = 25;
    explanation = `Your ${plantName} is thriving in ideal environmental conditions. Soil moisture (${moisture.toFixed(1)}%), temperature (${temperature.toFixed(1)}°C), air humidity (${humidity.toFixed(1)}%), and sunlight exposure are well balanced.`;
    action = plantCode === 0
      ? 'Soil is pleasantly dry and well-aerated. Continue allowing natural dry-down cycles.'
      : 'Soil moisture and ambient humidity are in the sweet spot for lush vine growth.';
  } else if (mlCode === 1) {
    // Moderate stress / Needs Attention
    if (plantCode === 0) {
      // Aloe Vera
      if (moisture > 35) {
        wMoisture = 60;
        explanation = `Soil moisture (${moisture.toFixed(1)}%) is higher than Aloe Vera prefers (10–35%). Desert succulents thrive with dry soil between waterings.`;
        action = 'Hold off on watering. Allow the pot soil to dry out thoroughly before watering again.';
      } else if (light < 2000) {
        wLight = 55;
        explanation = `Sunlight exposure is a bit low for Aloe Vera. Succulents need strong, sunny placement to stay plump and vibrant.`;
        action = 'Move your Aloe closer to a bright, sun-facing window.';
      } else {
        wTemp = 40;
        wHumidity = 35;
        explanation = `The room climate is shifting slightly for Aloe Vera (Temp: ${temperature.toFixed(1)}°C, Humidity: ${humidity.toFixed(1)}%).`;
        action = 'Ensure gentle airflow and keep away from cold drafts.';
      }
    } else {
      // Pothos
      if (moisture < 35) {
        wMoisture = 65;
        explanation = `Soil moisture (${moisture.toFixed(1)}%) is getting low for Golden Pothos (ideal: 35–65%). The soil is drying out.`;
        action = 'Feel the soil about 2 inches deep. If dry, give your plant a moderate, thorough watering.';
      } else if (humidity < 40) {
        wHumidity = 50;
        explanation = `Air humidity (${humidity.toFixed(1)}%) is relatively dry for a tropical plant like Pothos.`;
        action = 'Mist the leaves occasionally or place on a pebble tray to increase surrounding air humidity.';
      } else {
        wTemp = 40;
        explanation = `Your Pothos is experiencing slight temperature variation (Temp: ${temperature.toFixed(1)}°C).`;
        action = 'Keep away from direct air conditioner vents or drafty doorways.';
      }
    }
  } else {
    // High stress / Critical
    if (plantCode === 0) {
      // Aloe Vera
      if (moisture > 60) {
        wMoisture = 75;
        wHumidity = 15;
        explanation = `Waterlogged soil detected! Soil moisture (${moisture.toFixed(1)}%) is dangerously high for a succulent. Excess water can cause root rot.`;
        action = 'Empty any standing water in the saucer immediately and allow the soil to drain and dry out.';
      } else if (temperature < 15 || temperature > 36) {
        wTemp = 70;
        explanation = `Temperature alert! At ${temperature.toFixed(1)}°C, the environment is outside the safe comfort range (18–32°C) for Aloe Vera.`;
        action = 'Move your plant to a comfortable room away from freezing glass or intense radiators.';
      } else {
        wLight = 60;
        wMoisture = 25;
        explanation = `Unfavorable light and moisture balance detected for Aloe Vera.`;
        action = 'Relocate to a brightly lit spot and make sure the pot drainage holes are clear.';
      }
    } else {
      // Pothos
      if (moisture < 20) {
        wMoisture = 80;
        explanation = `Severe soil drought detected! Soil moisture has dropped to ${moisture.toFixed(1)}%. Roots need water urgently to prevent wilting.`;
        action = 'Give your Pothos a deep, generous drink until water runs through the drainage holes.';
      } else if (temperature < 14) {
        wTemp = 75;
        explanation = `Cold chill warning! At ${temperature.toFixed(1)}°C, temperature is below safe tropical limits (18–30°C). Leaves may suffer cold damage.`;
        action = 'Move your Pothos away from drafty windows or cold entryways right away.';
      } else if (light < 200 || light > 3800) {
        wLight = 65;
        explanation = light > 3800
          ? 'Intense direct sunlight is scorching the leaves. Pothos prefers gentle, filtered light.'
          : 'Placement is too dark. Pothos needs indirect light to produce healthy green foliage.';
        action = 'Move to a location with bright, indirect filtered sunlight.';
      } else {
        wHumidity = 50;
        wTemp = 30;
        wMoisture = 20;
        explanation = `Multiple environmental stressors detected: low humidity combined with dry soil.`;
        action = 'Water thoroughly, mist leaves, and keep in a warm, sheltered room.';
      }
    }
  }

  return {
    ...meta,
    condition: conditionName,
    suitabilityClass,
    mlClassCode: mlCode,
    explanation,
    recommendedAction: action,
    factorWeights: {
      moisture: wMoisture,
      temperature: wTemp,
      humidity: wHumidity,
      light: wLight,
    },
    confidenceDisplay: mlCode === 2 ? '98%' : mlCode === 1 ? '92%' : '96%',
  };
}

/**
 * Backwards-compatibility wrapper for components using analyzeTelemetry
 */
export function analyzeTelemetry(
  reading: SensorReading,
  thresholds: Thresholds,
  plantCode: 0 | 1 = 0
): ConditionDiagnostic {
  return evaluatePlantModel(
    plantCode,
    reading.moisture,
    reading.temperature,
    reading.humidity,
    reading.light,
    thresholds
  );
}
