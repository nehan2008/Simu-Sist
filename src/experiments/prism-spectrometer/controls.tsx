import { useLayoutEffect, useState } from 'react';
import {
  angularDifferenceArcMinutes,
  createVernierReading,
  formatAngleArcMinutes,
  formatVernierReading,
  normalizeRadians,
} from './simulation';
import type { Params, State, VernierReading } from './simulation';

export type ManualReadingTarget = 'directA' | 'directB' | 'minimumA' | 'minimumB';
export type MeasurementMode = 'experimental' | 'manual';

export interface ManualReadingFields {
  degrees: string;
  minutes: string;
  coincidence: string;
}

export type ManualReadingsState = Record<ManualReadingTarget, ManualReadingFields>;

interface ControlsProps {
  mode: MeasurementMode;
  params: Params;
  state: State;
  directA: VernierReading | null;
  directB: VernierReading | null;
  minimumA: VernierReading | null;
  minimumB: VernierReading | null;
  manualReadings: ManualReadingsState;
  trialNumber: number;
  canRecord: boolean;
  error: string;
  minimumCaptureError: string;
  onParamChange: (updated: Partial<Params>) => void;
  onModeChange: (mode: MeasurementMode) => void;
  onTogglePrism: () => void;
  onCaptureDirect: () => void;
  onCaptureMinimum: () => void;
  onManualReadingChange: (target: ManualReadingTarget, updated: Partial<ManualReadingFields>) => void;
  onApplyManual: (target: ManualReadingTarget) => void;
  onRecordTrial: () => void;
  onReset: () => void;
}

