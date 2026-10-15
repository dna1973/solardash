import {interpolate, spring} from 'remotion';
import type {CSSProperties} from 'react';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// progresso 0→1 com spring suave, ~12 frames
export const ease = (frame: number, start: number, fps: number, duration = 12) =>
  spring({frame: frame - start, fps, durationInFrames: duration, config: {damping: 200}});

// spring com um leve overshoot, para entradas de impacto
export const pop = (frame: number, start: number, fps: number, duration = 12) =>
  spring({frame: frame - start, fps, durationInFrames: duration, config: {damping: 14, stiffness: 220, mass: 0.7}});

export const fade = (frame: number, start: number, duration = 8) =>
  interpolate(frame, [start, start + duration], [0, 1], clamp);

type Dir = 'up' | 'down' | 'left' | 'right';

// entrada padrão: slide curto + fade
export const slideIn = (frame: number, start: number, fps: number, dir: Dir = 'up', distance = 60): CSSProperties => {
  const p = ease(frame, start, fps, 12);
  const d = (1 - p) * distance;
  const t = {up: `translateY(${d}px)`, down: `translateY(${-d}px)`, left: `translateX(${-d}px)`, right: `translateX(${d}px)`}[dir];
  return {opacity: fade(frame, start, 8), transform: t};
};

export const hidden = (frame: number, start: number) => frame < start;
