import SliderInput from '../../components/ui/SliderInput';
import { MATERIALS, MAX_MEASURED_TIME_S, MIN_MEASURED_TIME_S } from './simulation';
import type { MaterialKey, Params } from './simulation';

export type MeasurementMode = 'stopwatch' | 'manual';

interface ControlsProps {
  params: Params;
  isTiming: boolean;
  hasReadings: boolean;
  isRecording: boolean;
  onChange: (updated: Partial<Params>) => void;
  onResetExperiment: () => void;
}

interface TimingControlsProps {
  oscillationCount: number;
  elapsedTimeS: number;
  manualTotalTimeS: string;
  measurementMode: MeasurementMode;
  isTiming: boolean;
  canRecordStopwatch: boolean;
  canRecordManual: boolean;
  isRecording: boolean;
  error: string;
  onOscillationCountChange: (count: number) => void;
  onManualTotalTimeChange: (value: string) => void;
  onMeasurementModeChange: (mode: MeasurementMode) => void;
  onStartTiming: () => void;
  onStopTiming: () => void;
  onRecord: (totalTimeS: number) => void;
  onResetTimer: () => void;
}

export default function Controls({
  params,
  isTiming,
  hasReadings,
  isRecording,
  onChange,
  onResetExperiment,
}: ControlsProps) {
  const fixedParametersDisabled = isTiming || hasReadings;
  const maxMassDistanceCm = Math.max(1, params.R * 100 - 0.5);

  return (
    <div className="controls-panel torsional-controls-panel">
      <p className="section-label">Experimental Parameters</p>

      <div className="slider-input">
        <div className="slider-header">
          <label className="slider-label" htmlFor="torsion-material">Wire material</label>
        </div>
        <select
          id="torsion-material"
          className="material-select"
          value={params.material}
          disabled={fixedParametersDisabled}
          onChange={(event) => onChange({ material: event.target.value as MaterialKey })}
          aria-label="Select suspension wire material"
        >
          {(Object.entries(MATERIALS) as [MaterialKey, (typeof MATERIALS)[MaterialKey]][]).map(
            ([key, material]) => (
              <option key={key} value={key}>
                {material.label} ({(material.rigidityModulusPa / 1e9).toFixed(1)} GPa)
              </option>
            ),
          )}
        </select>
      </div>

      <SliderInput
        label="Wire length (l)"
        value={params.l}
        min={0.25}
        max={1}
        step={0.05}
        unit=" m"
        precision={2}
        showNumericInput
        disabled={fixedParametersDisabled}
        onChange={(value) => onChange({ l: value })}
      />

      <SliderInput
        label="Wire diameter (2r)"
        value={Number((params.r * 2000).toFixed(2))}
        min={0.5}
        max={2}
        step={0.1}
        unit=" mm"
        precision={2}
        showNumericInput
        disabled={fixedParametersDisabled}
        onChange={(diameterMm) => onChange({ r: diameterMm / 2000 })}
      />

      <SliderInput
        label="Platform mass (M)"
        value={params.M}
        min={0.2}
        max={1.5}
        step={0.05}
        unit=" kg"
        precision={2}
        showNumericInput
        disabled={fixedParametersDisabled}
        onChange={(value) => onChange({ M: value })}
      />

      <SliderInput
        label="Platform radius (R)"
        value={Number((params.R * 100).toFixed(1))}
        min={5}
        max={15}
        step={0.5}
        unit=" cm"
        precision={1}
        showNumericInput
        disabled={fixedParametersDisabled}
        onChange={(radiusCm) => onChange({ R: radiusCm / 100 })}
      />

      <SliderInput
        label="Each attached mass (m)"
        value={params.m}
        min={0.05}
        max={0.5}
        step={0.01}
        unit=" kg"
        precision={2}
        showNumericInput
        disabled={fixedParametersDisabled}
        onChange={(value) => onChange({ m: value })}
      />

      <SliderInput
        label="Mass position (d)"
        value={Number((params.d * 100).toFixed(1))}
        min={1}
        max={maxMassDistanceCm}
        step={0.5}
        unit=" cm"
        precision={1}
        showNumericInput
        disabled={isTiming}
        onChange={(distanceCm) => onChange({ d: distanceCm / 100 })}
      />

      <SliderInput
        label="Initial angular displacement"
        value={Number((params.theta0 * 180 / Math.PI).toFixed(1))}
        min={2}
        max={20}
        step={1}
        unit="°"
        precision={1}
        showNumericInput
        disabled={fixedParametersDisabled}
        onChange={(degrees) => onChange({ theta0: degrees * Math.PI / 180 })}
      />

      {hasReadings && (
        <p className="torsional-hint">
          The setup is fixed after the first trial. Move the masses to a new <strong>d</strong> for
          each trial so the T² vs I graph compares the same wire and platform.
        </p>
      )}

      <button
        type="button"
        className="btn btn-secondary torsional-reset-button"
        onClick={onResetExperiment}
        disabled={isTiming || isRecording}
      >
        ↺ Reset experiment
      </button>
    </div>
  );
}

