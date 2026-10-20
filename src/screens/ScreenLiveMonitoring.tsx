import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { InteractiveLineChart } from '../components/InteractiveLineChart';
import { SerialTerminalModal } from '../components/SerialTerminalModal';
import {
  Activity,
  RefreshCw,
  BrainCircuit,
  Bluetooth,
  Terminal,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { analyzeTelemetry } from '../services/ml/mlInference';

export const ScreenLiveMonitoring: React.FC = () => {
  const {
    currentReading,
    history,
    activeProfile,
    connectionState,
    isDemoMode,
    isStale,
    lastUpdatedStr,
    refreshReadings,
    checkPlantHealth,
    refreshInterval,
    setRefreshInterval,
  } = usePlant();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  const diagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds, activeProfile.plantCode);

  const liveWindowData = history.slice(-20);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refreshReadings();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Live Stream Status Card */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className={`flex h-3 w-3 rounded-full ${
                connectionState === 'connected' || isDemoMode
                  ? 'bg-emerald-500 animate-ping'
                  : 'bg-stone-400'
              }`} />
              <span className={`absolute inset-0 rounded-full ${
                connectionState === 'connected' || isDemoMode
                  ? 'bg-emerald-500'
                  : 'bg-stone-400'
              }`} />
            </div>

            <div>
              <h2 className="text-sm font-bold font-display text-forest-900">
                Live Sensor Telemetry
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-400" />
                  Last Packet: {lastUpdatedStr}
                </span>
                <span>•</span>
                <span>Interval: {refreshInterval / 1000}s</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTerminalOpen(true)}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors shadow-soft"
              title="Open Raw UART Terminal"
            >
              <Terminal className="w-4 h-4" />
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-700 border border-forest-200 transition-all shadow-soft"
              title="Refresh Readings"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Offline Warning Notice if disconnected */}
        {connectionState !== 'connected' && !isDemoMode && (
          <div className="p-3 bg-stone-100 border border-stone-200 rounded-2xl flex items-start gap-2.5 text-stone-600">
            <AlertTriangle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-stone-800 block">
                Hardware Link Offline
              </span>
              <p className="leading-snug">
                Showing last captured readings ({lastUpdatedStr}). Telemetry will resume automatically once STM32 Bluetooth connects.
              </p>
            </div>
          </div>
        )}

        {/* Stale Warning Notice */}
        {isStale && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block">Telemetry is Stale</span>
              <p className="leading-snug">
                No new sensor packets have been received in over 30 seconds. Verify STM32 power and Bluetooth pairing.
              </p>
            </div>
          </div>
        )}

        {/* Live Metrics Grid with Instant Values */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-2xl bg-blue-50/80 border border-blue-100">
            <span className="text-[10px] text-blue-700 font-semibold block uppercase">
              Moisture
            </span>
            <span className="text-lg font-bold font-display text-blue-900 leading-tight">
              {currentReading.moisture}%
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-100">
            <span className="text-[10px] text-amber-700 font-semibold block uppercase">
              Temp
            </span>
            <span className="text-lg font-bold font-display text-amber-900 leading-tight">
              {currentReading.temperature}°C
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-teal-50/80 border border-teal-100">
            <span className="text-[10px] text-teal-700 font-semibold block uppercase">
              Humidity
            </span>
            <span className="text-lg font-bold font-display text-teal-900 leading-tight">
              {currentReading.humidity}%
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-yellow-50/80 border border-yellow-100">
            <span className="text-[10px] text-yellow-700 font-semibold block uppercase">
              LDR ADC
            </span>
            <span className="text-lg font-bold font-display text-yellow-900 leading-tight">
              {currentReading.light}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleManualRefresh}
            className="py-2.5 px-3 rounded-2xl bg-cream-100 hover:bg-cream-200 text-forest-900 font-semibold text-xs flex items-center justify-center gap-2 border border-cream-300 transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Step Next Record</span>
          </button>

          <button
            onClick={checkPlantHealth}
            className="py-2.5 px-3 rounded-2xl bg-forest-600 hover:bg-forest-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-soft transition-all active:scale-[0.98]"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-sage-200" />
            <span>Run Decision Tree</span>
          </button>
        </div>
      </div>

      {/* Live Updating Line Charts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-forest-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Sensor Stream Graph (20 samples)
            </h3>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <span className="text-[10px]">Rate:</span>
            {[2000, 3000, 5000].map((ms) => (
              <button
                key={ms}
                onClick={() => setRefreshInterval(ms)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                  refreshInterval === ms
                    ? 'bg-forest-600 text-white font-bold'
                    : 'bg-white border border-cream-300 text-stone-600'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
        </div>

        <InteractiveLineChart
          data={liveWindowData}
          thresholds={activeProfile.thresholds}
          height={210}
          showMetricSelector={true}
        />
      </div>

      {/* Live ML Prediction Insight */}
      <div className={`p-4 rounded-3xl border shadow-card space-y-2 ${diagnostic.color.bg} ${diagnostic.color.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-forest-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
              STM32 ML Prediction: {diagnostic.condition}
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${diagnostic.color.badge}`}>
            Class {diagnostic.mlClassCode}
          </span>
        </div>

        <p className="text-xs text-stone-700 leading-relaxed">
          {diagnostic.explanation}
        </p>

        <div className="pt-1 flex items-center justify-between text-[11px] text-stone-600">
          <span>Action: {diagnostic.recommendedAction}</span>
        </div>
      </div>

      <SerialTerminalModal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
    </div>
  );
};
