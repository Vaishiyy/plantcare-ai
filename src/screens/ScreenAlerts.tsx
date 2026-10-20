import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import {
  Bell,
  CheckCheck,
  Trash2,
  Sliders,
  AlertTriangle,
  Info,
  CheckCircle2,
  Droplets,
  Thermometer,
  Sun,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AlertItem } from '../types';

export const ScreenAlerts: React.FC = () => {
  const {
    alerts,
    unreadAlertCount,
    markAlertRead,
    markAllAlertsRead,
    clearAllAlerts,
    alertPrefs,
    updateAlertPrefs,
    activeProfile,
  } = usePlant();

  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'moisture_critical':
      case 'moisture_low':
        return <Droplets className="w-4 h-4 text-blue-600" />;
      case 'temp_out_of_range':
        return <Thermometer className="w-4 h-4 text-amber-600" />;
      case 'light_abnormal':
        return <Sun className="w-4 h-4 text-yellow-600" />;
      case 'connection_lost':
      case 'connection_restored':
        return <Radio className="w-4 h-4 text-stone-600" />;
      default:
        return <Bell className="w-4 h-4 text-forest-600" />;
    }
  };

  const getSeverityStyles = (severity: AlertItem['severity'], read: boolean) => {
    if (read) {
      return 'bg-white/70 border-cream-200 text-stone-600 opacity-70';
    }
    switch (severity) {
      case 'critical':
        return 'bg-rose-50 border-rose-300 text-rose-900 shadow-soft';
      case 'warning':
        return 'bg-amber-50 border-amber-300 text-amber-900 shadow-soft';
      case 'success':
        return 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-soft';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900 shadow-soft';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Segmented Controls: Feed vs Alert Config */}
      <div className="bg-white rounded-3xl border border-cream-200 p-2 shadow-card flex items-center gap-1">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'notifications'
              ? 'bg-forest-600 text-white shadow-soft'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notification Center</span>
          {unreadAlertCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'notifications'
                  ? 'bg-white text-forest-700'
                  : 'bg-coral-500 text-white'
              }`}
            >
              {unreadAlertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'preferences'
              ? 'bg-forest-600 text-white shadow-soft'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Alert Rules & Limits</span>
        </button>
      </div>

      {activeTab === 'notifications' ? (
        <div className="space-y-3">
          {/* Action Bar: Mark read / Clear */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Active In-App Alerts ({alerts.length})
            </span>

            <div className="flex items-center gap-2 text-xs">
              {unreadAlertCount > 0 && (
                <button
                  onClick={markAllAlertsRead}
                  className="text-forest-700 hover:text-forest-900 font-semibold flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {alerts.length > 0 && (
                <button
                  onClick={clearAllAlerts}
                  className="text-stone-400 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Limitation & Architectural Notice */}
          <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200/90 text-[11px] text-stone-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-forest-800">
              <Info className="w-3.5 h-3.5 text-forest-600" />
              <span>In-App Telemetry Dispatch Notice</span>
            </div>
            <p className="leading-snug">
              Notifications are handled in-app via the browser's active Bluetooth/Serial event dispatcher. Native background push notifications require an installed native APK/IPA wrapper.
            </p>
          </div>

          {/* Alert Cards Feed */}
          {alerts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-cream-200 p-8 shadow-card text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold font-display text-forest-900">
                All Systems Normal
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                No active threshold violations or hardware disconnections. Your plant's microclimate is stable.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alert) => {
                const timeStr = new Date(alert.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateStr = new Date(alert.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={alert.id}
                    onClick={() => markAlertRead(alert.id)}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${getSeverityStyles(
                      alert.severity,
                      alert.read
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-xl bg-white/80 shadow-sm shrink-0 mt-0.5">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold leading-tight">
                              {alert.title}
                            </h4>
                            {!alert.read && (
                              <span className="w-2 h-2 rounded-full bg-coral-500" />
                            )}
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed opacity-90">
                            {alert.message}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-stone-400 whitespace-nowrap text-right shrink-0">
                        <span>{timeStr}</span>
                        <span className="block text-[9px]">{dateStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Alert Rules & Preferences Tab */
        <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card space-y-4">
          <div>
            <h3 className="text-sm font-bold font-display text-forest-900">
              Notification Channels & Triggers
            </h3>
            <span className="text-xs text-stone-500">
              Enable or silence specific sensor threshold events
            </span>
          </div>

          <div className="divide-y divide-cream-100 space-y-2">
            {/* 1. Low Moisture */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Soil Moisture Depletion
                </span>
                <span className="text-[11px] text-stone-500">
                  Trigger when moisture drops below {activeProfile.thresholds.moistureMin}%
                </span>
              </div>
              <input
                type="checkbox"
                checked={alertPrefs.lowMoisture}
                onChange={(e) => updateAlertPrefs({ lowMoisture: e.target.checked })}
                className="w-5 h-5 accent-forest-600 rounded cursor-pointer"
              />
            </div>

            {/* 2. Critical Drought */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Critical Drought Alarm
                </span>
                <span className="text-[11px] text-stone-500">
                  Trigger when moisture drops below severe {Math.round(activeProfile.thresholds.moistureMin * 0.5)}%
                </span>
              </div>
              <input
                type="checkbox"
                checked={alertPrefs.criticalDry}
                onChange={(e) => updateAlertPrefs({ criticalDry: e.target.checked })}
                className="w-5 h-5 accent-forest-600 rounded cursor-pointer"
              />
            </div>

            {/* 3. Temperature Extremes */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Temperature Range Breaches
                </span>
                <span className="text-[11px] text-stone-500">
                  Trigger when temperature goes outside {activeProfile.thresholds.tempMin}°C – {activeProfile.thresholds.tempMax}°C
                </span>
              </div>
              <input
                type="checkbox"
                checked={alertPrefs.temperatureExtreme}
                onChange={(e) => updateAlertPrefs({ temperatureExtreme: e.target.checked })}
                className="w-5 h-5 accent-forest-600 rounded cursor-pointer"
              />
            </div>

            {/* 4. Humidity Abnormal */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Low Ambient Humidity
                </span>
                <span className="text-[11px] text-stone-500">
                  Trigger when humidity falls below {activeProfile.thresholds.humidityMin}%
                </span>
              </div>
              <input
                type="checkbox"
                checked={alertPrefs.humidityAbnormal}
                onChange={(e) => updateAlertPrefs({ humidityAbnormal: e.target.checked })}
                className="w-5 h-5 accent-forest-600 rounded cursor-pointer"
              />
            </div>

            {/* 5. Light Intensity */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Extreme Light Scorching / Deficit
                </span>
                <span className="text-[11px] text-stone-500">
                  Trigger on intense direct scorch or inadequate dark placement
                </span>
              </div>
              <input
                type="checkbox"
                checked={alertPrefs.lightAbnormal}
                onChange={(e) => updateAlertPrefs({ lightAbnormal: e.target.checked })}
                className="w-5 h-5 accent-forest-600 rounded cursor-pointer"
              />
            </div>

            {/* 6. Bluetooth Connection Events */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Hardware Link State Changes
                </span>
                <span className="text-[11px] text-stone-500">
                  Notify upon unexpected Bluetooth disconnect or successful reconnection
                </span>
              </div>
              <input
                type="checkbox"
                checked={alertPrefs.connectionEvents}
                onChange={(e) => updateAlertPrefs({ connectionEvents: e.target.checked })}
                className="w-5 h-5 accent-forest-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
