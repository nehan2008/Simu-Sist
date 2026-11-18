/**
 * Young's Modulus — SVG Apparatus Visualization
 *
 * Purely declarative: no internal state, no effects.
 * All visual values are derived from props.
 */

import type { Params, State } from './simulation';

interface CanvasProps {
  params: Params;
  state: State;
  /** Student's current microscope reading in mm (0–10), drives crosshair position */
  microscopeReading: number;
}

const W_SVG = 820;
const H_SVG = 560;

// Layout constants
const BENCH_Y = 480;
const BENCH_H = 24;
const SUPPORT_H = 200;
const SUPPORT_W = 38;
const APPARATUS_CENTER_X = 350;
const BEAM_Y_BASE = BENCH_Y - SUPPORT_H; // top of beam when unloaded
const SECTION_X = 722;
const SECTION_Y = 416;
// Scale factor: exaggerate deflection visually so it's always visible
const DEFLECTION_EXAGGERATION = 1200;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function ExperimentCanvas({ params, state, microscopeReading }: CanvasProps) {
  const { W, yTheoretical, materialLabel } = state;

  // Map beam length to SVG span between support centres
  const minL = 0.40;
  const maxL = 1.00;
  const minSpan = 240;
  const maxSpan = 600;
  const t = (params.l - minL) / (maxL - minL);
  const supportSpan = lerp(minSpan, maxSpan, t);
  const thicknessRatio = Math.max(0, Math.min(1, (params.d * 1000 - 1) / 9));
  const breadthRatio = Math.max(0, Math.min(1, (params.b * 1000 - 10) / 40));
  const beamThicknessPx = lerp(14, 44, thicknessRatio);
  const sectionBreadthPx = lerp(24, 80, breadthRatio);
  const beamColor = materialLabel === 'Steel' ? '#7a8aaa' : materialLabel === 'Brass' ? '#c8a84b' : materialLabel === 'Copper' ? '#b87333' : materialLabel === 'Glass' ? '#a8d8ea' : '#a0aec0';

  const leftSupportX = APPARATUS_CENTER_X - supportSpan / 2;
  const rightSupportX = APPARATUS_CENTER_X + supportSpan / 2;
  const midX = APPARATUS_CENTER_X;

  // Beam extends beyond each support
  const beamLeft = leftSupportX - 40;
  const beamRight = rightSupportX + 40;

  // Deflection in SVG pixels (exaggerated)
  const deflectionPx = Math.min(yTheoretical * DEFLECTION_EXAGGERATION, 60);

  // Beam as quadratic bezier: flat at supports, dips at centre
  const beamTopPath = `
    M ${beamLeft} ${BEAM_Y_BASE}
    L ${leftSupportX} ${BEAM_Y_BASE}
    Q ${midX} ${BEAM_Y_BASE + deflectionPx} ${rightSupportX} ${BEAM_Y_BASE}
    L ${beamRight} ${BEAM_Y_BASE}
  `;
  const beamBottomPath = `
    M ${beamLeft} ${BEAM_Y_BASE + beamThicknessPx}
    L ${leftSupportX} ${BEAM_Y_BASE + beamThicknessPx}
    Q ${midX} ${BEAM_Y_BASE + beamThicknessPx + deflectionPx} ${rightSupportX} ${BEAM_Y_BASE + beamThicknessPx}
    L ${beamRight} ${BEAM_Y_BASE + beamThicknessPx}
  `;
  const beamFill = `
    M ${beamLeft} ${BEAM_Y_BASE}
    L ${leftSupportX} ${BEAM_Y_BASE}
    Q ${midX} ${BEAM_Y_BASE + deflectionPx} ${rightSupportX} ${BEAM_Y_BASE}
    L ${beamRight} ${BEAM_Y_BASE}
    L ${beamRight} ${BEAM_Y_BASE + beamThicknessPx}
    L ${rightSupportX} ${BEAM_Y_BASE + beamThicknessPx}
    Q ${midX} ${BEAM_Y_BASE + beamThicknessPx + deflectionPx} ${leftSupportX} ${BEAM_Y_BASE + beamThicknessPx}
    L ${beamLeft} ${BEAM_Y_BASE + beamThicknessPx}
    Z
  `;

  // Hanger hangs from the beam mid-point (bottom of beam at centre)
  const hangerAttachY = BEAM_Y_BASE + beamThicknessPx + deflectionPx;
  const hangerTopY = hangerAttachY;
  const hangerBottomY = hangerTopY + 26;

  // Weight discs
  const numDiscs = Math.min(Math.round(params.mass / 0.1), 8);
  const discW = 68;
  const discH = 12;
  const availableDiscHeight = Math.max(discH, BENCH_Y - hangerBottomY - 18);
  const discStep =
    numDiscs > 1
      ? Math.max(8, Math.min(discH + 4, (availableDiscHeight - discH) / (numDiscs - 1)))
      : 0;

  // Microscope rule — right side
  const rulerX = rightSupportX + 62;
  const rulerTop = BEAM_Y_BASE - 45;
  const rulerBottom = BEAM_Y_BASE + 95;
  const rulerHeight = rulerBottom - rulerTop;
  const sectionBottom = SECTION_Y + beamThicknessPx;
  // 10 mm range mapped to ruler height
  const mmToRulerPx = rulerHeight / 10;
  const arrowY = BENCH_Y + BENCH_H + 20;
  const viewBoxHeight = 380;
  const lastDiscBottom = numDiscs > 0
    ? hangerBottomY + 8 + (numDiscs - 1) * discStep + discH
    : hangerBottomY;
  const contentTop = rulerTop - 30;
  const contentBottom = Math.max(
    BENCH_Y + BENCH_H,
    hangerBottomY,
    lastDiscBottom,
    arrowY + 24,
  );
  const viewBoxY = (contentTop + contentBottom - viewBoxHeight) / 2;

  const yMm = yTheoretical * 1000;

  return (
    <svg
      width="100%"
      viewBox={`0 ${viewBoxY} ${W_SVG} ${viewBoxHeight}`}
      className="experiment-canvas"
      role="img"
      aria-label="Young's modulus apparatus with adjustable beam dimensions and a schematic cross-section"
      style={{ display: 'block' }}
    >
      {/* Background */}
      <rect width={W_SVG} height={H_SVG} fill="#0f1117" />

      {/* Bench surface */}
      <rect x={0} y={BENCH_Y} width={W_SVG} height={BENCH_H} fill="#1e2130" stroke="#2e3148" strokeWidth={1} />

      {/* Left knife-edge support */}
      <polygon
        points={`
          ${leftSupportX - SUPPORT_W / 2},${BENCH_Y}
          ${leftSupportX + SUPPORT_W / 2},${BENCH_Y}
          ${leftSupportX},${BENCH_Y - SUPPORT_H}
        `}
        fill="#3a3f5c"
        stroke="#5a6080"
        strokeWidth={1}
      />

      {/* Right knife-edge support */}
      <polygon
        points={`
          ${rightSupportX - SUPPORT_W / 2},${BENCH_Y}
          ${rightSupportX + SUPPORT_W / 2},${BENCH_Y}
          ${rightSupportX},${BENCH_Y - SUPPORT_H}
        `}
        fill="#3a3f5c"
        stroke="#5a6080"
        strokeWidth={1}
      />

      {/* Beam (filled path) */}
      <path className="youngs-beam-fill" d={beamFill} fill={beamColor} opacity={0.9} />
      <path className="youngs-beam-outline" d={beamTopPath} fill="none" stroke="#c0ccdd" strokeWidth={1} />
      <path className="youngs-beam-outline" d={beamBottomPath} fill="none" stroke="#8090a8" strokeWidth={0.5} />

      {/* Hanger hook */}
      <line x1={midX} y1={hangerTopY} x2={midX} y2={hangerBottomY} stroke="#aab0c0" strokeWidth={3} />
      <path
        d={`M ${midX - 13} ${hangerBottomY} Q ${midX} ${hangerBottomY + 12} ${midX + 13} ${hangerBottomY}`}
        fill="none"
        stroke="#aab0c0"
        strokeWidth={3}
      />

      {/* Weight discs */}
      {Array.from({ length: numDiscs }).map((_, i) => {
        const dy = hangerBottomY + 8 + i * discStep;
        return (
          <g key={i}>
            <ellipse cx={midX} cy={dy + discH / 2} rx={discW / 2} ry={discH / 2} fill="#4a5068" stroke="#6a7090" strokeWidth={1} />
            <text x={midX} y={dy + discH / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="#9098b0" fontSize={8}>
              100g
            </text>
          </g>
        );
      })}

      {/* Travelling microscope rule */}
      <rect x={rulerX} y={rulerTop} width={16} height={rulerHeight} fill="#1a1e2e" stroke="#3a4060" strokeWidth={1} />
      {/* Tick marks */}
      {Array.from({ length: 21 }).map((_, i) => {
        const isMajor = i % 2 === 0;
        const tickY = rulerTop + i * (mmToRulerPx / 2);
        return (
          <line
            key={i}
            x1={rulerX + 16}
            y1={tickY}
            x2={rulerX + 16 + (isMajor ? 10 : 6)}
            y2={tickY}
            stroke="#5a6480"
            strokeWidth={isMajor ? 1 : 0.5}
          />
        );
      })}
      {/* mm labels on rule */}
      {Array.from({ length: 11 }).map((_, i) => (
        <text
          key={i}
          x={rulerX + 30}
          y={rulerTop + i * mmToRulerPx + 1}
          fill="#6a7490"
          fontSize={10}
          dominantBaseline="middle"
        >
          {i}
        </text>
      ))}
      {/* Student crosshair — position driven by microscopeReading prop (0–10 mm).
           Clamped to rulerTop…rulerTop+rulerHeight so it never leaves the SVG.
           Kept visually distinct from the theoretical beam deflection line. */}
      {(() => {
        const clampedReading = Math.max(0, Math.min(10, microscopeReading));
        const crosshairY = rulerTop + (clampedReading / 10) * rulerHeight;
        // Right end capped at SVG width minus a small margin so it never clips
        const lineRight = Math.min(rulerX + 58, W_SVG - 8);
        return (
          <g className="youngs-microscope-crosshair">
            <line
              x1={rulerX - 8}
              y1={crosshairY}
              x2={lineRight}
              y2={crosshairY}
              stroke="#00e5ff"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              opacity={0.9}
            />
            {/* Small triangle pointer on the rule */}
            <polygon
              points={`${rulerX - 8},${crosshairY} ${rulerX - 18},${crosshairY - 5} ${rulerX - 18},${crosshairY + 5}`}
              fill="#00e5ff"
              opacity={0.9}
            />
            <text
              x={rulerX + 62}
              y={crosshairY + 1}
              fill="#00e5ff"
              fontSize={10}
              dominantBaseline="middle"
            >
              {clampedReading.toFixed(2)} mm
            </text>
          </g>
        );
      })()}

      {/* Microscope label */}
      <text x={rulerX + 8} y={rulerTop - 18} fill="#6a7490" fontSize={11} textAnchor="middle">
        Microscope
      </text>

      {/* Dimension line for l */}
      <line x1={leftSupportX} y1={arrowY} x2={rightSupportX} y2={arrowY} stroke="#4a5a7a" strokeWidth={1} />
      <line x1={leftSupportX} y1={arrowY - 5} x2={leftSupportX} y2={arrowY + 5} stroke="#4a5a7a" strokeWidth={1} />
      <line x1={rightSupportX} y1={arrowY - 5} x2={rightSupportX} y2={arrowY + 5} stroke="#4a5a7a" strokeWidth={1} />
      <text x={midX} y={arrowY + 14} textAnchor="middle" fill="#6a7a9a" fontSize={11}>
        l = {params.l.toFixed(2)} m
      </text>

      {/* Schematic beam cross-section: visual dimensions do not affect calculations. */}
      <rect x={674} y={382} width={140} height={94} rx={4} fill="#141824" stroke="#343a50" strokeWidth={1} />
      <text x={744} y={394} textAnchor="middle" fill="#8a94b0" fontSize={9}>
        Beam cross-section
      </text>
      <line x1={SECTION_X} y1={411} x2={SECTION_X + sectionBreadthPx} y2={411} stroke="#f0c86a" strokeWidth={1} />
      <polygon points={`${SECTION_X},411 ${SECTION_X + 5},408 ${SECTION_X + 5},414`} fill="#f0c86a" />
      <polygon points={`${SECTION_X + sectionBreadthPx},411 ${SECTION_X + sectionBreadthPx - 5},408 ${SECTION_X + sectionBreadthPx - 5},414`} fill="#f0c86a" />
      <text x={SECTION_X + sectionBreadthPx / 2} y={405} textAnchor="middle" fill="#f0c86a" fontSize={8}>
        b = {(params.b * 1000).toFixed(0)} mm
      </text>
      <rect
        x={SECTION_X}
        y={SECTION_Y}
        width={sectionBreadthPx}
        height={beamThicknessPx}
        fill={beamColor}
        stroke="#c0ccdd"
        strokeWidth={1}
        opacity={0.9}
      />
      <line x1={711} y1={SECTION_Y} x2={711} y2={sectionBottom} stroke="#f0c86a" strokeWidth={1} />
      <polygon points={`711,${SECTION_Y} 708,${SECTION_Y + 5} 714,${SECTION_Y + 5}`} fill="#f0c86a" />
      <polygon points={`711,${sectionBottom} 708,${sectionBottom - 5} 714,${sectionBottom - 5}`} fill="#f0c86a" />
      <text
        x={701}
        y={(SECTION_Y + sectionBottom) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#f0c86a"
        fontSize={8}
        transform={`rotate(-90, 701, ${(SECTION_Y + sectionBottom) / 2})`}
      >
        d = {(params.d * 1000).toFixed(1)} mm
      </text>
      <text x={744} y={471} textAnchor="middle" fill="#6a7490" fontSize={7}>
        Schematic, not to scale
      </text>

      {/* Labels */}
      <text x={leftSupportX} y={BEAM_Y_BASE - 18} textAnchor="middle" fill="#5a6a8a" fontSize={10}>
        Knife edge
      </text>
      <text x={rightSupportX} y={BEAM_Y_BASE - 18} textAnchor="middle" fill="#5a6a8a" fontSize={10}>
        Knife edge
      </text>
      <text x={beamLeft + 24} y={BEAM_Y_BASE - 8} fill="#7a8aaa" fontSize={11}>
        {materialLabel} beam
      </text>

      {/* Load label */}
      <text x={midX + 44} y={hangerAttachY + 24} fill="#c0ccdd" fontSize={12} fontWeight="600">
        W = {W.toFixed(2)} N
      </text>

      {/* Theoretical depression */}
      <text x={midX + 44} y={hangerAttachY + 42} fill="#a0b0c8" fontSize={11}>
        y&#x209C; = {yMm.toFixed(4)} mm
      </text>

      {/* Deflection note */}
      {deflectionPx > 1 && (
        <text x={midX} y={rulerTop - 8} textAnchor="middle" fill="#6a7490" fontSize={9} fontStyle="italic">
          Deflection exaggerated ×{DEFLECTION_EXAGGERATION} for visibility
        </text>
      )}
    </svg>
  );
}
