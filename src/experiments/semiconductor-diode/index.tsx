import { useEffect, useMemo, useRef, useState } from 'react';
import Controls from './controls';
import ExperimentCanvas from './canvas';
import {
  DEFAULT_PARAMS,
  MAX_SAFE_TEMPERATURE_C,
  MODEL_BAND_GAP_EV,
  MODEL_REFERENCE_TEMPERATURE_K,
  POWER_SUPPLY_MAX_V,
  ROOM_TEMPERATURE_C,
  VOLTMETER_MAX_V,
  computeEnergyGap,
  createReading,
  initialState,
  tick,
} from './simulation';
import type { Params, Reading, State } from './simulation';

function isSameState(left: State, right: State): boolean {
  return (
    left.temperatureC === right.temperatureC &&
    left.peakTemperatureC === right.peakTemperatureC &&
    left.temperatureRateCPerS === right.temperatureRateCPerS &&
    left.thermalPhase === right.thermalPhase &&
    left.reverseCurrentUa === right.reverseCurrentUa &&
    left.voltmeterReadingV === right.voltmeterReadingV &&
    left.heaterSafetyCutoff === right.heaterSafetyCutoff
  );
}

function EnergyGapGraph({ readings }: { readings: Reading[] }) {
  const result = useMemo(() => computeEnergyGap(readings), [readings]);
  const width = 520;
  const height = 290;
  const pad = { top: 24, right: 24, bottom: 56, left: 72 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  if (readings.length === 0) {
    return (
      <section className="diode-card diode-graph-card">
        <div className="diode-section-heading">
          <div>
            <p className="section-label">Measured data</p>
            <h2>Energy-gap graph</h2>
          </div>
          <span className="diode-count-badge">0 points</span>
        </div>
        <div className="diode-empty-chart">
          Record bath readings to plot log₁₀(I₀) against 1000/T.
        </div>
      </section>
    );
  }

  const xValues = readings.map((reading) => reading.inverseTemperatureScaled);
  const yValues = readings.map((reading) => reading.logCurrentUa);
  let xMin = Math.min(...xValues);
  let xMax = Math.max(...xValues);
  let yMin = Math.min(...yValues);
  let yMax = Math.max(...yValues);
  if (xMax - xMin < 0.001) {
    xMin -= 0.02;
    xMax += 0.02;
  } else {
    const xPadding = (xMax - xMin) * 0.12;
    xMin -= xPadding;
    xMax += xPadding;
  }
  if (yMax - yMin < 0.1) {
    yMin -= 0.5;
    yMax += 0.5;
  } else {
    const yPadding = (yMax - yMin) * 0.15;
    yMin -= yPadding;
    yMax += yPadding;
  }

  const toX = (value: number) => pad.left + (value - xMin) / (xMax - xMin) * plotWidth;
  const toY = (value: number) => pad.top + plotHeight - (value - yMin) / (yMax - yMin) * plotHeight;
  const hasFit = result.fitStart !== null && result.fitEnd !== null;

  return (
    <section className="diode-card diode-graph-card">
      <div className="diode-section-heading">
        <div>
          <p className="section-label">Measured data</p>
          <h2>Energy-gap graph</h2>
        </div>
        <span className="diode-count-badge">{readings.length} {readings.length === 1 ? 'point' : 'points'}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="diode-graph"
        role="img"
        aria-label="Recorded logarithm of reverse current plotted against one thousand divided by absolute temperature"
      >
        <rect width={width} height={height} rx="8" fill="var(--code-bg)" />
        {Array.from({ length: 5 }, (_, index) => {
          const fraction = index / 4;
          const x = pad.left + fraction * plotWidth;
          const y = pad.top + fraction * plotHeight;
          return (
            <g key={index}>
              <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotHeight} stroke="var(--border)" />
              <line x1={pad.left} y1={y} x2={pad.left + plotWidth} y2={y} stroke="var(--border)" />
              <text x={x} y={pad.top + plotHeight + 17} textAnchor="middle" className="diode-graph-tick">
                {(xMin + fraction * (xMax - xMin)).toFixed(3)}
              </text>
              <text x={pad.left - 8} y={y + 3} textAnchor="end" className="diode-graph-tick">
                {(yMax - fraction * (yMax - yMin)).toFixed(2)}
              </text>
            </g>
          );
        })}
        <line x1={pad.left} y1={pad.top + plotHeight} x2={pad.left + plotWidth} y2={pad.top + plotHeight} stroke="var(--text-h)" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotHeight} stroke="var(--text-h)" />
        {hasFit && result.fitStart && result.fitEnd && (
          <line
            x1={toX(result.fitStart.x)}
            y1={toY(result.fitStart.y)}
            x2={toX(result.fitEnd.x)}
            y2={toY(result.fitEnd.y)}
            stroke="var(--accent)"
            strokeWidth="2"
          />
        )}
        {readings.map((reading) => (
          <circle
            key={reading.trial}
            cx={toX(reading.inverseTemperatureScaled)}
            cy={toY(reading.logCurrentUa)}
            r="5"
            fill="#f1a64a"
            stroke="#fff1d2"
            strokeWidth="1"
          >
            <title>
              Trial {reading.trial}: {reading.inverseTemperatureScaled.toFixed(4)} K⁻¹,
              log₁₀(I₀) = {reading.logCurrentUa.toFixed(4)}
            </title>
          </circle>
        ))}
        <text x={pad.left + plotWidth / 2} y={height - 10} textAnchor="middle" className="diode-graph-axis">
          1000/T (K⁻¹)
        </text>
        <text
          x="16"
          y={pad.top + plotHeight / 2}
          textAnchor="middle"
          className="diode-graph-axis"
          transform={`rotate(-90 16 ${pad.top + plotHeight / 2})`}
        >
          log₁₀(I₀ / µA)
        </text>
      </svg>
      <p className="diode-graph-note">
        Only recorded observations are plotted. {hasFit && result.slopePerScaledInverseKelvin !== null
          ? `The line is the least-squares fit; slope = ${result.slopePerScaledInverseKelvin.toFixed(4)} K.`
          : 'Record a second reading at a different temperature to calculate the slope.'}
      </p>
    </section>
  );
}

