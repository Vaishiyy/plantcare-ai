# 🌱 PlantCare AI — AI-Based Plant Health Monitoring Mobile App

**PlantCare AI** is a modern, interactive, mobile-first companion application for an embedded AI-based plant health monitoring system. It works seamlessly with an **STM32 microcontroller** connected to environmental sensors (Soil Moisture ADC, LDR Light ADC, and DHT11 Temperature & Humidity) and an on-chip TinyML model that classifies plant vitality into four actionable states:
- **Healthy**
- **Needs Water**
- **Too Dry**
- **Poor Environment**

---

## 📱 Features & Seven Core Screens

1. **Home Dashboard**
   - Warm greeting (`"Hello, Plant Parent! 🌱"`), synchronization timestamp, and Bluetooth link badge.
   - Prominent plant-health hero card with dynamic vitality progress ring and condition verdict.
   - 4 tactile sensor cards (Soil Moisture %, Temperature °C/°F, Humidity %, Light lux) with real-time sparkline charts and species threshold status.
   - One-click viva evaluation test condition presets (`Healthy`, `Needs Water`, `Too Dry`, `Poor Env`).

2. **Plant Details**
   - Active specimen showcase (Monstera Deliciosa, Fiddle Leaf Fig, Snake Plant, Sweet Basil).
   - Real-time gauge bars comparing live sensor readings directly against species-specific environmental thresholds.
   - Rationale explanation of why the STM32 ML model classified the current state.
   - Strict distinction between raw physical measurements and model recommendations.
   - Interactive profile switcher and profile editor.

3. **Live Monitoring**
   - Real-time sensor stream with countdown synchronization pulse.
   - Live updating 20-sample trajectory line charts with interactive inspection.
   - Distinct **Offline** and **Stale Telemetry** safety banners (does not present cached readings as live).
   - Polling frequency controls (2s, 3s, 5s, 10s).
   - Manual `"Refresh Readings"` and `"Check Plant Health"` triggers.

4. **AI Health Analysis**
   - 4 ML output status cards with the active category highlighted.
   - Feature influence attribution (sensor impact breakdown: Moisture %, Temp %, Humidity %, Light %).
   - Actionable, conditional horticultural recommendations.
   - Honest diagnostic boundaries (explicitly disclaims viral/fungal pathogen diagnosis).
   - Full timeline log of previous inferences.

5. **History & Analytics**
   - Interactive multi-sensor graphs with dynamic time-range filters (**24 Hours**, **7 Days**, **30 Days**).
   - Safe species threshold band overlay.
   - Aggregate statistics (Daily Average, Period High, Period Low).
   - State transition timeline (e.g. Healthy → Needs Water → Healthy).
   - **CSV Data Export**: One-click download of timestamped sensor history for engineering evaluation reports.

6. **Alerts & Notification Center**
   - In-app notification center for low moisture, critical drought, temperature anomalies, and Bluetooth connection loss.
   - Intelligent deduplication: prevents repeated spam alerts for the same condition.
   - Configurable alert rules: toggle switches to enable or disable individual alerts.

7. **Settings & Device Connection**
   - **Dual-Mode Wireless Hardware Connect**:
     - **Web Bluetooth (BLE)** for HM-10, CC2541, ESP32 GATT peripherals.
     - **Web Serial** for HC-05 / HC-06 Bluetooth Classic and USB-to-UART COM bridges.
   - Clear loading, permission-denied, and reconnection states.
   - Configurable baud rates (9600, 115200).
   - **Demo Mode Switch**: Instant transition between live physical hardware and simulated data.
   - **Raw Telemetry Terminal**: Live hex/JSON packet inspector with manual packet injector for demonstration.

---

## 🛠️ Technology Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Nordic Botanical theme: Forest Green, Sage, Warm Cream, Amber, Terracotta)
- **Typography**: Albert Sans (Clean Scandinavian Grotesque) & JetBrains Mono
- **Icons**: Lucide React
- **Connectivity**: Web Bluetooth API (BLE GATT) & Web Serial API (UART/SPP)
- **Local Persistence**: `localStorage` (profiles, thresholds, alerts, settings, and telemetry history)

---

## 🚀 Setup & Run Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Google Chrome, Microsoft Edge, or Android Chrome (for Web Bluetooth & Web Serial capabilities)

### Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in Google Chrome or Edge.

### Building for Production
```bash
npm run build
```
The optimized static distribution will be generated in `dist/`.

---

## 📡 Bluetooth Telemetry Protocol

The STM32 microcontroller transmits formatted JSON ASCII packets over UART followed by a newline (`\r\n`):

```json
{
  "moisture": 42,
  "temperature": 30.0,
  "humidity": 48,
  "light": 750,
  "condition": "Needs Water"
}
```

### Field Definitions:
| Field | Type | Unit / Range | Description |
|---|---|---|---|
| `moisture` | integer | `0` – `100` (%) | Calibrated ADC soil moisture percentage |
| `temperature` | float | `°C` (e.g. `24.5`) | Ambient temperature from DHT11 |
| `humidity` | integer | `0` – `100` (%) | Relative humidity from DHT11 |
| `light` | integer | `0` – `2000` (lux / ADC) | Ambient light reading from LDR ADC |
| `condition` | string | Enum | Model classification: `"Healthy"`, `"Needs Water"`, `"Too Dry"`, `"Poor Environment"` |
| `confidence` | float | `0.0` – `1.0` *(optional)* | Prediction confidence score |

---

## 🔌 Connecting to the STM32 Device

See [HARDWARE_GUIDE.md](HARDWARE_GUIDE.md) for complete circuit wiring schematics, pinouts, and firmware templates.

### Quick Connect Steps:
1. **Power up the STM32 circuit**: Ensure the Bluetooth module LED is blinking (pairing mode).
2. **For Bluetooth Classic (HC-05 / HC-06)**:
   - Pair the HC-05 with your laptop/computer in OS Bluetooth settings (default PIN: `1234` or `0000`).
   - In PlantCare AI, navigate to **Settings** → click **"Connect Serial"** → select the Outgoing Bluetooth COM Port or USB-UART COM port at **9600** baud.
3. **For Bluetooth Low Energy (HM-10 / ESP32)**:
   - In PlantCare AI, navigate to **Settings** → click **"Connect BLE"** → select your device (e.g. `PlantCare-BLE` or `HMSoft`) from the browser popup.
4. The status pill will turn **Emerald Green ("Connected")**, and live sensor readings will begin streaming immediately into all dashboard graphs!
