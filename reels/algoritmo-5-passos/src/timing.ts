import {createContext, useContext} from 'react';
import {useVideoConfig} from 'remotion';
import {scenes, type Cue, type SceneId} from './scenes';

export type Word = {text: string; start: number; end: number};
export type Timings = {
  audio: string;
  duration: number;
  scenes: {id: string; start: number}[];
  words: Word[];
};

// src/timings.json é opcional (gerado por scripts/align.py).
// require.context não quebra o bundle quando o arquivo não existe.
const ctx = require.context('./', false, /^\.\/timings\.json$/);
export const timings: Timings | null = ctx.keys().length > 0 ? (ctx(ctx.keys()[0]) as Timings) : null;

// tempo extra depois da última palavra, para o cta respirar
const TAIL_SEC = 1.5;
const MIN_LAST_SEC = 3.5;

export type SceneSlot = {
  id: SceneId;
  from: number;
  durationInFrames: number;
  startSec: number;
  durationSec: number;
  defaultSec: number;
};

export const buildLayout = (fps: number, t: Timings | null): SceneSlot[] => {
  const starts: number[] = [];
  let acc = 0;
  for (const s of scenes) {
    const aligned = t?.scenes.find((x) => x.id === s.id)?.start;
    starts.push(t && aligned !== undefined ? aligned : acc);
    acc += s.durationSec;
  }
  starts[0] = 0;
  let end = acc;
  if (t) {
    const lastStart = starts[starts.length - 1];
    end = Math.max(t.duration + TAIL_SEC, lastStart + MIN_LAST_SEC);
  }
  const frames = starts.map((s) => Math.round(s * fps));
  const endFrame = Math.round(end * fps);
  return scenes.map((s, i) => {
    const next = i < scenes.length - 1 ? frames[i + 1] : endFrame;
    return {
      id: s.id,
      from: frames[i],
      durationInFrames: Math.max(1, next - frames[i]),
      startSec: frames[i] / fps,
      durationSec: (next - frames[i]) / fps,
      defaultSec: s.durationSec,
    };
  });
};

export const totalFrames = (layout: SceneSlot[]) => {
  const last = layout[layout.length - 1];
  return last.from + last.durationInFrames;
};

// ---- cues ----

const NUMBERS: Record<string, string> = {
  '0': 'zero', '1': 'um', '2': 'dois', '3': 'tres', '4': 'quatro', '5': 'cinco',
  '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove', '10': 'dez',
};
const ALIASES: Record<string, string> = {para: 'pra', esta: 'ta', uma: 'um'};

export const normalize = (w: string) => {
  const base = w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const n = NUMBERS[base] ?? base;
  return ALIASES[n] ?? n;
};

export const SceneContext = createContext<SceneSlot | null>(null);

const LEAD_FRAMES = 3;

// devolve o frame (relativo ao início da cena) de cada cue, na ordem dada
export const useCues = (cues: readonly Cue[]): number[] => {
  const slot = useContext(SceneContext);
  const {fps} = useVideoConfig();
  if (!slot) throw new Error('useCues fora de uma cena');
  const scale = slot.durationSec / slot.defaultSec;
  const words = timings
    ? timings.words.filter((w) => w.start >= slot.startSec - 0.3 && w.start < slot.startSec + slot.durationSec)
    : [];
  const norm = words.map((w) => normalize(w.text));
  let cursor = 0;
  return cues.map((cue) => {
    if (timings && cue.word) {
      const phrase = cue.word.split(/\s+/).map(normalize);
      for (let i = cursor; i <= norm.length - phrase.length; i++) {
        if (phrase.every((p, k) => norm[i + k] === p)) {
          cursor = i + 1;
          return Math.max(0, Math.round((words[i].start - slot.startSec) * fps) - LEAD_FRAMES);
        }
      }
    }
    return Math.round(cue.at * (timings ? scale : 1) * fps);
  });
};

export const useSlot = (): SceneSlot => {
  const slot = useContext(SceneContext);
  if (!slot) throw new Error('useSlot fora de uma cena');
  return slot;
};
