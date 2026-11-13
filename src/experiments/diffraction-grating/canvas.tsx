import { SCREEN_DISTANCE_M } from './simulation';
import type { Params, State } from './simulation';

interface CanvasProps {
  params: Params;
  state: State;
  measuredLeftAngle: number | null;
  measuredRightAngle: number | null;
}

const WIDTH = 1040;
const HEIGHT = 680;
const CENTER_Y = 320;
const GRATING_X = 340;
const MAX_SCREEN_OFFSET = 258;
const MAX_SCALE_PX_PER_M = 220;

function angleArcPath(x: number, y: number, radius: number, angle: number, lower: boolean) {
  const endX = x + radius * Math.cos(angle);
  const endY = y + (lower ? 1 : -1) * radius * Math.sin(angle);
  return `M ${x + radius} ${y} A ${radius} ${radius} 0 0 ${lower ? 1 : 0} ${endX} ${endY}`;
}

export default function ExperimentCanvas({
  params,
  state,
  measuredLeftAngle,
  measuredRightAngle,
}: CanvasProps) {
  const finiteOffsets = state.orders
    .filter((order) => order.reachesScreen)
    .map((order) => order.positionM);
  const largestPosition = Math.max(...finiteOffsets, 0.1);
  const scale = Math.min(MAX_SCALE_PX_PER_M, MAX_SCREEN_OFFSET / largestPosition);
  const screenX = GRATING_X + scale * SCREEN_DISTANCE_M;
  const sourceX = Math.max(26, GRATING_X - scale * 0.85 - 112);
  const laserWindowX = sourceX + 104;
  const selected = state.orders.find((order) => order.order === state.selectedOrder);
  const selectedAngle = selected?.angleRadians ?? 0;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="experiment-canvas diffraction-canvas"
      role="img"
      aria-label={`Laser diffraction grating apparatus. Wavelength ${params.wavelengthNm} nanometres, grating density ${params.gratingLinesPerMm} lines per millimetre, selected order ${params.order}.`}
      style={{ display: 'block' }}
    >
      <style>{`
        @keyframes diffraction-ray-flow { to { stroke-dashoffset: -44; } }
        @keyframes diffraction-laser-flow { to { stroke-dashoffset: -36; } }
        @keyframes diffraction-spot-pulse { 0%, 100% { opacity: .68; } 50% { opacity: 1; } }
        .diffraction-ray-flow { animation: diffraction-ray-flow 1.1s linear infinite; }
        .diffraction-laser-flow { animation: diffraction-laser-flow .75s linear infinite; }
        .diffraction-spot-pulse { animation: diffraction-spot-pulse 1.7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .diffraction-ray-flow, .diffraction-laser-flow, .diffraction-spot-pulse { animation: none; }
        }
      `}</style>
      <defs>
        <linearGradient id="grating-laser-case" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#414b60" />
          <stop offset="100%" stopColor="#202737" />
        </linearGradient>
        <filter id="grating-laser-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="grating-spot-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={WIDTH} height={HEIGHT} rx="12" fill="#0f131d" />
      <path d="M 28 586 H 1012" stroke="#283246" strokeWidth="1" />
      <text x="34" y="34" fill="#94a3b8" fontSize="12" fontWeight="700" letterSpacing="1.5">
        OPTICAL BENCH · {params.wavelengthNm} nm · {params.gratingLinesPerMm} lines/mm
      </text>

      <line
        x1={laserWindowX}
        y1={CENTER_Y}
        x2={screenX + 12}
        y2={CENTER_Y}
        stroke="#64748b"
        strokeWidth="1"
        strokeDasharray="5 7"
        opacity="0.5"
      />
      <text x={GRATING_X + 16} y={CENTER_Y - 15} fill="#8190a8" fontSize="10">
        CENTRAL AXIS
      </text>

      <rect
        x={sourceX}
        y={CENTER_Y - 34}
        width="112"
        height="68"
        rx="10"
        fill="url(#grating-laser-case)"
        stroke="#65738a"
        strokeWidth="1.5"
      />
      <rect x={sourceX + 14} y={CENTER_Y - 22} width="50" height="44" rx="4" fill="#171e2b" stroke="#49566b" />
      <circle cx={sourceX + 39} cy={CENTER_Y} r="4" fill={state.laserColor} filter="url(#grating-laser-glow)" />
      <text x={sourceX + 56} y={CENTER_Y - 44} fill="#cbd5e1" fontSize="10" textAnchor="middle">
        LASER
      </text>
      <text x={sourceX + 56} y={CENTER_Y + 53} fill="#93a1b7" fontSize="10" textAnchor="middle">
        {params.wavelengthNm} nm
      </text>

      <line
        x1={laserWindowX}
        y1={CENTER_Y}
        x2={GRATING_X}
        y2={CENTER_Y}
        stroke={state.laserColor}
        strokeWidth="11"
        opacity="0.16"
        filter="url(#grating-laser-glow)"
      />
      <line
        x1={laserWindowX}
        y1={CENTER_Y}
        x2={GRATING_X}
        y2={CENTER_Y}
        stroke={state.laserColor}
        strokeWidth="3"
        opacity="0.95"
      />
      <line
        x1={laserWindowX}
        y1={CENTER_Y}
        x2={GRATING_X}
        y2={CENTER_Y}
        stroke="#ffffff"
        strokeWidth="1.1"
        strokeDasharray="9 16"
        className="diffraction-laser-flow"
      />

      {state.orders.filter((order) => order.reachesScreen).map((order) => {
        const offset = order.positionM * scale;
        const isSelected = order.order === state.selectedOrder;
        const opacity = isSelected ? 0.95 : 0.42;
        return (
          <g key={order.order}>
            {[-1, 1].map((side) => {
              const targetY = CENTER_Y + side * offset;
              return (
                <g key={side}>
                  <line
                    x1={GRATING_X}
                    y1={CENTER_Y}
                    x2={screenX}
                    y2={targetY}
                    stroke={state.laserColor}
                    strokeWidth={isSelected ? 2 : 1.2}
                    opacity={opacity}
                  />
                  <line
                    x1={GRATING_X}
                    y1={CENTER_Y}
                    x2={screenX}
                    y2={targetY}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 1.1 : 0.7}
                    strokeDasharray="8 18"
                    className="diffraction-ray-flow"
                    style={{ animationDelay: `${order.order * -0.13}s` }}
                    opacity={isSelected ? 0.9 : 0.58}
                  />
                </g>
              );
            })}
          </g>
        );
      })}

      {selected && selected.reachesScreen && (
        <g>
          <path
            d={angleArcPath(GRATING_X, CENTER_Y, 68, selectedAngle, false)}
            fill="none"
            stroke="#f8d477"
            strokeWidth="1.5"
          />
          <path
            d={angleArcPath(GRATING_X, CENTER_Y, 68, selectedAngle, true)}
            fill="none"
            stroke="#f8d477"
            strokeWidth="1.5"
          />
          <text
            x={GRATING_X + 78 * Math.cos(selectedAngle / 2)}
            y={CENTER_Y - 78 * Math.sin(selectedAngle / 2) - 3}
            fill="#f8d477"
            fontSize="11"
            fontWeight="700"
          >
            θ = {selected.angleDegrees.toFixed(1)}°
          </text>
          <text
            x={GRATING_X + 78 * Math.cos(selectedAngle / 2)}
            y={CENTER_Y + 78 * Math.sin(selectedAngle / 2) + 12}
            fill="#f8d477"
            fontSize="11"
            fontWeight="700"
          >
            θ = {selected.angleDegrees.toFixed(1)}°
          </text>
        </g>
      )}

      <rect x={GRATING_X - 21} y="67" width="42" height="508" rx="5" fill="#253044" stroke="#67768e" strokeWidth="1.5" />
      <rect x={GRATING_X - 11} y="79" width="22" height="484" fill="#101722" stroke="#3a475c" />
      {Array.from({ length: 11 }, (_, index) => {
        const slitX = GRATING_X - 10 + index * 2;
        return (
          <line
            key={index}
            x1={slitX}
            y1="81"
            x2={slitX}
            y2="562"
            stroke={index % 2 === 0 ? '#dce6f4' : '#68768d'}
            strokeWidth={index % 2 === 0 ? 1 : 0.75}
            opacity="0.82"
          />
        );
      })}
      <text x={GRATING_X} y="52" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="700">
        GRATING
      </text>
      <text x={GRATING_X} y="600" fill="#94a3b8" fontSize="10" textAnchor="middle">
        d = {(state.gratingSpacingM * 1e6).toFixed(2)} μm
      </text>

      <rect x={screenX - 10} y="54" width="20" height="532" rx="5" fill="#202b3c" stroke="#61718a" strokeWidth="1.5" />
      <rect x={screenX - 3} y="65" width="6" height="510" rx="3" fill="#111a28" />
      <text x={screenX} y="37" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="700">
        SCREEN
      </text>

      {state.orders.filter((order) => order.reachesScreen).map((order) => {
        const offset = order.positionM * scale;
        const isSelected = order.order === state.selectedOrder;
        const radius = isSelected ? 7 : 5;
        return (
          <g key={`spots-${order.order}`}>
            {[-1, 1].map((side) => {
              const y = CENTER_Y + side * offset;
              return (
                <g key={side}>
                  <circle cx={screenX} cy={y} r={radius + 7} fill={state.laserColor} opacity="0.16" filter="url(#grating-spot-glow)" />
                  <circle
                    cx={screenX}
                    cy={y}
                    r={radius}
                    fill={state.laserColor}
                    stroke="#fff"
                    strokeWidth="1"
                    className={isSelected ? 'diffraction-spot-pulse' : undefined}
                  />
                  <text
                    x={screenX + 19}
                    y={y + 3}
                    fill={isSelected ? '#f8d477' : '#a9b5c8'}
                    fontSize="10"
                    fontWeight={isSelected ? '700' : '500'}
                  >
                    n = {side * order.order}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      <line x1={screenX - 14} y1={CENTER_Y} x2={screenX + 14} y2={CENTER_Y} stroke="#ffffff" strokeWidth="2" />
      <circle cx={screenX} cy={CENTER_Y} r="9" fill="#ffffff" filter="url(#grating-spot-glow)" />
      <text x={screenX + 19} y={CENTER_Y + 3} fill="#ffffff" fontSize="10" fontWeight="700">
        n = 0
      </text>

      <line x1={GRATING_X} y1="625" x2={screenX} y2="625" stroke="#8190a8" strokeWidth="1" />
      <path d={`M ${GRATING_X} 625 l 8 -4 v 8 z M ${screenX} 625 l -8 -4 v 8 z`} fill="#8190a8" />
      <text x={(GRATING_X + screenX) / 2} y="644" fill="#9eacc1" fontSize="11" textAnchor="middle">
        L = {SCREEN_DISTANCE_M.toFixed(2)} m
      </text>
      <text x="36" y="662" fill="#728198" fontSize="9">
        Ray slopes use θ; screen coordinates use y = L tan(θ).
      </text>

      <rect x="764" y="86" width="244" height="104" rx="9" fill="#161f2d" stroke="#344258" />
      <text x="781" y="110" fill="#9eacc1" fontSize="10">SELECTED ORDER</text>
      <text x="781" y="138" fill="#f1f5f9" fontSize="18" fontWeight="700">
        n = {state.selectedOrder || '—'}
      </text>
      <text x="781" y="160" fill="#f8d477" fontSize="12">
        θ = {selected ? `${selected.angleDegrees.toFixed(2)}°` : '—'}
      </text>
      <text x="781" y="178" fill="#a9b5c8" fontSize="11">
        y = {selected?.reachesScreen ? `${selected.positionM.toFixed(3)} m` : '∞ (grazing)'}
      </text>

      <rect x="764" y="204" width="244" height="104" rx="9" fill="#161f2d" stroke="#344258" />
      <text x="781" y="228" fill="#9eacc1" fontSize="10">ANGLE MEASUREMENTS</text>
      <text x="781" y="254" fill="#dbe5f2" fontSize="12">
        Left |θL|: {measuredLeftAngle === null ? '—' : `${measuredLeftAngle.toFixed(2)}°`}
      </text>
      <text x="781" y="278" fill="#dbe5f2" fontSize="12">
        Right |θR|: {measuredRightAngle === null ? '—' : `${measuredRightAngle.toFixed(2)}°`}
      </text>
      <text x="781" y="296" fill="#8190a8" fontSize="9">Measured values appear after each reading.</text>

      {!state.selectedReachesScreen && state.selectedOrder > 0 && (
        <text x="764" y="332" fill="#f4b76b" fontSize="10">
          Grazing order is parallel to the screen; no finite spot forms.
        </text>
      )}

      <rect x="764" y="365" width="244" height="126" rx="9" fill="#161f2d" stroke="#344258" />
      <text x="781" y="390" fill="#9eacc1" fontSize="10">GRATING RELATION</text>
      <text x="781" y="420" fill="#e2e8f0" fontSize="17" fontFamily="serif">
        d sin θ = n λ
      </text>
      <text x="781" y="446" fill="#9eacc1" fontSize="11">
        d = 1 / (lines per metre)
      </text>
      <text x="781" y="468" fill="#9eacc1" fontSize="11">
        Allowed when |nλ/d| ≤ 1
      </text>
    </svg>
  );
}
