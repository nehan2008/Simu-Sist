import { useMemo, useState } from 'react';
import Controls, {
  GuidedProcedure,
  type ManualReadingFields,
  type ManualReadingTarget,
  type ManualReadingsState,
  type MeasurementMode,
} from './controls';
import ExperimentCanvas from './canvas';
import {
  DEFAULT_PARAMS,
  GLASS_MODEL_REFRACTIVE_INDEX,
  computeDeviationCurve,
  computeExperimentResult,
  computeState,
  createTrial,
  createVernierReading,
  findMinimumDeviation,
  formatAngleArcMinutes,
  formatVernierReading,
  normalizeRadians,
  tracePrismRay,
  vernierReadingFromAngle,
} from './simulation';
import type { Params, PrismTrial, TrialReadings, VernierReading } from './simulation';

interface MeasurementDraft {
  directA: VernierReading | null;
  directB: VernierReading | null;
  minimumA: VernierReading | null;
  minimumB: VernierReading | null;
}

const EMPTY_DRAFT: MeasurementDraft = {
  directA: null,
  directB: null,
  minimumA: null,
  minimumB: null,
};

const EMPTY_MANUAL_FIELDS: ManualReadingFields = {
  degrees: '',
  minutes: '',
  coincidence: '',
};

const INITIAL_MANUAL_READINGS: ManualReadingsState = {
  directA: { ...EMPTY_MANUAL_FIELDS },
  directB: { ...EMPTY_MANUAL_FIELDS },
  minimumA: { ...EMPTY_MANUAL_FIELDS },
  minimumB: { ...EMPTY_MANUAL_FIELDS },
};

function manualFieldsFromReading(reading: VernierReading): ManualReadingFields {
  return {
    degrees: String(reading.mainScaleDegrees),
    minutes: String(reading.mainScaleMinutes),
    coincidence: String(reading.vernierCoincidence),
  };
}

