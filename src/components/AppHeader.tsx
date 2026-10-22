import React from 'react';
import { usePlant } from '../context/PlantContext';
import { Bluetooth, Radio, Bell, AlertTriangle, Cloud } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const {
    activeProfile,
    connectionState,
    connectionProtocol,
    connectedDeviceName,
    hasRealReading,
    isStale,
    lastUpdatedStr,
    unreadAlertCount,
    setActiveScreen,
  } = usePlant();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="px-4 pt-3 pb-2 sticky top-0 z-30 bg-cream-100/90 backdrop-blur-md border-b border-cream-200">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-1">
          {/* Greeting & Date */}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-forest-600/80">
                {formattedDate}
              </span>
              <span className="text-[10px] text-stone-400">•</span>
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                {hasRealReading ? `Sync ${lastUpdatedStr}` : 'Offline'}
              </span>
            </div>
            <h1 className="text-xl font-display font-bold text-forest-900 tracking-tight flex items-center gap-1.5">
              Hello, Plant Parent! <span className="text-base">🌱</span>
            </h1>
          </div>

          {/* Quick Actions (Alerts & Status) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScreen('alerts')}
              aria-label="View notifications"
              className="relative p-2 rounded-xl bg-white border border-cream-300/80 text-forest-800 shadow-soft hover:bg-cream-50 active:scale-95 transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadAlertCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hardware Status Strip */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScreen('settings')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                hasRealReading && connectionState === 'connected'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : connectionState === 'connected' || connectionState === 'connecting'
                  ? 'bg-blue-50 border-blue-200 text-blue-800 animate-pulse'
                  : 'bg-stone-100 border-stone-200 text-stone-600'
              }`}
            >
              {connectionState === 'connected' ? (
                connectionProtocol === 'cloud' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate max-w-[130px]">STM32 Cloud Live</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate max-w-[130px]">
                      {connectedDeviceName || (connectionProtocol === 'ble' ? 'BLE Linked' : 'STM32 Serial')}
                    </span>
                  </>
                )
              ) : connectionState === 'connecting' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-3.5 h-3.5 text-stone-400" />
                  <span>STM32 Offline</span>
                </>
              )}
            </button>

            {isStale && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-coral-50 border border-coral-200 text-coral-700">
                <AlertTriangle className="w-3 h-3" />
                Stale Data
              </span>
            )}
          </div>

          {/* Active Plant Profile Pill */}
          <button
            onClick={() => setActiveScreen('plant_details')}
            className="text-xs font-medium text-forest-700 bg-white/80 border border-cream-300 px-2.5 py-1 rounded-full hover:bg-white transition-all shadow-soft flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-forest-500" />
            <span className="truncate max-w-[110px]">{activeProfile.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
