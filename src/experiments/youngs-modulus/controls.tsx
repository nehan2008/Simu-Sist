/**
 * Young's Modulus — Controls Panel
 *
 * Renders sliders for beam parameters and a material selector.
 * No physics logic here — only UI.
 */

import SliderInput from '../../components/ui/SliderInput';
import { MATERIALS } from './simulation';
import type { Params, MaterialKey } from './simulation';

interface ControlsProps {
  params: Params;
  disabled?: boolean;
  onChange: (updated: Partial<Params>) => void;
}

export default function Controls({ params, disabled = false, onChange }: ControlsProps) {
  return (
    <div className="controls-panel">
      <p className="section-label">Beam &amp; Load Parameters</p>

      {/* Material selector */}
      <div className="slider-input">
        <div className="slider-header">
          <label className="slider-label" htmlFor="material-select">Material</label>
        </div>
        <select
          id="material-select"
          className="material-select"
          value={params.material}
          disabled={disabled}
          onChange={(e) => onChange({ material: e.target.value as MaterialKey })}
          aria-label="Select beam material"
        >
          {(Object.entries(MATERIALS) as [MaterialKey, { label: string; E_ref: number }][]).map(
            ([key, mat]) => (
              <option key={key} value={key}>
                {mat.label} ({(mat.E_ref / 1e9).toFixed(0)} GPa)
              </option>
            ),
          )}
        </select>
      </div>

      <SliderInput
        label="Load mass"
        value={params.mass}
        min={0.05}
        max={1.0}
        step={0.05}
        unit=" kg"
        disabled={disabled}
        onChange={(v) => onChange({ mass: v })}
      />

      <SliderInput
        label="Beam length (l)"
        value={params.l}
        min={0.40}
        max={1.00}
        step={0.05}
        unit=" m"
        disabled={disabled}
        onChange={(v) => onChange({ l: v })}
      />

      {/* Breadth displayed in mm, stored in m */}
      <SliderInput
        label="Beam breadth (b)"
        value={Math.round(params.b * 1000)}
        min={10}
        max={50}
        step={1}
        unit=" mm"
        disabled={disabled}
        onChange={(v) => onChange({ b: v / 1000 })}
      />

      {/* Thickness displayed in mm (1 decimal), stored in m */}
      <SliderInput
        label="Beam thickness (d)"
        value={Math.round(params.d * 2000) / 2}
        min={1.0}
        max={10.0}
        step={0.5}
        unit=" mm"
        disabled={disabled}
        onChange={(v) => onChange({ d: v / 1000 })}
      />
    </div>
  );
}
