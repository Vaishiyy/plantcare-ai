import { AlertItem, AlertPreferences, PlantProfile, SensorReading } from '../../types';

export const DEFAULT_PLANT_PROFILES: PlantProfile[] = [
  {
    id: 'aloe-vera',
    speciesKey: 'aloe_vera',
    plantCode: 0,
    name: 'Vera the Aloe',
    species: 'Aloe barbadensis miller (Aloe Vera)',
    dateAdded: '2025-08-12',
    imageUrl: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=800&q=80',
    careLevel: 'Easy',
    sunlightRequirement: 'Direct Sunlight',
    thresholds: {
      moistureMin: 10,
      moistureMax: 35,
      tempMin: 18.0,
      tempMax: 32.0,
      humidityMin: 30,
      humidityMax: 60,
      lightMin: 2500,
      lightMax: 4095,
    },
    notes: 'Succulent plant from the ML training dataset. Thrives in dry, well-draining soil and high light (LDR 2500-4095). High moisture triggers severe root stress.',
  },
  {
    id: 'golden-pothos',
    speciesKey: 'pothos',
    plantCode: 1,
    name: 'Perry the Pothos',
    species: 'Epipremnum aureum (Golden Pothos)',
    dateAdded: '2025-10-05',
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    careLevel: 'Moderate',
    sunlightRequirement: 'Bright Indirect',
    thresholds: {
      moistureMin: 35,
      moistureMax: 65,
      tempMin: 18.0,
      tempMax: 30.0,
      humidityMin: 40,
      humidityMax: 75,
      lightMin: 1000,
      lightMax: 3000,
    },
    notes: 'Tropical vine from the ML training dataset. Requires steady moderate moisture (35-65%) and filtered ambient light (LDR 1000-3000). Highly sensitive to cold chill.',
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
  PROFILES: 'plantcare_profiles_v2',
  ACTIVE_PROFILE_ID: 'plantcare_active_id_v2',
  TELEMETRY_HISTORY: 'plantcare_telemetry_history_v2',
  ALERTS: 'plantcare_alerts_v2',
  ALERT_PREFS: 'plantcare_alert_prefs_v2',
  DEMO_MODE: 'plantcare_demo_mode_v2',
  REFRESH_INTERVAL: 'plantcare_refresh_interval_v2',
  TEMP_UNIT: 'plantcare_temp_unit_v2',
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
      localStorage.setItem(STORAGE_KEYS.TELEMETRY_HISTORY, JSON.stringify(history.slice(-300)));
    } catch (e) {
      console.error('Failed to save telemetry history', e);
    }
  },

  getDemoMode(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
    return val === null ? true : val === 'true';
  },

  saveDemoMode(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, enabled ? 'true' : 'false');
  },

  getRefreshInterval(): number {
    const val = localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL);
    return val ? parseInt(val, 10) : 3000;
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

  exportTelemetryToCsv(history: SensorReading[], plantName: string): boolean {
    if (!history || history.length === 0) return false;

    const headers = [
      'Timestamp (ms)',
      'Date & Time (ISO)',
      'Soil Moisture (%)',
      'Temperature (°C)',
      'Air Humidity (%)',
      'LDR Light (ADC)',
      'Suitability Class',
      'ML Code',
      'Condition',
      'Dataset Row Index',
      'Data Source',
    ];

    const rows = history.map((item) => {
      const dateIso = new Date(item.timestamp).toISOString();
      const source = item.isSynthetic ? 'Dataset Simulation' : 'STM32 Hardware Telemetry';

      return [
        item.timestamp,
        `"${dateIso}"`,
        item.moisture,
        item.temperature.toFixed(1),
        item.humidity,
        item.light,
        `"${item.suitabilityClass}"`,
        item.mlClassCode,
        `"${item.condition}"`,
        item.datasetRowIndex ?? 'N/A',
        `"${source}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanPlantName = plantName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `PlantCare_Dataset_Export_${cleanPlantName}_${new Date().toISOString().slice(0, 10)}.csv`;

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
