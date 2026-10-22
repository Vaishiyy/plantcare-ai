import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { SerialTerminalModal } from '../components/SerialTerminalModal';
import { EditPlantModal } from '../components/EditPlantModal';
import {
  Bluetooth,
  Wifi,
  Cpu,
  Download,
  Terminal,
  Info,
  Code,
  Database,
  Cloud,
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  Radio,
} from 'lucide-react';

export const ScreenSettings: React.FC = () => {
  const {
    connectionState,
    connectionProtocol,
    connectedDeviceName,
    statusMessage,
    connectBle,
    connectSerial,
    connectWifi,
    connectCloud,
    testCloudIngestion,
    injectManualPacket,
    disconnectHardware,
    isDemoMode,
    setIsDemoMode,
    refreshInterval,
    setRefreshInterval,
    tempUnit,
    setTempUnit,
    exportCsv,
    activeProfile,
    espIp,
    setEspIp,
    espPort: contextEspPort,
    setEspPort: contextSetEspPort,
    transmitCommand,
  } = usePlant();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [manualLineInput, setManualLineInput] = useState('');
  const [manualIngestMsg, setManualIngestMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [authTokenInput, setAuthTokenInput] = useState('');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'about' | 'protocol' | 'model'>('model');
  const [espIpInput, setEspIpInput] = useState<string>(espIp);
  const [espPort, setEspPort] = useState<number>(81);

  const handleCloudConnect = async () => {
    setIsConnecting(true);
    await connectCloud();
    setIsConnecting(false);
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    const res = await testCloudIngestion(authTokenInput.trim() || undefined);
    setIsTestingPing(false);
    if (res.success) {
      setPingResult('Test telemetry ingested & verified!');
    } else {
      setPingResult(`Error: ${res.message || 'Failed to reach API'}`);
    }
    setTimeout(() => setPingResult(null), 4000);
  };

  const copyEndpointUrl = () => {
    const url = `${window.location.origin}/api/telemetry`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

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

  const handleWifiConnect = () => {
    const trimmedIp = espIpInput.trim();
    if (!trimmedIp) return;
    setEspIp(trimmedIp);
    connectWifi(trimmedIp, espPort);
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
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-forest-900">
                Hardware & Wireless Link
              </h2>
              <span className="text-xs text-stone-500">
                STM32 ESP8266 WiFi & Hardware Link
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
          <div className="space-y-3">
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  {connectedDeviceName || 'Connected Peripheral'}
                </span>
                <span className="text-[11px] text-emerald-700">
                  Streaming live telemetry via {connectionProtocol.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTerminalOpen(true)}
                  className="py-1.5 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-50 font-semibold text-xs transition-colors shadow-soft flex items-center gap-1"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stream Terminal</span>
                </button>
                <button
                  onClick={disconnectHardware}
                  className="py-1.5 px-3 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors shadow-soft"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Quick Transmit Bar */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-stone-700 shrink-0">Transmit TX:</span>
              <button
                onClick={() => transmitCommand('CMD:READ')}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-800 transition-colors shadow-xs shrink-0"
              >
                CMD:READ
              </button>
              <button
                onClick={() => transmitCommand('CMD:WATER')}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-800 transition-colors shadow-xs shrink-0"
              >
                CMD:WATER
              </button>
              <button
                onClick={() => transmitCommand('CMD:PING')}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-800 transition-colors shadow-xs shrink-0"
              >
                CMD:PING
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. BLUETOOTH: HC-05 (Classic COM Port) & BLE */}
            <div className="p-4 bg-blue-50/90 border-2 border-blue-300 rounded-3xl space-y-3 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-soft">
                    <Bluetooth className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-blue-950 font-display">Bluetooth Link (HC-05 / BLE)</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 border border-blue-300">
                        Hardware Wireless
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-800 block">
                      STM32 → HC-05 (UART) → Windows Bluetooth Virtual COM Port
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-snug">
                Connect directly to your paired <strong>HC-05</strong> Bluetooth module. Make sure it is paired in Windows Bluetooth settings first, then click below to choose the COM port.
              </p>

              {/* Baud Rate Picker */}
              <div className="flex items-center justify-between text-xs text-stone-700 bg-white/80 p-2 rounded-xl border border-blue-200">
                <span className="font-semibold text-stone-800">HC-05 Baud Rate:</span>
                <div className="flex gap-1.5 font-mono">
                  {[9600, 38400, 115200].map((baud) => (
                    <button
                      key={baud}
                      onClick={() => setBaudRate(baud)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                        baudRate === baud
                          ? 'bg-blue-600 text-white shadow-soft'
                          : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                      }`}
                    >
                      {baud}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSerialConnect}
                  disabled={isConnecting}
                  className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-soft transition-all active:scale-[0.98]"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>Connect HC-05 COM</span>
                </button>
                <button
                  onClick={handleBleConnect}
                  disabled={isConnecting}
                  className="py-2.5 px-3 rounded-2xl bg-white hover:bg-stone-50 border border-blue-300 text-blue-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-soft transition-all active:scale-[0.98]"
                >
                  <Radio className="w-3.5 h-3.5 text-blue-600" />
                  <span>Connect BLE (HM-10)</span>
                </button>
              </div>
            </div>

            {/* 2. ESP8266 WiFi WebSocket */}
            <div className="p-4 bg-indigo-50/80 border-2 border-indigo-200 rounded-3xl space-y-3 shadow-soft">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-soft">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-indigo-950 font-display">ESP8266 WiFi Direct Stream</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900 border border-indigo-300">
                      WiFi / WebSocket
                    </span>
                  </div>
                  <span className="text-[11px] text-indigo-800 block">
                    STM32 → ESP8266 (UART) → WiFi → Browser (WebSocket ws://IP:81)
                  </span>
                </div>
              </div>

              {/* IP + Port inputs */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={espIpInput}
                      onChange={(e) => setEspIpInput(e.target.value)}
                      placeholder="192.168.1.100"
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-mono text-stone-800 focus:outline-none focus:border-indigo-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleWifiConnect()}
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={espPort}
                      onChange={(e) => setEspPort(parseInt(e.target.value) || 81)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-mono text-stone-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleWifiConnect}
                    disabled={isConnecting || !espIpInput.trim()}
                    className="py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-soft transition-all active:scale-[0.98]"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Connect WiFi</span>
                  </button>
                  <button
                    onClick={() => setIsTerminalOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-white hover:bg-stone-50 border border-indigo-300 text-indigo-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-soft transition-all active:scale-[0.98]"
                  >
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Open Terminal</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Direct USB Cable (STM32 USB / CH340) */}
            <details className="group p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
              <summary className="cursor-pointer text-xs font-bold text-stone-800 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-700" />
                  <span>Direct USB Cable (CH340 / STM32 USB)</span>
                </div>
                <span className="text-[10px] font-normal text-stone-500 group-open:hidden">Expand</span>
              </summary>
              <div className="pt-3 space-y-2">
                <p className="text-[11px] text-stone-600 leading-snug">
                  Direct wired USB connection using a CH340 / CP2102 adapter or STM32 Virtual COM port.
                </p>
                <button
                  onClick={handleSerialConnect}
                  disabled={isConnecting}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Select USB COM Port</span>
                </button>
              </div>
            </details>

            {/* 4. Cloud Bridge (optional) */}
            <details className="group p-3 bg-stone-50 border border-stone-200 rounded-2xl">
              <summary className="cursor-pointer text-xs font-bold text-stone-800 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-stone-500" />
                  <span>ESP8266 → Cloud HTTP Bridge</span>
                </div>
                <span className="text-[10px] font-normal text-stone-500 group-open:hidden">Expand</span>
              </summary>
              <div className="pt-3 space-y-2.5">
                <p className="text-[11px] text-stone-600 leading-snug">
                  ESP8266 POSTs readings to <code className="bg-stone-100 px-1 rounded text-stone-800">/api/telemetry</code> via HTTP.
                  Web app polls this endpoint. Works from any network (no local WiFi needed).
                </p>
                <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-cream-300 text-[11px] font-mono text-stone-700">
                  <span className="truncate flex-1 select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/telemetry` : '/api/telemetry'}
                  </span>
                  <button onClick={copyEndpointUrl} className="p-1 rounded-lg hover:bg-cream-100 text-stone-500">
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button onClick={handleCloudConnect} disabled={isConnecting}
                  className="w-full py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs transition-colors">
                  Sync Cloud Telemetry
                </button>
              </div>
            </details>
          </div>
        )}

        {/* Hardware-Only Stream Info */}
        <div className="pt-3 border-t border-cream-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-forest-700" />
              <span className="text-xs font-bold text-stone-800">
                Hardware Telemetry Mode
              </span>
            </div>
            <span className="text-[11px] text-stone-500 block">
              Sensor readings and predictions strictly mirror live STM32 hardware
            </span>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setIsTerminalOpen(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-emerald-400 font-mono text-xs flex items-center justify-center gap-2 shadow-soft transition-colors"
          >
            <Terminal className="w-4 h-4" />
            <span>Open Device Serial Terminal & Diagnostics</span>
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
              {activeProfile.species}
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
              System & Hardware Specifications
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
              Care Logic
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
              Plant health is determined in real-time by an embedded classification algorithm evaluating the live microclimate against biological safety thresholds.
            </p>
            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 space-y-1 text-[11px]">
              <div><strong>Botanical Species:</strong> Aloe Vera / Golden Pothos</div>
              <div><strong>Soil Moisture:</strong> Volumetric moisture percentage (0–100%)</div>
              <div><strong>Ambient Temperature:</strong> Thermal comfort range in Celsius (°C)</div>
              <div><strong>Relative Air Humidity:</strong> Transpiration boundary in percentage (0–100%)</div>
              <div><strong>Sunlight Exposure:</strong> Photosynthetic light level (Lux)</div>
              <div className="pt-1 border-t border-cream-200">
                <strong>Evaluated States:</strong> Healthy & Thriving, Needs Attention, Critical Stress
              </div>
            </div>
          </div>
        )}

        {activeInfoTab === 'protocol' && (
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-stone-800 block mb-1">
                1. STM32 UART Transmission Format (9600 baud, \r\n delimited):
              </span>
              <pre className="p-3 bg-stone-900 text-emerald-300 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">
PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0
              </pre>
            </div>

            <div>
              <span className="font-semibold text-stone-800 block mb-1">
                2. ESP8266 Arduino Sketch — WebSocket Server (port 81):
              </span>
              <pre className="p-3 bg-stone-900 text-yellow-300 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">{`#include <ESP8266WiFi.h>
#include <WebSocketsServer.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebSocketsServer webSocket(81);

void setup() {
  Serial.begin(9600); // Match STM32 baud
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.print("IP: "); Serial.println(WiFi.localIP());
  webSocket.begin();
}

void loop() {
  webSocket.loop();
  if (Serial.available()) {
    String line = Serial.readStringUntil('\\n');
    line.trim();
    if (line.length() > 0)
      webSocket.broadcastTXT(line); // forward to browser
  }
}`}</pre>
            </div>

            <div>
              <span className="font-semibold text-stone-800 block mb-1">
                3. ESP8266 HTTP POST to Cloud Bridge (alternative):
              </span>
              <pre className="p-3 bg-stone-900 text-sky-300 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed">{`POST /api/telemetry HTTP/1.1
Host: plantcare-ai-mocha.vercel.app
Content-Type: text/plain

PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,...`}</pre>
            </div>
          </div>
        )}

        {activeInfoTab === 'about' && (
          <div className="text-xs text-stone-600 space-y-1.5">
            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 text-[11px] space-y-1">
              <div><strong>PA0 (ADC1_IN0):</strong> Analog Soil Moisture Probe</div>
              <div><strong>PA1 (ADC1_IN1):</strong> LDR Light Sensor (0-4095)</div>
              <div><strong>PA2/PA3 (USART2):</strong> ESP8266 WiFi Module (TX→PA3, RX→PA2, 9600 baud)</div>
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
