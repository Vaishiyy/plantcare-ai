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

// Helper to parse JSON body if not pre-parsed by runtime
async function getRequestBody(req: ExtendedRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
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
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
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
    // 1. Authenticate using Bearer Token
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
          error: 'Bad Request: Expected JSON body with telemetry fields.',
        })
      );
      return;
    }

    // Handle variable field names from various firmware formats
    const moisture =
      typeof body.moisture === 'number' ? body.moisture : body.soil_humidity_pct;
    const temperature =
      typeof body.temperature === 'number' ? body.temperature : body.temperature_c;
    const humidity =
      typeof body.humidity === 'number' ? body.humidity : body.air_humidity_pct;
    const light =
      typeof body.light === 'number' ? body.light : body.ldr_on_plant;

    if (
      typeof moisture !== 'number' ||
      typeof temperature !== 'number' ||
      typeof humidity !== 'number' ||
      typeof light !== 'number'
    ) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error:
            'Validation failed: moisture, temperature, humidity, and light must be numeric values.',
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
    if (temperature < -30 || temperature > 80) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Temperature must be between -30 and 80°C.' }));
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
    let rawCondition = typeof body.condition === 'string' ? body.condition.trim() : 'Suitable';
    let suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress' = 'suitable';
    let mlClassCode: 0 | 1 | 2 = 2;

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
      isSynthetic: false, // Authentic Hardware Measurement!
      plantCode: body.plantCode === 1 ? 1 : 0,
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
          message: 'Telemetry ingested successfully.',
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
