/**
 * SliderInput — labelled range slider with live value display.
 * Used by experiment controls panels to expose numeric parameters.
 */

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export default function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  disabled = false,
  onChange,
}: SliderInputProps) {
  return (
    <div className="slider-input">
      <div className="slider-header">
        <label className="slider-label">{label}</label>
        <span className="slider-value" aria-live="polite">
          {value}
          {unit && <span className="slider-unit"> {unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label}: ${value}${unit}`}
        className="slider-track"
      />
      <div className="slider-range-labels" aria-hidden="true">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
