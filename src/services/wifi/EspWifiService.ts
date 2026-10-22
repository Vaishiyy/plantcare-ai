import { SensorReading } from '../../types';
import { parseTelemetryPacket } from '../TelemetryParser';

export type EspDataCallback = (reading: SensorReading, rawText: string) => void;
export type EspStatusCallback = (
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  message?: string
) => void;
export type EspRawCallback = (direction: 'in' | 'out' | 'sys', text: string) => void;

export class EspWifiService {
  private ws: WebSocket | null = null;
  private buffer: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private httpPollTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect: boolean = false;
  private reconnectDelay: number = 3000;
  private maxReconnectDelay: number = 15000;

  private onDataReceived: EspDataCallback | null = null;
  private onStatusChanged: EspStatusCallback | null = null;
  private onRawData: EspRawCallback | null = null;

  private _espIp: string = '';
  private _espPort: number = 81;
  private _espPath: string = '/';
  private _isHttpMode: boolean = false;

  public registerCallbacks(
    onData: EspDataCallback,
    onStatus: EspStatusCallback,
    onRaw?: EspRawCallback
  ): void {
    this.onDataReceived = onData;
    this.onStatusChanged = onStatus;
    this.onRawData = onRaw || null;
  }

  public isConnected(): boolean {
    if (this._isHttpMode) return this.httpPollTimer !== null;
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getIp(): string {
    return this._espIp;
  }

  public getPort(): number {
    return this._espPort;
  }

  public isHttpMode(): boolean {
    return this._isHttpMode;
  }

  public connect(ip: string, port: number = 81, path: string = '/'): void {
    this.disconnect();

    const cleanIp = ip
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^ws:\/\//i, '')
      .split('/')[0]
      .split(':')[0];

    this._espIp = cleanIp;
    this._espPort = port;
    this._espPath = path.startsWith('/') ? path : `/${path}`;
    this.shouldReconnect = true;
    this.reconnectDelay = 3000;

    if (port === 80) {
      this._startHttpMode();
    } else {
      this._doConnectWs();
    }
  }

  private _doConnectWs(): void {
    const url = `ws://${this._espIp}:${this._espPort}${this._espPath}`;
    this._isHttpMode = false;
    this.onStatusChanged?.('connecting', `Connecting to ESP8266 WiFi at ${url}...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectDelay = 3000;
        this.onStatusChanged?.(
          'connected',
          `ESP8266 WiFi Connected (WebSocket ws://${this._espIp}:${this._espPort})`
        );
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const raw = typeof event.data === 'string' ? event.data : '';
        if (!raw) return;

        this.buffer += raw;
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
      };

      this.ws.onerror = (event) => {
        console.warn('[ESP8266 WiFi] WebSocket error:', event);
        this.onStatusChanged?.(
          'error',
          `WebSocket connection failed at ws://${this._espIp}:${this._espPort}. Check ESP8266 IP and ensure same WiFi network.`
        );
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.shouldReconnect) {
          this.onStatusChanged?.(
            'connecting',
            `ESP8266 disconnected — auto-reconnecting in ${this.reconnectDelay / 1000}s...`
          );
          this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
            this._doConnectWs();
          }, this.reconnectDelay);
        } else {
          this.onStatusChanged?.('disconnected', 'Disconnected from ESP8266 WiFi');
        }
      };
    } catch (err: any) {
      this.onStatusChanged?.('error', `WebSocket error: ${err.message || 'Check ESP8266 IP address'}`);
    }
  }

  private _startHttpMode(): void {
    this._isHttpMode = true;
    this.onStatusChanged?.('connecting', `Connecting to ESP8266 HTTP endpoint http://${this._espIp}...`);

    this.fetchHttpReading().then((ok) => {
      if (ok) {
        this.onStatusChanged?.('connected', `ESP8266 WiFi Connected (HTTP http://${this._espIp})`);
      } else {
        this.onStatusChanged?.('error', `Cannot reach ESP8266 HTTP server at http://${this._espIp}.`);
      }
    });

    if (this.httpPollTimer) clearInterval(this.httpPollTimer);
    this.httpPollTimer = setInterval(() => {
      this.fetchHttpReading();
    }, 3000);
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.httpPollTimer) {
      clearInterval(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.buffer = '';
    this.onStatusChanged?.('disconnected', 'Disconnected from ESP8266 WiFi module');
  }

  public async send(text: string): Promise<boolean> {
    const payload = text.endsWith('\n') ? text : `${text}\n`;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(payload);
        return true;
      } catch (err) {
        console.warn('[ESP8266 WiFi] WebSocket send failed:', err);
      }
    }

    if (this._espIp) {
      return await this.sendHttpCommand(text);
    }

    return false;
  }

  public async sendHttpCommand(cmd: string, ip?: string, port: number = 80): Promise<boolean> {
    const targetIp = ip || this._espIp;
    if (!targetIp) return false;

    const url = `http://${targetIp}:${port}/cmd`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: cmd,
        signal: controller.signal,
        mode: 'cors',
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (_) {
      try {
        const getUrl = `http://${targetIp}:${port}/cmd?text=${encodeURIComponent(cmd)}`;
        await fetch(getUrl, { mode: 'no-cors' });
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  public async fetchHttpReading(ip?: string, port: number = 80): Promise<boolean> {
    const targetIp = ip || this._espIp;
    if (!targetIp) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`http://${targetIp}:${port}/readings`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          this.onRawData?.('in', text.trim());
          return this.parseAndDispatch(text.trim());
        }
      }
      return false;
    } catch (err) {
      return false;
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
}

export const espWifi = new EspWifiService();
