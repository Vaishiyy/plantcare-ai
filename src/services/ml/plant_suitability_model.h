
#ifndef PLANT_SUITABILITY_MODEL_H
#define PLANT_SUITABILITY_MODEL_H

/* Input feature order:
   features[0] = Plant type (0 = Aloe Vera, 1 = Pothos)
   features[1] = Soil moisture percentage
   features[2] = Temperature in Celsius
   features[3] = Air humidity percentage
   features[4] = LDR ADC reading (0-4095)
*/

/* Output classes:
   0 = High stress
   1 = Moderate stress
   2 = Suitable
*/

int predict_plant_suitability(const float features[5]);

#endif
