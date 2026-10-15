import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {Word} from '../timing';
import {colors, CAPTION_HEIGHT, CONTENT_BOTTOM, SIDE, titleFont} from '../theme';

const MAX_WORDS = 4;
const MAX_CHARS = 24;
const GAP_BREAK = 0.45;
const HOLD = 0.4;

type Group = {words: Word[]; start: number; end: number};

// agrupa palavras em blocos curtos: quebra em pontuação, pausa ou tamanho
const groupWords = (words: Word[]): Group[] => {
  const groups: Group[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) groups.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (cur.length && (cur.length >= MAX_WORDS || chars > MAX_CHARS || (prev && w.start - prev.end > GAP_BREAK))) flush();
    cur.push(w);
    if (/[.?!:,]$/.test(w.text)) flush();
  });
  flush();
  // segura cada bloco um pouco depois da última palavra, sem invadir o próximo
  return groups.map((g, i) => ({...g, end: Math.min(g.end + HOLD, groups[i + 1]?.start ?? g.end + HOLD)}));
};

const clean = (t: string) => t.toLowerCase().replace(/[.,:;!]+$/g, '');

export const Captions: React.FC<{words: Word[]}> = ({words}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const groups = useMemo(() => groupWords(words), [words]);
  const t = frame / fps;
  const g = groups.find((x) => t >= x.start && t < x.end);
  if (!g) return null;

  const local = t - g.start;
  const appear = Math.min(1, local / 0.15);

  return (
    <div
      style={{
        position: 'absolute',
        left: SIDE,
        right: SIDE,
        top: CONTENT_BOTTOM,
        height: CAPTION_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          padding: '14px 30px 18px',
          borderRadius: 18,
          backgroundColor: 'rgba(0,9,53,0.88)',
          fontFamily: titleFont,
          fontWeight: 800,
          fontSize: 76,
          lineHeight: 1,
          textAlign: 'center',
          opacity: appear,
          transform: `translateY(${(1 - appear) * 12}px)`,
        }}
      >
        {g.words.map((w, i) => {
          // palavra atual: da sua largada até a largada da próxima
          const next = g.words[i + 1];
          const active = t >= w.start && (next ? t < next.start : t < g.end);
          const spoken = t >= w.start;
          return (
            <span key={i} style={{color: active ? colors.yellow : spoken ? colors.text : 'rgba(255,255,255,0.55)'}}>
              {i > 0 ? ' ' : ''}
              {clean(w.text)}
            </span>
          );
        })}
      </div>
    </div>
  );
};
