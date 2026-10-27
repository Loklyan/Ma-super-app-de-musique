export function formatTime(sec: number | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '–:––';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' Ko';
  if (n < 1024 ** 3) return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' Mo';
  return (n / 1024 ** 3).toFixed(2).replace('.', ',') + ' Go';
}
