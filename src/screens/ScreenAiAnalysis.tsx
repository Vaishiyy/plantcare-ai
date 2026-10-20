import React from 'react';
import { usePlant } from '../context/PlantContext';
import {
  BrainCircuit,
  CheckCircle2,
  Droplets,
  AlertOctagon,
  CloudSun,
  ShieldAlert,
  ArrowRight,
  Clock,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { analyzeTelemetry, CONDITION_METADATA } from '../services/ml/mlInference';
import { PlantCondition } from '../types';

export const ScreenAiAnalysis: React.FC = () => {
  const { currentReading, activeProfile, history } = usePlant();

  const diagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds);

  // Extract previous classification log from history
  const previousPredictions = history
    .slice(-12)
    .reverse()
    .map((item) => ({
      condition: item.condition,
      timestamp: item.timestamp,
      moisture: item.moisture,
      temp: item.temperature,
      confidence: item.confidence,
    }));

  const conditionCards: {
    condition: PlantCondition;
    icon: React.ElementType;
    title: string;
    description: string;
    criteria: string;
    typicalAction: string;
    colors: {
      activeBorder: string;
      activeBg: string;
      badge: string;
      iconBg: string;
      iconColor: string;
    };
  }[] = [
    {
      condition: 'Healthy',
      icon: CheckCircle2,
      title: 'Healthy',
      description: 'Optimum vegetative balance. All physical parameters are within species tolerance.',
      criteria: 'Moisture 40–70%, Temp 18–28°C, Humidity >45%, balanced light',
      typicalAction: 'Continue regular monitoring. Inspect soil surface weekly.',
      colors: {
        activeBorder: 'border-emerald-500 ring-2 ring-emerald-200',
        activeBg: 'bg-emerald-50/80',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
      },
    },
    {
      condition: 'Needs Water',
      icon: Droplets,
      title: 'Needs Water',
      description: 'Initial soil moisture deficit detected before visible foliage wilting occurs.',
      criteria: 'Moisture below species target, normal ambient climate',
      typicalAction: 'Check the soil with your finger 2 inches deep and water the plant if dry.',
      colors: {
        activeBorder: 'border-amber-500 ring-2 ring-amber-200',
        activeBg: 'bg-amber-50/80',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
      },
    },
    {
      condition: 'Too Dry',
      icon: AlertOctagon,
      title: 'Too Dry',
      description: 'Severe prolonged soil drought. Risk of root shrinkage and cellular collapse.',
      criteria: 'Critically depleted moisture (<20%), elevated soil temperature',
      typicalAction: 'Inspect soil moisture and water availability promptly; aerate if soil is hydrophobic.',
      colors: {
        activeBorder: 'border-orange-500 ring-2 ring-orange-200',
        activeBg: 'bg-orange-50/80',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-700',
      },
    },
    {
      condition: 'Poor Environment',
      icon: CloudSun,
      title: 'Poor Environment',
      description: 'Microclimate stress caused by temperature extremes, stagnant air, or inadequate light.',
      criteria: 'Extreme heat/cold, extreme humidity (>85% or <30%), or scorching light',
      typicalAction: 'Review ambient temperature, humidity, and light conditions. Relocate away from drafts.',
      colors: {
        activeBorder: 'border-rose-500 ring-2 ring-rose-200',
        activeBg: 'bg-rose-50/80',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-700',
      },
    },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Current Active ML Diagnosis Card */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card relative overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-forest-100 text-forest-700">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-600">
                Microcontroller Inference
              </span>
              <h2 className="text-lg font-display font-bold text-forest-900 leading-tight">
                {diagnostic.condition}
              </h2>
            </div>
          </div>

          {currentReading.confidence !== undefined ? (
            <div className="px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-bold flex items-center gap-1">
              <span>{Math.round(currentReading.confidence * 100)}%</span>
              <span className="text-[10px] font-normal text-stone-500">confidence</span>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-semibold">
              Categorical ML
            </span>
          )}
        </div>

        {/* Diagnostic Explanation */}
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${diagnostic.color.bg} ${diagnostic.color.border}`}>
          <div className="flex items-center gap-1.5 font-bold text-forest-900">
            <Sparkles className="w-3.5 h-3.5 text-forest-700" />
            <span>Classification Rationale:</span>
          </div>
          <p className="text-stone-700">
            {diagnostic.explanation}
          </p>
        </div>

        {/* Feature Importance / Sensor Influence Weights */}
        <div className="mt-4 pt-3 border-t border-cream-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800">Telemetry Influence Attribution:</span>
            <span className="text-[10px] text-stone-500">Estimated input relevance</span>
          </div>

          <div className="space-y-2">
            {/* Moisture */}
            <div>
              <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                <span>Soil Moisture ({currentReading.moisture}%)</span>
                <span className="font-semibold text-blue-700">{diagnostic.factorWeights.moisture}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${diagnostic.factorWeights.moisture}%` }}
                />
              </div>
            </div>

            {/* Temperature */}
            <div>
              <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                <span>Temperature ({currentReading.temperature}°C)</span>
                <span className="font-semibold text-amber-700">{diagnostic.factorWeights.temperature}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${diagnostic.factorWeights.temperature}%` }}
                />
              </div>
            </div>

            {/* Humidity */}
            <div>
              <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                <span>Humidity ({currentReading.humidity}%)</span>
                <span className="font-semibold text-teal-700">{diagnostic.factorWeights.humidity}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${diagnostic.factorWeights.humidity}%` }}
                />
              </div>
            </div>

            {/* Light */}
            <div>
              <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                <span>Light Intensity ({currentReading.light} lux)</span>
                <span className="font-semibold text-yellow-700">{diagnostic.factorWeights.light}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${diagnostic.factorWeights.light}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Next Action */}
        <div className="mt-4 p-3 bg-cream-50 rounded-2xl border border-cream-200/90 text-xs space-y-1">
          <span className="font-bold text-forest-900 block">Suggested Horticultural Next Step:</span>
          <p className="text-stone-700 leading-snug">
            {diagnostic.recommendedAction}
          </p>
        </div>
      </div>

      {/* 4 ML Output Categories as Distinct Status Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
            Model Output Taxonomy (4 Categories)
          </h3>
          <span className="text-[10px] text-stone-500">Active class highlighted</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {conditionCards.map((card) => {
            const Icon = card.icon;
            const isCurrent = currentReading.condition === card.condition;

            return (
              <div
                key={card.condition}
                className={`p-3.5 rounded-2xl border transition-all duration-200 bg-white ${
                  isCurrent
                    ? `${card.colors.activeBorder} ${card.colors.activeBg} shadow-card`
                    : 'border-cream-200 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl ${card.colors.iconBg} ${card.colors.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-forest-900 flex items-center gap-1.5">
                        {card.title}
                        {isCurrent && (
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${card.colors.badge}`}>
                            CURRENT
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-stone-500 block leading-tight">
                        {card.criteria}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                  {card.description}
                </p>

                <div className="p-2 rounded-xl bg-white/70 border border-stone-200/60 text-[11px] text-stone-700">
                  <span className="font-semibold text-stone-800">Action: </span>
                  {card.typicalAction}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Honest Diagnostic Scope Notice */}
      <div className="p-4 bg-cream-50 rounded-3xl border border-cream-200/90 text-xs text-stone-600 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-forest-800">
          <ShieldAlert className="w-4 h-4 text-forest-600" />
          <span>Diagnostic Scope & Model Transparency</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          The embedded TinyML model running on the STM32 performs real-time classification on macro-environmental vectors (soil moisture, temperature, humidity, ambient light). Recommendations are conditional. The system does not diagnose microscopic viral, fungal, or pest infestations which require visual or laboratory examination.
        </p>
      </div>

      {/* Previous Predictions Timeline */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-forest-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Prediction History Log
            </h3>
          </div>
          <span className="text-[10px] text-stone-400">Past telemetry frames</span>
        </div>

        <div className="divide-y divide-cream-100 max-h-48 overflow-y-auto pr-1">
          {previousPredictions.map((pred, i) => {
            const timeStr = new Date(pred.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div key={i} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      pred.condition === 'Healthy'
                        ? 'bg-emerald-500'
                        : pred.condition === 'Needs Water'
                        ? 'bg-amber-500'
                        : pred.condition === 'Too Dry'
                        ? 'bg-orange-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-stone-800">{pred.condition}</span>
                    <span className="text-[10px] text-stone-400 block">{timeStr}</span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-stone-500">
                  <span>{pred.moisture}% moist</span> • <span>{pred.temp}°C</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
