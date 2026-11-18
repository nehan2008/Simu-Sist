import { useState } from 'react';
import {
  MAX_CUSTOM_FIBER_LENGTH_M,
  MAX_SCREEN_DISTANCE_CM,
  MIN_CUSTOM_FIBER_LENGTH_M,
  MIN_SCREEN_DISTANCE_CM,
  POWER_READING_DESCRIPTIONS,
  POWER_READING_IDS,
  SCREEN_CIRCLE_DIAMETERS_MM,
} from './simulation';
import type {
  NumericalApertureParams,
  PowerReadingId,
} from './simulation';

interface FiberNumericInputProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

function FiberNumericInput({
  id,
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: FiberNumericInputProps) {
  const [numericDraft, setNumericDraft] = useState({
    value,
    text: String(value),
    invalid: false,
  });
  const displayedValue = numericDraft.value === value ? numericDraft.text : String(value);
  const numericInvalid = numericDraft.value === value && numericDraft.invalid;

  function handleNumericChange(rawValue: string) {
    const nextValue = rawValue.trim() === '' ? Number.NaN : Number(rawValue);
    if (!Number.isFinite(nextValue) || nextValue < min || nextValue > max) {
      setNumericDraft({ value, text: rawValue, invalid: true });
      return;
    }

    setNumericDraft({ value: nextValue, text: rawValue, invalid: false });
    onChange(nextValue);
  }

  return (
    <label className="fiber-na-number-field" htmlFor={id}>
      <span>{label}</span>
      <span className="fiber-na-number-row">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step="any"
          inputMode="decimal"
          value={displayedValue}
          aria-label={`${label} numeric value`}
          aria-invalid={numericInvalid}
          aria-describedby={`${id}-range`}
          onChange={(event) => handleNumericChange(event.target.value)}
          onBlur={() => setNumericDraft({ value, text: String(value), invalid: false })}
        />
        <span>{unit}</span>
      </span>
      <small id={`${id}-range`}>{min}–{max} {unit}</small>
    </label>
  );
}

interface ControlsProps {
  selectedPowerReading: PowerReadingId;
  customCableLengthM: number;
  recordedCustomLengthM: number | null;
  customEstimateDb: number | null;
  powerValueDraft: string;
  recordedPowerReadings: Partial<Record<PowerReadingId, number>>;
  powerValueError: string;
  onPowerReadingChange: (reading: PowerReadingId) => void;
  onCustomCableLengthChange: (lengthM: number) => void;
  onPowerValueChange: (value: string) => void;
  onRecordPowerReading: () => void;
}

export default function Controls({
  selectedPowerReading,
  customCableLengthM,
  recordedCustomLengthM,
  customEstimateDb,
  powerValueDraft,
  recordedPowerReadings,
  powerValueError,
  onPowerReadingChange,
  onCustomCableLengthChange,
  onPowerValueChange,
  onRecordPowerReading,
}: ControlsProps) {
  const draftValue = powerValueDraft.trim() === '' ? Number.NaN : Number(powerValueDraft);
  const canRecordPowerReading =
    Number.isFinite(draftValue) && draftValue >= -120 && draftValue <= 30;

  return (
    <div className="controls-panel fiber-controls">
      <section className="fiber-control-section" aria-labelledby="fiber-attenuation-controls">
        <div className="fiber-section-heading">
          <span className="fiber-section-index">01</span>
          <div>
            <h2 id="fiber-attenuation-controls">Attenuation loss</h2>
            <p>Select a setup, then enter its displayed reading.</p>
          </div>
        </div>

        <label className="fiber-select-field" htmlFor="fiber-power-reading">
          <span>Reading to record</span>
          <select
            id="fiber-power-reading"
            value={selectedPowerReading}
            onChange={(event) => {
              const reading = POWER_READING_IDS.find((id) => id === event.target.value);
              if (reading) onPowerReadingChange(reading);
            }}
          >
            {POWER_READING_IDS.map((id) => (
              <option key={id} value={id}>
                {id} · {id === 'P06'
                  ? `Custom length · ${customCableLengthM.toFixed(2)} m`
                  : POWER_READING_DESCRIPTIONS[id]}
                {recordedPowerReadings[id] === undefined
                  ? ''
                  : id === 'P06' && recordedCustomLengthM !== null
                    ? ` · recorded at ${recordedCustomLengthM.toFixed(2)} m`
                    : ' · recorded'}
              </option>
            ))}
          </select>
        </label>
        {selectedPowerReading === 'P06' && (
          <div className="fiber-custom-cable">
            <FiberNumericInput
              id="fiber-custom-cable-length"
              label="Custom cable length"
              value={customCableLengthM}
              min={MIN_CUSTOM_FIBER_LENGTH_M}
              max={MAX_CUSTOM_FIBER_LENGTH_M}
              unit="m"
              onChange={onCustomCableLengthChange}
            />
            <p className="fiber-control-hint">
              Linear model: slope = (P03 − P01)/(5 m − 1 m); P(L) = P01 + slope(L − 1 m), using your straight-cable readings.
            </p>
            <p className="fiber-custom-estimate" role="status">
              {customEstimateDb === null
                ? 'Record P01 and P03 to show the custom-length meter estimate.'
                : `Estimated meter reading at ${customCableLengthM.toFixed(2)} m: ${customEstimateDb.toFixed(2)} dB`}
            </p>
          </div>
        )}
        <label className="fiber-power-input" htmlFor="fiber-power-value">
          <span className="fiber-power-input-heading">
            <span>Manual Power Meter Reading</span>
            <span className="fiber-selected-reading">Selected: {selectedPowerReading}</span>
          </span>
          <small id="fiber-power-entry-help" className="fiber-power-input-help">
            Enter the reading displayed on the optical power meter for the selected setup.
          </small>
          <span className="fiber-power-input-row">
            <input
              id="fiber-power-value"
              type="number"
              min="-120"
              max="30"
              step="any"
              inputMode="decimal"
              placeholder="e.g. -12.4"
              value={powerValueDraft}
              aria-invalid={Boolean(powerValueError)}
              aria-describedby={powerValueError
                ? 'fiber-power-entry-help fiber-power-error'
                : 'fiber-power-entry-help'}
              onChange={(event) => onPowerValueChange(event.target.value)}
            />
            <span>PDF: dB</span>
          </span>
        </label>
        <button
          type="button"
          className="btn btn-primary fiber-record-power-button"
          onClick={onRecordPowerReading}
          disabled={!canRecordPowerReading}
        >
          {recordedPowerReadings[selectedPowerReading] === undefined
            ? `Record ${selectedPowerReading}`
            : `Update ${selectedPowerReading}`}
        </button>
        <p className="fiber-control-hint">
          Values are stored exactly as entered. Differences use the PDF’s stated subtraction.
        </p>
        {powerValueError && (
          <p id="fiber-power-error" className="fiber-error" role="alert">{powerValueError}</p>
        )}
      </section>
    </div>
  );
}

export function NumericalApertureControls({
  params,
  onParamsChange,
}: {
  params: NumericalApertureParams;
  onParamsChange: (updated: Partial<NumericalApertureParams>) => void;
}) {
  return (
    <section className="fiber-card fiber-na-controls-panel" aria-labelledby="fiber-na-controls">
      <div className="fiber-section-heading">
        <span className="fiber-section-index">02</span>
        <div>
          <h2 id="fiber-na-controls">Numerical aperture</h2>
          <p>Calculate NA and acceptance angle from the measured screen dimensions.</p>
        </div>
      </div>
      <fieldset className="fiber-na-manual-fields">
        <legend>Manual measurements (L and W)</legend>
        <p>Enter precise values here; both fields stay synced with the apparatus sliders.</p>
        <div className="fiber-na-number-fields">
          <FiberNumericInput
            id="fiber-na-screen-distance"
            label="Screen distance (L)"
            value={Number((params.screenDistanceM * 100).toFixed(6))}
            min={MIN_SCREEN_DISTANCE_CM}
            max={MAX_SCREEN_DISTANCE_CM}
            unit="cm"
            onChange={(value) => onParamsChange({ screenDistanceM: value / 100 })}
          />
          <FiberNumericInput
            id="fiber-na-spot-diameter"
            label="Red spot diameter (W)"
            value={Number((params.spotDiameterM * 1000).toFixed(6))}
            min={1}
            max={30}
            unit="mm"
            onChange={(value) => onParamsChange({ spotDiameterM: value / 1000 })}
          />
        </div>
      </fieldset>
      <div className="fiber-na-circle-control">
        <label className="fiber-select-field" htmlFor="fiber-target-circle">
          <span>Screen circle to compare</span>
          <select
            id="fiber-target-circle"
            value={params.targetCircleMm}
            onChange={(event) => {
              const diameter = SCREEN_CIRCLE_DIAMETERS_MM.find(
                (value) => value === Number(event.target.value),
              );
              if (diameter !== undefined) onParamsChange({ targetCircleMm: diameter });
            }}
          >
            {SCREEN_CIRCLE_DIAMETERS_MM.map((diameter) => (
              <option key={diameter} value={diameter}>{diameter} mm</option>
            ))}
          </select>
        </label>
      </div>
      <p className="fiber-control-hint">
        NA = W / √(4L² + W²) · θmax = sin⁻¹(NA). L is entered in cm; W is entered in mm.
      </p>
    </section>
  );
}
