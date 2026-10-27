<script lang="ts">
  import { player } from '../queue/controller';
  import Cover from './Cover.svelte';
  import Icon from './Icon.svelte';
  import { go } from './router';

  const cur = $derived($player.queue[$player.index] ?? null);
  const pct = $derived($player.duration ? ($player.position / $player.duration) * 100 : 0);
</script>

{#if cur}
  <div class="mini">
    <div class="progress" style:width="{pct}%"></div>
    <button class="open" onclick={() => go('lecteur')} aria-label="Ouvrir le lecteur">
      <Cover track={cur} size={40} />
      <span class="text">
        <span class="title">{cur.title}</span>
        <span class="sub">{'artist' in cur && cur.artist ? cur.artist : cur.source === 'local' ? 'Fichier local' : ''}</span>
      </span>
    </button>
    <button class="icon" onclick={() => player.toggle()} aria-label={$player.playing ? 'Pause' : 'Lecture'}>
      <Icon name={$player.playing ? 'pause' : 'play'} size={30} />
    </button>
    <button class="icon" onclick={() => player.next()} aria-label="Suivant">
      <Icon name="next" />
    </button>
  </div>
{/if}

<style>
  .mini {
    position: relative; display: flex; align-items: center; gap: 4px;
    padding: 6px 8px 6px 10px; background: var(--surface-2); border-top: 1px solid var(--line);
  }
  .progress { position: absolute; left: 0; top: -1px; height: 2px; background: var(--accent); }
  .open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: none; border: 0; color: inherit; text-align: left; padding: 0; }
  .text { min-width: 0; display: flex; flex-direction: column; }
  .title, .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .title { font-size: 0.9rem; }
  .sub { font-size: 0.78rem; color: var(--muted); }
</style>
