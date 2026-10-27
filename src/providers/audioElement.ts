import { PlaybackError, type PlaybackErrorKind } from '../types';

/**
 * L'UNIQUE élément <audio> de l'application, partagé par Drive et local.
 * On ne change que `src` : iOS et Android refusent de démarrer un nouvel
 * élément audio depuis l'arrière-plan.
 */
export const audio: HTMLAudioElement = (() => {
  const el = document.createElement('audio');
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  document.body.appendChild(el);
  return el;
})();

let currentUrl: string | null = null;

/** Remplace la source par un Blob et lance la lecture. */
export async function playBlob(blob: Blob): Promise<void> {
  const type = blob.type;
  if (type && audio.canPlayType(type) === '') {
    throw new PlaybackError('unsupported', `Format non pris en charge par ce navigateur (${type}).`);
  }
  const url = URL.createObjectURL(blob);
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = url;
  audio.src = url;
  try {
    await audio.play();
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError') throw new PlaybackError('blocked', 'Le navigateur a refusé de lancer la lecture sans geste de votre part.');
    if (name === 'AbortError') return; // une autre source a remplacé celle-ci entre-temps
    throw mediaError();
  }
}

/** Traduit audio.error en PlaybackError lisible. */
export function mediaError(): PlaybackError {
  const code = audio.error?.code;
  const map: Record<number, [PlaybackErrorKind, string]> = {
    1: ['unknown', 'Lecture interrompue.'],
    2: ['network', 'Erreur réseau pendant la lecture.'],
    3: ['decode', 'Fichier illisible (décodage impossible).'],
    4: ['unsupported', 'Format non pris en charge par ce navigateur.']
  };
  const [kind, msg] = (code && map[code]) || ['unknown', 'Erreur de lecture inconnue.'];
  return new PlaybackError(kind, msg);
}
