import type {
  NumericalApertureParams,
  PowerReadingId,
} from './simulation';
import {
  POWER_READING_IDS,
  SCREEN_CIRCLE_DIAMETERS_MM,
} from './simulation';

interface CanvasProps {
  mode: 'numerical-aperture' | 'attenuation';
  params: NumericalApertureParams;
  selectedPowerReading: PowerReadingId;
  powerMeterValue: number | null;
  powerMeterValueSource: 'manual' | 'length-model' | null;
  recordedPowerReadings: Partial<Record<PowerReadingId, number>>;
  customCableLengthM: number;
  onParamsChange: (updated: Partial<NumericalApertureParams>) => void;
}

const WIDTH = 1000;
const HEIGHT = 620;
const FIBER_END = { x: 350, y: 290 };
const DISTANCE_LINE_Y = 470;

function powerReadingFiberLength(id: PowerReadingId, customCableLengthM: number): string {
  if (id === 'P01' || id === 'P02') return '1 m';
  if (id === 'P03' || id === 'P04') return '5 m';
  if (id === 'P05') return 'combined';
  return `${customCableLengthM.toFixed(2)} m`;
}

function isWound(id: PowerReadingId) {
  return id === 'P02' || id === 'P04';
}

function FiberSource() {
  return (
    <g>
      <rect x="70" y="234" width="172" height="112" rx="14" fill="url(#fiber-source-case)" stroke="#66758c" strokeWidth="2" />
      <rect x="85" y="251" width="42" height="78" rx="7" fill="#131b27" stroke="#39485e" />
      <circle cx="106" cy="290" r="10" fill="#f04438" filter="url(#fiber-red-glow)" />
      <circle cx="106" cy="290" r="4" fill="#fff3ef" />
      <text x="146" y="269" fill="#f0f3f8" fontSize="12" fontWeight="700">FIBER LED</text>
      <text x="146" y="290" fill="#9eabc0" fontSize="10">red light source</text>
      <text x="146" y="319" fill="#75849a" fontSize="9">AC powered</text>
      <path d="M 214 346 v 34 h 20 v 14" fill="none" stroke="#586477" strokeWidth="4" />
      <path d="M 223 392 h 12" stroke="#8794a8" strokeWidth="3" />
      <text x="70" y="220" fill="#9eabc0" fontSize="10" letterSpacing="1.2">LIGHT SOURCE</text>
    </g>
  );
}

function PowerMeter({
  value,
  valueSource,
}: {
  value: number | null;
  valueSource: 'manual' | 'length-model' | null;
}) {
  return (
    <g>
      <rect x="741" y="220" width="200" height="148" rx="14" fill="url(#fiber-meter-case)" stroke="#65758d" strokeWidth="2" />
      <rect x="759" y="239" width="164" height="66" rx="7" fill="#101c1b" stroke="#496057" />
      <text x="775" y="259" fill="#738f82" fontSize="9" letterSpacing="1">POWER METER</text>
      <text x="775" y="286" fill="#a8f3c6" fontSize="24" fontFamily="monospace" fontWeight="700">
        {value === null ? '— — —' : value.toFixed(2)}
      </text>
      <text x="902" y="286" fill="#7ea58e" fontSize="9" textAnchor="end">dB</text>
      <circle cx="741" cy="333" r="6" fill="#e1a756" stroke="#1c2533" strokeWidth="2" />
      <text x="755" y="337" fill="#aab5c5" fontSize="10">INPUT</text>
      <circle cx="888" cy="333" r="5" fill="#7f8da3" />
      <text x="900" y="337" fill="#aab5c5" fontSize="10">RANGE</text>
      <text x="841" y="390" fill="#78879d" fontSize="9" textAnchor="middle">
        {valueSource === 'length-model'
          ? 'linear length estimate · calibrated from P01/P03'
          : valueSource === 'manual'
            ? 'manual or recorded power-meter value'
            : 'awaiting meter reading or calibration'}
      </text>
    </g>
  );
}

