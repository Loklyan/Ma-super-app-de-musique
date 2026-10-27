<script lang="ts">
  import { player } from '../queue/controller';
  import type { Track } from '../types';
  import FilePicker from './FilePicker.svelte';
  import Icon from './Icon.svelte';
  import { deleteTrack, library } from './stores';
  import TrackRow from './TrackRow.svelte';

  type Tab = 'local' | 'drive' | 'youtube' | 'playlists';
  const tabs: { id: Tab; label: string }[] = [
    { id: 'local', label: 'Local' },
    { id: 'drive', label: 'Drive' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'playlists', label: 'Playlists' }
  ];
  let tab = $state<Tab>('local');
  let menuFor = $state<string | null>(null);
  let filter = $state('');

  const locals = $derived($library.filter(t => t.source === 'local'));
  const shown = $derived.by(() => {
    const q = filter.trim().toLocaleLowerCase('fr');
    if (!q) return locals;
    return locals.filter(t => (t.title + ' ' + ('artist' in t ? t.artist ?? '' : '')).toLocaleLowerCase('fr').includes(q));
  });

  async function remove(t: Track) {
    menuFor = null;
    if (confirm(`Retirer « ${t.title} » de la bibliothèque ?`)) await deleteTrack(t);
  }
</script>

<section>
  <h1>Bibliothèque</h1>
  <div class="tabs" role="tablist">
    {#each tabs as t (t.id)}
      <button role="tab" class="chip" class:on={tab === t.id} aria-selected={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
    {/each}
  </div>

  {#if tab === 'local'}
    <div class="bar">
      <FilePicker label="Ajouter" />
      {#if locals.length}
        <button class="btn" onclick={() => player.playList(shown, 0)}><Icon name="play" size={20} /> Tout lire</button>
      {/if}
    </div>
    {#if locals.length > 8}
      <input class="search" type="search" placeholder="Rechercher un titre ou un artiste" bind:value={filter} />
    {/if}
    {#if !locals.length}
      <p class="empty">Aucun fichier local. Les fichiers ajoutés sont copiés dans l'app et restent disponibles hors connexion.</p>
    {:else}
      <ul>
        {#each shown as t, i (t.id)}
          <TrackRow track={t} active={$player.queue[$player.index]?.id === t.id}
            disabled={$player.unplayable.includes(t.id)} onclick={() => player.playList(shown, i)}>
            {#snippet actions()}
              <button class="icon" aria-label="Options" onclick={() => (menuFor = menuFor === t.id ? null : t.id)}><Icon name="more" /></button>
            {/snippet}
          </TrackRow>
          {#if menuFor === t.id}
            <li class="menu">
              <button onclick={() => { player.playNext(t); menuFor = null; }}>Lire ensuite</button>
              <button onclick={() => { player.enqueue(t); menuFor = null; }}>Ajouter à la file</button>
              <button class="danger" onclick={() => remove(t)}>Retirer</button>
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
  {:else if tab === 'drive'}
    <p class="empty">Connexion à Google Drive : étape 2.</p>
  {:else if tab === 'youtube'}
    <p class="empty">Vidéos et playlists YouTube : étape 3.</p>
  {:else}
    <p class="empty">Playlists mixtes : étape 4.</p>
  {/if}
</section>

<style>
  h1 { font-size: 1.6rem; margin: 8px 0 12px; }
  .tabs { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 12px; }
  .bar { display: flex; gap: 8px; margin-bottom: 8px; }
  .search { width: 100%; margin: 4px 0 8px; }
  ul { padding: 0; margin: 0; }
  .empty { color: var(--muted); padding: 24px 0; }
  .menu { list-style: none; display: flex; gap: 6px; flex-wrap: wrap; padding: 0 0 10px 60px; }
  .menu button { background: var(--surface-2); border: 0; color: var(--fg); padding: 8px 12px; border-radius: 16px; font-size: 0.85rem; }
  .menu .danger { color: #ff8a80; }
</style>
