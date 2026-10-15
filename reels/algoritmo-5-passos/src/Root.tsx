import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Video, type VideoProps} from './Video';
import {Background} from './components/Scene';
import {Gancho} from './scenes/Gancho';
import {buildLayout, SceneContext, timings, totalFrames} from './timing';
import {FormatContext, REELS, YOUTUBE, type Format} from './format';
import {FPS} from './theme';

const exists = async (file: string) => {
  try {
    const res = await fetch(staticFile(file), {method: 'HEAD'});
    return res.ok;
  } catch {
    return false;
  }
};

const defaultLayout = buildLayout(FPS, timings);

// capa: só a cena 1, sem legenda. o frame usado está em package.json (npm run capa)
const capaSlot = buildLayout(FPS, null)[0];

const capa = (format: Format): React.FC => () => (
  <FormatContext.Provider value={format}>
    <Background />
    <SceneContext.Provider value={capaSlot}>
      <Gancho />
    </SceneContext.Provider>
  </FormatContext.Provider>
);
const CapaReels = capa(REELS);
const CapaYoutube = capa(YOUTUBE);

const video = (id: string, format: Format) => (
  <Composition
    id={id}
    component={Video}
    width={format.width}
    height={format.height}
    fps={FPS}
    durationInFrames={totalFrames(defaultLayout)}
    defaultProps={{layout: defaultLayout, timings, hasNarration: false, hasMusic: false, format: format.id} satisfies VideoProps}
    calculateMetadata={async ({props}) => {
      const [hasNarration, hasMusic] = await Promise.all([exists('narracao.mp3'), exists('musica.mp3')]);
      const layout = buildLayout(FPS, timings);
      return {
        durationInFrames: totalFrames(layout),
        props: {...props, layout, timings, hasNarration, hasMusic},
      };
    }}
  />
);

export const RemotionRoot: React.FC = () => (
  <>
    {video('Algoritmo5Passos', REELS)}
    {video('Algoritmo5PassosYoutube', YOUTUBE)}
    <Composition id="Capa" component={CapaReels} width={REELS.width} height={REELS.height} fps={FPS} durationInFrames={capaSlot.durationInFrames} />
    <Composition id="CapaYoutube" component={CapaYoutube} width={YOUTUBE.width} height={YOUTUBE.height} fps={FPS} durationInFrames={capaSlot.durationInFrames} />
  </>
);