export default function ExperimentCanvas({
  mode,
  params,
  selectedPowerReading,
  powerMeterValue,
  powerMeterValueSource,
  recordedPowerReadings,
  customCableLengthM,
  onParamsChange,
}: CanvasProps) {
  const isNaMode = mode === 'numerical-aperture';
  const selectedLength = powerReadingFiberLength(selectedPowerReading, customCableLengthM);
  const wound = !isNaMode && isWound(selectedPowerReading);
  const combined = !isNaMode && selectedLength === 'combined';
  const screenDistanceMm = params.screenDistanceM * 1000;
  const pxPerMm = Math.min(5.2, (WIDTH - FIBER_END.x - 150) / (screenDistanceMm + 12.5));
  const spotRadius = params.spotDiameterM * 1000 * pxPerMm / 2;
  const screenX = FIBER_END.x + screenDistanceMm * pxPerMm;
  const screenHalfHeight = 126;
  const wSliderX = screenX + 12.5 * pxPerMm + 48;
  const lSliderWidthPercent = Math.max((screenX - FIBER_END.x) / WIDTH * 100, 10);
  const displayedPower = powerMeterValue ??
    (recordedPowerReadings[selectedPowerReading] ?? null);

  return (
    <div className="fiber-canvas-stage">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="experiment-canvas fiber-canvas"
        role="img"
        aria-label={isNaMode
          ? `Optical fiber numerical aperture apparatus. Screen distance ${(params.screenDistanceM * 100).toFixed(2)} centimetres, red spot diameter ${(params.spotDiameterM * 1000).toFixed(2)} millimetres.`
          : `Optical fiber attenuation apparatus showing ${selectedPowerReading}, ${selectedLength} fiber${wound ? ' wound four turns around a mandrel' : ''}.`}
      >
      <defs>
        <linearGradient id="fiber-source-case" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#354257" />
          <stop offset="100%" stopColor="#1c2534" />
        </linearGradient>
        <linearGradient id="fiber-meter-case" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#364153" />
          <stop offset="100%" stopColor="#1c2533" />
        </linearGradient>
        <filter id="fiber-red-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="fiber-spot-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <style>{`
        @keyframes fiber-wrap-flow { to { stroke-dashoffset: -52; } }
        .fiber-wrap-flow { animation: fiber-wrap-flow 2.4s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .fiber-wrap-flow { animation: none; } }
      `}</style>
      <rect width={WIDTH} height={HEIGHT} rx="12" fill="#0f131d" />
      <text x="36" y="40" fill="#94a3b8" fontSize="12" fontWeight="700" letterSpacing="1.6">
        {isNaMode ? 'NUMERICAL APERTURE · 1 m PATCH CORD' : `ATTENUATION · ${selectedPowerReading} · ${selectedLength.toUpperCase()} FIBER`}
      </text>

      <FiberSource />
      <path
        d={`M 242 290 C 285 290 304 290 ${FIBER_END.x} ${FIBER_END.y}`}
        fill="none"
        stroke="#a9b5c5"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d={`M 242 290 C 285 290 304 290 ${FIBER_END.x} ${FIBER_END.y}`}
        fill="none"
        stroke="#d7e3ed"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="332" y="273" width="32" height="34" rx="5" fill="#64748b" stroke="#c0cddd" />
      <circle cx={FIBER_END.x} cy={FIBER_END.y} r="7" fill="#f04438" filter="url(#fiber-red-glow)" />
      <text x="350" y="331" fill="#a9b5c5" fontSize="9" textAnchor="middle">fiber end</text>

      {isNaMode ? (
        <g>
          <path
            d={`M ${FIBER_END.x} ${FIBER_END.y} L ${screenX} ${FIBER_END.y - spotRadius} L ${screenX} ${FIBER_END.y + spotRadius} Z`}
            fill="#f04438"
            opacity="0.13"
          />
          <line x1={FIBER_END.x} y1={FIBER_END.y} x2={screenX} y2={FIBER_END.y - spotRadius} stroke="#fb6258" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.8" />
          <line x1={FIBER_END.x} y1={FIBER_END.y} x2={screenX} y2={FIBER_END.y + spotRadius} stroke="#fb6258" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.8" />
          <line x1={FIBER_END.x} y1={FIBER_END.y} x2={screenX} y2={FIBER_END.y} stroke="#e8a4a0" strokeWidth="1" strokeDasharray="3 7" opacity="0.5" />

          <rect x={screenX - 17} y={FIBER_END.y - screenHalfHeight} width="34" height={screenHalfHeight * 2} rx="5" fill="#202c3b" stroke="#77869b" strokeWidth="2" />
          <rect x={screenX - 10} y={FIBER_END.y - screenHalfHeight + 8} width="20" height={screenHalfHeight * 2 - 16} rx="3" fill="#111925" />
          {SCREEN_CIRCLE_DIAMETERS_MM.map((diameter) => {
            const radius = diameter / 2 * pxPerMm;
            const isSelected = diameter === params.targetCircleMm;
            return (
              <circle
                key={diameter}
                cx={screenX}
                cy={FIBER_END.y}
                r={radius}
                fill="none"
                stroke={isSelected ? '#f5d477' : '#68778e'}
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray={isSelected ? undefined : '3 3'}
                opacity={isSelected ? 0.95 : 0.68}
              />
            );
          })}
          <circle cx={screenX} cy={FIBER_END.y} r={spotRadius} fill="#f04438" opacity="0.78" filter="url(#fiber-spot-glow)" />
          <circle cx={screenX} cy={FIBER_END.y} r={spotRadius} fill="#f04438" opacity="0.62" />
          <circle cx={screenX} cy={FIBER_END.y} r="2" fill="#fff7f5" />
          {SCREEN_CIRCLE_DIAMETERS_MM.map((diameter) => (
            <text
              key={`label-${diameter}`}
              x={screenX + diameter / 2 * pxPerMm + 8}
              y={FIBER_END.y + 3}
              fill={diameter === params.targetCircleMm ? '#f5d477' : '#94a3b8'}
              fontSize="9"
            >
              {diameter}
            </text>
          ))}
          <text x={screenX} y={FIBER_END.y - screenHalfHeight - 14} fill="#d2dbe7" fontSize="10" textAnchor="middle" fontWeight="700">
            NA SCREEN · mm
          </text>

          <text x="70" y="438" fill="#7f8ea5" fontSize="10">Spot size and screen rings are drawn to the same scale.</text>
          <text x="70" y="457" fill="#7f8ea5" fontSize="10">Cone boundaries follow measured W and L.</text>
          <line
            x1={FIBER_END.x}
            y1={DISTANCE_LINE_Y}
            x2={screenX}
            y2={DISTANCE_LINE_Y}
            stroke="#8190a8"
            strokeWidth="1"
          />
          <path
            d={`M ${FIBER_END.x} ${DISTANCE_LINE_Y} l 7 -4 v 8 z M ${screenX} ${DISTANCE_LINE_Y} l -7 -4 v 8 z`}
            fill="#8190a8"
          />
        </g>
      ) : (
        <g>
          {combined ? (
            <>
              <path d="M 350 290 C 430 290 434 210 496 210 C 554 210 556 290 612 290" fill="none" stroke="#b6c1d0" strokeWidth="12" strokeLinecap="round" />
              <path d="M 350 290 C 430 290 434 210 496 210 C 554 210 556 290 612 290" fill="none" stroke="#dbe4ed" strokeWidth="2.5" />
              <rect x="603" y="273" width="36" height="34" rx="6" fill="#d5aa62" stroke="#ffe0a2" strokeWidth="2" />
              <path d="M 639 290 C 686 290 686 235 729 235" fill="none" stroke="#aebbc9" strokeWidth="12" strokeLinecap="round" />
              <path d="M 639 290 C 686 290 686 235 729 235" fill="none" stroke="#e0e8f0" strokeWidth="2.5" />
              <path d="M 729 235 C 750 260 751 306 741 333" fill="none" stroke="#aebbc9" strokeWidth="10" strokeLinecap="round" />
              <path d="M 729 235 C 750 260 751 306 741 333" fill="none" stroke="#e0e8f0" strokeWidth="2" />
              <text x="620" y="331" fill="#f0cc8a" fontSize="9" textAnchor="middle">INLINE ADAPTOR</text>
              <text x="465" y="185" fill="#9eabc0" fontSize="9" textAnchor="middle">fiber cable</text>
              <text x="693" y="218" fill="#9eabc0" fontSize="9" textAnchor="middle">fiber cable</text>
              <line x1="729" y1="235" x2="741" y2="235" stroke="#dbe4ed" strokeWidth="4" />
              <circle cx="729" cy="235" r="4" fill="#f04438" filter="url(#fiber-red-glow)" />
            </>
          ) : (
            <>
              {wound ? (
                <g>
                  <circle cx="506" cy="290" r="63" fill="#18202c" stroke="#77869b" strokeWidth="8" />
                  <circle cx="506" cy="290" r="48" fill="#0f131d" stroke="#4c5a70" strokeWidth="2" />
                  {Array.from({ length: 4 }, (_, index) => (
                    <ellipse
                      key={index}
                      cx="506"
                      cy="290"
                      rx={59 - index * 6}
                      ry={59 - index * 6}
                      fill="none"
                      stroke={index % 2 === 0 ? '#d9e3ed' : '#9ba9bb'}
                      strokeWidth="5"
                      strokeDasharray="15 11"
                      strokeDashoffset={index * 5}
                      className="fiber-wrap-flow"
                    />
                  ))}
                  <text x="506" y="286" fill="#cbd5e1" fontSize="10" textAnchor="middle">MANDREL</text>
                  <text x="506" y="302" fill="#98a5b8" fontSize="9" textAnchor="middle">4 turns</text>
                  <path d="M 350 290 C 408 290 423 230 457 230" fill="none" stroke="#c3cfde" strokeWidth="6" />
                  <path d="M 555 290 C 625 290 699 290 741 333" fill="none" stroke="#c3cfde" strokeWidth="6" />
                  <path d="M 555 290 C 625 290 699 290 741 333" fill="none" stroke="#e54a42" strokeWidth="1.5" />
                  <text x="506" y="378" fill="#9eabc0" fontSize="10" textAnchor="middle">FO patch cord · 4 mandrel turns</text>
                </g>
              ) : (
                <>
                  <path d="M 350 290 C 424 290 462 290 520 290 S 622 290 700 290 C 720 290 730 310 741 333" fill="none" stroke="#aebbc9" strokeWidth="14" strokeLinecap="round" />
                  <path d="M 350 290 C 424 290 462 290 520 290 S 622 290 700 290 C 720 290 730 310 741 333" fill="none" stroke="#dbe4ed" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 420 268 v 44 m 8 -44 v 44 m 8 -44 v 44" stroke="#8594a9" strokeWidth="2" />
                  <text x="465" y="332" fill="#9eabc0" fontSize="10" textAnchor="middle">{selectedLength} fiber · straight</text>
                  <line x1="700" y1="290" x2="741" y2="290" stroke="#dbe4ed" strokeWidth="5" />
                  <circle cx="728" cy="290" r="4" fill="#f04438" filter="url(#fiber-red-glow)" />
                </>
              )}
            </>
          )}

          <PowerMeter value={displayedPower} valueSource={powerMeterValueSource} />
          <text x="70" y="438" fill="#7f8ea5" fontSize="10">
            {wound ? 'Four-turn mandrel configuration follows the selected P02/P04 reading.' : 'Fiber routing follows the selected meter reading.'}
          </text>
          <text x="70" y="457" fill="#7f8ea5" fontSize="10">
            P01–P05 are entered readings; P06 is estimated until its meter value is recorded.
          </text>
          <rect x="70" y="487" width="860" height="66" rx="8" fill="#171f2d" stroke="#354256" />
          <text x="88" y="511" fill="#9eabc0" fontSize="10" letterSpacing="1">RECORDED POWER READINGS</text>
          <text x="88" y="535" fill="#e3eaf3" fontSize="12">
            {POWER_READING_IDS.map((id) =>
              `${id} ${recordedPowerReadings[id] === undefined ? '—' : `${recordedPowerReadings[id]!.toFixed(2)} dB`}`,
            ).join('   ·   ')}
          </text>
        </g>
      )}

      <text x="36" y="594" fill="#65738a" fontSize="9">
        {isNaMode
          ? 'Illustration uses measured dimensions; concentric screen-circle diameters are labelled in mm.'
          : 'Power-meter readings are entered manually.'}
      </text>
      </svg>
      {isNaMode && (
        <>
          <div
            className="fiber-apparatus-l-control"
            style={{
              left: `${FIBER_END.x / WIDTH * 100}%`,
              top: `${DISTANCE_LINE_Y / HEIGHT * 100}%`,
              width: `${lSliderWidthPercent}%`,
            }}
          >
            <input
              id="fiber-apparatus-l-slider"
              type="range"
              min="0.1"
              max="50"
              step="any"
              value={Number((params.screenDistanceM * 100).toFixed(6))}
              aria-label="Screen distance L horizontal slider"
              aria-orientation="horizontal"
              onChange={(event) =>
                onParamsChange({ screenDistanceM: Number(event.target.value) / 100 })
              }
            />
            <div className="fiber-apparatus-range-labels">
              <span className="fiber-apparatus-l-min">0.1 cm</span>
              <span className="fiber-apparatus-l-max">50 cm</span>
              <strong className="fiber-apparatus-l-value">L = {(params.screenDistanceM * 100).toFixed(2)} cm</strong>
            </div>
          </div>
          <div
            className="fiber-apparatus-w-control"
            style={{
              left: `${wSliderX / WIDTH * 100}%`,
              top: `${(FIBER_END.y - screenHalfHeight) / HEIGHT * 100}%`,
              height: `${screenHalfHeight * 2 / HEIGHT * 100}%`,
            }}
          >
            <div className="fiber-apparatus-w-track-wrap">
              <input
                type="range"
                min="1"
                max="30"
                step="any"
                value={Number((params.spotDiameterM * 1000).toFixed(6))}
                aria-label="Red spot diameter W vertical slider beside NA screen"
                aria-orientation="vertical"
                onChange={(event) =>
                  onParamsChange({ spotDiameterM: Number(event.target.value) / 1000 })
                }
              />
            </div>
            <span className="fiber-apparatus-w-max">30 mm</span>
            <span className="fiber-apparatus-w-min">1 mm</span>
            <strong className="fiber-apparatus-w-value">
              W {(params.spotDiameterM * 1000).toFixed(2)} mm
            </strong>
          </div>
        </>
      )}
    </div>
  );
}
