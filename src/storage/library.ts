import type { Track } from '../types';
import * as db from './db';

type LocalTrack = Extract<Track, { source: 'local' }>;

const AUDIO_EXT = /\.(mp3|m4a|aac|mp4|ogg|oga|opus|flac|wav|webm)$/i;

export function isAudioFile(f: File): boolean {
  return f.type.startsWith('audio/') || AUDIO_EXT.test(f.name);
}

function titleFromName(name: string): { title: string; artist?: string } {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  // Convention fréquente « Artiste - Titre »
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  return m ? { artist: m[1], title: m[2] } : { title: base };
}

/** Copie les fichiers choisis dans IndexedDB pour les retrouver au prochain lancement. */
export async function importLocalFiles(files: File[]): Promise<{ added: LocalTrack[]; skipped: string[] }> {
  const added: LocalTrack[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (!isAudioFile(f)) { skipped.push(f.name + ' (pas un fichier audio)'); continue; }
    if (f.size === 0) { skipped.push(f.name + ' (fichier vide, sans doute pas encore téléchargé sur l\'appareil)'); continue; }
    const key = crypto.randomUUID();
    const track: LocalTrack = { id: 'local:' + key, source: 'local', handleOrFileKey: key, ...titleFromName(f.name) };
    try {
      await db.put('files', f, key);
      await db.put('tracks', track);
      added.push(track);
    } catch (e) {
      skipped.push(f.name + ' (stockage plein ou refusé)');
    }
  }
  return { added, skipped };
}

export function loadTracks(): Promise<Track[]> {
  return db.getAll<Track>('tracks');
}

export function getLocalFile(key: string): Promise<Blob | undefined> {
  return db.get<Blob>('files', key);
}

export async function saveTrack(track: Track): Promise<void> {
  await db.put('tracks', track);
}

export async function removeTrack(track: Track): Promise<void> {
  await db.del('tracks', track.id);
  if (track.source === 'local') await db.del('files', track.handleOrFileKey);
}

export async function clearLocalLibrary(): Promise<void> {
  const tracks = await loadTracks();
  for (const t of tracks) if (t.source === 'local') await removeTrack(t);
}
