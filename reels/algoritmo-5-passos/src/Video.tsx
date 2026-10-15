import React from 'react';
import {AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useVideoConfig} from 'remotion';
import type {SceneId} from './scenes';
import {SceneContext, type SceneSlot, type Timings} from './timing';
import {Background} from './components/Scene';
import {Captions} from './components/Captions';
import {Gancho} from './scenes/Gancho';
import {Barato} from './scenes/Barato';
import {Passos} from './scenes/Passos';
import {Governo} from './scenes/Governo';
import {Teste} from './scenes/Teste';
import {Decisao} from './scenes/Decisao';
import {Planilha} from './scenes/Planilha';

export const components: Record<SceneId, React.FC> = {
  gancho: Gancho,
  barato: Barato,
  passos: Passos,
  governo: Governo,
  teste: Teste,
  decisao: Decisao,
  planilha: Planilha,
};

export type VideoProps = {
  layout: SceneSlot[];
  timings: Timings | null;
  hasNarration: boolean;
  hasMusic: boolean;
};

export const Video: React.FC<VideoProps> = ({layout, timings, hasNarration, hasMusic}) => {
  const {durationInFrames, fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background />
      {layout.map((slot) => {
        const C = components[slot.id];
        return (
          <Sequence key={slot.id} from={slot.from} durationInFrames={slot.durationInFrames} name={slot.id}>
            <SceneContext.Provider value={slot}>
              <C />
            </SceneContext.Provider>
          </Sequence>
        );
      })}
      {timings ? <Captions words={timings.words} /> : null}
      {hasNarration ? <Html5Audio src={staticFile('narracao.mp3')} /> : null}
      {hasMusic ? (
        <Html5Audio
          src={staticFile('musica.mp3')}
          loop
          volume={(f) => 0.12 * interpolate(f, [0, 15, durationInFrames - fps, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      ) : null}
    </AbsoluteFill>
  );
};
