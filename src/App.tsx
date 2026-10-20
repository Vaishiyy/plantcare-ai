import React, { useState } from 'react';
import { PlantProvider, usePlant } from './context/PlantContext';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { ScreenDashboard } from './screens/ScreenDashboard';
import { ScreenPlantDetails } from './screens/ScreenPlantDetails';
import { ScreenLiveMonitoring } from './screens/ScreenLiveMonitoring';
import { ScreenAiAnalysis } from './screens/ScreenAiAnalysis';
import { ScreenAnalytics } from './screens/ScreenAnalytics';
import { ScreenAlerts } from './screens/ScreenAlerts';
import { ScreenSettings } from './screens/ScreenSettings';
import { Smartphone, Monitor } from 'lucide-react';

const ScreenRouter: React.FC = () => {
  const { activeScreen } = usePlant();

  return (
    <main className="px-4 pt-3 flex-1">
      {activeScreen === 'dashboard' && <ScreenDashboard />}
      {activeScreen === 'plant_details' && <ScreenPlantDetails />}
      {activeScreen === 'live_monitoring' && <ScreenLiveMonitoring />}
      {activeScreen === 'ai_analysis' && <ScreenAiAnalysis />}
      {activeScreen === 'history' && <ScreenAnalytics />}
      {activeScreen === 'alerts' && <ScreenAlerts />}
      {activeScreen === 'settings' && <ScreenSettings />}
    </main>
  );
};

export const AppContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<'mobile' | 'wide'>('mobile');

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-start text-forest-900 selection:bg-sage-200">
      {/* Desktop view switcher banner (only visible on md+ screens) */}
      <div className="hidden md:flex w-full bg-forest-900 text-cream-200 py-1.5 px-4 text-xs items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <span className="font-bold font-display text-white tracking-wide">
            PlantCare AI
          </span>
          <span className="text-[10px] bg-forest-800 text-sage-200 px-2 py-0.5 rounded-full font-mono">
            STM32 Embedded ML Companion
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-stone-400 text-[11px]">Display Frame:</span>
          <div className="flex gap-1 bg-forest-950 p-0.5 rounded-lg border border-forest-800">
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === 'mobile'
                  ? 'bg-forest-700 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Phone</span>
            </button>
            <button
              onClick={() => setViewMode('wide')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === 'wide'
                  ? 'bg-forest-700 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Wide View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main App Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col min-h-screen relative ${
          viewMode === 'mobile'
            ? 'max-w-md bg-cream-100 md:my-4 md:rounded-[2.5rem] md:shadow-elevated md:border md:border-cream-300/80 md:overflow-hidden md:min-h-[860px]'
            : 'max-w-4xl bg-cream-100 my-0'
        }`}
      >
        <AppHeader />
        <ScreenRouter />
        <BottomNav />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PlantProvider>
      <AppContent />
    </PlantProvider>
  );
};

export default App;
