/**
 * PlantCare AI — ESP8266 WiFi Bidirectional Bridge Firmware
 * 
 * Hardware:
 *   - ESP8266 (NodeMCU v2/v3, Wemos D1 Mini, ESP-12E, or ESP-01)
 *   - STM32 (STM32F401 Black Pill / Nucleo / Blue Pill)
 *
 * Pin Connections:
 *   ESP8266 TX (GPIO1)  ──>  STM32 PA3 (USART2_RX)
 *   ESP8266 RX (GPIO3)  ──>  STM32 PA2 (USART2_TX)
 *   ESP8266 GND         ──>  STM32 GND (Common ground)
 *   ESP8266 VIN (5V)    ──>  5V Rail (or 3.3V for ESP-01)
 *
 * Required Arduino Libraries (Install via Arduino Library Manager):
 *   1. "WebSockets" by Markus Sattler (v2.3.5+)
 *   2. "ESP8266WiFi" (Built-in to ESP8266 board core)
 *   3. "ESP8266WebServer" (Built-in)
 *
 * Features:
 *   ✓ Connects to local WiFi network
 *   ✓ WebSocket Server on port 81 (Ultra low-latency live streaming & commands)
 *   ✓ HTTP REST Server on port 80 (/readings for GET, /cmd for POST/GET commands)
 *   ✓ Bidirectional:
 *       - RECEIVING: Reads STM32 UART at 9600 baud, broadcasts live packets to browser
 *       - TRANSMITTING: Receives commands from browser (CMD:READ, CMD:WATER), writes to STM32 UART
 *   ✓ Prints assigned IP address to Serial on boot for easy browser connection
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>

// ══════════════════════════════════════════════════════════
// 1. WiFi Credentials (EDIT THESE FOR YOUR NETWORK)
// ══════════════════════════════════════════════════════════
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Optional: Fallback Access Point if home WiFi is unavailable
const char* AP_SSID       = "PlantCare-ESP8266";
const char* AP_PASSWORD   = "12345678";

// ══════════════════════════════════════════════════════════
// 2. Servers
// ══════════════════════════════════════════════════════════
WebSocketsServer webSocket = WebSocketsServer(81); // Port 81 for live WebSocket stream
ESP8266WebServer httpServer(80);                  // Port 80 for HTTP REST fallback

// Buffer to store latest telemetry packet from STM32
String latestTelemetry = "PLANT=ALOE_VERA,ML_CLASS=2,ML_STATUS=SUITABLE,TEMP_C_ASSUMED=25,SOIL_PCT=25,HUM_RH_EST=50,HUM_ADC=3000,SOIL_RAW=2500,LDR_ADC=3200,POT_ADC=1500,SW1=0,SW2=0";
unsigned long lastPacketTime = 0;

// ══════════════════════════════════════════════════════════
// 3. WebSocket Event Handler
// ══════════════════════════════════════════════════════════
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      // Client disconnected
      break;

    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      // When browser connects, immediately send latest cached telemetry
      if (latestTelemetry.length() > 0) {
        webSocket.sendTXT(num, latestTelemetry);
      }
      break;
    }

    case WStype_TEXT: {
      // ── TRANSMITTING: Received command from browser! ──
      // Forward command directly out to STM32 UART
      String cmd = String((char*)payload);
      cmd.trim();
      if (cmd.length() > 0) {
        Serial.println(cmd); // Transmit to STM32 UART!
        // Echo confirmation back to client
        webSocket.sendTXT(num, "[ACK] Forwarded to STM32: " + cmd);
      }
      break;
    }

    default:
      break;
  }
}

// ══════════════════════════════════════════════════════════
// 4. HTTP Server Endpoints (CORS Enabled)
// ══════════════════════════════════════════════════════════
void setupHttpEndpoints() {
  // Enable CORS on all responses
  httpServer.enableCORS(true);

  // Status & Latest Readings endpoint
  httpServer.on("/readings", HTTP_GET, []() {
    httpServer.sendHeader("Access-Control-Allow-Origin", "*");
    httpServer.send(200, "text/plain", latestTelemetry);
  });

  httpServer.on("/status", HTTP_GET, []() {
    httpServer.sendHeader("Access-Control-Allow-Origin", "*");
    String json = "{\"status\":\"online\",\"uptime_ms\":" + String(millis()) +
                  ",\"clients\":" + String(webSocket.connectedClients()) +
                  ",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
    httpServer.send(200, "application/json", json);
  });

  // Command Transmit endpoint (POST /cmd or GET /cmd?text=...)
  httpServer.on("/cmd", HTTP_POST, []() {
    httpServer.sendHeader("Access-Control-Allow-Origin", "*");
    String body = httpServer.arg("plain");
    body.trim();
    if (body.length() > 0) {
      Serial.println(body); // Transmit to STM32 UART!
      httpServer.send(200, "text/plain", "OK: Forwarded to STM32: " + body);
    } else {
      httpServer.send(400, "text/plain", "Error: empty command");
    }
  });

  httpServer.on("/cmd", HTTP_GET, []() {
    httpServer.sendHeader("Access-Control-Allow-Origin", "*");
    if (httpServer.hasArg("text")) {
      String cmd = httpServer.arg("text");
      cmd.trim();
      Serial.println(cmd); // Transmit to STM32 UART!
      httpServer.send(200, "text/plain", "OK: Forwarded to STM32: " + cmd);
    } else {
      httpServer.send(400, "text/plain", "Usage: /cmd?text=CMD:READ");
    }
  });

  // Root landing page
  httpServer.on("/", HTTP_GET, []() {
    String html = "<html><head><title>PlantCare ESP8266 Bridge</title></head>";
    html += "<body style='font-family:sans-serif;padding:20px;background:#f5f8f5;'>";
    html += "<h2>🌿 PlantCare AI — ESP8266 Bridge</h2>";
    html += "<p><b>IP Address:</b> " + WiFi.localIP().toString() + "</p>";
    html += "<p><b>WebSocket Port:</b> 81 (ws://" + WiFi.localIP().toString() + ":81)</p>";
    html += "<p><b>Latest STM32 Telemetry:</b><br><code>" + latestTelemetry + "</code></p>";
    html += "<hr><p>Enter this IP in your PlantCare AI Web App Settings to stream live!</p>";
    html += "</body></html>";
    httpServer.send(200, "text/html", html);
  });
}

// ══════════════════════════════════════════════════════════
// 5. Setup
// ══════════════════════════════════════════════════════════
void setup() {
  // Initialize Hardware UART at 9600 baud (matching STM32 huart2 baud rate)
  Serial.begin(9600);
  delay(100);

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Wait up to 15 seconds for connection
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    attempts++;
  }

  // If WiFi failed, spin up SoftAP fallback mode
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_SSID, AP_PASSWORD);
  }

  // Start WebSocket Server on port 81
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  // Start HTTP Server on port 80
  setupHttpEndpoints();
  httpServer.begin();

  // Announce IP address over Serial (can be viewed in Arduino Serial Monitor)
  IPAddress ip = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP() : WiFi.softAPIP();
  Serial.println();
  Serial.println("==================================================");
  Serial.println("🌿 PlantCare AI — ESP8266 WiFi Bridge Active!");
  Serial.print("   IP Address: ");
  Serial.println(ip);
  Serial.println("   WebSocket:  ws://" + ip.toString() + ":81");
  Serial.println("   HTTP REST:  http://" + ip.toString() + "/readings");
  Serial.println("   Baud Rate:  9600 baud (matching STM32 USART2)");
  Serial.println("==================================================");
}

// ══════════════════════════════════════════════════════════
// 6. Main Loop
// ══════════════════════════════════════════════════════════
void loop() {
  // Service WebSocket clients & HTTP requests
  webSocket.loop();
  httpServer.handleClient();

  // ── RECEIVING: Read incoming UART line from STM32 ──
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();

    // Verify it is a valid STM32 telemetry line
    if (line.length() > 0 && (line.indexOf('=') != -1 || line.startsWith("{"))) {
      latestTelemetry = line;
      lastPacketTime = millis();

      // Broadcast immediately to ALL connected browser clients over WiFi WebSocket!
      webSocket.broadcastTXT(line);
    }
  }
}
