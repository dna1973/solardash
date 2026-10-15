import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
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

// PRF Design System v1.0 (github.com/daniel-nunes-avila/prf-design-system, tokens.css)
// fundo em Azul PRF, Amarelo PRF só como destaque, texto branco.
export const colors = {
  bg: '#000D4B', //       --prf-azul
  surface: '#0A1656', //  --azul-20
  surface2: '#19245F', // --azul-30
  deep: '#000935', //     --azul-10
  text: '#FFFFFF', //     --prf-branco
  yellow: '#FFC900', //   --prf-amarelo
  green: '#1F7A3A', //    --status-success
  red: '#B32020', //      --status-danger
  amber: '#B26B00', //    --status-warning
  gray: '#B5BBD3', //     --azul-80 (texto de apoio sobre azul)
  ink: '#000D4B', //      texto e borda sobre amarelo ou branco
  sheet: '#FFFFFF',
  sheetAlt: '#F1F2F8', // --azul-95
  sheetLine: '#DCDFEC', // --azul-90
};

export const chipColors: Record<ChipColor, string> = {
  red: colors.red,
  amber: colors.amber,
  yellow: colors.yellow,
  green: colors.green,
};

// contraste wcag: azul sobre amarelo, branco sobre as cores de status
export const chipText: Record<ChipColor, string> = {
  red: colors.text,
  amber: colors.text,
  yellow: colors.ink,
  green: colors.text,
};

// fira sans, família oficial do miv (arquivos locais em public/fonts, licença ofl)
export const titleFont = 'Fira Sans';
export const bodyFont = 'Fira Sans';

const weights = [
  ['400', 'FiraSans-Regular.ttf'],
  ['600', 'FiraSans-SemiBold.ttf'],
  ['800', 'FiraSans-ExtraBold.ttf'],
] as const;

for (const [weight, file] of weights) {
  loadFont({family: 'Fira Sans', url: staticFile(`fonts/${file}`), weight, format: 'truetype'});
}
