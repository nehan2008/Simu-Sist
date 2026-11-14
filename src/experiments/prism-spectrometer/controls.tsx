import { useEffect, useState } from 'react';
import {
  angularDifferenceArcMinutes,
  createVernierReading,
  formatAngleArcMinutes,
  formatVernierReading,
} from './simulation';
import type { Params, State, VernierReading } from './simulation';

export type ManualReadingTarget = 'directA' | 'directB' | 'minimumA' | 'minimumB';

export interface ManualReadingFields {
  degrees: string;
  minutes: string;
  coincidence: string;
}

export type ManualReadingsState = Record<ManualReadingTarget, ManualReadingFields>;

interface ControlsProps {
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
  onParamChange: (updated: Partial<Params>) => void;
  onTogglePrism: () => void;
  onAlignTelescope: () => void;
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

  useEffect(() => {
    setDraft(value.toFixed(precision));
  }, [precision, value]);

  function handleNumericChange(rawValue: string) {
    setDraft(rawValue);
    if (rawValue.trim() === '') return;
    const number = Number(rawValue);
    if (Number.isFinite(number) && number >= min && number <= max) onChange(number);
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
            onBlur={() => setDraft(value.toFixed(precision))}
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

const WORKFLOW_STEPS = [
  'Align telescope to direct image',
  'Direct ray readings',
  'Locate the turning point',
  'Record and calculate',
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

export function GuidedProcedure({ workflowStep }: { workflowStep: number }) {
  return (
    <section className="prism-workflow" aria-labelledby="prism-workflow-heading">
      <div className="prism-section-heading">
        <span className="prism-step-number">01</span>
        <div>
          <h2 id="prism-workflow-heading">Guided procedure</h2>
          <p>Complete each stage before recording a trial.</p>
        </div>
      </div>
      <ol className="prism-workflow-list">
        {WORKFLOW_STEPS.map((step, index) => {
          const number = index + 1;
          const complete = number < workflowStep;
          const current = number === workflowStep;
          return (
            <li
              key={step}
              className={complete ? 'is-complete' : current ? 'is-current' : ''}
              aria-current={current ? 'step' : undefined}
            >
              <span>{complete ? '✓' : number}</span>
              {step}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function Controls({
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
  onParamChange,
  onTogglePrism,
  onAlignTelescope,
  onCaptureDirect,
  onCaptureMinimum,
  onManualReadingChange,
  onApplyManual,
  onRecordTrial,
  onReset,
}: ControlsProps) {
  const [mode, setMode] = useState<'experimental' | 'manual'>('experimental');
  const directComplete = Boolean(directA && directB);
  const prismRotationDegrees = params.prismRotationRad * 180 / Math.PI;
  const telescopeRotationDegrees = params.telescopeRotationRad * 180 / Math.PI;
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

  function handleReset() {
    setMode('experimental');
    onReset();
  }

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
            onClick={() => setMode('experimental')}
          >
            Experimental
          </button>
          <button
            type="button"
            className={mode === 'manual' ? 'is-selected' : ''}
            aria-pressed={mode === 'manual'}
            onClick={() => setMode('manual')}
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
            <p>Bypass the prism and align the telescope to the slit.</p>
          </div>
        </div>
        <RangeNumberControl
          id="prism-telescope-rotation"
          label="Telescope rotation"
          value={telescopeRotationDegrees}
          min={0}
          max={90}
          step={1 / 60}
          unit="°"
          precision={2}
          onChange={(degrees) => onParamChange({ telescopeRotationRad: degrees * Math.PI / 180 })}
        />
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
            <p>Rotate the prism and follow the slit image to its turning point.</p>
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
        {params.prismInserted && (
          <button
            type="button"
            className="btn btn-secondary prism-insert-button"
            onClick={onAlignTelescope}
            disabled={!state.ray.valid}
          >
            Align telescope to refracted image
          </button>
        )}
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
          disabled={!params.prismInserted || !state.atTurningPoint || !state.telescopeAligned}
        >
          Capture minimum-deviation Vernier A &amp; B
        </button>
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

      <button type="button" className="btn btn-secondary prism-reset-button" onClick={handleReset}>
        ↺ Reset experiment
      </button>
    </div>
  );
}
