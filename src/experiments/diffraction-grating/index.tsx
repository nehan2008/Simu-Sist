import { useMemo, useState } from 'react';
import Controls from './controls';
import ExperimentCanvas from './canvas';
import {
  DEFAULT_PARAMS,
  computeResult,
  computeState,
  createReading,
  getMaximumOrder,
  meanWavelengthM,
} from './simulation';
import type { Params, Reading } from './simulation';

interface PendingMeasurement {
  left: number | null;
  right: number | null;
}

function WavelengthGraph({
  readings,
  wavelengthM,
}: {
  readings: Reading[];
  wavelengthM: number;
}) {
  const width = 560;
  const height = 280;
  const pad = { top: 20, right: 24, bottom: 52, left: 70 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  if (readings.length === 0) {
    return (
      <div className="graph-section">
        <h3>sin θ vs nN</h3>
        <p className="graph-note" role="status">
          Record spot distances to plot the diffraction observations.
        </p>
      </div>
    );
  }

  const points = readings.map((reading) => ({
    reading,
    x: reading.order * reading.gratingLinesPerM / 1e6,
    y: reading.sinTheta,
  }));
  const xMax = Math.max(...points.map((point) => point.x), 0.1) * 1.12;
  const yMax = Math.min(1, Math.max(...points.map((point) => point.y), 0.05) * 1.12);
  const toX = (value: number) => pad.left + value / xMax * plotWidth;
  const toY = (value: number) => pad.top + plotHeight - value / yMax * plotHeight;
  const graphSlope = wavelengthM * 1e6;
  const lineEndX = graphSlope > 0 ? Math.min(xMax, yMax / graphSlope) : 0;
  const lineEndY = graphSlope * lineEndX;

  return (
    <div className="graph-section">
      <h3>sin θ vs nN</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="svg-graph"
        role="img"
        aria-label="Recorded sine diffraction angles plotted against diffraction order times grating density"
      >
        <rect width={width} height={height} fill="var(--code-bg, #151923)" rx="6" />
        {Array.from({ length: 5 }, (_, index) => {
          const fraction = index / 4;
          const x = pad.left + fraction * plotWidth;
          const y = pad.top + fraction * plotHeight;
          return (
            <g key={index}>
              <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotHeight} stroke="var(--border, #303746)" />
              <line x1={pad.left} y1={y} x2={pad.left + plotWidth} y2={y} stroke="var(--border, #303746)" />
              <text x={x} y={pad.top + plotHeight + 16} textAnchor="middle" fontSize="9" fill="var(--text, #aab4c5)">
                {(fraction * xMax).toFixed(2)}
              </text>
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text, #aab4c5)">
                {((1 - fraction) * yMax).toFixed(2)}
              </text>
            </g>
          );
        })}
        <line x1={pad.left} y1={pad.top + plotHeight} x2={pad.left + plotWidth} y2={pad.top + plotHeight} stroke="var(--text-h, #e2e8f0)" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotHeight} stroke="var(--text-h, #e2e8f0)" />
        <line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(lineEndX)}
          y2={toY(lineEndY)}
          stroke="var(--accent, #8b9cff)"
          strokeWidth="2"
        />
        {points.map(({ reading, x, y }) => (
          <g key={reading.trial}>
            <circle cx={toX(x)} cy={toY(y)} r="4.5" fill="#f1a64a">
              <title>
                Trial {reading.trial}: nN={(reading.order * reading.gratingLinesPerM).toExponential(3)} m⁻¹,
                sin θ={reading.sinTheta.toFixed(4)}
              </title>
            </circle>
          </g>
        ))}
        <text x={pad.left + plotWidth / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--text-h, #e2e8f0)">
          nN (10⁶ m⁻¹)
        </text>
        <text
          x="17"
          y={pad.top + plotHeight / 2}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-h, #e2e8f0)"
          transform={`rotate(-90 17 ${pad.top + plotHeight / 2})`}
        >
          sin θ
        </text>
      </svg>
      <p className="graph-note">
        The origin-constrained line uses recorded measurements; its slope corresponds to λ.
      </p>
    </div>
  );
}

