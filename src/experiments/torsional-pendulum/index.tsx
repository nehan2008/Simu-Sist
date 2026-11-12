import { useEffect, useMemo, useRef, useState } from 'react';
import Controls, { TimingControls, type MeasurementMode } from './controls';
import ExperimentCanvas from './canvas';
import {
  DEFAULT_PARAMS,
  computeResult,
  computeState,
  createReading,
  isValidParams,
  isValidMeasuredTime,
} from './simulation';
import type { Params, Reading } from './simulation';

function T2InertiaGraph({
  readings,
  slope,
  canFit,
}: {
  readings: Reading[];
  slope: number;
  canFit: boolean;
}) {
  if (readings.length === 0 || !canFit) {
    return (
      <div className="graph-section">
        <h3>T² vs moment of inertia</h3>
        <p className="graph-note" role="status">
          {readings.length === 0
            ? 'Record measured trials at different mass positions to plot the data.'
            : 'Change d between trials to obtain distinct moments of inertia and calculate a graph slope.'}
        </p>
      </div>
    );
  }

  const svgWidth = 500;
  const svgHeight = 250;
  const pad = { top: 20, right: 24, bottom: 48, left: 72 };
  const plotWidth = svgWidth - pad.left - pad.right;
  const plotHeight = svgHeight - pad.top - pad.bottom;
  const maxInertia = Math.max(...readings.map((reading) => reading.momentOfInertia)) * 1.12;
  const maxPeriodSquared = Math.max(...readings.map((reading) => reading.periodSquaredS2)) * 1.12;
  const xMax = maxInertia > 0 ? maxInertia : 1;
  const yMax = maxPeriodSquared > 0 ? maxPeriodSquared : 1;
  const toX = (value: number) => pad.left + value / xMax * plotWidth;
  const toY = (value: number) => pad.top + plotHeight - value / yMax * plotHeight;
  const fitEndInertia = slope > 0 ? Math.min(xMax, yMax / slope) : 0;

  return (
    <div className="graph-section">
      <h3>T² vs moment of inertia</h3>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="svg-graph"
        role="img"
        aria-label="Measured period squared plotted against moment of inertia"
      >
        <rect width={svgWidth} height={svgHeight} fill="var(--code-bg)" rx="6" />

        {Array.from({ length: 5 }, (_, index) => {
          const fraction = index / 4;
          const x = pad.left + fraction * plotWidth;
          const y = pad.top + fraction * plotHeight;
          return (
            <g key={index}>
              <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotHeight} stroke="var(--border)" />
              <line x1={pad.left} y1={y} x2={pad.left + plotWidth} y2={y} stroke="var(--border)" />
              <text x={x} y={pad.top + plotHeight + 16} textAnchor="middle" fontSize="9" fill="var(--text)">
                {(fraction * xMax).toFixed(4)}
              </text>
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text)">
                {((1 - fraction) * yMax).toFixed(2)}
              </text>
            </g>
          );
        })}

        <line
          x1={pad.left}
          y1={pad.top + plotHeight}
          x2={pad.left + plotWidth}
          y2={pad.top + plotHeight}
          stroke="var(--text-h)"
        />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotHeight} stroke="var(--text-h)" />

        {fitEndInertia > 0 && (
          <line
            x1={toX(0)}
            y1={toY(0)}
            x2={toX(fitEndInertia)}
            y2={toY(slope * fitEndInertia)}
            stroke="var(--accent)"
            strokeWidth="2"
          />
        )}

        {readings.map((reading) => (
          <g key={reading.trial}>
            <circle
              cx={toX(reading.momentOfInertia)}
              cy={toY(reading.periodSquaredS2)}
              r="4.5"
              fill="#f1a64a"
            >
              <title>
                Trial {reading.trial}: I={reading.momentOfInertia.toExponential(3)} kg·m²,
                T²={reading.periodSquaredS2.toFixed(4)} s²
              </title>
            </circle>
          </g>
        ))}

        <text
          x={pad.left + plotWidth / 2}
          y={svgHeight - 7}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-h)"
        >
          Moment of inertia I (kg·m²)
        </text>
        <text
          x="15"
          y={pad.top + plotHeight / 2}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-h)"
          transform={`rotate(-90 15 ${pad.top + plotHeight / 2})`}
        >
          Period squared T² (s²)
        </text>
      </svg>
      <p className="graph-note">
        The best-fit line is constrained through the origin. Its slope is used with the same wire
        dimensions to estimate η.
      </p>
    </div>
  );
}

