import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {useSlot} from '../timing';
import {useFormat} from '../format';
import {colors} from '../theme';

const EXIT = 8;

// moldura de cada cena: área útil do formato + saída curta (fade e leve subida)
export const SceneFrame: React.FC<{children: React.ReactNode; exit?: boolean; justify?: 'center' | 'flex-start'}> = ({
  children,
  exit = true,
  justify = 'center',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useSlot();
  const f = useFormat();
  const out = exit
    ? interpolate(frame, [durationInFrames - EXIT, durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: f.top,
          left: f.side,
          right: f.side,
          height: f.contentBottom - f.top,
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

// fundo comum: azul prf com uma faixa tracejada discreta, tipo pista
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const {height} = useFormat();
  const offset = (frame * 2) % 120;
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: -120 + offset,
          width: 6,
          height: height + 240,
          backgroundImage: `repeating-linear-gradient(to bottom, ${colors.surface2} 0 60px, transparent 60px 120px)`,
        }}
      />
    </AbsoluteFill>
  );
};
