#!/usr/bin/env python3
"""
PlantCare AI — Android HC-05 to Vercel HTTPS Bridge
-----------------------------------------------------
Connects to an HC-05 Bluetooth Classic module via RFCOMM,
reads incoming sensor telemetry emitted by the STM32F401,
and forwards it over HTTPS to your Vercel deployment:
https://plantcare-ai-mocha.vercel.app/api/telemetry
"""

import time
import json
import sys

try:
    import requests
except ImportError:
    print("Please install requests: pip install requests")
    sys.exit(1)

# ==========================================
# CONFIGURATION
# ==========================================
# Your Vercel API endpoint
VERCEL_API_URL = "https://plantcare-ai-mocha.vercel.app/api/telemetry"

# Secret Device Token (matches DEVICE_AUTH_TOKEN in Vercel if set)
# Leave empty if you haven't set DEVICE_AUTH_TOKEN in Vercel environment variables yet.
DEVICE_AUTH_TOKEN = ""

# Bluetooth RFCOMM Device or Port in Termux (/dev/rfcomm0)
BLUETOOTH_PORT = "/dev/rfcomm0"
BAUD_RATE = 9600

def parse_telemetry_line(raw_line):
    """
    Parses incoming lines from STM32:
    Supports:
    1. Key-Value format from main.c:
       PLANT=ALOE_VERA,ML_CLASS=2,ML_STATUS=SUITABLE,TEMP_C_ASSUMED=25,SOIL_PCT=45,HUM_RH_EST=55,HUM_ADC=3200,SOIL_RAW=2100,LDR_ADC=2400,POT_ADC=1500,SW1=0,SW2=0
    2. Standard JSON:
       {"moisture": 45, "humidity": 55, "light": 2400, "condition": "Suitable"}
    """
    raw_line = raw_line.strip()
    if not raw_line:
        return None

    # Check for standard JSON
    start = raw_line.find('{')
    end = raw_line.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw_line[start:end+1])
        except Exception:
            pass

    # Check for Key-Value format (from STM32 main.c)
    if '=' in raw_line:
        kv = {}
        for part in raw_line.split(','):
            if '=' in part:
                k, v = part.split('=', 1)
                kv[k.strip().upper()] = v.strip()

        payload = {}

        # Soil moisture percentage
        if 'SOIL_PCT' in kv:
            payload['moisture'] = float(kv['SOIL_PCT'])
        elif 'MOISTURE' in kv:
            payload['moisture'] = float(kv['MOISTURE'])

        # Relative humidity (HR202 sensor)
        if 'HUM_RH_EST' in kv:
            payload['humidity'] = float(kv['HUM_RH_EST'])
        elif 'HUMIDITY' in kv:
            payload['humidity'] = float(kv['HUMIDITY'])

        # Light level (LDR ADC)
        if 'LDR_ADC' in kv:
            payload['light'] = int(kv['LDR_ADC'])
        elif 'LIGHT' in kv:
            payload['light'] = int(kv['LIGHT'])

        # Temperature: Hardware has no temperature sensor; uses 25C assumed baseline
        if 'TEMP_C_ASSUMED' in kv:
            payload['temperature'] = float(kv['TEMP_C_ASSUMED'])
            payload['isTempAssumed'] = True
        elif 'TEMPERATURE' in kv:
            payload['temperature'] = float(kv['TEMPERATURE'])
        else:
            payload['temperature'] = 25.0
            payload['isTempAssumed'] = True

        # ML Condition prediction from STM32 Decision Tree
        if 'ML_STATUS' in kv:
            status = kv['ML_STATUS'].replace('_', ' ').title()
            payload['condition'] = status
        elif 'CONDITION' in kv:
            payload['condition'] = kv['CONDITION']

        # ML Class code (0 = High Stress, 1 = Moderate Stress, 2 = Suitable)
        if 'ML_CLASS' in kv:
            try:
                payload['mlClassCode'] = int(kv['ML_CLASS'])
            except ValueError:
                pass

        # Monitored Plant (SW2 toggle on Black Pill)
        if 'PLANT' in kv:
            plant_str = kv['PLANT'].upper()
            payload['plantCode'] = 0 if 'ALOE' in plant_str else 1
            payload['plant'] = 'Aloe Vera' if 'ALOE' in plant_str else 'Golden Pothos'

        if 'moisture' in payload and 'light' in payload:
            return payload

    return None

