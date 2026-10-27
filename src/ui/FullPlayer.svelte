<script lang="ts">
  import { player } from '../queue/controller';
  import Cover from './Cover.svelte';
  import Icon from './Icon.svelte';
  import { formatTime } from './format';
  import { closePlayer, go } from './router';

  const cur = $derived($player.queue[$player.index] ?? null);
  let dragging = $state(false);
  let dragValue = $state(0);
  const shown = $derived(dragging ? dragValue : $player.position);

  function onInput(e: Event) {
    dragging = true;
    dragValue = Number((e.target as HTMLInputElement).value);
  }
  function onChange(e: Event) {
    player.seek(Number((e.target as HTMLInputElement).value));
    dragging = false;
  }
</script>

<div class="full" role="dialog" aria-label="Lecteur">
  <header>
    <button class="icon" onclick={closePlayer} aria-label="Réduire le lecteur"><Icon name="down" size={30} /></button>
    <span class="hdr">En cours de lecture</span>
    <button class="icon" onclick={() => go('file')} aria-label="File d'attente"><Icon name="queue" /></button>
  </header>

  {#if cur}
    <div class="art"><Cover track={cur} size={Math.min(320, window.innerWidth - 64)} /></div>

    <div class="meta">
      <h1>{cur.title}</h1>
      <p>{'artist' in cur && cur.artist ? cur.artist : cur.source === 'local' ? 'Fichier local' : cur.source}</p>
    </div>

    <div class="seek">
      <input type="range" min="0" max={$player.duration || 0} step="0.5" value={shown}
        oninput={onInput} onchange={onChange} aria-label="Position" />
      <div class="times"><span>{formatTime(shown)}</span><span>{formatTime($player.duration)}</span></div>
    </div>

    <div class="controls">
      <button class="icon" class:on={$player.shuffle} onclick={() => player.setShuffle(!$player.shuffle)}
        aria-label="Aléatoire" aria-pressed={$player.shuffle}><Icon name="shuffle" /></button>
      <button class="icon" onclick={() => player.previous()} aria-label="Précédent"><Icon name="prev" size={36} /></button>
      <button class="play" onclick={() => player.toggle()} aria-label={$player.playing ? 'Pause' : 'Lecture'}>
        <Icon name={$player.playing ? 'pause' : 'play'} size={40} />
      </button>
      <button class="icon" onclick={() => player.next()} aria-label="Suivant"><Icon name="next" size={36} /></button>
      <button class="icon" class:on={$player.repeat !== 'off'} onclick={() => player.cycleRepeat()}
        aria-label={$player.repeat === 'one' ? 'Répéter le morceau' : $player.repeat === 'all' ? 'Répéter la file' : 'Répétition désactivée'}>
        <Icon name={$player.repeat === 'one' ? 'repeatOne' : 'repeat'} />
      </button>
    </div>
  {:else}
    <p class="empty">Rien en cours de lecture.</p>
  {/if}
</div>

<style>
  .full {
    position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column;
    padding: env(safe-area-inset-top) 16px calc(24px + env(safe-area-inset-bottom));
    background: linear-gradient(180deg, #2a2a2a 0%, var(--bg) 60%); overflow-y: auto;
  }
  header { display: flex; align-items: center; justify-content: space-between; height: 56px; }
  .hdr { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .art { display: flex; justify-content: center; margin: 24px 0; }
  .art :global(.cover) { border-radius: 10px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); }
  .meta { text-align: center; margin-bottom: 16px; }
  h1 { font-size: 1.35rem; margin: 0 0 4px; }
  .meta p { margin: 0; color: var(--muted); }
  .seek input { width: 100%; accent-color: var(--fg); }
  .times { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--muted); }
  .controls { display: flex; align-items: center; justify-content: space-around; margin-top: 16px; }
  .play { width: 72px; height: 72px; border-radius: 50%; border: 0; background: var(--fg); color: #000; display: grid; place-items: center; }
  .on { color: var(--accent); }
  .empty { text-align: center; color: var(--muted); margin-top: 30vh; }
</style>
