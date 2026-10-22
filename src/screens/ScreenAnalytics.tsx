import React, { useState, useMemo } from 'react';
import { usePlant } from '../context/PlantContext';
import { InteractiveLineChart } from '../components/InteractiveLineChart';
import {
  Download,
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  AlertCircle,
  Check,
  History,
  Database,
} from 'lucide-react';
import { PlantCondition, SensorReading } from '../types';

export const ScreenAnalytics: React.FC = () => {
  const { history, activeProfile, exportCsv, tempUnit } = usePlant();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const filteredData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const now = Date.now();
    let durationMs = 7 * 24 * 3600 * 1000;
    if (timeRange === '24h') durationMs = 24 * 3600 * 1000;
    if (timeRange === '30d') durationMs = 30 * 24 * 3600 * 1000;

    const cutoff = now - durationMs;
    return history.filter((h) => h.timestamp >= cutoff);
  }, [history, timeRange]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgMoisture: 0,
        minMoisture: 0,
        maxMoisture: 0,
        avgTemp: 0,
        minTemp: 0,
        maxTemp: 0,
        avgHumidity: 0,
        minHumidity: 0,
        maxHumidity: 0,
        avgLight: 0,
        minLight: 0,
        maxLight: 0,
        classCounts: { suitable: 0, moderate_stress: 0, high_stress: 0 },
      };
    }

    let sumM = 0, minM = Infinity, maxM = -Infinity;
    let sumT = 0, minT = Infinity, maxT = -Infinity;
    let sumH = 0, minH = Infinity, maxH = -Infinity;
    let sumL = 0, minL = Infinity, maxL = -Infinity;
    const classCounts: Record<string, number> = {
      suitable: 0,
      moderate_stress: 0,
      high_stress: 0,
    };

    filteredData.forEach((d) => {
      sumM += d.moisture;
      minM = Math.min(minM, d.moisture);
      maxM = Math.max(maxM, d.moisture);

      sumT += d.temperature;
      minT = Math.min(minT, d.temperature);
      maxT = Math.max(maxT, d.temperature);

      sumH += d.humidity;
      minH = Math.min(minH, d.humidity);
      maxH = Math.max(maxH, d.humidity);

      sumL += d.light;
      minL = Math.min(minL, d.light);
      maxL = Math.max(maxL, d.light);

      const sClass = d.suitabilityClass || (d.mlClassCode === 2 ? 'suitable' : d.mlClassCode === 1 ? 'moderate_stress' : 'high_stress');
      if (classCounts[sClass] !== undefined) {
        classCounts[sClass]++;
      }
    });

    const count = filteredData.length;
    return {
      avgMoisture: Math.round(sumM / count),
      minMoisture: minM,
      maxMoisture: maxM,
      avgTemp: parseFloat((sumT / count).toFixed(1)),
      minTemp: minT,
      maxTemp: maxT,
      avgHumidity: Math.round(sumH / count),
      minHumidity: minH,
      maxHumidity: maxH,
      avgLight: Math.round(sumL / count),
      minLight: minL,
      maxLight: maxL,
      classCounts,
    };
  }, [filteredData]);

  const conditionTimeline = useMemo(() => {
    if (filteredData.length === 0) return [];
    const events: { from: PlantCondition; to: PlantCondition; timestamp: number }[] = [];
    let lastCond = filteredData[0].condition;

    for (let i = 1; i < filteredData.length; i++) {
      if (filteredData[i].condition !== lastCond) {
        events.push({
          from: lastCond,
          to: filteredData[i].condition,
          timestamp: filteredData[i].timestamp,
        });
        lastCond = filteredData[i].condition;
      }
    }
    return events.slice(-6).reverse();
  }, [filteredData]);

  const handleExport = () => {
    const success = exportCsv();
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Time Range Filter Header */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display text-forest-900">
              Plant Health & Sensor Trends
            </h2>
            <span className="text-xs text-stone-500">Historical environmental tracking for {activeProfile.name}</span>
          </div>

          <button
            onClick={handleExport}
            className={`py-2 px-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-soft ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-forest-600 hover:bg-forest-700 text-white'
            }`}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </>
            )}
          </button>
        </div>

        {/* 24h, 7d, 30d Toggle Tabs */}
        <div className="flex items-center gap-1 p-1 bg-cream-100 rounded-2xl border border-cream-200">
          {(['24h', '7d', '30d'] as const).map((r) => {
            const isSelected = timeRange === r;
            const labels = { '24h': '24 Hours', '7d': '7 Days', '30d': '30 Days' };
            return (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  isSelected
                    ? 'bg-white text-forest-900 shadow-soft'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-[11px]">
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>
            Verified historical readings and automated health evaluations
          </span>
        </div>
      </div>

      {/* Interactive Line Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
            Historical Sensor Graph
          </h3>
          <span className="text-[10px] text-stone-500">
            {filteredData.length} samples in view
          </span>
        </div>

        <InteractiveLineChart
          data={filteredData}
          thresholds={activeProfile.thresholds}
          height={230}
          showMetricSelector={true}
        />
      </div>

      {/* Aggregate Sensor Summary Cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 px-1">
          Period Min / Max / Average
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-white rounded-2xl border border-cream-200 shadow-soft space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-700">
              <Droplets className="w-4 h-4" />
              <span className="text-xs font-bold text-stone-800">Soil Moisture</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-display text-forest-900">
                {stats.avgMoisture}%
              </span>
              <span className="text-[10px] font-semibold text-stone-400">Average</span>
            </div>
            <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-cream-100">
              <span>Low: {stats.minMoisture}%</span>
              <span>High: {stats.maxMoisture}%</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-cream-200 shadow-soft space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-700">
              <Thermometer className="w-4 h-4" />
              <span className="text-xs font-bold text-stone-800">Temperature</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-display text-forest-900">
                {stats.avgTemp}°C
              </span>
              <span className="text-[10px] font-semibold text-stone-400">Average</span>
            </div>
            <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-cream-100">
              <span>Low: {stats.minTemp}°C</span>
              <span>High: {stats.maxTemp}°C</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-cream-200 shadow-soft space-y-1.5">
            <div className="flex items-center gap-1.5 text-teal-700">
              <CloudRain className="w-4 h-4" />
              <span className="text-xs font-bold text-stone-800">Air Humidity</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-display text-forest-900">
                {stats.avgHumidity}%
              </span>
              <span className="text-[10px] font-semibold text-stone-400">Average</span>
            </div>
            <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-cream-100">
              <span>Low: {stats.minHumidity}%</span>
              <span>High: {stats.maxHumidity}%</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-cream-200 shadow-soft space-y-1.5">
            <div className="flex items-center gap-1.5 text-yellow-700">
              <Sun className="w-4 h-4" />
              <span className="text-xs font-bold text-stone-800">Sunlight</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-display text-forest-900">
                {stats.avgLight}
              </span>
              <span className="text-[10px] font-semibold text-stone-400">Lux Avg</span>
            </div>
            <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-cream-100">
              <span>Low: {stats.minLight}</span>
              <span>High: {stats.maxLight}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Tree Classification Breakdown */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
          Plant Condition Breakdown (Period)
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-semibold text-emerald-800 block">Healthy & Thriving</span>
            <span className="text-lg font-bold font-display text-emerald-900">
              {stats.classCounts['suitable']}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-semibold text-amber-800 block">Needs Attention</span>
            <span className="text-lg font-bold font-display text-amber-900">
              {stats.classCounts['moderate_stress']}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200">
            <span className="text-[10px] font-semibold text-rose-800 block">Critical Stress</span>
            <span className="text-lg font-bold font-display text-rose-900">
              {stats.classCounts['high_stress']}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline of Condition Changes */}
      <div className="bg-white rounded-3xl border border-cream-200 p-4 shadow-card space-y-3">
        <div className="flex items-center gap-1.5">
          <History className="w-4 h-4 text-forest-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
            State Transition Timeline
          </h3>
        </div>

        {conditionTimeline.length === 0 ? (
          <p className="text-xs text-stone-500 italic py-2">
            No health state transitions recorded during this timeframe.
          </p>
        ) : (
          <div className="space-y-2">
            {conditionTimeline.map((ev, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-cream-50/70 border border-cream-200 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-stone-600 font-medium">{ev.from}</span>
                  <span className="text-stone-400">→</span>
                  <span className="font-bold text-forest-900">{ev.to}</span>
                </div>
                <span className="text-[10px] text-stone-400">
                  {new Date(ev.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                  {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