export default function DiffractionGratingExperiment() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [pending, setPending] = useState<PendingMeasurement>({ left: null, right: null });
  const [error, setError] = useState('');
  const state = useMemo(() => computeState(params), [params]);
  const result = useMemo(() => computeResult(readings), [readings]);
  const readingsByDistance = useMemo(() => {
    const groups = new Map<number, Reading[]>();
    readings.forEach((reading) => {
      const group = groups.get(reading.screenDistanceM) ?? [];
      group.push(reading);
      groups.set(reading.screenDistanceM, group);
    });
    return groups;
  }, [readings]);
  const canMeasure = state.selectedReachesScreen && state.selectedOrder > 0;

  function handleParamChange(updated: Partial<Params>) {
    setParams((previous) => {
      const next = { ...previous, ...updated };
      const maximumOrder = getMaximumOrder(next.gratingLinesPerM);
      next.order = Math.max(1, Math.min(next.order, maximumOrder));
      return next;
    });
    setPending({ left: null, right: null });
    setError('');
  }

  function handleMeasure(side: keyof PendingMeasurement) {
    if (!canMeasure) {
      setError('This order is grazing and does not form a finite spot on the screen.');
      return;
    }
    setPending((previous) => ({ ...previous, [side]: state.selectedPositionM }));
    setError('');
  }

  function handleRecord() {
    if (pending.left === null || pending.right === null) return;
    const reading = createReading(readings.length + 1, params, pending.left, pending.right);
    if (!reading) {
      setError('The selected order or spot-distance measurements are not physically valid. Measure both sides again.');
      return;
    }
    setReadings((previous) => [...previous, reading]);
    setPending({ left: null, right: null });
    setError('');
  }

  function handleReset() {
    setParams(DEFAULT_PARAMS);
    setReadings([]);
    setPending({ left: null, right: null });
    setError('');
  }

  const latestReading = readings[readings.length - 1];

  return (
    <div className="experiment-layout diffraction-layout">
      <main className="diffraction-main" style={{ minWidth: 0, width: '100%' }}>
        <div className="experiment-canvas-area diffraction-apparatus">
          <ExperimentCanvas
            params={params}
            state={state}
            measuredLeftX={pending.left}
            measuredRightX={pending.right}
          />
        </div>

        <section className="diffraction-observations">
          <p className="section-label">Observation table</p>
          {readingsByDistance.size > 0 ? (
            Array.from(readingsByDistance.entries()).map(([screenDistanceM, group]) => (
              <div className="diffraction-table-scroll" style={{ overflowX: 'auto' }} key={screenDistanceM}>
                <h3>Grating-to-screen distance d = {screenDistanceM.toFixed(2)} m</h3>
                <table className="obs-table" aria-label={`Diffraction observations at screen distance ${screenDistanceM} metres`}>
                  <thead>
                    <tr>
                      <th>Trial</th>
                      <th>Order n</th>
                      <th>x̄ (m)</th>
                      <th>d (m)</th>
                      <th>θ = tan⁻¹(x̄/d) (°)</th>
                      <th>sin θ</th>
                      <th>N (lines/m)</th>
                      <th>λ (m)</th>
                      <th>λ (nm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((reading) => (
                      <tr key={reading.trial} className="observation-row">
                        <td data-label="Trial">{reading.trial}</td>
                        <td data-label="Order n">{reading.order}</td>
                        <td data-label="x̄ (m)">{reading.meanXM.toFixed(5)}</td>
                        <td data-label="d (m)">{reading.screenDistanceM.toFixed(2)}</td>
                        <td data-label="θ = tan⁻¹(x̄/d) (°)">{reading.angleDegrees.toFixed(3)}</td>
                        <td data-label="sin θ">{reading.sinTheta.toFixed(6)}</td>
                        <td data-label="N (lines/m)">{reading.gratingLinesPerM.toLocaleString('en-US')}</td>
                        <td data-label="λ (m)">{reading.experimentalWavelengthM.toExponential(4)}</td>
                        <td data-label="λ (nm)">{(reading.experimentalWavelengthM * 1e9).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="observation-row">
                      <th colSpan={7} scope="row">Mean wavelength at d = {screenDistanceM.toFixed(2)} m</th>
                      <td>{meanWavelengthM(group).toExponential(4)}</td>
                      <td>{(meanWavelengthM(group) * 1e9).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <p className="observations-empty">
              No observations yet. Measure both spot distances and record an order.
            </p>
          )}
        </section>

        <section className="diffraction-graph">
          <WavelengthGraph readings={readings} wavelengthM={result.graphWavelengthM} />
        </section>

        <section className="results-panel diffraction-results" aria-live="polite">
          <h3>Experimental result</h3>
          {latestReading ? (
            <>
              <div className="result-row">
                <span>Overall mean wavelength</span>
                <span className="result-value">
                  {result.meanWavelengthM.toExponential(4)} m ({(result.meanWavelengthM * 1e9).toFixed(2)} nm)
                </span>
              </div>
              <div className="result-row">
                <span>Graph slope wavelength</span>
                <span className="result-value">
                  {result.graphWavelengthM.toExponential(4)} m ({(result.graphWavelengthM * 1e9).toFixed(2)} nm)
                </span>
              </div>
            </>
          ) : (
            <p className="graph-note">Record spot distances to calculate the experimental wavelength.</p>
          )}
          <p className="diffraction-formula">
            θ = tan⁻¹(x/d) &nbsp; · &nbsp; λ = sin θ/(nN) &nbsp; · &nbsp; N in lines/m; x and d in metres.
          </p>
        </section>

        <section className="measurements-panel diffraction-live-results" aria-label="Live diffraction calculations">
          <h3>Live calculation</h3>
          <div className="diffraction-live-results-grid">
            <div className="result-row">
              <span>Grating spacing 1/N</span>
              <span className="result-value">{(state.gratingSpacingM * 1e6).toFixed(3)} μm</span>
            </div>
            <div className="result-row">
              <span>Maximum allowed order</span>
              <span className="result-value">{state.maximumOrder}</span>
            </div>
            <div className="result-row">
              <span>Selected spot distance |x|</span>
              <span className="result-value">
                {state.selectedReachesScreen ? `${state.selectedPositionM.toFixed(4)} m` : '∞ (grazing)'}
              </span>
            </div>
          </div>
          <p className="diffraction-measurement-hint">
            Simulation positions update with screen distance, order, and grating density.
          </p>
        </section>
      </main>

      <aside className="experiment-sidebar diffraction-sidebar">
        <Controls
          params={params}
          maximumOrder={state.maximumOrder}
          onChange={handleParamChange}
        />

        <section className="measurements-panel diffraction-measurements">
          <h3>Spot-distance measurements</h3>
          <p className="diffraction-measurement-readout">
            Selected n = {state.selectedOrder || '—'} · d = {params.screenDistanceM.toFixed(2)} m
          </p>
          <p className="diffraction-measurement-hint">
            Capture each symmetric spot distance from the central maximum. Both distances are averaged for the observation.
          </p>
          <div className="diffraction-measurement-actions">
            <button
              type="button"
              className="btn btn-primary diffraction-angle-button"
              data-measured={pending.left !== null}
              aria-label="Left x"
              onClick={() => handleMeasure('left')}
              disabled={!canMeasure}
            >
              Left x
            </button>
            <button
              type="button"
              className="btn btn-primary diffraction-angle-button"
              data-measured={pending.right !== null}
              aria-label="Right x"
              onClick={() => handleMeasure('right')}
              disabled={!canMeasure}
            >
              Right x
            </button>
          </div>
          <div className="diffraction-measurement-values" aria-live="polite">
            <div className={`diffraction-measurement-value${pending.left === null ? '' : ' is-measured'}`}>
              <span className="diffraction-measurement-side">Left x</span>
              <span className="diffraction-measurement-status">
                {pending.left === null ? 'Awaiting' : 'Measured'}
              </span>
              <strong className="diffraction-measurement-value-number">
                {pending.left === null ? '—' : `${pending.left.toFixed(4)} m`}
              </strong>
            </div>
            <div className={`diffraction-measurement-value${pending.right === null ? '' : ' is-measured'}`}>
              <span className="diffraction-measurement-side">Right x</span>
              <span className="diffraction-measurement-status">
                {pending.right === null ? 'Awaiting' : 'Measured'}
              </span>
              <strong className="diffraction-measurement-value-number">
                {pending.right === null ? '—' : `${pending.right.toFixed(4)} m`}
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary diffraction-record-button"
            onClick={handleRecord}
            disabled={pending.left === null || pending.right === null}
          >
            Record observation
          </button>
          {error && <p className="diffraction-error" role="alert">{error}</p>}
          {(readings.length > 0 || pending.left !== null || pending.right !== null) && (
            <button type="button" className="btn btn-secondary diffraction-reset-button" onClick={handleReset}>
              ↺ Reset experiment
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}
