<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Track } from '../types';
  import Cover from './Cover.svelte';
  import { formatTime } from './format';

  let { track, active = false, disabled = false, onclick, actions }: {
    track: Track;
    active?: boolean;
    disabled?: boolean;
    onclick: () => void;
    actions?: Snippet;
  } = $props();

  const sub = $derived([
    'artist' in track ? track.artist : undefined,
    track.source === 'local' ? 'Fichier local' : track.source === 'drive' ? 'Drive' : 'YouTube'
  ].filter(Boolean).join(' · '));
</script>

<li class="row" class:active class:disabled>
  <button class="main" {onclick}>
    <Cover {track} size={48} />
    <span class="text">
      <span class="title">{track.title}</span>
      <span class="sub">{disabled ? 'Non lisible · ' : ''}{sub}</span>
    </span>
    <span class="dur">{formatTime(track.durationSec)}</span>
  </button>
  {#if actions}<span class="actions">{@render actions()}</span>{/if}
</li>

<style>
  .row { display: flex; align-items: center; gap: 4px; list-style: none; }
  .main {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px;
    padding: 8px 0; background: none; border: 0; color: inherit; text-align: left;
  }
  .text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .title, .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .title { font-size: 0.95rem; }
  .sub, .dur { color: var(--muted); font-size: 0.8rem; }
  .active .title { color: var(--accent); }
  .disabled { opacity: 0.45; }
  .actions { display: flex; }
</style>
