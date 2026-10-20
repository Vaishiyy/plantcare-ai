import datasetJson from './plantDataset.json';

export interface DatasetRow {
  plantType: 'aloe_vera' | 'pothos';
  moisture: number;
  temperature: number;
  humidity: number;
  ldr: number;
  suitabilityClass: 'suitable' | 'moderate_stress' | 'high_stress';
}

export const PLANT_DATASET: DatasetRow[] = datasetJson as DatasetRow[];
