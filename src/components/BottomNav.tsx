import React from 'react';
import { ActiveScreen } from '../types';
import {
  LayoutDashboard,
  Sprout,
  Activity,
  BrainCircuit,
  LineChart,
  Bell,
  Settings,
} from 'lucide-react';
import { usePlant } from '../context/PlantContext';

interface NavItem {
  id: ActiveScreen;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'plant_details', label: 'Plant', icon: Sprout },
  { id: 'live_monitoring', label: 'Live', icon: Activity },
  { id: 'ai_analysis', label: 'AI Health', icon: BrainCircuit },
  { id: 'history', label: 'Analytics', icon: LineChart },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Device', icon: Settings },
];

export const BottomNav: React.FC = () => {
  const { activeScreen, setActiveScreen, unreadAlertCount } = usePlant();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-cream-300/80 shadow-[0_-4px_20px_rgba(27,67,50,0.06)] px-2 py-1.5 safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all duration-200 rounded-xl ${
                isActive
                  ? 'text-forest-600 font-semibold'
                  : 'text-stone-400 hover:text-stone-600 font-medium'
              }`}
            >
              <div
                className={`relative p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-sage-100 text-forest-700' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                {item.id === 'alerts' && unreadAlertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
                    {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-all duration-150 ${
                  isActive ? 'text-forest-700 font-semibold' : 'text-stone-400'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 bg-forest-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
