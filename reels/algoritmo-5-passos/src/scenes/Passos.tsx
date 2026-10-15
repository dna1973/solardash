import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {ease, fade, pop, slideIn} from '../anim';
import {bodyFont, colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';

const scene = getScene('passos');

const PLATE_H = 150;

// placa retangular amarela com borda preta, estilo sinalização rodoviária
const Plate: React.FC<{n: string; text: string; start: number; stamp?: {text: string; start: number}}> = ({n, text, start, stamp}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(frame, start, fps, 12);
  // pulso único depois do selo
  const pulse = stamp
    ? interpolate(frame - stamp.start, [4, 10, 18], [1, 1.05, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;
  const stampP = stamp ? pop(frame, stamp.start, fps, 12) : 0;

  return (
    <div
      style={{
        position: 'relative',
        height: PLATE_H,
        backgroundColor: colors.yellow,
        borderRadius: 22,
        padding: 9,
        boxShadow: `0 0 0 4px ${colors.ink}`,
        opacity: fade(frame, start, 6),
        transform: `translateX(${(1 - p) * 140}px) scale(${pulse})`,
      }}
    >
      <div
        style={{
          height: '100%',
          border: `7px solid ${colors.ink}`,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          paddingLeft: 18,
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 10,
            backgroundColor: colors.ink,
            color: colors.yellow,
            fontFamily: titleFont,
            fontWeight: 800,
            fontSize: 76,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {n}
        </div>
        <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: 64, color: colors.ink, lineHeight: 1}}>{text}</div>
      </div>
      {stamp ? (
        <div
          style={{
            position: 'absolute',
            right: 34,
            top: '50%',
            padding: '10px 22px',
            border: `5px solid ${colors.red}`,
            borderRadius: 10,
            backgroundColor: colors.bg,
            color: colors.text,
            fontFamily: bodyFont,
            fontWeight: 600,
            fontSize: 34,
            whiteSpace: 'nowrap',
            opacity: fade(frame, stamp.start, 5),
            transform: `translateY(-50%) rotate(-6deg) scale(${1.6 - 0.6 * stampP})`,
          }}
        >
          {stamp.text}
        </div>
      ) : null}
    </div>
  );
};

export const Passos: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const plates = scene.screen.plates;
  const frames = useCues([scene.cues.title, ...plates.map((p) => p.cue), scene.cues.stamp]);
  const title = frames[0];
  const plateStarts = frames.slice(1, 1 + plates.length);
  const stamp = frames[frames.length - 1];
  const underline = ease(frame, title + 6, fps, 12);

  return (
    <SceneFrame>
      <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: 80, lineHeight: 1, color: colors.text, ...slideIn(frame, title, fps, 'up', 40)}}>
        {scene.screen.title}
      </div>
      <div style={{height: 10, width: 260 * underline, backgroundColor: colors.yellow, marginTop: 18, marginBottom: 52}} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
        {plates.map((p, i) => (
          <Plate
            key={p.n}
            n={p.n}
            text={p.text}
            start={plateStarts[i]}
            stamp={i === plates.length - 1 ? {text: scene.screen.stamp, start: Math.max(stamp, plateStarts[i] + 8)} : undefined}
          />
        ))}
      </div>
    </SceneFrame>
  );
};
