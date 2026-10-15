import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getScene} from '../scenes';
import {useCues} from '../timing';
import {ease, fade, pop, slideIn} from '../anim';
import {colors, titleFont} from '../theme';
import {SceneFrame} from '../components/Scene';

const scene = getScene('gancho');

export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [l1, l2] = useCues([scene.cues.line1, scene.cues.line2]);
  const impact = pop(frame, l2, fps, 12);
  const bar = ease(frame, l2 + 6, fps, 10);
  // pequeno "tranco" vertical no impacto, sem tremedeira
  const kick = interpolate(frame - l2, [0, 3, 8], [0, 10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <SceneFrame>
      <div style={{transform: `translateY(${kick}px)`}}>
        <div
          style={{
            fontFamily: titleFont,
            fontWeight: 800,
            fontSize: 118,
            lineHeight: 0.98,
            color: colors.text,
            ...slideIn(frame, l1, fps, 'up', 50),
          }}
        >
          {scene.screen.line1}
        </div>
        <div
          style={{
            marginTop: 34,
            fontFamily: titleFont,
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 0.95,
            color: colors.yellow,
            opacity: fade(frame, l2, 4),
            transform: `scale(${1.35 - 0.35 * impact})`,
            transformOrigin: 'left center',
          }}
        >
          {scene.screen.line2}
        </div>
        <div
          style={{
            marginTop: 30,
            height: 14,
            width: 420 * bar,
            backgroundColor: colors.yellow,
          }}
        />
      </div>
    </SceneFrame>
  );
};
