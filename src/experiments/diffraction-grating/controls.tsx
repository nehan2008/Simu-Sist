import SliderInput from '../../components/ui/SliderInput';
import type { Params } from './simulation';

interface ControlsProps {
  params: Params;
  maximumOrder: number;
  onChange: (updated: Partial<Params>) => void;
}

export default function Controls({ params, maximumOrder, onChange }: ControlsProps) {
  return (
    <div className="controls-panel diffraction-controls">
      <p className="section-label">Laser &amp; Grating</p>

      <SliderInput
        label="Laser wavelength (λ)"
        value={params.wavelengthNm}
        min={380}
        max={750}
        step={1}
        unit=" nm"
        precision={0}
        showNumericInput
        onChange={(value) => onChange({ wavelengthNm: value })}
      />

      <SliderInput
        label="Grating density"
        value={params.gratingLinesPerMm}
        min={100}
        max={1200}
        step={10}
        unit=" lines/mm"
        precision={0}
        showNumericInput
        onChange={(value) => onChange({ gratingLinesPerMm: value })}
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
          Orders are limited by |nλ/d| ≤ 1. The selected order updates the beam angles and screen
          positions immediately.
        </span>
      </div>
    </div>
  );
}
