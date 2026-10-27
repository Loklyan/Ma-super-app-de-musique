import { audio } from '../providers/audioElement';
import { LocalProvider } from '../providers/local';
import type { Provider } from '../providers/types';
import * as db from '../storage/db';
import { PlaybackError, type SourceId, type Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  queue: Track[];
  index: number; // -1 : rien de sélectionné
  playing: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Pistes marquées non lisibles pendant la session. */
  unplayable: string[];
  /** Dernier message à afficher (erreur ou info). */
  message: string | null;
}

type Listener = (s: PlayerState) => void;

const ARTWORK = [{ src: import.meta.env.BASE_URL + 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }];

/**
 * Seul point qui connaît la file d'attente. Le passage au morceau suivant est
 * TOUJOURS déclenché par l'événement « ended » du lecteur, jamais par un minuteur.
 */
export class PlaybackController {
  private state: PlayerState = {
    queue: [], index: -1, playing: false, position: 0, duration: 0,
    shuffle: false, repeat: 'off', unplayable: [], message: null
  };
  private listeners = new Set<Listener>();
  private providers: Partial<Record<SourceId, Provider>> = {};
  private local = new LocalProvider();
  /** Identifiants des pistes jouées avant la courante (pour « précédent »). */
  private history: string[] = [];
  /** Pistes déjà tirées dans le cycle aléatoire en cours. */
  private playedInCycle = new Set<string>();
  private consecutiveErrors = 0;
  private playToken = 0;
  /** Prévenu quand une piste gagne une information (durée…), pour l'enregistrer. */
  onTrackUpdate: ((t: Track) => void) | null = null;

  constructor() {
    this.providers.local = this.local;
    for (const p of Object.values(this.providers)) {
      p.onEnded(() => this.next(true));
      p.onError(e => this.handleError(e));
    }
    this.bindAudioEvents();
    this.bindMediaSession();
  }

