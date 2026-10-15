#!/usr/bin/env python3
"""alinha a narração (public/narracao.mp3) ao roteiro de src/scenes.ts.

transcreve com faster-whisper (modelo small, word_timestamps=True), casa as
palavras transcritas com as palavras do roteiro e grava src/timings.json com:
  - o início de cada cena (segundos)
  - cada palavra do roteiro com início e fim (para legenda e cues)

uso:  python3 scripts/align.py [--audio public/narracao.mp3] [--model small]
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCENES_TS = ROOT / "src" / "scenes.ts"
OUT = ROOT / "src" / "timings.json"

# antecipa um pouco o corte da cena em relação à primeira palavra
SCENE_LEAD = 0.2

NUMBERS = {
    "0": "zero", "1": "um", "2": "dois", "3": "tres", "4": "quatro", "5": "cinco",
    "6": "seis", "7": "sete", "8": "oito", "9": "nove", "10": "dez",
}
# mesmas equivalências de src/timing.ts
ALIASES = {"para": "pra", "esta": "ta", "uma": "um"}


def normalize(word: str) -> str:
    w = unicodedata.normalize("NFD", word.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    w = re.sub(r"[^a-z0-9]", "", w)
    w = NUMBERS.get(w, w)
    return ALIASES.get(w, w)


def read_scenes() -> list[tuple[str, str]]:
    src = SCENES_TS.read_text(encoding="utf-8")
    ids = re.findall(r'^\s*id:\s*"([^"]+)"', src, re.M)
    narr = re.findall(r'^\s*narration:\s*"([^"]*)"', src, re.M)
    if not ids or len(ids) != len(narr):
        sys.exit(f"não consegui ler id/narration de {SCENES_TS} ({len(ids)} ids, {len(narr)} narrações)")
    return list(zip(ids, narr))


def script_tokens(scenes: list[tuple[str, str]]):
    tokens = []  # (texto exibido, normalizado, índice da cena)
    for i, (_, text) in enumerate(scenes):
        for raw in text.split():
            n = normalize(raw)
            if n:
                tokens.append((raw, n, i))
    return tokens


def transcribe(audio: Path, model_name: str):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("instale antes: pip install faster-whisper")
    model = WhisperModel(model_name, device="auto", compute_type="int8")
    segments, info = model.transcribe(str(audio), language="pt", word_timestamps=True, vad_filter=True)
    words = []
    for seg in segments:
        for w in seg.words or []:
            # o whisper às vezes junta "5" com pontuação ou separa por espaço
            for part in w.word.split():
                n = normalize(part)
                if n:
                    words.append({"raw": part, "norm": n, "start": float(w.start), "end": float(w.end)})
    return words, float(info.duration)


def align(tokens, heard):
    """devolve [(start, end)] para cada token do roteiro."""
    a = [t[1] for t in tokens]
    b = [w["norm"] for w in heard]
    times: list[tuple[float, float] | None] = [None] * len(tokens)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    exact = 0
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                w = heard[j1 + k]
                times[i1 + k] = (w["start"], w["end"])
            exact += i2 - i1
        elif op == "replace":
            # espalha as palavras do roteiro no intervalo que o whisper ouviu ali
            s, e = heard[j1]["start"], heard[j2 - 1]["end"]
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
        # "delete" (roteiro sem fala) fica para a interpolação; "insert" é ignorado

    # preenche buracos interpolando entre vizinhos conhecidos
    known = [i for i, t in enumerate(times) if t is not None]
    if not known:
        sys.exit("nenhuma palavra do roteiro foi reconhecida no áudio")
    for i, t in enumerate(times):
        if t is not None:
            continue
        prev = max((k for k in known if k < i), default=None)
        nxt = min((k for k in known if k > i), default=None)
        if prev is None:
            times[i] = (times[nxt][0], times[nxt][0])
        elif nxt is None:
            times[i] = (times[prev][1], times[prev][1])
        else:
            s, e = times[prev][1], times[nxt][0]
            frac = (i - prev) / (nxt - prev)
            times[i] = (s + (e - s) * frac, s + (e - s) * frac)
    return times, exact


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", default=str(ROOT / "public" / "narracao.mp3"))
    ap.add_argument("--model", default="small")
    args = ap.parse_args()

    audio = Path(args.audio)
    if not audio.exists():
        sys.exit(f"áudio não encontrado: {audio}")

    scenes = read_scenes()
    tokens = script_tokens(scenes)
    print(f"transcrevendo {audio.name} com faster-whisper ({args.model})...")
    heard, duration = transcribe(audio, args.model)
    print(f"{len(heard)} palavras ouvidas, {len(tokens)} no roteiro")

    times, matched = align(tokens, heard)

    starts = []
    for i, (sid, _) in enumerate(scenes):
        first = next((k for k, t in enumerate(tokens) if t[2] == i), None)
        start = 0.0 if i == 0 or first is None else max(0.0, times[first][0] - SCENE_LEAD)
        if starts and start <= starts[-1]["start"]:
            start = starts[-1]["start"] + 0.5
        starts.append({"id": sid, "start": round(start, 3)})

    words = [
        {"text": raw, "start": round(s, 3), "end": round(max(e, s + 0.05), 3)}
        for (raw, _, _), (s, e) in zip(tokens, times)
    ]

    OUT.write_text(
        json.dumps({"audio": audio.name, "duration": round(duration, 3), "scenes": starts, "words": words},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"palavras idênticas ao roteiro: {matched}/{len(tokens)} ({matched / len(tokens):.0%}); o resto foi interpolado")
    for s in starts:
        print(f"  {s['id']:<10} {s['start']:6.2f}s")
    print(f"gravado {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
