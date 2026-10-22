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
  Cpu,
  Terminal,
} from 'lucide-react';
import { analyzeTelemetry } from '../services/ml/mlInference';
import { EditPlantModal } from '../components/EditPlantModal';
import { SerialTerminalModal } from '../components/SerialTerminalModal';

export const ScreenDashboard: React.FC = () => {
  const {
    activeProfile,
    currentReading,
    hasRealReading,
    history,
    connectionState,
    connectionProtocol,
    statusMessage,
    setActiveScreen,
    refreshReadings,
    connectSerial,
    tempUnit,
  } = usePlant();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const realDiagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds, activeProfile.plantCode);

  const diagnostic = hasRealReading
    ? realDiagnostic
    : {
        condition: 'None' as any,
        headline: connectionState === 'connecting' ? 'Connecting to STM32...' : 'STM32 Disconnected',
        explanation: 'Real sensor readings and ML predictions will display once STM32 is connected and transmitting telemetry.',
        recommendedAction: 'Connect your STM32 via Cloud Bridge or Serial in Settings.',
        color: {
          bg: 'bg-stone-50/90',
          border: 'border-cream-200',
          text: 'text-stone-800',
          badge: 'bg-stone-100 text-stone-500 border-stone-200',
          ring: '#E5E7EB',
        },
        healthScore: 0,
        mlClassCode: undefined,
      };

  const moistureHistory = hasRealReading ? history.map((h) => h.moisture) : [];
  const tempHistory = hasRealReading ? history.map((h) => h.temperature) : [];
  const humidityHistory = hasRealReading ? history.map((h) => h.humidity) : [];
  const lightHistory = hasRealReading ? history.map((h) => h.light) : [];

  const displayTemp = hasRealReading
    ? tempUnit === 'F'
      ? parseFloat(((currentReading.temperature * 9) / 5 + 32).toFixed(1))
      : currentReading.temperature
    : null;

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
        {hasRealReading && (
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
        )}

        <div className="flex items-start justify-between relative z-10 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-forest-600/80">
                Plant Health Status
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${diagnostic.color.badge}`}>
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
            confidence={hasRealReading ? currentReading.confidence : undefined}
            size={105}
            strokeWidth={8}
            hasData={hasRealReading}
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
              onClick={() => setIsTerminalOpen(true)}
              className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-soft transition-all active:scale-[0.98]"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>⚡ Connect STM32</span>
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
            {hasRealReading ? 'Live readings from STM32 Black Pill' : 'Awaiting sensor connection'}
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
          value={hasRealReading ? currentReading.moisture : null}
          hasData={hasRealReading}
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
          hasData={hasRealReading}
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
          value={hasRealReading ? currentReading.humidity : null}
          hasData={hasRealReading}
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
          value={hasRealReading ? currentReading.light : null}
          hasData={hasRealReading}
          unit="Lux"
          minTarget={activeProfile.thresholds.lightMin}
          maxTarget={activeProfile.thresholds.lightMax}
          icon={Sun}
          sparklineData={lightHistory}
          colorTheme="light"
          onClick={() => setActiveScreen('live_monitoring')}
        />
      </div>

      {/* Hardware Status & Link Strip */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        hasRealReading
          ? 'bg-emerald-50/80 border-emerald-200'
          : 'bg-stone-50 border-stone-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bluetooth className={`w-4 h-4 ${hasRealReading ? 'text-emerald-700' : 'text-stone-500'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${hasRealReading ? 'text-emerald-950' : 'text-stone-800'}`}>
              Hardware Link: {connectionProtocol.toUpperCase()}
            </span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            hasRealReading
              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
              : connectionState === 'connected'
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-stone-200 border-stone-300 text-stone-600'
          }`}>
            {hasRealReading ? 'STM32 Online' : connectionState === 'connected' ? 'Listening...' : 'Offline'}
          </span>
        </div>

        <p className="text-[11px] text-stone-600 mt-1.5 leading-snug">
          {hasRealReading
            ? 'Authentic sensor telemetry is streaming from your STM32F401 Black Pill and powering ML predictions.'
            : connectionState === 'connected'
            ? 'Bridge connected. Waiting for first live sensor reading from STM32 hardware...'
            : 'Hardware is not connected. Sensor readings and AI predictions will display as soon as your device connects.'}
        </p>

        <div className="flex items-center justify-between pt-2 text-[11px]">
          <button
            onClick={() => setActiveScreen('settings')}
            className="text-forest-700 font-semibold underline underline-offset-2 hover:text-forest-900"
          >
            Manage Device Connection & Settings →
          </button>
          <span className="text-stone-400 text-[10px]">
            Baseline: 25°C Assumed
          </span>
        </div>

        {/* 1-Click Connect & Stream Quick Action */}
        <div className="mt-2 pt-2 border-t border-stone-200/80 flex items-center gap-2">
          {connectionState !== 'connected' ? (
            <>
              <button
                onClick={() => connectSerial(9600)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>⚡ Connect STM32 Directly (9600 Baud)</span>
              </button>
              <button
                onClick={() => setIsTerminalOpen(true)}
                className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                title="Open Live UART Telemetry Monitor"
              >
                <Terminal className="w-3.5 h-3.5 text-stone-600" />
                <span>Monitor</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsTerminalOpen(true)}
              className="w-full py-1.5 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-700" />
              <span>Open STM32 Live UART Monitor ({connectionProtocol.toUpperCase()})</span>
            </button>
          )}
        </div>
      </div>

      <EditPlantModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
      <SerialTerminalModal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
    </div>
  );
};
