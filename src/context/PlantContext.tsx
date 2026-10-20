import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveScreen,
  AlertItem,
  AlertPreferences,
  ConnectionProtocol,
  ConnectionState,
  DemoScenario,
  PlantProfile,
  SensorReading,
} from '../types';
import { StorageService, DEFAULT_PLANT_PROFILES } from '../services/storage/storageService';
import { demoDataService } from '../services/demo/DemoDataService';
import { webBluetooth } from '../services/bluetooth/WebBluetoothService';
import { webSerial } from '../services/bluetooth/WebSerialService';
import { evaluatePlantModel } from '../services/ml/mlInference';

interface SerialLogEntry {
  id: string;
  timestamp: number;
  direction: 'in' | 'out' | 'sys';
  text: string;
}

interface PlantContextType {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;

  profiles: PlantProfile[];
  activeProfile: PlantProfile;
  selectProfile: (id: string) => void;
  updateActiveProfile: (updated: Partial<PlantProfile>) => void;

  currentReading: SensorReading;
  history: SensorReading[];
  refreshReadings: () => void;
  checkPlantHealth: () => void;
  isStale: boolean;
  lastUpdatedStr: string;

  connectionState: ConnectionState;
  connectionProtocol: ConnectionProtocol;
  connectedDeviceName: string | null;
  statusMessage: string;
  connectBle: () => Promise<boolean>;
  connectSerial: (baudRate?: number) => Promise<boolean>;
  disconnectHardware: () => void;
  serialLogs: SerialLogEntry[];
  injectManualPacket: (rawJson: string) => boolean;

  isDemoMode: boolean;
  setIsDemoMode: (enabled: boolean) => void;
  activeScenario: DemoScenario;
  setScenario: (scenario: DemoScenario) => void;

  alerts: AlertItem[];
  unreadAlertCount: number;
  alertPrefs: AlertPreferences;
  updateAlertPrefs: (prefs: Partial<AlertPreferences>) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  clearAllAlerts: () => void;

  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;
  tempUnit: 'C' | 'F';
  setTempUnit: (unit: 'C' | 'F') => void;
  exportCsv: () => boolean;
}

const PlantContext = createContext<PlantContextType | null>(null);

