import { SensorReading, PlantCondition } from '../../types';

export type SerialDataCallback = (reading: SensorReading, rawText: string) => void;
export type SerialStatusCallback = (status: 'disconnected' | 'connecting' | 'connected' | 'error', message?: string) => void;

export class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private readableStreamClosed: Promise<void> | null = null;
  private buffer: string = '';
  private isReading: boolean = false;
  private onDataReceived: SerialDataCallback | null = null;
  private onStatusChanged: SerialStatusCallback | null = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public registerCallbacks(onData: SerialDataCallback, onStatus: SerialStatusCallback): void {
    this.onDataReceived = onData;
    this.onStatusChanged = onStatus;
  }

  public async connect(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSupported()) {
      this.onStatusChanged?.(
        'error',
        'Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera on desktop/laptop.'
      );
      return false;
    }

    try {
      this.onStatusChanged?.('connecting', 'Selecting serial port (Bluetooth HC-05 COM port or USB-UART)...');

      // Prompt user to select port
      this.port = await (navigator as any).serial.requestPort();
      if (!this.port) {
        throw new Error('Port selection cancelled.');
      }

      await this.port.open({ baudRate });

      this.onStatusChanged?.('connected', `Connected via Serial (Baud: ${baudRate})`);
      this.startReading();
      return true;
    } catch (err: any) {
      console.warn('Serial connection failed:', err);
      const isCancelled = err.name === 'NotFoundError' || err.message?.includes('User cancelled');
      this.onStatusChanged?.(
        isCancelled ? 'disconnected' : 'error',
        isCancelled ? 'Serial port selection cancelled' : (err.message || 'Failed to open serial port')
      );
      this.port = null;
      return false;
    }
  }

  private async startReading(): Promise<void> {
    if (!this.port || !this.port.readable) return;

    this.isReading = true;
    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value) {
          this.processChunk(value);
        }
      }
    } catch (error) {
      console.error('Serial read error:', error);
      this.onStatusChanged?.('error', 'Serial read error occurred.');
    } finally {
      this.reader?.releaseLock();
      this.disconnect();
    }
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

  public parseAndDispatch(rawText: string): boolean {
    try {
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return false;
      }

      const jsonSub = rawText.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonSub);

      if (
        typeof parsed.moisture !== 'number' ||
        typeof parsed.temperature !== 'number' ||
        typeof parsed.humidity !== 'number' ||
        typeof parsed.light !== 'number'
      ) {
        return false;
      }

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
        isSynthetic: false, // Live STM32 Serial Hardware!
      };

      this.onDataReceived?.(reading, rawText);
      return true;
    } catch (e) {
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // ignore
      }
    }
    if (this.readableStreamClosed) {
      try {
        await this.readableStreamClosed;
      } catch (e) {
        // ignore
      }
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        // ignore
      }
      this.port = null;
    }
    this.buffer = '';
    this.onStatusChanged?.('disconnected', 'Serial port closed');
  }

  public isConnected(): boolean {
    return !!this.port;
  }
}

export const webSerial = new WebSerialManager();
