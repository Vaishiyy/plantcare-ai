# 📱 PlantCare AI — Android HC-05 Cloud Bridge Setup Guide

This guide explains how to connect your **STM32F401 Black Pill** + **HC-05 Bluetooth Classic** module to your deployed Vercel dashboard (`https://plantcare-ai-mocha.vercel.app/`) using your Android phone.

---

## 1. How It Works

```text
[STM32F401 Black Pill]
       │  (UART 9600 baud)
       ▼
    [HC-05]
       │  (Bluetooth Classic SPP / RFCOMM)
       ▼
 [Android Phone]
       │  (HTTPS POST with Bearer Token)
       ▼
[Vercel Serverless API /api/telemetry]
       │
       ▼
 [Upstash Redis / Vercel KV]
       │
       ▼
[PlantCare AI Dashboard]
```

---

## 2. Upstash Redis & Environment Setup (Vercel)

### Step 1: Create Free Upstash Redis Database
1. Go to [https://console.upstash.com/](https://console.upstash.com/) (or via Vercel Marketplace under **Storage > Create Database > KV**).
2. Create a new Redis database (e.g. `plantcare-redis`).
3. Under **REST API Details**, copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2: Configure Vercel Environment Variables
1. Open your Vercel project settings at [vercel.com](https://vercel.com).
2. Go to **Settings > Environment Variables**.
3. Add the following:
   - `UPSTASH_REDIS_REST_URL`: *(Your Upstash REST URL)*
   - `UPSTASH_REDIS_REST_TOKEN`: *(Your Upstash REST Token)*
   - `DEVICE_AUTH_TOKEN`: `sk_live_plantcare_blackpill_f401` *(Or any secret token you choose)*
4. Click **Save** and trigger a redeployment.

---

## 3. Bridge Method A: Termux on Android (Automated Daemon)

This method runs a background bridge script directly on your Android phone.

### Step 1: Install Termux
Install **Termux** from F-Droid ([https://f-droid.org/packages/com.termux/](https://f-droid.org/packages/com.termux/)).

### Step 2: Setup Python & Dependencies
Open Termux and run:
```bash
pkg update && pkg install python
pip install requests pyserial
```

### Step 3: Pair HC-05
1. On your phone, go to **Settings > Bluetooth**.
2. Pair with **HC-05** (Default PIN is usually `1234` or `0000`).

### Step 4: Run the Bridge
Copy `bridge.py` to your phone, or run:
```bash
python bridge.py
```
To test immediately with simulation mode:
```bash
python bridge.py --simulate
```

---

## 4. Bridge Method B: "Serial Bluetooth Terminal" + Automation App (No-Code)

If you prefer using GUI apps on your phone:

> [!NOTE]
> **Hardware Sensor Configuration**: Your hardware includes the **Analog Soil Probe** (`SOIL_PCT`), **Analog Humidity HR202 sensor** (`HUM_RH_EST`), and **Analog Light LDR** (`LDR_ADC`). Because the hardware does not have a physical temperature sensor, temperature is calibrated to an assumed room temperature baseline (25°C), matching line 536 of your STM32 `main.c` firmware (`TEMP_C_ASSUMED=25`).

1. **Serial Bluetooth Terminal** (by Kai Morich on Google Play):
   - Connect to paired `HC-05`.
   - Verify live telemetry lines are arriving from your STM32:
     `PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0`
2. **HTTP Shortcuts** (by Bruno Bierbaumer on Google Play) or **MacroDroid**:
   - Create a webhook shortcut:
     - **URL**: `https://plantcare-ai-mocha.vercel.app/api/telemetry`
     - **Method**: `POST`
     - **Header**: `Authorization: Bearer sk_live_plantcare_blackpill_f401` (if token set, otherwise omit)
     - **Header**: `Content-Type: text/plain`
     - **Body**: The received serial line

---

## 5. Testing the Integration

### Test 1: Ingestion Ping from Dashboard
1. Open `https://plantcare-ai-mocha.vercel.app/`.
2. Go to **Settings > Hardware & Wireless Link**.
3. Under **Cloud Bridge (HC-05 + Android)**, click **Test Ingestion**.
4. The dashboard will send a verified test packet to `/api/telemetry` and immediately show live updates on the hero cards.

### Test 2: cURL Command
You can test the endpoint from any terminal:
```bash
curl -X POST https://plantcare-ai-mocha.vercel.app/api/telemetry \
  -H "Content-Type: text/plain" \
  -H "Authorization: Bearer sk_live_plantcare_blackpill_f401" \
  -d "PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0"
```

### Test 3: Verification
Check `GET https://plantcare-ai-mocha.vercel.app/api/telemetry` in your browser. It should return:
```json
{
  "success": true,
  "reading": {
    "moisture": 45.2,
    "temperature": 26.8,
    "humidity": 58,
    "light": 2400,
    "condition": "Suitable",
    "mlClassCode": 2,
    "isSynthetic": false
  },
  "isLive": true,
  "isStale": false
}
```
And the PlantCare AI dashboard will display **Connected: STM32 via Android Bridge** with green glowing indicators!