export const PlantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');

  const [profiles, setProfiles] = useState<PlantProfile[]>(() => StorageService.getProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => StorageService.getActiveProfileId());
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PLANT_PROFILES[0];

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionProtocol, setConnectionProtocol] = useState<ConnectionProtocol>('demo');
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Streaming from ML Training Dataset');
  const [serialLogs, setSerialLogs] = useState<SerialLogEntry[]>([]);

  const [isDemoMode, setIsDemoModeState] = useState<boolean>(() => StorageService.getDemoMode());
  const [activeScenario, setActiveScenario] = useState<DemoScenario>('dataset_stream');

  const [currentReading, setCurrentReading] = useState<SensorReading>(() => {
    return demoDataService.getCurrentReading();
  });

  const [history, setHistory] = useState<SensorReading[]>(() => {
    const saved = StorageService.getTelemetryHistory();
    if (saved && saved.length > 5) return saved;
    return demoDataService.generateHistory(activeProfile.thresholds, activeProfile.plantCode, 60);
  });

  const [refreshInterval, setRefreshIntervalState] = useState<number>(() => StorageService.getRefreshInterval());
  const [tempUnit, setTempUnitState] = useState<'C' | 'F'>(() => StorageService.getTempUnit());

  const [alerts, setAlerts] = useState<AlertItem[]>(() => StorageService.getAlerts());
  const [alertPrefs, setAlertPrefs] = useState<AlertPreferences>(() => StorageService.getAlertPreferences());

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isStale = connectionState !== 'connected' && !isDemoMode && now - currentReading.timestamp > 30000;

  const addLog = useCallback((direction: 'in' | 'out' | 'sys', text: string) => {
    setSerialLogs((prev) => [
      { id: Math.random().toString(36).substring(2, 9), timestamp: Date.now(), direction, text },
      ...prev.slice(0, 150),
    ]);
  }, []);

  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const evaluateAlerts = useCallback(
    (reading: SensorReading, thresholds: typeof activeProfile.thresholds) => {
      const newAlerts: AlertItem[] = [];
      const currentTime = Date.now();
      const COOLDOWN_MS = 60000;

      const trigger = (type: AlertItem['type'], title: string, message: string, severity: AlertItem['severity'], value?: number) => {
        const lastTime = lastAlertTimeRef.current[type] || 0;
        if (currentTime - lastTime > COOLDOWN_MS) {
          lastAlertTimeRef.current[type] = currentTime;
          newAlerts.push({
            id: Math.random().toString(36).substring(2, 9),
            timestamp: currentTime,
            type,
            title,
            message,
            severity,
            read: false,
            valueRecorded: value,
            conditionRelated: reading.condition,
          });
        }
      };

      if (alertPrefs.criticalDry && reading.suitabilityClass === 'high_stress') {
        trigger(
          'moisture_critical',
          'High Stress Detected',
          `Severe stress detected: immediate attention required (Soil: ${reading.moisture}%, Temp: ${reading.temperature}°C).`,
          'critical',
          reading.moisture
        );
      } else if (alertPrefs.lowMoisture && reading.suitabilityClass === 'moderate_stress') {
        trigger(
          'moisture_low',
          'Needs Attention',
          `Sub-optimal conditions for ${activeProfile.name} (Soil: ${reading.moisture}%, Temp: ${reading.temperature}°C). Check moisture and placement.`,
          'warning',
          reading.moisture
        );
      }

      if (alertPrefs.temperatureExtreme && (reading.temperature < thresholds.tempMin || reading.temperature > thresholds.tempMax)) {
        trigger(
          'temp_out_of_range',
          'Temperature Deviation',
          `Ambient temperature (${reading.temperature}°C) is outside empirical target (${thresholds.tempMin}-${thresholds.tempMax}°C).`,
          'warning',
          reading.temperature
        );
      }

      if (newAlerts.length > 0) {
        setAlerts((prev) => {
          const updated = [...newAlerts, ...prev].slice(0, 80);
          StorageService.saveAlerts(updated);
          return updated;
        });
      }
    },
    [alertPrefs, activeProfile]
  );

  const handleIncomingReading = useCallback(
    (reading: SensorReading, rawText?: string) => {
      setCurrentReading(reading);
      setHistory((prev) => {
        const next = [...prev, reading].slice(-300);
        StorageService.saveTelemetryHistory(next);
        return next;
      });

      if (rawText) {
        addLog('in', rawText);
      }

      evaluateAlerts(reading, activeProfile.thresholds);
    },
    [activeProfile.thresholds, addLog, evaluateAlerts]
  );

  useEffect(() => {
    webBluetooth.registerCallbacks(
      (reading, rawText) => handleIncomingReading(reading, rawText),
      (status, msg) => {
        setConnectionState(status);
        if (status === 'connected') {
          setConnectedDeviceName(webBluetooth.getDeviceName() || 'STM32-Plant-BLE');
          setConnectionProtocol('ble');
          setIsDemoModeState(false);
          StorageService.saveDemoMode(false);
          addLog('sys', `BLE connected: ${webBluetooth.getDeviceName() || 'STM32'}`);
        } else if (status === 'disconnected') {
          setConnectedDeviceName(null);
          addLog('sys', 'BLE connection closed');
        }
        if (msg) setStatusMessage(msg);
      }
    );

    webSerial.registerCallbacks(
      (reading, rawText) => handleIncomingReading(reading, rawText),
      (status, msg) => {
        setConnectionState(status);
        if (status === 'connected') {
          setConnectedDeviceName('STM32 Serial / HC-05');
          setConnectionProtocol('serial');
          setIsDemoModeState(false);
          StorageService.saveDemoMode(false);
          addLog('sys', 'Serial port opened');
        } else if (status === 'disconnected') {
          setConnectedDeviceName(null);
          addLog('sys', 'Serial port disconnected');
        }
        if (msg) setStatusMessage(msg);
      }
    );
  }, [handleIncomingReading, addLog]);

  // Demo stream using actual dataset records
  useEffect(() => {
    if (!isDemoMode || connectionState === 'connected') return;

    const interval = setInterval(() => {
      let reading: SensorReading;
      if (activeScenario === 'dataset_stream') {
        reading = demoDataService.getNextDatasetRow(activeProfile.plantCode, activeProfile.thresholds);
      } else {
        reading = demoDataService.setScenario(activeScenario, activeProfile.thresholds, activeProfile.plantCode);
      }
      handleIncomingReading(reading);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isDemoMode, connectionState, activeScenario, activeProfile, refreshInterval, handleIncomingReading]);

  const setIsDemoMode = (enabled: boolean) => {
    setIsDemoModeState(enabled);
    StorageService.saveDemoMode(enabled);
    if (enabled) {
      if (connectionState === 'connected') disconnectHardware();
      setConnectionProtocol('demo');
      setStatusMessage('Simulation Mode: Streaming plant care telemetry');
      addLog('sys', 'Simulation Mode active');
    } else {
      setStatusMessage('Hardware Mode active. Ready to connect device.');
      addLog('sys', 'Hardware Mode active');
    }
  };

  const setScenario = (scenario: DemoScenario) => {
    setActiveScenario(scenario);
    const reading = demoDataService.setScenario(scenario, activeProfile.thresholds, activeProfile.plantCode);
    handleIncomingReading(reading);
    addLog('sys', `Scenario set to "${scenario}" (Dataset Row #${reading.datasetRowIndex ?? 0})`);
  };

  const refreshReadings = () => {
    if (isDemoMode) {
      const reading = demoDataService.getNextDatasetRow(activeProfile.plantCode, activeProfile.thresholds);
      handleIncomingReading(reading);
    } else {
      setStatusMessage('Requesting reading from STM32...');
      addLog('out', '{"cmd":"READ"}');
    }
  };

  const checkPlantHealth = () => {
    const diagnostic = evaluatePlantModel(
      activeProfile.plantCode,
      currentReading.moisture,
      currentReading.temperature,
      currentReading.humidity,
      currentReading.light,
      activeProfile.thresholds
    );
    setStatusMessage(`Plant Condition: ${diagnostic.headline} (${diagnostic.condition})`);
    setActiveScreen('ai_analysis');
  };

  const connectBle = async (): Promise<boolean> => {
    addLog('sys', 'Initiating Web Bluetooth connection...');
    return await webBluetooth.connect();
  };

  const connectSerial = async (baudRate = 9600): Promise<boolean> => {
    addLog('sys', `Opening Web Serial connection at ${baudRate} baud...`);
    return await webSerial.connect(baudRate);
  };

  const disconnectHardware = () => {
    if (connectionProtocol === 'ble') webBluetooth.disconnect();
    else if (connectionProtocol === 'serial') webSerial.disconnect();
    setConnectionState('disconnected');
    setConnectedDeviceName(null);
  };

  const injectManualPacket = (rawJson: string): boolean => {
    addLog('in', `[Manual Inject] ${rawJson}`);
    return webBluetooth.parseAndDispatch(rawJson, activeProfile.plantCode);
  };

  const selectProfile = (id: string) => {
    setActiveProfileId(id);
    StorageService.saveActiveProfileId(id);
    const profile = profiles.find((p) => p.id === id) || profiles[0];
    if (profile) {
      const reading = demoDataService.getNextDatasetRow(profile.plantCode, profile.thresholds);
      handleIncomingReading(reading);
      const newHistory = demoDataService.generateHistory(profile.thresholds, profile.plantCode, 60);
      setHistory(newHistory);
      StorageService.saveTelemetryHistory(newHistory);
    }
  };

  const updateActiveProfile = (updated: Partial<PlantProfile>) => {
    setProfiles((prev) => {
      const next = prev.map((p) => (p.id === activeProfile.id ? { ...p, ...updated } : p));
      StorageService.saveProfiles(next);
      return next;
    });
  };

  const updateAlertPrefs = (prefs: Partial<AlertPreferences>) => {
    setAlertPrefs((prev) => {
      const next = { ...prev, ...prefs };
      StorageService.saveAlertPreferences(next);
      return next;
    });
  };

  const markAlertRead = (id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, read: true } : a));
      StorageService.saveAlerts(next);
      return next;
    });
  };

  const markAllAlertsRead = () => {
    setAlerts((prev) => {
      const next = prev.map((a) => ({ ...a, read: true }));
      StorageService.saveAlerts(next);
      return next;
    });
  };

  const clearAllAlerts = () => {
    setAlerts([]);
    StorageService.saveAlerts([]);
  };

  const setRefreshInterval = (ms: number) => {
    setRefreshIntervalState(ms);
    StorageService.saveRefreshInterval(ms);
  };

  const setTempUnit = (unit: 'C' | 'F') => {
    setTempUnitState(unit);
    StorageService.saveTempUnit(unit);
  };

  const exportCsv = (): boolean => {
    return StorageService.exportTelemetryToCsv(history, activeProfile.name);
  };

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const lastUpdatedStr = new Date(currentReading.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <PlantContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        profiles,
        activeProfile,
        selectProfile,
        updateActiveProfile,
        currentReading,
        history,
        refreshReadings,
        checkPlantHealth,
        isStale,
        lastUpdatedStr,
        connectionState,
        connectionProtocol,
        connectedDeviceName,
        statusMessage,
        connectBle,
        connectSerial,
        disconnectHardware,
        serialLogs,
        injectManualPacket,
        isDemoMode,
        setIsDemoMode,
        activeScenario,
        setScenario,
        alerts,
        unreadAlertCount,
        alertPrefs,
        updateAlertPrefs,
        markAlertRead,
        markAllAlertsRead,
        clearAllAlerts,
        refreshInterval,
        setRefreshInterval,
        tempUnit,
        setTempUnit,
        exportCsv,
      }}
    >
      {children}
    </PlantContext.Provider>
  );
};

export const usePlant = () => {
  const context = useContext(PlantContext);
  if (!context) throw new Error('usePlant must be used within PlantProvider');
  return context;
};
