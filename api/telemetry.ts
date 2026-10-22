import type { IncomingMessage, ServerResponse } from 'http';
import { Redis } from '@upstash/redis';

// Types for Vercel Serverless Function request/response
interface ExtendedRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
  body?: any;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ExtendedResponse extends ServerResponse {
  status: (code: number) => ExtendedResponse;
  json: (data: any) => void;
}

// In-memory fallback for local dev or before Upstash credentials are set in Vercel
let memoryLatest: any = null;
let memoryHistory: any[] = [];

// Initialize Upstash Redis client from Vercel KV or Upstash env vars
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      return new Redis({ url, token });
    } catch (err) {
      console.error('Failed to initialize Redis client:', err);
      return null;
    }
  }
  return null;
}

// Parse Key-Value format emitted by STM32 main.c:
// PLANT=ALOE_VERA,ML_CLASS=2,ML_STATUS=SUITABLE,TEMP_C_ASSUMED=25,SOIL_PCT=45,HUM_RH_EST=55,HUM_ADC=3200,SOIL_RAW=2100,LDR_ADC=2400,POT_ADC=1500,SW1=0,SW2=0
function parseKeyValueFormat(raw: string): any {
  if (typeof raw !== 'string' || !raw.includes('=')) return null;
  const kv: Record<string, string> = {};
  const parts = raw.replace(/[\r\n]/g, '').split(',');
  for (const part of parts) {
    if (part.includes('=')) {
      const [k, v] = part.split('=', 2);
      if (k && v !== undefined) {
        kv[k.trim().toUpperCase()] = v.trim();
      }
    }
  }

  const moisture = kv['SOIL_PCT'] ? parseFloat(kv['SOIL_PCT']) : undefined;
  const humidity = kv['HUM_RH_EST'] ? parseFloat(kv['HUM_RH_EST']) : undefined;
  const light = kv['LDR_ADC'] ? parseInt(kv['LDR_ADC'], 10) : undefined;
  const temp = kv['TEMP_C_ASSUMED'] ? parseFloat(kv['TEMP_C_ASSUMED']) : 25.0;

  if (moisture !== undefined && light !== undefined) {
    return {
      moisture,
      humidity: humidity ?? 50,
      light,
      temperature: temp,
      isTempAssumed: true,
      condition: kv['ML_STATUS'] ? kv['ML_STATUS'].replace(/_/g, ' ') : undefined,
      mlClassCode: kv['ML_CLASS'] ? parseInt(kv['ML_CLASS'], 10) : undefined,
      plant: kv['PLANT'],
      plantCode: kv['PLANT'] && kv['PLANT'].includes('POTHOS') ? 1 : 0,
      rawString: raw,
    };
  }
  return null;
}

