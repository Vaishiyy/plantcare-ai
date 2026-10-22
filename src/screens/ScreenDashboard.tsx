import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { HealthProgressRing } from '../components/HealthProgressRing';
import { SensorCard } from '../components/SensorCard';
import {
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  Bluetooth,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FlaskConical,
  Database,
} from 'lucide-react';
import { analyzeTelemetry } from '../services/ml/mlInference';
import { EditPlantModal } from '../components/EditPlantModal';

export const ScreenDashboard: React.FC = () => {
  const {
    activeProfile,
    currentReading,
    history,
    connectionState,
    connectionProtocol,
    statusMessage,
    isDemoMode,
    setActiveScreen,
    refreshReadings,
    setScenario,
    tempUnit,
  } = usePlant();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const diagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds, activeProfile.plantCode);

  const moistureHistory = history.map((h) => h.moisture);
  const tempHistory = history.map((h) => h.temperature);
  const humidityHistory = history.map((h) => h.humidity);
  const lightHistory = history.map((h) => h.light);

  const displayTemp = tempUnit === 'F'
    ? parseFloat(((currentReading.temperature * 9) / 5 + 32).toFixed(1))
    : currentReading.temperature;

  const displayTempMin = tempUnit === 'F'
    ? Math.round((activeProfile.thresholds.tempMin * 9) / 5 + 32)
    : activeProfile.thresholds.tempMin;

  const displayTempMax = tempUnit === 'F'
    ? Math.round((activeProfile.thresholds.tempMax * 9) / 5 + 32)
    : activeProfile.thresholds.tempMax;

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refreshReadings();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Plant-Health Hero Card with ML Model Output */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card relative overflow-hidden">
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{
            backgroundColor:
              diagnostic.mlClassCode === 2
                ? '#52B788'
                : diagnostic.mlClassCode === 1
                ? '#E9C46A'
                : '#E76F51',
          }}
        />

        <div className="flex items-start justify-between relative z-10 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-forest-600/80">
                Plant Health Status
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest-50 border border-forest-200 text-forest-700 font-semibold">
                {diagnostic.condition}
              </span>
            </div>
            <h2 className="text-xl font-display font-bold text-forest-900 tracking-tight">
              {diagnostic.headline}
            </h2>
            <p className="text-xs text-stone-500 max-w-[210px] leading-relaxed">
              {diagnostic.explanation}
            </p>
          </div>

          <HealthProgressRing
            condition={diagnostic.condition}
            healthScore={diagnostic.healthScore}
            mlClassCode={diagnostic.mlClassCode}
            confidence={currentReading.confidence}
            size={105}
            strokeWidth={8}
          />
        </div>

        {/* Action recommendations banner */}
        <div
          className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${diagnostic.color.bg} ${diagnostic.color.border}`}
        >
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-forest-700" />
          <div className="flex-1">
            <span className="font-semibold text-forest-900 block">Care Recommendation:</span>
            <span className="text-stone-700 leading-snug">{diagnostic.recommendedAction}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <button
            onClick={() => setActiveScreen('plant_details')}
            className="py-2.5 px-3 rounded-2xl bg-forest-600 hover:bg-forest-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-soft transition-all active:scale-[0.98]"
          >
            <span>View Plant Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {connectionState === 'connected' ? (
            <button
              onClick={() => setActiveScreen('live_monitoring')}
              className="py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Bluetooth className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Telemetry</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveScreen('settings')}
              className="py-2.5 px-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-300 text-forest-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Bluetooth className="w-3.5 h-3.5 text-forest-600" />
              <span>Connect Device</span>
            </button>
          )}
        </div>
      </div>

      {/* Sensor Readings Grid Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold font-display text-forest-900">
            Environmental Telemetry ({activeProfile.name})
          </h3>
          <span className="text-[11px] text-stone-500">
            Live readings for your plant's environment
          </span>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          aria-label="Refresh telemetry readings"
          className="p-1.5 rounded-xl bg-white border border-cream-300 text-stone-600 hover:text-forest-700 hover:bg-cream-50 transition-all shadow-soft"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-forest-600' : ''}`} />
        </button>
      </div>

      {/* 4 Sensor Cards matching dataset columns */}
      <div className="grid grid-cols-2 gap-3">
        <SensorCard
          title="Soil Moisture"
          value={currentReading.moisture}
          unit="%"
          minTarget={activeProfile.thresholds.moistureMin}
          maxTarget={activeProfile.thresholds.moistureMax}
          icon={Droplets}
          sparklineData={moistureHistory}
          colorTheme="moisture"
          onClick={() => setActiveScreen('live_monitoring')}
        />

        <SensorCard
          title="Temperature"
          subtitle="25°C Assumed • No Sensor"
          value={displayTemp}
          unit={tempUnit === 'F' ? '°F' : '°C'}
          minTarget={displayTempMin}
          maxTarget={displayTempMax}
          icon={Thermometer}
          sparklineData={tempHistory}
          colorTheme="temperature"
          onClick={() => setActiveScreen('live_monitoring')}
        />

        <SensorCard
          title="Air Humidity"
          value={currentReading.humidity}
          unit="%"
          minTarget={activeProfile.thresholds.humidityMin}
          maxTarget={activeProfile.thresholds.humidityMax}
          icon={CloudRain}
          sparklineData={humidityHistory}
          colorTheme="humidity"
          onClick={() => setActiveScreen('live_monitoring')}
        />

        <SensorCard
          title="Sunlight"
          value={currentReading.light}
          unit="Lux"
          minTarget={activeProfile.thresholds.lightMin}
          maxTarget={activeProfile.thresholds.lightMax}
          icon={Sun}
          sparklineData={lightHistory}
          colorTheme="light"
          onClick={() => setActiveScreen('live_monitoring')}
        />
      </div>

      {/* Bottom Mode Strip: Simulation Presets vs Live Hardware Link */}
      {isDemoMode ? (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-forest-900 uppercase tracking-wider">
                Simulation Presets
              </span>
            </div>
            <span className="text-[10px] text-forest-800 font-semibold bg-white/80 px-2 py-0.5 rounded-full border border-forest-300">
              {activeProfile.name}
            </span>
          </div>
          <p className="text-[11px] text-stone-600 leading-snug">
            Test how your plant responds to different environmental conditions:
          </p>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => setScenario('dataset_suitable')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-all text-center shadow-soft"
            >
              Optimal
            </button>
            <button
              onClick={() => setScenario('dataset_moderate')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 transition-all text-center shadow-soft"
            >
              Needs Care
            </button>
            <button
              onClick={() => setScenario('dataset_high_stress')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 transition-all text-center shadow-soft"
            >
              High Stress
            </button>
            <button
              onClick={() => setScenario('dataset_stream')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-forest-700 border border-forest-800 text-white hover:bg-forest-800 transition-all text-center shadow-soft"
            >
              Cycle Next ▶
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bluetooth className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Hardware Mode Active ({connectionProtocol.toUpperCase()})
              </span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              connectionState === 'connected'
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-amber-100 border-amber-300 text-amber-800'
            }`}>
              {connectionState === 'connected' ? 'Hardware Online' : 'Waiting for Data'}
            </span>
          </div>

          <p className="text-[11px] text-emerald-800 leading-snug">
            {connectionState === 'connected'
              ? currentReading.isSynthetic
                ? 'Cloud Bridge connected! Waiting for first telemetry packet from Android bridge...'
                : 'Authentic sensor telemetry is streaming from your STM32F401 Black Pill.'
              : statusMessage}
          </p>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <button
              onClick={() => setActiveScreen('settings')}
              className="text-forest-700 font-semibold underline underline-offset-2 hover:text-forest-900"
            >
              Open Link & Ingestion Settings →
            </button>
            <span className="text-stone-500 text-[10px]">
              Assumed Baseline: 25°C
            </span>
          </div>
        </div>
      )}

      <EditPlantModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </div>
  );
};
