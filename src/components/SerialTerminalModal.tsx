import React, { useState, useEffect, useRef } from 'react';
import { usePlant } from '../context/PlantContext';
import { X, Terminal, Send, CheckCircle2, Cpu, Zap, AlertCircle, ChevronDown, Wifi, Radio, RefreshCw } from 'lucide-react';
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
    connectWifi,
    espIp,
    setEspIp,
    espPort,
    setEspPort,
    transmitCommand,
    disconnectHardware,
    currentReading,
    hasRealReading,
  } = usePlant();

  const [activeTab, setActiveTab] = useState<'wifi' | 'serial'>('wifi');
  const [wifiIpInput, setWifiIpInput] = useState<string>(espIp || '192.168.1.100');
  const [wifiPortInput, setWifiPortInput] = useState<number>(espPort || 81);
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isConnecting, setIsConnecting] = useState(false);

  const [commandInput, setCommandInput] = useState<string>('CMD:READ');
  const [customPacketInput, setCustomPacketInput] = useState<string>(
    'PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0'
  );
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const isSerialSupported = webSerial.isSupported();
  const isConnected = connectionState === 'connected';

  // Sync state if context changes
  useEffect(() => {
    if (espIp) setWifiIpInput(espIp);
  }, [espIp]);

  useEffect(() => {
    if (espPort) setWifiPortInput(espPort);
  }, [espPort]);

  // Auto-scroll terminal log to bottom on new messages
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [serialLogs]);

  if (!isOpen) return null;

  const handleWifiConnect = () => {
    const cleanIp = wifiIpInput.trim();
    if (!cleanIp) return;
    setEspIp(cleanIp);
    setEspPort(wifiPortInput);
    connectWifi(cleanIp, wifiPortInput);
  };

  const handleSerialConnect = async () => {
    setIsConnecting(true);
    try {
      await connectSerial(baudRate);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTransmit = async () => {
    const cmd = commandInput.trim();
    if (!cmd) return;
    const ok = await transmitCommand(cmd);
    setActionFeedback(ok ? `✓ Transmitted: ${cmd}` : `✕ Transmit failed`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleInjectPacket = () => {
    if (!customPacketInput.trim()) return;
    const ok = injectManualPacket(customPacketInput.trim());
    setActionFeedback(ok ? '✓ Packet parsed & applied!' : '✕ Parse error');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-xs font-mono font-bold text-stone-200 block">
                STM32 & ESP8266 Telemetry & Command Monitor
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                {activeProfile.name} • WiFi & Serial Bidirectional Link
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
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'}`} />
              {isConnected ? `${connectionProtocol.toUpperCase()}: LIVE` : connectionState.toUpperCase()}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Connection Bar */}
        <div className="p-3.5 bg-stone-950/80 border-b border-stone-800">
          {!isConnected ? (
            <div className="space-y-3">
              {/* Protocol Selector Tabs */}
              <div className="flex items-center gap-2 p-1 bg-stone-900 rounded-xl border border-stone-800">
                <button
                  onClick={() => setActiveTab('wifi')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'wifi'
                      ? 'bg-blue-600 text-white shadow-soft'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>ESP8266 WiFi (Primary)</span>
                </button>
                <button
                  onClick={() => setActiveTab('serial')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'serial'
                      ? 'bg-emerald-600 text-white shadow-soft'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>USB Serial Direct</span>
                </button>
              </div>

              {/* Tab 1: ESP8266 WiFi Controls */}
              {activeTab === 'wifi' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-stone-500 font-mono block mb-1">
                        ESP8266 IP Address (ws://IP:Port)
                      </label>
                      <input
                        type="text"
                        value={wifiIpInput}
                        onChange={(e) => setWifiIpInput(e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-700 bg-stone-900 text-xs font-mono text-blue-300 placeholder:text-stone-600 focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleWifiConnect()}
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] text-stone-500 font-mono block mb-1">Port</label>
                      <input
                        type="number"
                        value={wifiPortInput}
                        onChange={(e) => setWifiPortInput(parseInt(e.target.value) || 81)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-stone-700 bg-stone-900 text-xs font-mono text-stone-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleWifiConnect}
                    className="w-full py-2 px-4 rounded-xl font-bold text-xs font-mono flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg transition-all active:scale-[0.98]"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>⚡ Connect ESP8266 WiFi (ws://{wifiIpInput}:{wifiPortInput})</span>
                  </button>
                  <p className="text-[10px] text-stone-500 leading-tight">
                    ESP8266 reads STM32 UART at 9600 baud and streams to this browser over local WiFi WebSocket.
                  </p>
                </div>
              )}

              {/* Tab 2: USB Serial Controls */}
              {activeTab === 'serial' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>Direct STM32 USB-UART Connection</span>
                    <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-xl p-1">
                      <span className="text-stone-500 px-1 text-[10px] font-mono">Baud:</span>
                      {[9600, 115200].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setBaudRate(rate)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                            baudRate === rate ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {rate}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSerialConnect}
                    disabled={isConnecting || !isSerialSupported}
                    className={`w-full py-2 px-4 rounded-xl font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      isSerialSupported
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    <span>{isConnecting ? 'Opening port selector...' : '⚡ Select STM32 USB Port'}</span>
                  </button>

                  {!isSerialSupported && (
                    <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center gap-2 text-[10px] text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Web Serial requires Chrome or Edge on Windows desktop.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Connected state */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300 font-mono block">
                      Live Stream Active ({connectionProtocol.toUpperCase()})
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {connectedDeviceName || 'STM32 Hardware'} • Bidirectional Link Ready
                    </span>
                  </div>
                </div>
                <button
                  onClick={disconnectHardware}
                  className="py-1 px-3 rounded-xl bg-stone-800 hover:bg-rose-950/80 border border-stone-700 hover:border-rose-700 text-stone-300 hover:text-rose-300 text-xs font-mono transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Live mini telemetry strip */}
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
                {[
                  { label: 'SOIL', value: hasRealReading ? `${currentReading.moisture}%` : '--', color: 'text-emerald-400' },
                  { label: 'TEMP', value: hasRealReading ? `${currentReading.temperature}°C` : '--', color: 'text-amber-400' },
                  { label: 'LIGHT', value: hasRealReading ? `${currentReading.light}` : '--', color: 'text-yellow-400' },
                  { label: 'ML', value: hasRealReading ? currentReading.condition : 'WAIT', color: 'text-blue-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-1.5 bg-stone-900 border border-stone-800 rounded-lg text-center">
                    <span className="text-stone-500 block text-[9px]">{label}</span>
                    <span className={`${color} font-bold truncate block`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Stream Terminal (RX / TX / SYS) */}
        <div
          ref={logContainerRef}
          className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-stone-950/90 select-text min-h-[220px]"
        >
          {serialLogs.length === 0 ? (
            <div className="text-stone-600 italic py-12 text-center space-y-1">
              <p>
                {isConnected
                  ? 'Waiting for first UART telemetry packet from ESP8266 / STM32...'
                  : 'Connect to ESP8266 WiFi or USB Serial above to begin live streaming.'}
              </p>
            </div>
          ) : (
            [...serialLogs].reverse().map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const isRx = log.direction === 'in';
              const isSys = log.direction === 'sys';
              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[10px] text-stone-500 whitespace-nowrap">{time}</span>
                  <span
                    className={`text-[9px] px-1 rounded font-bold ${
                      isRx
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : isSys
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}
                  >
                    {log.direction === 'in' ? 'RX' : log.direction === 'sys' ? 'SYS' : 'TX'}
                  </span>
                  <span
                    className={`break-all ${
                      isRx ? 'text-stone-300' : isSys ? 'text-amber-300' : 'text-blue-300 font-semibold'
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Transmit Command Console (Bidirectional Control) */}
        <div className="p-3 bg-stone-900 border-t border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-blue-400" />
              <span>Transmit to Hardware (ESP8266 → STM32 UART)</span>
            </span>
            {actionFeedback && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {actionFeedback}
              </span>
            )}
          </div>

          {/* Quick Command Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono pb-0.5">
            {[
              { label: 'CMD:READ', desc: 'Trigger Sensor Read' },
              { label: 'CMD:WATER', desc: 'Test Water Relay' },
              { label: 'CMD:PING', desc: 'Ping ESP8266' },
              { label: 'CMD:RESET', desc: 'Reset State' },
            ].map(({ label, desc }) => (
              <button
                key={label}
                onClick={() => setCommandInput(label)}
                title={desc}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Transmit Input + Send */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter command to transmit (e.g. CMD:READ)..."
              onKeyDown={(e) => e.key === 'Enter' && handleTransmit()}
              className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-mono text-blue-300 placeholder:text-stone-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleTransmit}
              disabled={!isConnected}
              className={`px-3.5 py-1.5 rounded-xl font-medium text-xs font-mono flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                isConnected
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-soft'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Transmit TX</span>
            </button>
          </div>
        </div>

        {/* Collapsible: Offline Manual Testing */}
        <details className="group border-t border-stone-800 bg-stone-900/60">
          <summary className="px-4 py-2 text-[11px] font-mono text-stone-500 hover:text-stone-300 cursor-pointer select-none flex items-center justify-between transition-colors">
            <span>🛠️ Offline Debug / Manual Packet Inject</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="p-3 border-t border-stone-800/60 space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono pb-1">
              {[
                {
                  label: 'High Stress',
                  color: 'text-rose-300',
                  val: 'PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0',
                },
                {
                  label: 'Moderate',
                  color: 'text-amber-300',
                  val: 'PLANT=ALOE_VERA,ML_CLASS=1,ML_STATUS=MODERATE STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=28,HUM_RH_EST=45,HUM_ADC=3200,SOIL_RAW=3100,LDR_ADC=2100,POT_ADC=1500,SW1=0,SW2=0',
                },
                {
                  label: 'Suitable',
                  color: 'text-emerald-300',
                  val: 'PLANT=ALOE_VERA,ML_CLASS=2,ML_STATUS=SUITABLE,TEMP_C_ASSUMED=25,SOIL_PCT=22,HUM_RH_EST=48,HUM_ADC=2900,SOIL_RAW=2400,LDR_ADC=3100,POT_ADC=1800,SW1=0,SW2=0',
                },
              ].map(({ label, color, val }) => (
                <button
                  key={label}
                  onClick={() => setCustomPacketInput(val)}
                  className={`px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 whitespace-nowrap ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPacketInput}
                onChange={(e) => setCustomPacketInput(e.target.value)}
                className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-mono text-emerald-300 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleInjectPacket}
                className="px-3.5 py-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-medium text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Inject
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
