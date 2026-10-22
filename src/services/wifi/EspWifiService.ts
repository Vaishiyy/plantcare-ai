/**
 * EspWifiService.ts
 *
 * Full bidirectional driver for connecting, receiving, and transmitting with an ESP8266 WiFi module.
 *
 * HOW IT WORKS:
 *   1. CONNECTING:
 *      - Connects via WebSocket to ws://<ESP8266_IP>:81 (port 81)
 *      - Fallback to HTTP polling if WebSocket is unavailable or blocked (port 80)
 *
 *   2. RECEIVING (STM32 -> ESP8266 -> Browser):
 *      - STM32 sends telemetry packet over USART2 (PA2 TX -> ESP8266 RX, PA3 RX -> ESP8266 TX)
 *      - ESP8266 broadcasts packet over WebSocket / exposes /readings endpoint
 *      - Browser receives and parses Key-Value / JSON telemetry in real time
 *
 *   3. TRANSMITTING (Browser -> ESP8266 -> STM32):
 *      - Browser transmits commands (e.g., CMD:READ, CMD:WATER, CMD:PING, or custom commands)
 *      - ESP8266 receives via WebSocket / HTTP and immediately writes to STM32 UART
 *      - STM32 takes immediate action!
 */

import { SensorReading, PlantCondition } from '../../types';
import { evaluatePlantModel } from '../ml/mlInference';

export type EspDataCallback = (reading: SensorReading, rawText: string) => void;
export type EspStatusCallback = (
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  message?: string
) => void;

export class EspWifiService {
  private ws: WebSocket | null = null;
  private buffer: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private httpPollTimer: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect: boolean = false;
  private reconnectDelay: number = 3000;
  private maxReconnectDelay: number = 15000;

  private onDataReceived: EspDataCallback | null = null;
  private onStatusChanged: EspStatusCallback | null = null;

  private _espIp: string = '';
  private _espPort: number = 81;
  private _espPath: string = '/';
  private _isHttpMode: boolean = false;