export function TimingControls({
  oscillationCount,
  elapsedTimeS,
  manualTotalTimeS,
  measurementMode,
  isTiming,
  canRecordStopwatch,
  canRecordManual,
  isRecording,
  error,
  onOscillationCountChange,
  onManualTotalTimeChange,
  onMeasurementModeChange,
  onStartTiming,
  onStopTiming,
  onRecord,
  onResetTimer,
}: TimingControlsProps) {
  return (
    <div className="torsional-timing-panel">
      <label className="slider-label" htmlFor="torsion-count">
        Complete oscillations to time (N)
      </label>
      <select
        id="torsion-count"
        value={oscillationCount}
        disabled={isTiming}
        onChange={(event) => onOscillationCountChange(Number(event.target.value))}
      >
        {[5, 10, 20, 30].map((count) => (
          <option key={count} value={count}>{count} oscillations</option>
        ))}
      </select>

      <fieldset className="torsional-method-select" disabled={isTiming}>
        <legend>Measurement method</legend>
        <label>
          <input
            type="radio"
            name="torsional-measurement-method"
            value="stopwatch"
            checked={measurementMode === 'stopwatch'}
            onChange={() => onMeasurementModeChange('stopwatch')}
          />
          Stopwatch measurement
        </label>
        <label>
          <input
            type="radio"
            name="torsional-measurement-method"
            value="manual"
            checked={measurementMode === 'manual'}
            onChange={() => onMeasurementModeChange('manual')}
          />
          Manual time entry
        </label>
      </fieldset>

      {measurementMode === 'stopwatch' ? (
        <>
          <p className="torsional-hint">
            Start timing at release, count N complete cycles, then stop at the same point in the
            motion. The period is calculated from your measured time.
          </p>
          <div className="torsional-stopwatch" role="timer" aria-live="off">
            {elapsedTimeS.toFixed(2)} <span>s</span>
          </div>
          <div className="torsional-action-row">
            {isTiming ? (
              <button type="button" className="btn btn-primary" onClick={onStopTiming}>
                Stop timing
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onStartTiming}>
                Release &amp; start
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onResetTimer}
              disabled={isTiming || elapsedTimeS === 0}
            >
              Reset time
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary torsional-record-button"
            onClick={() => onRecord(elapsedTimeS)}
            disabled={!canRecordStopwatch || isRecording}
          >
            Record stopwatch trial
          </button>
        </>
      ) : (
        <div className="torsional-manual-time">
          <label htmlFor="manual-total-time" className="slider-label">
            Total measured time for {oscillationCount} oscillations
          </label>
          <div className="torsional-manual-time-input">
            <input
              id="manual-total-time"
              type="number"
              min={MIN_MEASURED_TIME_S}
              max={MAX_MEASURED_TIME_S}
              step="any"
              inputMode="decimal"
              value={manualTotalTimeS}
              disabled={isRecording}
              aria-label="Manually measured total time in seconds"
              aria-invalid={manualTotalTimeS !== '' && !canRecordManual}
              aria-describedby="manual-total-time-hint"
              onChange={(event) => onManualTotalTimeChange(event.target.value)}
            />
            <span>s</span>
          </div>
          <p id="manual-total-time-hint" className="torsional-hint">
            Enter a measured time from {MIN_MEASURED_TIME_S} to {MAX_MEASURED_TIME_S} seconds.
            {' '}T is calculated as total time / N.
          </p>
          {manualTotalTimeS !== '' && canRecordManual && (
            <p className="torsional-hint" role="status">
              Measured period: {(Number(manualTotalTimeS) / oscillationCount).toFixed(4)} s
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary torsional-record-button"
            onClick={() => onRecord(Number(manualTotalTimeS))}
            disabled={!canRecordManual || isRecording}
          >
            Record manual trial
          </button>
        </div>
      )}
      {error && <p className="torsional-error" role="alert">{error}</p>}
    </div>
  );
}
