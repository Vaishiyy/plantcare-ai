import { SensorReading } from '../../types';
import { parseTelemetryPacket } from '../TelemetryParser';

const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const HM10_SERVICE = '0000ffe0-0000-1000-8000-00805f9b34fb';
const HM10_CHAR = '0000ffe1-0000-1000-8000-00805f9b34fb';

export type BluetoothDataCallback = (reading: SensorReading, rawText: string) => void;
export type BluetoothStatusCallback = (
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  message?: string
) => void;
export type BluetoothRawCallback = (direction: 'in' | 'out' | 'sys', text: string) => void;

export class WebBluetoothManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private buffer: string = '';
  private onDataReceived: BluetoothDataCallback | null = null;
  private onStatusChanged: BluetoothStatusCallback | null = null;
  private onRawData: BluetoothRawCallback | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public registerCallbacks(
    onData: BluetoothDataCallback,
    onStatus: BluetoothStatusCallback,
    onRaw?: BluetoothRawCallback
  ): void {
    this.onDataReceived = onData;
    this.onStatusChanged = onStatus;
    this.onRawData = onRaw || null;
  }

  public async connect(): Promise<boolean> {
    if (!this.isSupported() || !navigator.bluetooth) {
      this.onStatusChanged?.(
        'error',
        'Web Bluetooth is not supported in this browser. Please use Google Chrome or Edge.'
      );
      return false;
    }

    try {
      this.onStatusChanged?.('connecting', 'Scanning for Bluetooth devices...');

      // Attempt device request with broad filters and optional services
      try {
        this.device = await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: 'Plant' },
            { namePrefix: 'STM32' },
            { namePrefix: 'HC' },
            { namePrefix: 'HM' },
            { namePrefix: 'BT' },
            { namePrefix: 'ESP' },
          ],
          optionalServices: [
            NORDIC_UART_SERVICE,
            HM10_SERVICE,
            'generic_access',
            'battery_service',
          ],
        });
      } catch (err: any) {
        // If filter returned no device or was cancelled, try acceptAllDevices mode
        if (err.name !== 'NotFoundError') {
          this.device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              NORDIC_UART_SERVICE,
              HM10_SERVICE,
              'generic_access',
            ],
          });
        } else {
          throw err;
        }
      }

      if (!this.device) {
        throw new Error('Device selection was cancelled.');
      }

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));
      this.onStatusChanged?.('connecting', `Connecting to ${this.device.name || 'Bluetooth Device'}...`);

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

      this.onStatusChanged?.('connected', `Connected to ${this.device.name || 'Bluetooth Device'}`);
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
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
    this.cleanup();
    this.onStatusChanged?.('disconnected', 'Disconnected from Bluetooth device');
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
    const parts = this.buffer.split(/[\r\n]+/);
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part.trim();
      if (!line) continue;
      // 1. Immediately log raw line to terminal
      this.onRawData?.('in', line);
      // 2. Parse telemetry
      this.parseAndDispatch(line);
    }

    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.buffer.trim().length > 0) {
      this.flushTimer = setTimeout(() => {
        if (this.buffer.trim().length > 0) {
          const line = this.buffer.trim();
          this.buffer = '';
          this.onRawData?.('in', line);
          this.parseAndDispatch(line);
        }
      }, 400);
    }
  }

  public parseAndDispatch(rawText: string, activePlantCode: 0 | 1 = 0): boolean {
    const reading = parseTelemetryPacket(rawText, activePlantCode);
    if (reading) {
      this.onDataReceived?.(reading, rawText);
      return true;
    }
    return false;
  }

  public getDeviceName(): string | null {
    return this.device?.name || null;
  }

  public async send(text: string): Promise<boolean> {
    if (!this.characteristic) return false;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const char = this.characteristic as any;
      if (typeof char.writeValueWithResponse === 'function') {
        await char.writeValueWithResponse(data);
      } else if (typeof char.writeValueWithoutResponse === 'function') {
        await char.writeValueWithoutResponse(data);
      } else if (typeof char.writeValue === 'function') {
        await char.writeValue(data);
      }
      return true;
    } catch (e) {
      console.warn('[WebBluetooth] Send error:', e);
      return false;
    }
  }

  public isConnected(): boolean {
    return !!(this.server && this.server.connected);
  }
}

export const webBluetooth = new WebBluetoothManager();
