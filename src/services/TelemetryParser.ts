import { PlantCondition, SensorReading } from '../types';
import { evaluatePlantModel } from './ml/mlInference';

/**
 * Universal Telemetry Parser for PlantCare AI
 * Supports:
 *   1. STM32 Key-Value format:
 *      PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0
 *   2. Alternative KV variations (case-insensitive, SOIL, MOISTURE, LDR, LIGHT, TEMP, etc.)
 *   3. JSON telemetry
 *   4. Comma-separated numerical lists (e.g. 25, 25.5, 50, 1800)
 *   5. Human-readable text (e.g. "Soil: 35%, Temp: 24C, Light: 1500")
 */
export function parseTelemetryPacket(rawText: string, activePlantCode: 0 | 1 = 0): SensorReading | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const clean = rawText.trim();
  if (!clean) return null;

  let moisture: number | undefined;
  let humidity: number | undefined;
  let light: number | undefined;
  let temperature: number = 25.0;
  let isTempAssumed: boolean = true;
  let condition: string | undefined;
  let mlClassCode: 0 | 1 | 2 | undefined;
  let plantCode: 0 | 1 = activePlantCode;

  let humAdc: number | undefined;
  let soilRaw: number | undefined;
  let potAdc: number | undefined;
  let sw1: number | undefined;
  let sw2: number | undefined;

  // 1. KEY=VALUE format
  if (clean.includes('=')) {
    const kv: Record<string, string> = {};
    const parts = clean.replace(/[\r\n]/g, '').split(',');
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        const k = part.substring(0, eqIdx).trim().toUpperCase();
        const v = part.substring(eqIdx + 1).trim();
        if (k) kv[k] = v;
      }
    }

    // Moisture extraction
    if (kv['SOIL_PCT'] !== undefined) moisture = parseFloat(kv['SOIL_PCT']);
    else if (kv['SOIL'] !== undefined) moisture = parseFloat(kv['SOIL']);
    else if (kv['MOISTURE'] !== undefined) moisture = parseFloat(kv['MOISTURE']);
    else if (kv['SOIL_MOISTURE'] !== undefined) moisture = parseFloat(kv['SOIL_MOISTURE']);
    else if (kv['SOIL_RAW'] !== undefined) {
      const raw = parseInt(kv['SOIL_RAW'], 10);
      if (!isNaN(raw)) {
        soilRaw = raw;
        // 12-bit ADC mapping: 4095 (dry) -> 0%, 1200 (wet) -> 100%
        moisture = Math.max(0, Math.min(100, Math.round(100 - ((raw - 1200) * 100) / (4095 - 1200))));
      }
    }

    // Humidity extraction
    if (kv['HUM_RH_EST'] !== undefined) humidity = parseFloat(kv['HUM_RH_EST']);
    else if (kv['HUMIDITY'] !== undefined) humidity = parseFloat(kv['HUMIDITY']);
    else if (kv['HUM'] !== undefined) humidity = parseFloat(kv['HUM']);
    else if (kv['AIR_HUMIDITY_PCT'] !== undefined) humidity = parseFloat(kv['AIR_HUMIDITY_PCT']);
    else if (kv['HUM_ADC'] !== undefined) {
      const hadc = parseInt(kv['HUM_ADC'], 10);
      if (!isNaN(hadc)) {
        humAdc = hadc;
        humidity = Math.max(10, Math.min(95, Math.round((hadc / 4095) * 100)));
      }
    } else {
      humidity = 50.0;
    }

    // Light extraction
    if (kv['LDR_ADC'] !== undefined) light = parseInt(kv['LDR_ADC'], 10);
    else if (kv['LIGHT'] !== undefined) light = parseInt(kv['LIGHT'], 10);
    else if (kv['LDR'] !== undefined) light = parseInt(kv['LDR'], 10);
    else if (kv['LUX'] !== undefined) light = parseInt(kv['LUX'], 10);
    else if (kv['LDR_ON_PLANT'] !== undefined) light = parseInt(kv['LDR_ON_PLANT'], 10);

    // Temperature extraction
    if (kv['TEMP_C_ASSUMED'] !== undefined) {
      temperature = parseFloat(kv['TEMP_C_ASSUMED']);
      isTempAssumed = true;
    } else if (kv['TEMP'] !== undefined || kv['TEMPERATURE'] !== undefined || kv['TEMPERATURE_C'] !== undefined) {
      const tv = parseFloat(kv['TEMP'] || kv['TEMPERATURE'] || kv['TEMPERATURE_C']);
      if (!isNaN(tv)) {
        temperature = tv;
        isTempAssumed = false;
      }
    }

    // Extra ADC registers
    if (kv['HUM_ADC'] !== undefined && humAdc === undefined) humAdc = parseInt(kv['HUM_ADC'], 10);
    if (kv['SOIL_RAW'] !== undefined && soilRaw === undefined) soilRaw = parseInt(kv['SOIL_RAW'], 10);
    if (kv['POT_ADC'] !== undefined) potAdc = parseInt(kv['POT_ADC'], 10);
    if (kv['SW1'] !== undefined) sw1 = parseInt(kv['SW1'], 10);
    if (kv['SW2'] !== undefined) {
      sw2 = parseInt(kv['SW2'], 10);
      plantCode = sw2 === 1 ? 1 : 0;
    }

    if (kv['ML_STATUS'] !== undefined) condition = kv['ML_STATUS'].replace(/_/g, ' ').trim();
    if (kv['ML_CLASS'] !== undefined) {
      const cls = parseInt(kv['ML_CLASS'], 10);
      if (cls === 0 || cls === 1 || cls === 2) mlClassCode = cls;
    }
    if (kv['PLANT'] !== undefined) plantCode = kv['PLANT'].toUpperCase().includes('POTHOS') ? 1 : 0;

  } else if ((clean.startsWith('{') && clean.endsWith('}')) || clean.includes('{')) {
    // 2. JSON format fallback
    try {
      const s = clean.indexOf('{');
      const e = clean.lastIndexOf('}');
      const parsed = JSON.parse(clean.substring(s, e + 1));
      moisture = typeof parsed.moisture === 'number' ? parsed.moisture : parsed.soil_humidity_pct;
      humidity = typeof parsed.humidity === 'number' ? parsed.humidity : (parsed.air_humidity_pct ?? 50.0);
      light = typeof parsed.light === 'number' ? parsed.light : parsed.ldr_on_plant;
      if (typeof parsed.temperature === 'number') {
        temperature = parsed.temperature;
        isTempAssumed = false;
      } else if (typeof parsed.temp === 'number') {
        temperature = parsed.temp;
        isTempAssumed = false;
      }
      if (typeof parsed.condition === 'string') condition = parsed.condition;
      if (parsed.mlClassCode === 0 || parsed.mlClassCode === 1 || parsed.mlClassCode === 2) {
        mlClassCode = parsed.mlClassCode;
      }
      if (typeof parsed.plantCode === 'number') plantCode = parsed.plantCode === 1 ? 1 : 0;
    } catch (_) {}
  } else {
    // 3. Comma-separated numbers fallback (e.g. "45, 25, 60, 1800" or "0, 25, 20, 1827")
    const nums = clean.split(',').map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
    if (nums.length >= 3) {
      moisture = nums[0];
      temperature = nums[1];
      humidity = nums[2];
      if (nums.length >= 4) light = nums[3];
    }
  }

  // Regex fallback for labeled text (e.g. "Soil: 45%", "Light: 1800")
  if (moisture === undefined) {
    const m = clean.match(/(?:soil|moisture)[^\d]*(\d+(?:\.\d+)?)/i);
    if (m) moisture = parseFloat(m[1]);
  }
  if (light === undefined) {
    const m = clean.match(/(?:light|ldr)[^\d]*(\d+)/i);
    if (m) light = parseInt(m[1], 10);
  }
  if (temperature === 25.0) {
    const m = clean.match(/(?:temp|temperature)[^\d]*(\d+(?:\.\d+)?)/i);
    if (m) {
      temperature = parseFloat(m[1]);
      isTempAssumed = false;
    }
  }
  if (humidity === undefined) {
    const m = clean.match(/(?:hum|humidity)[^\d]*(\d+(?:\.\d+)?)/i);
    if (m) humidity = parseFloat(m[1]);
  }

  // Only discard if there is genuinely no numerical sensor data at all
  if (moisture === undefined && light === undefined && soilRaw === undefined && humAdc === undefined) {
    return null;
  }

  if (moisture === undefined) moisture = 25.0;
  if (light === undefined) light = 2000;
  if (humidity === undefined) humidity = 50.0;

  // ML Inference
  let suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress' = 'suitable';
  let plantCond: PlantCondition = 'Suitable';

  if (mlClassCode === undefined || condition === undefined) {
    const diag = evaluatePlantModel(plantCode, moisture, temperature, humidity, light, {
      moistureMin: 10,
      moistureMax: 35,
      tempMin: 18,
      tempMax: 32,
      humidityMin: 30,
      humidityMax: 60,
      lightMin: 2500,
      lightMax: 4095,
    });
    plantCond = diag.condition;
    suitabilityClass = diag.suitabilityClass;
    mlClassCode = diag.mlClassCode;
  } else {
    suitabilityClass = mlClassCode === 2 ? 'suitable' : mlClassCode === 1 ? 'moderate_stress' : 'high_stress';
    plantCond = mlClassCode === 2 ? 'Suitable' : mlClassCode === 1 ? 'Moderate Stress' : 'High Stress';
  }

  return {
    moisture: parseFloat(moisture.toFixed(1)),
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    light: Math.round(light),
    condition: plantCond,
    suitabilityClass,
    mlClassCode,
    timestamp: Date.now(),
    confidence: mlClassCode === 2 ? 0.98 : mlClassCode === 1 ? 0.93 : 0.96,
    isSynthetic: false,
    isTempAssumed,
    plantCode,
    humAdc,
    soilRaw,
    potAdc,
    sw1,
    sw2,
    rawString: rawText,
  };
}