  // ---------- Contrat « store » de Svelte ----------
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(fn => fn(this.state));
  }

  get current(): Track | null {
    return this.state.queue[this.state.index] ?? null;
  }

  // ---------- Persistance ----------
  async restore(): Promise<void> {
    const saved = await db.get<{ queue: Track[]; index: number; shuffle: boolean; repeat: RepeatMode }>('settings', 'player');
    if (!saved) return;
    this.set({
      queue: saved.queue ?? [],
      index: Math.min(saved.index ?? -1, (saved.queue?.length ?? 0) - 1),
      shuffle: !!saved.shuffle,
      repeat: saved.repeat ?? 'off'
    });
    this.updateMetadata();
  }

  private persist(): void {
    const { queue, index, shuffle, repeat } = this.state;
    void db.put('settings', { queue, index, shuffle, repeat }, 'player').catch(() => {});
  }

  // ---------- File d'attente ----------
  /** Remplace la file et lance la lecture (à appeler depuis un geste utilisateur). */
  playList(tracks: Track[], startIndex = 0): void {
    this.history = [];
    this.playedInCycle.clear();
    this.set({ queue: [...tracks], unplayable: [], message: null });
    let start = startIndex;
    if (this.state.shuffle && startIndex < 0) start = Math.floor(Math.random() * tracks.length);
    void this.playAt(Math.max(0, start));
  }

  enqueue(track: Track): void {
    this.set({ queue: [...this.state.queue, track], message: `Ajouté à la file : ${track.title}` });
    this.persist();
  }

  playNext(track: Track): void {
    const q = [...this.state.queue];
    q.splice(this.state.index + 1, 0, track);
    this.set({ queue: q, message: `Lu ensuite : ${track.title}` });
    this.persist();
  }

  removeAt(i: number): void {
    if (i === this.state.index) return; // on ne retire pas la piste en cours
    const q = [...this.state.queue];
    const [removed] = q.splice(i, 1);
    this.history = this.history.filter(id => id !== removed.id);
    this.set({ queue: q, index: i < this.state.index ? this.state.index - 1 : this.state.index });
    this.persist();
  }

  /** À appeler quand une piste disparaît de la bibliothèque. */
  forget(trackId: string): void {
    const cur = this.current;
    if (cur?.id === trackId) this.stop();
    const q = this.state.queue.filter(t => t.id !== trackId);
    this.set({ queue: q, index: cur && cur.id !== trackId ? q.findIndex(t => t.id === cur.id) : -1 });
    this.persist();
  }

  clearQueue(): void {
    this.stop();
    this.history = [];
    this.playedInCycle.clear();
    this.set({ queue: [], index: -1 });
    this.persist();
  }

  // ---------- Commandes ----------
  async playAt(i: number, fromHistory = false): Promise<void> {
    const track = this.state.queue[i];
    if (!track) return;
    const prev = this.current;
    if (!fromHistory && prev && prev.id !== track.id) this.history.push(prev.id);
    if (this.history.length > 200) this.history.shift();
    this.playedInCycle.add(track.id);

    const provider = this.providers[track.source];
    const token = ++this.playToken;
    this.set({ index: i, position: 0, duration: track.durationSec ?? 0 });
    this.persist();
    this.updateMetadata();

    if (!provider) {
      this.handleError(new PlaybackError('unsupported', 'Cette source n\'est pas encore disponible.', track));
      return;
    }
    try {
      await provider.play(track);
      if (token !== this.playToken) return;
      this.consecutiveErrors = 0;
    } catch (e) {
      if (token !== this.playToken) return;
      this.handleError(e instanceof PlaybackError ? e : new PlaybackError('unknown', String(e), track));
    }
  }

  toggle(): void {
    if (this.state.playing) this.pause();
    else this.resume();
  }

  pause(): void {
    this.providerOf(this.current)?.pause();
  }

  resume(): void {
    const cur = this.current;
    if (!cur) { if (this.state.queue.length) void this.playAt(0); return; }
    // Après un rechargement, la source n'est pas encore chargée.
    if (cur.source !== 'youtube' && !audio.src) { void this.playAt(this.state.index, true); return; }
    this.providerOf(cur)?.resume();
  }

  seek(sec: number): void {
    this.providerOf(this.current)?.seek(sec);
  }

  stop(): void {
    this.playToken++;
    this.local.deactivate();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    this.set({ playing: false, position: 0 });
  }

  /** Piste suivante. `auto` : déclenché par la fin du morceau. */
  next(auto = false): void {
    const { repeat } = this.state;
    if (auto && repeat === 'one' && this.current) { void this.playAt(this.state.index, true); return; }
    const i = this.pickNext(auto);
    if (i === -1) {
      this.stop();
      if (auto) this.set({ message: 'Fin de la file d\'attente.' });
      return;
    }
    void this.playAt(i);
  }

  previous(): void {
    if (this.state.position > 3) { this.seek(0); return; }
    while (this.history.length) {
      const id = this.history.pop()!;
      const i = this.state.queue.findIndex(t => t.id === id);
      if (i !== -1) { void this.playAt(i, true); return; }
    }
    if (this.state.index > 0) void this.playAt(this.state.index - 1, true);
    else this.seek(0);
  }

  setShuffle(on: boolean): void {
    this.playedInCycle.clear();
    if (this.current) this.playedInCycle.add(this.current.id);
    this.set({ shuffle: on });
    this.persist();
  }

  cycleRepeat(): void {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    this.set({ repeat: order[(order.indexOf(this.state.repeat) + 1) % order.length] });
    this.persist();
  }

  dismissMessage(): void {
    this.set({ message: null });
  }

  // ---------- Choix du morceau suivant ----------
  private isPlayable(t: Track): boolean {
    return !this.state.unplayable.includes(t.id) && !!this.providers[t.source];
  }

  private pickNext(auto: boolean): number {
    const { queue, index, shuffle, repeat } = this.state;
    if (!queue.length) return -1;
    const wrap = repeat !== 'off' || !auto;

    if (shuffle) {
      const candidates = (excludePlayed: boolean) => queue
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => i !== index && this.isPlayable(t) && !(excludePlayed && this.playedInCycle.has(t.id)));
      let pool = candidates(true);
      if (!pool.length && wrap) {
        // Cycle épuisé : on remélange (sans rejouer immédiatement la piste courante).
        this.playedInCycle.clear();
        pool = candidates(false);
      }
      if (!pool.length) return -1;
      return pool[Math.floor(Math.random() * pool.length)].i;
    }

    for (let step = 1; step <= queue.length; step++) {
      const raw = index + step;
      if (raw >= queue.length && !wrap) return -1;
      const i = raw % queue.length;
      if (i === index) break;
      if (this.isPlayable(queue[i])) return i;
    }
    return -1;
  }

  private handleError(e: PlaybackError): void {
    const track = e.track ?? this.current;
    const name = track ? `« ${track.title} » : ` : '';
    // Lecture refusée sans geste : la piste n'est pas en cause, on attend l'utilisateur.
    if (e.kind === 'blocked') {
      this.set({ playing: false, message: name + e.message + ' Appuyez sur Lecture.' });
      return;
    }
    this.consecutiveErrors++;
    const unplayable = track && !this.state.unplayable.includes(track.id)
      ? [...this.state.unplayable, track.id] : this.state.unplayable;
    this.set({ unplayable, message: name + e.message + ' Passage au morceau suivant.' });
    // Ne jamais boucler : si toute la file échoue, on s'arrête.
    if (this.consecutiveErrors >= this.state.queue.length) {
      this.stop();
      this.set({ message: 'Aucun morceau de la file n\'a pu être lu.' });
      this.consecutiveErrors = 0;
      return;
    }
    this.next(true);
  }

  private providerOf(t: Track | null): Provider | undefined {
    return t ? this.providers[t.source] : undefined;
  }

  // ---------- Élément audio → état ----------
  private bindAudioEvents(): void {
    audio.addEventListener('playing', () => { this.set({ playing: true }); this.updatePositionState(); });
    audio.addEventListener('pause', () => { this.set({ playing: false }); this.updatePositionState(); });
    audio.addEventListener('durationchange', () => {
      const d = audio.duration;
      if (!Number.isFinite(d)) return;
      this.set({ duration: d });
      this.updatePositionState();
      // Mémorise la durée découverte pour l'afficher dans la bibliothèque.
      const cur = this.current;
      if (cur && cur.source !== 'youtube' && !cur.durationSec) {
        const updated = { ...cur, durationSec: Math.round(d) };
        this.set({ queue: this.state.queue.map(t => (t.id === cur.id ? updated : t)) });
        this.onTrackUpdate?.(updated);
      }
    });
    let last = 0;
    audio.addEventListener('timeupdate', () => {
      // Limite les rafraîchissements de l'interface à ~4 par seconde.
      const now = performance.now();
      if (now - last < 250) return;
      last = now;
      this.set({ position: audio.currentTime });
    });
    audio.addEventListener('seeked', () => { this.set({ position: audio.currentTime }); this.updatePositionState(); });
  }

  // ---------- Media Session (écran de verrouillage) ----------
  private bindMediaSession(): void {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => this.resume()],
      ['pause', () => this.pause()],
      ['nexttrack', () => this.next()],
      ['previoustrack', () => this.previous()],
      ['seekto', d => { if (d.seekTime != null) this.seek(d.seekTime); }],
      ['seekbackward', d => this.seek(this.state.position - (d.seekOffset ?? 10))],
      ['seekforward', d => this.seek(this.state.position + (d.seekOffset ?? 10))],
      ['stop', () => this.stop()]
    ];
    for (const [action, h] of handlers) {
      try { ms.setActionHandler(action, h); } catch { /* action non prise en charge */ }
    }
  }

  private updateMetadata(): void {
    if (!('mediaSession' in navigator)) return;
    const t = this.current;
    if (!t) { navigator.mediaSession.metadata = null; return; }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: 'artist' in t ? t.artist ?? '' : 'YouTube',
      album: 'album' in t ? t.album ?? '' : '',
      artwork: 'artworkUrl' in t && t.artworkUrl ? [{ src: t.artworkUrl }] : ARTWORK
    });
  }

  private updatePositionState(): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = this.state.playing ? 'playing' : 'paused';
    const d = audio.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    try {
      navigator.mediaSession.setPositionState({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: audio.playbackRate || 1 });
    } catch { /* ignoré */ }
  }
}

export const player = new PlaybackController();
