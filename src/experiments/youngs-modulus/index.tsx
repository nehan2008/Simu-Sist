/**
 * Young's Modulus by Non-Uniform Bending — Experiment Orchestrator
 *
 * This experiment is NOT time-stepped. The beam deflects instantly
 * in response to parameter changes. useMemo drives all computed values.
 *
 * Students can record observations using either the virtual microscope or
 * independently entered manual experiment parameters.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import Controls from './controls';
import ExperimentCanvas from './canvas';
import SliderInput from '../../components/ui/SliderInput';
import {
  DEFAULT_PARAMS,
  MATERIALS,
  AUTO_MAX_READINGS,
  AUTO_MIN_READINGS,
  computeState,
  computeE,
  computeResult,
  createAutomaticReading,
  getAutomaticLoads,
} from './simulation';
import type { MaterialKey, ObservationSequence, Params, Reading } from './simulation';

// ── SVG Line Graph ────────────────────────────────────────────────────────────

interface GraphPoint {
  x: number;
  y: number;
  label: string;
  sequence: ObservationSequence;
}

const SEQUENCE_COLORS: Record<ObservationSequence, string> = {
  Loading: '#64c9a5',
  Unloading: '#eca95d',
};

function LoadDepressionGraph({ readings }: { readings: Reading[] }) {
  if (readings.length === 0) {
    return (
      <div className="graph-section">
        <h3>Load vs Depression</h3>
        <p className="graph-note" role="status">
          No observations yet. Add loading and unloading readings to plot the data.
        </p>
      </div>
    );
  }

  const SVG_W = 480;
  const SVG_H = 200;
  const PAD = { top: 16, right: 24, bottom: 44, left: 56 };
  const plotW = SVG_W - PAD.left - PAD.right;
  const plotH = SVG_H - PAD.top - PAD.bottom;

  const Ws = readings.map((r) => r.W);
  const ys = readings.map((r) => r.y * 1000); // convert to mm

  const minW = 0;
  const maxW = Math.max(...Ws) * 1.15;
  const minY = 0;
  const maxY = Math.max(...ys) * 1.15 || 1;

  const toSvg = (
    W: number,
    y: number,
    source: Reading['source'],
    sequence: ObservationSequence,
  ): GraphPoint => ({
    x: PAD.left + ((W - minW) / (maxW - minW)) * plotW,
    y: PAD.top + plotH - ((y - minY) / (maxY - minY)) * plotH,
    label: `${sequence} · ${source}: W=${W.toFixed(2)} N, y=${y.toFixed(3)} mm`,
    sequence,
  });

  const points = readings.map((r) => toSvg(r.W, r.y * 1000, r.source, r.sequence));

  // Axis ticks
  const xTicks = 5;
  const yTicks = 4;

  return (
    <div className="graph-section">
      <h3>Load vs Depression</h3>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="svg-graph"
        role="img"
        aria-label="Load versus depression graph"
        style={{ maxHeight: 220 }}
      >
        <rect width={SVG_W} height={SVG_H} fill="var(--code-bg, #f4f3ec)" rx={6} />

        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const gy = PAD.top + (i / yTicks) * plotH;
          return <line key={i} x1={PAD.left} y1={gy} x2={PAD.left + plotW} y2={gy} stroke="var(--border)" strokeWidth={0.5} />;
        })}

        {/* X axis */}
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="var(--text)" strokeWidth={1} />
        {/* Y axis */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="var(--text)" strokeWidth={1} />

        {/* X ticks + labels */}
        {Array.from({ length: xTicks + 1 }).map((_, i) => {
          const val = minW + (i / xTicks) * (maxW - minW);
          const gx = PAD.left + (i / xTicks) * plotW;
          return (
            <g key={i}>
              <line x1={gx} y1={PAD.top + plotH} x2={gx} y2={PAD.top + plotH + 4} stroke="var(--text)" strokeWidth={1} />
              <text x={gx} y={PAD.top + plotH + 14} textAnchor="middle" fontSize={9} fill="var(--text)">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Y ticks + labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const val = minY + ((yTicks - i) / yTicks) * (maxY - minY);
          const gy = PAD.top + (i / yTicks) * plotH;
          return (
            <g key={i}>
              <line x1={PAD.left - 4} y1={gy} x2={PAD.left} y2={gy} stroke="var(--text)" strokeWidth={1} />
              <text x={PAD.left - 7} y={gy} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--text)">
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text x={PAD.left + plotW / 2} y={SVG_H - 4} textAnchor="middle" fontSize={10} fill="var(--text-h)" fontWeight="600">
          Load W (N)
        </text>
        <text
          x={12}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-h)"
          fontWeight="600"
          transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}
        >
          Depression y (mm)
        </text>

        {/* Data line */}
        {(['Loading', 'Unloading'] as const).map((sequence) => {
          const sequencePoints = points.filter((point) => point.sequence === sequence);
          return sequencePoints.length > 1 ? (
            <polyline
              key={sequence}
              points={sequencePoints.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke={SEQUENCE_COLORS[sequence]}
              strokeWidth={1.8}
            />
          ) : null;
        })}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={SEQUENCE_COLORS[p.sequence]} />
            <title>{p.label}</title>
          </g>
        ))}
      </svg>
      <div className="youngs-graph-legend" aria-label="Graph sequence legend">
        {(['Loading', 'Unloading'] as const).map((sequence) => (
          <span key={sequence}>
            <i style={{ backgroundColor: SEQUENCE_COLORS[sequence] }} />
            {sequence}
          </span>
        ))}
      </div>
      <p className="graph-note">
        Separate colors distinguish loading and unloading observations; both follow the measured load–depression response.
      </p>
    </div>
  );
}

