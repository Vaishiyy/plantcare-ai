import React, { useState, useEffect, useRef } from 'react';
import { usePlant } from '../context/PlantContext';
import { X, Terminal, Send, CheckCircle2, Cpu, Zap, WifiOff, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { webSerial } from '../services/bluetooth/WebSerialService';

interface SerialTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SerialTerminalModal: React.FC<SerialTerminalModalProps> = ({ isOpen, onClose }) => {
  const {
    serialLogs,
    injectManualPacket,
    connectionProtocol,
    connectionState,
    connectedDeviceName,
    activeProfile,
    connectSerial,
    disconnectHardware,
    currentReading,
    hasRealReading,
    statusMessage,
  } = usePlant();

  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isConnecting, setIsConnecting] = useState(false);
  const [customInput, setCustomInput] = useState<string>(
    'PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0'
  );
  const [injectResult, setInjectResult] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isSerialSupported = webSerial.isSupported();

  // Auto-scroll terminal log to bottom on new messages
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [serialLogs]);

  if (!isOpen) return null;

  const handleDirectConnect = async () => {
    setIsConnecting(true);
    try {
      await connectSerial(baudRate);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectHardware();
  };

  const handleSend = () => {
    if (!customInput.trim()) return;
    const ok = injectManualPacket(customInput.trim());
    if (ok) {
      setInjectResult('Packet parsed & plant health evaluated!');
    } else {
      setInjectResult('Parse error: ensure payload matches format (PLANT=...,SOIL_PCT=...).');
    }
    setTimeout(() => setInjectResult(null), 3000);
  };

  const loadPreset = (formatStr: string) => {
    setCustomInput(formatStr);
  };

  const isConnected = connectionState === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-xs font-mono font-bold text-stone-200 block">
                STM32 Live UART Telemetry Monitor
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                Direct Hardware Link • {activeProfile.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : connectionState === 'connecting'
                  ? 'bg-blue-950 text-blue-300 border-blue-700 animate-pulse'
                  : 'bg-stone-800 text-stone-400 border-stone-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'
                }`}
              />
              {isConnected ? 'LIVE STREAMING' : connectionState.toUpperCase()}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1-Click Direct Hardware Connection Bar */}
        <div className="p-3.5 bg-stone-950/80 border-b border-stone-800">
          {!isConnected ? (
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Read Sensors Directly from STM32</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-snug">
                    Click below to open your STM32 USB port or paired Bluetooth HC-05 COM port. Readings stream automatically into the app without manual typing!
                  </p>
                </div>

                {/* Baud Rate Picker */}
                <div className="flex items-center gap-1 text-[11px] font-mono shrink-0 bg-stone-900 border border-stone-700 rounded-xl p-1">
                  <span className="text-stone-500 px-1 text-[10px]">Baud:</span>
                  {[9600, 115200].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setBaudRate(rate)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                        baudRate === rate
                          ? 'bg-emerald-600 text-white'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
              </div>

              {/* Big Connect Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDirectConnect}
                  disabled={isConnecting || !isSerialSupported}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                    isSerialSupported
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>
                    {isConnecting
                      ? 'Selecting Serial Port...'
                      : '⚡ Connect STM32 Directly (USB / HC-05 Bluetooth COM)'}
                  </span>
                </button>
              </div>

              {!isSerialSupported && (
                <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center gap-2 text-[10px] text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Web Serial requires Chrome, Edge, or Opera on Windows. (If on mobile, use the Android Cloud Bridge in Settings).
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Connected Live Telemetry Banner */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300 font-mono block">
                      Direct STM32 Stream Active ({baudRate} Baud)
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {connectedDeviceName || 'STM32 Hardware'} • Auto-parsing incoming UART packets
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="py-1 px-3 rounded-xl bg-stone-800 hover:bg-rose-950/80 border border-stone-700 hover:border-rose-700 text-stone-300 hover:text-rose-300 text-xs font-mono transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Quick Live Telemetry Values Preview */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-[10px]">
                <div className="p-1.5 bg-stone-900 border border-stone-800 rounded-lg text-center">
                  <span className="text-stone-500 block text-[9px]">SOIL</span>
                  <span className="text-emerald-400 font-bold">
                    {hasRealReading ? `${currentReading.moisture}%` : '--'}
                  </span>
                </div>
                <div className="p-1.5 bg-stone-900 border border-stone-800 rounded-lg text-center">
                  <span className="text-stone-500 block text-[9px]">TEMP</span>
                  <span className="text-amber-400 font-bold">
                    {hasRealReading ? `${currentReading.temperature}°C` : '--'}
                  </span>
                </div>
                <div className="p-1.5 bg-stone-900 border border-stone-800 rounded-lg text-center">
                  <span className="text-stone-500 block text-[9px]">LIGHT</span>
                  <span className="text-yellow-400 font-bold">
                    {hasRealReading ? currentReading.light : '--'}
                  </span>
                </div>
                <div className="p-1.5 bg-stone-900 border border-stone-800 rounded-lg text-center">
                  <span className="text-stone-500 block text-[9px]">ML DIAG</span>
                  <span className="text-blue-400 font-bold truncate block">
                    {hasRealReading ? currentReading.condition : 'WAITING'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live UART Stream Output Window */}
        <div
          ref={logContainerRef}
          className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-stone-950/90 select-text min-h-[220px]"
        >
          {serialLogs.length === 0 ? (
            <div className="text-stone-600 italic py-12 text-center space-y-1">
              <p>No UART transmissions captured yet.</p>
              <p className="text-[10px] text-stone-500">
                {isConnected
                  ? 'Waiting for next telemetry packet from STM32...'
                  : 'Click "Connect STM32 Directly" above to begin streaming live sensor data.'}
              </p>
            </div>
          ) : (
            serialLogs.map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              let color = 'text-stone-300';
              let badge = 'RX';
              let badgeBg = 'bg-emerald-950 text-emerald-400 border border-emerald-800';

              if (log.direction === 'out') {
                color = 'text-blue-300';
                badge = 'TX';
                badgeBg = 'bg-blue-950 text-blue-400 border border-blue-800';
              } else if (log.direction === 'sys') {
                color = 'text-amber-300';
                badge = 'SYS';
                badgeBg = 'bg-amber-950 text-amber-400 border border-amber-800';
              }

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[10px] text-stone-500 whitespace-nowrap">{time}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${badgeBg}`}>
                    {badge}
                  </span>
                  <span className={`break-all ${color}`}>{log.text}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Collapsed Debug / Offline Simulation (Clearly marked as optional) */}
        <details className="group border-t border-stone-800 bg-stone-900/60">
          <summary className="px-4 py-2 text-[11px] font-mono text-stone-400 hover:text-stone-200 cursor-pointer select-none flex items-center justify-between transition-colors">
            <span className="flex items-center gap-1.5">
              <span>🛠️ Offline Manual Packet Testing (Optional)</span>
              <span className="text-[9px] text-stone-500">(Only needed if hardware is not plugged in)</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-stone-500" />
          </summary>

          <div className="p-3 bg-stone-900/90 border-t border-stone-800/60 space-y-2.5">
            {/* Care Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono pb-1">
              <span className="text-stone-500 whitespace-nowrap">Care Presets:</span>
              <button
                onClick={() =>
                  loadPreset(
                    'PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0'
                  )
                }
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-rose-300 whitespace-nowrap"
              >
                High Stress
              </button>
              <button
                onClick={() =>
                  loadPreset(
                    'PLANT=ALOE_VERA,ML_CLASS=1,ML_STATUS=MODERATE STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=28,HUM_RH_EST=45,HUM_ADC=3200,SOIL_RAW=3100,LDR_ADC=2100,POT_ADC=1500,SW1=0,SW2=0'
                  )
                }
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 whitespace-nowrap"
              >
                Moderate Stress
              </button>
              <button
                onClick={() =>
                  loadPreset(
                    'PLANT=ALOE_VERA,ML_CLASS=2,ML_STATUS=SUITABLE,TEMP_C_ASSUMED=25,SOIL_PCT=22,HUM_RH_EST=48,HUM_ADC=2900,SOIL_RAW=2400,LDR_ADC=3100,POT_ADC=1800,SW1=0,SW2=0'
                  )
                }
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-emerald-300 whitespace-nowrap"
              >
                Aloe Suitable
              </button>
              <button
                onClick={() =>
                  loadPreset(
                    'PLANT=GOLDEN_POTHOS,ML_CLASS=2,ML_STATUS=SUITABLE,TEMP_C_ASSUMED=25,SOIL_PCT=52,HUM_RH_EST=65,HUM_ADC=2200,SOIL_RAW=1800,LDR_ADC=1800,POT_ADC=2000,SW1=0,SW2=1'
                  )
                }
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-emerald-300 whitespace-nowrap"
              >
                Pothos Suitable
              </button>
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS..."
                className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-mono text-emerald-300 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSend}
                className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Inject
              </button>
            </div>

            {injectResult && (
              <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-mono">
                <CheckCircle2 className="w-3 h-3" /> {injectResult}
              </span>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};
