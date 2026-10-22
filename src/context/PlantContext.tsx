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
import { cloudTelemetry } from '../services/api/cloudTelemetryService';

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
  hasRealReading: boolean;
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
  connectCloud: () => Promise<boolean>;
  testCloudIngestion: (token?: string) => Promise<{ success: boolean; message?: string }>;
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

const EMPTY_READING: SensorReading = {
  moisture: 0,
  temperature: 0,
  humidity: 0,
  light: 0,
  condition: 'None',
  suitabilityClass: 'suitable',
  mlClassCode: 2,
  timestamp: 0,
  confidence: 0,
  isSynthetic: false,
  isTempAssumed: true,
};

export const PlantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');

  const [profiles, setProfiles] = useState<PlantProfile[]>(() => StorageService.getProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => StorageService.getActiveProfileId());
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PLANT_PROFILES[0];

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionProtocol, setConnectionProtocolState] = useState<ConnectionProtocol>(() => {
    return (localStorage.getItem('plant_connection_protocol') as ConnectionProtocol) || 'serial';
  });

  const setConnectionProtocol = useCallback((protocol: ConnectionProtocol) => {
    setConnectionProtocolState(protocol);
    localStorage.setItem('plant_connection_protocol', protocol);
  }, []);

  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Awaiting connection from STM32');
  const [serialLogs, setSerialLogs] = useState<SerialLogEntry[]>([]);

  // Demo mode is completely disabled — strictly hardware readings only when STM32 is connected
  const [isDemoMode] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario>('dataset_stream');

  const [currentReading, setCurrentReading] = useState<SensorReading>(EMPTY_READING);

  const [history, setHistory] = useState<SensorReading[]>(() => {
    const saved = StorageService.getTelemetryHistory();
    if (saved && saved.length > 0) {
      return saved.filter((s) => !s.isSynthetic && s.timestamp > 0);
    }
    return [];
  });

  const hasRealReading = connectionState === 'connected' && currentReading.timestamp > 0;

  const [refreshInterval, setRefreshIntervalState] = useState<number>(() => StorageService.getRefreshInterval());
  const [tempUnit, setTempUnitState] = useState<'C' | 'F'>(() => StorageService.getTempUnit());

  const [alerts, setAlerts] = useState<AlertItem[]>(() => StorageService.getAlerts());
  const [alertPrefs, setAlertPrefs] = useState<AlertPreferences>(() => StorageService.getAlertPreferences());

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isStale = hasRealReading && connectionState !== 'connected' && now - currentReading.timestamp > 30000;

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
          addLog('sys', `BLE connected: ${webBluetooth.getDeviceName() || 'STM32'}`);
        } else if (status === 'disconnected') {
          setConnectedDeviceName(null);
          setCurrentReading(EMPTY_READING);
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
          addLog('sys', 'Serial port opened');
        } else if (status === 'disconnected') {
          setConnectedDeviceName(null);
          setCurrentReading(EMPTY_READING);
          addLog('sys', 'Serial port disconnected');
        }
        if (msg) setStatusMessage(msg);
      }
    );
  }, [handleIncomingReading, addLog]);

  // Demo stream disabled — hardware readings only
  const setIsDemoMode = (_enabled: boolean) => {
    // Demo mode disabled
  };

  const setScenario = (_scenario: DemoScenario) => {
    // Demo scenarios disabled in hardware-only mode
  };

  const refreshReadings = () => {
    if (connectionProtocol === 'cloud') {
      connectCloud();
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

  const connectCloud = async (): Promise<boolean> => {
    addLog('sys', 'Checking Cloud Bridge endpoint (/api/telemetry)...');
    setStatusMessage('Connecting to Cloud Bridge...');
    setConnectionState('connecting');
    setConnectionProtocol('cloud');

    const res = await cloudTelemetry.getLatest();
    if (res && res.success) {
      if (res.reading) {
        // Sync plant profile if STM32 selected a specific plant (SW2 on Black Pill)
        if (typeof res.reading.plantCode === 'number' && res.reading.plantCode !== activeProfile.plantCode) {
          const matching = profiles.find((p) => p.plantCode === res.reading?.plantCode);
          if (matching) {
            setActiveProfileId(matching.id);
            StorageService.saveActiveProfileId(matching.id);
          }
        }

        handleIncomingReading(res.reading);
        if (res.history && res.history.length > 0) {
          setHistory(res.history);
          StorageService.saveTelemetryHistory(res.history);
        }

        if (!res.isStale) {
          setConnectionState('connected');
          setConnectedDeviceName('STM32 via Android Bridge');
          setStatusMessage('Live Telemetry from STM32 via Cloud Bridge');
          addLog('sys', 'Cloud Bridge connected: Live readings active');
        } else {
          setConnectionState('disconnected');
          setConnectedDeviceName('STM32 Cloud Bridge (Offline)');
          setStatusMessage('Cloud Bridge connected (last packet stale, waiting for fresh telemetry...)');
          addLog('sys', 'Cloud Bridge: showing last known hardware reading');
        }
        return true;
      } else {
        setConnectionState('connected');
        setConnectedDeviceName('Cloud Bridge (Ready)');
        setStatusMessage('Cloud Bridge active (waiting for first packet from Android...)');
        addLog('sys', 'Cloud Bridge connected (listening for incoming packets)');
        return true;
      }
    } else {
      setConnectionState('error');
      setStatusMessage('Failed to reach Cloud Bridge endpoint');
      addLog('sys', 'Error: Cloud Bridge endpoint unreachable');
      return false;
    }
  };

  const testCloudIngestion = async (token?: string): Promise<{ success: boolean; message?: string }> => {
    addLog('sys', 'Sending test telemetry packet to /api/telemetry...');
    const testLine =
      'PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0';
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'text/plain',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers,
        body: testLine,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addLog('sys', 'Test packet successfully accepted by Cloud Bridge!');
        setStatusMessage('Test packet accepted by Cloud Bridge');
        await connectCloud();
        return { success: true, message: json.message };
      } else {
        addLog('sys', `Test packet rejected: ${json.error}`);
        setStatusMessage(`Test packet rejected: ${json.error}`);
        return { success: false, message: json.error };
      }
    } catch (err: any) {
      addLog('sys', `Test packet failed: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  // Cloud Telemetry Poller: periodically fetches /api/telemetry when cloud protocol is active
  useEffect(() => {
    if (connectionProtocol !== 'cloud' || isDemoMode) return;

    let isMounted = true;
    const pollInterval = Math.max(2000, refreshInterval);

    const poll = async () => {
      const res = await cloudTelemetry.getLatest();
      if (!isMounted) return;

      if (res && res.success && res.reading) {
        // Automatically sync plant profile if hardware toggled (SW2 on STM32)
        if (typeof res.reading.plantCode === 'number' && res.reading.plantCode !== activeProfile.plantCode) {
          const matching = profiles.find((p) => p.plantCode === res.reading?.plantCode);
          if (matching) {
            setActiveProfileId(matching.id);
            StorageService.saveActiveProfileId(matching.id);
          }
        }

        handleIncomingReading(res.reading);

        if (!res.isStale) {
          setConnectionState('connected');
          setConnectedDeviceName('STM32 via Android Bridge');
          setStatusMessage('Streaming live telemetry from STM32');
        } else {
          setConnectionState('disconnected');
          setConnectedDeviceName('STM32 Cloud Bridge (Offline)');
          setStatusMessage('Cloud Bridge: Telemetry is stale (STM32 offline)');
          setCurrentReading(EMPTY_READING);
        }
      }
    };

    poll();
    const timer = setInterval(poll, pollInterval);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [connectionProtocol, isDemoMode, refreshInterval, activeProfile.plantCode, profiles, handleIncomingReading]);

  // On mount: if user previously connected to cloud bridge, resume polling automatically
  useEffect(() => {
    const savedProtocol = localStorage.getItem('plant_connection_protocol');
    if (savedProtocol === 'cloud') {
      connectCloud();
    }
  }, []);

  const disconnectHardware = () => {
    if (connectionProtocol === 'ble') webBluetooth.disconnect();
    else if (connectionProtocol === 'serial') webSerial.disconnect();
    setConnectionState('disconnected');
    setConnectedDeviceName(null);
    setCurrentReading(EMPTY_READING);
    setStatusMessage('STM32 Disconnected. Telemetry offline.');
    addLog('sys', 'STM32 disconnected');
  };

  const injectManualPacket = (rawText: string): boolean => {
    addLog('in', `[Manual Ingest] ${rawText}`);
    
    // Parse using universal parser (supports key-value & JSON)
    const parsedOk = webSerial.parseAndDispatch(rawText, activeProfile.plantCode);
    if (parsedOk) {
      setConnectionState('connected');
      setConnectedDeviceName('STM32 Hardware Telemetry');
      setStatusMessage('Live reading ingested successfully');

      // Forward to backend cloud API in background to persist
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: rawText,
      }).catch((e) => console.warn('Cloud persist failed:', e));
      return true;
    }
    return false;
  };

  const selectProfile = (id: string) => {
    setActiveProfileId(id);
    StorageService.saveActiveProfileId(id);
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

  const lastUpdatedStr = hasRealReading
    ? new Date(currentReading.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Waiting for device';

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
        hasRealReading,
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
        connectCloud,
        testCloudIngestion,
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
