import { writable } from 'svelte/store';
import { importLocalFiles, loadTracks, removeTrack, clearLocalLibrary, saveTrack } from '../storage/library';
import { player } from '../queue/controller';
import type { Track } from '../types';

export const library = writable<Track[]>([]);
export const toast = writable<string | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function notify(msg: string): void {
  toast.set(msg);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.set(null), 4000);
}

export async function refreshLibrary(): Promise<void> {
  const tracks = await loadTracks();
  tracks.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
  library.set(tracks);
}

player.onTrackUpdate = t => {
  library.update(list => {
    if (!list.some(x => x.id === t.id)) return list;
    void saveTrack(t).catch(() => {});
    return list.map(x => (x.id === t.id ? t : x));
  });
};

export async function addFiles(files: File[]): Promise<void> {
  if (!files.length) return;
  notify(`Import de ${files.length} fichier(s)…`);
  const { added, skipped } = await importLocalFiles(files);
  await refreshLibrary();
  let msg = `${added.length} morceau(x) ajouté(s).`;
  if (skipped.length) msg += ` Ignoré(s) : ${skipped.join(', ')}`;
  notify(msg);
}

export async function deleteTrack(t: Track): Promise<void> {
  player.forget(t.id);
  await removeTrack(t);
  await refreshLibrary();
}

export async function deleteAllLocal(): Promise<void> {
  player.clearQueue();
  await clearLocalLibrary();
  await refreshLibrary();
}
