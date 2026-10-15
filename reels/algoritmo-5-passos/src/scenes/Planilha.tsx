import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {ease, fade, slideIn} from '../anim';
import {Img, staticFile} from 'remotion';
import {bodyFont, chipColors, chipText, colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';
import {useFormat} from '../format';

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
      borderLeft: first ? 'none' : `2px solid ${colors.sheetLine}`,
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
  const {horizontal: h} = useFormat();

  return (
    <SceneFrame exit={false} justify={h ? 'center' : 'flex-start'}>
      <div style={{display: 'flex', flexDirection: h ? 'row' : 'column', alignItems: h ? 'center' : 'stretch', gap: h ? 48 : 0}}>
      <div
        style={{
          marginTop: h ? 0 : 10,
          // planilha maior na tela larga
          zoom: h ? 1.2 : 1,
          flexShrink: 0,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: colors.text,
          border: `2px solid ${colors.surface2}`,
          boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
          opacity: dim,
          ...slideIn(frame, sheet, fps, 'up', 60),
        }}
      >
        <div style={{display: 'flex', height: 84, backgroundColor: colors.bg}}>
          {columns.map((c, i) => (
            <Cell key={c} w={COLS[i]} first={i === 0}>
              <span style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 25, lineHeight: 1.1, color: i === 3 ? colors.yellow : colors.text}}>{c}</span>
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
                backgroundColor: i % 2 === 0 ? colors.sheet : colors.sheetAlt,
                borderTop: `2px solid ${colors.sheetLine}`,
                opacity: fade(frame, start, 8),
                transform: `translateY(${(1 - p) * -40}px)`,
              }}
            >
              <Cell w={COLS[0]} first>
                <span style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 29, lineHeight: 1.12, color: colors.ink}}>{r.activity}</span>
              </Cell>
              <Cell w={COLS[1]}>
                <span style={{fontFamily: bodyFont, fontWeight: 400, fontSize: 27, lineHeight: 1.12, color: colors.ink}}>{r.breaks}</span>
              </Cell>
              <Cell w={COLS[2]}>
                <span style={{fontFamily: bodyFont, fontWeight: 400, fontSize: 27, color: colors.ink}}>{r.basis}</span>
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
                    fontSize: 27,
                    lineHeight: 1.05,
                    color: chipText[r.color],
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
          marginTop: h ? 0 : 28,
          flex: h ? 1 : undefined,
          flexShrink: 0,
          alignSelf: 'center',
          width: '100%',
          backgroundColor: colors.deep,
          border: `4px solid ${colors.yellow}`,
          borderRadius: 28,
          padding: '44px 48px 40px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          opacity: fade(frame, cta, 8),
          transform: `translateY(${(1 - ctaP) * 80}px)`,
        }}
      >
        <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: h ? 68 : 84, lineHeight: 1.04, color: colors.text}}>
          <Cta text={scene.screen.cta} />
        </div>
        {scene.screen.logo ? (
          // logotipo amarelo sobre azul (variação institucional do miv)
          <Img src={staticFile('marca/logotipo-amarelo.png')} style={{display: 'block', marginTop: 34, height: 48, width: 'auto'}} />
        ) : null}
      </div>
      </div>
    </SceneFrame>
  );
};
