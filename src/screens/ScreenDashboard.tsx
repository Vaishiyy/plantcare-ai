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
} from 'lucide-react';
import { analyzeTelemetry } from '../services/ml/mlInference';
import { EditPlantModal } from '../components/EditPlantModal';

export const ScreenDashboard: React.FC = () => {
  const {
    activeProfile,
    currentReading,
    history,
    connectionState,
    isDemoMode,
    setActiveScreen,
    refreshReadings,
    setScenario,
    tempUnit,
  } = usePlant();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const diagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds);

  // Sparkline history extraction
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
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Prominent Overall Plant-Health Hero Card */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card relative overflow-hidden">
        {/* Soft decorative background tint */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{
            backgroundColor:
              currentReading.condition === 'Healthy'
                ? '#52B788'
                : currentReading.condition === 'Needs Water'
                ? '#E9C46A'
                : currentReading.condition === 'Too Dry'
                ? '#EA580C'
                : '#E76F51',
          }}
        />

        <div className="flex items-start justify-between relative z-10 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-forest-600/80">
                Active Classification
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-forest-50 border border-forest-200 text-forest-700 font-medium">
                STM32 TinyML
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
            condition={currentReading.condition}
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
            <span className="font-semibold text-forest-900 block">Recommended Action:</span>
            <span className="text-stone-700 leading-snug">{diagnostic.recommendedAction}</span>
          </div>
        </div>

        {/* Buttons: View Plant Details & Connect Device */}
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
            Real-Time Microclimate Telemetry
          </h3>
          <span className="text-[11px] text-stone-500">
            Four physical sensors streaming from STM32 ADC & GPIO
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

      {/* 4 Sensor Cards */}
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
          title="Ambient Temp"
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
          title="Relative Humidity"
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
          title="Light Intensity"
          value={currentReading.light}
          unit="lux"
          minTarget={activeProfile.thresholds.lightMin}
          maxTarget={activeProfile.thresholds.lightMax}
          icon={Sun}
          sparklineData={lightHistory}
          colorTheme="light"
          onClick={() => setActiveScreen('live_monitoring')}
        />
      </div>

      {/* College Project Viva / Demo Scenarios Strip */}
      {isDemoMode && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Evaluation Test Presets
              </span>
            </div>
            <span className="text-[10px] text-amber-700 font-medium">Demo Simulator</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-snug">
            Quickly trigger physical condition edge cases to demonstrate how the STM32 ML model classifies each plant state:
          </p>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => setScenario('ideal')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-all text-center shadow-soft"
            >
              Healthy
            </button>
            <button
              onClick={() => setScenario('needs_water')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 transition-all text-center shadow-soft"
            >
              Needs Water
            </button>
            <button
              onClick={() => setScenario('too_dry')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white border border-orange-300 text-orange-800 hover:bg-orange-50 transition-all text-center shadow-soft"
            >
              Too Dry
            </button>
            <button
              onClick={() => setScenario('poor_env')}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 transition-all text-center shadow-soft"
            >
              Poor Env
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <EditPlantModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </div>
  );
};
