import { PlantCondition, SensorReading } from '../../types';
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

  public async autoConnect(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports && ports.length > 0) {
        this.port = ports[0];
        await this.port.open({ baudRate });
        this.onStatusChanged?.('connected', `Connected via Serial (Baud: ${baudRate})`);
        this.startReading();
        return true;
      }
    } catch (e) {
      console.warn('Auto-reconnect failed:', e);
    }
    return false;
  }

  private async startReading(): Promise<void> {
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
          this.processChunk(chunk);
        }
      }
    } catch (error: any) {
      if (this.isReading) {
        console.warn('Serial read loop error:', error);
        this.onStatusChanged?.('error', error.message || 'Serial read error occurred.');
      }
    } finally {
      try {
        this.reader?.releaseLock();
      } catch (e) {}
      this.reader = null;
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
        // 2. Try JSON format: {"moisture": 45, "humidity": 55, "light": 2400}
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

      // If condition or mlClassCode not provided by hardware, evaluate via local ML model
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
        isSynthetic: false, // Authentic Hardware Measurement!
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

  public async disconnect(): Promise<void> {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {}
      try {
        this.reader.releaseLock();
      } catch (e) {}
      this.reader = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        console.warn('Port close exception:', e);
      }
      this.port = null;
    }
    this.buffer = '';
    this.onStatusChanged?.('disconnected', 'Serial port disconnected');
  }

  public isConnected(): boolean {
    return !!this.port;
  }
}

export const webSerial = new WebSerialManager();
