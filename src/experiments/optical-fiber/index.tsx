import { useMemo, useState } from 'react';
import Controls, { NumericalApertureControls } from './controls';
import ExperimentCanvas from './canvas';
import {
  DEFAULT_CUSTOM_FIBER_LENGTH_M,
  DEFAULT_NA_PARAMS,
  POWER_READING_DESCRIPTIONS,
  POWER_READING_IDS,
  calculateAttenuationComparisons,
  computeNumericalAperture,
  computeNumericalApertureResult,
  createNumericalApertureReading,
  estimateCustomPowerMeterValueDb,
  isValidPowerMeterValue,
} from './simulation';
import type {
  NumericalApertureParams,
  NumericalApertureReading,
  PowerReadingId,
} from './simulation';

type ExperimentMode = 'numerical-aperture' | 'attenuation';

function NumericalApertureGraph({ readings }: { readings: NumericalApertureReading[] }) {
  const width = 560;
  const height = 220;
  const pad = { top: 18, right: 20, bottom: 42, left: 48 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  if (readings.length === 0) {
    return (
      <section className="fiber-card fiber-graph">
        <h2>Numerical aperture by observation</h2>
        <p className="fiber-empty-note">Record screen measurements to plot their calculated numerical apertures.</p>
      </section>
    );
  }

  const toX = (index: number) =>
    readings.length === 1
      ? pad.left + plotWidth / 2
      : pad.left + index / (readings.length - 1) * plotWidth;
  const toY = (value: number) => pad.top + (1 - value) * plotHeight;
  const points = readings.map((reading, index) => `${toX(index)},${toY(reading.numericalAperture)}`).join(' ');

  return (
    <section className="fiber-card fiber-graph">
      <h2>Numerical aperture by observation</h2>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="svg-graph fiber-svg-graph"
        role="img"
        aria-label="Measured numerical aperture for each recorded optical fiber screen observation"
      >
        <rect width={width} height={height} rx="6" fill="var(--code-bg)" />
        {[0, 0.25, 0.5, 0.75, 1].map((value) => {
          const y = toY(value);
          return (
            <g key={value}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border)" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text)">
                {value.toFixed(2)}
              </text>
            </g>
          );
        })}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="var(--text-h)" />
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="var(--text-h)" />
        {readings.length > 1 && (
          <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" />
        )}
        {readings.map((reading, index) => (
          <g key={reading.trial}>
            <circle cx={toX(index)} cy={toY(reading.numericalAperture)} r="5" fill="#ef5148">
              <title>
                Trial {reading.trial}, {reading.targetCircleMm} mm circle: NA {reading.numericalAperture.toFixed(4)},
                {' '}acceptance angle {(reading.acceptanceAngleRad * 180 / Math.PI).toFixed(2)}°
              </title>
            </circle>
            <text x={toX(index)} y={height - pad.bottom + 17} textAnchor="middle" fontSize="9" fill="var(--text)">
              {reading.targetCircleMm} mm
            </text>
          </g>
        ))}
        <text x={pad.left + plotWidth / 2} y={height - 5} textAnchor="middle" fontSize="10" fill="var(--text-h)">
          Selected screen circle
        </text>
        <text
          x="13"
          y={pad.top + plotHeight / 2}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-h)"
          transform={`rotate(-90 13 ${pad.top + plotHeight / 2})`}
        >
          NA
        </text>
      </svg>
      <p className="fiber-graph-note">Each point is calculated from that trial’s entered L and W, not from the selected circle diameter.</p>
    </section>
  );
}

