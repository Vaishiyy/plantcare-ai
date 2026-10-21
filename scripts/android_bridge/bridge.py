#!/usr/bin/env python3
"""
PlantCare AI — Android HC-05 to Vercel HTTPS Bridge
-----------------------------------------------------
Connects to an HC-05 Bluetooth Classic module via RFCOMM,
reads incoming sensor telemetry JSON lines emitted by the STM32,
and forwards them over HTTPS to your Vercel deployment:
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

# Secret Device Token configured in Vercel Environment Variables
# If you haven't set DEVICE_AUTH_TOKEN in Vercel yet, leave empty or set your chosen key:
DEVICE_AUTH_TOKEN = "sk_live_plantcare_blackpill_f401"

# Bluetooth RFCOMM Device or Port
# In Termux with paired HC-05, or via pyserial on /dev/rfcomm0:
BLUETOOTH_PORT = "/dev/rfcomm0"
BAUD_RATE = 9600

# Set to True to test with synthetic readings if hardware is temporarily powered off
SIMULATION_MODE = False

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
            print(f"[CLOUD OK] Synced to Vercel -> Moisture: {data.get('moisture')}% | Temp: {data.get('temperature')}°C | Status: {data.get('condition')}")
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
        print("[!] Switching to interactive stdin bridge mode (paste serial lines below):")
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
                    
                    # Look for JSON payload in the incoming line
                    start = raw_line.find('{')
                    end = raw_line.rfind('}')
                    if start != -1 and end != -1 and end > start:
                        json_str = raw_line[start:end+1]
                        try:
                            payload = json.loads(json_str)
                            send_telemetry_to_cloud(payload)
                        except json.JSONDecodeError as err:
                            print(f"[!] JSON parse error: {err}")
        except Exception as e:
            print(f"[!] Bluetooth connection lost: {e}. Retrying in 3 seconds...")
            time.sleep(3)

def run_stdin_bridge():
    """Fallback: reads incoming serial lines from standard input or Bluetooth terminal paste."""
    print("[*] Paste raw JSON lines from your Android Bluetooth terminal (or press Ctrl+C to exit):")
    while True:
        try:
            line = input().strip()
            if not line:
                continue
            start = line.find('{')
            end = line.rfind('}')
            if start != -1 and end != -1 and end > start:
                payload = json.loads(line[start:end+1])
                send_telemetry_to_cloud(payload)
            else:
                print("[!] No JSON found in input line.")
        except KeyboardInterrupt:
            print("\nExiting bridge.")
            break
        except Exception as err:
            print(f"[!] Error: {err}")

def run_simulation():
    """Simulates realistic STM32 sensor readings for pipeline testing."""
    import random
    print("[*] Running in Simulation Mode (Testing Cloud Pipeline)...")
    while True:
        moisture = round(random.uniform(25.0, 55.0), 1)
        temp = round(random.uniform(22.0, 30.0), 1)
        hum = round(random.uniform(45.0, 65.0), 1)
        light = random.randint(1800, 3200)
        
        condition = "Suitable" if moisture > 30 else "Moderate Stress"
        
        payload = {
            "moisture": moisture,
            "temperature": temp,
            "humidity": hum,
            "light": light,
            "condition": condition,
            "plantCode": 0
        }
        send_telemetry_to_cloud(payload)
        time.sleep(3)

if __name__ == "__main__":
    print("==================================================")
    print("   PlantCare AI — Android HC-05 Bridge Daemon     ")
    print("==================================================")
    if SIMULATION_MODE or "--simulate" in sys.argv:
        run_simulation()
    else:
        run_serial_bridge()
