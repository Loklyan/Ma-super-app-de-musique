import { getLocalFile } from '../storage/library';
import { PlaybackError, type Track } from '../types';
import { audio, mediaError, playBlob } from './audioElement';
import type { Provider } from './types';

export class LocalProvider implements Provider {
  readonly id = 'local' as const;
  readonly playsInBackground = true;
  private endedCbs: (() => void)[] = [];
  private errorCbs: ((e: PlaybackError) => void)[] = [];
  private active = false;

  constructor() {
    audio.addEventListener('ended', () => { if (this.active) this.endedCbs.forEach(cb => cb()); });
    audio.addEventListener('error', () => {
      // Une source vide (après un changement de fournisseur) déclenche aussi « error » : on l'ignore.
      if (this.active && audio.src) this.errorCbs.forEach(cb => cb(mediaError()));
    });
  }

  async play(track: Track): Promise<void> {
    if (track.source !== 'local') throw new PlaybackError('unknown', 'Piste non locale', track);
    this.active = true;
    const blob = await getLocalFile(track.handleOrFileKey);
    if (!blob) throw new PlaybackError('missing', 'Fichier introuvable dans la bibliothèque locale.', track);
    await playBlob(blob);
  }

  /** Appelé par le contrôleur quand un autre fournisseur prend la main. */
  deactivate(): void {
    this.active = false;
  }

  pause(): void { audio.pause(); }
  resume(): void { void audio.play().catch(() => {}); }
  seek(sec: number): void { if (Number.isFinite(sec)) audio.currentTime = Math.max(0, sec); }
  onEnded(cb: () => void): void { this.endedCbs.push(cb); }
  onError(cb: (e: PlaybackError) => void): void { this.errorCbs.push(cb); }
}
