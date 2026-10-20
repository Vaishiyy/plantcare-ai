import { AlertItem, AlertPreferences, PlantProfile, SensorReading } from '../../types';

export const DEFAULT_PLANT_PROFILES: PlantProfile[] = [
  {
    id: 'monstera-deliciosa',
    name: 'Monty the Monstera',
    species: 'Monstera Deliciosa (Swiss Cheese Plant)',
    dateAdded: '2025-09-15',
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    careLevel: 'Moderate',
    sunlightRequirement: 'Bright Indirect',
    thresholds: {
      moistureMin: 35,
      moistureMax: 70,
      tempMin: 18.0,
      tempMax: 29.0,
      humidityMin: 50,
      humidityMax: 80,
      lightMin: 400,
      lightMax: 1200,
    },
    notes: 'Likes well-draining soil and misting during dry winters. Sensitive to cold air drafts.',
  },
  {
    id: 'fiddle-leaf-fig',
    name: 'Fiona the Fiddle',
    species: 'Ficus Lyrata (Fiddle Leaf Fig)',
    dateAdded: '2025-11-02',
    imageUrl: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80',
    careLevel: 'Demanding',
    sunlightRequirement: 'Bright Indirect',
    thresholds: {
      moistureMin: 40,
      moistureMax: 65,
      tempMin: 19.0,
      tempMax: 27.0,
      humidityMin: 45,
      humidityMax: 75,
      lightMin: 600,
      lightMax: 1500,
    },
    notes: 'Prone to root rot if overwatered. Requires consistent bright spot without frequent repositioning.',
  },
  {
    id: 'snake-plant',
    name: 'Sammy the Snake',
    species: 'Sansevieria Trifasciata',
    dateAdded: '2026-01-10',
    imageUrl: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?auto=format&fit=crop&w=800&q=80',
    careLevel: 'Easy',
    sunlightRequirement: 'Low Light',
    thresholds: {
      moistureMin: 18,
      moistureMax: 50,
      tempMin: 15.0,
      tempMax: 32.0,
      humidityMin: 30,
      humidityMax: 70,
      lightMin: 150,
      lightMax: 900,
    },
    notes: 'Extremely drought-tolerant. Only water when soil is almost completely dry to touch.',
  },
  {
    id: 'sweet-basil',
    name: 'Basilico',
    species: 'Ocimum Basilicum (Sweet Basil)',
    dateAdded: '2026-03-01',
    imageUrl: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=800&q=80',
    careLevel: 'Moderate',
    sunlightRequirement: 'Direct Sunlight',
    thresholds: {
      moistureMin: 45,
      moistureMax: 75,
      tempMin: 20.0,
      tempMax: 30.0,
      humidityMin: 40,
      humidityMax: 70,
      lightMin: 700,
      lightMax: 2000,
    },
    notes: 'Fast transpiration rate. Requires steady moisture and high light exposure.',
  },
];

export const DEFAULT_ALERT_PREFS: AlertPreferences = {
  lowMoisture: true,
  criticalDry: true,
  temperatureExtreme: true,
  humidityAbnormal: true,
  lightAbnormal: true,
  connectionEvents: true,
  soundEnabled: false,
};

const STORAGE_KEYS = {
  PROFILES: 'plantcare_profiles_v1',
  ACTIVE_PROFILE_ID: 'plantcare_active_id_v1',
  TELEMETRY_HISTORY: 'plantcare_telemetry_history_v1',
  ALERTS: 'plantcare_alerts_v1',
  ALERT_PREFS: 'plantcare_alert_prefs_v1',
  DEMO_MODE: 'plantcare_demo_mode_v1',
  REFRESH_INTERVAL: 'plantcare_refresh_interval_v1',
  TEMP_UNIT: 'plantcare_temp_unit_v1',
};

export const StorageService = {
  getProfiles(): PlantProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load profiles from localStorage', e);
    }
    return DEFAULT_PLANT_PROFILES;
  },

  saveProfiles(profiles: PlantProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save profiles', e);
    }
  },

  getActiveProfileId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID) || DEFAULT_PLANT_PROFILES[0].id;
  },

  saveActiveProfileId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, id);
  },

  getAlertPreferences(): AlertPreferences {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALERT_PREFS);
      if (data) return { ...DEFAULT_ALERT_PREFS, ...JSON.parse(data) };
    } catch (e) {
      console.warn('Failed to load alert preferences', e);
    }
    return DEFAULT_ALERT_PREFS;
  },

  saveAlertPreferences(prefs: AlertPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ALERT_PREFS, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save alert preferences', e);
    }
  },

  getAlerts(): AlertItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load alerts', e);
    }
    return [];
  },

  saveAlerts(alerts: AlertItem[]): void {
    try {
      // Keep up to 100 recent alerts
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save alerts', e);
    }
  },

  getTelemetryHistory(): SensorReading[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TELEMETRY_HISTORY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load telemetry history', e);
    }
    return [];
  },

  saveTelemetryHistory(history: SensorReading[]): void {
    try {
      // Store up to 300 recent samples to avoid exceeding quota
      localStorage.setItem(STORAGE_KEYS.TELEMETRY_HISTORY, JSON.stringify(history.slice(-300)));
    } catch (e) {
      console.error('Failed to save telemetry history', e);
    }
  },

  getDemoMode(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
    return val === null ? true : val === 'true'; // Default to true so app is immediately interactive
  },

  saveDemoMode(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, enabled ? 'true' : 'false');
  },

  getRefreshInterval(): number {
    const val = localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL);
    return val ? parseInt(val, 10) : 3000; // default 3s
  },

  saveRefreshInterval(ms: number): void {
    localStorage.setItem(STORAGE_KEYS.REFRESH_INTERVAL, ms.toString());
  },

  getTempUnit(): 'C' | 'F' {
    return (localStorage.getItem(STORAGE_KEYS.TEMP_UNIT) as 'C' | 'F') || 'C';
  },

  saveTempUnit(unit: 'C' | 'F'): void {
    localStorage.setItem(STORAGE_KEYS.TEMP_UNIT, unit);
  },

  /**
   * Generates and downloads a CSV export of sensor readings
   */
  exportTelemetryToCsv(history: SensorReading[], plantName: string): boolean {
    if (!history || history.length === 0) return false;

    const headers = [
      'Timestamp (ms)',
      'Date & Time (ISO)',
      'Soil Moisture (%)',
      'Temperature (°C)',
      'Humidity (%)',
      'Light Intensity (lux)',
      'ML Condition',
      'Confidence',
      'Data Source',
    ];

    const rows = history.map((item) => {
      const dateIso = new Date(item.timestamp).toISOString();
      const confStr = item.confidence !== undefined ? (item.confidence * 100).toFixed(1) + '%' : 'N/A';
      const source = item.isSynthetic ? 'Demo Simulation' : 'STM32 Hardware Telemetry';

      return [
        item.timestamp,
        `"${dateIso}"`,
        item.moisture,
        item.temperature.toFixed(1),
        item.humidity,
        item.light,
        `"${item.condition}"`,
        `"${confStr}"`,
        `"${source}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanPlantName = plantName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `PlantCare_Telemetry_${cleanPlantName}_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  },
};
