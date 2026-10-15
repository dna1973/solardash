import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {slideIn} from '../anim';
import {colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';
import {useFormat} from '../format';
import {Chip} from '../components/Chip';

const scene = getScene('governo');
const chipTints = [colors.yellow, colors.text, colors.gray];

export const Governo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chips = scene.screen.chips;
  const {horizontal: h} = useFormat();
  const [l1, l2, ...chipStarts] = useCues([scene.cues.line1, scene.cues.line2, ...chips.map((c) => c.cue)]);

  return (
    <SceneFrame>
      <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: h ? 124 : 104, lineHeight: 1.02, color: colors.text, ...slideIn(frame, l1, fps, 'up', 50)}}>
        {scene.screen.line1}
      </div>
      <div
        style={{
          marginTop: 40,
          paddingLeft: 30,
          borderLeft: `10px solid ${colors.red}`,
          fontFamily: titleFont,
          fontWeight: 800,
          fontSize: h ? 72 : 66,
          lineHeight: 1.1,
          color: colors.gray,
          ...slideIn(frame, l2, fps, 'left', 50),
        }}
      >
        {scene.screen.line2}
      </div>
      <div style={{marginTop: h ? 60 : 70, display: 'flex', flexDirection: h ? 'row' : 'column', alignItems: 'flex-start', gap: 24}}>
        {chips.map((c, i) => (
          <Chip key={c.text} text={c.text} start={chipStarts[i]} bg={chipTints[i]} outline size={h ? 58 : 54} />
        ))}
      </div>
    </SceneFrame>
  );
};
