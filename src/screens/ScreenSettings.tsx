import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { SerialTerminalModal } from '../components/SerialTerminalModal';
import { EditPlantModal } from '../components/EditPlantModal';
import {
  Bluetooth,
  Radio,
  Sliders,
  Cpu,
  Download,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
  ExternalLink,
  Code,
} from 'lucide-react';

export const ScreenSettings: React.FC = () => {
  const {
    connectionState,
    connectionProtocol,
    connectedDeviceName,
    statusMessage,
    connectBle,
    connectSerial,
    disconnectHardware,
    isDemoMode,
    setIsDemoMode,
    refreshInterval,
    setRefreshInterval,
    tempUnit,
    setTempUnit,
    exportCsv,
    activeProfile,
  } = usePlant();

  const [isConnecting, setIsConnecting] = useState(false);
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'about' | 'protocol' | 'hardware'>('about');

  const handleBleConnect = async () => {
    setIsConnecting(true);
    await connectBle();
    setIsConnecting(false);
  };

  const handleSerialConnect = async () => {
    setIsConnecting(true);
    await connectSerial(baudRate);
    setIsConnecting(false);
  };

  const handleExport = () => {
    const ok = exportCsv();
    if (ok) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Device Connection & Bluetooth Card */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-forest-100 text-forest-700">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-forest-900">
                Hardware & Wireless Link
              </h2>
              <span className="text-xs text-stone-500">
                STM32 Bluetooth (BLE or HC-05 Classic UART)
              </span>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              connectionState === 'connected'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : connectionState === 'connecting'
                ? 'bg-blue-50 border-blue-300 text-blue-800 animate-pulse'
                : 'bg-stone-100 border-stone-200 text-stone-600'
            }`}
          >
            {connectionState === 'connected'
              ? 'Connected'
              : connectionState === 'connecting'
              ? 'Scanning...'
              : 'Disconnected'}
          </span>
        </div>

        {/* Status explanation */}
        <div className="p-3 bg-cream-50/80 rounded-2xl border border-cream-200 text-xs text-stone-700 flex items-start gap-2">
          <Info className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-forest-900">Link Status:</span>
            <p className="leading-snug">{statusMessage}</p>
          </div>
        </div>

        {/* Connection Action Buttons */}
        {connectionState === 'connected' ? (
          <div className="space-y-2">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  {connectedDeviceName || 'Connected Peripheral'}
                </span>
                <span className="text-[11px] text-emerald-700">
                  Streaming telemetry via {connectionProtocol.toUpperCase()}
                </span>
              </div>
              <button
                onClick={disconnectHardware}
                className="py-1.5 px-3 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors shadow-soft"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option A: Web Bluetooth (BLE) */}
              <button
                onClick={handleBleConnect}
                disabled={isConnecting}
                className="py-3 px-3 rounded-2xl bg-forest-600 hover:bg-forest-700 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-soft transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5">
                  <Bluetooth className="w-4 h-4" />
                  <span>Connect BLE</span>
                </div>
                <span className="text-[10px] font-normal text-sage-200">
                  HM-10 / ESP32 GATT
                </span>
              </button>

              {/* Option B: Web Serial (HC-05 / USB-UART) */}
              <button
                onClick={handleSerialConnect}
                disabled={isConnecting}
                className="py-3 px-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-300 text-forest-900 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-forest-700" />
                  <span>Connect Serial</span>
                </div>
                <span className="text-[10px] font-normal text-stone-500">
                  HC-05 / USB COM Port
                </span>
              </button>
            </div>

            {/* Serial Baud Rate Selector */}
            <div className="flex items-center justify-between text-xs text-stone-600 px-1">
              <span>Serial Baud Rate:</span>
              <div className="flex gap-1.5">
                {[9600, 115200].map((baud) => (
                  <button
                    key={baud}
                    onClick={() => setBaudRate(baud)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      baudRate === baud
                        ? 'bg-forest-600 text-white'
                        : 'bg-cream-100 text-stone-600 border border-cream-200'
                    }`}
                  >
                    {baud}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demo Mode Toggle */}
        <div className="pt-3 border-t border-cream-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-stone-800">
                Demo Simulation Mode
              </span>
            </div>
            <span className="text-[11px] text-stone-500 block">
              Generate realistic sensor telemetry without physical hardware
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={(e) => setIsDemoMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-600"></div>
          </label>
        </div>

        {/* Raw Serial Terminal trigger */}
        <div className="pt-2">
          <button
            onClick={() => setIsTerminalOpen(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-emerald-400 font-mono text-xs flex items-center justify-center gap-2 shadow-soft transition-colors"
          >
            <Terminal className="w-4 h-4" />
            <span>Open Raw UART Telemetry Terminal & Packet Injector</span>
          </button>
        </div>
      </div>

      {/* App Preferences Card */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card space-y-4">
        <h3 className="text-sm font-bold font-display text-forest-900">
          Preferences & Telemetry Settings
        </h3>

        {/* Refresh Interval */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-800 block">
              Sensor Polling Interval
            </span>
            <span className="text-[11px] text-stone-500">
              Frequency of readings update
            </span>
          </div>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-cream-300 bg-cream-50 text-xs font-semibold text-forest-900 focus:outline-none focus:border-forest-500"
          >
            <option value={2000}>2 seconds (High)</option>
            <option value={3000}>3 seconds (Standard)</option>
            <option value={5000}>5 seconds (Battery Save)</option>
            <option value={10000}>10 seconds (Slow)</option>
          </select>
        </div>

        {/* Temperature Unit */}
        <div className="flex items-center justify-between pt-2 border-t border-cream-100">
          <div>
            <span className="text-xs font-bold text-stone-800 block">
              Temperature Scale
            </span>
            <span className="text-[11px] text-stone-500">
              Display readings in Celsius or Fahrenheit
            </span>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setTempUnit('C')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tempUnit === 'C'
                  ? 'bg-forest-600 text-white shadow-soft'
                  : 'bg-cream-100 text-stone-600 hover:bg-cream-200'
              }`}
            >
              °C
            </button>
            <button
              onClick={() => setTempUnit('F')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tempUnit === 'F'
                  ? 'bg-forest-600 text-white shadow-soft'
                  : 'bg-cream-100 text-stone-600 hover:bg-cream-200'
              }`}
            >
              °F
            </button>
          </div>
        </div>

        {/* Plant Profile Config Shortcut */}
        <div className="flex items-center justify-between pt-2 border-t border-cream-100">
          <div>
            <span className="text-xs font-bold text-stone-800 block">
              Active Plant: {activeProfile.name}
            </span>
            <span className="text-[11px] text-stone-500">
              Configure species thresholds and care details
            </span>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-forest-800 text-xs font-semibold transition-colors border border-cream-300"
          >
            Configure
          </button>
        </div>

        {/* Export Data */}
        <div className="flex items-center justify-between pt-2 border-t border-cream-100">
          <div>
            <span className="text-xs font-bold text-stone-800 block">
              Export Telemetry History
            </span>
            <span className="text-[11px] text-stone-500">
              Download recorded sensor logs in CSV format
            </span>
          </div>

          <button
            onClick={handleExport}
            className="py-1.5 px-3 rounded-xl bg-forest-600 hover:bg-forest-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-soft transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadSuccess ? 'Downloaded' : 'CSV Export'}</span>
          </button>
        </div>
      </div>

      {/* Embedded Project Documentation & Architecture */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-cream-200 pb-2">
          <div className="flex items-center gap-1.5">
            <Code className="w-4 h-4 text-forest-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              System Documentation
            </h3>
          </div>

          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setActiveInfoTab('about')}
              className={`px-2 py-1 rounded-lg font-medium ${
                activeInfoTab === 'about'
                  ? 'bg-forest-600 text-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveInfoTab('protocol')}
              className={`px-2 py-1 rounded-lg font-medium ${
                activeInfoTab === 'protocol'
                  ? 'bg-forest-600 text-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              UART Protocol
            </button>
            <button
              onClick={() => setActiveInfoTab('hardware')}
              className={`px-2 py-1 rounded-lg font-medium ${
                activeInfoTab === 'hardware'
                  ? 'bg-forest-600 text-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              STM32 Pinout
            </button>
          </div>
        </div>

        {activeInfoTab === 'about' && (
          <div className="text-xs text-stone-600 space-y-2 leading-relaxed">
            <p>
              <strong>PlantCare AI</strong> is an embedded IoT and TinyML project designed for STM32 microcontrollers. It continuously samples physical environmental transducers and executes an on-chip classifier to detect plant health distress before cellular wilting occurs.
            </p>
            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 space-y-1 text-[11px]">
              <div><strong>Core Microcontroller:</strong> STM32F4 / STM32F103 (ARM Cortex-M)</div>
              <div><strong>Sensors:</strong> Soil Moisture (ADC), LDR Light (ADC), DHT11 (GPIO)</div>
              <div><strong>Peripherals:</strong> 0.96" I²C OLED, HC-05 / HM-10 Bluetooth (UART)</div>
              <div><strong>ML Engine:</strong> Embedded TinyML Condition Classifier (4 classes)</div>
            </div>
          </div>
        )}

        {activeInfoTab === 'protocol' && (
          <div className="space-y-2 text-xs">
            <p className="text-stone-600 leading-snug">
              The STM32 transmits a JSON-formatted ASCII frame delimited by <code>\r\n</code> over UART at 9600 or 115200 baud:
            </p>
            <pre className="p-3 bg-stone-900 text-emerald-300 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "moisture": 42,
  "temperature": 30.0,
  "humidity": 48,
  "light": 750,
  "condition": "Needs Water"
}`}
            </pre>
            <p className="text-[11px] text-stone-500">
              Valid conditions: <code>"Healthy"</code>, <code>"Needs Water"</code>, <code>"Too Dry"</code>, <code>"Poor Environment"</code>.
            </p>
          </div>
        )}

        {activeInfoTab === 'hardware' && (
          <div className="text-xs text-stone-600 space-y-1.5">
            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 text-[11px] space-y-1">
              <div><strong>PA0 (ADC1_IN0):</strong> Analog Soil Moisture Sensor</div>
              <div><strong>PA1 (ADC1_IN1):</strong> Light Dependent Resistor (LDR)</div>
              <div><strong>PA2 / PA3 (USART2 TX/RX):</strong> HC-05 Bluetooth Module</div>
              <div><strong>PB6 / PB7 (I2C1 SCL/SDA):</strong> SSD1306 0.96" OLED Display</div>
              <div><strong>PA4 (GPIO):</strong> DHT11 Temperature & Humidity Data Pin</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SerialTerminalModal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
      <EditPlantModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
};
