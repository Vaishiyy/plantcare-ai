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
    Format:
    PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0
    """
    raw_line = raw_line.strip()
    if not raw_line:
        return None

    # 1. Primary: Key-Value format (from STM32 main.c)
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

        # Temperature: Hardware uses assumed room temp baseline (25C)
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

        # Hardware ADC and Switch values
        if 'HUM_ADC' in kv:
            try:
                payload['humAdc'] = int(kv['HUM_ADC'])
            except ValueError:
                pass
        if 'SOIL_RAW' in kv:
            try:
                payload['soilRaw'] = int(kv['SOIL_RAW'])
            except ValueError:
                pass
        if 'POT_ADC' in kv:
            try:
                payload['potAdc'] = int(kv['POT_ADC'])
            except ValueError:
                pass
        if 'SW1' in kv:
            try:
                payload['sw1'] = int(kv['SW1'])
            except ValueError:
                pass
        if 'SW2' in kv:
            try:
                payload['sw2'] = int(kv['SW2'])
            except ValueError:
                pass

        payload['rawString'] = raw_line

        if 'moisture' in payload and 'light' in payload:
            return payload

    # 2. Fallback: JSON format
    start = raw_line.find('{')
    end = raw_line.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw_line[start:end+1])
        except Exception:
            pass

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

def run_serial_bridge(target_port=None):
    """Connects to HC-05 via Serial RFCOMM or Windows COM port."""
    try:
        import serial
        import serial.tools.list_ports
    except ImportError:
        print("[!] PySerial not found. Install via: pip install pyserial")
        print("[!] Starting interactive terminal mode (paste lines from Bluetooth terminal):")
        run_stdin_bridge()
        return

    port = target_port or BLUETOOTH_PORT

    # Auto-detection on Windows if default Linux path is still set
    if (not target_port or target_port == "/dev/rfcomm0") and sys.platform.startswith("win"):
        ports = list(serial.tools.list_ports.comports())
        if ports:
            print("[*] Available serial ports on this machine:")
            bt_ports = []
            for p in ports:
                print(f"    - {p.device}: {p.description}")
                if "bluetooth" in p.description.lower() or "bt" in p.description.lower() or "standard" in p.description.lower():
                    bt_ports.append(p.device)
            if bt_ports:
                port = bt_ports[0]
                print(f"[*] Auto-selected Bluetooth Serial Port: {port}")
            else:
                port = ports[0].device
                print(f"[*] Selected Serial Port: {port}")
        else:
            print("[!] No COM ports detected. Please pair HC-05 in Windows Bluetooth settings or provide COM port.")
            print("[!] Falling back to interactive terminal mode:")
            run_stdin_bridge()
            return

    print(f"[*] Opening serial port {port} at {BAUD_RATE} baud...")
    while True:
        try:
            with serial.Serial(port, BAUD_RATE, timeout=2) as ser:
                print(f"[✓] Connected to HC-05 on {port}! Listening for STM32 telemetry...")
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
            print(f"[!] Serial connection lost: {e}. Retrying in 3 seconds (or pass port as argument, e.g. COM4)...")
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
    print("   PlantCare AI — HC-05 to Vercel Bridge Daemon   ")
    print("==================================================")
    if "--simulate" in sys.argv:
        run_simulation()
    elif "--stdin" in sys.argv:
        run_stdin_bridge()
    else:
        # Check if user passed a custom port, e.g. python bridge.py COM4
        custom_port = None
        for arg in sys.argv[1:]:
            if not arg.startswith("--"):
                custom_port = arg
                break
        run_serial_bridge(custom_port)