function DeviationGraph({
  curve,
  currentRotationRad,
  currentDeviationRad,
  turningPointRad,
  trials,
}: {
  curve: Array<{ rotationRad: number; deviationRad: number }>;
  currentRotationRad: number;
  currentDeviationRad: number;
  turningPointRad: number | null;
  trials: PrismTrial[];
}) {
  const width = 620;
  const height = 270;
  const padding = { top: 24, right: 24, bottom: 46, left: 62 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const samples = curve.filter((point) => Number.isFinite(point.deviationRad));

  if (samples.length < 2) {
    return (
      <div className="prism-graph-section">
        <h2>Deviation vs prism-table rotation</h2>
        <p className="prism-muted">The ray does not emerge at this setting.</p>
      </div>
    );
  }

  const observedTrials = trials
    .filter(
      (trial): trial is PrismTrial & { prismRotationRad: number } =>
        typeof trial.prismRotationRad === 'number' && Number.isFinite(trial.prismRotationRad),
    )
    .map((trial) => ({
      trial,
      rotationRad: trial.prismRotationRad,
      deviationRad: trial.meanDeviationArcMinutes * Math.PI / (180 * 60),
    }));
  const curveDeviations = samples.map((point) => point.deviationRad);
  const observedDeviations = observedTrials.map((observation) => observation.deviationRad);
  const minimumDeviation = Math.min(...curveDeviations, ...observedDeviations) * 180 / Math.PI;
  const maximumDeviation = Math.max(...curveDeviations, ...observedDeviations) * 180 / Math.PI;
  const curveXMin = samples[0]?.rotationRad ?? 0;
  const curveXMax = samples[samples.length - 1]?.rotationRad ?? 1;
  const observedRotations = observedTrials.map((observation) => observation.rotationRad);
  const xMin = Math.min(curveXMin, ...observedRotations);
  const xMax = Math.max(curveXMax, ...observedRotations);
  const yMin = minimumDeviation - 1;
  const yMax = maximumDeviation + 1;
  const toX = (rotationRad: number) =>
    padding.left + (rotationRad - xMin) / (xMax - xMin) * plotWidth;
  const toY = (deviationRad: number) =>
    padding.top + plotHeight -
    (deviationRad * 180 / Math.PI - yMin) / (yMax - yMin) * plotHeight;
  const path = samples
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.rotationRad)} ${toY(point.deviationRad)}`)
    .join(' ');
  const currentY = currentDeviationRad * 180 / Math.PI;

  return (
    <div className="prism-graph-section">
      <div className="prism-subsection-heading">
        <div>
          <h2>Deviation vs prism-table rotation</h2>
          <p>Model ray trace; markers show trials with a recorded prism-table angle.</p>
        </div>
        <strong>D = {currentY.toFixed(2)}°</strong>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="prism-graph"
        role="img"
        aria-label="Ray-traced deviation curve with recorded experimental deviations and the turning point"
      >
        <rect width={width} height={height} rx="8" fill="var(--code-bg, #151923)" />
        {Array.from({ length: 5 }, (_, index) => {
          const fraction = index / 4;
          const x = padding.left + fraction * plotWidth;
          const y = padding.top + fraction * plotHeight;
          return (
            <g key={index}>
              <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke="var(--border, #303746)" />
              <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="var(--border, #303746)" />
              <text x={x} y={height - 24} textAnchor="middle" fill="var(--text, #aab4c5)" fontSize="9">
                {((xMin + fraction * (xMax - xMin)) * 180 / Math.PI).toFixed(1)}°
              </text>
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="var(--text, #aab4c5)" fontSize="9">
                {(yMax - fraction * (yMax - yMin)).toFixed(1)}°
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#7edbd0" strokeWidth="2.5" />
        {observedTrials.map(({ trial, rotationRad, deviationRad }) => (
          <circle
            key={trial.trial}
            className="prism-observed-point"
            cx={toX(rotationRad)}
            cy={toY(deviationRad)}
            r="5"
            fill="#c69cff"
            stroke="#171e2b"
            strokeWidth="2"
          >
            <title>
              {`Trial ${trial.trial}: recorded D ${(trial.meanDeviationArcMinutes / 60).toFixed(2)}° at φ ${(rotationRad * 180 / Math.PI).toFixed(1)}°`}
            </title>
          </circle>
        ))}
        {turningPointRad !== null && (
          <g>
            <line
              x1={toX(turningPointRad)}
              y1={padding.top}
              x2={toX(turningPointRad)}
              y2={padding.top + plotHeight}
              stroke="#f4bd69"
              strokeDasharray="5 5"
            />
            <text x={toX(turningPointRad) + 5} y={padding.top + 13} fill="#f4bd69" fontSize="9">
              turning point
            </text>
          </g>
        )}
        {currentRotationRad >= xMin && currentRotationRad <= xMax && (
          <circle
            cx={toX(currentRotationRad)}
            cy={toY(currentDeviationRad)}
            r="5"
            fill="#ffe18b"
            stroke="#171e2b"
            strokeWidth="2"
          />
        )}
        <text x={padding.left + plotWidth / 2} y={height - 6} textAnchor="middle" fill="var(--text-h, #e2e8f0)" fontSize="10">
          Prism-table rotation φ (°)
        </text>
        <text
          x="16"
          y={padding.top + plotHeight / 2}
          textAnchor="middle"
          fill="var(--text-h, #e2e8f0)"
          fontSize="10"
          transform={`rotate(-90 16 ${padding.top + plotHeight / 2})`}
        >
          Deviation D (°)
        </text>
      </svg>
      <p className="prism-muted">
        As the prism passes the minimum, the image motion reverses. The plotted point follows the live prism setting.
      </p>
    </div>
  );
}

function ReadingCell({ reading }: { reading: VernierReading }) {
  return <span title={formatVernierReading(reading)}>{formatVernierReading(reading)}</span>;
}

function ObservationTable({ trials }: { trials: PrismTrial[] }) {
  return (
    <section className="prism-observations">
      <div className="prism-subsection-heading">
        <div>
          <p className="section-label">Observation table</p>
          <h2>Minimum-deviation measurements</h2>
        </div>
        <span className="prism-trial-count">{trials.length} trial{trials.length === 1 ? '' : 's'}</span>
      </div>
      <div className="prism-table-scroll">
        <table className="obs-table" aria-label="Prism spectrometer vernier observations">
          <thead>
            <tr>
              <th rowSpan={2}>Trial</th>
              <th colSpan={3}>Vernier A</th>
              <th colSpan={3}>Vernier B</th>
              <th rowSpan={2}>Mean D</th>
              <th rowSpan={2}>μ</th>
              <th rowSpan={2}>v (m/s)</th>
            </tr>
            <tr>
              <th>Minimum</th>
              <th>Direct</th>
              <th>D<sub>A</sub></th>
              <th>Minimum</th>
              <th>Direct</th>
              <th>D<sub>B</sub></th>
            </tr>
          </thead>
          <tbody>
            {trials.length > 0 ? trials.map((trial) => (
              <tr key={trial.trial} className="observation-row">
                <td data-label="Trial">{trial.trial}</td>
                <td data-label="Vernier A · minimum"><ReadingCell reading={trial.minimumA} /></td>
                <td data-label="Vernier A · direct"><ReadingCell reading={trial.directA} /></td>
                <td data-label="Vernier A · deviation">{formatAngleArcMinutes(trial.deviationAArcMinutes, 0)}</td>
                <td data-label="Vernier B · minimum"><ReadingCell reading={trial.minimumB} /></td>
                <td data-label="Vernier B · direct"><ReadingCell reading={trial.directB} /></td>
                <td data-label="Vernier B · deviation">{formatAngleArcMinutes(trial.deviationBArcMinutes, 0)}</td>
                <td data-label="Mean deviation">{formatAngleArcMinutes(trial.meanDeviationArcMinutes, 1)}</td>
                <td data-label="Refractive index">{trial.refractiveIndex.toFixed(4)}</td>
                <td data-label="Speed in medium">{trial.speedMPerS.toExponential(3)}</td>
              </tr>
            )) : (
              <tr className="observations-empty-row">
                <td colSpan={10} className="observations-empty">
                  Complete the direct-ray and minimum-deviation readings, then record a trial.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PrismSpectrometerExperiment() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [mode, setMode] = useState<MeasurementMode>('experimental');
  const [draft, setDraft] = useState<MeasurementDraft>(EMPTY_DRAFT);
  const [manualReadings, setManualReadings] = useState<ManualReadingsState>(INITIAL_MANUAL_READINGS);
  const [trials, setTrials] = useState<PrismTrial[]>([]);
  const [error, setError] = useState('');
  const [minimumCaptureError, setMinimumCaptureError] = useState('');

  const turningPoint = useMemo(
    () => findMinimumDeviation(GLASS_MODEL_REFRACTIVE_INDEX),
    [],
  );
  const state = useMemo(
    () => computeState(params, turningPoint),
    [params, turningPoint],
  );
  const deviationCurve = useMemo(
    () => computeDeviationCurve(GLASS_MODEL_REFRACTIVE_INDEX),
    [],
  );
  const currentRayTrace = useMemo(
    () => tracePrismRay(params.prismRotationRad),
    [params.prismRotationRad],
  );
  const result = useMemo(() => computeExperimentResult(trials), [trials]);
  const directComplete = Boolean(draft.directA && draft.directB);
  const minimumComplete = Boolean(draft.minimumA && draft.minimumB);
  const canRecord = directComplete && minimumComplete;
  const workflowStep = mode === 'manual'
    ? !directComplete ? 1 : !minimumComplete ? 2 : 3
    : !state.telescopeAligned && !params.prismInserted
      ? 1
      : !directComplete
        ? 2
        : !params.prismInserted
          ? 3
          : !state.atTurningPoint
            ? 4
            : !minimumComplete
              ? 5
              : 6;

  function handleParamChange(updated: Partial<Params>) {
    setParams((previous) => ({
      ...previous,
      ...updated,
      ...(updated.telescopeRotationRad !== undefined
        ? { telescopeRotationRad: normalizeRadians(updated.telescopeRotationRad) }
        : {}),
    }));
    if (updated.prismRotationRad !== undefined) {
      setDraft((previous) => ({ ...previous, minimumA: null, minimumB: null }));
    }
    if (updated.telescopeRotationRad !== undefined) {
      setDraft((previous) => params.prismInserted
        ? { ...previous, minimumA: null, minimumB: null }
        : { ...previous, directA: null, directB: null });
    }
    setMinimumCaptureError('');
    setError('');
  }

  function handleTogglePrism() {
    if (!params.prismInserted && !directComplete) {
      setError('Record both direct-ray vernier readings before inserting the prism.');
      return;
    }
    setParams((previous) => ({ ...previous, prismInserted: !previous.prismInserted }));
    if (params.prismInserted) {
      setDraft((previous) => ({ ...previous, minimumA: null, minimumB: null }));
    }
    setMinimumCaptureError('');
    setError('');
  }

  function handleCaptureDirect() {
    if (params.prismInserted || !state.telescopeAligned) {
      setError('Align the telescope to the direct slit image before capturing readings.');
      return;
    }
    const directA = vernierReadingFromAngle(params.telescopeRotationRad);
    const directB = vernierReadingFromAngle(params.telescopeRotationRad + Math.PI);
    if (!directA || !directB) {
      setError('The telescope angle could not be converted to a vernier reading.');
      return;
    }
    setDraft((previous) => ({ ...previous, directA, directB }));
    setManualReadings((previous) => ({
      ...previous,
      directA: manualFieldsFromReading(directA),
      directB: manualFieldsFromReading(directB),
    }));
    setError('');
  }

  function handleCaptureMinimum() {
    if (!params.prismInserted) {
      setMinimumCaptureError('Insert the prism before capturing minimum-deviation readings.');
      return;
    }
    if (!state.atTurningPoint) {
      setMinimumCaptureError('Rotate the prism table to the minimum-deviation turning point before capturing readings.');
      return;
    }
    if (!state.telescopeAligned) {
      setMinimumCaptureError('Align the telescope crosswire with the refracted image before capturing readings.');
      return;
    }
    const minimumA = vernierReadingFromAngle(params.telescopeRotationRad);
    const minimumB = vernierReadingFromAngle(params.telescopeRotationRad + Math.PI);
    if (!minimumA || !minimumB) {
      setMinimumCaptureError('The telescope angle could not be converted to a vernier reading.');
      return;
    }
    setDraft((previous) => ({ ...previous, minimumA, minimumB }));
    setManualReadings((previous) => ({
      ...previous,
      minimumA: manualFieldsFromReading(minimumA),
      minimumB: manualFieldsFromReading(minimumB),
    }));
    setMinimumCaptureError('');
  }

  function handleAlignTelescope() {
    if (!params.prismInserted || !state.ray.valid) {
      setError('Insert the prism before aligning the telescope to the refracted image.');
      return;
    }
    handleParamChange({ telescopeRotationRad: normalizeRadians(state.outgoingAngleRad) });
  }

  function handleManualReadingChange(
    target: ManualReadingTarget,
    updated: Partial<ManualReadingFields>,
  ) {
    setManualReadings((previous) => ({
      ...previous,
      [target]: { ...previous[target], ...updated },
    }));
    setDraft((previous) => ({ ...previous, [target]: null }));
    setError('');
  }

  function handleApplyManual(target: ManualReadingTarget) {
    const fields = manualReadings[target];
    const degrees = fields.degrees.trim() === '' ? Number.NaN : Number(fields.degrees);
    const minutes = fields.minutes.trim() === '' ? Number.NaN : Number(fields.minutes);
    const coincidence =
      fields.coincidence.trim() === '' ? Number.NaN : Number(fields.coincidence);
    const reading = createVernierReading(degrees, minutes, coincidence);
    if (!reading) {
      setError('Enter MSR degrees from 0–359, MSR minutes of 00′ or 30′, and VSC from 0–29.');
      return;
    }
    setDraft((previous) => ({ ...previous, [target]: reading }));
    setError('');
  }

  function handleRecordTrial() {
    if (!draft.directA || !draft.directB || !draft.minimumA || !draft.minimumB) {
      setError('Capture or enter direct-ray and minimum-deviation readings for both verniers.');
      return;
    }
    const readings: TrialReadings = {
      directA: draft.directA,
      directB: draft.directB,
      minimumA: draft.minimumA,
      minimumB: draft.minimumB,
    };
    const trial = createTrial(
      trials.length + 1,
      readings,
      mode === 'experimental' ? params.prismRotationRad : null,
    );
    if (!trial) {
      setError('The readings do not form a valid deviation between 0° and 120°. Check the MSR and VSC values.');
      return;
    }
    setTrials((previous) => [...previous, trial]);
    setDraft((previous) => ({ ...previous, minimumA: null, minimumB: null }));
    setError('');
  }

  function handleReset() {
    setParams(DEFAULT_PARAMS);
    setMode('experimental');
    setDraft(EMPTY_DRAFT);
    setManualReadings(INITIAL_MANUAL_READINGS);
    setTrials([]);
    setMinimumCaptureError('');
    setError('');
  }

  return (
    <div className="experiment-layout prism-layout">
      <div className="prism-main-column">
        <section className="prism-apparatus-column" aria-label="Spectrometer simulation">
          <div className="experiment-canvas-area prism-canvas-area">
            <ExperimentCanvas
              params={params}
              state={state}
              onTelescopeRotationChange={(telescopeRotationRad) => handleParamChange({ telescopeRotationRad })}
              onPrismRotationChange={(prismRotationRad) => handleParamChange({ prismRotationRad })}
            />
          </div>

          <div className="prism-live-row">
            <GuidedProcedure
              mode={mode}
              workflowStep={workflowStep}
              prismInserted={params.prismInserted}
              rayValid={state.ray.valid}
              onAlignTelescope={handleAlignTelescope}
            />
            <section className="prism-live-panel measurements-panel" aria-label="Live prism calculations" aria-live="polite">
              <div className="prism-subsection-heading">
                <div>
                  <p className="section-label">Live apparatus</p>
                  <h2>Optical readings</h2>
                </div>
                <span className={`prism-live-badge${state.atTurningPoint ? ' is-turning' : ''}`}>
                  {state.atTurningPoint ? 'Turning point found' : params.prismInserted ? 'Prism inserted' : 'Direct-ray mode'}
                </span>
              </div>
              <div className="prism-live-grid">
                <div>
                  <span>Ray-traced deviation</span>
                  <strong>{params.prismInserted && state.ray.valid ? `${(state.deviationRad * 180 / Math.PI).toFixed(2)}°` : '—'}</strong>
                </div>
                <div>
                  <span>Model turning-point D</span>
                  <strong>{turningPoint ? `${(turningPoint.deviationRad * 180 / Math.PI).toFixed(2)}°` : '—'}</strong>
                </div>
                <div>
                  <span>Telescope alignment</span>
                  <strong>{state.telescopeAligned ? 'Aligned' : 'Adjust to image'}</strong>
                </div>
                <div>
                  <span>Mean from recorded trials</span>
                  <strong>{result.trialCount > 0 ? formatAngleArcMinutes(result.meanDeviationArcMinutes, 1) : '—'}</strong>
                </div>
              </div>
              <p className="prism-formula-note">
                A = 60° · μ = sin[(A + D)/2] / sin(A/2) · v = 3 × 10⁸ / μ. The displayed ray model uses μ ≈ 1.52;
                experimental results use the recorded vernier readings.
              </p>
            </section>
          </div>
        </section>

        <main className="prism-results-column">
          <ObservationTable trials={trials} />

          <DeviationGraph
            curve={deviationCurve}
            currentRotationRad={params.prismRotationRad}
            currentDeviationRad={currentRayTrace.valid ? currentRayTrace.deviationRad : 0}
            turningPointRad={turningPoint?.rotationRad ?? null}
            trials={trials}
          />

          <section className="results-panel prism-result-panel" aria-live="polite">
            <h2>Experimental result</h2>
            {result.trialCount > 0 ? (
              <div className="prism-result-grid">
                <div><span>Mean minimum deviation, D</span><strong>{formatAngleArcMinutes(result.meanDeviationArcMinutes, 1)}</strong></div>
                <div><span>Refractive index, μ</span><strong>{result.refractiveIndex.toFixed(4)}</strong></div>
                <div><span>Speed in solid glass, v</span><strong>{result.speedMPerS.toExponential(4)} m/s</strong></div>
                <div><span>Recorded trials</span><strong>{result.trialCount}</strong></div>
              </div>
            ) : (
              <p className="prism-muted">Record at least one valid trial to calculate μ and the speed of light in the glass prism.</p>
            )}
          </section>
        </main>
      </div>

      <aside className="experiment-sidebar prism-sidebar">
        <Controls
          mode={mode}
          params={params}
          state={state}
          directA={draft.directA}
          directB={draft.directB}
          minimumA={draft.minimumA}
          minimumB={draft.minimumB}
          manualReadings={manualReadings}
          trialNumber={trials.length + 1}
          canRecord={canRecord}
          error={error}
          minimumCaptureError={minimumCaptureError}
          onParamChange={handleParamChange}
          onModeChange={setMode}
          onTogglePrism={handleTogglePrism}
          onCaptureDirect={handleCaptureDirect}
          onCaptureMinimum={handleCaptureMinimum}
          onManualReadingChange={handleManualReadingChange}
          onApplyManual={handleApplyManual}
          onRecordTrial={handleRecordTrial}
          onReset={handleReset}
        />
      </aside>
    </div>
  );
}
