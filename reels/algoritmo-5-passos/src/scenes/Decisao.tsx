import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {ease, slideIn} from '../anim';
import {bodyFont, chipColors, chipText, colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';
import {useFormat} from '../format';
import {Chip} from '../components/Chip';

const scene = getScene('decisao');

const Arrow: React.FC<{start: number}> = ({start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = ease(frame, start, fps, 10);
  return (
    <svg width={70} height={40} viewBox="0 0 70 40" style={{flexShrink: 0, opacity: p}}>
      <line x1={4} y1={20} x2={4 + 50 * p} y2={20} stroke={colors.gray} strokeWidth={6} strokeLinecap="round" />
      <path d="M 44 8 L 62 20 L 44 32" stroke={colors.gray} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={p > 0.6 ? 1 : 0} />
    </svg>
  );
};

export const Decisao: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rows = scene.screen.rows;
  const {horizontal: h} = useFormat();
  const cues = rows.flatMap((r) => [r.cue, ...r.chips.map((c) => c.cue)]);
  const resolved = useCues(cues);
  let k = 0;
  const starts = rows.map((r) => {
    const row = resolved[k++];
    const chips = r.chips.map(() => resolved[k++]);
    return {row, chips};
  });

  return (
    <SceneFrame>
      <div style={{display: 'flex', flexDirection: 'column', gap: h ? 24 : 34}}>
        {rows.map((r, i) => {
          const s = starts[i];
          return (
            <div
              key={i}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: '30px 36px 34px',
                ...slideIn(frame, s.row, fps, 'up', 50),
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: h ? 60 : 0, flexDirection: h ? 'row' : 'column', justifyContent: 'space-between'}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 22, flexWrap: h ? 'nowrap' : 'wrap', whiteSpace: h ? 'nowrap' : undefined, flexShrink: 0, alignSelf: h ? 'center' : 'flex-start'}}>
                <span style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 36, color: colors.gray}}>se</span>
                {r.condition.map((c, j) => (
                  <React.Fragment key={c}>
                    {j > 0 ? <span style={{fontFamily: titleFont, fontWeight: 800, fontSize: h ? 62 : 58, color: colors.yellow}}>+</span> : null}
                    <span style={{fontFamily: titleFont, fontWeight: 800, fontSize: h ? 62 : 58, lineHeight: 1, color: colors.text}}>{c}</span>
                  </React.Fragment>
                ))}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: h ? 0 : 22, alignSelf: h ? 'center' : 'flex-start'}}>
                <span style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 36, color: colors.gray, marginRight: 4}}>então</span>
                {r.chips.map((c, j) => (
                  <React.Fragment key={c.text}>
                    <Arrow start={s.chips[j] - 4} />
                    <Chip text={c.text} start={s.chips[j]} bg={chipColors[c.color]} fg={chipText[c.color]} size={h ? 48 : 44} />
                  </React.Fragment>
                ))}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};
