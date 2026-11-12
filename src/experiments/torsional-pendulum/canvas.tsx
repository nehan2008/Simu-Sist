import type { Params, State } from './simulation';

interface CanvasProps {
  params: Params;
  state: State;
  elapsedTimeS: number;
  oscillationCount: number;
}

const WIDTH = 760;
const VIEWBOX_TOP = 16;
const HEIGHT = 444;
const CENTER_X = 390;

export default function ExperimentCanvas({
  params,
  state,
  elapsedTimeS,
  oscillationCount,
}: CanvasProps) {
  const period = state.theoreticalPeriodS;
  const phase = period > 0 ? (elapsedTimeS / period) * 2 * Math.PI : 0;
  const angle = params.theta0 * Math.cos(phase);
  const wireHeight = 170 + ((params.l - 0.25) / 0.75) * 125;
  const platformY = 76 + wireHeight;
  const platformRx = 58 + ((params.R - 0.05) / 0.1) * 42;
  const platformRy = platformRx * 0.26;
  const massDistancePx = Math.max(0, Math.min(0.82, params.d / params.R)) * platformRx;
  const mass1 = {
    x: CENTER_X + massDistancePx * Math.cos(angle),
    y: platformY + massDistancePx * 0.26 * Math.sin(angle),
  };
  const mass2 = {
    x: CENTER_X - massDistancePx * Math.cos(angle),
    y: platformY - massDistancePx * 0.26 * Math.sin(angle),
  };
  const wireWidth = 2 + ((params.r - 0.00025) / 0.00075) * 4;

  return (
    <svg
      width="100%"
      viewBox={`0 ${VIEWBOX_TOP} ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="experiment-canvas"
      role="img"
      aria-label="Torsional pendulum with a fixed suspension wire, circular platform, and two movable masses"
      style={{ display: 'block' }}
    >
      <rect y={VIEWBOX_TOP} width={WIDTH} height={HEIGHT} fill="#0f1117" />

      <defs>
        <linearGradient id="torsion-platform" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#747ff0" />
          <stop offset="100%" stopColor="#3d478f" />
        </linearGradient>
        <linearGradient id="torsion-mass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="100%" stopColor="#b56b26" />
        </linearGradient>
      </defs>

      <rect x="0" y="426" width={WIDTH} height="34" fill="#171b27" />
      <line x1="0" y1="426" x2={WIDTH} y2="426" stroke="#394155" strokeWidth="2" />

      <rect x="188" y="30" width="18" height="396" rx="4" fill="#30384a" />
      <rect x="167" y="416" width="60" height="12" rx="4" fill="#49536a" />
      <rect x="197" y="34" width={CENTER_X - 197} height="18" rx="4" fill="#49536a" />
      <rect x={CENTER_X - 72} y="43" width="144" height="31" rx="5" fill="#737e96" stroke="#aab4ca" />
      <rect x={CENTER_X - 62} y="68" width="124" height="12" rx="3" fill="#414b62" />

      <line
        x1={CENTER_X}
        y1="80"
        x2={CENTER_X}
        y2={platformY}
        stroke="#c4ccd8"
        strokeWidth={wireWidth}
      />
      <circle cx={CENTER_X} cy="80" r="5" fill="#d5dce7" />
      <circle cx={CENTER_X} cy={platformY} r="5" fill="#d5dce7" />

      <line x1="282" y1="80" x2="282" y2={platformY} stroke="#8c9ab4" strokeWidth="1" />
      <path
        d={`M276 88 L282 80 L288 88 M276 ${platformY - 8} L282 ${platformY} L288 ${platformY - 8}`}
        fill="none"
        stroke="#8c9ab4"
        strokeWidth="1"
      />
      <text x="270" y={(80 + platformY) / 2} textAnchor="end" fill="#b5bfd2" fontSize="12">
        l = {params.l.toFixed(2)} m
      </text>

      <ellipse
        cx={CENTER_X}
        cy={platformY + 8}
        rx={platformRx}
        ry={platformRy}
        fill="#29315f"
        stroke="#818bf0"
        strokeWidth="2"
      />
      <ellipse
        cx={CENTER_X}
        cy={platformY}
        rx={platformRx}
        ry={platformRy}
        fill="url(#torsion-platform)"
        stroke="#9ca5ff"
        strokeWidth="2"
      />
      <line
        x1={CENTER_X}
        y1={platformY}
        x2={mass1.x}
        y2={mass1.y}
        stroke="#e4e8ff"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.8"
      />
      <circle cx={CENTER_X} cy={platformY} r="5" fill="#eef0ff" />

      {[mass1, mass2].map((position, index) => (
        <g key={index} transform={`translate(${position.x} ${position.y})`}>
          <ellipse cx="0" cy="2" rx="14" ry="6" fill="#75491f" />
          <rect x="-14" y="-13" width="28" height="15" rx="3" fill="url(#torsion-mass)" />
          <ellipse cx="0" cy="-13" rx="14" ry="6" fill="#ffe0a2" stroke="#fff0cf" />
          <text x="0" y="-10" textAnchor="middle" fill="#493018" fontSize="8" fontWeight="700">
            m
          </text>
        </g>
      ))}

      <path
        d={`M ${CENTER_X + 25} ${platformY - 5} A 26 10 0 0 1 ${CENTER_X + 26 * Math.cos(angle)} ${platformY + 10 * Math.sin(angle)}`}
        fill="none"
        stroke="#ff9d59"
        strokeWidth="2"
      />
      <text x={CENTER_X + 34} y={platformY - 15} fill="#ffb57d" fontSize="11">
        θ = {(angle * 180 / Math.PI).toFixed(1)}°
      </text>

      <text x="28" y="34" fill="#cbd3e2" fontSize="13" fontWeight="600">
        {state.materialLabel} suspension wire
      </text>
      <text x="28" y="54" fill="#95a0b7" fontSize="11">
        Diameter 2r = {(params.r * 2000).toFixed(2)} mm
      </text>
      <text x="28" y="70" fill="#95a0b7" fontSize="11">
        Radius r = {(params.r * 1000).toFixed(3)} mm
      </text>

      <text x={CENTER_X} y={platformY + platformRy + 29} textAnchor="middle" fill="#d7ddf0" fontSize="11">
        Circular platform · R = {(params.R * 100).toFixed(1)} cm
      </text>
      <text x={CENTER_X} y={platformY + platformRy + 45} textAnchor="middle" fill="#b8c2dc" fontSize="10">
        Two equal masses · m = {params.m.toFixed(2)} kg each · d = {(params.d * 100).toFixed(1)} cm
      </text>

      <rect x="525" y="26" width="205" height="90" rx="8" fill="#191e2c" stroke="#343c50" />
      <text x="542" y="49" fill="#9ea9c0" fontSize="10">Measured stopwatch</text>
      <text x="542" y="74" fill="#e8edf7" fontSize="21" fontWeight="600">
        {elapsedTimeS.toFixed(2)} s
      </text>
      <text x="542" y="98" fill="#9ea9c0" fontSize="10">
        Target: {oscillationCount} complete cycles
      </text>

      <rect x="525" y="128" width="205" height="74" rx="8" fill="#191e2c" stroke="#343c50" />
      <text x="542" y="151" fill="#9ea9c0" fontSize="10">Reference motion only</text>
      <text x="542" y="173" fill="#b8c6ff" fontSize="13">
        T ≈ {state.theoreticalPeriodS > 0 ? state.theoreticalPeriodS.toFixed(2) : '—'} s
      </text>
      <text x="542" y="190" fill="#8792a9" fontSize="9">Measurement uses your stopwatch</text>

      <text x="28" y="450" fill="#707c94" fontSize="10">
        Visual twist shown about the vertical suspension axis
      </text>
    </svg>
  );
}
