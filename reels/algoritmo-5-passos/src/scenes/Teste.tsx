import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {slideIn} from '../anim';
import {bodyFont, colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';
import {useFormat} from '../format';

const scene = getScene('teste');

export const Teste: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cards = scene.screen.cards;
  const {horizontal: h} = useFormat();
  const [title, ...cardStarts] = useCues([scene.cues.title, ...cards.map((c) => c.cue)]);

  return (
    <SceneFrame>
      <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: 100, lineHeight: 1.02, color: colors.text, ...slideIn(frame, title, fps, 'up', 40)}}>
        {scene.screen.title}
      </div>
      <div style={{marginTop: 64, display: 'flex', flexDirection: h ? 'row' : 'column', gap: 36}}>
        {cards.map((c, i) => (
          <div
            key={c.label}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              borderLeft: `14px solid ${colors.yellow}`,
              padding: '38px 44px 44px',
              flex: h ? 1 : undefined,
              ...slideIn(frame, cardStarts[i], fps, 'right', 120),
            }}
          >
            <div style={{fontFamily: bodyFont, fontWeight: 600, fontSize: 34, color: colors.gray, marginBottom: 14}}>{c.label}</div>
            <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: h ? 76 : 72, lineHeight: 1.06, color: colors.text}}>{c.text}</div>
          </div>
        ))}
      </div>
    </SceneFrame>
  );
};
