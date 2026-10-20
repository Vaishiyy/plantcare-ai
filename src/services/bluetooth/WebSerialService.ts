import { SensorReading } from '../../types';
import { evaluatePlantModel } from '../ml/mlInference';

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
        if (done) break;
        if (value) {
          this.processChunk(value);
        }
      }
    } catch (error) {
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

  public parseAndDispatch(rawText: string, activePlantCode: 0 | 1 = 0): boolean {
    try {
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return false;
      }

      const jsonSub = rawText.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonSub);

      const moisture = typeof parsed.moisture === 'number' ? parsed.moisture : parsed.soil_humidity_pct;
      const temperature = typeof parsed.temperature === 'number' ? parsed.temperature : parsed.temperature_c;
      const humidity = typeof parsed.humidity === 'number' ? parsed.humidity : parsed.air_humidity_pct;
      const light = typeof parsed.light === 'number' ? parsed.light : parsed.ldr_on_plant;

      if (
        typeof moisture !== 'number' ||
        typeof temperature !== 'number' ||
        typeof humidity !== 'number' ||
        typeof light !== 'number'
      ) {
        return false;
      }

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
        isSynthetic: false,
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
