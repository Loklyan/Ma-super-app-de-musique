<script lang="ts">
  import { player } from '../queue/controller';
  import FilePicker from './FilePicker.svelte';
  import Icon from './Icon.svelte';
  import { go } from './router';
  import { library } from './stores';
  import TrackRow from './TrackRow.svelte';

  const recent = $derived($library.slice(0, 6));

  function playAll(shuffle: boolean) {
    player.setShuffle(shuffle);
    player.playList($library, shuffle ? -1 : 0);
  }
</script>

<section>
  <h1>Bonjour</h1>
  {#if $library.length}
    <div class="actions">
      <button class="btn primary" onclick={() => playAll(true)}><Icon name="shuffle" size={20} /> Lecture aléatoire</button>
      <button class="btn" onclick={() => playAll(false)}><Icon name="play" size={20} /> Tout lire</button>
    </div>
    <h2>Votre musique</h2>
    <ul>
      {#each recent as t, i (t.id)}
        <TrackRow track={t} active={$player.queue[$player.index]?.id === t.id} onclick={() => player.playList($library, $library.indexOf(t))} />
      {/each}
    </ul>
    {#if $library.length > recent.length}
      <button class="link" onclick={() => go('bibliotheque')}>Voir les {$library.length} morceaux</button>
    {/if}
  {:else}
    <div class="empty">
      <p>Votre bibliothèque est vide. Ajoutez des fichiers audio de cet appareil pour commencer.</p>
      <FilePicker primary />
      <p class="hint">Google Drive et YouTube arriveront dans les prochaines étapes.</p>
    </div>
  {/if}
</section>

<style>
  h1 { font-size: 1.6rem; margin: 8px 0 16px; }
  h2 { font-size: 1.1rem; margin: 24px 0 4px; }
  ul { padding: 0; margin: 0; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .empty { text-align: center; padding: 40px 8px; color: var(--muted); }
  .hint { font-size: 0.8rem; margin-top: 24px; }
  .link { background: none; border: 0; color: var(--muted); padding: 12px 0; text-decoration: underline; }
</style>
