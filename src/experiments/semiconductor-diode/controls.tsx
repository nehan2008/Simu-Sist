import SliderInput from '../../components/ui/SliderInput';
import {
  MAX_SAFE_TEMPERATURE_C,
  ROOM_TEMPERATURE_C,
  VOLTMETER_MAX_V,
} from './simulation';
import type { Params, State } from './simulation';

interface ControlsProps {
  params: Params;
  state: State;
  readingCount: number;
  error: string;
  safetyNotice: string;
  onVoltageChange: (voltageV: number) => void;
  onToggleHeater: () => void;
  onTogglePower: () => void;
  onToggleStirring: () => void;
  onRecordReading: () => void;
  onReset: () => void;
}

function getStage(params: Params, state: State, readingCount: number): {
  title: string;
  detail: string;
  step: number;
} {
  if (params.heaterOn) {
    return {
      title: 'Heat the oil bath',
      detail: 'Keep the power supply off. Stir the oil and approach 65°C, then allow it to stabilize near 75°C.',
      step: 2,
    };
  }
  if (state.peakTemperatureC > ROOM_TEMPERATURE_C + 5) {
    if (readingCount >= 2 && state.temperatureC <= ROOM_TEMPERATURE_C + 0.5) {
      return {
        title: 'Calculate the energy gap',
        detail: 'The bath has returned near ambient. Review the recorded cooling readings and the fitted graph.',
        step: 4,
      };
    }
    return {
      title: 'Record during cooling',
      detail: params.powerOn
        ? 'Keep the reverse-bias voltage fixed and record paired temperature/current readings as the bath cools.'
        : 'The bath is cooling. Switch the supply on at the chosen reverse-bias voltage to record readings.',
      step: 3,
    };
  }
  if (readingCount === 0) {
    return {
      title: 'Take the room-temperature reading',
      detail: 'Switch on the reverse-bias supply and record the initial temperature and current before heating.',
      step: 1,
    };
  }
  return {
    title: 'Prepare for heating',
    detail: 'The room-temperature baseline is recorded. Switch the supply off, then turn on the mantle and stir the bath.',
    step: 2,
  };
}

export default function Controls({
  params,
  state,
  readingCount,
  error,
  safetyNotice,
  onVoltageChange,
  onToggleHeater,
  onTogglePower,
  onToggleStirring,
  onRecordReading,
  onReset,
}: ControlsProps) {
  const stage = getStage(params, state, readingCount);
  const canRecord =
    params.powerOn &&
    !params.heaterOn &&
    params.reverseVoltageV >= 0.5 &&
    params.reverseVoltageV <= VOLTMETER_MAX_V &&
    state.temperatureC < MAX_SAFE_TEMPERATURE_C &&
    state.reverseCurrentUa > 0;

  return (
    <div className="controls-panel diode-controls">
      <section className="diode-control-card" aria-labelledby="diode-stage-heading">
        <div className="diode-card-heading">
          <span className="diode-step-badge">{String(stage.step).padStart(2, '0')}</span>
          <div>
            <p className="section-label">Current stage</p>
            <h2 id="diode-stage-heading">{stage.title}</h2>
          </div>
        </div>
        <p className="diode-stage-detail">{stage.detail}</p>
        <ol className="diode-procedure-list" aria-label="Experiment procedure">
          {[
            'Record the room-temperature baseline.',
            'Heat and stir the bath; do not exceed 80°C.',
            'Switch the mantle off and record while cooling.',
            'Plot log₁₀(I₀) against 1000/T and find the slope.',
          ].map((step, index) => (
            <li
              key={step}
              className={
                index + 1 < stage.step
                  ? 'is-complete'
                  : index + 1 === stage.step
                    ? 'is-current'
                    : ''
              }
            >
              <span>{index + 1 < stage.step ? '✓' : index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="diode-control-card" aria-labelledby="diode-switches-heading">
        <div className="diode-card-heading">
          <span className="diode-step-badge">01</span>
          <div>
            <p className="section-label">Apparatus controls</p>
            <h2 id="diode-switches-heading">Power and heating</h2>
          </div>
        </div>
        <div className="diode-switch-row">
          <div>
            <strong>15 V DC supply</strong>
            <span>Reverse-bias circuit</span>
          </div>
          <button
            type="button"
            className={`diode-toggle${params.powerOn ? ' is-on' : ''}`}
            aria-label={`Power supply ${params.powerOn ? 'on' : 'off'}`}
            aria-pressed={params.powerOn}
            disabled={params.heaterOn}
            onClick={onTogglePower}
          >
            <span />
            <strong>{params.powerOn ? 'ON' : 'OFF'}</strong>
          </button>
        </div>
        <div className="diode-switch-row">
          <div>
            <strong>Heating mantle</strong>
            <span>{params.heaterOn ? 'Heating oil bath' : 'Mantle off'}</span>
          </div>
          <button
            type="button"
            className={`diode-toggle${params.heaterOn ? ' is-on' : ''}`}
            aria-label={`Heating mantle ${params.heaterOn ? 'on' : 'off'}`}
            aria-pressed={params.heaterOn}
            disabled={!params.heaterOn && (state.temperatureC >= MAX_SAFE_TEMPERATURE_C || readingCount === 0)}
            onClick={onToggleHeater}
          >
            <span />
            <strong>{params.heaterOn ? 'ON' : 'OFF'}</strong>
          </button>
        </div>
        <SliderInput
          label="Reverse-bias voltage"
          value={params.reverseVoltageV}
          min={0}
          max={VOLTMETER_MAX_V}
          step={0.1}
          unit=" V"
          precision={1}
          showNumericInput
          disabled={params.heaterOn || readingCount > 0}
          onChange={onVoltageChange}
        />
        <div className="diode-switch-row diode-stir-row">
          <div>
            <strong>Stir oil bath</strong>
            <span>{params.stirringOn ? 'Mixing oil for uniform temperature' : 'Stir while heating or cooling'}</span>
          </div>
          <button
            type="button"
            className={`diode-toggle${params.stirringOn ? ' is-on' : ''}`}
            aria-label={`Oil stirring ${params.stirringOn ? 'on' : 'off'}`}
            aria-pressed={params.stirringOn}
            disabled={!params.heaterOn && state.temperatureC <= ROOM_TEMPERATURE_C + 0.2}
            onClick={onToggleStirring}
          >
            <span />
            <strong>{params.stirringOn ? 'ON' : 'OFF'}</strong>
          </button>
        </div>
        <p className="diode-control-note">
          The PDF lists a 3 V observation setting and gives 5 V as a procedure example. The voltmeter is rated to 12 V; this control remains within that range. Keep the bias fixed for all readings.
        </p>
      </section>

      <section className="diode-control-card diode-record-card" aria-labelledby="diode-record-heading">
        <div>
          <p className="section-label">Observation</p>
          <h2 id="diode-record-heading">Record a reading</h2>
        </div>
        <p className="diode-stage-detail">
          Record only with the mantle off and the reverse-bias supply on. Temperature and current are captured together.
        </p>
        <button
          type="button"
          className="btn btn-primary diode-record-button"
          onClick={onRecordReading}
          disabled={!canRecord}
        >
          Record T and I₀
        </button>
        {error && <p className="diode-error" role="alert">{error}</p>}
        {safetyNotice && <p className="diode-safety-note" role="status">{safetyNotice}</p>}
        <button type="button" className="btn btn-secondary diode-reset-button" onClick={onReset}>
          ↺ Reset experiment
        </button>
      </section>
    </div>
  );
}
