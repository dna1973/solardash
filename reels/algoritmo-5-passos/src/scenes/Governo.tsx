import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {slideIn} from '../anim';
import {colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';
import {Chip} from '../components/Chip';

const scene = getScene('governo');
const chipTints = [colors.yellow, colors.text, colors.gray];

export const Governo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chips = scene.screen.chips;
  const [l1, l2, ...chipStarts] = useCues([scene.cues.line1, scene.cues.line2, ...chips.map((c) => c.cue)]);

  return (
    <SceneFrame>
      <div style={{fontFamily: titleFont, fontWeight: 800, fontSize: 104, lineHeight: 1.02, color: colors.text, ...slideIn(frame, l1, fps, 'up', 50)}}>
        {scene.screen.line1}
      </div>
      <div
        style={{
          marginTop: 40,
          paddingLeft: 30,
          borderLeft: `10px solid ${colors.red}`,
          fontFamily: titleFont,
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 1.1,
          color: colors.gray,
          ...slideIn(frame, l2, fps, 'left', 50),
        }}
      >
        {scene.screen.line2}
      </div>
      <div style={{marginTop: 70, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24}}>
        {chips.map((c, i) => (
          <Chip key={c.text} text={c.text} start={chipStarts[i]} bg={chipTints[i]} outline size={54} />
        ))}
      </div>
    </SceneFrame>
  );
};