def send_telemetry_to_cloud(data):
    """Sends sensor telemetry JSON payload to Vercel API."""
    headers = {
        "Content-Type": "application/json"
    }
    if DEVICE_AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {DEVICE_AUTH_TOKEN}"

    try:
        response = requests.post(VERCEL_API_URL, json=data, headers=headers, timeout=5)
        if response.status_code == 200:
            print(f"[CLOUD OK] Synced to Vercel -> Plant: {data.get('plant', 'Active')} | Moisture: {data.get('moisture')}% | Light: {data.get('light')} | Prediction: {data.get('condition')}")
            return True
        else:
            print(f"[CLOUD ERR] HTTP {response.status_code}: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"[CLOUD FAIL] Network request error: {e}")
        return False

def run_serial_bridge():
    """Connects to HC-05 via Serial RFCOMM."""
    try:
        import serial
    except ImportError:
        print("[!] PySerial not found. Install via: pip install pyserial")
        print("[!] Starting interactive terminal mode (paste lines from Bluetooth terminal):")
        run_stdin_bridge()
        return

    print(f"[*] Opening Bluetooth RFCOMM port {BLUETOOTH_PORT} at {BAUD_RATE} baud...")
    while True:
        try:
            with serial.Serial(BLUETOOTH_PORT, BAUD_RATE, timeout=2) as ser:
                print(f"[✓] Connected to HC-05 on {BLUETOOTH_PORT}! Listening for STM32 telemetry...")
                while True:
                    raw_line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if not raw_line:
                        continue

                    print(f"[HC-05 RAW] {raw_line}")
                    payload = parse_telemetry_line(raw_line)
                    if payload:
                        send_telemetry_to_cloud(payload)
                    else:
                        print(f"[!] Ignored non-telemetry line: {raw_line[:40]}...")
        except Exception as e:
            print(f"[!] Bluetooth connection lost: {e}. Retrying in 3 seconds...")
            time.sleep(3)

def run_stdin_bridge():
    """Reads lines pasted or piped from standard input."""
    print("[*] Paste lines directly from your Android Bluetooth terminal (or press Ctrl+C to exit):")
    while True:
        try:
            line = input().strip()
            if not line:
                continue
            payload = parse_telemetry_line(line)
            if payload:
                send_telemetry_to_cloud(payload)
            else:
                print("[!] Could not parse line. Ensure it contains SOIL_PCT or JSON.")
        except KeyboardInterrupt:
            print("\nExiting bridge.")
            break
        except Exception as err:
            print(f"[!] Error: {err}")

def run_simulation():
    """Simulates realistic STM32 sensor readings matching main.c format."""
    import random
    print("[*] Running in Simulation Mode (Testing Cloud Pipeline)...")
    while True:
        soil = round(random.uniform(25.0, 55.0), 1)
        hum = round(random.uniform(45.0, 65.0), 1)
        light = random.randint(1800, 3200)
        cond = "Suitable" if soil > 30 else "Moderate Stress"
        ml_code = 2 if soil > 30 else 1

        payload = {
            "moisture": soil,
            "humidity": hum,
            "light": light,
            "temperature": 25.0,
            "isTempAssumed": True,
            "condition": cond,
            "mlClassCode": ml_code,
            "plantCode": 0,
            "plant": "Aloe Vera"
        }
        send_telemetry_to_cloud(payload)
        time.sleep(3)

if __name__ == "__main__":
    print("==================================================")
    print("   PlantCare AI — Android HC-05 Bridge Daemon     ")
    print("==================================================")
    if "--simulate" in sys.argv:
        run_simulation()
    elif "--stdin" in sys.argv:
        run_stdin_bridge()
    else:
        run_serial_bridge()
