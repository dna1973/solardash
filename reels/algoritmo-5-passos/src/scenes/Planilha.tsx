import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {ease, fade, slideIn} from '../anim';
import {bodyFont, chipColors, colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';

const scene = getScene('planilha');

const COLS = [290, 180, 160, 290];
const ROW_STAGGER = 7;

const Cell: React.FC<{w: number; children: React.ReactNode; first?: boolean}> = ({w, children, first}) => (
  <div
    style={{
      width: w,
      flexShrink: 0,
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      borderLeft: first ? 'none' : `2px solid #D9D5CB`,
    }}
  >
    {children}
  </div>
);

// "{PLANILHA}" vira destaque amarelo
const Cta: React.FC<{text: string}> = ({text}) => (
  <>
    {text.split(/(\{[^}]+\})/).map((part, i) =>
      part.startsWith('{') ? (
        <span key={i} style={{color: colors.yellow}}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

export const Planilha: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {columns, rows} = scene.screen;
  const [sheet, rowsStart, cta] = useCues([scene.cues.sheet, scene.cues.rowsStart, scene.cues.cta]);
  const dim = interpolate(frame, [cta, cta + 10], [1, 0.45], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ctaP = ease(frame, cta, fps, 12);

  return (
    <SceneFrame exit={false} justify="flex-start">
      <div
        style={{
          marginTop: 10,
          flexShrink: 0,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: colors.text,
          boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
          opacity: dim,
          ...slideIn(frame, sheet, fps, 'up', 60),
        }}
      >
        <div style={{display: 'flex', height: 84, backgroundColor: colors.black}}>
          {columns.map((c, i) => (
            <Cell key={c} w={COLS[i]} first={i === 0}>
              <span style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 30, lineHeight: 1.1, color: i === 3 ? colors.yellow : colors.text}}>{c}</span>
            </Cell>
          ))}
        </div>
        {rows.map((r, i) => {
          const start = rowsStart + i * ROW_STAGGER;
          const p = ease(frame, start, fps, 10);
          return (
            <div
              key={r.activity}
              style={{
                display: 'flex',
                flexShrink: 0,
                height: 140,
                backgroundColor: i % 2 === 0 ? colors.text : '#E7E3D8',
                borderTop: '2px solid #D9D5CB',
                opacity: fade(frame, start, 8),
                transform: `translateY(${(1 - p) * -40}px)`,
              }}
            >
              <Cell w={COLS[0]} first>
                <span style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 34, lineHeight: 1.12, color: colors.bg}}>{r.activity}</span>
              </Cell>
              <Cell w={COLS[1]}>
                <span style={{fontFamily: bodyFont, fontWeight: 400, fontSize: 31, lineHeight: 1.12, color: colors.bg}}>{r.breaks}</span>
              </Cell>
              <Cell w={COLS[2]}>
                <span style={{fontFamily: bodyFont, fontWeight: 400, fontSize: 31, color: colors.bg}}>{r.basis}</span>
              </Cell>
              <Cell w={COLS[3]}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '8px 18px',
                    borderRadius: 999,
                    backgroundColor: chipColors[r.color],
                    fontFamily: titleFont,
                    fontWeight: 800,
                    fontSize: 33,
                    lineHeight: 1.05,
                    color: colors.bg,
                  }}
                >
                  {r.decision}
                </span>
              </Cell>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: -20,
          flexShrink: 0,
          alignSelf: 'center',
          width: '100%',
          backgroundColor: colors.bg,
          border: `4px solid ${colors.yellow}`,
          borderRadius: 28,
          padding: '44px 48px 40px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          opacity: fade(frame, cta, 8),
          transform: `translateY(${(1 - ctaP) * 80}px)`,
        }}
      >
        <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: 104, lineHeight: 0.98, color: colors.text}}>
          <Cta text={scene.screen.cta} />
        </div>
        <div style={{marginTop: 26, fontFamily: bodyFont, fontWeight: 600, fontSize: 36, color: colors.gray}}>{scene.screen.handle}</div>
      </div>
    </SceneFrame>
  );
};
