# 🔬 PlantCare AI — Hardware & ESP8266 WiFi Firmware Guide

This guide documents the physical hardware architecture, STM32 pin mappings, sensor calibration, **ESP8266 WiFi module configuration**, and bidirectional firmware code (receiving sensor telemetry and transmitting control commands).

---

## 1. System Hardware Architecture

The physical embedded system consists of:
- **STM32 Microcontroller**: STM32F401 Black Pill / STM32F103 ("Blue Pill") / STM32F411 Nucleo (ARM Cortex-M core).
- **Soil Moisture Sensor**: Analog resistive/capacitive soil probe connected to an ADC channel.
- **Light Dependent Resistor (LDR)**: Voltage divider circuit connected to an ADC channel.
- **DHT11**: Digital Temperature and Humidity sensor connected to a GPIO pin.
- **WiFi Module**: **ESP8266** (NodeMCU / Wemos D1 Mini / ESP-12E / ESP-01) running the PlantCare WebSocket & HTTP bridge.
- **OLED Display**: 0.96" SSD1306 (128x64) communicating over I²C.

---

## 2. STM32 Pinout Connections

| Sensor / Module | Module Pin | STM32 Pin | Peripheral Type | Description |
|---|---|---|---|---|
| **Soil Moisture Sensor** | `AOUT` | `PA0` | `ADC1_IN0` | 12-bit ADC reading (0-4095 mapped to 0-100%) |
| | `VCC` | `3.3V` / `5V` | Power | Power rail |
| | `GND` | `GND` | Ground | System Ground |
| **LDR Light Sensor** | `AOUT` / Divider | `PA1` | `ADC1_IN1` | 12-bit ADC reading (relative lux intensity) |
| | `VCC` | `3.3V` | Power | Power rail |
| | `GND` | `GND` | Ground | Ground |
| **DHT11 Sensor** | `DATA` | `PA4` | `GPIO_Output / Input` | Single-wire bidirectional DHT protocol |
| | `VCC` | `3.3V` / `5V` | Power | Power rail (add 4.7kΩ pull-up to VCC) |
| | `GND` | `GND` | Ground | Ground |
| **ESP8266 WiFi Module** | `TXD` (GPIO1) | `PA3` | `USART2_RX` | Connect ESP8266 TX to STM32 RX (Receiving commands/data) |
| | `RXD` (GPIO3) | `PA2` | `USART2_TX` | Connect ESP8266 RX to STM32 TX (Transmitting telemetry) |
| | `VCC` / `VIN` | `5V` / `3.3V` | Power | Module Power (use 5V for NodeMCU/D1, 3.3V for ESP-01) |
| | `GND` | `GND` | Ground | Common Ground with STM32 |
| **0.96" OLED Display** | `SCL` | `PB6` | `I2C1_SCL` | I²C Clock line |
| | `SDA` | `PB7` | `I2C1_SDA` | I²C Data line |
| | `VCC` | `3.3V` | Power | Power rail |
| | `GND` | `GND` | Ground | Ground |

---

## 3. ESP8266 WiFi Module Configuration & Firmware

The ESP8266 firmware sketch is located at:
📁 `firmware/esp8266_plantcare_bridge.ino`

### How to Flash:
1. Open **Arduino IDE**.
2. Go to *File → Preferences* and add ESP8266 board URL:
   `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
3. In *Tools → Board*, select **NodeMCU 1.0 (ESP-12E Module)** or **Generic ESP8266 Module**.
4. Install library: **WebSockets** by Markus Sattler (*Sketch → Include Library → Manage Libraries*).
5. Open `firmware/esp8266_plantcare_bridge.ino`, enter your home WiFi name and password:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
6. Click **Upload**.
7. Open **Serial Monitor** at **9600 baud**. Note the assigned IP address (e.g., `192.168.1.105`).
8. In the PlantCare AI web app (*Settings* or *UART Monitor*), enter `192.168.1.105` and click **Connect**.

---

## 4. STM32 Firmware Code Example (C / STM32CubeHAL)

Here is the bidirectional C loop for STM32CubeIDE transmitting telemetry to ESP8266 and receiving commands:

```c
#include "main.h"
#include <stdio.h>
#include <string.h>

extern UART_HandleTypeDef huart2;
extern ADC_HandleTypeDef hadc1;

// Buffers for transmission & command reception
char tx_buffer[256];
char rx_char;
char rx_cmd_buffer[64];
uint8_t rx_index = 0;

