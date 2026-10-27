import type { PlaybackError, Track } from '../types';

export interface Provider {
  readonly id: 'drive' | 'local' | 'youtube';
  readonly playsInBackground: boolean;
  play(track: Track): Promise<void>;
  pause(): void;
  resume(): void;
  seek(sec: number): void;
  preload?(track: Track): Promise<void>;
  onEnded(cb: () => void): void;
  onError(cb: (e: PlaybackError) => void): void;
}
