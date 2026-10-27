<script lang="ts">
  import { player } from '../queue/controller';
  import Icon from './Icon.svelte';
  import TrackRow from './TrackRow.svelte';
</script>

<section>
  <div class="head">
    <h1>File d'attente</h1>
    {#if $player.queue.length}
      <button class="btn" onclick={() => confirm('Vider la file d\'attente ?') && player.clearQueue()}>Vider</button>
    {/if}
  </div>
  <div class="modes">
    <button class="chip" class:on={$player.shuffle} onclick={() => player.setShuffle(!$player.shuffle)}>
      <Icon name="shuffle" size={16} /> Aléatoire
    </button>
    <button class="chip" class:on={$player.repeat !== 'off'} onclick={() => player.cycleRepeat()}>
      <Icon name={$player.repeat === 'one' ? 'repeatOne' : 'repeat'} size={16} />
      {$player.repeat === 'one' ? 'Répéter le morceau' : $player.repeat === 'all' ? 'Répéter la file' : 'Sans répétition'}
    </button>
  </div>

  {#if !$player.queue.length}
    <p class="empty">La file est vide. Lancez un morceau depuis l'accueil ou la bibliothèque.</p>
  {:else}
    <ul>
      {#each $player.queue as t, i (t.id + ':' + i)}
        <TrackRow track={t} active={i === $player.index} disabled={$player.unplayable.includes(t.id)} onclick={() => player.playAt(i)}>
          {#snippet actions()}
            {#if i !== $player.index}
              <button class="icon" aria-label="Retirer de la file" onclick={() => player.removeAt(i)}><Icon name="close" size={20} /></button>
            {/if}
          {/snippet}
        </TrackRow>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .head { display: flex; align-items: center; justify-content: space-between; }
  h1 { font-size: 1.6rem; margin: 8px 0 12px; }
  .modes { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  ul { padding: 0; margin: 0; }
  .empty { color: var(--muted); padding: 24px 0; }
</style>
