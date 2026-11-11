/**
 * TEMPLATE: User controls panel
 *
 * Renders sliders, toggles, and inputs that let the student
 * manipulate experiment parameters. Receives current params and
 * an onChange callback — no simulation logic lives here.
 */

import type { TemplateParams } from './simulation';

interface ControlsProps {
  params: TemplateParams;
  disabled?: boolean;
  onChange: (updated: Partial<TemplateParams>) => void;
}

export default function Controls({ onChange: _onChange, disabled: _disabled }: ControlsProps) {
  return (
    <div className="controls-panel">
      <p className="controls-placeholder">
        {/* Add SliderInput and other controls here */}
        Parameter controls will appear here.
      </p>
    </div>
  );
}
