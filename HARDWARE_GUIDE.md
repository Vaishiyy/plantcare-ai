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

// Buffer for formatted STM32 telemetry
char tx_buffer[256];

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

        // 6. Send packet over Bluetooth UART
        Send_Plant_Telemetry(plant_name, ml_class, ml_status, 25, soil_pct, hum_rh_est, hum_adc, soil_raw, ldr_adc, pot_adc, sw1, sw2);

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