function AttenuationGraph({
  comparisons,
}: {
  comparisons: ReturnType<typeof calculateAttenuationComparisons>;
}) {
  const width = 560;
  const rowHeight = 38;
  const height = 56 + comparisons.length * rowHeight;
  const centerX = 345;
  const maxBarWidth = 90;
  const maxMagnitude = Math.max(...comparisons.map((comparison) => Math.abs(comparison.valueDb ?? 0)), 1);

  return (
    <section className="fiber-card fiber-graph">
      <h2>Attenuation comparisons</h2>
      {comparisons.every((comparison) => comparison.valueDb === null) && (
        <p className="fiber-empty-note">Record the matching power-meter readings to compare them here.</p>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="svg-graph fiber-svg-graph"
        role="img"
        aria-label="Signed power-meter reading differences for five attenuation comparisons"
      >
        <rect width={width} height={height} rx="6" fill="var(--code-bg)" />
        <line x1={centerX} y1="8" x2={centerX} y2={height - 8} stroke="var(--text-h)" strokeDasharray="3 4" />
        {comparisons.map((comparison, index) => {
          const y = 28 + index * rowHeight;
          const value = comparison.valueDb;
          const barWidth = value === null ? 0 : Math.abs(value) / maxMagnitude * maxBarWidth;
          return (
            <g key={comparison.id}>
              <text x="12" y={y + 4} fontSize="10" fill="var(--text-h)">{comparison.label}</text>
              {value !== null && (
                <rect
                  x={value >= 0 ? centerX : centerX - barWidth}
                  y={y - 9}
                  width={barWidth}
                  height="16"
                  rx="4"
                  fill={value >= 0 ? '#3dba8a' : '#f28a62'}
                />
              )}
              <text
                x={value === null ? 518 : value >= 0 ? centerX + barWidth + 7 : centerX - barWidth - 7}
                y={y + 4}
                textAnchor={value === null || value >= 0 ? 'start' : 'end'}
                fontSize="10"
                fontWeight="700"
                fill="var(--text-h)"
              >
                {value === null ? '—' : `${value.toFixed(2)} dB`}
              </text>
            </g>
          );
        })}
        <text x={centerX} y={height - 5} textAnchor="middle" fontSize="9" fill="var(--text)">
          Negative ← signed difference → positive
        </text>
      </svg>
      <p className="fiber-graph-note">The zero line is centred; negative values are retained rather than converted to absolute loss.</p>
    </section>
  );
}

export default function OpticalFiberExperiment() {
  const [mode, setMode] = useState<ExperimentMode>('numerical-aperture');
  const [params, setParams] = useState<NumericalApertureParams>(DEFAULT_NA_PARAMS);
  const [naReadings, setNaReadings] = useState<NumericalApertureReading[]>([]);
  const [naError, setNaError] = useState('');
  const [selectedPowerReading, setSelectedPowerReading] = useState<PowerReadingId>('P01');
  const [customCableLengthM, setCustomCableLengthM] = useState(DEFAULT_CUSTOM_FIBER_LENGTH_M);
  const [recordedCustomLengthM, setRecordedCustomLengthM] = useState<number | null>(null);
  const [powerValueDraft, setPowerValueDraft] = useState('');
  const [powerValueError, setPowerValueError] = useState('');
  const [powerReadings, setPowerReadings] = useState<Partial<Record<PowerReadingId, number>>>({});

  const liveNa = useMemo(
    () => computeNumericalAperture(params.screenDistanceM, params.spotDiameterM),
    [params.screenDistanceM, params.spotDiameterM],
  );
  const naResult = useMemo(() => computeNumericalApertureResult(naReadings), [naReadings]);
  const customEstimateDb = useMemo(
    () => estimateCustomPowerMeterValueDb(powerReadings, customCableLengthM),
    [powerReadings, customCableLengthM],
  );
  const attenuationComparisons = useMemo(
    () => calculateAttenuationComparisons(
      powerReadings,
      customCableLengthM,
      recordedCustomLengthM,
    ),
    [powerReadings, customCableLengthM, recordedCustomLengthM],
  );
  const draftPowerValue = powerValueDraft.trim() === '' ? Number.NaN : Number(powerValueDraft);
  const hasCurrentCustomReading =
    recordedCustomLengthM !== null &&
    Math.abs(recordedCustomLengthM - customCableLengthM) < 1e-9;
  const powerMeterValue = powerValueDraft.trim() !== ''
    ? isValidPowerMeterValue(draftPowerValue) ? draftPowerValue : null
    : selectedPowerReading === 'P06'
      ? hasCurrentCustomReading
        ? powerReadings.P06 ?? null
        : customEstimateDb
      : powerReadings[selectedPowerReading] ?? null;
  const powerMeterValueSource = powerValueDraft.trim() !== '' && isValidPowerMeterValue(draftPowerValue)
    ? 'manual'
    : selectedPowerReading === 'P06'
      ? hasCurrentCustomReading
        ? 'manual'
        : customEstimateDb === null ? null : 'length-model'
      : powerMeterValue === null ? null : 'manual';

  function handleParamsChange(updated: Partial<NumericalApertureParams>) {
    setParams((previous) => ({ ...previous, ...updated }));
    setNaError('');
  }

  function handleRecordNaReading() {
    const reading = createNumericalApertureReading(naReadings.length + 1, params);
    if (!reading) {
      setNaError('Enter a screen distance from 0.1 to 50 cm and a positive spot diameter before recording.');
      return;
    }

    setNaReadings((previous) => [...previous, reading]);
    setNaError('');
  }

  function handlePowerReadingChange(id: PowerReadingId) {
    setSelectedPowerReading(id);
    const savedValueMatchesConfiguration =
      id !== 'P06' || recordedCustomLengthM === customCableLengthM;
    setPowerValueDraft(
      powerReadings[id] === undefined || !savedValueMatchesConfiguration
        ? ''
        : String(powerReadings[id]),
    );
    setPowerValueError('');
  }

  function handleCustomCableLengthChange(lengthM: number) {
    setCustomCableLengthM(lengthM);
    if (selectedPowerReading === 'P06') setPowerValueDraft('');
    setPowerValueError('');
  }

  function handlePowerValueChange(value: string) {
    setPowerValueDraft(value);
    if (value.trim() === '') {
      setPowerValueError('');
      return;
    }

    const number = Number(value);
    setPowerValueError(
      isValidPowerMeterValue(number)
        ? ''
        : 'Enter a finite meter value from −120 to 30, or clear the field.',
    );
  }

  function handleRecordPowerReading() {
    if (powerValueDraft.trim() === '' || !isValidPowerMeterValue(draftPowerValue)) {
      setPowerValueError('Enter a finite meter value from −120 to 30 before recording.');
      return;
    }

    setPowerReadings((previous) => ({
      ...previous,
      [selectedPowerReading]: draftPowerValue,
    }));
    if (selectedPowerReading === 'P06') {
      setRecordedCustomLengthM(customCableLengthM);
    }
    setPowerValueError('');
  }

  function handleReset() {
    setMode('numerical-aperture');
    setParams(DEFAULT_NA_PARAMS);
    setNaReadings([]);
    setNaError('');
    setSelectedPowerReading('P01');
    setCustomCableLengthM(DEFAULT_CUSTOM_FIBER_LENGTH_M);
    setRecordedCustomLengthM(null);
    setPowerValueDraft('');
    setPowerValueError('');
    setPowerReadings({});
  }

  return (
    <div className="fiber-experiment-layout">
      <main className="fiber-main-column">
        <section className="fiber-apparatus-card">
          <div className="fiber-mode-bar">
            <div className="fiber-mode-switch" role="group" aria-label="Optical fiber apparatus view">
              <button
                type="button"
                aria-pressed={mode === 'numerical-aperture'}
                className="fiber-mode-button"
                onClick={() => setMode('numerical-aperture')}
              >
                Numerical aperture
              </button>
              <button
                type="button"
                aria-pressed={mode === 'attenuation'}
                className="fiber-mode-button"
                onClick={() => setMode('attenuation')}
              >
                Attenuation
              </button>
            </div>
            <button type="button" className="btn btn-secondary fiber-reset-button" onClick={handleReset}>
              ↺ Reset
            </button>
          </div>
          <div className="experiment-canvas-area fiber-canvas-area">
            <ExperimentCanvas
              mode={mode}
              params={params}
              selectedPowerReading={selectedPowerReading}
              powerMeterValue={powerMeterValue}
              powerMeterValueSource={powerMeterValueSource}
              recordedPowerReadings={powerReadings}
              customCableLengthM={customCableLengthM}
              onParamsChange={handleParamsChange}
            />
          </div>
        </section>

        <section className="fiber-card fiber-live-results" aria-live="polite">
          <div className="fiber-card-heading">
            <div>
              <p className="section-label">Live calculation</p>
              <h2>Numerical aperture</h2>
            </div>
            <span className="fiber-live-status">{liveNa ? 'Ready' : 'Check L and W'}</span>
          </div>
          <div className="fiber-stat-grid">
            <div className="fiber-stat">
              <span>NA = W / √(4L² + W²)</span>
              <strong>{liveNa ? liveNa.numericalAperture.toFixed(5) : '—'}</strong>
            </div>
            <div className="fiber-stat">
              <span>Acceptance angle θmax</span>
              <strong>{liveNa ? `${(liveNa.acceptanceAngleRad * 180 / Math.PI).toFixed(3)}°` : '—'}</strong>
            </div>
            <div className="fiber-stat">
              <span>Selected target circle</span>
              <strong>{params.targetCircleMm} mm</strong>
            </div>
            <div className="fiber-stat">
              <span>Mean from {naReadings.length} observation{naReadings.length === 1 ? '' : 's'}</span>
              <strong>
                {naReadings.length > 0
                  ? `NA ${naResult.meanNumericalAperture.toFixed(5)} · ${(naResult.meanAcceptanceAngleRad * 180 / Math.PI).toFixed(3)}°`
                  : '—'}
              </strong>
            </div>
          </div>
          <div className="fiber-action-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRecordNaReading}
              disabled={!liveNa}
            >
              Record NA observation
            </button>
            {naError && <p className="fiber-error" role="alert">{naError}</p>}
          </div>
        </section>

        <section className="fiber-card fiber-observations">
          <div className="fiber-card-heading">
            <div>
              <p className="section-label">Part A</p>
              <h2>Numerical aperture observations</h2>
            </div>
            {naReadings.length > 0 && (
              <span className="fiber-observation-count">{naReadings.length} recorded</span>
            )}
          </div>
          <div className="fiber-table-scroll">
            <table className="obs-table" aria-label="Optical fiber numerical aperture observations">
              <thead>
                <tr>
                  <th>Trial</th>
                  <th>Circle (mm)</th>
                  <th>L (cm)</th>
                  <th>W (mm)</th>
                  <th>NA</th>
                  <th>θmax (°)</th>
                </tr>
              </thead>
              <tbody>
                {naReadings.length > 0 ? naReadings.map((reading) => (
                  <tr key={reading.trial} className="observation-row">
                    <td data-label="Trial">{reading.trial}</td>
                    <td data-label="Circle (mm)">{reading.targetCircleMm}</td>
                    <td data-label="L (cm)">{(reading.screenDistanceM * 100).toFixed(2)}</td>
                    <td data-label="W (mm)">{(reading.spotDiameterM * 1000).toFixed(2)}</td>
                    <td data-label="NA">{reading.numericalAperture.toFixed(5)}</td>
                    <td data-label="θmax (°)">{(reading.acceptanceAngleRad * 180 / Math.PI).toFixed(3)}</td>
                  </tr>
                )) : (
                  <tr className="observations-empty-row">
                    <td colSpan={6} className="observations-empty">Adjust L and W, then record a reading for each screen circle.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <NumericalApertureGraph readings={naReadings} />

        <section className="fiber-card fiber-power-observations">
          <div className="fiber-card-heading">
            <div>
              <p className="section-label">Part B</p>
              <h2>Power-meter observations</h2>
            </div>
            <span className="fiber-observation-count">
              {Object.keys(powerReadings).length} / {POWER_READING_IDS.length} recorded
            </span>
          </div>
          <div className="fiber-table-scroll">
            <table className="obs-table" aria-label="Optical fiber attenuation power meter readings">
              <thead>
                <tr><th>Reading</th><th>Setup</th><th>Meter value (PDF: dB)</th><th>Status</th></tr>
              </thead>
              <tbody>
                {POWER_READING_IDS.map((id) => (
                  <tr key={id} className="observation-row">
                    <td data-label="Reading">{id}</td>
                    <td data-label="Setup">
                      {id === 'P06'
                        ? `Custom-length fiber · ${recordedCustomLengthM === null
                          ? `${customCableLengthM.toFixed(2)} m (not recorded)`
                          : `${recordedCustomLengthM.toFixed(2)} m`} · straight`
                        : POWER_READING_DESCRIPTIONS[id]}
                    </td>
                    <td data-label="Meter value (PDF: dB)">
                      {powerReadings[id] === undefined ? '—' : `${powerReadings[id]!.toFixed(2)} dB`}
                    </td>
                    <td data-label="Status">{powerReadings[id] === undefined ? 'Awaiting' : 'Recorded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <AttenuationGraph comparisons={attenuationComparisons} />
      </main>

      <aside className="fiber-sidebar">
        <div className="fiber-attenuation-panel">
          <Controls
            selectedPowerReading={selectedPowerReading}
            customCableLengthM={customCableLengthM}
            recordedCustomLengthM={recordedCustomLengthM}
            customEstimateDb={customEstimateDb}
            powerValueDraft={powerValueDraft}
            recordedPowerReadings={powerReadings}
            powerValueError={powerValueError}
            onPowerReadingChange={handlePowerReadingChange}
            onCustomCableLengthChange={handleCustomCableLengthChange}
            onPowerValueChange={handlePowerValueChange}
            onRecordPowerReading={handleRecordPowerReading}
          />

          <section className="fiber-card fiber-attenuation-results" aria-live="polite">
            <p className="section-label">Part B · Calculated comparisons</p>
            <h2>Attenuation loss</h2>
            <div className="fiber-comparison-list">
              {attenuationComparisons.map((comparison) => (
                <div className="fiber-comparison-row" key={comparison.id}>
                  <div>
                    <strong>{comparison.label}</strong>
                    <span>{comparison.formula}</span>
                  </div>
                  <b>{comparison.valueDb === null ? '—' : `${comparison.valueDb.toFixed(2)} dB`}</b>
                </div>
              ))}
            </div>
            <p className="fiber-formula">P01 − P02 · P03 − P04 · P05 − P01 · P05 − P03</p>
          </section>

        </div>

        <NumericalApertureControls params={params} onParamsChange={handleParamsChange} />
      </aside>
    </div>
  );
}
