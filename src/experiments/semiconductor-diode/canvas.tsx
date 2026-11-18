import {
  MAX_SAFE_TEMPERATURE_C,
  MICROAMMETER_MAX_UA,
  ROOM_TEMPERATURE_C,
  VOLTMETER_MAX_V,
} from './simulation';
import type { Params, State } from './simulation';

interface CanvasProps {
  params: Params;
  state: State;
  isPaused: boolean;
}

interface MeterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  unit: string;
  value: number;
  max: number;
  powered: boolean;
}

function polarPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const radians = angleDegrees * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function AnalogMeter({
  x,
  y,
  width,
  height,
  label,
  unit,
  value,
  max,
  powered,
}: MeterProps) {
  const centerX = x + width / 2;
  const centerY = y + height - 31;
  const radius = Math.min(width * 0.37, height * 0.54);
  const startAngle = -140;
  const endAngle = -40;
  const fraction = Math.max(0, Math.min(1, value / max));
  const needleAngle = startAngle + (endAngle - startAngle) * fraction;
  const needleRotation = needleAngle + 90;
  const arcStart = polarPoint(centerX, centerY, radius, startAngle);
  const arcEnd = polarPoint(centerX, centerY, radius, endAngle);

  return (
    <g className={`diode-meter${powered ? ' is-powered' : ''}`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="11"
        fill="#263244"
        stroke="#66758c"
        strokeWidth="1.5"
      />
      <rect
        x={x + 8}
        y={y + 8}
        width={width - 16}
        height={height - 16}
        rx="7"
        fill="#0c121c"
        stroke="#2f3b4e"
      />
      <text x={centerX} y={y + 25} textAnchor="middle" className="diode-svg-label">
        {label}
      </text>
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke="#8b99ad"
        strokeWidth="2"
      />
      {Array.from({ length: 11 }, (_, index) => {
        const angle = startAngle + (endAngle - startAngle) * index / 10;
        const outer = polarPoint(centerX, centerY, radius, angle);
        const inner = polarPoint(centerX, centerY, radius - (index % 2 === 0 ? 11 : 6), angle);
        const number = polarPoint(centerX, centerY, radius - 22, angle);
        const showNumber = width < 160 ? index % 5 === 0 : index % 2 === 0;
        return (
          <g key={index}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={index % 2 === 0 ? '#d6dfec' : '#8492a8'}
              strokeWidth={index % 2 === 0 ? 1.4 : 0.8}
            />
            {showNumber && (
              <text
                x={number.x}
                y={number.y + 3}
                textAnchor="middle"
                className="diode-meter-scale"
                fontSize={width < 160 ? 6.5 : undefined}
              >
                {Math.round(max * index / 10)}
              </text>
            )}
          </g>
        );
      })}
      <g
        className="diode-meter-needle"
        transform={`rotate(${needleRotation} ${centerX} ${centerY})`}
      >
        <path
          d={`M ${centerX} ${centerY + 5} L ${centerX - 2} ${centerY - radius * 0.72} L ${centerX + 2} ${centerY - radius * 0.72} Z`}
          fill={powered ? '#f26e5f' : '#718096'}
        />
      </g>
      <circle cx={centerX} cy={centerY} r="5" fill="#dbe4f0" stroke="#66758c" />
      <text x={centerX} y={y + height - 8} textAnchor="middle" className="diode-meter-value">
        {powered ? value.toFixed(unit === 'µA' ? 1 : 2) : 'OFF'} {powered ? unit : ''}
      </text>
      <circle cx={x + 15} cy={centerY} r="4" fill={powered ? '#d87855' : '#596579'} />
      <circle cx={x + width - 15} cy={centerY} r="4" fill={powered ? '#7dd0b3' : '#596579'} />
    </g>
  );
}

function WideCanvas({ params, state, isPaused }: CanvasProps) {
  const width = 1120;
  const height = 690;
  const bathX = 695;
  const bathRight = 1020;
  const bathTop = 292;
  const bathBottom = 525;
  const oilSurface = 360;
  const diodeY = 450;
  const thermometerX = 955;
  const thermometerBottom = diodeY;
  const thermometerTop = 278;
  const temperatureFraction = Math.max(0, Math.min(1, state.temperatureC / 100));
  const thermometerLiquidY =
    thermometerBottom - temperatureFraction * (thermometerBottom - thermometerTop);
  const currentOn = params.powerOn && !params.heaterOn;
  const thermalIntensity = Math.max(
    0,
    Math.min(1, (state.temperatureC - ROOM_TEMPERATURE_C) / (MAX_SAFE_TEMPERATURE_C - ROOM_TEMPERATURE_C)),
  );
  const convectionDuration = 11 - thermalIntensity * 5;
  const supplyPercent = Math.min(1, params.reverseVoltageV / 15);
  const anodeX = 755;
  const cathodeX = 890;
  const safetyCutoff = state.heaterSafetyCutoff;
  const mantleActive = params.heaterOn && !safetyCutoff;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="experiment-canvas diode-canvas"
      role="img"
      aria-label={`Semiconductor diode energy-gap apparatus. Oil bath ${state.temperatureC.toFixed(1)} degrees Celsius, reverse bias ${currentOn ? state.voltmeterReadingV.toFixed(1) : 'off'} volts, reverse current ${currentOn ? state.reverseCurrentUa.toFixed(2) : 'zero'} microamperes.`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="diode-background" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#111a28" />
          <stop offset="100%" stopColor="#0d131e" />
        </linearGradient>
        <linearGradient id="diode-glass" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#b9e8f0" stopOpacity="0.08" />
          <stop offset="18%" stopColor="#e0fbff" stopOpacity="0.22" />
          <stop offset="52%" stopColor="#9cc8d0" stopOpacity="0.08" />
          <stop offset="88%" stopColor="#e5fbff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#9ac8d0" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="diode-oil" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#edc16f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#a96931" stopOpacity="0.48" />
        </linearGradient>
        <linearGradient id="diode-mantle" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a5362" />
          <stop offset="100%" stopColor="#171c25" />
        </linearGradient>
        <linearGradient id="diode-supply-case" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#536278" />
          <stop offset="52%" stopColor="#303d50" />
          <stop offset="100%" stopColor="#1c2635" />
        </linearGradient>
        <filter id="diode-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="diode-oil-clip">
          <path d={`M ${bathX + 15} ${oilSurface} L ${bathX + 15} ${bathBottom - 20} Q ${bathX + 15} ${bathBottom} ${bathX + 35} ${bathBottom} H ${bathRight - 35} Q ${bathRight - 15} ${bathBottom} ${bathRight - 15} ${bathBottom - 20} L ${bathRight - 15} ${oilSurface} Z`} />
        </clipPath>
      </defs>

      <rect width={width} height={height} rx="12" fill="url(#diode-background)" />
      <path d="M 28 651 H 1092" stroke="#283549" />
      <text x="30" y="32" className="diode-svg-title">ENERGY GAP · REVERSE-BIASED P–N JUNCTION</text>
      <text x="30" y="53" className="diode-svg-subtitle">
        Oil-bath heating arrangement · diode and thermometer bulb aligned at the same immersion depth
      </text>

      <g aria-label="Reverse-bias circuit wiring">
        <path
          className={`diode-wire diode-wire-positive${currentOn ? ' is-live' : ''}`}
          d="M 255 350 H 277 V 219 H 317 M 543 219 H 620 V 268 H 890 V 450"
        />
        <path
          className={`diode-wire diode-wire-negative${currentOn ? ' is-live' : ''}`}
          d="M 255 415 H 268 V 520 H 735 V 450"
        />
        <path
          className={`diode-wire diode-wire-voltage${currentOn ? ' is-live' : ''}`}
          d="M 317 439 H 298 V 548 H 735 V 450 M 543 439 H 890 V 450"
        />
        <text x="280" y="337" className="diode-circuit-polarity">+</text>
        <text x="280" y="419" className="diode-circuit-polarity">−</text>
      </g>

      <g aria-label="Adjustable direct-current power supply">
        <rect x="42" y="282" width="220" height="186" rx="12" fill="url(#diode-supply-case)" stroke="#8190a6" strokeWidth="1.5" />
        <rect x="54" y="294" width="196" height="161" rx="8" fill="#151d2a" stroke="#46556c" />
        <text x="68" y="318" className="diode-svg-label">DC POWER SUPPLY</text>
        <text x="68" y="336" className="diode-svg-small">0–15 V regulated output</text>
        <rect x="68" y="348" width="82" height="36" rx="4" fill="#071018" stroke="#56677d" />
        <text x="109" y="373" textAnchor="middle" className="diode-supply-digits">
          {params.powerOn ? `${params.reverseVoltageV.toFixed(1)} V` : 'OFF'}
        </text>
        <circle cx="185" cy="366" r="20" fill="#222e3e" stroke="#9eacbf" strokeWidth="2" />
        <line
          x1="185"
          y1="366"
          x2={185 + 13 * Math.cos((-135 + supplyPercent * 270) * Math.PI / 180)}
          y2={366 + 13 * Math.sin((-135 + supplyPercent * 270) * Math.PI / 180)}
          stroke="#e8bd70"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text x="184" y="399" textAnchor="middle" className="diode-svg-small">V ADJUST</text>
        <circle cx="255" cy="350" r="5" fill="#e4775d" stroke="#f8c1ad" />
        <circle cx="255" cy="415" r="5" fill="#5b7598" stroke="#b3c2d7" />
        <circle cx="70" cy="430" r="5" fill={currentOn ? '#67d2a8' : '#536075'} />
        <text x="83" y="434" className="diode-svg-small">{currentOn ? 'OUTPUT ON' : 'OUTPUT OFF'}</text>
        <text x="228" y="343" className="diode-circuit-polarity">+</text>
        <text x="228" y="424" className="diode-circuit-polarity">−</text>
      </g>

      <AnalogMeter
        x={302}
        y={72}
        width={256}
        height={178}
        label="MICROAMMETER"
        unit="µA"
        value={state.reverseCurrentUa}
        max={MICROAMMETER_MAX_UA}
        powered={currentOn}
      />
      <AnalogMeter
        x={302}
        y={292}
        width={256}
        height={178}
        label="VOLTMETER"
        unit="V"
        value={state.voltmeterReadingV}
        max={VOLTMETER_MAX_V}
        powered={currentOn}
      />
      <text x="315" y="262" className="diode-meter-port-label">A+ → N (cathode)</text>
      <text x="315" y="482" className="diode-meter-port-label">V− → P (anode) · V+ → N</text>

      <g aria-label="Retort stand and immersion clamps">
        <rect x="1052" y="138" width="12" height="510" rx="5" fill="#39475b" stroke="#9aa7b8" />
        <rect x="1022" y="634" width="72" height="14" rx="5" fill="#566275" stroke="#9aa7b8" />
        <path d="M 1058 272 H 938 M 1058 430 H 852" fill="none" stroke="#8c9aab" strokeWidth="6" strokeLinecap="round" />
        <circle cx="1058" cy="272" r="8" fill="#bdc7d4" stroke="#566275" />
        <circle cx="1058" cy="430" r="8" fill="#bdc7d4" stroke="#566275" />
        <path d="M 952 272 V 285 M 846 430 V 442" stroke="#d0d8e2" strokeWidth="2" />
        <text x="1071" y="294" className="diode-svg-small" transform="rotate(90 1071 294)">RETAINER STAND</text>
      </g>

      <g aria-label="Glass oil bath and immersed semiconductor diode">
        <path
          d={`M ${bathX} ${bathTop} L ${bathX + 10} ${bathBottom - 16} Q ${bathX + 12} ${bathBottom} ${bathX + 34} ${bathBottom} H ${bathRight - 34} Q ${bathRight - 12} ${bathBottom} ${bathRight - 10} ${bathBottom - 16} L ${bathRight} ${bathTop}`}
          fill="url(#diode-glass)"
          stroke="#c4e6ed"
          strokeOpacity="0.75"
          strokeWidth="3"
        />
        <path
          d={`M ${bathX + 12} ${oilSurface} H ${bathRight - 12} V ${bathBottom - 19} Q ${bathRight - 14} ${bathBottom - 3} ${bathRight - 34} ${bathBottom - 3} H ${bathX + 34} Q ${bathX + 14} ${bathBottom - 3} ${bathX + 12} ${bathBottom - 19} Z`}
          fill="url(#diode-oil)"
          opacity={0.42 + thermalIntensity * 0.42}
        />
        <ellipse cx={(bathX + bathRight) / 2} cy={oilSurface} rx={(bathRight - bathX - 26) / 2} ry="11" fill="#f3d28b" fillOpacity="0.15" stroke="#f4d18c" strokeOpacity="0.62" />
        <ellipse cx={(bathX + bathRight) / 2} cy={bathTop} rx={(bathRight - bathX) / 2} ry="15" fill="#182534" fillOpacity="0.7" stroke="#c7eaf0" strokeOpacity="0.65" strokeWidth="2" />
        <path d={`M ${bathX + 15} ${bathTop + 1} L ${bathX + 25} ${bathBottom - 14} M ${bathRight - 15} ${bathTop + 1} L ${bathRight - 25} ${bathBottom - 14}`} fill="none" stroke="#f1ffff" strokeOpacity="0.44" strokeWidth="4" />
        <text x={bathX + 28} y={bathTop - 25} className="diode-svg-label">GLASS OIL BATH</text>
        <text x={bathX + 29} y={oilSurface - 16} className="diode-svg-small">OIL LEVEL</text>

        <g
          clipPath="url(#diode-oil-clip)"
          className={`diode-convection${thermalIntensity > 0 ? ' is-active' : ''}`}
          style={{
            opacity: thermalIntensity * 0.62,
            animationDuration: `${convectionDuration}s`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          <path d="M 735 485 C 700 451 700 393 738 377 C 778 360 795 393 776 420 C 755 448 766 482 801 492 C 836 502 867 483 862 451 C 858 424 830 408 837 382 C 847 350 893 354 908 382 C 927 419 900 458 920 487" />
          <path d="M 751 476 C 730 441 741 405 772 392 C 808 378 825 409 807 431 C 791 451 808 476 837 478 C 866 479 879 455 869 435" />
        </g>

        <g aria-label="Immersed p-n junction diode" className="diode-immersed-device">
          <path d={`M ${anodeX - 20} ${diodeY} H ${anodeX}`} stroke="#c3cbd6" strokeWidth="4" />
          <rect x={anodeX} y={diodeY - 12} width="74" height="24" rx="11" fill="#26313d" stroke="#bac5d2" strokeWidth="1.5" />
          <rect x={anodeX + 16} y={diodeY - 10} width="35" height="20" rx="9" fill="#47525f" />
          <line x1={anodeX + 56} y1={diodeY - 12} x2={anodeX + 56} y2={diodeY + 12} stroke="#f2d89e" strokeWidth="3" />
          <path d={`M ${anodeX + 74} ${diodeY} H ${cathodeX}`} stroke="#c3cbd6" strokeWidth="4" />
          <circle cx={anodeX - 20} cy={diodeY} r="4" fill="#6c85a7" />
          <circle cx={cathodeX} cy={diodeY} r="4" fill="#d9896f" />
          <text x={anodeX + 5} y={diodeY + 31} className="diode-svg-small">P · ANODE (−)</text>
          <text x={cathodeX - 38} y={diodeY + 31} className="diode-svg-small">N · CATHODE (+)</text>
        </g>

        <g aria-label="Glass thermometer, bulb at diode height">
          <rect x={thermometerX - 7} y={thermometerTop} width="14" height={thermometerBottom - thermometerTop} rx="7" fill="#d8f6f7" fillOpacity="0.14" stroke="#d0f0f3" strokeWidth="2" />
          <rect
            x={thermometerX - 2}
            y={thermometerLiquidY}
            width="4"
            height={thermometerBottom - thermometerLiquidY}
            rx="2"
            fill="#f26f62"
            className="diode-thermometer-column"
          />
          <circle cx={thermometerX} cy={thermometerBottom} r="11" fill="#e66f62" stroke="#ffc2a3" strokeWidth="2" />
          {[0, 20, 40, 60, 80, 100].map((temperature) => {
            const y = thermometerBottom - temperature / 100 * (thermometerBottom - thermometerTop);
            return (
              <g key={temperature}>
                <line x1={thermometerX + 9} y1={y} x2={thermometerX + 17} y2={y} stroke="#d6e5ec" strokeWidth="1" />
                <text x={thermometerX + 22} y={y + 3} className="diode-thermometer-mark">{temperature}</text>
              </g>
            );
          })}
          <text x={thermometerX} y={thermometerTop - 18} textAnchor="middle" className="diode-svg-small">0–100°C</text>
          <text x={thermometerX + 25} y={thermometerBottom + 28} className="diode-svg-small">bulb</text>
        </g>

        <g
          className={`diode-stirring-rod${params.stirringOn ? ' is-stirring' : ''}`}
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          aria-label="Oil stirring rod"
        >
          <line x1="718" y1="270" x2="740" y2="438" stroke="#e2edf0" strokeOpacity="0.8" strokeWidth="4" />
          <line x1="714" y1="270" x2="722" y2="269" stroke="#ffffff" strokeWidth="2" />
          <rect x="727" y="427" width="25" height="7" rx="3" transform="rotate(-8 739 430)" fill="#d7e3e8" fillOpacity="0.7" />
          <text x="710" y="252" className="diode-svg-small">STIRRING ROD</text>
        </g>

        <line x1="717" y1={diodeY} x2="975" y2={diodeY} stroke="#f4d38d" strokeOpacity="0.5" strokeDasharray="4 5" />
        <path d={`M 980 ${diodeY} l 8 -6 v 12 z`} fill="#f4d38d" />
        <text x="855" y={diodeY + 56} textAnchor="middle" className="diode-equal-height-label">
          Diode junction and thermometer bulb at same height
        </text>
      </g>

      <g aria-label="Heating mantle">
        <path d="M 680 530 Q 680 510 700 510 H 1015 Q 1035 510 1035 530 L 1010 610 Q 1004 628 982 628 H 733 Q 711 628 705 610 Z" fill="url(#diode-mantle)" stroke="#8794a7" strokeWidth="2" />
        <path d="M 713 529 Q 724 511 740 529 T 767 529 T 794 529 T 821 529 T 848 529 T 875 529 T 902 529 T 929 529 T 956 529 T 983 529 T 1010 529" fill="none" stroke={mantleActive ? '#ff8b42' : '#786653'} strokeWidth={mantleActive ? 7 : 4} opacity={mantleActive ? 0.95 : 0.5} filter={mantleActive ? 'url(#diode-soft-glow)' : undefined} className="diode-heating-element" />
        <path d="M 713 529 Q 724 511 740 529 T 767 529 T 794 529 T 821 529 T 848 529 T 875 529 T 902 529 T 929 529 T 956 529 T 983 529 T 1010 529" fill="none" stroke={mantleActive ? '#ffd178' : '#aa9273'} strokeWidth="2" opacity="0.95" />
        <text x="858" y="584" textAnchor="middle" className="diode-svg-label">HEATING MANTLE</text>
        <text x="858" y="605" textAnchor="middle" className="diode-svg-small">
          {mantleActive ? 'HEATING · POWER CIRCUIT OFF' : 'OFF · OIL COOLS GRADUALLY'}
        </text>
        <rect x="742" y="629" width="28" height="12" rx="3" fill="#515d70" />
        <rect x="944" y="629" width="28" height="12" rx="3" fill="#515d70" />
      </g>

      <g aria-label="Live thermal and electrical readings">
        <rect x="578" y="72" width="222" height="128" rx="10" fill="#151f2c" stroke="#45566e" />
        <text x="594" y="96" className="diode-svg-small">LIVE READINGS</text>
        <text x="594" y="125" className="diode-live-value">{state.temperatureC.toFixed(1)}°C</text>
        <text x="594" y="145" className="diode-svg-small">
          {state.thermalPhase === 'heating'
            ? `Bath warming · +${Math.max(0, state.temperatureRateCPerS * 60).toFixed(1)}°C/min`
            : state.thermalPhase === 'cooling'
              ? `Bath cooling · ${Math.min(0, state.temperatureRateCPerS * 60).toFixed(1)}°C/min`
              : 'At room temperature'}
        </text>
        <text x="594" y="173" className="diode-svg-small">
          {currentOn
            ? `VR ${state.voltmeterReadingV.toFixed(2)} V · IR ${state.reverseCurrentUa.toFixed(2)} µA`
            : 'Reverse-bias circuit de-energized'}
        </text>
      </g>

      <g aria-label="Safety limit">
        <rect x="830" y="82" width="190" height="54" rx="8" fill={state.temperatureC >= 75 ? '#3d2c26' : '#182433'} stroke={state.temperatureC >= 75 ? '#d58659' : '#40516a'} />
        <text x="845" y="104" className="diode-svg-small">MAXIMUM DIODE TEMPERATURE</text>
        <text x="845" y="125" className="diode-safety-reading">
          {state.temperatureC.toFixed(1)} / 80°C
        </text>
      </g>

      <text x="28" y="672" className="diode-svg-footer">
        Voltage meter is connected in parallel; the 0–100 µA meter is in series. Reverse bias: cathode N (+), anode P (−).
      </text>
    </svg>
  );
}

function CompactCanvas({ params, state, isPaused }: CanvasProps) {
  const temperatureFraction = Math.max(0, Math.min(1, state.temperatureC / 100));
  const thermometerBottom = 444;
  const thermometerTop = 329;
  const liquidY = thermometerBottom - temperatureFraction * (thermometerBottom - thermometerTop);
  const currentOn = params.powerOn && !params.heaterOn;
  const thermalIntensity = Math.max(
    0,
    Math.min(1, (state.temperatureC - ROOM_TEMPERATURE_C) / (MAX_SAFE_TEMPERATURE_C - ROOM_TEMPERATURE_C)),
  );
  const convectionDuration = 11 - thermalIntensity * 5;
  const mantleActive = params.heaterOn && !state.heaterSafetyCutoff;

  return (
    <svg
      viewBox="0 0 390 720"
      preserveAspectRatio="xMidYMid meet"
      className="experiment-canvas diode-canvas diode-canvas-compact"
      role="img"
      aria-label={`Compact semiconductor diode setup. Oil temperature ${state.temperatureC.toFixed(1)} degrees Celsius, reverse-bias supply ${currentOn ? 'on' : 'off'}.`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="diode-compact-glass" x1="0" x2="1">
          <stop offset="0%" stopColor="#d9f9ff" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#b4e1e9" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#e2fbff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="diode-compact-oil" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#efc673" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a56531" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="diode-compact-case" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#536278" />
          <stop offset="100%" stopColor="#1c2635" />
        </linearGradient>
        <clipPath id="diode-compact-oil-clip">
          <path d="M 78 382 H 312 V 510 Q 312 525 294 525 H 96 Q 78 525 78 510 Z" />
        </clipPath>
        <filter id="diode-compact-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="390" height="720" rx="10" fill="#0f141f" />
      <text x="14" y="24" className="diode-mobile-title">REVERSE-BIASED DIODE · ENERGY GAP</text>
      <text x="14" y="42" className="diode-mobile-subtitle">Oil bath · 0–15 V supply · 0–100 µA</text>

      <g aria-label="Mobile reverse-bias connections">
        <path className={`diode-wire diode-wire-positive${currentOn ? ' is-live' : ''}`} d="M 126 116 H 135 V 153 H 152 M 232 153 H 250 V 258 H 234 V 450" />
        <path className={`diode-wire diode-wire-negative${currentOn ? ' is-live' : ''}`} d="M 126 136 H 92 V 540 H 125 V 450" />
        <path className={`diode-wire diode-wire-voltage${currentOn ? ' is-live' : ''}`} d="M 277 153 H 255 V 270 H 125 V 450 M 362 153 H 355 V 270 H 234 V 450" />
      </g>

      <g aria-label="Compact DC power supply">
        <rect x="10" y="62" width="116" height="100" rx="8" fill="url(#diode-compact-case)" stroke="#8290a6" />
        <rect x="17" y="70" width="102" height="82" rx="5" fill="#151e2b" stroke="#46556c" />
        <text x="68" y="87" textAnchor="middle" className="diode-mobile-label">DC SUPPLY</text>
        <rect x="26" y="96" width="48" height="25" rx="3" fill="#061018" stroke="#65758b" />
        <text x="50" y="113" textAnchor="middle" className="diode-mobile-reading">
          {params.powerOn ? `${params.reverseVoltageV.toFixed(1)}V` : 'OFF'}
        </text>
        <circle cx="94" cy="108" r="10" fill="#263548" stroke="#a8b4c6" />
        <line x1="94" y1="108" x2={94 + 7 * Math.cos((-135 + params.reverseVoltageV / 15 * 270) * Math.PI / 180)} y2={108 + 7 * Math.sin((-135 + params.reverseVoltageV / 15 * 270) * Math.PI / 180)} stroke="#edc374" strokeWidth="2" />
        <text x="92" y="137" textAnchor="middle" className="diode-mobile-small">0–15 V</text>
        <circle cx="126" cy="116" r="3.5" fill="#e4775d" />
        <circle cx="126" cy="136" r="3.5" fill="#6e89a8" />
      </g>

      <AnalogMeter
        x={137}
        y={54}
        width={110}
        height={130}
        label="µAMMETER"
        unit="µA"
        value={state.reverseCurrentUa}
        max={MICROAMMETER_MAX_UA}
        powered={currentOn}
      />
      <AnalogMeter
        x={262}
        y={54}
        width={115}
        height={130}
        label="VOLTMETER"
        unit="V"
        value={state.voltmeterReadingV}
        max={VOLTMETER_MAX_V}
        powered={currentOn}
      />
      <text x="18" y="191" className="diode-mobile-small">A in series · V across diode</text>
      <text x="18" y="207" className="diode-mobile-small">N cathode (+) · P anode (−)</text>

      <g aria-label="Glass oil bath with diode and thermometer at equal depth">
        <path d="M 78 314 L 88 510 Q 89 528 106 528 H 284 Q 301 528 302 510 L 312 314" fill="url(#diode-compact-glass)" stroke="#c8e8ed" strokeOpacity="0.78" strokeWidth="2.5" />
        <path d="M 82 382 H 308 V 510 Q 308 523 291 523 H 99 Q 82 523 82 510 Z" fill="url(#diode-compact-oil)" opacity={0.42 + thermalIntensity * 0.42} />
        <ellipse cx="195" cy="382" rx="113" ry="8" fill="#f2d28c" fillOpacity="0.13" stroke="#eecd87" strokeOpacity="0.6" />
        <ellipse cx="195" cy="314" rx="117" ry="11" fill="#162435" fillOpacity="0.8" stroke="#c6e7ed" strokeOpacity="0.65" />
        <g
          clipPath="url(#diode-compact-oil-clip)"
          className={`diode-convection${thermalIntensity > 0 ? ' is-active' : ''}`}
          style={{
            opacity: thermalIntensity * 0.62,
            animationDuration: `${convectionDuration}s`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          <path d="M 96 493 C 82 455 103 415 131 419 C 160 423 146 455 165 473 C 186 492 215 483 214 456 C 214 427 188 416 200 393 C 217 362 250 379 254 405 C 259 435 232 451 250 480 C 264 500 282 497 297 466" />
          <path d="M 104 489 C 114 455 140 444 158 459 C 177 475 194 476 208 461 C 226 442 243 434 263 447 C 279 458 286 482 294 490" />
        </g>
        <g
          className={`diode-stirring-rod${params.stirringOn ? ' is-stirring' : ''}`}
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          aria-label="Oil stirring rod"
        >
          <line x1="89" y1="290" x2="111" y2="443" stroke="#e2edf0" strokeOpacity="0.8" strokeWidth="3" />
          <rect x="100" y="435" width="21" height="5" rx="2" transform="rotate(-8 110 438)" fill="#d7e3e8" fillOpacity="0.7" />
        </g>
        <g aria-label="Immersed p-n diode">
          <path d="M 125 450 H 145" stroke="#c3cbd6" strokeWidth="3.5" />
          <rect x="145" y="440" width="70" height="20" rx="9" fill="#303a47" stroke="#c3ceda" />
          <line x1="197" y1="441" x2="197" y2="459" stroke="#f3d9a1" strokeWidth="2.5" />
          <path d="M 215 450 H 235" stroke="#c3cbd6" strokeWidth="3.5" />
          <text x="150" y="477" className="diode-mobile-small">P−</text>
          <text x="212" y="477" className="diode-mobile-small">N+</text>
        </g>
        <g aria-label="Thermometer with bulb level with diode junction">
          <rect x="266" y={thermometerTop} width="12" height={thermometerBottom - thermometerTop} rx="6" fill="#dbf6f8" fillOpacity="0.14" stroke="#d0f0f3" strokeWidth="1.7" />
          <rect x="270" y={liquidY} width="4" height={thermometerBottom - liquidY} rx="2" fill="#f26f62" />
          <circle cx="272" cy={thermometerBottom + 6} r="9" fill="#e66f62" stroke="#ffc2a3" strokeWidth="1.5" />
          {[0, 20, 40, 60, 80, 100].map((temperature) => {
            const y = thermometerBottom - temperature / 100 * (thermometerBottom - thermometerTop);
            return (
              <g key={temperature}>
                <line x1="280" y1={y} x2="286" y2={y} stroke="#d6e5ec" />
                <text x="289" y={y + 2.5} className="diode-mobile-scale">{temperature}</text>
              </g>
            );
          })}
        </g>
        <path d="M 131 450 H 290" stroke="#f1d18e" strokeOpacity="0.7" strokeDasharray="3 4" />
        <text x="190" y="507" textAnchor="middle" className="diode-mobile-small">DIODE + THERMOMETER BULB LEVEL</text>
      </g>

      <g aria-label="Heating mantle">
        <path d="M 70 532 Q 70 519 84 519 H 306 Q 320 519 320 532 L 301 602 Q 298 614 282 614 H 108 Q 92 614 89 602 Z" fill="url(#diode-compact-case)" stroke="#8794a7" strokeWidth="1.7" />
        <path d="M 92 540 Q 102 527 112 540 T 132 540 T 152 540 T 172 540 T 192 540 T 212 540 T 232 540 T 252 540 T 272 540 T 292 540" fill="none" stroke={mantleActive ? '#ff8b42' : '#786653'} strokeWidth={mantleActive ? 6 : 3.5} filter={mantleActive ? 'url(#diode-compact-glow)' : undefined} className="diode-heating-element" />
        <path d="M 92 540 Q 102 527 112 540 T 132 540 T 152 540 T 172 540 T 192 540 T 212 540 T 232 540 T 252 540 T 272 540 T 292 540" fill="none" stroke={mantleActive ? '#ffd178' : '#aa9273'} strokeWidth="1.5" />
        <text x="195" y="575" textAnchor="middle" className="diode-mobile-label">HEATING MANTLE</text>
        <text x="195" y="595" textAnchor="middle" className="diode-mobile-small">
          {mantleActive ? 'HEATING · SUPPLY OFF' : 'OFF · COOLING'}
        </text>
      </g>

      <g aria-label="Compact live readings">
        <rect x="18" y="628" width="354" height="70" rx="9" fill="#151f2c" stroke="#45566e" />
        <text x="32" y="649" className="diode-mobile-small">OIL BATH</text>
        <text x="32" y="678" className="diode-mobile-reading">{state.temperatureC.toFixed(1)}°C</text>
        <text x="192" y="649" className="diode-mobile-small">REVERSE BIAS</text>
        <text x="192" y="678" className="diode-mobile-reading">
          {currentOn ? `${state.voltmeterReadingV.toFixed(1)} V · ${state.reverseCurrentUa.toFixed(1)} µA` : 'OFF'}
        </text>
      </g>
    </svg>
  );
}

export default function ExperimentCanvas(props: CanvasProps) {
  return (
    <>
      <div className="diode-canvas-desktop">
        <WideCanvas {...props} />
      </div>
      <div className="diode-canvas-mobile">
        <CompactCanvas {...props} />
      </div>
    </>
  );
}
