import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import {
  Calendar,
  ShieldCheck,
  Edit3,
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  Info,
  HelpCircle,
} from 'lucide-react';
import { analyzeTelemetry } from '../services/ml/mlInference';
import { EditPlantModal } from '../components/EditPlantModal';

export const ScreenPlantDetails: React.FC = () => {
  const {
    activeProfile,
    profiles,
    selectProfile,
    currentReading,
    hasRealReading,
    tempUnit,
  } = usePlant();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const diagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds, activeProfile.plantCode);

  const displayTemp = tempUnit === 'F'
    ? parseFloat(((currentReading.temperature * 9) / 5 + 32).toFixed(1))
    : currentReading.temperature;

  const displayTempMin = tempUnit === 'F'
    ? Math.round((activeProfile.thresholds.tempMin * 9) / 5 + 32)
    : activeProfile.thresholds.tempMin;

  const displayTempMax = tempUnit === 'F'
    ? Math.round((activeProfile.thresholds.tempMax * 9) / 5 + 32)
    : activeProfile.thresholds.tempMax;

  const calculateGaugePct = (val: number, min: number, max: number) => {
    const range = max - min;
    const lowerBound = min - range * 0.4;
    const upperBound = max + range * 0.4;
    const pct = ((val - lowerBound) / (upperBound - lowerBound)) * 100;
    return Math.max(4, Math.min(96, pct));
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Plant Profile Header */}
      <div className="bg-white rounded-3xl border border-cream-200 overflow-hidden shadow-card">
        <div className="relative h-48 w-full bg-cream-200 overflow-hidden">
          <img
            src={activeProfile.imageUrl}
            alt={activeProfile.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-black/20" />

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-forest-900 shadow-soft hover:bg-white transition-all flex items-center gap-1.5 text-xs font-semibold px-3"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sage-200">
              Monitored Specimen • Indoor Care
            </span>
            <h2 className="text-xl font-display font-bold leading-tight">
              {activeProfile.name}
            </h2>
            <p className="text-xs text-cream-200 italic font-serif">
              {activeProfile.species}
            </p>
          </div>
        </div>

        {/* Quick meta stats */}
        <div className="p-4 grid grid-cols-3 gap-2 border-b border-cream-200 text-center bg-cream-50/50">
          <div className="p-2">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
              Watering Need
            </span>
            <span className="text-xs font-bold text-forest-800">
              {activeProfile.plantCode === 0 ? 'Low / Dry Soil' : 'Moderate / Moist'}
            </span>
          </div>

          <div className="p-2 border-x border-cream-200">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
              Care Tolerance
            </span>
            <span className="text-xs font-bold text-forest-800 truncate block">
              {activeProfile.careLevel}
            </span>
          </div>

          <div className="p-2">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
              Added
            </span>
            <span className="text-xs font-bold text-forest-800">
              {new Date(activeProfile.dateAdded).toLocaleDateString([], { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Species selector carousel pills */}
        <div className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto bg-white">
          <span className="text-[11px] font-medium text-stone-400 whitespace-nowrap mr-1">
            Available Plants:
          </span>
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProfile(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                p.id === activeProfile.id
                  ? 'bg-forest-600 text-white font-semibold shadow-soft'
                  : 'bg-cream-100 text-stone-600 hover:bg-cream-200'
              }`}
            >
              {p.name} ({p.speciesKey})
            </button>
          ))}
        </div>
      </div>

      {/* Model Diagnostic Explanation */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-forest-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Health Condition Analysis
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest-50 border border-forest-200 text-forest-700 font-semibold">
            {diagnostic.condition}
          </span>
        </div>

        <div className={`p-3.5 rounded-2xl border ${diagnostic.color.bg} ${diagnostic.color.border}`}>
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-forest-900 block">
                Why is the plant marked as {diagnostic.condition}?
              </span>
              <p className="text-stone-700 leading-relaxed">
                {diagnostic.explanation}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200/80 text-[11px] space-y-1 text-stone-600">
          <div className="flex items-center gap-1.5 text-forest-800 font-semibold text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
            <span>Botanical Comfort Baseline</span>
          </div>
          <p className="leading-snug">
            Current readings are evaluated against calibrated physiological comfort ranges for {activeProfile.name} to detect stress before foliage damage occurs.
          </p>
        </div>
      </div>

      {/* Sensor Values vs Recommended Species Ranges */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold font-display text-forest-900">
              Ideal Environmental Ranges
            </h3>
            <span className="text-[11px] text-stone-500">
              Live reading vs comfort ranges for {activeProfile.name}
            </span>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs text-forest-600 hover:text-forest-800 font-semibold flex items-center gap-1"
          >
            <span>Edit Ranges</span>
          </button>
        </div>

        {/* 1. Soil Moisture */}
        <div className="p-3 bg-cream-50/60 rounded-2xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-800">Soil Moisture</span>
                <span className="text-[10px] text-stone-400 block">
                  Target: {activeProfile.thresholds.moistureMin}% – {activeProfile.thresholds.moistureMax}%
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-bold font-display text-forest-900">
                {hasRealReading ? `${currentReading.moisture}%` : '--'}
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  !hasRealReading
                    ? 'text-stone-400'
                    : currentReading.moisture < activeProfile.thresholds.moistureMin
                    ? 'text-amber-700'
                    : currentReading.moisture > activeProfile.thresholds.moistureMax
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {!hasRealReading
                  ? 'Awaiting STM32'
                  : currentReading.moisture < activeProfile.thresholds.moistureMin
                  ? 'Dry Soil'
                  : currentReading.moisture > activeProfile.thresholds.moistureMax
                  ? 'Overwatered'
                  : 'In Range'}
              </span>
            </div>
          </div>

          <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 opacity-60 rounded-full"
              style={{
                left: `${activeProfile.thresholds.moistureMin}%`,
                width: `${activeProfile.thresholds.moistureMax - activeProfile.thresholds.moistureMin}%`,
              }}
            />
            {hasRealReading && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
                style={{ left: `calc(${currentReading.moisture}% - 7px)` }}
              />
            )}
          </div>
        </div>

        {/* 2. Temperature */}
        <div className="p-3 bg-cream-50/60 rounded-2xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Thermometer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-800">Temperature</span>
                <span className="text-[10px] text-stone-400 block">
                  Assumed Room Temp (25°C) • No Physical Sensor
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-bold font-display text-forest-900">
                {hasRealReading ? `${displayTemp}°${tempUnit}` : '--'}
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  !hasRealReading
                    ? 'text-stone-400'
                    : (displayTemp ?? 0) < displayTempMin
                    ? 'text-blue-700'
                    : (displayTemp ?? 0) > displayTempMax
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {!hasRealReading
                  ? 'Awaiting STM32'
                  : (displayTemp ?? 0) < displayTempMin
                  ? 'Cold Stress'
                  : (displayTemp ?? 0) > displayTempMax
                  ? 'Heat Stress'
                  : 'In Range'}
              </span>
            </div>
          </div>

          <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 opacity-60 rounded-full"
              style={{ left: '30%', width: '40%' }}
            />
            {hasRealReading && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
                style={{
                  left: `${calculateGaugePct(displayTemp || 25, displayTempMin, displayTempMax)}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* 3. Humidity */}
        <div className="p-3 bg-cream-50/60 rounded-2xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                <CloudRain className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-800">Air Humidity</span>
                <span className="text-[10px] text-stone-400 block">
                  Target: {activeProfile.thresholds.humidityMin}% – {activeProfile.thresholds.humidityMax}%
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-bold font-display text-forest-900">
                {hasRealReading ? `${currentReading.humidity}%` : '--'}
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  !hasRealReading
                    ? 'text-stone-400'
                    : currentReading.humidity < activeProfile.thresholds.humidityMin
                    ? 'text-amber-700'
                    : currentReading.humidity > activeProfile.thresholds.humidityMax
                    ? 'text-teal-700'
                    : 'text-emerald-700'
                }`}
              >
                {!hasRealReading
                  ? 'Awaiting STM32'
                  : currentReading.humidity < activeProfile.thresholds.humidityMin
                  ? 'Dry Air'
                  : currentReading.humidity > activeProfile.thresholds.humidityMax
                  ? 'High Humidity'
                  : 'In Range'}
              </span>
            </div>
          </div>

          <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 opacity-60 rounded-full"
              style={{
                left: `${activeProfile.thresholds.humidityMin}%`,
                width: `${activeProfile.thresholds.humidityMax - activeProfile.thresholds.humidityMin}%`,
              }}
            />
            {hasRealReading && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
                style={{ left: `calc(${currentReading.humidity}% - 7px)` }}
              />
            )}
          </div>
        </div>

        {/* 4. Light */}
        <div className="p-3 bg-cream-50/60 rounded-2xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-yellow-100 text-yellow-700">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-800">Sunlight Exposure</span>
                <span className="text-[10px] text-stone-400 block">
                  Target: {activeProfile.thresholds.lightMin} – {activeProfile.thresholds.lightMax} Lux
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-bold font-display text-forest-900">
                {hasRealReading ? currentReading.light : '--'}
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  !hasRealReading
                    ? 'text-stone-400'
                    : currentReading.light < activeProfile.thresholds.lightMin
                    ? 'text-amber-700'
                    : currentReading.light > activeProfile.thresholds.lightMax
                    ? 'text-orange-700'
                    : 'text-emerald-700'
                }`}
              >
                {!hasRealReading
                  ? 'Awaiting STM32'
                  : currentReading.light < activeProfile.thresholds.lightMin
                  ? 'Low Light'
                  : currentReading.light > activeProfile.thresholds.lightMax
                  ? 'High Light'
                  : 'Optimal'}
              </span>
            </div>
          </div>

          <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 opacity-60 rounded-full"
              style={{
                left: `${(activeProfile.thresholds.lightMin / 4095) * 100}%`,
                width: `${((activeProfile.thresholds.lightMax - activeProfile.thresholds.lightMin) / 4095) * 100}%`,
              }}
            />
            {hasRealReading && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
                style={{
                  left: `${(currentReading.light / 4095) * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="p-4 bg-white rounded-3xl border border-cream-200 shadow-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-1">
          Horticultural Profile Notes
        </h3>
        <p className="text-xs text-stone-600 leading-relaxed">
          {activeProfile.notes}
        </p>
      </div>

      <EditPlantModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
};
