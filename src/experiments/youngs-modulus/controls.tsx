/**
 * Young's Modulus — Controls Panel
 *
 * Renders sliders for beam parameters and a material selector.
 * No physics logic here — only UI.
 */

import SliderInput from '../../components/ui/SliderInput';
import {
  AUTO_LOAD_INCREMENT_KG,
  AUTO_MAX_READINGS,
  AUTO_MIN_READINGS,
  MATERIALS,
} from './simulation';
import type { MaterialKey, ObservationSequence, Params } from './simulation';

interface ControlsProps {
  params: Params;
  disabled?: boolean;
  sequence: ObservationSequence;
  requestedReadingCount: number;
  automaticProgress: { sequence: ObservationSequence; completed: number; total: number } | null;
  automaticError: string;
  onChange: (updated: Partial<Params>) => void;
  onSequenceChange: (sequence: ObservationSequence) => void;
  onRequestedReadingCountChange: (count: number) => void;
  onRunAutomaticSequence: (sequence: ObservationSequence) => void;
}

export default function Controls({
  params,
  disabled = false,
  sequence,
  requestedReadingCount,
  automaticProgress,
  automaticError,
  onChange,
  onSequenceChange,
  onRequestedReadingCountChange,
  onRunAutomaticSequence,
}: ControlsProps) {
  const controlsDisabled = disabled || automaticProgress !== null;

  return (
    <div className="controls-panel youngs-modulus-controls">
      <p className="section-label">Beam &amp; Load Parameters</p>

      {/* Material selector */}
      <div className="slider-input">
        <div className="slider-header">
          <label className="slider-label" htmlFor="material-select">Material</label>
        </div>
        <select
          id="material-select"
          className="material-select"
          value={params.material}
          disabled={controlsDisabled}
          onChange={(e) => onChange({ material: e.target.value as MaterialKey })}
          aria-label="Select beam material"
        >
          {(Object.entries(MATERIALS) as [MaterialKey, { label: string; E_ref: number }][]).map(
            ([key, mat]) => (
              <option key={key} value={key}>
                {mat.label} ({(mat.E_ref / 1e9).toFixed(0)} GPa)
              </option>
            ),
          )}
        </select>
      </div>

      <SliderInput
        label="Load mass"
        value={params.mass}
        min={0.05}
        max={1.0}
        step={0.05}
        unit=" kg"
        disabled={controlsDisabled}
        onChange={(v) => onChange({ mass: v })}
      />

      <SliderInput
        label="Beam length (l)"
        value={params.l}
        min={0.40}
        max={1.00}
        step={0.05}
        unit=" m"
        disabled={controlsDisabled}
        onChange={(v) => onChange({ l: v })}
      />

      {/* Breadth displayed in mm, stored in m */}
      <SliderInput
        label="Beam breadth (b)"
        value={Math.round(params.b * 1000)}
        min={10}
        max={50}
        step={1}
        unit=" mm"
        disabled={controlsDisabled}
        onChange={(v) => onChange({ b: v / 1000 })}
      />

      {/* Thickness displayed in mm (1 decimal), stored in m */}
      <SliderInput
        label="Beam thickness (d)"
        value={Math.round(params.d * 2000) / 2}
        min={1.0}
        max={10.0}
        step={0.5}
        unit=" mm"
        disabled={controlsDisabled}
        onChange={(v) => onChange({ d: v / 1000 })}
      />

      <section className="youngs-auto-load-panel" aria-labelledby="youngs-auto-load-heading">
        <h3 id="youngs-auto-load-heading">Automatic loading &amp; unloading</h3>
        <p>
          Each pass records {requestedReadingCount} simulated microscope readings at
          {` ${(AUTO_LOAD_INCREMENT_KG * 1000).toFixed(0)} g`} load intervals. The
          unloading pass follows the same loads in reverse.
        </p>
        <SliderInput
          label="Readings per pass"
          value={requestedReadingCount}
          min={AUTO_MIN_READINGS}
          max={AUTO_MAX_READINGS}
          step={1}
          unit=" readings"
          disabled={controlsDisabled}
          showNumericInput
          precision={0}
          onChange={onRequestedReadingCountChange}
        />
        <div className="youngs-auto-load-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={controlsDisabled}
            onClick={() => onRunAutomaticSequence('Loading')}
          >
            Auto load ↑
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={controlsDisabled}
            onClick={() => onRunAutomaticSequence('Unloading')}
          >
            Auto unload ↓
          </button>
        </div>
        {automaticProgress ? (
          <p className="youngs-auto-load-status" role="status" aria-live="polite">
            {automaticProgress.sequence} pass: {automaticProgress.completed} of {automaticProgress.total} readings recorded.
          </p>
        ) : (
          <p className="youngs-auto-load-status">
            The pass spans {AUTO_LOAD_INCREMENT_KG.toFixed(2)}–{(requestedReadingCount * AUTO_LOAD_INCREMENT_KG).toFixed(2)} kg.
          </p>
        )}
        {automaticError && <p className="youngs-auto-load-error" role="alert">{automaticError}</p>}
      </section>

      <fieldset className="youngs-sequence-selector" disabled={controlsDisabled}>
        <legend>Sequence for manual readings</legend>
        <div>
          {(['Loading', 'Unloading'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={sequence === value ? 'is-selected' : ''}
              aria-pressed={sequence === value}
              onClick={() => onSequenceChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <p>Microscope and manual-entry readings are added to the selected sequence.</p>
      </fieldset>
    </div>
  );
}
