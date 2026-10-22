# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React 18 + Vite + Tailwind CSS + Lucide Icons + Web Bluetooth & Web Serial API

## Users
College embedded systems evaluators, engineering professors, students, and plant care hobbyists seeking an elegant, reliable mobile companion app for microcontroller-monitored houseplants.

## Product Purpose
PlantCare AI transforms raw telemetry from an STM32 microcontroller (measuring soil moisture via ADC, ambient light via LDR ADC, and temperature/humidity via DHT11) and an on-chip lightweight ML condition classifier into an intuitive, visually stunning plant health monitoring app.

## Positioning
Unlike generic industrial IoT dashboards or raw serial monitors, PlantCare AI delivers a warm, nature-inspired, consumer-grade mobile experience that honors real embedded telemetry while providing immediate educational, diagnostic, and demonstration value.

## Operating Context
Used in university engineering laboratories, live project demonstrations, and domestic plant monitoring. The STM32 sends formatted telemetry over UART to an ESP8266 WiFi module (which forwards live packets over WebSocket/HTTP). The app connects seamlessly via ESP8266 WiFi WebSocket or direct USB Serial.

## Capabilities and Constraints
- 7 core screens: Home Dashboard, Plant Details, Live Monitoring, AI Health Analysis, History & Analytics, Alerts & Notifications, Settings & Device Connection.
- Sensor Telemetry: Soil moisture (%), Temperature (°C), Humidity (%), Light intensity (lux/ADC).
- 4 ML Condition Classes: Healthy, Needs Water, Too Dry, Poor Environment.
- Hardware Integration: ESP8266 WiFi module (WebSocket ws://IP:81 & HTTP REST), Web Serial (USB-UART), and Cloud Bridge ingestion parser with robust format validation, checksum/frame recovery, and live connection state management.
- Local persistence (localStorage) for user settings, custom thresholds, plant profiles, alert logs, and history data.
- Offline and Stale Data handling with distinct visual indicators; no fabricated live connections.
- CSV sensor data export for lab reports and project evaluations.
- Multi-plant species presets (Monstera Deliciosa, Fiddle Leaf Fig, Snake Plant, Sweet Basil) with configurable threshold ranges.

## Brand Commitments
- Name: PlantCare AI
- Visual Vibe: Nature-inspired, warm organic living tones (forest green primary, soft sage, warm cream background, muted golden yellow, gentle coral).
- Emotional register: Encouraging, clear, trustworthy, grounded in physical plant needs without false diagnostic claims.

## Evidence on Hand
- STM32 sensor hardware architecture: ADC for Soil Moisture and LDR, GPIO for DHT11, UART for WiFi module (ESP8266), I2C for 0.96" OLED.
- Telemetry format: `{"moisture": 42, "temperature": 30.0, "humidity": 48, "light": 750, "condition": "Needs Water"}`.
- ML classification output vocabulary: Healthy, Needs Water, Too Dry, Poor Environment.

## Product Principles
1. Honest Hardware Representation: Stale or offline telemetry is clearly labeled; demo simulation is never disguised as live hardware.
2. Plant-First Humanity: Visuals feel like nurturing a living being, avoiding sterile industrial control panel aesthetics.
3. Diagnostic Clarity: Distinguish measured sensor facts from ML predictions and action recommendations.
4. Frictionless Demonstration: Instant switching between live serial/Bluetooth stream and preset demonstration scenarios for viva/evaluation.

## Accessibility & Inclusion
- High contrast status colors for critical alerts (accessible green, amber, orange, coral).
- Legible typography with scalable rem/px units.
- Fully touch-friendly interactive targets (>= 44x44px touch targets) on mobile viewports.
