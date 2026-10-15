import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Video, type VideoProps} from './Video';
import {Background} from './components/Scene';
import {Gancho} from './scenes/Gancho';
import {buildLayout, SceneContext, timings, totalFrames} from './timing';
import {FPS, HEIGHT, WIDTH} from './theme';

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

const Capa: React.FC = () => (
  <>
    <Background />
    <SceneContext.Provider value={capaSlot}>
      <Gancho />
    </SceneContext.Provider>
  </>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Algoritmo5Passos"
      component={Video}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={totalFrames(defaultLayout)}
      defaultProps={{layout: defaultLayout, timings, hasNarration: false, hasMusic: false} satisfies VideoProps}
      calculateMetadata={async ({props}) => {
        const [hasNarration, hasMusic] = await Promise.all([exists('narracao.mp3'), exists('musica.mp3')]);
        const layout = buildLayout(FPS, timings);
        return {
          durationInFrames: totalFrames(layout),
          props: {...props, layout, timings, hasNarration, hasMusic},
        };
      }}
    />
    <Composition id="Capa" component={Capa} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={capaSlot.durationInFrames} />
  </>
);
