import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {useSlot} from '../timing';
import {colors, SAFE_TOP, SIDE, CONTENT_BOTTOM, HEIGHT} from '../theme';

const EXIT = 8;

// moldura de cada cena: área segura + saída curta (fade e leve subida)
export const SceneFrame: React.FC<{children: React.ReactNode; exit?: boolean; justify?: 'center' | 'flex-start'}> = ({
  children,
  exit = true,
  justify = 'center',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useSlot();
  const out = exit
    ? interpolate(frame, [durationInFrames - EXIT, durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: SAFE_TOP,
          left: SIDE,
          right: SIDE,
          height: CONTENT_BOTTOM - SAFE_TOP,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: justify,
          opacity: 1 - out,
          transform: `translateY(${-30 * out}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// fundo comum: grafite com uma faixa tracejada discreta, tipo pista
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const offset = (frame * 2) % 120;
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: -120 + offset,
          width: 6,
          height: HEIGHT + 240,
          backgroundImage: `repeating-linear-gradient(to bottom, ${colors.surface2} 0 60px, transparent 60px 120px)`,
        }}
      />
    </AbsoluteFill>
  );
};
