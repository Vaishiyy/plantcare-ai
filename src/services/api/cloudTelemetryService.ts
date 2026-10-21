import { SensorReading } from '../../types';

export interface CloudTelemetryResponse {
  success: boolean;
  reading: SensorReading | null;
  history: SensorReading[];
  isLive: boolean;
  isStale: boolean;
  ageMs: number | null;
  redisConfigured: boolean;
  serverTimestamp: number;
}

export class CloudTelemetryService {
  private endpoint = '/api/telemetry';

  /**
   * Fetches the latest live reading and recent history from the Vercel API.
   */
  public async getLatest(): Promise<CloudTelemetryResponse | null> {
    try {
      const res = await fetch(this.endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data: CloudTelemetryResponse = await res.json();
      return data;
    } catch (err) {
      console.warn('Failed to fetch telemetry from cloud:', err);
      return null;
    }
  }

  /**
   * Posts a sample or test packet to /api/telemetry to test the ingestion pipeline.
   */
  public async sendTestPacket(
    reading: Partial<SensorReading>,
    authToken?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(reading),
      });

      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || `HTTP ${res.status}` };
      }
      return { success: true, message: json.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network request failed' };
    }
  }
}

export const cloudTelemetry = new CloudTelemetryService();
