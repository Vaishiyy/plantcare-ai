import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { SerialTerminalModal } from '../components/SerialTerminalModal';
import { EditPlantModal } from '../components/EditPlantModal';
import {
  Bluetooth,
  Radio,
  Cpu,
  Download,
  Terminal,
  Info,
  Code,
  Database,
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
  const [activeInfoTab, setActiveInfoTab] = useState<'about' | 'protocol' | 'model'>('model');

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

        <div className="p-3 bg-cream-50/80 rounded-2xl border border-cream-200 text-xs text-stone-700 flex items-start gap-2">
          <Info className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-forest-900">Link Status:</span>
            <p className="leading-snug">{statusMessage}</p>
          </div>
        </div>

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
                Dataset Simulation Mode
              </span>
            </div>
            <span className="text-[11px] text-stone-500 block">
              Stream records from the 4,500-sample training dataset
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

      {/* App Preferences */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card space-y-4">
        <h3 className="text-sm font-bold font-display text-forest-900">
          Preferences & Telemetry Settings
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-800 block">
              Sensor Polling Interval
            </span>
            <span className="text-[11px] text-stone-500">
              Playback frequency of telemetry
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
          </select>
        </div>

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

        <div className="flex items-center justify-between pt-2 border-t border-cream-100">
          <div>
            <span className="text-xs font-bold text-stone-800 block">
              Active Plant: {activeProfile.name}
            </span>
            <span className="text-[11px] text-stone-500">
              Code: {activeProfile.plantCode} ({activeProfile.speciesKey})
            </span>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-forest-800 text-xs font-semibold transition-colors border border-cream-300"
          >
            Configure
          </button>
        </div>

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

      {/* Model & Architecture Documentation */}
      <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-cream-200 pb-2">
          <div className="flex items-center gap-1.5">
            <Code className="w-4 h-4 text-forest-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Model & System Documentation
            </h3>
          </div>

          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setActiveInfoTab('model')}
              className={`px-2 py-1 rounded-lg font-medium ${
                activeInfoTab === 'model'
                  ? 'bg-forest-600 text-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              ML Model
            </button>
            <button
              onClick={() => setActiveInfoTab('protocol')}
              className={`px-2 py-1 rounded-lg font-medium ${
                activeInfoTab === 'protocol'
                  ? 'bg-forest-600 text-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Protocol
            </button>
            <button
              onClick={() => setActiveInfoTab('about')}
              className={`px-2 py-1 rounded-lg font-medium ${
                activeInfoTab === 'about'
                  ? 'bg-forest-600 text-white'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Hardware
            </button>
          </div>
        </div>

        {activeInfoTab === 'model' && (
          <div className="text-xs text-stone-600 space-y-2 leading-relaxed">
            <p>
              The application executes the exact C Decision Tree (<code>predict_plant_suitability</code>) from <code>plant_suitability_model.c</code> and <code>plant_suitability_model.h</code>.
            </p>
            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 space-y-1 font-mono text-[11px]">
              <div><strong>features[0]:</strong> Plant Type (0 = Aloe Vera, 1 = Pothos)</div>
              <div><strong>features[1]:</strong> Soil moisture percentage (0-100%)</div>
              <div><strong>features[2]:</strong> Temperature in Celsius (°C)</div>
              <div><strong>features[3]:</strong> Air humidity percentage (0-100%)</div>
              <div><strong>features[4]:</strong> LDR ADC reading (0-4095)</div>
              <div className="pt-1 border-t border-cream-200 font-sans">
                <strong>Output Classes:</strong> <code>0 = High stress</code>, <code>1 = Moderate stress</code>, <code>2 = Suitable</code>
              </div>
              <div className="font-sans text-forest-800 font-bold">
                Validation Accuracy: 97.56% on 4,500 training rows
              </div>
            </div>
          </div>
        )}

        {activeInfoTab === 'protocol' && (
          <div className="space-y-2 text-xs">
            <p className="text-stone-600 leading-snug">
              Transmitted ASCII JSON frames over Bluetooth UART at 9600 baud, delimited by <code>\r\n</code>:
            </p>
            <pre className="p-3 bg-stone-900 text-emerald-300 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "moisture": 49.1,
  "temperature": 33.4,
  "humidity": 48.8,
  "light": 2161,
  "condition": "Moderate Stress"
}`}
            </pre>
          </div>
        )}

        {activeInfoTab === 'about' && (
          <div className="text-xs text-stone-600 space-y-1.5">
            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 text-[11px] space-y-1">
              <div><strong>PA0 (ADC1_IN0):</strong> Analog Soil Moisture Probe</div>
              <div><strong>PA1 (ADC1_IN1):</strong> LDR Light Sensor (0-4095)</div>
              <div><strong>PA2/PA3 (USART2):</strong> HC-05 / HM-10 Bluetooth Module</div>
              <div><strong>PA4 (GPIO):</strong> DHT11 Temperature & Air Humidity Sensor</div>
              <div><strong>PB6/PB7 (I2C1):</strong> SSD1306 0.96" OLED Display</div>
            </div>
          </div>
        )}
      </div>

      <SerialTerminalModal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
      <EditPlantModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
};
