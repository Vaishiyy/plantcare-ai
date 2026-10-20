import { PlantCondition, SensorReading } from '../../types';

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

      // Request device with common plant monitoring and UART services
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

      // Try discovering Nordic UART or HM-10 service
      let service: BluetoothRemoteGATTService | null = null;
      try {
        service = await this.server.getPrimaryService(HM10_SERVICE);
        this.characteristic = await service.getCharacteristic(HM10_CHAR);
      } catch (e) {
        // Fallback to Nordic UART
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

    // Check for newline delimiters (typical UART stream framing)
    const lines = this.buffer.split(/\r?\n/);
    // Keep incomplete fragment in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      this.parseAndDispatch(trimmed);
    }
  }

  public parseAndDispatch(rawText: string): boolean {
    try {
      // Find JSON object bounds within line (in case of noisy UART preamble)
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return false;
      }

      const jsonSub = rawText.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonSub);

      // Validate required fields
      if (
        typeof parsed.moisture !== 'number' ||
        typeof parsed.temperature !== 'number' ||
        typeof parsed.humidity !== 'number' ||
        typeof parsed.light !== 'number'
      ) {
        console.warn('Incomplete sensor payload received:', parsed);
        return false;
      }

      // Validate condition enum
      const validConditions: PlantCondition[] = ['Healthy', 'Needs Water', 'Too Dry', 'Poor Environment'];
      let condition: PlantCondition = 'Healthy';

      if (validConditions.includes(parsed.condition)) {
        condition = parsed.condition;
      }

      const reading: SensorReading = {
        moisture: Math.max(0, Math.min(100, Math.round(parsed.moisture))),
        temperature: parseFloat(parsed.temperature.toFixed(1)),
        humidity: Math.max(0, Math.min(100, Math.round(parsed.humidity))),
        light: Math.max(0, Math.round(parsed.light)),
        condition,
        timestamp: Date.now(),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
        isSynthetic: false, // Authentic STM32 Hardware!
      };

      this.onDataReceived?.(reading, rawText);
      return true;
    } catch (e) {
      console.warn('Failed to parse incoming UART JSON frame:', rawText, e);
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
