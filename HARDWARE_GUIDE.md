# 🔬 PlantCare AI — Hardware & Firmware Integration Guide

This guide documents the physical hardware architecture, STM32 pin mappings, sensor calibration, Bluetooth module configuration, and firmware transmission code.

---

## 1. System Hardware Architecture

The physical embedded system consists of:
- **STM32 Microcontroller**: STM32F401 / STM32F103 ("Blue Pill") / STM32F411 Nucleo (ARM Cortex-M core).
- **Soil Moisture Sensor**: Analog resistive/capacitive soil probe connected to an ADC channel.
- **Light Dependent Resistor (LDR)**: Voltage divider circuit connected to an ADC channel.
- **DHT11**: Digital Temperature and Humidity sensor connected to a GPIO pin.
- **Bluetooth Module**:
  - *Option A*: **HC-05 / HC-06** (Bluetooth Classic SPP via USART).
  - *Option B*: **HM-10 / CC2541** (Bluetooth Low Energy GATT via USART).
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
| **Bluetooth (HC-05 / HM-10)**| `TXD` | `PA3` | `USART2_RX` | Connect Module TX to STM32 RX |
| | `RXD` | `PA2` | `USART2_TX` | Connect Module RX to STM32 TX (use voltage divider if 3.3V logic) |
| | `VCC` | `5V` | Power | Module 5V input |
| | `GND` | `GND` | Ground | Common Ground |
| **0.96" OLED Display** | `SCL` | `PB6` | `I2C1_SCL` | I²C Clock line |
| | `SDA` | `PB7` | `I2C1_SDA` | I²C Data line |
| | `VCC` | `3.3V` | Power | Power rail |
| | `GND` | `GND` | Ground | Ground |

---

## 3. Bluetooth Module Configuration

### HC-05 (Bluetooth Classic 2.0 SPP)
Set HC-05 into AT command mode (hold button while powering on, LED blinks every 2 seconds):
```text
AT+NAME=PlantCare_HC05
AT+ROLE=0                  (Slave mode)
AT+UART=9600,0,0           (9600 baud, 1 stop bit, no parity)
AT+PSWD="1234"             (Pairing PIN)
```

### HM-10 (Bluetooth Low Energy BLE 4.0)
Send AT commands over UART:
```text
AT+NAMEPlantCare_BLE
AT+BAUD0                   (9600 baud)
AT+ROLE0                   (Peripheral mode)
AT+TYPE0                   (No PIN bonding required for Web Bluetooth)
```

---

## 4. STM32 Firmware Code Example (C / STM32CubeHAL)

Here is the C transmission loop for STM32CubeIDE:

```c
#include "main.h"
#include <stdio.h>
#include <string.h>

extern UART_HandleTypeDef huart2;
extern ADC_HandleTypeDef hadc1;

// Buffer for formatted JSON telemetry
char tx_buffer[128];

void Send_Plant_Telemetry(uint8_t moisture, float temp, uint8_t humidity, uint16_t light, const char* condition)
{
    // Format JSON matching PlantCare AI protocol specification
    int len = snprintf(tx_buffer, sizeof(tx_buffer),
        "{\"moisture\":%d,\"temperature\":%.1f,\"humidity\":%d,\"light\":%d,\"condition\":\"%s\"}\r\n",
        moisture, temp, humidity, light, condition);

    // Transmit over UART to Bluetooth module
    HAL_UART_Transmit(&huart2, (uint8_t*)tx_buffer, len, 500);
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
        // 1. Read Analog Soil Moisture
        uint16_t raw_moist = Read_ADC_Channel(ADC_CHANNEL_0);
        uint8_t moisture_pct = Map_Soil_Moisture(raw_moist);

        // 2. Read Analog LDR
        uint16_t raw_ldr = Read_ADC_Channel(ADC_CHANNEL_1);
        uint16_t light_lux = Map_LDR_Lux(raw_ldr);

        // 3. Read DHT11
        float temperature = 0.0f;
        uint8_t humidity = 0;
        DHT11_Read(&temperature, &humidity);

        // 4. Run Lightweight Embedded ML Condition Classifier
        const char* predicted_condition = Predict_Plant_Condition(moisture_pct, temperature, humidity, light_lux);

        // 5. Send packet over Bluetooth
        Send_Plant_Telemetry(moisture_pct, temperature, humidity, light_lux, predicted_condition);

        // 6. Update local I2C OLED display
        OLED_Update(moisture_pct, temperature, humidity, light_lux, predicted_condition);

        // Transmit every 3 seconds
        HAL_Delay(3000);
    }
}
```

---

## 5. Hardware-Specific Steps (Requiring Physical Hardware)

The following calibration and testing steps require physical hardware in hand:

1. **Soil Moisture Sensor Dry/Wet Calibration**:
   - Record raw ADC reading in open air (100% dry: ~3200 ADC on 12-bit).
   - Record raw ADC reading immersed in a glass of water (100% saturated: ~1200 ADC).
   - Update linear mapping equation: `moisture_pct = 100 - ((raw - 1200) * 100 / (3200 - 1200))`.

2. **LDR Lux Calibration**:
   - Measure voltage divider resistance with a handheld lux meter to calibrate the polynomial conversion curve.

3. **DHT11 Timing Calibration**:
   - Adjust microsecond delay timer (`DWT_Delay_us`) to match specific crystal oscillator clock frequency (e.g. 84MHz on STM32F401).

4. **Hardware Pairing & COM Port Binding**:
   - On Windows, pair the HC-05 via *Settings → Bluetooth & Devices → Add Device*. Note the virtual COM port (e.g. `COM4`) assigned to the outgoing serial port.