function ObservationTable({ readings }: { readings: Reading[] }) {
  return (
    <section className="diode-card diode-observations">
      <div className="diode-section-heading">
        <div>
          <p className="section-label">Recorded measurements</p>
          <h2>Observation table</h2>
        </div>
        <span className="diode-count-badge">{readings.length} {readings.length === 1 ? 'reading' : 'readings'}</span>
      </div>
      <div className="diode-table-scroll">
        <table className="obs-table" aria-label="Semiconductor diode energy-gap observations">
          <thead>
            <tr>
              <th>Trial</th>
              <th>T (°C)</th>
              <th>T (K)</th>
              <th>V<sub>R</sub> (V)</th>
              <th>I<sub>0</sub> (µA)</th>
              <th>log₁₀(I<sub>0</sub>)</th>
              <th>1000/T (K⁻¹)</th>
            </tr>
          </thead>
          <tbody>
            {readings.length > 0 ? readings.map((reading) => (
              <tr key={reading.trial} className="observation-row">
                <td data-label="Trial">{reading.trial}</td>
                <td data-label="T (°C)">{reading.temperatureC.toFixed(1)}</td>
                <td data-label="T (K)">{reading.temperatureK.toFixed(2)}</td>
                <td data-label="VR (V)">{reading.reverseVoltageV.toFixed(2)}</td>
                <td data-label="I0 (µA)">{reading.reverseCurrentUa.toFixed(3)}</td>
                <td data-label="log10(I0)">{reading.logCurrentUa.toFixed(4)}</td>
                <td data-label="1000/T (K⁻¹)">{reading.inverseTemperatureScaled.toFixed(4)}</td>
              </tr>
            )) : (
              <tr className="observations-empty-row">
                <td colSpan={7} className="observations-empty">
                  No readings yet. Record the room-temperature value, then take more readings as the bath cools.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SemiconductorDiodeExperiment() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [state, setState] = useState<State>(initialState);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [error, setError] = useState('');
  const [safetyNotice, setSafetyNotice] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const paramsRef = useRef(params);
  const pausedRef = useRef(false);
  const energyGap = useMemo(() => computeEnergyGap(readings), [readings]);
  const canAdjustVoltage = readings.length === 0 && !params.heaterOn && !isPaused;

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    let previousTime = performance.now();
    const timerId = window.setInterval(() => {
      const time = performance.now();
      const deltaSeconds = (time - previousTime) / 1000;
      previousTime = time;
      if (pausedRef.current) return;
      setState((previous) => {
        const next = tick(paramsRef.current, previous, deltaSeconds);
        return isSameState(previous, next) ? previous : next;
      });
    }, 33);
    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!state.heaterSafetyCutoff) return;
    const timeoutId = window.setTimeout(() => {
      setParams((previous) => ({ ...previous, heaterOn: false }));
      setSafetyNotice('The mantle automatically switched off at 80°C. The bath is now cooling; wait for a safe temperature before recording.');
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [state.heaterSafetyCutoff]);

  function handleTogglePause() {
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setIsPaused(nextPaused);
    setError('');
  }

  function handleHeatingSpeedChange(heatingSpeedMultiplier: number) {
    setParams((previous) => ({ ...previous, heatingSpeedMultiplier }));
  }

  function handleCoolingSpeedChange(coolingSpeedMultiplier: number) {
    setParams((previous) => ({ ...previous, coolingSpeedMultiplier }));
  }

  function handleVoltageChange(reverseVoltageV: number) {
    if (isPaused) {
      setError('Resume the simulation before changing apparatus settings.');
      return;
    }
    if (!Number.isFinite(reverseVoltageV) || reverseVoltageV < 0 || reverseVoltageV > VOLTMETER_MAX_V) {
      setError(`Set the reverse-bias voltage between 0 and ${VOLTMETER_MAX_V} V.`);
      return;
    }
    if (!canAdjustVoltage) {
      setError('Keep the same reverse-bias voltage for all trials. Reset the experiment to choose a different setting.');
      return;
    }
    setParams((previous) => ({ ...previous, reverseVoltageV }));
    setError('');
  }

  function handleTogglePower() {
    if (isPaused) {
      setError('Resume the simulation before changing apparatus settings.');
      return;
    }
    if (params.heaterOn) {
      setError('Switch the heating mantle off before energizing the reverse-bias circuit.');
      return;
    }
    setParams((previous) => ({ ...previous, powerOn: !previous.powerOn }));
    setError('');
  }

  function handleToggleHeater() {
    if (isPaused) {
      setError('Resume the simulation before changing apparatus settings.');
      return;
    }
    if (params.heaterOn) {
      setParams((previous) => ({ ...previous, heaterOn: false }));
      setSafetyNotice('');
      setError('');
      return;
    }
    if (readings.length === 0) {
      setError('Record the room-temperature baseline before heating the bath.');
      return;
    }
    if (state.temperatureC >= MAX_SAFE_TEMPERATURE_C) {
      setError('The bath has reached the 80°C safety limit. Let it cool before reheating.');
      return;
    }
    setParams((previous) => ({ ...previous, heaterOn: true, powerOn: false }));
    setSafetyNotice('');
    setError('');
  }

  function handleToggleStirring() {
    if (isPaused) {
      setError('Resume the simulation before changing apparatus settings.');
      return;
    }
    if (!params.heaterOn && state.temperatureC <= ROOM_TEMPERATURE_C + 0.2) {
      setError('Stir the bath while heating or while it is cooling.');
      return;
    }
    setParams((previous) => ({ ...previous, stirringOn: !previous.stirringOn }));
    setError('');
  }

  function handleRecordReading() {
    if (isPaused) {
      setError('Resume the simulation before recording a reading.');
      return;
    }
    const reading = createReading(readings.length + 1, params, state);
    if (!reading) {
      setError(
        params.heaterOn
          ? 'Switch the heating mantle off before recording.'
          : !params.powerOn
            ? 'Switch on the reverse-bias supply before recording.'
            : params.reverseVoltageV < 0.5
              ? 'Set reverse bias to at least 0.5 V before recording.'
              : state.temperatureC >= MAX_SAFE_TEMPERATURE_C
                ? 'Wait for the bath to cool below 80°C before recording.'
                : 'The meter reading is not valid. Check the supply, voltage, and current before trying again.',
      );
      return;
    }
    setReadings((previous) => [...previous, reading]);
    setError('');
    setSafetyNotice('');
  }

  function handleReset() {
    pausedRef.current = false;
    setIsPaused(false);
    setParams(DEFAULT_PARAMS);
    setState(initialState());
    setReadings([]);
    setError('');
    setSafetyNotice('');
  }

  return (
    <div className="experiment-layout diode-experiment-layout">
      <div className="diode-main-column">
        <section className="diode-apparatus-section" aria-label="Interactive semiconductor diode apparatus">
          <div className="diode-apparatus-heading">
            <div>
              <p className="section-label">Live apparatus</p>
              <h2>Energy-gap measurement setup</h2>
            </div>
            <span className={`diode-phase-badge is-${state.thermalPhase}`}>
              {isPaused
                ? `Paused · ${state.thermalPhase === 'heating' ? 'heating' : state.thermalPhase === 'cooling' ? 'cooling' : 'ambient'}`
                : state.thermalPhase === 'heating'
                ? 'Heating'
                : state.thermalPhase === 'cooling'
                  ? 'Cooling'
                  : 'At ambient'}
            </span>
          </div>
          <div className="experiment-canvas-area diode-canvas-area">
            <ExperimentCanvas params={params} state={state} isPaused={isPaused} />
          </div>
          <div className="diode-apparatus-readouts" aria-live="polite">
            <div>
              <span>Oil-bath temperature</span>
              <strong>{state.temperatureC.toFixed(1)} °C</strong>
            </div>
            <div>
              <span>Reverse-bias voltage</span>
              <strong>{params.powerOn && !params.heaterOn ? `${state.voltmeterReadingV.toFixed(2)} V` : 'Off'}</strong>
            </div>
            <div>
              <span>Reverse current</span>
              <strong>{params.powerOn && !params.heaterOn ? `${state.reverseCurrentUa.toFixed(3)} µA` : 'Off'}</strong>
            </div>
            <div>
              <span>Recorded readings</span>
              <strong>{readings.length}</strong>
            </div>
          </div>
        </section>

        <div className="diode-results-grid">
          <ObservationTable readings={readings} />
          <EnergyGapGraph readings={readings} />
        </div>

        <section className="diode-card diode-result-panel" aria-live="polite">
          <div className="diode-section-heading">
            <div>
              <p className="section-label">Calculated from observations</p>
              <h2>Experimental result</h2>
            </div>
          </div>
          <div className="diode-result-grid">
            <div>
              <span>Recorded readings</span>
              <strong>{energyGap.readingCount}</strong>
            </div>
            <div>
              <span>Slope of log₁₀(I₀/µA) vs 1000/T (K)</span>
              <strong>{energyGap.slopePerScaledInverseKelvin === null ? '—' : `${energyGap.slopePerScaledInverseKelvin.toFixed(4)} K`}</strong>
            </div>
            <div>
              <span>Experimental energy gap, E<sub>g</sub></span>
              <strong>{energyGap.bandGapEv === null ? '—' : `${energyGap.bandGapEv.toFixed(4)} eV`}</strong>
            </div>
            <div>
              <span>Reference silicon model</span>
              <strong>{MODEL_BAND_GAP_EV.toFixed(2)} eV</strong>
            </div>
          </div>
          <p className="diode-formula-note">
            T is in kelvin and I<sub>0</sub> is the measured reverse current.             The PDF gives E<sub>g</sub> = 3.973 × 10⁻⁴ eV/K × |slope| for log₁₀(I<sub>0</sub>) vs 1/T; with this graph's 1000/T axis the equivalent factor is 0.3973 eV/K. The simulated diode uses an explicitly stated silicon reference model ({MODEL_BAND_GAP_EV.toFixed(2)} eV at {MODEL_REFERENCE_TEMPERATURE_K.toFixed(2)} K); the result above is calculated only from recorded readings.
          </p>
        </section>

        <section className="diode-card diode-assumption-note">
          <p className="section-label">Model and procedure notes</p>
          <p>
            The supplied PDF specifies a 3 V setting in its observation table and gives 5 V as a procedure example. This simulation starts at 3 V, keeps that setting fixed across recorded trials, and models a silicon reference diode because the PDF does not identify a diode material. It is an educational reference model, not a substitute for a physical device's measured current.
          </p>
          <p>
            The thermal display follows the simulated bath state. Heat-up and cooling are gradual, the thermometer column maps to temperature, and the meter needles map to the calculated electrical readings.
          </p>
        </section>
      </div>

      <aside className="experiment-sidebar diode-sidebar">
        <Controls
          params={params}
          state={state}
          isPaused={isPaused}
          readingCount={readings.length}
          error={error}
          safetyNotice={safetyNotice}
          onTogglePause={handleTogglePause}
          onHeatingSpeedChange={handleHeatingSpeedChange}
          onCoolingSpeedChange={handleCoolingSpeedChange}
          onVoltageChange={handleVoltageChange}
          onToggleHeater={handleToggleHeater}
          onTogglePower={handleTogglePower}
          onToggleStirring={handleToggleStirring}
          onRecordReading={handleRecordReading}
          onReset={handleReset}
        />
        <section className="diode-live-calculations diode-card" aria-label="Current physics calculations">
          <div className="diode-section-heading">
            <div>
              <p className="section-label">Live calculation</p>
              <h2>Reverse current model</h2>
            </div>
          </div>
          <div className="diode-calculation-values">
            <div><span>Absolute temperature</span><strong>{(state.temperatureC + 273.15).toFixed(2)} K</strong></div>
            <div><span>Measured model current</span><strong>{state.reverseCurrentUa.toFixed(4)} µA</strong></div>
            <div><span>Voltmeter range</span><strong>0–{VOLTMETER_MAX_V} V</strong></div>
            <div><span>Power-supply rating</span><strong>0–{POWER_SUPPLY_MAX_V} V DC</strong></div>
          </div>
          <p className="diode-formula-note">
            I<sub>R</sub>(T) is calculated from the temperature-dependent silicon reference model. The observed points—not the reference parameters—determine the reported experimental E<sub>g</sub>.
          </p>
        </section>
      </aside>
    </div>
  );
}
