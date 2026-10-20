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
  CheckCircle2,
  AlertCircle,
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
    isDemoMode,
    tempUnit,
  } = usePlant();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const diagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds);

  const displayTemp = tempUnit === 'F'
    ? parseFloat(((currentReading.temperature * 9) / 5 + 32).toFixed(1))
    : currentReading.temperature;

  const displayTempMin = tempUnit === 'F'
    ? Math.round((activeProfile.thresholds.tempMin * 9) / 5 + 32)
    : activeProfile.thresholds.tempMin;

  const displayTempMax = tempUnit === 'F'
    ? Math.round((activeProfile.thresholds.tempMax * 9) / 5 + 32)
    : activeProfile.thresholds.tempMax;

  // Gauge helper: calculates percentage position inside min/max target range
  const calculateGaugePct = (val: number, min: number, max: number) => {
    const range = max - min;
    const lowerBound = min - range * 0.4;
    const upperBound = max + range * 0.4;
    const pct = ((val - lowerBound) / (upperBound - lowerBound)) * 100;
    return Math.max(4, Math.min(96, pct));
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Plant Profile Header with Picture & Taxonomy */}
      <div className="bg-white rounded-3xl border border-cream-200 overflow-hidden shadow-card">
        {/* Plant Image / Banner */}
        <div className="relative h-48 w-full bg-cream-200 overflow-hidden">
          <img
            src={activeProfile.imageUrl}
            alt={activeProfile.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-black/20" />

          {/* Plant Profiles Quick Switcher overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-forest-900 shadow-soft hover:bg-white transition-all flex items-center gap-1.5 text-xs font-semibold px-3"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          {/* Profile Name & Botanical Name overlay */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sage-200">
              Active Monitored Specimen
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
              Care Level
            </span>
            <span className="text-xs font-bold text-forest-800">
              {activeProfile.careLevel}
            </span>
          </div>

          <div className="p-2 border-x border-cream-200">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
              Light Needs
            </span>
            <span className="text-xs font-bold text-forest-800 truncate block">
              {activeProfile.sunlightRequirement}
            </span>
          </div>

          <div className="p-2">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
              Date Added
            </span>
            <span className="text-xs font-bold text-forest-800">
              {new Date(activeProfile.dateAdded).toLocaleDateString([], { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Species selector carousel pills */}
        <div className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto bg-white">
          <span className="text-[11px] font-medium text-stone-400 whitespace-nowrap mr-1">
            Specimens:
          </span>
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProfile(p.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                p.id === activeProfile.id
                  ? 'bg-forest-600 text-white font-semibold shadow-soft'
                  : 'bg-cream-100 text-stone-600 hover:bg-cream-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Distinction Box: Measured Sensor Values vs Model-Generated Recommendations */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-forest-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Diagnostic Explanation
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest-50 border border-forest-200 text-forest-700 font-semibold">
            Status: {diagnostic.condition}
          </span>
        </div>

        {/* Explanation text */}
        <div className={`p-3.5 rounded-2xl border ${diagnostic.color.bg} ${diagnostic.color.border}`}>
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-forest-900 block">
                Why was "{diagnostic.condition}" predicted?
              </span>
              <p className="text-stone-700 leading-relaxed">
                {diagnostic.explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Notice on Measured vs Recommendation */}
        <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200/80 text-[11px] space-y-1 text-stone-600">
          <div className="flex items-center gap-1.5 text-forest-800 font-semibold text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
            <span>Telemetry Integrity Notice</span>
          </div>
          <p className="leading-snug">
            Sensor readings below represent raw physical telemetry recorded by the STM32 ADC & DHT11. Health conditions and recommended actions are generated by the on-chip classification model and should be verified with physical tactile soil inspection.
          </p>
        </div>
      </div>

      {/* Sensor Values vs Recommended Species Ranges */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold font-display text-forest-900">
              Species Environmental Ranges
            </h3>
            <span className="text-[11px] text-stone-500">
              Live reading vs {activeProfile.name}'s safe envelope
            </span>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs text-forest-600 hover:text-forest-800 font-semibold flex items-center gap-1"
          >
            <span>Edit Ranges</span>
          </button>
        </div>

        {/* 1. Soil Moisture Gauge */}
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
                {currentReading.moisture}%
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  currentReading.moisture < activeProfile.thresholds.moistureMin
                    ? 'text-amber-700'
                    : currentReading.moisture > activeProfile.thresholds.moistureMax
                    ? 'text-blue-700'
                    : 'text-emerald-700'
                }`}
              >
                {currentReading.moisture < activeProfile.thresholds.moistureMin
                  ? 'Below Ideal'
                  : currentReading.moisture > activeProfile.thresholds.moistureMax
                  ? 'Above Ideal'
                  : 'In Range'}
              </span>
            </div>
          </div>

          {/* Visual Range Bar */}
          <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 opacity-60 rounded-full"
              style={{
                left: `${activeProfile.thresholds.moistureMin}%`,
                width: `${activeProfile.thresholds.moistureMax - activeProfile.thresholds.moistureMin}%`,
              }}
            />
            {/* Live indicator dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
              style={{ left: `calc(${currentReading.moisture}% - 7px)` }}
            />
          </div>
        </div>

        {/* 2. Temperature Gauge */}
        <div className="p-3 bg-cream-50/60 rounded-2xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Thermometer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-800">Temperature</span>
                <span className="text-[10px] text-stone-400 block">
                  Target: {displayTempMin}° – {displayTempMax}°{tempUnit}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-bold font-display text-forest-900">
                {displayTemp}°{tempUnit}
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  displayTemp < displayTempMin
                    ? 'text-blue-700'
                    : displayTemp > displayTempMax
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {displayTemp < displayTempMin
                  ? 'Cold Stress'
                  : displayTemp > displayTempMax
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
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
              style={{
                left: `${calculateGaugePct(displayTemp, displayTempMin, displayTempMax)}%`,
              }}
            />
          </div>
        </div>

        {/* 3. Humidity Gauge */}
        <div className="p-3 bg-cream-50/60 rounded-2xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                <CloudRain className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-800">Humidity</span>
                <span className="text-[10px] text-stone-400 block">
                  Target: {activeProfile.thresholds.humidityMin}% – {activeProfile.thresholds.humidityMax}%
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-bold font-display text-forest-900">
                {currentReading.humidity}%
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  currentReading.humidity < activeProfile.thresholds.humidityMin
                    ? 'text-amber-700'
                    : currentReading.humidity > activeProfile.thresholds.humidityMax
                    ? 'text-teal-700'
                    : 'text-emerald-700'
                }`}
              >
                {currentReading.humidity < activeProfile.thresholds.humidityMin
                  ? 'Dry Air'
                  : currentReading.humidity > activeProfile.thresholds.humidityMax
                  ? 'High Moisture'
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
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
              style={{ left: `calc(${currentReading.humidity}% - 7px)` }}
            />
          </div>
        </div>

        {/* 4. Light Intensity Gauge */}
        <div className="p-3 bg-cream-50/60 rounded-2xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-yellow-100 text-yellow-700">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-800">Light Exposure</span>
                <span className="text-[10px] text-stone-400 block">
                  Target: {activeProfile.thresholds.lightMin} – {activeProfile.thresholds.lightMax} lux
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-bold font-display text-forest-900">
                {currentReading.light} lux
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  currentReading.light < activeProfile.thresholds.lightMin
                    ? 'text-amber-700'
                    : currentReading.light > activeProfile.thresholds.lightMax
                    ? 'text-orange-700'
                    : 'text-emerald-700'
                }`}
              >
                {currentReading.light < activeProfile.thresholds.lightMin
                  ? 'Low Light'
                  : currentReading.light > activeProfile.thresholds.lightMax
                  ? 'Direct Sunlight'
                  : 'Optimal'}
              </span>
            </div>
          </div>

          <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-emerald-400 opacity-60 rounded-full"
              style={{ left: '25%', width: '50%' }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-forest-800 ring-2 ring-white shadow-sm transition-all duration-500"
              style={{
                left: `${calculateGaugePct(
                  currentReading.light,
                  activeProfile.thresholds.lightMin,
                  activeProfile.thresholds.lightMax
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Care Notes */}
      <div className="p-4 bg-white rounded-3xl border border-cream-200 shadow-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-1">
          Horticultural Notes
        </h3>
        <p className="text-xs text-stone-600 leading-relaxed">
          {activeProfile.notes}
        </p>
      </div>

      <EditPlantModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
};
