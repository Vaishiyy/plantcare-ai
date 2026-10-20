import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { X, Terminal, Send, Trash2, CheckCircle2 } from 'lucide-react';

interface SerialTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SerialTerminalModal: React.FC<SerialTerminalModalProps> = ({ isOpen, onClose }) => {
  const { serialLogs, injectManualPacket, connectionProtocol, connectionState } = usePlant();
  const [customInput, setCustomInput] = useState<string>(
    '{"moisture": 42, "temperature": 30.0, "humidity": 48, "light": 750, "condition": "Needs Water"}'
  );
  const [injectResult, setInjectResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!customInput.trim()) return;
    const ok = injectManualPacket(customInput.trim());
    if (ok) {
      setInjectResult('Packet parsed & processed successfully!');
    } else {
      setInjectResult('Parse error: ensure payload matches JSON format.');
    }
    setTimeout(() => setInjectResult(null), 3000);
  };

  const loadPreset = (json: string) => {
    setCustomInput(json);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-stone-200">
              STM32 UART Telemetry Monitor
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
              Mode: {connectionProtocol.toUpperCase()} ({connectionState})
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preset sample buttons */}
        <div className="px-3 py-2 bg-stone-900/90 border-b border-stone-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
          <span className="text-stone-400 text-[10px] whitespace-nowrap">Load Preset:</span>
          <button
            onClick={() =>
              loadPreset('{"moisture": 62, "temperature": 23.5, "humidity": 55, "light": 820, "condition": "Healthy"}')
            }
            className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-emerald-300 whitespace-nowrap"
          >
            Healthy
          </button>
          <button
            onClick={() =>
              loadPreset('{"moisture": 32, "temperature": 24.0, "humidity": 45, "light": 700, "condition": "Needs Water"}')
            }
            className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 whitespace-nowrap"
          >
            Needs Water
          </button>
          <button
            onClick={() =>
              loadPreset('{"moisture": 14, "temperature": 28.5, "humidity": 32, "light": 900, "condition": "Too Dry"}')
            }
            className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-orange-300 whitespace-nowrap"
          >
            Too Dry
          </button>
          <button
            onClick={() =>
              loadPreset('{"moisture": 50, "temperature": 34.8, "humidity": 88, "light": 120, "condition": "Poor Environment"}')
            }
            className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-rose-300 whitespace-nowrap"
          >
            Poor Env
          </button>
        </div>

        {/* Log Viewer */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-stone-950/70 select-text">
          {serialLogs.length === 0 ? (
            <div className="text-stone-600 italic py-8 text-center">
              No UART transmissions captured yet. Waiting for incoming telemetry...
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

        {/* Packet Injector Form */}
        <div className="p-3 bg-stone-900 border-t border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>Manual Packet Injector (STM32 JSON Format):</span>
            {injectResult && (
              <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> {injectResult}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder='{"moisture": 42, "temperature": 30.0, "humidity": 48, "light": 750, "condition": "Needs Water"}'
              className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSend}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-soft"
            >
              <Send className="w-3.5 h-3.5" />
              Inject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
