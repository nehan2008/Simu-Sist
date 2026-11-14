import { useEffect, useState } from 'react';
import {
  degreesToRadians,
  GLASS_MODEL_REFRACTIVE_INDEX,
  getPrismVertices,
  radiansToDegrees,
} from './simulation';
import type { Params, Point, State } from './simulation';

interface CanvasProps {
  params: Params;
  state: State;
}

const WIDTH = 1080;
const HEIGHT = 660;
const CENTER = { x: 520, y: 340 };
const PRISM_SCALE = 92;
const SCALE_RADIUS = 202;
const TELESCOPE_INNER_RADIUS = 140;
const TELESCOPE_OUTER_RADIUS = 270;

function toCanvasPoint(point: Point): Point {
  return {
    x: CENTER.x + point.x * PRISM_SCALE,
    y: CENTER.y - point.y * PRISM_SCALE,
  };
}

function polarPoint(radius: number, angleRad: number): Point {
  return {
    x: CENTER.x + radius * Math.cos(angleRad),
    y: CENTER.y - radius * Math.sin(angleRad),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function WideCanvas({ params, state }: CanvasProps) {
  const vertices = getPrismVertices(params.prismRotationRad).map(toCanvasPoint);
  const prismPoints = vertices.map(({ x, y }) => `${x},${y}`).join(' ');
  const ray = state.ray;
  const entryPoint = ray.entryPoint ? toCanvasPoint(ray.entryPoint) : null;
  const exitPoint = ray.exitPoint ? toCanvasPoint(ray.exitPoint) : null;
  const internalDirection = ray.internalDirection;
  const outgoingDirection = ray.outgoingDirection;
  const rayEnd = exitPoint && params.prismInserted && ray.valid
    ? {
      x: exitPoint.x + outgoingDirection.x * 310,
      y: exitPoint.y - outgoingDirection.y * 310,
    }
    : { x: 825, y: CENTER.y };
  const telescopeDirection = {
    x: Math.cos(params.telescopeRotationRad),
    y: Math.sin(params.telescopeRotationRad),
  };
  const telescopeStart = {
    x: CENTER.x + telescopeDirection.x * TELESCOPE_INNER_RADIUS,
    y: CENTER.y - telescopeDirection.y * TELESCOPE_INNER_RADIUS,
  };
  const telescopeEnd = {
    x: CENTER.x + telescopeDirection.x * TELESCOPE_OUTER_RADIUS,
    y: CENTER.y - telescopeDirection.y * TELESCOPE_OUTER_RADIUS,
  };
  const objective = {
    x: CENTER.x + telescopeDirection.x * TELESCOPE_INNER_RADIUS,
    y: CENTER.y - telescopeDirection.y * TELESCOPE_INNER_RADIUS,
  };
  const eyepiece = {
    x: CENTER.x + telescopeDirection.x * (TELESCOPE_OUTER_RADIUS - 12),
    y: CENTER.y - telescopeDirection.y * (TELESCOPE_OUTER_RADIUS - 12),
  };
  const slitImageOffset = clamp(170 * Math.tan(state.imageOffsetRad), -36, 36);
  const slitOpeningPx = clamp(params.slitWidthM * 1000 * 3, 1.2, 8);
  const prismRotationDegrees = radiansToDegrees(params.prismRotationRad);
  const outgoingAngleDegrees = radiansToDegrees(state.outgoingAngleRad);
  const directBeam = !params.prismInserted;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="experiment-canvas prism-canvas"
      role="img"
      aria-label={`Spectrometer with a ${params.prismInserted ? 'rotating glass prism' : 'direct ray'}. Prism rotation ${prismRotationDegrees.toFixed(1)} degrees; refracted ray direction ${outgoingAngleDegrees.toFixed(2)} degrees.`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="prism-metal" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#58677b" />
          <stop offset="45%" stopColor="#273449" />
          <stop offset="100%" stopColor="#172131" />
        </linearGradient>
        <linearGradient id="prism-glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.36" />
          <stop offset="48%" stopColor="#6ee7d8" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="prism-lamp-glow" x1="0" x2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
        </linearGradient>
        <filter id="prism-ray-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="prism-lamp-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker
          id="prism-ray-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L7,3 z" fill="#ffd677" />
        </marker>
      </defs>

      <rect width={WIDTH} height={HEIGHT} rx="12" fill="#0f131d" />
      <path d="M 28 606 H 1052" stroke="#273247" strokeWidth="1" />
      <text x="34" y="34" fill="#94a3b8" fontSize="12" fontWeight="700" letterSpacing="1.5">
        SPECTROMETER · SOLID GLASS PRISM · A = 60°
      </text>
      <text x="34" y="56" fill="#74839b" fontSize="10">
        Snell-law ray trace · model glass μ ≈ {GLASS_MODEL_REFRACTIVE_INDEX.toFixed(2)}
      </text>

      <g aria-label="Circular graduated spectrometer scale">
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={SCALE_RADIUS}
          fill="#121a27"
          fillOpacity="0.42"
          stroke="#46556c"
          strokeWidth="1.2"
        />
        {Array.from({ length: 72 }, (_, index) => {
          const angle = index * Math.PI / 36;
          const major = index % 6 === 0;
          const inner = polarPoint(SCALE_RADIUS - (major ? 15 : 8), angle);
          const outer = polarPoint(SCALE_RADIUS, angle);
          const label = polarPoint(SCALE_RADIUS + 19, angle);
          return (
            <g key={index}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={major ? '#a4b2c7' : '#59677b'}
                strokeWidth={major ? 1.3 : 0.75}
              />
              {major && (
                <text
                  x={label.x}
                  y={label.y + 3}
                  textAnchor="middle"
                  fill="#a9b5c8"
                  fontSize="9"
                >
                  {index * 5}°
                </text>
              )}
            </g>
          );
        })}
        <text x={CENTER.x - 206} y={CENTER.y + 218} fill="#b9c6d9" fontSize="10" fontWeight="700">
          GRADUATED CIRCLE
        </text>
        {[0, Math.PI].map((angle, index) => {
          const pointer = polarPoint(SCALE_RADIUS - 23, params.telescopeRotationRad + angle);
          const label = polarPoint(SCALE_RADIUS - 37, params.telescopeRotationRad + angle);
          return (
            <g key={index}>
              <circle cx={pointer.x} cy={pointer.y} r="5" fill={index === 0 ? '#83e1d3' : '#f7be69'} />
              <text
                x={label.x}
                y={label.y + 3}
                textAnchor="middle"
                fill={index === 0 ? '#83e1d3' : '#f7be69'}
                fontSize="10"
                fontWeight="700"
              >
                {index === 0 ? 'A' : 'B'}
              </text>
            </g>
          );
        })}
      </g>

      <g aria-label="Sodium vapour lamp and collimator">
        <rect x="44" y="290" width="70" height="48" rx="8" fill="url(#prism-metal)" stroke="#66758c" />
        <rect x="57" y="299" width="44" height="30" rx="12" fill="#2a2630" stroke="#aa8050" />
        <path d="M 65 314 H 93" stroke="url(#prism-lamp-glow)" strokeWidth="7" filter="url(#prism-lamp-glow)" />
        <path d="M 66 314 H 92" stroke="#ffdf91" strokeWidth="2" />
        <text x="79" y="278" textAnchor="middle" fill="#e1c98e" fontSize="10" fontWeight="700">
          SODIUM VAPOUR
        </text>
        <text x="79" y="352" textAnchor="middle" fill="#8f9db2" fontSize="9">lamp</text>

        <path d="M 115 314 H 162" stroke="#f6c76f" strokeWidth="2" opacity="0.7" />
        <rect x="162" y="270" width="134" height="88" rx="14" fill="url(#prism-metal)" stroke="#738198" strokeWidth="1.5" />
        <rect x="177" y="281" width="91" height="66" rx="8" fill="#111a28" stroke="#3b4a60" />
        <rect
          x="191"
          y={314 - slitOpeningPx / 2}
          width="5"
          height={slitOpeningPx}
          rx="1"
          fill="#fff1b8"
          filter="url(#prism-ray-glow)"
        />
        <rect
          x="191"
          y={314 - slitOpeningPx / 2}
          width="5"
          height={slitOpeningPx}
          rx="1"
          fill="#fff1b8"
        />
        <ellipse cx="288" cy="314" rx="7" ry="33" fill="#91d9e3" fillOpacity="0.18" stroke="#77aab8" strokeWidth="2" />
        <text x="228" y="260" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="700">
          COLLIMATOR
        </text>
        <text x="228" y="374" textAnchor="middle" fill="#8f9db2" fontSize="9">
          adjustable illuminated slit
        </text>
      </g>

      <g aria-label="Rotating prism table">
        <circle cx={CENTER.x} cy={CENTER.y} r="119" fill="url(#prism-metal)" stroke="#8290a4" strokeWidth="1.3" />
        <circle cx={CENTER.x} cy={CENTER.y} r="105" fill="#182233" stroke="#47576d" strokeWidth="1" />
        <circle cx={CENTER.x} cy={CENTER.y} r="12" fill="#101722" stroke="#a2afc1" strokeWidth="2" />
        <circle cx={CENTER.x} cy={CENTER.y} r="4" fill="#c5d0df" />
        <line
          x1={CENTER.x}
          y1={CENTER.y}
          x2={CENTER.x + Math.cos(params.prismRotationRad) * 110}
          y2={CENTER.y - Math.sin(params.prismRotationRad) * 110}
          stroke="#e8b764"
          strokeWidth="2"
        />
        <text x={CENTER.x - 87} y={CENTER.y + 88} fill="#d2a65f" fontSize="9" fontWeight="700">
          ROTATING TABLE
        </text>
        <polygon
          points={prismPoints}
          fill={params.prismInserted ? 'url(#prism-glass)' : '#52637a'}
          fillOpacity={params.prismInserted ? 1 : 0.18}
          stroke={params.prismInserted ? '#9de3e8' : '#63728a'}
          strokeWidth="2.4"
          strokeDasharray={params.prismInserted ? undefined : '5 5'}
        />
        <line
          x1={vertices[0]?.x}
          y1={vertices[0]?.y}
          x2={vertices[1]?.x}
          y2={vertices[1]?.y}
          stroke="#cffafe"
          strokeOpacity={params.prismInserted ? 0.65 : 0.18}
          strokeWidth="1"
        />
        {params.prismInserted ? (
          <text x={CENTER.x} y={CENTER.y + 7} textAnchor="middle" fill="#ecfeff" fontSize="10" fontWeight="700">
            GLASS PRISM
          </text>
        ) : (
          <text x={CENTER.x} y={CENTER.y + 6} textAnchor="middle" fill="#8796ac" fontSize="9">
            PRISM OUT
          </text>
        )}
      </g>

      <g aria-label="Incident and refracted light rays">
        {directBeam ? (
          <>
            <line x1="296" y1={CENTER.y} x2="805" y2={CENTER.y} stroke="#ffd779" strokeWidth="12" opacity="0.12" filter="url(#prism-ray-glow)" />
            <line x1="296" y1={CENTER.y} x2="805" y2={CENTER.y} stroke="#ffe59e" strokeWidth="2.6" markerEnd="url(#prism-ray-arrow)" />
            <text x="395" y={CENTER.y - 14} fill="#e9ce8f" fontSize="9">DIRECT RAY · PRISM BYPASSED</text>
          </>
        ) : ray.valid && entryPoint && exitPoint && internalDirection ? (
          <>
            <line x1="296" y1={CENTER.y} x2={entryPoint.x} y2={entryPoint.y} stroke="#ffd779" strokeWidth="12" opacity="0.1" filter="url(#prism-ray-glow)" />
            <line x1="296" y1={CENTER.y} x2={entryPoint.x} y2={entryPoint.y} stroke="#ffe59e" strokeWidth="2.5" />
            <line
              x1={entryPoint.x}
              y1={entryPoint.y}
              x2={exitPoint.x}
              y2={exitPoint.y}
              stroke="#fff4cc"
              strokeWidth="2.8"
            />
            <line
              x1={exitPoint.x}
              y1={exitPoint.y}
              x2={rayEnd.x}
              y2={rayEnd.y}
              stroke="#ffd779"
              strokeWidth="12"
              opacity="0.1"
              filter="url(#prism-ray-glow)"
            />
            <line
              x1={exitPoint.x}
              y1={exitPoint.y}
              x2={rayEnd.x}
              y2={rayEnd.y}
              stroke="#ffe59e"
              strokeWidth="2.5"
              markerEnd="url(#prism-ray-arrow)"
            />
            <circle cx={entryPoint.x} cy={entryPoint.y} r="4" fill="#fff3c4" />
            <circle cx={exitPoint.x} cy={exitPoint.y} r="4" fill="#fff3c4" />
            <text x="395" y={CENTER.y - 14} fill="#e9ce8f" fontSize="9">
              REFRACTED · D = {radiansToDegrees(state.deviationRad).toFixed(2)}°
            </text>
          </>
        ) : (
          <text x="350" y={CENTER.y - 18} fill="#f3a5a5" fontSize="10">
            No transmitted ray at this setting
          </text>
        )}
      </g>

      <g aria-label="Rotatable telescope">
        <line
          x1={telescopeStart.x}
          y1={telescopeStart.y}
          x2={telescopeEnd.x}
          y2={telescopeEnd.y}
          stroke="#080d15"
          strokeWidth="36"
          strokeLinecap="round"
        />
        <line
          x1={telescopeStart.x}
          y1={telescopeStart.y}
          x2={telescopeEnd.x}
          y2={telescopeEnd.y}
          stroke="url(#prism-metal)"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <line
          x1={telescopeStart.x}
          y1={telescopeStart.y}
          x2={telescopeEnd.x}
          y2={telescopeEnd.y}
          stroke="#8b9bb1"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx={objective.x} cy={objective.y} r="17" fill="#284050" stroke="#9ed7df" strokeWidth="2" />
        <circle cx={objective.x} cy={objective.y} r="9" fill="#a5f3fc" fillOpacity="0.28" />
        <circle cx={eyepiece.x} cy={eyepiece.y} r="18" fill="#263448" stroke="#96a5b8" strokeWidth="2" />
        <line x1={eyepiece.x - 9} y1={eyepiece.y} x2={eyepiece.x + 9} y2={eyepiece.y} stroke="#d3dde9" strokeWidth="1" />
        <text
          x={telescopeEnd.x + (telescopeDirection.x > 0.4 ? 0 : -20)}
          y={telescopeEnd.y - 20}
          textAnchor="middle"
          fill="#c6d1df"
          fontSize="10"
          fontWeight="700"
        >
          TELESCOPE
        </text>
      </g>

      <g aria-label="Telescope eyepiece view">
        <rect x="834" y="68" width="216" height="184" rx="12" fill="#151e2c" stroke="#405069" />
        <text x="852" y="92" fill="#cbd5e1" fontSize="10" fontWeight="700" letterSpacing="0.7">
          EYEPIECE · CROSSWIRE VIEW
        </text>
        <circle cx="942" cy="165" r="55" fill="#0b1019" stroke="#74859d" strokeWidth="2" />
        <circle cx="942" cy="165" r="49" fill="#121d2b" stroke="#34465e" strokeWidth="1" />
        <line x1="887" y1="165" x2="997" y2="165" stroke="#a9b6c8" strokeWidth="1" opacity="0.78" />
        <line x1="942" y1="110" x2="942" y2="220" stroke="#a9b6c8" strokeWidth="1" opacity="0.78" />
        <circle cx="942" cy="165" r="3" fill="#d7e1ef" />
        <g
          className="prism-slit-image"
          style={{ transform: `translateX(${slitImageOffset}px)`, transition: 'transform 150ms ease-out' }}
        >
          <line x1="942" y1="153" x2="942" y2="177" stroke="#ffe18b" strokeWidth={clamp(slitOpeningPx, 2, 7)} filter="url(#prism-ray-glow)" />
          <line x1="942" y1="153" x2="942" y2="177" stroke="#fff0b5" strokeWidth={clamp(slitOpeningPx / 2, 1, 3)} />
        </g>
        <text
          x="942"
          y="240"
          textAnchor="middle"
          fill={Math.abs(state.imageOffsetRad) <= degreesToRadians(12) ? '#9eacc1' : '#f0bf72'}
          fontSize="9"
        >
          {Math.abs(state.imageOffsetRad) <= degreesToRadians(12)
            ? `Image offset ${radiansToDegrees(state.imageOffsetRad).toFixed(2)}°`
            : 'Image outside field · turn telescope'}
        </text>
      </g>

      <g aria-label="Live optical readings">
        <rect x="834" y="270" width="216" height="144" rx="12" fill="#151e2c" stroke="#405069" />
        <text x="852" y="295" fill="#9eacc1" fontSize="10" fontWeight="700">LIVE APPARATUS</text>
        <text x="852" y="321" fill="#e2e8f0" fontSize="11">
          Table φ: {prismRotationDegrees.toFixed(1)}°
        </text>
        <text x="852" y="343" fill="#e2e8f0" fontSize="11">
          Telescope: {radiansToDegrees(params.telescopeRotationRad).toFixed(1)}°
        </text>
        <text x="852" y="365" fill="#e2e8f0" fontSize="11">
          Ray direction: {outgoingAngleDegrees.toFixed(2)}°
        </text>
        <text x="852" y="389" fill={state.atTurningPoint ? '#8de0c1' : '#a9b5c8'} fontSize="10" fontWeight="700">
          {state.atTurningPoint ? 'TURNING POINT' : state.telescopeAligned ? 'CROSSWIRE ALIGNED' : 'ALIGN TELESCOPE'}
        </text>
      </g>

      <text x="34" y="634" fill="#728198" fontSize="9">
        The refracted image position follows the ray traced through the rotated prism; it reverses at the minimum of D(φ).
      </text>
    </svg>
  );
}

function CompactCanvas({ params, state }: CanvasProps) {
  const center = { x: 195, y: 305 };
  const prismScale = 61;
  const scaleRadius = 126;
  const vertices = getPrismVertices(params.prismRotationRad).map((point) => ({
    x: center.x + point.x * prismScale,
    y: center.y - point.y * prismScale,
  }));
  const prismPoints = vertices.map(({ x, y }) => `${x},${y}`).join(' ');
  const ray = state.ray;
  const entryPoint = ray.entryPoint
    ? { x: center.x + ray.entryPoint.x * prismScale, y: center.y - ray.entryPoint.y * prismScale }
    : null;
  const exitPoint = ray.exitPoint
    ? { x: center.x + ray.exitPoint.x * prismScale, y: center.y - ray.exitPoint.y * prismScale }
    : null;
  const rayEnd = exitPoint && params.prismInserted && ray.valid
    ? {
      x: exitPoint.x + ray.outgoingDirection.x * 155,
      y: exitPoint.y - ray.outgoingDirection.y * 155,
    }
    : { x: 354, y: center.y };
  const telescopeDirection = {
    x: Math.cos(params.telescopeRotationRad),
    y: Math.sin(params.telescopeRotationRad),
  };
  const telescopeStart = {
    x: center.x + telescopeDirection.x * 69,
    y: center.y - telescopeDirection.y * 69,
  };
  const telescopeEnd = {
    x: center.x + telescopeDirection.x * 148,
    y: center.y - telescopeDirection.y * 148,
  };
  const slitOpeningPx = clamp(params.slitWidthM * 1000 * 3, 1.2, 8);
  const imageOffset = clamp(170 * Math.tan(state.imageOffsetRad), -22, 22);
  const directBeam = !params.prismInserted;

  return (
    <svg
      width="100%"
      viewBox="0 0 390 620"
      preserveAspectRatio="xMidYMid meet"
      className="experiment-canvas prism-canvas prism-canvas-compact"
      role="img"
      aria-label={`Compact spectrometer view. ${params.prismInserted ? 'Glass prism inserted' : 'Direct ray mode'}. Prism rotation ${radiansToDegrees(params.prismRotationRad).toFixed(1)} degrees; refracted ray ${radiansToDegrees(state.outgoingAngleRad).toFixed(2)} degrees.`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="prism-compact-metal" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#58677b" />
          <stop offset="100%" stopColor="#172131" />
        </linearGradient>
        <linearGradient id="prism-compact-glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
        </linearGradient>
        <filter id="prism-compact-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="prism-compact-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#ffd779" />
        </marker>
      </defs>
      <rect width="390" height="620" rx="10" fill="#0f131d" />
      <text x="16" y="24" fill="#cbd5e1" fontSize="12" fontWeight="700" letterSpacing="0.8">
        SPECTROMETER · SOLID GLASS · A = 60°
      </text>
      <text x="16" y="42" fill="#8290a6" fontSize="9">
        Sodium lamp · collimator · rotating prism · telescope
      </text>

      <g aria-label="Graduated circle and verniers">
        <circle cx={center.x} cy={center.y} r={scaleRadius} fill="#121a27" fillOpacity="0.55" stroke="#516078" />
        {Array.from({ length: 24 }, (_, index) => {
          const angle = index * Math.PI / 12;
          const major = index % 2 === 0;
          const innerRadius = scaleRadius - (major ? 11 : 6);
          const x1 = center.x + innerRadius * Math.cos(angle);
          const y1 = center.y - innerRadius * Math.sin(angle);
          const x2 = center.x + scaleRadius * Math.cos(angle);
          const y2 = center.y - scaleRadius * Math.sin(angle);
          const labelX = center.x + (scaleRadius + 14) * Math.cos(angle);
          const labelY = center.y - (scaleRadius + 14) * Math.sin(angle);
          return (
            <g key={index}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? '#a4b2c7' : '#59677b'} />
              {major && (
                <text x={labelX} y={labelY + 2.5} textAnchor="middle" fill="#a9b5c8" fontSize="7.5">
                  {index * 15}°
                </text>
              )}
            </g>
          );
        })}
        <circle
          cx={center.x + (scaleRadius - 19) * Math.cos(params.telescopeRotationRad)}
          cy={center.y - (scaleRadius - 19) * Math.sin(params.telescopeRotationRad)}
          r="4"
          fill="#83e1d3"
        />
        <circle
          cx={center.x + (scaleRadius - 19) * Math.cos(params.telescopeRotationRad + Math.PI)}
          cy={center.y - (scaleRadius - 19) * Math.sin(params.telescopeRotationRad + Math.PI)}
          r="4"
          fill="#f7be69"
        />
        <text x={center.x - 26} y={center.y + scaleRadius + 25} fill="#b9c6d9" fontSize="8" fontWeight="700">
          CIRCULAR SCALE · VERNIERS A / B
        </text>
      </g>

      <g aria-label="Sodium vapour lamp and adjustable collimator slit">
        <rect x="8" y={center.y - 17} width="34" height="34" rx="7" fill="url(#prism-compact-metal)" stroke="#66758c" />
        <path d={`M 15 ${center.y} H 35`} stroke="#ffdf91" strokeWidth="2" filter="url(#prism-compact-glow)" />
        <text x="25" y={center.y - 23} textAnchor="middle" fill="#e1c98e" fontSize="7.5" fontWeight="700">Na LAMP</text>
        <rect x="52" y={center.y - 27} width="91" height="54" rx="9" fill="url(#prism-compact-metal)" stroke="#738198" />
        <rect x="62" y={center.y - 19} width="61" height="38" rx="5" fill="#101722" stroke="#3b4a60" />
        <rect
          x="128"
          y={center.y - slitOpeningPx / 2}
          width="4"
          height={slitOpeningPx}
          rx="1"
          fill="#fff1b8"
          filter="url(#prism-compact-glow)"
        />
        <ellipse cx="141" cy={center.y} rx="4" ry="21" fill="#91d9e3" fillOpacity="0.24" stroke="#77aab8" />
        <text x="97" y={center.y - 35} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontWeight="700">
          COLLIMATOR
        </text>
        <text x="97" y={center.y + 41} textAnchor="middle" fill="#8f9db2" fontSize="7.5">
          illuminated slit
        </text>
      </g>

      <g aria-label="Rotating glass prism table">
        <circle cx={center.x} cy={center.y} r="82" fill="url(#prism-compact-metal)" stroke="#8290a4" />
        <circle cx={center.x} cy={center.y} r="71" fill="#182233" stroke="#47576d" />
        <line
          x1={center.x}
          y1={center.y}
          x2={center.x + 76 * Math.cos(params.prismRotationRad)}
          y2={center.y - 76 * Math.sin(params.prismRotationRad)}
          stroke="#e8b764"
          strokeWidth="2"
        />
        <polygon
          points={prismPoints}
          fill={params.prismInserted ? 'url(#prism-compact-glass)' : '#52637a'}
          fillOpacity={params.prismInserted ? 1 : 0.18}
          stroke={params.prismInserted ? '#9de3e8' : '#63728a'}
          strokeWidth="2"
          strokeDasharray={params.prismInserted ? undefined : '4 4'}
        />
        <circle cx={center.x} cy={center.y} r="5" fill="#d2dbe8" />
        <text x={center.x} y={center.y + 5} textAnchor="middle" fill="#ecfeff" fontSize="7.5" fontWeight="700">
          {params.prismInserted ? 'GLASS PRISM' : 'PRISM OUT'}
        </text>
      </g>

      <g aria-label="Incident and refracted ray">
        {directBeam ? (
          <line x1="143" y1={center.y} x2="352" y2={center.y} stroke="#ffe59e" strokeWidth="2.2" markerEnd="url(#prism-compact-arrow)" />
        ) : ray.valid && entryPoint && exitPoint ? (
          <>
            <line x1="143" y1={center.y} x2={entryPoint.x} y2={entryPoint.y} stroke="#ffe59e" strokeWidth="2.2" />
            <line x1={entryPoint.x} y1={entryPoint.y} x2={exitPoint.x} y2={exitPoint.y} stroke="#fff4cc" strokeWidth="2.2" />
            <line x1={exitPoint.x} y1={exitPoint.y} x2={rayEnd.x} y2={rayEnd.y} stroke="#ffe59e" strokeWidth="2.2" markerEnd="url(#prism-compact-arrow)" />
            <text x="149" y={center.y - 13} fill="#e9ce8f" fontSize="8">
              D = {radiansToDegrees(state.deviationRad).toFixed(2)}°
            </text>
          </>
        ) : (
          <text x="145" y={center.y - 12} fill="#f3a5a5" fontSize="8">No transmitted ray</text>
        )}
      </g>

      <g aria-label="Rotatable telescope">
        <line
          x1={telescopeStart.x}
          y1={telescopeStart.y}
          x2={telescopeEnd.x}
          y2={telescopeEnd.y}
          stroke="#080d15"
          strokeWidth="25"
          strokeLinecap="round"
        />
        <line
          x1={telescopeStart.x}
          y1={telescopeStart.y}
          x2={telescopeEnd.x}
          y2={telescopeEnd.y}
          stroke="url(#prism-compact-metal)"
          strokeWidth="19"
          strokeLinecap="round"
        />
        <circle cx={telescopeStart.x} cy={telescopeStart.y} r="10" fill="#284050" stroke="#9ed7df" strokeWidth="1.5" />
        <circle cx={telescopeEnd.x} cy={telescopeEnd.y} r="12" fill="#263448" stroke="#96a5b8" strokeWidth="1.5" />
        <text x={telescopeEnd.x} y={telescopeEnd.y - 17} textAnchor="middle" fill="#c6d1df" fontSize="8" fontWeight="700">
          TELESCOPE
        </text>
      </g>

      <g aria-label="Telescope crosswire view">
        <text x="195" y="468" textAnchor="middle" fill="#cbd5e1" fontSize="8.5" fontWeight="700">
          EYEPIECE · CROSSWIRE VIEW
        </text>
        <circle cx="195" cy="505" r="31" fill="#0b1019" stroke="#74859d" strokeWidth="1.5" />
        <circle cx="195" cy="505" r="26" fill="#121d2b" stroke="#34465e" />
        <line x1="164" y1="505" x2="226" y2="505" stroke="#a9b6c8" strokeWidth="0.8" />
        <line x1="195" y1="474" x2="195" y2="536" stroke="#a9b6c8" strokeWidth="0.8" />
        <g
          className="prism-slit-image"
          style={{ transform: `translateX(${imageOffset}px)`, transition: 'transform 150ms ease-out' }}
        >
          <line x1="195" y1="495" x2="195" y2="515" stroke="#ffe18b" strokeWidth={clamp(slitOpeningPx, 2, 6)} filter="url(#prism-compact-glow)" />
          <line x1="195" y1="495" x2="195" y2="515" stroke="#fff0b5" strokeWidth="1.5" />
        </g>
        <text
          x="195"
          y="547"
          textAnchor="middle"
          fill={Math.abs(state.imageOffsetRad) <= degreesToRadians(7) ? '#9eacc1' : '#f0bf72'}
          fontSize="8"
        >
          {Math.abs(state.imageOffsetRad) <= degreesToRadians(7)
            ? `Image offset ${radiansToDegrees(state.imageOffsetRad).toFixed(2)}°`
            : 'Image outside field · turn telescope'}
        </text>
      </g>

      <rect x="12" y="558" width="366" height="42" rx="8" fill="#151e2c" stroke="#405069" />
      <text x="24" y="576" fill="#e2e8f0" fontSize="9.5">
        φ {radiansToDegrees(params.prismRotationRad).toFixed(1)}° · ray {radiansToDegrees(state.outgoingAngleRad).toFixed(2)}°
      </text>
      <text x="24" y="591" fill={state.atTurningPoint ? '#8de0c1' : '#a9b5c8'} fontSize="8.5" fontWeight="700">
        {state.atTurningPoint ? 'MINIMUM-DEVIATION TURNING POINT' : state.telescopeAligned ? 'CROSSWIRE ALIGNED' : 'FOLLOW IMAGE TO THE TURNING POINT'}
      </text>
    </svg>
  );
}

export default function ExperimentCanvas(props: CanvasProps) {
  const mediaQuery = '(max-width: 800px)';
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(mediaQuery).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(mediaQuery);
    const handleChange = (event: MediaQueryListEvent) => setIsCompact(event.matches);
    setIsCompact(media.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return isCompact ? <CompactCanvas {...props} /> : <WideCanvas {...props} />;
}
