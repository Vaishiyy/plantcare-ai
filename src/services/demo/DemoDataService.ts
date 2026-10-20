import { DemoScenario, PlantCondition, SensorReading, Thresholds } from '../../types';
import { PLANT_DATASET, DatasetRow } from '../../data/plantDataset';
import { evaluatePlantModel } from '../ml/mlInference';

export class DemoDataService {
  private currentIndex: number = 0;
  private currentReading: SensorReading;
  private activeScenario: DemoScenario = 'dataset_stream';

  constructor() {
    // Initialize with first real suitable row from dataset
    const initialRow = PLANT_DATASET.find((r) => r.suitabilityClass === 'suitable') || PLANT_DATASET[0];
    const initialDiag = evaluatePlantModel(
      initialRow.plantType === 'aloe_vera' ? 0 : 1,
      initialRow.moisture,
      initialRow.temperature,
      initialRow.humidity,
      initialRow.ldr,
      {
        moistureMin: 10,
        moistureMax: 35,
        tempMin: 18,
        tempMax: 32,
        humidityMin: 30,
        humidityMax: 60,
        lightMin: 2500,
        lightMax: 4095,
      }
    );

    this.currentReading = {
      moisture: initialRow.moisture,
      temperature: initialRow.temperature,
      humidity: initialRow.humidity,
      light: initialRow.ldr,
      condition: initialDiag.condition,
      suitabilityClass: initialRow.suitabilityClass,
      mlClassCode: initialDiag.mlClassCode,
      timestamp: Date.now(),
      confidence: 0.98,
      isSynthetic: true,
      datasetRowIndex: 0,
    };
  }

  private filterRowsForPlant(plantCode: 0 | 1): DatasetRow[] {
    const key = plantCode === 0 ? 'aloe_vera' : 'pothos';
    return PLANT_DATASET.filter((r) => r.plantType === key);
  }

  public setScenario(
    scenario: DemoScenario,
    thresholds: Thresholds,
    plantCode: 0 | 1 = 0
  ): SensorReading {
    this.activeScenario = scenario;
    const plantRows = this.filterRowsForPlant(plantCode);

    let targetClass: 'suitable' | 'moderate_stress' | 'high_stress' = 'suitable';
    if (scenario === 'dataset_moderate' || scenario === 'needs_water') {
      targetClass = 'moderate_stress';
    } else if (scenario === 'dataset_high_stress' || scenario === 'too_dry' || scenario === 'poor_env') {
      targetClass = 'high_stress';
    } else if (scenario === 'dataset_suitable' || scenario === 'ideal') {
      targetClass = 'suitable';
    }

    // Find real matching rows in dataset
    const matchingRows = plantRows.filter((r) => r.suitabilityClass === targetClass);
    const chosenRow =
      matchingRows.length > 0
        ? matchingRows[Math.floor(Math.random() * matchingRows.length)]
        : plantRows[0];

    const diag = evaluatePlantModel(
      plantCode,
      chosenRow.moisture,
      chosenRow.temperature,
      chosenRow.humidity,
      chosenRow.ldr,
      thresholds
    );

    this.currentReading = {
      moisture: chosenRow.moisture,
      temperature: chosenRow.temperature,
      humidity: chosenRow.humidity,
      light: chosenRow.ldr,
      condition: diag.condition,
      suitabilityClass: chosenRow.suitabilityClass,
      mlClassCode: diag.mlClassCode,
      timestamp: Date.now(),
      confidence: diag.mlClassCode === 2 ? 0.98 : diag.mlClassCode === 1 ? 0.93 : 0.96,
      isSynthetic: true,
      datasetRowIndex: PLANT_DATASET.indexOf(chosenRow),
    };

    return this.currentReading;
  }

  public getNextDatasetRow(plantCode: 0 | 1, thresholds: Thresholds): SensorReading {
    const plantRows = this.filterRowsForPlant(plantCode);
    if (plantRows.length === 0) return this.currentReading;

    this.currentIndex = (this.currentIndex + 1) % plantRows.length;
    const row = plantRows[this.currentIndex];

    const diag = evaluatePlantModel(
      plantCode,
      row.moisture,
      row.temperature,
      row.humidity,
      row.ldr,
      thresholds
    );

    this.currentReading = {
      moisture: row.moisture,
      temperature: row.temperature,
      humidity: row.humidity,
      light: row.ldr,
      condition: diag.condition,
      suitabilityClass: row.suitabilityClass,
      mlClassCode: diag.mlClassCode,
      timestamp: Date.now(),
      confidence: diag.mlClassCode === 2 ? 0.98 : diag.mlClassCode === 1 ? 0.93 : 0.96,
      isSynthetic: true,
      datasetRowIndex: PLANT_DATASET.indexOf(row),
    };

    return this.currentReading;
  }

  public getCurrentReading(): SensorReading {
    return { ...this.currentReading, timestamp: Date.now() };
  }

  /**
   * Generates historical stream drawn directly from real dataset records
   */
  public generateHistory(
    thresholds: Thresholds,
    plantCode: 0 | 1 = 0,
    count: number = 60
  ): SensorReading[] {
    const plantRows = this.filterRowsForPlant(plantCode);
    const history: SensorReading[] = [];
    const now = Date.now();
    const intervalMs = (14 * 24 * 3600 * 1000) / count; // 14-day history span

    // Sample spread across the plant's dataset records
    const step = Math.max(1, Math.floor(plantRows.length / count));

    for (let i = count - 1; i >= 0; i--) {
      const rowIndex = (i * step) % plantRows.length;
      const row = plantRows[rowIndex];
      const timestamp = now - i * intervalMs;

      const diag = evaluatePlantModel(
        plantCode,
        row.moisture,
        row.temperature,
        row.humidity,
        row.ldr,
        thresholds
      );

      history.push({
        moisture: row.moisture,
        temperature: row.temperature,
        humidity: row.humidity,
        light: row.ldr,
        condition: diag.condition,
        suitabilityClass: row.suitabilityClass,
        mlClassCode: diag.mlClassCode,
        timestamp,
        confidence: diag.mlClassCode === 2 ? 0.98 : diag.mlClassCode === 1 ? 0.93 : 0.96,
        isSynthetic: true,
        datasetRowIndex: rowIndex,
      });
    }

    return history;
  }
}

export const demoDataService = new DemoDataService();
