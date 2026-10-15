import {loadFont as loadCondensed} from '@remotion/google-fonts/BarlowCondensed';
import {loadFont as loadBarlow} from '@remotion/google-fonts/Barlow';
import type {ChipColor} from './scenes';

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// área segura do reels: nada importante nos 250 px do topo nem nos 420 px de baixo
export const SAFE_TOP = 250;
export const SAFE_BOTTOM = 420;
export const SIDE = 80;
// faixa reservada para a legenda karaokê, logo acima da margem de baixo
export const CAPTION_HEIGHT = 170;
export const CONTENT_BOTTOM = HEIGHT - SAFE_BOTTOM - CAPTION_HEIGHT;

export const colors = {
  bg: '#14171C',
  surface: '#1D2128',
  surface2: '#252A32',
  text: '#F2F0EA',
  yellow: '#FFC72C',
  green: '#3BB273',
  red: '#E5484D',
  amber: '#F59E0B',
  gray: '#8A94A3',
  black: '#0B0C0E',
};

export const chipColors: Record<ChipColor, string> = {
  red: colors.red,
  amber: colors.amber,
  yellow: colors.yellow,
  green: colors.green,
};

export const {fontFamily: titleFont} = loadCondensed('normal', {
  weights: ['800'],
  subsets: ['latin'],
});

export const {fontFamily: bodyFont} = loadBarlow('normal', {
  weights: ['400', '600'],
  subsets: ['latin'],
});
