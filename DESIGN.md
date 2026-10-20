---
name: PlantCare AI
description: Nordic Botanical Living Room Companion for STM32 Embedded Plant Health Telemetry
colors:
  primary: "#1B4332"
  primary-container: "#2D6A4F"
  secondary: "#52B788"
  secondary-container: "#D8F3DC"
  neutral-bg: "#F9F8F5"
  neutral-surface: "#FFFFFF"
  neutral-container: "#F3EFE6"
  warning-amber: "#E9C46A"
  critical-orange: "#EA580C"
  alarm-coral: "#E76F51"
  sensor-blue: "#2563EB"
  sensor-amber: "#D97706"
  sensor-teal: "#0D9488"
  sensor-yellow: "#CA8A04"
  neutral-border: "#DDD5C4"
  secondary-light: "#B7E4C7"
typography:
  display:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "JetBrains Mono, SFMono-Regular, monospace"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
---

# Design System: PlantCare AI

## Overview
PlantCare AI is designed as a calm, Nordic-inspired botanical companion that bridges authentic STM32 embedded microcontroller telemetry with consumer plant-care elegance. It trades cold industrial dashboards for warm earthenware neutrals, deep forest greens, and lucid microclimate data visualization.

## Colors
- **Primary Evergreen (`#1B4332`, `#2D6A4F`)**: Grounded botanical tones used for headers, active buttons, key indicators, and hero progress rings.
- **Sage Green (`#52B788`, `#D8F3DC`)**: Secondary botanical accent for healthy status cards, badges, and positive condition indicators.
- **Porcelain Cream (`#F9F8F5`, `#F3EFE6`)**: Natural background ground that avoids clinical digital white, providing an organic, tactile paper feel.
- **Sun-Warmed Amber (`#E9C46A`, `#D97706`)**: Status alert tone for "Needs Water" and elevated temperature thresholds.
- **Earthy Terracotta & Coral (`#EA580C`, `#E76F51`)**: Urgent diagnostic color for "Too Dry" and "Poor Environment" classifications.

## Typography
- **Primary & Display Typeface**: `Albert Sans` — A modern Scandinavian geometric grotesk with friendly humanist proportions that provides clarity for data readouts and warmth in copy.
- **Monospace Typeface**: `JetBrains Mono` — Dedicated to raw UART frames, baud rates, register hex, and embedded packet logs.

## Layout
- **Mobile-First App Architecture**: Optimized for hand-held phone use with 44px+ touch targets, ergonomic bottom tab navigation, and sticky status bar.
- **Desktop Companion Mode**: Centers the application within an authentic mobile bezel frame with quick toggle for wide dashboard analysis.

## Elevation & Depth
- **Soft Ambient Elevation (`shadow-soft`)**: `0 4px 20px -2px rgba(27, 67, 50, 0.05)`
- **Card Tactile Shadow (`shadow-card`)**: `0 8px 30px -4px rgba(27, 67, 50, 0.08)`
- **Elevated Modal Shadow (`shadow-elevated`)**: `0 16px 40px -8px rgba(27, 67, 50, 0.12)`

## Shapes
- **Container Radii**: 24px (`rounded-3xl`) for hero cards and screen panels; 16px (`rounded-2xl`) for sensor telemetry modules; 12px for interactive chips and buttons.
- **Organic Progress Rings**: Circular SVG indicators with rounded stroke terminals and soft luminous drop-shadows.

## Components
- **Health Progress Ring**: Visual status indicator displaying overall vitality percentage with real-time condition color switching.
- **Sensor Telemetry Cards**: 4 specialized microclimate cards (Moisture, Temp, Humidity, Light) with real-time sparkline trendlines.
- **Interactive Multi-Range Line Chart**: Responsive SVG graph supporting 24h, 7d, 30d timeframes and species threshold bands.
- **Raw Telemetry Terminal**: Live packet inspector with JSON validation, line framing, and manual packet injection.

## Do's and Don'ts
- **DO**: Clearly distinguish real hardware telemetry from simulated demo mode data.
- **DO**: State the exact timestamp and synchronization freshness of sensor readings.
- **DO**: Provide actionable, conditional plant care guidance without claiming clinical disease diagnostics.
- **DON'T**: Invent fake hardware connections or pretend disconnected readings are live.
- **DON'T**: Use generic gray admin panels or harsh neobrutalist block shadows.
