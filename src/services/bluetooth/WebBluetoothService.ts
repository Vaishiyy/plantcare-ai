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
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return false;
      }

      const jsonSub = rawText.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonSub);

      // Support moisture / soil_humidity_pct
      const moisture = typeof parsed.moisture === 'number' ? parsed.moisture : parsed.soil_humidity_pct;
      // Support temperature / temperature_c
      const temperature = typeof parsed.temperature === 'number' ? parsed.temperature : parsed.temperature_c;
      // Support humidity / air_humidity_pct
      const humidity = typeof parsed.humidity === 'number' ? parsed.humidity : parsed.air_humidity_pct;
      // Support light / ldr_on_plant
      const light = typeof parsed.light === 'number' ? parsed.light : parsed.ldr_on_plant;

      if (
        typeof moisture !== 'number' ||
        typeof temperature !== 'number' ||
        typeof humidity !== 'number' ||
        typeof light !== 'number'
      ) {
        return false;
      }

      // Execute ML model if condition not provided
      const diag = evaluatePlantModel(
        activePlantCode,
        moisture,
        temperature,
        humidity,
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

      const reading: SensorReading = {
        moisture: parseFloat(moisture.toFixed(1)),
        temperature: parseFloat(temperature.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(1)),
        light: Math.round(light),
        condition: diag.condition,
        suitabilityClass: diag.suitabilityClass,
        mlClassCode: diag.mlClassCode,
        timestamp: Date.now(),
        confidence: diag.mlClassCode === 2 ? 0.98 : diag.mlClassCode === 1 ? 0.93 : 0.96,
        isSynthetic: false, // Authentic Hardware!
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
