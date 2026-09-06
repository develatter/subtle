"""Local Whisper worker. Stdout is JSON; stderr carries progress events and logs.

The host passes the interface language in ``SUBTLE_LOCALE`` (``es`` or ``en``)
so progress stages and errors match the rest of the application.
"""
import contextlib
import json
import math
import os
from pathlib import Path
import sys

MODEL_NAME = 'small'
SCRIPT_LANGUAGE = 'es'

MESSAGES = {
    'es': {
        'invalid_time': 'El motor devolvió un tiempo no válido. Se conserva el proyecto anterior.',
        'no_audio_for_word': 'No hay suficiente audio para asignar tiempos a esta palabra.',
        'no_voice_for_words': 'Hay palabras sin voz reconocible. Revisa el guion.',
        'preparing_engine': 'Preparando el motor de voz…',
        'loading_model': 'Cargando el modelo local…',
        'downloading_model': 'Descargando el modelo de voz (primera ejecución)…',
        'aligning': 'Sincronizando el guion…',
        'transcribing': 'Transcribiendo el audio…',
        'align_failed': 'No se pudo sincronizar el guion. Comprueba que coincide con lo que se dice en el vídeo.',
        'no_speech': 'No se ha detectado voz. Comprueba la pista de audio.',
        'ready_review': 'Subtítulos preparados · {count} palabras para revisar',
        'ready': 'Subtítulos preparados',
    },
    'en': {
        'invalid_time': 'The engine returned an invalid timing. The previous project is kept.',
        'no_audio_for_word': 'There is not enough audio to assign timing to this word.',
        'no_voice_for_words': 'Some words have no recognisable speech. Review the script.',
        'preparing_engine': 'Preparing the speech engine…',
        'loading_model': 'Loading the local model…',
        'downloading_model': 'Downloading the speech model (first run)…',
        'aligning': 'Syncing the script…',
        'transcribing': 'Transcribing the audio…',
        'align_failed': 'The script could not be synced. Check that it matches what is said in the video.',
        'no_speech': 'No speech detected. Check the audio track.',
        'ready_review': 'Subtitles ready · {count} words to review',
        'ready': 'Subtitles ready',
    },
}


def message(key, **params):
    """Message in the language requested by the host, Spanish by default."""
    locale = os.environ.get('SUBTLE_LOCALE', 'es').lower().split('-')[0]
    return MESSAGES.get(locale, MESSAGES['es'])[key].format(**params)


def progress(stage, value=None):
    print('@subtle ' + json.dumps({'stage': stage, 'progress': value}, ensure_ascii=False), file=sys.stderr, flush=True)


def normalize_words(raw):
    """Keep every word. Flag interpolated intervals instead of silently deleting tokens."""
    words = []
    for item in raw:
        text = item['word'].strip()
        if not text:
            continue
        start, end = float(item['start']), float(item['end'])
        if not (math.isfinite(start) and math.isfinite(end)) or start < 0 or end < start:
            raise ValueError(message('invalid_time'))
        words.append({'word': text, 'start': start, 'end': end, 'review': False})
    for i, word in enumerate(words):
        overlap = i > 0 and word['start'] < words[i-1]['end'] - 0.001
        instant = word['end'] <= word['start']
        if not overlap and not instant:
            continue
        a, z = (i-1, i) if overlap or i == len(words)-1 else (i, i+1)
        if a < 0:
            raise ValueError(message('no_audio_for_word'))
        start = min(words[a]['start'], words[z]['start'])
        end = max(words[a]['end'], words[z]['end'])
        # Alignment can return a run of instant words, e.g. an acronym or number.
        # Include the next timed word so the entire uncertain span stays editable.
        while end <= start and z < len(words)-1:
            z += 1
            end = max(end, words[z]['end'])
        if end <= start and a > 0:
            a -= 1
            start = words[a]['start']
        if end <= start:
            raise ValueError(message('no_voice_for_words'))
        weights = [max(1, len(w['word'])) for w in words[a:z+1]]
        total = sum(weights)
        cursor = start
        for w, weight in zip(words[a:z+1], weights):
            w['start'] = round(cursor, 6)
            cursor += (end-start)*weight/total
            w['end'] = round(cursor, 6)
            w['review'] = True
        words[z]['end'] = end
    return words


def main():
    progress(message('preparing_engine'))
    import torch
    import stable_whisper
    if sys.argv[1:] == ['--check']:
        print(json.dumps({'ready': True}), flush=True)
        return
    torch.set_num_threads(max(1, min(8, (os.cpu_count() or 4) // 2)))
    source, script_path, model_dir = sys.argv[1:4]
    root = Path(model_dir)
    root.mkdir(parents=True, exist_ok=True)
    progress(message('loading_model') if (root / f'{MODEL_NAME}.pt').exists() else message('downloading_model'))
    with contextlib.redirect_stdout(sys.stderr):
        model = stable_whisper.load_model(MODEL_NAME, download_root=str(root), device='cpu')
        aligning = bool(script_path)
        stage = message('aligning') if aligning else message('transcribing')
        progress(stage, 0)
        def callback(done, total):
            progress(stage, min(99, round(done / total * 100)) if total else None)
        if aligning:
            script = Path(script_path).read_text(encoding='utf-8').strip()
            result = model.align(source, script, language=SCRIPT_LANGUAGE, verbose=None,
                                 progress_callback=callback, vad=False)
        else:
            result = model.transcribe(source, verbose=None, fp16=False,
                                      progress_callback=callback, vad=False)
    if result is None:
        raise ValueError(message('align_failed'))
    raw = [word for segment in result.to_dict()['segments'] for word in segment.get('words', [])]
    words = normalize_words(raw)
    if not words:
        raise ValueError(message('no_speech'))
    review = sum(w['review'] for w in words)
    progress(message('ready_review', count=review) if review else message('ready'), 100)
    print(json.dumps(words, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    import multiprocessing
    multiprocessing.freeze_support()
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