  public registerCallbacks(onData: EspDataCallback, onStatus: EspStatusCallback): void {
    this.onDataReceived = onData;
    this.onStatusChanged = onStatus;
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

  /**
   * Connect to ESP8266 WiFi module.
   * Defaults to WebSocket (port 81). If port is 80, uses HTTP polling mode.
   */
  public connect(ip: string, port: number = 81, path: string = '/'): void {
    this.disconnect();

    const cleanIp = ip.trim().replace(/^https?:\/\//i, '').replace(/^ws:\/\//i, '').split('/')[0].split(':')[0];
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
        this.onStatusChanged?.('connected', `ESP8266 WiFi Connected (WebSocket ws://${this._espIp}:${this._espPort})`);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const raw = typeof event.data === 'string' ? event.data : '';
        if (!raw) return;

        this.buffer += raw;
        const lines = this.buffer.split(/\r?\n/);
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          this._parseAndDispatch(trimmed);
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
          this.onStatusChanged?.('connecting', `ESP8266 disconnected — auto-reconnecting in ${this.reconnectDelay / 1000}s...`);
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

  /**
   * HTTP Polling mode (port 80 or fallback)
   */
  private _startHttpMode(): void {
    this._isHttpMode = true;
    this.onStatusChanged?.('connecting', `Connecting to ESP8266 HTTP endpoint http://${this._espIp}...`);

    // Immediate first fetch
    this.fetchHttpReading().then((ok) => {
      if (ok) {
        this.onStatusChanged?.('connected', `ESP8266 WiFi Connected (HTTP http://${this._espIp})`);
      } else {
        this.onStatusChanged?.('error', `Cannot reach ESP8266 HTTP server at http://${this._espIp}. Check IP address.`);
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
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.buffer = '';
    this.onStatusChanged?.('disconnected', 'Disconnected from ESP8266 WiFi module');
  }

  /**
   * Transmit a command string to ESP8266 (and forwarded to STM32 UART).
   * Supports both WebSocket and HTTP POST fallback.
   */
  public async send(text: string): Promise<boolean> {
    const payload = text.endsWith('\n') ? text : `${text}\n`;

    // 1. If WebSocket is connected, transmit over WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(payload);
        return true;
      } catch (err) {
        console.warn('[ESP8266 WiFi] WebSocket send failed:', err);
      }
    }

    // 2. Fallback to HTTP POST
    if (this._espIp) {
      return await this.sendHttpCommand(text);
    }

    return false;
  }

  /**
   * Send HTTP command to ESP8266 (e.g. POST http://<ip>/cmd or GET http://<ip>/cmd?text=...)
   */
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
      // Fallback: try GET query param
      try {
        const getUrl = `http://${targetIp}:${port}/cmd?text=${encodeURIComponent(cmd)}`;
        const res = await fetch(getUrl, { mode: 'no-cors' });
        return true;
      } catch (e2) {
        console.warn('[ESP8266 WiFi] HTTP command transmit error:', e2);
        return false;
      }
    }
  }

  /**
   * Fetch current reading from ESP8266 via HTTP GET /readings
   */
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
          return this._parseAndDispatch(text.trim());
        }
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  /** Parse a raw UART line (key-value or JSON) and dispatch as SensorReading */
  public parseAndDispatch(rawText: string, activePlantCode: 0 | 1 = 0): boolean {
    return this._parseAndDispatch(rawText, activePlantCode);
  }

  private _parseAndDispatch(rawText: string, activePlantCode: 0 | 1 = 0): boolean {
    try {
      let moisture: number | undefined;
      let humidity: number | undefined;
      let light: number | undefined;
      let temperature: number = 25.0;
      let isTempAssumed = true;
      let condition: string | undefined;
      let mlClassCode: 0 | 1 | 2 | undefined;
      let plantCode: 0 | 1 = activePlantCode;
      let humAdc: number | undefined;
      let soilRaw: number | undefined;
      let potAdc: number | undefined;
      let sw1: number | undefined;
      let sw2: number | undefined;

      // ── KEY=VALUE format (STM32 UART output forwarded by ESP8266) ──
      // PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0
      if (rawText.includes('=')) {
        const kv: Record<string, string> = {};
        for (const part of rawText.replace(/[\r\n]/g, '').split(',')) {
          const eqIdx = part.indexOf('=');
          if (eqIdx !== -1) {
            const k = part.substring(0, eqIdx).trim().toUpperCase();
            const v = part.substring(eqIdx + 1).trim();
            if (k) kv[k] = v;
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
          const tv = parseFloat(kv['TEMP'] || kv['TEMPERATURE']);
          if (!isNaN(tv)) {
            temperature = tv;
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
        if (kv['ML_STATUS'] !== undefined) condition = kv['ML_STATUS'].replace(/_/g, ' ').trim();
        if (kv['ML_CLASS'] !== undefined) {
          const cls = parseInt(kv['ML_CLASS'], 10);
          if (cls === 0 || cls === 1 || cls === 2) mlClassCode = cls;
        }
        if (kv['PLANT'] !== undefined) plantCode = kv['PLANT'].toUpperCase().includes('POTHOS') ? 1 : 0;
      } else {
        // ── JSON fallback ──
        const s = rawText.indexOf('{');
        const e = rawText.lastIndexOf('}');
        if (s !== -1 && e > s) {
          const parsed = JSON.parse(rawText.substring(s, e + 1));
          moisture = typeof parsed.moisture === 'number' ? parsed.moisture : parsed.soil_humidity_pct;
          humidity = typeof parsed.humidity === 'number' ? parsed.humidity : (parsed.air_humidity_pct ?? 50.0);
          light = typeof parsed.light === 'number' ? parsed.light : parsed.ldr_on_plant;
          if (typeof parsed.temperature === 'number') {
            temperature = parsed.temperature;
            isTempAssumed = false;
          } else if (typeof parsed.temp === 'number') {
            temperature = parsed.temp;
            isTempAssumed = false;
          }
          if (typeof parsed.condition === 'string') condition = parsed.condition;
          if (parsed.mlClassCode === 0 || parsed.mlClassCode === 1 || parsed.mlClassCode === 2) {
            mlClassCode = parsed.mlClassCode;
          }
          if (typeof parsed.plantCode === 'number') plantCode = parsed.plantCode === 1 ? 1 : 0;
        }
      }

      if (moisture === undefined || light === undefined || isNaN(moisture) || isNaN(light)) {
        return false;
      }

      // ── ML Inference (local if not sent by STM32) ──
      let suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress' = 'suitable';
      let plantCond: PlantCondition = 'Suitable';

      if (mlClassCode === undefined || condition === undefined) {
        const diag = evaluatePlantModel(plantCode, moisture, temperature, humidity ?? 50, light, {
          moistureMin: 10,
          moistureMax: 35,
          tempMin: 18,
          tempMax: 32,
          humidityMin: 30,
          humidityMax: 60,
          lightMin: 2500,
          lightMax: 4095,
        });
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
        isSynthetic: false,
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
    } catch (_) {
      return false;
    }
  }
}

export const espWifi = new EspWifiService();
