# 🌱 PlantCare AI — AI-Based Plant Health Monitoring Mobile App

**PlantCare AI** is a modern, mobile-first companion application for an STM32-based embedded AI plant health monitoring system. It is powered directly by your **trained on-chip Machine Learning model** (`plant_suitability_model.c` and `plant_suitability_model.h`) and your physical **4,500-sample training dataset** (`plant_suitability_dataset.csv`).

---

## 🔬 Core Embedded Machine Learning Model

The app executes the exact **C Decision Tree** trained for the microcontroller:

```c
int predict_plant_suitability(const float features[5]);
```

### Input Feature Vector (5 Features):
- **`features[0]`**: Plant Type (`0` = **Aloe Vera**, `1` = **Golden Pothos**)
- **`features[1]`**: Soil Moisture Percentage (`soil_humidity_pct`, `0.0` – `100.0%`)
- **`features[2]`**: Temperature in Celsius (`temperature_c`, `10.0` – `40.0°C`)
- **`features[3]`**: Air Humidity Percentage (`air_humidity_pct`, `20.0` – `90.0%`)
- **`features[4]`**: LDR Ambient Light Sensor ADC reading (`ldr_on_plant`, `0` – `4095`)

### Model Output Classes:
| Class Code | Model Class | Status Meaning | Actions & Microclimate Assessment |
|---|---|---|---|
| **`2`** | **Suitable** | Optimal | Ideal balance of soil moisture, ambient temperature, humidity, and light. |
| **`1`** | **Moderate Stress** | Warning | Sub-optimal parameter detected (e.g. Aloe moisture > 35% or Pothos moisture < 35%). |
| **`0`** | **High Stress** | Critical | Severe physiological stress (drought, waterlogging root rot, cold chill < 14°C, or scorching). |

*Validated against all 4,500 dataset rows with **97.56% validation accuracy**.*

---

## 📱 Features & Seven Core Screens

1. **Home Dashboard**
   - Active specimen selector (**Aloe Vera** / **Golden Pothos**).
   - Real-time decision tree classification verdict (`Suitable`, `Moderate Stress`, `High Stress`) with vitality ring.
   - 4 sensor cards (Soil Moisture %, Temperature °C/°F, Air Humidity %, LDR ADC 0-4095) with live sparklines.
   - Quick one-click **Dataset Scenarios**: trigger `Suitable (2)`, `Moderate (1)`, `High Stress (0)`, or stream records sequentially from the training dataset.

2. **Plant Details**
   - Empirical suitability threshold envelopes derived from the real dataset.
   - Decision Tree rationale explaining which feature branch caused the current classification.
   - Distinction between raw physical sensor measurements and ML model recommendations.

3. **Live Monitoring**
   - Real-time sensor stream with synchronization heartbeat.
   - Rolling 20-sample trajectory charts.
   - Clear **Offline** and **Stale Telemetry** safety indicators.
   - Step Next Record manual trigger to browse through training rows.

4. **AI Health Analysis & Dataset Verifier**
   - 3 Decision Tree output classes with active class highlighting and feature influence weights.
   - **Interactive Dataset Explorer**: Browse the 4,500 training dataset records, search by reading, verify the ML prediction against the true ground label, and click any row to load it live.

5. **History & Analytics**
   - Multi-sensor graphs across **24 Hours**, **7 Days**, **30 Days**.
   - Period summary metrics (Average, Min, Max for Soil, Temp, Humidity, and LDR).
   - **CSV Export**: Exports sensor history formatted with all dataset fields (`plant_type`, `soil_humidity_pct`, `temperature_c`, `air_humidity_pct`, `ldr_on_plant`, `suitability_class`).

6. **Alerts & Notification Center**
   - Dispatches warnings upon `Moderate Stress` or `High Stress` classification.
   - Intelligent deduplication: avoids repeating notifications for unchanged conditions.

7. **Settings & Hardware Link**
   - **Dual-Mode Wireless Link**: ESP8266 WiFi Direct Stream (WebSocket ws://IP:81 & HTTP) & Web Serial (USB-UART).
   - **Dataset Simulation Mode**: Switch between live STM32 hardware and physical dataset streaming.
   - **Raw Telemetry Terminal**: Inspect incoming UART packets or inject manual test payloads.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Google Chrome**, **Microsoft Edge**, or **Android Chrome**.

---

## ☁️ Deployment (Vercel)

The app is fully configured for zero-configuration Vercel deployment with SSL/HTTPS:

```bash
npx vercel
```
