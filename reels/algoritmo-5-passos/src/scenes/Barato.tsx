import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues, useSlot} from '../timing';
import {ease, slideIn} from '../anim';
import {bodyFont, colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';

const scene = getScene('barato');

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;

const SIZE = 300;

const Clock: React.FC<{start: number}> = ({start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {durationInFrames} = useSlot();
  const from = toMinutes(scene.screen.clockFrom);
  const to = toMinutes(scene.screen.clockTo);
  const spinEnd = Math.min(durationInFrames - 10, start + 2.6 * fps);
  // gira rápido e desacelera chegando no fim da tarde
  const t = interpolate(frame, [start, spinEnd], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const eased = 1 - Math.pow(1 - t, 2.2);
  const minutes = from + (to - from) * eased;
  const minuteDeg = (minutes % 60) * 6;
  const hourDeg = ((minutes / 60) % 12) * 30;
  const appear = ease(frame, 0, fps, 12);

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 46, opacity: appear, transform: `translateY(${(1 - appear) * 40}px)`}}>
      <svg width={SIZE} height={SIZE} viewBox="-150 -150 300 300">
        <circle r={138} fill={colors.surface} stroke={colors.text} strokeWidth={10} />
        {Array.from({length: 12}).map((_, i) => (
          <rect
            key={i}
            x={-4}
            y={-126}
            width={8}
            height={i % 3 === 0 ? 26 : 14}
            fill={i % 3 === 0 ? colors.text : colors.gray}
            transform={`rotate(${i * 30})`}
          />
        ))}
        {/* arco amarelo marcando o tempo que já passou */}
        <path
          d={describeArc(((from % 720) / 60) * 30, ((minutes % 720) / 60) * 30, 104)}
          stroke={colors.yellow}
          strokeWidth={18}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
        <rect x={-7} y={-72} width={14} height={80} rx={7} fill={colors.text} transform={`rotate(${hourDeg})`} />
        <rect x={-5} y={-110} width={10} height={118} rx={5} fill={colors.yellow} transform={`rotate(${minuteDeg})`} />
        <circle r={14} fill={colors.yellow} />
      </svg>
      <div>
        <div style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 34, color: colors.gray}}>uma tarde</div>
        <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: 120, color: colors.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
          {fmt(minutes)}
        </div>
      </div>
    </div>
  );
};

function describeArc(fromDeg: number, toDeg: number, r: number) {
  const span = Math.max(0.01, toDeg - fromDeg);
  const p = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`;
  };
  return `M ${p(fromDeg)} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${p(fromDeg + span)}`;
}

export const Barato: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [title, support, clock, highlight] = useCues([
    scene.cues.title,
    scene.cues.support,
    scene.cues.clock,
    scene.cues.highlight,
  ]);

  return (
    <SceneFrame>
      <Clock start={clock} />
      <div
        style={{
          marginTop: 70,
          fontFamily: titleFont,
          fontWeight: 800,
          fontSize: 112,
          lineHeight: 0.98,
          color: colors.text,
          ...slideIn(frame, title, fps, 'up', 50),
        }}
      >
        {scene.screen.title}
      </div>
      <div style={{marginTop: 44, fontFamily: bodyFont, fontSize: 50, lineHeight: 1.25, color: colors.text}}>
        <span style={{fontWeight: 400, display: 'block', ...slideIn(frame, support, fps, 'up', 30)}}>{scene.screen.support}</span>
        <span style={{fontWeight: 600, color: colors.yellow, display: 'block', marginTop: 6, ...slideIn(frame, highlight, fps, 'up', 30)}}>
          {scene.screen.highlight}
        </span>
      </div>
    </SceneFrame>
  );
};
