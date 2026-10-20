import React, { useState } from 'react';
import { usePlant } from '../context/PlantContext';
import { X, Save, Sliders, Leaf } from 'lucide-react';
import { PlantProfile } from '../types';

interface EditPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditPlantModal: React.FC<EditPlantModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile, updateActiveProfile, profiles, selectProfile } = usePlant();

  const [formData, setFormData] = useState<PlantProfile>({ ...activeProfile });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateActiveProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-cream-300 w-full max-w-md rounded-3xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-cream-50 border-b border-cream-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-forest-100 text-forest-700">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-forest-900">
                Edit Plant Profile
              </h2>
              <span className="text-xs text-stone-500">Configure species & custom sensor limits</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-cream-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switch Plant Preset Tab */}
        <div className="px-5 pt-3 pb-2 bg-cream-100/50 border-b border-cream-200">
          <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
            Switch Monitored Plant:
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  selectProfile(p.id);
                  setFormData({ ...p });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  p.id === activeProfile.id
                    ? 'bg-forest-600 text-white shadow-soft'
                    : 'bg-white border border-cream-300 text-stone-600 hover:bg-cream-50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Plant Nickname
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-forest-900 text-sm focus:outline-none focus:border-forest-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Species Taxonomy
            </label>
            <input
              type="text"
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-forest-900 text-sm focus:outline-none focus:border-forest-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Care Level
              </label>
              <select
                value={formData.careLevel}
                onChange={(e) =>
                  setFormData({ ...formData, careLevel: e.target.value as any })
                }
                className="w-full px-3 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-forest-900 text-sm focus:outline-none focus:border-forest-500"
              >
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Demanding">Demanding</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Sunlight Exposure
              </label>
              <select
                value={formData.sunlightRequirement}
                onChange={(e) =>
                  setFormData({ ...formData, sunlightRequirement: e.target.value as any })
                }
                className="w-full px-3 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-forest-900 text-sm focus:outline-none focus:border-forest-500"
              >
                <option value="Low Light">Low Light</option>
                <option value="Bright Indirect">Bright Indirect</option>
                <option value="Direct Sunlight">Direct Sunlight</option>
              </select>
            </div>
          </div>

          {/* Environmental Thresholds Section */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-forest-600" />
              <h3 className="text-xs font-bold text-forest-900 uppercase tracking-wider">
                Species Threshold Ranges
              </h3>
            </div>

            <div className="bg-cream-50/80 rounded-2xl p-3 border border-cream-200 space-y-3">
              {/* Soil Moisture Min / Max */}
              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Soil Moisture Range</span>
                  <span className="font-semibold text-forest-800">
                    {formData.thresholds.moistureMin}% – {formData.thresholds.moistureMax}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.thresholds.moistureMin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          moistureMin: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Min %"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.thresholds.moistureMax}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          moistureMax: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Max %"
                  />
                </div>
              </div>

              {/* Temperature Min / Max */}
              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Temperature Range</span>
                  <span className="font-semibold text-forest-800">
                    {formData.thresholds.tempMin}°C – {formData.thresholds.tempMax}°C
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={formData.thresholds.tempMin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          tempMin: parseFloat(e.target.value) || 15,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Min °C"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={formData.thresholds.tempMax}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          tempMax: parseFloat(e.target.value) || 30,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Max °C"
                  />
                </div>
              </div>

              {/* Humidity Min / Max */}
              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Humidity Range</span>
                  <span className="font-semibold text-forest-800">
                    {formData.thresholds.humidityMin}% – {formData.thresholds.humidityMax}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.thresholds.humidityMin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          humidityMin: parseInt(e.target.value) || 30,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Min %"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.thresholds.humidityMax}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          humidityMax: parseInt(e.target.value) || 80,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Max %"
                  />
                </div>
              </div>

              {/* Light Min / Max */}
              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Light Range (lux)</span>
                  <span className="font-semibold text-forest-800">
                    {formData.thresholds.lightMin} – {formData.thresholds.lightMax} lux
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={formData.thresholds.lightMin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          lightMin: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Min lux"
                  />
                  <input
                    type="number"
                    value={formData.thresholds.lightMax}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          lightMax: parseInt(e.target.value) || 1200,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-white text-xs"
                    placeholder="Max lux"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Care Notes & Tips
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-forest-900 text-sm focus:outline-none focus:border-forest-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-forest-600 hover:bg-forest-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-card transition-all active:scale-[0.99]"
            >
              <Save className="w-4 h-4" />
              {saveSuccess ? 'Saved Successfully!' : 'Save Plant Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
