import { DemoScenario, PlantCondition, SensorReading, Thresholds } from '../../types';
import { classifyReadingSimulated } from '../ml/mlInference';

export class DemoDataService {
  private currentReading: SensorReading = {
    moisture: 58,
    temperature: 23.4,
    humidity: 55,
    light: 780,
    condition: 'Healthy',
    timestamp: Date.now(),
    confidence: 0.94,
    isSynthetic: true,
  };

  private activeScenario: DemoScenario = 'ideal';

  public setScenario(scenario: DemoScenario, thresholds: Thresholds): SensorReading {
    this.activeScenario = scenario;
    const now = Date.now();

    switch (scenario) {
      case 'ideal':
        this.currentReading = {
          moisture: 62,
          temperature: 22.8,
          humidity: 58,
          light: 820,
          condition: 'Healthy',
          timestamp: now,
          confidence: 0.96,
          isSynthetic: true,
        };
        break;

      case 'needs_water':
        this.currentReading = {
          moisture: 32,
          temperature: 24.6,
          humidity: 44,
          light: 710,
          condition: 'Needs Water',
          timestamp: now,
          confidence: 0.89,
          isSynthetic: true,
        };
        break;

      case 'too_dry':
        this.currentReading = {
          moisture: 14,
          temperature: 27.8,
          humidity: 33,
          light: 920,
          condition: 'Too Dry',
          timestamp: now,
          confidence: 0.98,
          isSynthetic: true,
        };
        break;

      case 'poor_env':
        this.currentReading = {
          moisture: 52,
          temperature: 34.2,
          humidity: 86,
          light: 140,
          condition: 'Poor Environment',
          timestamp: now,
          confidence: 0.91,
          isSynthetic: true,
        };
        break;

      case 'random_drift':
        this.currentReading = this.generateNextDrift(thresholds);
        break;
    }

    return this.currentReading;
  }

  public generateNextDrift(thresholds: Thresholds): SensorReading {
    const prev = this.currentReading;
    // Small natural Brownian drift
    const deltaMoisture = (Math.random() - 0.52) * 1.5; // slight natural drying bias
    const deltaTemp = (Math.random() - 0.5) * 0.4;
    const deltaHumidity = (Math.random() - 0.5) * 1.2;
    const deltaLight = (Math.random() - 0.48) * 25;

    const moisture = Math.max(8, Math.min(95, Math.round(prev.moisture + deltaMoisture)));
    const temperature = parseFloat(Math.max(12, Math.min(39, prev.temperature + deltaTemp)).toFixed(1));
    const humidity = Math.max(20, Math.min(95, Math.round(prev.humidity + deltaHumidity)));
    const light = Math.max(50, Math.min(2000, Math.round(prev.light + deltaLight)));

    const condition = classifyReadingSimulated({ moisture, temperature, humidity, light, timestamp: Date.now() }, thresholds);

    this.currentReading = {
      moisture,
      temperature,
      humidity,
      light,
      condition,
      timestamp: Date.now(),
      confidence: parseFloat((0.85 + Math.random() * 0.12).toFixed(2)),
      isSynthetic: true,
    };

    return this.currentReading;
  }

  public getCurrentReading(): SensorReading {
    return { ...this.currentReading, timestamp: Date.now() };
  }

  /**
   * Generates realistic historical dataset for past 30 days
   */
  public generateHistory(thresholds: Thresholds, count: number = 72): SensorReading[] {
    const history: SensorReading[] = [];
    const now = Date.now();
    const intervalMs = (30 * 24 * 3600 * 1000) / count;

    let m = 65;
    let t = 22.0;
    let h = 55;
    let l = 600;

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = now - i * intervalMs;
      const date = new Date(timestamp);
      const hour = date.getHours();

      // Diurnal cycle for temp and light
      const isDay = hour >= 6 && hour <= 19;
      const dayFactor = isDay ? Math.sin(((hour - 6) / 13) * Math.PI) : 0;

      t = 20.0 + dayFactor * 6.5 + (Math.random() - 0.5) * 1.0;
      l = isDay ? Math.round(300 + dayFactor * 850 + (Math.random() - 0.5) * 100) : Math.round(40 + Math.random() * 30);
      h = Math.round(65 - dayFactor * 15 + (Math.random() - 0.5) * 5);

      // Periodic watering cycles (drying down over ~5 days, then watered)
      const dayMod = (Math.floor(i / (count / 6))) % 6;
      if (dayMod === 0) {
        m = 75 + Math.round((Math.random() - 0.5) * 8); // Watered
      } else {
        m = Math.max(18, Math.round(m - (3.5 + Math.random() * 2))); // Drying down
      }

      const cond = classifyReadingSimulated({ moisture: m, temperature: t, humidity: h, light: l, timestamp }, thresholds);

      history.push({
        moisture: m,
        temperature: parseFloat(t.toFixed(1)),
        humidity: h,
        light: l,
        condition: cond,
        timestamp,
        confidence: parseFloat((0.88 + Math.random() * 0.1).toFixed(2)),
        isSynthetic: true,
      });
    }

    return history;
  }
}

export const demoDataService = new DemoDataService();
