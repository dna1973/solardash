# reels: o algoritmo de 5 passos

vídeo vertical 1080x1920, 30 fps, ~50 s, feito em remotion só com tipografia e formas.

visual no PRF Design System v1.0 (github.com/daniel-nunes-avila/prf-design-system): Azul PRF #000D4B de fundo, Amarelo PRF #FFC900 como destaque, Fira Sans (arquivos locais em `public/fonts`, licença OFL) e cores de status do `tokens.css`. o logotipo amarelo fica em `public/marca` e aparece no cta (`logo: false` em `scenes.ts` para tirar).

## estrutura

- `src/scenes.ts`: roteiro (id, narração, textos de tela, duração padrão e cues de cada elemento)
- `src/timings.json`: opcional, gerado por `scripts/align.py`. quando existe, as cenas seguem a fala e aparecem as legendas karaokê
- `public/narracao.mp3`: opcional, narração
- `public/musica.mp3`: opcional, trilha a 12% de volume
- `src/scenes/*.tsx`: um componente por cena, com layout vertical (reels) e horizontal (youtube)
- `src/format.ts`: tamanho do quadro, margens e faixa de legenda de cada formato

## comandos

```bash
npm install
npm run dev        # remotion studio para preview
npm run render     # out/algoritmo-5-passos.mp4 (h264, crf 18)
npm run capa       # out/capa.png a partir da cena 1
npm run render:youtube   # out/algoritmo-5-passos-youtube.mp4 (1920x1080)
npm run capa:youtube     # out/capa-youtube.png (thumbnail 1920x1080)
```

## depois de gravar a narração

```bash
cp /caminho/da/gravacao.mp3 public/narracao.mp3
python3 -m venv .venv && . .venv/bin/activate   # windows: .venv\Scripts\activate
pip install -r scripts/requirements.txt
python scripts/align.py                         # gera src/timings.json
npm run render
npm run capa
npm run render:youtube
npm run capa:youtube
```

para voltar às durações padrão, apague `src/timings.json`.
