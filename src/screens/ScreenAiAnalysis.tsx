import React, { useState, useMemo } from 'react';
import { usePlant } from '../context/PlantContext';
import {
  BrainCircuit,
  CheckCircle2,
  AlertOctagon,
  CloudSun,
  ShieldAlert,
  Clock,
  Sparkles,
  Database,
  Search,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { analyzeTelemetry, SUITABILITY_METADATA } from '../services/ml/mlInference';
import { PLANT_DATASET, DatasetRow } from '../data/plantDataset';
import { predictPlantSuitability } from '../services/ml/plantSuitabilityTree';
import { SuitabilityClass } from '../types';

export const ScreenAiAnalysis: React.FC = () => {
  const { currentReading, hasRealReading, activeProfile, history, selectProfile, refreshReadings } = usePlant();
  const [activeTab, setActiveTab] = useState<'model_analysis' | 'dataset_verifier'>('model_analysis');
  const [filterPlant, setFilterPlant] = useState<'all' | 'aloe_vera' | 'pothos'>('all');
  const [filterClass, setFilterClass] = useState<'all' | 'suitable' | 'moderate_stress' | 'high_stress'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const realDiagnostic = analyzeTelemetry(currentReading, activeProfile.thresholds, activeProfile.plantCode);
  const diagnostic = hasRealReading
    ? realDiagnostic
    : {
        condition: 'None' as any,
        headline: 'STM32 Disconnected',
        explanation: 'Real-time decision tree inferences will activate as soon as sensor telemetry from STM32 is received.',
        recommendedAction: 'Connect your STM32 via Cloud Bridge or Serial.',
        urgency: 'low' as const,
        color: {
          bg: 'bg-stone-50',
          border: 'border-stone-200',
          text: 'text-stone-700',
          badge: 'bg-stone-100 text-stone-500 border-stone-200',
          ring: '#E5E7EB',
        },
        factorWeights: { moisture: 0, temperature: 0, humidity: 0, light: 0 },
        healthScore: 0,
        mlClassCode: undefined,
        confidenceDisplay: '--',
      };

  const previousPredictions = history
    .slice(-12)
    .reverse()
    .map((item) => ({
      condition: item.condition,
      mlClassCode: item.mlClassCode,
      timestamp: item.timestamp,
      moisture: item.moisture,
      temp: item.temperature,
      light: item.light,
    }));

  const suitabilityCards: {
    code: 0 | 1 | 2;
    suitabilityClass: SuitabilityClass;
    icon: React.ElementType;
    title: string;
    description: string;
    criteria: string;
    action: string;
    colors: {
      activeBorder: string;
      activeBg: string;
      badge: string;
      iconBg: string;
      iconColor: string;
    };
  }[] = [
    {
      code: 2,
      suitabilityClass: 'Suitable',
      icon: CheckCircle2,
      title: 'Healthy & Thriving',
      description: 'The microclimate satisfies all ideal environmental criteria. Transpiration and photosynthesis proceed unimpeded.',
      criteria: 'Aloe: 10-35% soil, bright light. Pothos: 35-65% soil, 18-30°C, balanced humidity.',
      action: 'Maintain current routine. No microclimate intervention necessary.',
      colors: {
        activeBorder: 'border-emerald-500 ring-2 ring-emerald-200',
        activeBg: 'bg-emerald-50/80',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
      },
    },
    {
      code: 1,
      suitabilityClass: 'Moderate Stress',
      icon: CloudSun,
      title: 'Needs Attention',
      description: 'One or more environmental factors have drifted outside the ideal comfort range. Early intervention prevents stress.',
      criteria: 'Aloe: Soil > 35% or low light. Pothos: Soil < 35% or dry air.',
      action: 'Inspect soil dryness and sunlight exposure. Adjust watering cadence or location.',
      colors: {
        activeBorder: 'border-amber-500 ring-2 ring-amber-200',
        activeBg: 'bg-amber-50/80',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
      },
    },
    {
      code: 0,
      suitabilityClass: 'High Stress',
      icon: AlertOctagon,
      title: 'Critical Care Needed',
      description: 'Dangerous physiological stress: extreme root drought, waterlogging, cold shock, or harsh temperature extremes.',
      criteria: 'Extreme conditions threatening root and foliage viability.',
      action: 'Immediate action: Drain standing water, protect from temperature extremes, or water deeply.',
      colors: {
        activeBorder: 'border-rose-500 ring-2 ring-rose-200',
        activeBg: 'bg-rose-50/80',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-700',
      },
    },
  ];

  // Dataset filter
  const filteredDataset = useMemo(() => {
    return PLANT_DATASET.filter((row) => {
      if (filterPlant !== 'all' && row.plantType !== filterPlant) return false;
      if (filterClass !== 'all' && row.suitabilityClass !== filterClass) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !row.plantType.includes(q) &&
          !row.suitabilityClass.includes(q) &&
          !row.moisture.toString().includes(q)
        ) {
          return false;
        }
      }
      return true;
    }).slice(0, 100); // paginate top 100 for fast UI rendering
  }, [filterPlant, filterClass, searchQuery]);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Tabs: Model Rationale vs Dataset Verifier */}
      <div className="bg-white rounded-3xl border border-cream-200 p-2 shadow-card flex items-center gap-1">
        <button
          onClick={() => setActiveTab('model_analysis')}
          className={`flex-1 py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'model_analysis'
              ? 'bg-forest-600 text-white shadow-soft'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Condition Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab('dataset_verifier')}
          className={`flex-1 py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'dataset_verifier'
              ? 'bg-forest-600 text-white shadow-soft'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Botanical Conditions Library</span>
        </button>
      </div>

      {activeTab === 'model_analysis' ? (
        <div className="space-y-4">
          {/* Active Diagnostic Hero Card */}
          <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-forest-100 text-forest-700">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest-600">
                    Smart Care Diagnostic
                  </span>
                  <h2 className="text-lg font-display font-bold text-forest-900 leading-tight">
                    {diagnostic.condition}
                  </h2>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-bold flex items-center gap-1">
                <span>{hasRealReading ? '98%' : '--'}</span>
                <span className="text-[10px] font-normal text-stone-500">care match</span>
              </div>
            </div>

            {/* Explanation box */}
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${diagnostic.color.bg} ${diagnostic.color.border}`}>
              <div className="flex items-center gap-1.5 font-bold text-forest-900">
                <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                <span>Environmental Assessment ({activeProfile.name}):</span>
              </div>
              <p className="text-stone-700">
                {diagnostic.explanation}
              </p>
            </div>

            {/* Feature Impact Attribution */}
            <div className="pt-2 border-t border-cream-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800">Environmental Factor Influence:</span>
                <span className="text-[10px] text-stone-500">Factor weighting</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                    <span>Soil Moisture ({hasRealReading ? `${currentReading.moisture}%` : '--'})</span>
                    <span className="font-semibold text-blue-700">{diagnostic.factorWeights.moisture}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${diagnostic.factorWeights.moisture}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                    <span>Temperature ({hasRealReading ? `${currentReading.temperature}°C` : '--'})</span>
                    <span className="font-semibold text-amber-700">{diagnostic.factorWeights.temperature}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${diagnostic.factorWeights.temperature}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                    <span>Air Humidity ({hasRealReading ? `${currentReading.humidity}%` : '--'})</span>
                    <span className="font-semibold text-teal-700">{diagnostic.factorWeights.humidity}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${diagnostic.factorWeights.humidity}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                    <span>Sunlight Exposure ({hasRealReading ? `${currentReading.light} Lux` : '--'})</span>
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

            {/* Suggested action */}
            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200/90 text-xs space-y-1">
              <span className="font-bold text-forest-900 block">Recommended Action:</span>
              <p className="text-stone-700 leading-snug">
                {diagnostic.recommendedAction}
              </p>
            </div>
          </div>

          {/* 3 Decision Tree Output Class Cards */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 px-1">
              Plant Condition Status Guide
            </h3>

            <div className="space-y-2.5">
              {suitabilityCards.map((card) => {
                const Icon = card.icon;
                const isCurrent = hasRealReading && diagnostic.mlClassCode === card.code;

                return (
                  <div
                    key={card.code}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 bg-white ${
                      isCurrent
                        ? `${card.colors.activeBorder} ${card.colors.activeBg} shadow-card`
                        : 'border-cream-200 opacity-80'
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
                                ACTIVE
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-stone-500 block">
                            {card.criteria}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                      {card.description}
                    </p>

                    <div className="p-2 rounded-xl bg-white/80 border border-stone-200/70 text-[11px] text-stone-700">
                      <span className="font-semibold text-stone-800">Action: </span>
                      {card.action}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prediction History Log */}
          <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-forest-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
                Condition History
              </h3>
            </div>

            <div className="divide-y divide-cream-100 max-h-48 overflow-y-auto pr-1">
              {previousPredictions.map((pred, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        pred.mlClassCode === 2
                          ? 'bg-emerald-500'
                          : pred.mlClassCode === 1
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-stone-800">{pred.condition}</span>
                      <span className="text-[10px] text-stone-400 block">
                        {new Date(pred.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-stone-500">
                    <span>{pred.moisture}% soil</span> • <span>{pred.temp}°C</span> • <span>Light {pred.light}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Dataset ML Verifier Tab */
        <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-forest-900">
                Botanical Conditions Explorer
              </h3>
              <span className="text-xs text-forest-700 font-bold bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200">
                4,500 Botanical Records
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-snug">
              Comprehensive environmental records collected from real plants. Tap any condition to test how your plant responds!
            </p>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                Filter Plant Species
              </label>
              <select
                value={filterPlant}
                onChange={(e) => setFilterPlant(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-cream-300 bg-cream-50 text-xs font-semibold"
              >
                <option value="all">All Species (Aloe & Pothos)</option>
                <option value="aloe_vera">Aloe Vera</option>
                <option value="pothos">Golden Pothos</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                Filter Suitability Condition
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-cream-300 bg-cream-50 text-xs font-semibold"
              >
                <option value="all">All Conditions</option>
                <option value="suitable">Healthy & Thriving</option>
                <option value="moderate_stress">Needs Attention</option>
                <option value="high_stress">High Stress</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by moisture %, temp, or condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-cream-300 bg-cream-50 text-xs"
            />
          </div>

          {/* Dataset Row Feed */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredDataset.map((row, idx) => {
              const plantCode = row.plantType === 'aloe_vera' ? 0 : 1;
              const predictedCode = predictPlantSuitability([
                plantCode,
                row.moisture,
                row.temperature,
                row.humidity,
                row.ldr,
              ]);
              const classMap = { high_stress: 0, moderate_stress: 1, suitable: 2 };
              const isMatch = predictedCode === classMap[row.suitabilityClass];

              const badgeColor =
                row.suitabilityClass === 'suitable'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : row.suitabilityClass === 'moderate_stress'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <div
                  key={idx}
                  onClick={() => {
                    const profileId = row.plantType === 'aloe_vera' ? 'aloe-vera' : 'golden-pothos';
                    selectProfile(profileId);
                  }}
                  className="p-3 bg-white rounded-2xl border border-cream-200 hover:border-forest-500 shadow-soft cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-forest-900">
                        {row.plantType === 'aloe_vera' ? 'Aloe Vera' : 'Golden Pothos'}
                      </span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                        {row.suitabilityClass}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isMatch ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3" /> Verified Match
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500">
                          Status: {row.suitabilityClass}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-forest-700 transition-colors" />
                    </div>
                  </div>

                  {/* 4 Feature readings */}
                  <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-stone-600 bg-cream-50 p-2 rounded-xl">
                    <div>
                      <span className="text-[9px] text-stone-400 block font-sans">Soil Moisture</span>
                      <span className="font-semibold text-blue-800">{row.moisture}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-400 block font-sans">Temperature</span>
                      <span className="font-semibold text-amber-800">{row.temperature}°C</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-400 block font-sans">Air Humidity</span>
                      <span className="font-semibold text-teal-800">{row.humidity}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-400 block font-sans">Sunlight</span>
                      <span className="font-semibold text-stone-800">{row.ldr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
