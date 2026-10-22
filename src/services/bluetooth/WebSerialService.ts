import { SensorReading } from '../../types';
import { parseTelemetryPacket } from '../TelemetryParser';

export type SerialDataCallback = (reading: SensorReading, rawText: string) => void;
export type SerialStatusCallback = (
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  message?: string
) => void;
export type SerialRawCallback = (direction: 'in' | 'out' | 'sys', text: string) => void;

export class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private buffer: string = '';
  private isReading: boolean = false;
  private onDataReceived: SerialDataCallback | null = null;
  private onStatusChanged: SerialStatusCallback | null = null;
  private onRawData: SerialRawCallback | null = null;
  private currentBaudRate: number = 9600;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public registerCallbacks(
    onData: SerialDataCallback,
    onStatus: SerialStatusCallback,
    onRaw?: SerialRawCallback
  ): void {
    this.onDataReceived = onData;
    this.onStatusChanged = onStatus;
    this.onRawData = onRaw || null;
  }

  /** User-initiated connect: shows browser port-picker dialog */
  public async connect(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSupported()) {
      this.onStatusChanged?.(
        'error',
        'Web Serial API not supported. Use Google Chrome or Microsoft Edge on Windows/Mac/Linux.'
      );
      return false;
    }

    if (this.port) {
      await this.disconnect();
    }

    try {
      this.onStatusChanged?.(
        'connecting',
        'Select your Bluetooth HC-05 COM port or USB Serial port from the list...'
      );
      this.port = await (navigator as any).serial.requestPort();
      return await this._openAndStream(baudRate);
    } catch (err: any) {
      const cancelled =
        err.name === 'NotFoundError' ||
        err.message?.includes('cancelled') ||
        err.message?.includes('No port selected');
      this.onStatusChanged?.(
        cancelled ? 'disconnected' : 'error',
        cancelled
          ? 'Port selection cancelled. Please choose your Bluetooth COM or USB port.'
          : `Serial error: ${err.message || 'Unknown error'}`
      );
      this.port = null;
      return false;
    }
  }

  /** Auto-connect to a previously permitted port (no dialog needed) */
  public async autoConnect(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (this.port) return true;
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports && ports.length > 0) {
        this.port = ports[0];
        return await this._openAndStream(baudRate);
      }
    } catch (e) {
      console.warn('[WebSerial] Auto-connect failed:', e);
    }
    return false;
  }

  private async _openAndStream(baudRate: number): Promise<boolean> {
    this.currentBaudRate = baudRate;
    try {
      if (!this.port.readable) {
        await this.port.open({ baudRate });
      }
      this.onStatusChanged?.(
        'connected',
        `Serial port opened at ${baudRate} baud (Bluetooth HC-05 / USB link active)`
      );
      this._startReading();
      return true;
    } catch (err: any) {
      if (err.message?.includes('already open') || err.message?.includes('port is already')) {
        this.onStatusChanged?.(
          'connected',
          `Serial port already open — streaming at ${baudRate} baud`
        );
        this._startReading();
        return true;
      }
      this.onStatusChanged?.('error', `Could not open port: ${err.message}`);
      this.port = null;
      return false;
    }
  }

  private async _startReading(): Promise<void> {
    if (!this.port || !this.port.readable) return;
    this.isReading = true;
    const decoder = new TextDecoder('utf-8');

    try {
      this.reader = this.port.readable.getReader();
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          this._processChunk(chunk);
        }
      }
    } catch (err: any) {
      if (this.isReading) {
        console.warn('[WebSerial] Read loop error:', err);
        this.onStatusChanged?.(
          'error',
          `Serial stream interrupted: ${err.message || 'Check connection'}`
        );
      }
    } finally {
      try {
        this.reader?.releaseLock();
      } catch (_) {}
      this.reader = null;
      this.isReading = false;
    }
  }

  private _processChunk(chunk: string): void {
    this.buffer += chunk;
    const parts = this.buffer.split(/[\r\n]+/);
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part.trim();
      if (!line) continue;
      // 1. Immediately log raw incoming line so user sees telemetry in terminal!
      this.onRawData?.('in', line);
      // 2. Parse telemetry packet
      this.parseAndDispatch(line);
    }

    // Flush buffer if no newline arrives within 400ms
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

  /** Parses a raw UART line and dispatches SensorReading if valid */
  public parseAndDispatch(rawText: string, activePlantCode: 0 | 1 = 0): boolean {
    const reading = parseTelemetryPacket(rawText, activePlantCode);
    if (reading) {
      this.onDataReceived?.(reading, rawText);
      return true;
    }
    return false;
  }

  /** Send text command to STM32 over serial (e.g. CMD:READ\n) */
  public async send(text: string): Promise<boolean> {
    if (!this.port || !this.port.writable) return false;
    try {
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      await writer.write(encoder.encode(text));
      writer.releaseLock();
      return true;
    } catch (e) {
      console.error('[WebSerial] Transmit error:', e);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isReading = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (_) {}
      try {
        this.reader.releaseLock();
      } catch (_) {}
      this.reader = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch (_) {}
      this.port = null;
    }
    this.buffer = '';
    this.onStatusChanged?.('disconnected', 'Serial port disconnected');
  }

  public isConnected(): boolean {
    return !!this.port;
  }

  public getBaudRate(): number {
    return this.currentBaudRate;
  }

  public processChunk(chunk: string): void {
    this._processChunk(chunk);
  }
}

export const webSerial = new WebSerialManager();
