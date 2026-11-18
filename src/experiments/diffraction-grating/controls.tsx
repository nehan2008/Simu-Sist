import SliderInput from '../../components/ui/SliderInput';
import {
  MAX_GRATING_LINES_PER_M,
  MAX_SCREEN_DISTANCE_M,
  MIN_GRATING_LINES_PER_M,
  MIN_SCREEN_DISTANCE_M,
} from './simulation';
import type { Params } from './simulation';

interface ControlsProps {
  params: Params;
  maximumOrder: number;
  onChange: (updated: Partial<Params>) => void;
}

export default function Controls({ params, maximumOrder, onChange }: ControlsProps) {
  return (
    <div className="controls-panel diffraction-controls">
      <p className="section-label">Diffraction setup</p>

      <SliderInput
        label="Grating density (N)"
        value={params.gratingLinesPerM}
        min={MIN_GRATING_LINES_PER_M}
        max={MAX_GRATING_LINES_PER_M}
        step={10_000}
        unit=" lines/m"
        precision={0}
        showNumericInput
        onChange={(value) => onChange({ gratingLinesPerM: value })}
      />

      <SliderInput
        label="Grating-to-screen distance (d)"
        value={params.screenDistanceM}
        min={MIN_SCREEN_DISTANCE_M}
        max={MAX_SCREEN_DISTANCE_M}
        step={0.1}
        unit=" m"
        precision={2}
        showNumericInput
        onChange={(value) => onChange({ screenDistanceM: value })}
      />

      <SliderInput
        label="Diffraction order (n)"
        value={params.order}
        min={1}
        max={Math.max(1, maximumOrder)}
        step={1}
        precision={0}
        showNumericInput
        disabled={maximumOrder < 1}
        onChange={(value) => onChange({ order: Math.round(value) })}
      />

      <div className="diffraction-physics-note">
        <strong>Allowed orders:</strong> 1 to {maximumOrder}
        <br />
        <span>
          The selected order updates the beam angles and screen positions immediately.
        </span>
      </div>
    </div>
  );
}
