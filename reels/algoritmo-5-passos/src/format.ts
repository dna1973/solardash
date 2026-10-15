import {createContext, useContext} from 'react';

// cada formato define o quadro e a área útil.
// reels: 1080x1920, nada importante nos 250 px do topo nem nos 420 px de baixo.
// youtube: 1920x1080, margem de título (~5%) e faixa de legenda embaixo.
export type Format = {
  id: 'reels' | 'youtube';
  horizontal: boolean;
  width: number;
  height: number;
  top: number;
  side: number;
  captionHeight: number;
  captionFont: number;
  contentBottom: number;
};

const make = (f: Omit<Format, 'contentBottom'> & {bottom: number}): Format => {
  const {bottom, ...rest} = f;
  return {...rest, contentBottom: f.height - bottom - f.captionHeight};
};

export const REELS = make({
  id: 'reels',
  horizontal: false,
  width: 1080,
  height: 1920,
  top: 250,
  bottom: 420,
  side: 80,
  captionHeight: 170,
  captionFont: 76,
});

export const YOUTUBE = make({
  id: 'youtube',
  horizontal: true,
  width: 1920,
  height: 1080,
  top: 90,
  bottom: 40,
  side: 140,
  captionHeight: 150,
  captionFont: 58,
});

export const FormatContext = createContext<Format>(REELS);
export const useFormat = () => useContext(FormatContext);
