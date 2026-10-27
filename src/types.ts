export type Track =
  | { id: string; source: 'drive'; driveFileId: string; title: string; artist?: string; album?: string; artworkUrl?: string; durationSec?: number }
  | { id: string; source: 'local'; handleOrFileKey: string; title: string; artist?: string; album?: string; artworkUrl?: string; durationSec?: number }
  | { id: string; source: 'youtube'; videoId: string; title: string; durationSec?: number };

export type SourceId = Track['source'];

export type PlaybackErrorKind = 'unsupported' | 'network' | 'decode' | 'missing' | 'blocked' | 'unknown';

export class PlaybackError extends Error {
  constructor(
    readonly kind: PlaybackErrorKind,
    message: string,
    readonly track?: Track
  ) {
    super(message);
    this.name = 'PlaybackError';
  }
}