void Send_Plant_Telemetry(
    const char* plant,
    uint8_t ml_class,
    const char* ml_status,
    uint8_t temp_assumed,
    uint8_t soil_pct,
    uint8_t hum_rh_est,
    uint16_t hum_adc,
    uint16_t soil_raw,
    uint16_t ldr_adc,
    uint16_t pot_adc,
    uint8_t sw1,
    uint8_t sw2)
{
    // Format string matching PlantCare AI STM32 protocol:
    // PLANT=ALOE_VERA,ML_CLASS=0,ML_STATUS=HIGH STRESS,TEMP_C_ASSUMED=25,SOIL_PCT=0,HUM_RH_EST=20,HUM_ADC=4041,SOIL_RAW=4095,LDR_ADC=1827,POT_ADC=1237,SW1=0,SW2=0
    int len = snprintf(tx_buffer, sizeof(tx_buffer),
        "PLANT=%s,ML_CLASS=%d,ML_STATUS=%s,TEMP_C_ASSUMED=%d,SOIL_PCT=%d,HUM_RH_EST=%d,HUM_ADC=%d,SOIL_RAW=%d,LDR_ADC=%d,POT_ADC=%d,SW1=%d,SW2=%d\r\n",
        plant, ml_class, ml_status, temp_assumed, soil_pct, hum_rh_est, hum_adc, soil_raw, ldr_adc, pot_adc, sw1, sw2);

    // Transmit over USART2 to ESP8266 WiFi module
    HAL_UART_Transmit(&huart2, (uint8_t*)tx_buffer, len, 500);
}

// Handle incoming commands from Browser via ESP8266 (e.g. CMD:READ, CMD:WATER)
void Process_Incoming_Command(const char* cmd)
{
    if (strstr(cmd, "CMD:WATER") != NULL) {
        // Activate water relay / pump on PB5 for 3 seconds
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_5, GPIO_PIN_SET);
        HAL_Delay(3000);
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_5, GPIO_PIN_RESET);
    }
}

// Example Main Loop Sampling
int main(void)
{
    HAL_Init();
    SystemClock_Config();
    MX_GPIO_Init();
    MX_ADC1_Init();
    MX_USART2_UART_Init();

    while (1)
    {
        // 1. Read Analog Soil Moisture & Raw ADC
        uint16_t soil_raw = Read_ADC_Channel(ADC_CHANNEL_0);
        uint8_t soil_pct = Map_Soil_Moisture(soil_raw);

        // 2. Read Analog LDR
        uint16_t ldr_adc = Read_ADC_Channel(ADC_CHANNEL_1);

        // 3. Read Humidity ADC & Potentiometer ADC
        uint16_t hum_adc = Read_ADC_Channel(ADC_CHANNEL_2);
        uint8_t hum_rh_est = Map_Humidity_RH(hum_adc);
        uint16_t pot_adc = Read_ADC_Channel(ADC_CHANNEL_3);

        // 4. Read User Switches
        uint8_t sw1 = HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_0);
        uint8_t sw2 = HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_1); // 0 = Aloe Vera, 1 = Pothos
        const char* plant_name = (sw2 == 1) ? "POTHOS" : "ALOE_VERA";

        // 5. Evaluate Embedded Decision Tree ML Classifier
        uint8_t ml_class = Predict_Plant_ML_Class(sw2, soil_pct, 25, hum_rh_est, ldr_adc);
        const char* ml_status = (ml_class == 2) ? "SUITABLE" : (ml_class == 1) ? "MODERATE STRESS" : "HIGH STRESS";

        // 6. Transmit packet to ESP8266 WiFi module over USART2
        Send_Plant_Telemetry(plant_name, ml_class, ml_status, 25, soil_pct, hum_rh_est, hum_adc, soil_raw, ldr_adc, pot_adc, sw1, sw2);

        // 7. Check for incoming commands from ESP8266
        if (HAL_UART_Receive(&huart2, (uint8_t*)&rx_char, 1, 50) == HAL_OK) {
            if (rx_char == '\n' || rx_char == '\r') {
                rx_cmd_buffer[rx_index] = '\0';
                Process_Incoming_Command(rx_cmd_buffer);
                rx_index = 0;
            } else if (rx_index < sizeof(rx_cmd_buffer) - 1) {
                rx_cmd_buffer[rx_index++] = rx_char;
            }
        }

        // Transmit every 3 seconds
        HAL_Delay(3000);
    }
}
```

---

## 5. Bidirectional Testing Workflow

1. Power on STM32 and ESP8266.
2. In the Web App, open **Settings** or the **Hardware Terminal**.
3. Enter your ESP8266 IP address (e.g., `192.168.1.100`) and WebSocket Port `81`.
4. Click **⚡ Connect ESP8266 WiFi**.
5. Live sensor telemetry will display in the terminal and update the dashboard in real-time.
6. Click **CMD:READ** or **CMD:WATER** to transmit a command over WiFi back to the ESP8266 and STM32!
