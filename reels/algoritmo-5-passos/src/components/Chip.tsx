import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {pop, fade} from '../anim';
import {bodyFont, colors, titleFont} from '../theme';

type Props = {
  text: string;
  start: number;
  bg?: string;
  fg?: string;
  outline?: boolean;
  size?: number;
  style?: React.CSSProperties;
};

// chip arredondado que entra com um spring curto
export const Chip: React.FC<Props> = ({text, start, bg = colors.yellow, fg = colors.bg, outline = false, size = 52, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(frame, start, fps, 12);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: `${size * 0.22}px ${size * 0.55}px`,
        borderRadius: 999,
        backgroundColor: outline ? 'transparent' : bg,
        border: outline ? `3px solid ${bg}` : 'none',
        color: outline ? colors.text : fg,
        fontFamily: outline ? bodyFont : titleFont,
        fontWeight: outline ? 600 : 800,
        fontSize: size,
        lineHeight: 1.05,
        whiteSpace: 'nowrap',
        opacity: fade(frame, start, 8),
        transform: `scale(${0.7 + 0.3 * p})`,
        transformOrigin: 'left center',
        ...style,
      }}
    >
      {outline ? <span style={{width: size * 0.32, height: size * 0.32, borderRadius: 99, backgroundColor: bg}} /> : null}
      {text}
    </div>
  );
};
