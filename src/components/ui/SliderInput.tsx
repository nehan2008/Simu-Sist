/**
 * SliderInput — labelled range slider with live value display.
 * Used by experiment controls panels to expose numeric parameters.
 */

import { useState } from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  showNumericInput?: boolean;
  precision?: number;
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
  showNumericInput = false,
  precision = 3,
  onChange,
}: SliderInputProps) {
  const [numericDraft, setNumericDraft] = useState({
    value,
    text: String(value),
    invalid: false,
  });
  const displayedNumericValue = numericDraft.value === value
    ? numericDraft.text
    : String(value);
  const numericInvalid = numericDraft.value === value && numericDraft.invalid;
  const numericId = `slider-number-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  function handleSliderChange(rawValue: string) {
    const rawNumber = Number(rawValue);
    const nextValue = showNumericInput ? Number(rawNumber.toFixed(precision)) : rawNumber;
    if (showNumericInput) {
      setNumericDraft({ value: nextValue, text: String(nextValue), invalid: false });
    }
    onChange(nextValue);
  }

  function handleNumericChange(rawValue: string) {
    const nextValue = rawValue.trim() === '' ? Number.NaN : Number(rawValue);
    if (!Number.isFinite(nextValue) || nextValue < min || nextValue > max) {
      setNumericDraft({ value, text: rawValue, invalid: true });
      return;
    }

    setNumericDraft({ value: nextValue, text: rawValue, invalid: false });
    onChange(nextValue);
  }

  return (
    <div className="slider-input">
      <div className="slider-header">
        <label className="slider-label" htmlFor={showNumericInput ? numericId : undefined}>
          {label}
        </label>
        {showNumericInput ? (
          <div className="slider-numeric-value">
            <input
              id={numericId}
              className="slider-numeric-input"
              type="number"
              min={min}
              max={max}
              step="any"
              inputMode="decimal"
              value={displayedNumericValue}
              disabled={disabled}
              aria-label={`${label} numeric value`}
              aria-invalid={numericInvalid}
              onChange={(event) => handleNumericChange(event.target.value)}
              onBlur={() => setNumericDraft({ value, text: String(value), invalid: false })}
            />
            {unit && <span className="slider-unit">{unit.trim()}</span>}
          </div>
        ) : (
          <span className="slider-value" aria-live="polite">
            {value}
            {unit && <span className="slider-unit"> {unit}</span>}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={showNumericInput ? 'any' : step}
        value={value}
        disabled={disabled}
        onChange={(event) => handleSliderChange(event.target.value)}
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
