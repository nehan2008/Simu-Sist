/**
 * TEMPLATE: Visualization layer
 *
 * Renders the experiment visually using SVG or Canvas.
 * Receives only derived display values — no physics calculations here.
 * Keep this component stateless and driven entirely by props.
 */

import type { TemplateState } from './simulation';

interface CanvasProps {
  state: TemplateState;
  width?: number;
  height?: number;
}

export default function ExperimentCanvas({ width = 600, height = 400 }: CanvasProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="experiment-canvas"
      role="img"
      aria-label="Experiment visualization area"
    >
      <rect width={width} height={height} fill="var(--canvas-bg, #0f1117)" rx={8} />
      {/* Render experiment apparatus and objects here */}
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--text-muted, #6b7280)"
        fontSize={14}
      >
        Visualization area
      </text>
    </svg>
  );
}