// ── Main Experiment Component ─────────────────────────────────────────────────

export default function YoungsModulusExperiment() {
  const [activeTab, setActiveTab] = useState<'microscope' | 'manual'>('microscope');
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [sequence, setSequence] = useState<ObservationSequence>('Loading');
  const [requestedReadingCount, setRequestedReadingCount] = useState(6);
  const [automaticProgress, setAutomaticProgress] = useState<{
    sequence: ObservationSequence;
    completed: number;
    total: number;
  } | null>(null);
  const [automaticError, setAutomaticError] = useState('');
  const [microscopeReading, setMicroscopeReading] = useState<number>(0);
  const [zeroReading, setZeroReading] = useState<number>(0);
  const [manualMaterial, setManualMaterial] = useState<MaterialKey>('steel');
  const [manualMass, setManualMass] = useState('');
  const [manualLength, setManualLength] = useState('');
  const [manualBreadthMm, setManualBreadthMm] = useState('');
  const [manualThicknessMm, setManualThicknessMm] = useState('');
  const [manualZeroReading, setManualZeroReading] = useState('');
  const [manualCurrentReading, setManualCurrentReading] = useState('');
  const [manualError, setManualError] = useState('');
  const [showResult, setShowResult] = useState(false);
  const paramsRef = useRef(params);
  const readingsRef = useRef(readings);
  const zeroReadingRef = useRef(zeroReading);
  const automaticRunIdRef = useRef(0);
  const automaticTimeoutRef = useRef<number | null>(null);

  const state = useMemo(() => computeState(params), [params]);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

  useEffect(() => {
    zeroReadingRef.current = zeroReading;
  }, [zeroReading]);

  useEffect(() => () => {
    automaticRunIdRef.current += 1;
    if (automaticTimeoutRef.current !== null) {
      window.clearTimeout(automaticTimeoutRef.current);
    }
  }, []);

  const depression_mm = Math.abs(microscopeReading - zeroReading);
  const depression_m = depression_mm / 1000;
  const manualDepressionMm =
    manualZeroReading.trim() !== '' &&
    manualCurrentReading.trim() !== '' &&
    Number.isFinite(Number(manualZeroReading)) &&
    Number.isFinite(Number(manualCurrentReading))
      ? Math.abs(Number(manualCurrentReading) - Number(manualZeroReading))
      : null;

  const currentE = computeE(state.W, params.l, params.b, params.d, depression_m);

  const result = useMemo(
    () => computeResult(readings, state.E_ref),
    [readings, state.E_ref],
  );

  function handleParamChange(updated: Partial<Params>) {
    setParams((prev) => ({ ...prev, ...updated }));
    // Reset result display when beam params change, keep readings
    setShowResult(false);
  }

  function handleSetZero() {
    zeroReadingRef.current = microscopeReading;
    setZeroReading(microscopeReading);
  }

  function handleTakeReading() {
    if (depression_m <= 0) return;
    const no = readings.length + 1;
    const reading: Reading = {
      no,
      source: 'Microscope',
      sequence,
      material: params.material,
      mass: params.mass,
      W: state.W,
      l: params.l,
      b: params.b,
      d: params.d,
      zeroReading,
      microscopeReading,
      y: depression_m,
      E_calculated: currentE,
      E_ref: state.E_ref,
    };
    readingsRef.current = [...readingsRef.current, reading];
    setReadings((prev) => [...prev, reading]);
    setShowResult(false);
  }

  function handleRunAutomaticSequence(direction: ObservationSequence) {
    const masses = getAutomaticLoads(requestedReadingCount, direction);
    if (masses.length === 0 || automaticProgress) return;

    automaticRunIdRef.current += 1;
    const runId = automaticRunIdRef.current;
    setSequence(direction);
    setAutomaticError('');
    setAutomaticProgress({ sequence: direction, completed: 0, total: masses.length });

    const recordAt = (index: number) => {
      if (automaticRunIdRef.current !== runId) return;
      if (index >= masses.length) {
        setAutomaticProgress(null);
        automaticTimeoutRef.current = null;
        return;
      }

      const stepParams: Params = { ...paramsRef.current, mass: masses[index] };
      const reading = createAutomaticReading(
        readingsRef.current.length + 1,
        direction,
        stepParams,
        zeroReadingRef.current,
      );
      if (!reading) {
        setAutomaticError(
          'Automatic pass stopped because the simulated depression exceeds the microscope scale. Adjust the beam dimensions and try again.',
        );
        setAutomaticProgress(null);
        automaticTimeoutRef.current = null;
        return;
      }

      paramsRef.current = stepParams;
      setParams(stepParams);
      setMicroscopeReading(reading.microscopeReading);
      automaticTimeoutRef.current = window.setTimeout(() => {
        if (automaticRunIdRef.current !== runId) return;
        readingsRef.current = [...readingsRef.current, reading];
        setReadings(readingsRef.current);
        setShowResult(false);
        setAutomaticProgress({
          sequence: direction,
          completed: index + 1,
          total: masses.length,
        });
        recordAt(index + 1);
      }, 500);
    };

    recordAt(0);
  }

  function handleAddManualObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualError('');

    const rawValues = [
      ['Load mass', manualMass],
      ['Beam length', manualLength],
      ['Beam breadth', manualBreadthMm],
      ['Beam thickness', manualThicknessMm],
      ['Zero reading', manualZeroReading],
      ['Current microscope reading', manualCurrentReading],
    ] as const;
    const missingValue = rawValues.find(([, value]) => value.trim() === '');
    if (missingValue) {
      setManualError(`${missingValue[0]} is required.`);
      return;
    }

    const mass = Number(manualMass);
    const length = Number(manualLength);
    const breadthMm = Number(manualBreadthMm);
    const thicknessMm = Number(manualThicknessMm);
    const zeroMm = Number(manualZeroReading);
    const currentMm = Number(manualCurrentReading);
    const numbers = [mass, length, breadthMm, thicknessMm, zeroMm, currentMm];
    if (numbers.some((value) => !Number.isFinite(value))) {
      setManualError('Enter valid numeric values for all experiment fields.');
      return;
    }
    if (mass < 0.05 || mass > 1) {
      setManualError('Load mass must be between 0.05 and 1.00 kg.');
      return;
    }
    if (length < 0.4 || length > 1) {
      setManualError('Beam length must be between 0.40 and 1.00 m.');
      return;
    }
    if (breadthMm < 10 || breadthMm > 50) {
      setManualError('Beam breadth must be between 10 and 50 mm.');
      return;
    }
    if (thicknessMm < 1 || thicknessMm > 10) {
      setManualError('Beam thickness must be between 1 and 10 mm.');
      return;
    }
    if (zeroMm < 0 || zeroMm > 10 || currentMm < 0 || currentMm > 10) {
      setManualError('Both microscope readings must be between 0 and 10 mm.');
      return;
    }

    const depressionMm = Math.abs(currentMm - zeroMm);
    if (depressionMm <= 0) {
      setManualError('Current microscope reading must differ from the zero reading.');
      return;
    }

    const manualParams: Params = {
      mass,
      l: length,
      b: breadthMm / 1000,
      d: thicknessMm / 1000,
      material: manualMaterial,
    };
    const manualState = computeState(manualParams);
    const depression = depressionMm / 1000;
    const ECalculated = computeE(
      manualState.W,
      manualParams.l,
      manualParams.b,
      manualParams.d,
      depression,
    );
    if (!Number.isFinite(ECalculated) || ECalculated <= 0) {
      setManualError('These values do not produce a valid Young\'s modulus.');
      return;
    }

    const reading: Reading = {
      no: readings.length + 1,
      source: 'Manual',
      sequence,
      material: manualParams.material,
      mass: manualParams.mass,
      W: manualState.W,
      l: manualParams.l,
      b: manualParams.b,
      d: manualParams.d,
      zeroReading: zeroMm,
      microscopeReading: currentMm,
      y: depression,
      E_calculated: ECalculated,
      E_ref: manualState.E_ref,
    };
    readingsRef.current = [...readingsRef.current, reading];
    setReadings((prev) => [...prev, reading]);
    setManualCurrentReading('');
    setShowResult(false);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = ['microscope', 'manual'] as const;
    const currentIndex = tabs.indexOf(activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      nextIndex = (currentIndex + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    setActiveTab(tabs[nextIndex]);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  function handleCalculate() {
    setShowResult(true);
  }

  function handleReset() {
    automaticRunIdRef.current += 1;
    if (automaticTimeoutRef.current !== null) {
      window.clearTimeout(automaticTimeoutRef.current);
      automaticTimeoutRef.current = null;
    }
    setParams(DEFAULT_PARAMS);
    setRequestedReadingCount(6);
    readingsRef.current = [];
    setReadings([]);
    setSequence('Loading');
    setAutomaticProgress(null);
    setAutomaticError('');
    setMicroscopeReading(0);
    setZeroReading(0);
    setManualMaterial('steel');
    setManualMass('');
    setManualLength('');
    setManualBreadthMm('');
    setManualThicknessMm('');
    setManualZeroReading('');
    setManualCurrentReading('');
    setManualError('');
    setActiveTab('microscope');
    setShowResult(false);
  }

  return (
    <div className="youngs-modulus-layout">
      <div className="youngs-modulus-grid">
        <div className="experiment-canvas-area">
          <ExperimentCanvas params={params} state={state} microscopeReading={microscopeReading} />
        </div>

        <aside className="experiment-sidebar">
          <div
            className="experiment-tabs"
            role="tablist"
            aria-label="Observation method"
            onKeyDown={handleTabKeyDown}
          >
            <button
              id="microscope-tab"
              type="button"
              role="tab"
              className="experiment-tab"
              aria-selected={activeTab === 'microscope'}
              aria-controls="microscope-tabpanel"
              tabIndex={activeTab === 'microscope' ? 0 : -1}
              disabled={automaticProgress !== null}
              onClick={() => setActiveTab('microscope')}
            >
              Microscope
            </button>
            <button
              id="manual-tab"
              type="button"
              role="tab"
              className="experiment-tab"
              aria-selected={activeTab === 'manual'}
              aria-controls="manual-tabpanel"
              tabIndex={activeTab === 'manual' ? 0 : -1}
              disabled={automaticProgress !== null}
              onClick={() => setActiveTab('manual')}
            >
              Manual Entry
            </button>
          </div>

          <div
            id="microscope-tabpanel"
            className="experiment-tabpanel"
            role="tabpanel"
            aria-labelledby="microscope-tab"
            tabIndex={0}
            hidden={activeTab !== 'microscope'}
          >
              <Controls
                params={params}
                disabled={automaticProgress !== null}
                sequence={sequence}
                requestedReadingCount={requestedReadingCount}
                automaticProgress={automaticProgress}
                automaticError={automaticError}
                onChange={handleParamChange}
                onSequenceChange={setSequence}
                onRequestedReadingCountChange={(count) => {
                  if (Number.isInteger(count) && count >= AUTO_MIN_READINGS && count <= AUTO_MAX_READINGS) {
                    setRequestedReadingCount(count);
                  }
                }}
                onRunAutomaticSequence={handleRunAutomaticSequence}
              />

              <div className="microscope-panel">
                <h3>Virtual Microscope</h3>
                <div className="micro-row">
                  <span className="micro-label">Zero reading</span>
                  <span className="micro-value">{zeroReading.toFixed(2)} mm</span>
                </div>
                <div className="micro-row">
                  <span className="micro-label">Current reading</span>
                  <span className="micro-value">{microscopeReading.toFixed(2)} mm</span>
                </div>
                <div className="micro-row">
                  <span className="micro-label">Depression y</span>
                  <span className="micro-value" style={{ color: 'var(--accent)' }}>
                    {depression_mm.toFixed(3)} mm
                  </span>
                </div>

                <SliderInput
                  label="Adjust crosshair"
                  value={microscopeReading}
                  min={0}
                  max={10}
                  step={0.01}
                  unit=" mm"
                  disabled={automaticProgress !== null}
                  onChange={setMicroscopeReading}
                />

                <div className="microscope-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={automaticProgress !== null}
                    onClick={handleSetZero}
                    title="Record the current microscope reading as the reference zero (before applying load)"
                  >
                    Set as Zero
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleTakeReading}
                    disabled={depression_m <= 0 || automaticProgress !== null}
                    title={depression_m <= 0 ? 'Adjust the crosshair away from zero to record a depression' : 'Record this reading'}
                  >
                    Take Reading
                  </button>
                </div>

                {depression_m > 0 && (
                  <p className="microscope-calculation">
                    Theoretical y = {(state.yTheoretical * 1000).toFixed(4)} mm &nbsp;|&nbsp;
                    {currentE > 0
                      ? `E = ${currentE.toExponential(3)} N/m² (${(currentE / 1e9).toFixed(1)} GPa)`
                      : '—'}
                  </p>
                )}
              </div>
          </div>

          <div
            id="manual-tabpanel"
            className="experiment-tabpanel"
            role="tabpanel"
            aria-labelledby="manual-tab"
            tabIndex={0}
            hidden={activeTab !== 'manual'}
          >
              <form className="manual-entry-panel" onSubmit={handleAddManualObservation} noValidate>
                <section className="manual-entry-section">
                  <h3>Material</h3>
                  <label className="manual-field" htmlFor="manual-material">
                    <span>Material</span>
                    <select
                      id="manual-material"
                      value={manualMaterial}
                      onChange={(event) => {
                        setManualMaterial(event.target.value as MaterialKey);
                        setManualError('');
                      }}
                    >
                      {Object.entries(MATERIALS).map(([key, material]) => (
                        <option key={key} value={key}>
                          {material.label} ({(material.E_ref / 1e9).toFixed(0)} GPa)
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                <section className="manual-entry-section">
                  <h3>Beam &amp; Load Parameters</h3>
                  <div className="manual-field-grid">
                    <label className="manual-field" htmlFor="manual-load-mass">
                      <span>Load mass (kg)</span>
                      <input id="manual-load-mass" type="number" min="0.05" max="1" step="any" value={manualMass}
                        onChange={(event) => { setManualMass(event.target.value); setManualError(''); }}
                        aria-invalid={Boolean(manualError)} />
                    </label>
                    <label className="manual-field" htmlFor="manual-beam-length">
                      <span>Beam length (l), m</span>
                      <input id="manual-beam-length" type="number" min="0.4" max="1" step="any" value={manualLength}
                        onChange={(event) => { setManualLength(event.target.value); setManualError(''); }}
                        aria-invalid={Boolean(manualError)} />
                    </label>
                    <label className="manual-field" htmlFor="manual-beam-breadth">
                      <span>Beam breadth (b), mm</span>
                      <input id="manual-beam-breadth" type="number" min="10" max="50" step="any" value={manualBreadthMm}
                        onChange={(event) => { setManualBreadthMm(event.target.value); setManualError(''); }}
                        aria-invalid={Boolean(manualError)} />
                    </label>
                    <label className="manual-field" htmlFor="manual-beam-thickness">
                      <span>Beam thickness (d), mm</span>
                      <input id="manual-beam-thickness" type="number" min="1" max="10" step="any" value={manualThicknessMm}
                        onChange={(event) => { setManualThicknessMm(event.target.value); setManualError(''); }}
                        aria-invalid={Boolean(manualError)} />
                    </label>
                  </div>
                </section>

                <section className="manual-entry-section">
                  <h3>Manual Microscope Readings</h3>
                  <div className="manual-field-grid">
                    <label className="manual-field" htmlFor="manual-zero-reading">
                      <span>Zero reading (mm)</span>
                      <input id="manual-zero-reading" type="number" min="0" max="10" step="any" value={manualZeroReading}
                        onChange={(event) => { setManualZeroReading(event.target.value); setManualError(''); }}
                        aria-invalid={Boolean(manualError)} />
                    </label>
                    <label className="manual-field" htmlFor="manual-current-reading">
                      <span>Current microscope reading (mm)</span>
                      <input id="manual-current-reading" type="number" min="0" max="10" step="any" value={manualCurrentReading}
                        onChange={(event) => { setManualCurrentReading(event.target.value); setManualError(''); }}
                        aria-invalid={Boolean(manualError)} />
                    </label>
                  </div>
                  <p className="manual-depression" role="status">
                    Calculated depression y: {manualDepressionMm === null ? '—' : `${manualDepressionMm.toFixed(3)} mm`}
                  </p>
                </section>

                {manualError && <p className="manual-entry-error" role="alert">{manualError}</p>}
                <button type="submit" className="btn btn-primary manual-entry-add">
                  Add Manual Observation
                </button>
              </form>
          </div>

          <div className="experiment-sidebar-actions">
            {readings.length >= 2 && (
              <button
                type="button"
                className="btn btn-primary btn-calculate"
                onClick={handleCalculate}
              >
                Calculate Young's Modulus
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-reset"
              onClick={handleReset}
            >
              ↺ Reset Experiment
            </button>
          </div>

          {showResult && readings.length >= 2 && (
            <div className="results-panel">
              <h3>Result</h3>
              <div className="result-row">
                <span>Mean E (experimental)</span>
                <span className="result-value">
                  {result.meanE.toExponential(3)} N/m²
                  <small>({(result.meanE / 1e9).toFixed(2)} GPa)</small>
                </span>
              </div>
              <div className="result-row">
                <span>
                  Reference E ({readings.some((reading) => reading.source === 'Manual')
                    ? 'mean observation reference'
                    : state.materialLabel})
                </span>
                <span className="result-ref">
                  {result.E_ref.toExponential(3)} N/m²
                  <small>({(result.E_ref / 1e9).toFixed(0)} GPa)</small>
                </span>
              </div>
              <div className="result-row">
                <span>Percentage error</span>
                <span className="result-value">{result.percentError.toFixed(2)} %</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text)', marginTop: 10 }}>
                Reference values reflect the materials selected for recorded observations.
              </p>
            </div>
          )}
        </aside>

        <div className="youngs-modulus-observations">
          <p className="section-label">Loading &amp; Unloading Observation Table</p>
          <table className="obs-table" aria-label="Young's Modulus observations">
            <thead>
              <tr>
                <th>No.</th>
                <th>Sequence</th>
                <th>Source</th>
                <th>Material</th>
                <th>Mass (kg)</th>
                <th>Load W (N)</th>
                <th>Zero reading (mm)</th>
                <th>Microscope reading (mm)</th>
                <th>Depression y (mm)</th>
                <th>E calculated (N/m²)</th>
              </tr>
            </thead>
            <tbody>
              {readings.length > 0 ? readings.map((r) => (
                <tr key={r.no} className="observation-row">
                  <td data-label="No.">{r.no}</td>
                  <td data-label="Sequence">
                    <span className={`observation-sequence observation-sequence--${r.sequence.toLowerCase()}`}>
                      {r.sequence}
                    </span>
                  </td>
                  <td data-label="Source">
                    <span className={`observation-source observation-source--${r.source.toLowerCase()}`}>
                      {r.source}
                    </span>
                  </td>
                  <td data-label="Material">{MATERIALS[r.material].label}</td>
                  <td data-label="Mass (kg)">{r.mass.toFixed(2)}</td>
                  <td data-label="Load W (N)">{r.W.toFixed(3)}</td>
                  <td data-label="Zero reading (mm)">{r.zeroReading.toFixed(2)}</td>
                  <td data-label="Microscope reading (mm)">{r.microscopeReading.toFixed(2)}</td>
                  <td data-label="Depression y (mm)">{(r.y * 1000).toFixed(3)}</td>
                  <td data-label="E calculated (N/m²)">
                    {r.E_calculated > 0 ? (
                      <>
                        <strong>{r.E_calculated.toExponential(3)} N/m²</strong>
                        <span className="observation-gpa">({(r.E_calculated / 1e9).toFixed(2)} GPa)</span>
                      </>
                    ) : '—'}
                  </td>
                </tr>
              )) : (
                <tr className="observations-empty-row">
                  <td colSpan={10} className="observations-empty">
                    No observations yet. Use the microscope, manual entry, or automatic loading and unloading controls.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="youngs-modulus-graph">
          <LoadDepressionGraph readings={readings} />
        </div>
      </div>
    </div>
  );
}
