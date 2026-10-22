import { PlantCondition, SensorReading } from '../../types';
import { evaluatePlantModel } from '../ml/mlInference';

// Standard Nordic UART and common HM-10/BLE UUIDs for STM32 UART bridges
const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const HM10_SERVICE = '0000ffe0-0000-1000-8000-00805f9b34fb';
const HM10_CHAR = '0000ffe1-0000-1000-8000-00805f9b34fb';

export type BluetoothDataCallback = (reading: SensorReading, rawText: string) => void;
export type BluetoothStatusCallback = (status: 'disconnected' | 'connecting' | 'connected' | 'error', message?: string) => void;

export class WebBluetoothManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private buffer: string = '';
  private onDataReceived: BluetoothDataCallback | null = null;
  private onStatusChanged: BluetoothStatusCallback | null = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public registerCallbacks(onData: BluetoothDataCallback, onStatus: BluetoothStatusCallback): void {
    this.onDataReceived = onData;
    this.onStatusChanged = onStatus;
  }

  public async connect(): Promise<boolean> {
    if (!this.isSupported() || !navigator.bluetooth) {
      this.onStatusChanged?.('error', 'Web Bluetooth is not supported in this browser. Please use Google Chrome, Edge, or Android Chrome.');
      return false;
    }

    try {
      this.onStatusChanged?.('connecting', 'Scanning for Bluetooth Low Energy plant devices...');

      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Plant' },
          { namePrefix: 'STM32' },
          { namePrefix: 'HC-' },
          { namePrefix: 'HM-' },
          { namePrefix: 'BT' },
        ],
        optionalServices: [
          NORDIC_UART_SERVICE,
          HM10_SERVICE,
          'generic_access',
          'battery_service',
        ],
      });

      if (!this.device) {
        throw new Error('Device selection was cancelled.');
      }

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));

      this.onStatusChanged?.('connecting', `Connecting to ${this.device.name || 'Plant Device'}...`);

      if (!this.device.gatt) {
        throw new Error('GATT server unavailable on this device.');
      }

      this.server = await this.device.gatt.connect();

      let service: BluetoothRemoteGATTService | null = null;
      try {
        service = await this.server.getPrimaryService(HM10_SERVICE);
        this.characteristic = await service.getCharacteristic(HM10_CHAR);
      } catch (e) {
        try {
          service = await this.server.getPrimaryService(NORDIC_UART_SERVICE);
          this.characteristic = await service.getCharacteristic(NORDIC_TX_CHAR);
        } catch (innerError) {
          throw new Error('Neither HM-10 nor Nordic BLE UART service was found on this peripheral.');
        }
      }

      if (!this.characteristic) {
        throw new Error('Could not obtain notification characteristic.');
      }

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleIncomingPacket.bind(this));

      this.onStatusChanged?.('connected', `Connected to ${this.device.name || 'STM32 Device'}`);
      return true;
    } catch (err: any) {
      console.warn('Bluetooth connection failed or cancelled:', err);
      const isCancelled = err.name === 'NotFoundError' || err.message?.includes('User cancelled');
      this.onStatusChanged?.(
        isCancelled ? 'disconnected' : 'error',
        isCancelled ? 'Device scan cancelled by user' : (err.message || 'Bluetooth connection failed')
      );
      this.cleanup();
      return false;
    }
  }

  public disconnect(): void {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
    this.cleanup();
    this.onStatusChanged?.('disconnected', 'Disconnected from hardware');
  }

  private handleDisconnection(): void {
    this.cleanup();
    this.onStatusChanged?.('disconnected', 'Bluetooth link lost or disconnected');
  }

  private cleanup(): void {
    this.server = null;
    this.characteristic = null;
    this.device = null;
    this.buffer = '';
  }

  private handleIncomingPacket(event: Event): void {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    if (!char.value) return;

    const decoder = new TextDecoder('utf-8');
    const chunk = decoder.decode(char.value);
    this.processChunk(chunk);
  }

  public processChunk(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      this.parseAndDispatch(trimmed);
    }
  }

  public parseAndDispatch(rawText: string, activePlantCode: 0 | 1 = 0): boolean {
    try {
      let moisture: number | undefined;
      let humidity: number | undefined;
      let light: number | undefined;
      let temperature: number = 25.0; // Hardware has no temp sensor; 25C baseline
      let isTempAssumed: boolean = true;
      let condition: string | undefined;
      let mlClassCode: 0 | 1 | 2 | undefined;
      let plantCode: 0 | 1 = activePlantCode;

      let humAdc: number | undefined;
      let soilRaw: number | undefined;
      let potAdc: number | undefined;
      let sw1: number | undefined;
      let sw2: number | undefined;

      // 1. Try Key-Value format from STM32 main.c:
      // PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0
      if (rawText.includes('=')) {
        const kv: Record<string, string> = {};
        for (const part of rawText.replace(/[\r\n]/g, '').split(',')) {
          if (part.includes('=')) {
            const [k, v] = part.split('=', 2);
            if (k && v !== undefined) {
              kv[k.trim().toUpperCase()] = v.trim();
            }
          }
        }

        if (kv['SOIL_PCT'] !== undefined) moisture = parseFloat(kv['SOIL_PCT']);
        else if (kv['MOISTURE'] !== undefined) moisture = parseFloat(kv['MOISTURE']);

        if (kv['HUM_RH_EST'] !== undefined) humidity = parseFloat(kv['HUM_RH_EST']);
        else if (kv['HUMIDITY'] !== undefined) humidity = parseFloat(kv['HUMIDITY']);
        else humidity = 50.0;

        if (kv['LDR_ADC'] !== undefined) light = parseInt(kv['LDR_ADC'], 10);
        else if (kv['LIGHT'] !== undefined) light = parseInt(kv['LIGHT'], 10);

        if (kv['TEMP_C_ASSUMED'] !== undefined) {
          temperature = parseFloat(kv['TEMP_C_ASSUMED']);
          isTempAssumed = true;
        } else if (kv['TEMP'] !== undefined || kv['TEMPERATURE'] !== undefined) {
          const tVal = parseFloat(kv['TEMP'] || kv['TEMPERATURE']);
          if (!isNaN(tVal)) {
            temperature = tVal;
            isTempAssumed = false;
          }
        }

        if (kv['HUM_ADC'] !== undefined) humAdc = parseInt(kv['HUM_ADC'], 10);
        if (kv['SOIL_RAW'] !== undefined) soilRaw = parseInt(kv['SOIL_RAW'], 10);
        if (kv['POT_ADC'] !== undefined) potAdc = parseInt(kv['POT_ADC'], 10);
        if (kv['SW1'] !== undefined) sw1 = parseInt(kv['SW1'], 10);
        if (kv['SW2'] !== undefined) {
          sw2 = parseInt(kv['SW2'], 10);
          plantCode = sw2 === 1 ? 1 : 0;
        }

        if (kv['ML_STATUS'] !== undefined) {
          condition = kv['ML_STATUS'].replace(/_/g, ' ').trim();
        }

        if (kv['ML_CLASS'] !== undefined) {
          const cls = parseInt(kv['ML_CLASS'], 10);
          if (cls === 0 || cls === 1 || cls === 2) mlClassCode = cls;
        }

        if (kv['PLANT'] !== undefined) {
          plantCode = kv['PLANT'].toUpperCase().includes('POTHOS') ? 1 : 0;
        }
      } else {
        // 2. Try JSON format:
        const startIdx = rawText.indexOf('{');
        const endIdx = rawText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const jsonSub = rawText.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(jsonSub);

          moisture = typeof parsed.moisture === 'number' ? parsed.moisture : parsed.soil_humidity_pct;
          humidity = typeof parsed.humidity === 'number' ? parsed.humidity : parsed.air_humidity_pct ?? 50.0;
          light = typeof parsed.light === 'number' ? parsed.light : parsed.ldr_on_plant;

          if (typeof parsed.temperature === 'number') {
            temperature = parsed.temperature;
            isTempAssumed = false;
          } else if (typeof parsed.temp === 'number') {
            temperature = parsed.temp;
            isTempAssumed = false;
          }

          if (typeof parsed.condition === 'string') condition = parsed.condition;
          if (typeof parsed.mlClassCode === 'number' && (parsed.mlClassCode === 0 || parsed.mlClassCode === 1 || parsed.mlClassCode === 2)) {
            mlClassCode = parsed.mlClassCode;
          }
          if (typeof parsed.plantCode === 'number') {
            plantCode = parsed.plantCode === 1 ? 1 : 0;
          }
        }
      }

      if (moisture === undefined || light === undefined || isNaN(moisture) || isNaN(light)) {
        return false;
      }

      let suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress' = 'suitable';
      let plantCond: PlantCondition = 'Suitable';

      if (mlClassCode === undefined || condition === undefined) {
        const diag = evaluatePlantModel(
          plantCode,
          moisture,
          temperature,
          humidity ?? 50,
          light,
          {
            moistureMin: 10,
            moistureMax: 35,
            tempMin: 18,
            tempMax: 32,
            humidityMin: 30,
            humidityMax: 60,
            lightMin: 2500,
            lightMax: 4095,
          }
        );
        plantCond = diag.condition;
        suitabilityClass = diag.suitabilityClass;
        mlClassCode = diag.mlClassCode;
      } else {
        suitabilityClass = mlClassCode === 2 ? 'suitable' : mlClassCode === 1 ? 'moderate_stress' : 'high_stress';
        plantCond = mlClassCode === 2 ? 'Suitable' : mlClassCode === 1 ? 'Moderate Stress' : 'High Stress';
      }

      const reading: SensorReading = {
        moisture: parseFloat(moisture.toFixed(1)),
        temperature: parseFloat(temperature.toFixed(1)),
        humidity: parseFloat((humidity ?? 50.0).toFixed(1)),
        light: Math.round(light),
        condition: plantCond,
        suitabilityClass,
        mlClassCode,
        timestamp: Date.now(),
        confidence: mlClassCode === 2 ? 0.98 : mlClassCode === 1 ? 0.93 : 0.96,
        isSynthetic: false, // Authentic Hardware!
        isTempAssumed,
        plantCode,
        humAdc,
        soilRaw,
        potAdc,
        sw1,
        sw2,
        rawString: rawText,
      };

      this.onDataReceived?.(reading, rawText);
      return true;
    } catch (e) {
      return false;
    }
  }

  public getDeviceName(): string | null {
    return this.device?.name || null;
  }

  public isConnected(): boolean {
    return !!(this.server && this.server.connected);
  }
}

export const webBluetooth = new WebBluetoothManager();