// Helper to parse JSON or text body from request
async function getRequestBody(req: ExtendedRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      const parsedKv = parseKeyValueFormat(req.body);
      if (parsedKv) return parsedKv;
      return null;
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        const parsedKv = parseKeyValueFormat(raw);
        resolve(parsedKv || null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const redis = getRedisClient();

  // ==========================================
  // GET: Retrieve latest reading & history
  // ==========================================
  if (req.method === 'GET') {
    try {
      let latest = null;
      let historyList: any[] = [];

      if (redis) {
        const rawLatest = await redis.get('plant:latest');
        latest = typeof rawLatest === 'string' ? JSON.parse(rawLatest) : rawLatest;

        const rawHistory = await redis.lrange('plant:history', 0, 59);
        historyList = (rawHistory || []).map((item) =>
          typeof item === 'string' ? JSON.parse(item) : item
        );
      } else {
        latest = memoryLatest;
        historyList = memoryHistory.slice(-60).reverse();
      }

      const now = Date.now();
      const ageMs = latest?.timestamp ? now - latest.timestamp : null;
      // Stale if older than 45 seconds
      const isStale = ageMs !== null ? ageMs > 45000 : true;
      const isLive = !isStale && latest !== null;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          reading: latest,
          history: historyList,
          isLive,
          isStale,
          ageMs,
          redisConfigured: !!redis,
          serverTimestamp: now,
        })
      );
      return;
    } catch (err: any) {
      console.error('Error fetching telemetry:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Failed to retrieve telemetry' }));
      return;
    }
  }

  // ==========================================
  // POST: Ingest telemetry from Android bridge
  // ==========================================
  if (req.method === 'POST') {
    // 1. Authenticate using Bearer Token if configured
    const configuredToken = process.env.DEVICE_AUTH_TOKEN;
    if (configuredToken) {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      const providedToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : null;

      if (!providedToken || providedToken !== configuredToken) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Invalid or missing Bearer token in Authorization header.',
          })
        );
        return;
      }
    }

    // 2. Parse and Validate Payload
    const body = await getRequestBody(req);
    if (!body || typeof body !== 'object') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Bad Request: Expected JSON or Key-Value telemetry body from STM32.',
        })
      );
      return;
    }

    // Handle variable field names from STM32 main.c or JSON formats
    const moisture =
      typeof body.moisture === 'number'
        ? body.moisture
        : typeof body.SOIL_PCT === 'number'
        ? body.SOIL_PCT
        : typeof body.soil_percent === 'number'
        ? body.soil_percent
        : typeof body.soil_humidity_pct === 'number'
        ? body.soil_humidity_pct
        : typeof body.SOIL_PCT === 'string'
        ? parseFloat(body.SOIL_PCT)
        : undefined;

    const humidity =
      typeof body.humidity === 'number'
        ? body.humidity
        : typeof body.HUM_RH_EST === 'number'
        ? body.HUM_RH_EST
        : typeof body.rh === 'number'
        ? body.rh
        : typeof body.air_humidity_pct === 'number'
        ? body.air_humidity_pct
        : typeof body.HUM_RH_EST === 'string'
        ? parseFloat(body.HUM_RH_EST)
        : 50.0; // Default reasonable humidity if not sent

    const light =
      typeof body.light === 'number'
        ? body.light
        : typeof body.LDR_ADC === 'number'
        ? body.LDR_ADC
        : typeof body.ldr === 'number'
        ? body.ldr
        : typeof body.ldr_on_plant === 'number'
        ? body.ldr_on_plant
        : typeof body.LDR_ADC === 'string'
        ? parseInt(body.LDR_ADC, 10)
        : undefined;

    // Temperature: Hardware has no physical sensor; defaults to 25.0 C (assumed room temp from STM32)
    const rawTemp =
      typeof body.temperature === 'number'
        ? body.temperature
        : typeof body.TEMP_C_ASSUMED === 'number'
        ? body.TEMP_C_ASSUMED
        : typeof body.temp === 'number'
        ? body.temp
        : typeof body.TEMP_C_ASSUMED === 'string'
        ? parseFloat(body.TEMP_C_ASSUMED)
        : 25.0;

    const temperature = !isNaN(rawTemp) ? rawTemp : 25.0;
    const isTempAssumed = true; // Mark that temperature is an assumed environmental baseline

    if (moisture === undefined || light === undefined || isNaN(moisture) || isNaN(light)) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error:
            'Validation failed: soil moisture and light (LDR) are required readings.',
          received: body,
        })
      );
      return;
    }

    // Range checks
    if (moisture < 0 || moisture > 100) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Moisture must be between 0 and 100%.' }));
      return;
    }
    if (humidity < 0 || humidity > 100) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Humidity must be between 0 and 100%.' }));
      return;
    }
    if (light < 0 || light > 5000) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Light must be between 0 and 5000 ADC.' }));
      return;
    }

    // Determine ML condition and class
    let rawCondition =
      typeof body.condition === 'string'
        ? body.condition.trim()
        : typeof body.ML_STATUS === 'string'
        ? body.ML_STATUS.replace(/_/g, ' ').trim()
        : 'Suitable';

    let suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress' = 'suitable';
    let mlClassCode: 0 | 1 | 2 = 2;

    if (body.mlClassCode === 0 || body.ML_CLASS === 0 || body.ML_CLASS === '0') {
      suitabilityClass = 'high_stress';
      mlClassCode = 0;
      rawCondition = 'High Stress';
    } else if (body.mlClassCode === 1 || body.ML_CLASS === 1 || body.ML_CLASS === '1') {
      suitabilityClass = 'moderate_stress';
      mlClassCode = 1;
      rawCondition = 'Moderate Stress';
    } else if (body.mlClassCode === 2 || body.ML_CLASS === 2 || body.ML_CLASS === '2') {
      suitabilityClass = 'suitable';
      mlClassCode = 2;
      rawCondition = 'Suitable';
    } else {
      const lowerCond = rawCondition.toLowerCase();
      if (
        lowerCond.includes('high') ||
        lowerCond.includes('dry') ||
        lowerCond.includes('poor') ||
        lowerCond === 'critical'
      ) {
        suitabilityClass = 'high_stress';
        mlClassCode = 0;
        rawCondition = 'High Stress';
      } else if (
        lowerCond.includes('moderate') ||
        lowerCond.includes('water') ||
        lowerCond.includes('warning')
      ) {
        suitabilityClass = 'moderate_stress';
        mlClassCode = 1;
        rawCondition = 'Moderate Stress';
      } else {
        suitabilityClass = 'suitable';
        mlClassCode = 2;
        rawCondition = 'Suitable';
      }
    }

    // Plant species: 0 = Aloe Vera, 1 = Pothos
    let plantCode: 0 | 1 = 0;
    if (body.plantCode === 1 || body.PLANT === 'POTHOS' || body.PLANT === '1') {
      plantCode = 1;
    }

    const reading = {
      moisture: parseFloat(moisture.toFixed(1)),
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(1)),
      light: Math.round(light),
      condition: rawCondition,
      suitabilityClass,
      mlClassCode,
      timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.98,
      isSynthetic: false, // Authentic Hardware Measurement from STM32!
      plantCode,
      isTempAssumed, // Signals to UI that temperature is assumed baseline
    };

    // 3. Persist to Upstash Redis
    try {
      if (redis) {
        const payloadStr = JSON.stringify(reading);
        await redis.set('plant:latest', payloadStr);
        await redis.lpush('plant:history', payloadStr);
        await redis.ltrim('plant:history', 0, 199); // Keep latest 200 readings
      } else {
        memoryLatest = reading;
        memoryHistory.push(reading);
        if (memoryHistory.length > 200) memoryHistory.shift();
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          message: 'Telemetry ingested successfully from STM32.',
          reading,
          persistedToRedis: !!redis,
        })
      );
      return;
    } catch (err: any) {
      console.error('Error persisting to Redis:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Failed to persist reading to database.',
          details: err.message,
        })
      );
      return;
    }
  }

  // Method not allowed
  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: `Method ${req.method} Not Allowed` }));
}
