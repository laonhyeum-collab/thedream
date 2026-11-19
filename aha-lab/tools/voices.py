"""Render character voice samples with MeloTTS, then give each character its own colour with ffmpeg."""
import os, subprocess, sys
from melo.api import TTS

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

LINES = {
    "KR": {
        "numi":  "안녕! 나는 누미야. 구 단은 손가락으로 풀 수 있대. 같이 해 볼까? 규칙을 찾았다!",
        "bitty": "안녕, 나는 비티! 라면 끓이기도 알고리즘이야. 물 붓고, 끓이고, 면 넣고. 한 단계씩!",
        "airi":  "안녕, 나는 아이리야. 에이아이도 틀릴 때가 있어. 그럴듯해 보여도, 잠깐, 확인해 볼까?",
    },
    "EN": {
        "numi":  "Hi! I'm Numi. Did you know you can do the nine times table with your fingers? Found the pattern!",
        "bitty": "Hey, I'm Bitty! Making noodles is an algorithm too. Pour, boil, add noodles. Step by step!",
        "airi":  "Hello, I'm Airi. AI can make mistakes, even when it sounds sure. Wait, let's check!",
    },
}
# per character: (EN speaker, speed, pitch factor, extra ffmpeg filter)
STYLE = {
    "numi":  ("EN-US",      1.05, 1.18, ""),
    "bitty": ("EN-BR",      1.10, 1.10, ",aecho=0.8:0.6:12:0.35"),
    "airi":  ("EN-Default", 0.92, 1.06, ",aecho=0.8:0.4:60:0.2"),
}

for lang, lines in LINES.items():
    model = TTS(language=lang, device="cpu")
    spk = model.hps.data.spk2id
    sr = model.hps.data.sampling_rate
    for who, text in lines.items():
        en_spk, speed, pitch, extra = STYLE[who]
        sid = spk["KR"] if lang == "KR" else spk[en_spk]
        raw = f"{OUT}/{who}.{lang.lower()}.raw.wav"
        model.tts_to_file(text, sid, raw, speed=speed, quiet=True)
        final = f"{OUT}/{who}.{'ko' if lang == 'KR' else 'en'}.mp3"
        af = f"asetrate={int(sr*pitch)},aresample={sr},atempo={1/pitch:.4f}{extra},loudnorm=I=-16:TP=-1.5"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", af, "-b:a", "160k", final], check=True)
        os.remove(raw)
        print("ok", final)