interface RangeNumberControlProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  precision?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function RangeNumberControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  precision = 1,
  disabled = false,
  onChange,
}: RangeNumberControlProps) {
  const [draft, setDraft] = useState(value.toFixed(precision));

  useLayoutEffect(() => {
    setDraft(value.toFixed(precision));
  }, [precision, value]);

  function handleNumericChange(rawValue: string) {
    setDraft(rawValue);
    if (rawValue.trim() === '') return;
    const number = Number(rawValue);
    if (Number.isFinite(number) && number >= min && number <= max) onChange(number);
  }

  function handleNumericBlur() {
    if (draft.trim() === '') {
      setDraft(value.toFixed(precision));
      return;
    }

    const number = Number(draft);
    if (!Number.isFinite(number) || number < min || number > max) {
      setDraft(value.toFixed(precision));
      return;
    }

    const steppedValue = Number((min + Math.round((number - min) / step) * step).toFixed(6));
    setDraft(steppedValue.toFixed(precision));
    if (steppedValue !== value) onChange(steppedValue);
  }

  return (
    <div className="prism-range-control">
      <div className="prism-range-heading">
        <label htmlFor={`${id}-number`}>{label}</label>
        <div className="prism-range-number">
          <input
            id={`${id}-number`}
            type="number"
            min={min}
            max={max}
            step={step}
            inputMode="decimal"
            value={draft}
            disabled={disabled}
            aria-label={`${label} numeric value`}
            onChange={(event) => handleNumericChange(event.target.value)}
            onBlur={handleNumericBlur}
          />
          <span>{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={`${label} slider`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="prism-range-limits" aria-hidden="true">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

const EXPERIMENTAL_WORKFLOW_STEPS = [
  {
    title: 'Focus and align the direct image',
    detail: 'The optics are pre-focused. Adjust Illuminated slit width for a sharp, narrow line; use Telescope rotation until Crosswire alignment reads Aligned.',
  },
  {
    title: 'Record the direct ray',
    detail: 'Keep the prism out and capture Vernier A and B when the direct slit image is aligned.',
  },
  {
    title: 'Insert the prism',
    detail: 'After both direct readings are captured, select Insert solid-glass prism.',
  },
  {
    title: 'Find minimum deviation',
    detail: 'Adjust Prism table rotation in small steps and follow the slit image until its motion reverses.',
  },
  {
    title: 'Capture the minimum-deviation image',
    detail: 'At the turning point, rotate the telescope with the angular dial until the crosswire centers the image, then capture both minimum readings.',
  },
  {
    title: 'Record and calculate',
    detail: 'Record the trial and check the two deviations, their mean, refractive index, speed, and graph marker.',
  },
];

const MANUAL_WORKFLOW_STEPS = [
  {
    title: 'Enter the direct-ray readings',
    detail: 'Enter MSR degrees, 00′ or 30′, and VSC for Verniers A and B; apply each reading.',
  },
  {
    title: 'Enter the minimum-deviation readings',
    detail: 'Enter and apply the corresponding minimum readings for Verniers A and B.',
  },
  {
    title: 'Record and calculate',
    detail: 'Record the trial and check the mean deviation, refractive index, speed, and graph marker.',
  },
];

const MANUAL_READING_TARGETS: Array<{ target: ManualReadingTarget; label: string }> = [
  { target: 'directA', label: 'Direct ray · Vernier A' },
  { target: 'directB', label: 'Direct ray · Vernier B' },
  { target: 'minimumA', label: 'Minimum deviation · Vernier A' },
  { target: 'minimumB', label: 'Minimum deviation · Vernier B' },
];

function readingStatus(reading: VernierReading | null): string {
  if (!reading) return 'Awaiting reading';
  return `MSR ${reading.mainScaleDegrees}° ${String(reading.mainScaleMinutes).padStart(2, '0')}′ · VSC ${String(reading.vernierCoincidence).padStart(2, '0')}`;
}

function getManualReading(fields: ManualReadingFields): VernierReading | null {
  if (!fields.degrees.trim() || !fields.minutes.trim() || !fields.coincidence.trim()) return null;
  return createVernierReading(
    Number(fields.degrees),
    Number(fields.minutes),
    Number(fields.coincidence),
  );
}

export function GuidedProcedure({
  mode,
  workflowStep,
  prismInserted,
  rayValid,
  onAlignTelescope,
}: {
  mode: MeasurementMode;
  workflowStep: number;
  prismInserted: boolean;
  rayValid: boolean;
  onAlignTelescope: () => void;
}) {
  const steps = mode === 'experimental' ? EXPERIMENTAL_WORKFLOW_STEPS : MANUAL_WORKFLOW_STEPS;
  return (
    <section className="prism-workflow" aria-labelledby="prism-workflow-heading">
      <div className="prism-section-heading">
        <span className="prism-step-number">01</span>
        <div>
          <h2 id="prism-workflow-heading">Guided procedure</h2>
          <p>{mode === 'experimental' ? 'Experimental mode · follow the apparatus controls in order.' : 'Manual mode · apply all four readings before recording.'}</p>
        </div>
      </div>
      <ol className="prism-workflow-list">
        {steps.map((step, index) => {
          const number = index + 1;
          const complete = number < workflowStep;
          const current = number === workflowStep;
          return (
            <li
              key={step.title}
              className={complete ? 'is-complete' : current ? 'is-current' : ''}
              aria-current={current ? 'step' : undefined}
            >
              <span>{complete ? '✓' : number}</span>
              <div>
                <strong>{step.title}</strong>
                <br />
                <small>{step.detail}</small>
              </div>
            </li>
          );
        })}
      </ol>
      {prismInserted && (
        <details className="prism-advanced-alignment">
          <summary>Optional advanced · Align telescope to refracted image</summary>
          <p>Automatically set the telescope angle to the traced image direction. You can also align it manually with the apparatus dial.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onAlignTelescope}
            disabled={!rayValid}
          >
            Align telescope to refracted image
          </button>
        </details>
      )}
    </section>
  );
}

export default function Controls({
  mode,
  params,
  state,
  directA,
  directB,
  minimumA,
  minimumB,
  manualReadings,
  trialNumber,
  canRecord,
  error,
  minimumCaptureError,
  onParamChange,
  onModeChange,
  onTogglePrism,
  onCaptureDirect,
  onCaptureMinimum,
  onManualReadingChange,
  onApplyManual,
  onRecordTrial,
  onReset,
}: ControlsProps) {
  const directComplete = Boolean(directA && directB);
  const prismRotationDegrees = params.prismRotationRad * 180 / Math.PI;
  const telescopeRotationDegrees = normalizeRadians(params.telescopeRotationRad) * 180 / Math.PI;
  const imageOffsetDegrees = state.imageOffsetRad * 180 / Math.PI;
  const turningPointDegrees = state.turningPoint
    ? state.turningPoint.rotationRad * 180 / Math.PI
    : null;
  const deviationA = directA && minimumA
    ? angularDifferenceArcMinutes(minimumA, directA)
    : null;
  const deviationB = directB && minimumB
    ? angularDifferenceArcMinutes(minimumB, directB)
    : null;

  return (
    <div className="controls-panel prism-controls">
      <section className="prism-control-section" aria-labelledby="prism-mode-heading">
        <div className="prism-section-heading">
          <span className="prism-step-number">02</span>
          <div>
            <h2 id="prism-mode-heading">Measurement mode</h2>
            <p>Choose apparatus-based or manual vernier readings.</p>
          </div>
        </div>
        <div className="prism-mode-toggle" role="group" aria-label="Measurement mode">
          <button
            type="button"
            className={mode === 'experimental' ? 'is-selected' : ''}
            aria-pressed={mode === 'experimental'}
            onClick={() => onModeChange('experimental')}
          >
            Experimental
          </button>
          <button
            type="button"
            className={mode === 'manual' ? 'is-selected' : ''}
            aria-pressed={mode === 'manual'}
            onClick={() => onModeChange('manual')}
          >
            Manual
          </button>
        </div>
        {mode === 'manual' && (
          <div className="prism-manual-readings">
            <p className="prism-muted">
              Enter each direct-ray and minimum-deviation vernier reading. Apply all four readings to enable recording.
            </p>
            <p className="prism-formula-note">TR = MSR + (VSC × LC), LC = 1′; 1 MSD = 30′.</p>
            {MANUAL_READING_TARGETS.map(({ target, label }) => {
              const fields = manualReadings[target];
              const reading = getManualReading(fields);
              const appliedReading = { directA, directB, minimumA, minimumB }[target];
              return (
                <fieldset className="prism-manual-reading" key={target}>
                  <legend>{label}</legend>
                  <div className="prism-manual-inputs">
                    <label>
                      MSR degrees
                      <input
                        type="number"
                        min="0"
                        max="359"
                        step="1"
                        inputMode="numeric"
                        aria-label={`${label} MSR degrees`}
                        value={fields.degrees}
                        onChange={(event) => onManualReadingChange(target, { degrees: event.target.value })}
                      />
                    </label>
                    <label>
                      MSR minutes
                      <select
                        aria-label={`${label} MSR minutes`}
                        value={fields.minutes}
                        onChange={(event) => onManualReadingChange(target, { minutes: event.target.value })}
                      >
                        <option value="">—</option>
                        <option value="0">00′</option>
                        <option value="30">30′</option>
                      </select>
                    </label>
                    <label>
                      VSC (0–29)
                      <input
                        type="number"
                        min="0"
                        max="29"
                        step="1"
                        inputMode="numeric"
                        aria-label={`${label} vernier coincidence`}
                        value={fields.coincidence}
                        onChange={(event) => onManualReadingChange(target, { coincidence: event.target.value })}
                      />
                    </label>
                  </div>
                  <p className="prism-manual-total">
                    Total reading: <strong>{reading ? formatVernierReading(reading) : 'Enter a valid MSR and VSC.'}</strong>
                  </p>
                  <p className="prism-manual-total">
                    Applied: <strong>{readingStatus(appliedReading)}</strong>
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary prism-action-button"
                    onClick={() => onApplyManual(target)}
                    disabled={!reading}
                    aria-label={`Apply ${label} reading`}
                  >
                    Apply reading
                  </button>
                </fieldset>
              );
            })}
            <div className="prism-manual-differences" aria-live="polite">
              <strong>Angular differences</strong>
              <div><span>Vernier A</span><strong>{deviationA === null ? '—' : formatAngleArcMinutes(deviationA, 0)}</strong></div>
              <div><span>Vernier B</span><strong>{deviationB === null ? '—' : formatAngleArcMinutes(deviationB, 0)}</strong></div>
            </div>
          </div>
        )}
      </section>

      {mode === 'experimental' && (
      <section className="prism-control-section" aria-labelledby="prism-direct-heading">
        <div className="prism-section-heading">
          <span className="prism-step-number">03</span>
          <div>
            <h2 id="prism-direct-heading">Direct ray</h2>
            <p>Keep the prism out; align the crosswire, then capture Vernier A and B.</p>
          </div>
        </div>
        <RangeNumberControl
          id="prism-telescope-rotation"
          label="Telescope angular dial"
          value={telescopeRotationDegrees}
          min={0}
          max={359.99}
          step={1 / 60}
          unit="°"
          precision={4}
          onChange={(degrees) => onParamChange({ telescopeRotationRad: degrees * Math.PI / 180 })}
        />
        <p className="prism-formula-note">
          Drag the circular dial or telescope in the apparatus to align the crosswire; the angle display and Vernier A/B follow the same rotation.
        </p>
        <div className="prism-alignment-readout" role="status">
          <span>Crosswire alignment</span>
          <strong className={state.telescopeAligned ? 'is-aligned' : ''}>
            {state.telescopeAligned ? 'Aligned' : `${Math.abs(imageOffsetDegrees).toFixed(2)}° from image`}
          </strong>
        </div>
        <button
          type="button"
          className="btn btn-primary prism-action-button"
          onClick={onCaptureDirect}
          disabled={params.prismInserted || !state.telescopeAligned}
        >
          Capture direct-ray Vernier A &amp; B
        </button>
        <div className="prism-reading-status-grid">
          <div><span>Direct A</span><strong>{readingStatus(directA)}</strong></div>
          <div><span>Direct B</span><strong>{readingStatus(directB)}</strong></div>
        </div>
      </section>
      )}

      {mode === 'experimental' && (
      <section className="prism-control-section" aria-labelledby="prism-minimum-heading">
        <div className="prism-section-heading">
          <span className="prism-step-number">04</span>
          <div>
            <h2 id="prism-minimum-heading">Minimum deviation</h2>
            <p>Rotate to the image reversal, use the telescope dial to center the crosswire on the image, then capture both readings.</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary prism-insert-button"
          onClick={onTogglePrism}
          disabled={!directComplete}
          aria-pressed={params.prismInserted}
        >
          {params.prismInserted ? 'Remove solid-glass prism' : 'Insert solid-glass prism'}
        </button>
        <RangeNumberControl
          id="prism-table-rotation"
          label="Prism table rotation"
          value={prismRotationDegrees}
          min={30}
          max={58}
          step={0.1}
          unit="°"
          disabled={!params.prismInserted}
          onChange={(degrees) => onParamChange({ prismRotationRad: degrees * Math.PI / 180 })}
        />
        <p className="prism-formula-note">
          Drag the prism table in the apparatus or use this control; the prism face and Snell-law ray trace rotate together.
        </p>
        <RangeNumberControl
          id="prism-slit-width"
          label="Illuminated slit width"
          value={params.slitWidthM * 1000}
          min={0.2}
          max={2}
          step={0.1}
          unit="mm"
          onChange={(millimetres) => onParamChange({ slitWidthM: millimetres / 1000 })}
        />
        <div className={`prism-turning-readout${state.atTurningPoint ? ' is-turning' : ''}`} role="status" aria-live="polite">
          <strong>{state.atTurningPoint ? 'Minimum-deviation turning point' : `Image deviation ${params.prismInserted && state.ray.valid ? `${(state.deviationRad * 180 / Math.PI).toFixed(2)}°` : '—'}`}</strong>
          <span>
            {state.atTurningPoint
              ? 'The slit image has reversed direction; align the crosswire to record.'
              : state.ray.valid && params.prismInserted && turningPointDegrees !== null
                ? `Turn near ${turningPointDegrees.toFixed(2)}°; the image reverses beyond this point.`
                : 'Insert the prism to trace the refracted image.'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary prism-action-button"
          onClick={onCaptureMinimum}
          disabled={!params.prismInserted}
        >
          Capture minimum-deviation Vernier A &amp; B
        </button>
        {minimumCaptureError && <p className="prism-error" role="alert">{minimumCaptureError}</p>}
        <div className="prism-reading-status-grid">
          <div><span>Minimum A</span><strong>{readingStatus(minimumA)}</strong></div>
          <div><span>Minimum B</span><strong>{readingStatus(minimumB)}</strong></div>
        </div>
      </section>
      )}

      <section className="prism-record-section" aria-labelledby="prism-record-heading">
        <div className="prism-section-heading">
          <span className="prism-step-number">05</span>
          <div>
            <h2 id="prism-record-heading">Record trial {trialNumber}</h2>
            <p>Both verniers are compared with the direct-ray readings.</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary prism-action-button"
          onClick={onRecordTrial}
          disabled={!canRecord}
        >
          Record trial and calculate
        </button>
        {error && <p className="prism-error" role="alert">{error}</p>}
      </section>

      <button type="button" className="btn btn-secondary prism-reset-button" onClick={onReset}>
        ↺ Reset experiment
      </button>
    </div>
  );
}