export default function TorsionalPendulumExperiment() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [oscillationCount, setOscillationCount] = useState(10);
  const [elapsedTimeS, setElapsedTimeS] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>('stopwatch');
  const [manualTotalTimeS, setManualTotalTimeS] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const timerStartRef = useRef<number | null>(null);
  const recordingRef = useRef(false);

  const state = useMemo(() => computeState(params), [params]);
  const result = useMemo(() => computeResult(readings), [readings]);
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;
  const canRecordStopwatch =
    !isTiming && isValidMeasuredTime(elapsedTimeS) && isValidParams(params);
  const manualTimeValue = manualTotalTimeS.trim() === '' ? Number.NaN : Number(manualTotalTimeS);
  const canRecordManual =
    !isTiming && isValidMeasuredTime(manualTimeValue) && isValidParams(params);

  useEffect(() => {
    if (!isTiming) return undefined;

    const timerId = window.setInterval(() => {
      if (timerStartRef.current !== null) {
        setElapsedTimeS((performance.now() - timerStartRef.current) / 1000);
      }
    }, 30);

    return () => window.clearInterval(timerId);
  }, [isTiming]);

  function handleParamChange(updated: Partial<Params>) {
    if (isTiming) return;
    if (readings.length > 0 && Object.keys(updated).some((key) => key !== 'd')) return;

    setParams((previous) => {
      const next = { ...previous, ...updated };
      if (updated.R !== undefined) {
        next.d = Math.min(next.d, next.R - 0.005);
      }
      return next;
    });
    setError('');
  }

  function handleStartTiming() {
    if (!isValidParams(params) || isTiming || measurementMode !== 'stopwatch' || isRecording) return;
    setElapsedTimeS(0);
    setError('');
    timerStartRef.current = performance.now();
    setIsTiming(true);
  }

  function handleStopTiming() {
    if (!isTiming || timerStartRef.current === null) return;
    const measuredTimeS = (performance.now() - timerStartRef.current) / 1000;
    setElapsedTimeS(measuredTimeS);
    timerStartRef.current = null;
    setIsTiming(false);
    if (!isValidMeasuredTime(measuredTimeS)) {
      setError('Measured time must be between 0.1 and 3600 seconds.');
    }
  }

  function handleResetTimer() {
    if (isTiming) return;
    timerStartRef.current = null;
    setElapsedTimeS(0);
    setError('');
  }

  function recordMeasurement(totalTimeS: number) {
    if (recordingRef.current || isTiming || !isValidParams(params)) return;
    recordingRef.current = true;
    setIsRecording(true);

    const reading = createReading(
      readings.length + 1,
      params,
      oscillationCount,
      totalTimeS,
    );
    if (!reading) {
      recordingRef.current = false;
      setIsRecording(false);
      setError('The measured time or experiment parameters are invalid. Reset the timer and try again.');
      return;
    }

    setReadings((previous) => [...previous, reading]);
    setElapsedTimeS(0);
    setManualTotalTimeS('');
    setError('');
    window.setTimeout(() => {
      recordingRef.current = false;
      setIsRecording(false);
    }, 0);
  }

  function handleResetExperiment() {
    if (isTiming || isRecording) return;
    timerStartRef.current = null;
    setParams(DEFAULT_PARAMS);
    setReadings([]);
    setOscillationCount(10);
    setElapsedTimeS(0);
    setMeasurementMode('stopwatch');
    setManualTotalTimeS('');
    recordingRef.current = false;
    setIsRecording(false);
    setError('');
  }

  return (
    <div className="torsional-pendulum-layout">
      <div className="torsional-pendulum-grid">
        <div className="torsional-main-column">
          <div className="torsional-apparatus-row">
            <div className="experiment-canvas-area torsional-canvas-area">
              <ExperimentCanvas
                params={params}
                state={state}
                elapsedTimeS={elapsedTimeS}
                oscillationCount={oscillationCount}
              />
            </div>
            <TimingControls
              oscillationCount={oscillationCount}
              elapsedTimeS={elapsedTimeS}
              manualTotalTimeS={manualTotalTimeS}
              measurementMode={measurementMode}
              isTiming={isTiming}
              canRecordStopwatch={canRecordStopwatch}
              canRecordManual={canRecordManual}
              isRecording={isRecording}
              error={error}
              onOscillationCountChange={setOscillationCount}
              onManualTotalTimeChange={(value) => {
                setManualTotalTimeS(value);
                setError('');
              }}
              onMeasurementModeChange={(mode) => {
                if (!isTiming) {
                  setMeasurementMode(mode);
                  setError('');
                }
              }}
              onStartTiming={handleStartTiming}
              onStopTiming={handleStopTiming}
              onRecord={recordMeasurement}
              onResetTimer={handleResetTimer}
            />
          </div>

          <section className="torsional-observations">
            <p className="section-label">Observation table</p>
            <div className="torsional-table-scroll">
              <table className="obs-table" aria-label="Torsional pendulum observations">
                <thead>
                  <tr>
                    <th>Trial</th>
                    <th>d (cm)</th>
                    <th>I (kg·m²)</th>
                    <th>N</th>
                    <th>Measured t (s)</th>
                    <th>T (s)</th>
                    <th>T² (s²)</th>
                    <th>η (GPa)</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.length > 0 ? readings.map((reading) => (
                    <tr key={reading.trial} className="observation-row">
                      <td data-label="Trial">{reading.trial}</td>
                      <td data-label="d (cm)">{(reading.d * 100).toFixed(1)}</td>
                      <td data-label="I (kg·m²)">{reading.momentOfInertia.toExponential(3)}</td>
                      <td data-label="N">{reading.oscillations}</td>
                      <td data-label="Measured t (s)">{reading.totalTimeS.toFixed(3)}</td>
                      <td data-label="T (s)">{reading.periodS.toFixed(4)}</td>
                      <td data-label="T² (s²)">{reading.periodSquaredS2.toFixed(5)}</td>
                      <td data-label="η (GPa)">{(reading.rigidityModulusPa / 1e9).toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr className="observations-empty-row">
                      <td colSpan={8} className="observations-empty">
                        No observations yet. Time complete oscillations and record a trial.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="torsional-graph">
            <T2InertiaGraph
              readings={readings}
              slope={result.slopeS2PerKgM2}
              canFit={result.canFitGraph}
            />
          </section>

          <section className="results-panel torsional-results" aria-live="polite">
            <h3>Experimental result</h3>
            {latestReading ? (
              <>
                <div className="result-row">
                  <span>Measured period, T = t/N</span>
                  <span className="result-value">{latestReading.periodS.toFixed(4)} s</span>
                </div>
                <div className="result-row">
                  <span>Rigidity modulus from measured T</span>
                  <span className="result-value">
                    {(latestReading.rigidityModulusPa / 1e9).toFixed(2)} GPa
                  </span>
                </div>
                <div className="result-row">
                  <span>Mean experimental η</span>
                  <span className="result-value">
                    {(result.meanRigidityModulusPa / 1e9).toFixed(2)} GPa
                  </span>
                </div>
                <div className="result-row">
                  <span>Reference η</span>
                  <span className="result-ref">
                    {(result.meanReferenceRigidityPa / 1e9).toFixed(1)} GPa
                  </span>
                </div>
                <div className="result-row">
                  <span>Percentage error</span>
                  <span className="result-value">{result.percentError.toFixed(2)}%</span>
                </div>
                {result.canFitGraph && (
                  <div className="result-row">
                    <span>η from T² vs I slope</span>
                    <span className="result-value">
                      {(result.rigidityFromSlopePa / 1e9).toFixed(2)} GPa
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="graph-note">Record a timed trial to calculate rigidity modulus from measured data.</p>
            )}
            <p className="torsional-formula">
              η = 8πIl / (r⁴T²), with T = measured time / N
            </p>
          </section>
        </div>

        <aside className="experiment-sidebar torsional-sidebar">
          <Controls
            params={params}
            isTiming={isTiming}
            hasReadings={readings.length > 0}
            isRecording={isRecording}
            onChange={handleParamChange}
            onResetExperiment={handleResetExperiment}
          />

          <section className="torsional-readout" aria-label="Current apparatus calculations">
            <h3>Apparatus values</h3>
            <div className="result-row">
              <span>Platform inertia, ½MR²</span>
              <span className="result-value">{state.platformMomentOfInertia.toExponential(3)} kg·m²</span>
            </div>
            <div className="result-row">
              <span>Total inertia, I</span>
              <span className="result-value">{state.momentOfInertia.toExponential(3)} kg·m²</span>
            </div>
            <div className="result-row">
              <span>Torsional constant, C</span>
              <span className="result-value">{state.torsionalConstant.toExponential(3)} N·m/rad</span>
            </div>
            <p className="torsional-hint">
              Reference rigidity: {state.materialLabel}, {(state.referenceRigidityPa / 1e9).toFixed(1)} GPa.
              The reference period animates the apparatus; it is not used to calculate the measured η.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
