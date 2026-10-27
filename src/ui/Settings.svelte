<script lang="ts">
  import { onMount } from 'svelte';
  import { formatBytes } from './format';
  import { deleteAllLocal, library, notify } from './stores';

  let usage = $state<string>('…');
  let persisted = $state<boolean | null>(null);
  const testUrl = import.meta.env.BASE_URL + 'tests/test-lecture.html';

  async function refresh() {
    try {
      const est = await navigator.storage?.estimate?.();
      usage = est?.usage != null ? `${formatBytes(est.usage)} utilisés sur ${formatBytes(est.quota ?? 0)} disponibles` : 'inconnu';
      persisted = (await navigator.storage?.persisted?.()) ?? null;
    } catch {
      usage = 'inconnu';
    }
  }
  onMount(refresh);

  async function askPersist() {
    const ok = await navigator.storage?.persist?.();
    notify(ok ? 'Stockage protégé contre le nettoyage automatique.' : 'Le navigateur a refusé (il peut accepter plus tard, après installation de l\'app).');
    await refresh();
  }

  async function wipe() {
    if (!confirm('Supprimer tous les fichiers locaux de l\'app ? (les fichiers d\'origine sur l\'appareil ne sont pas touchés)')) return;
    await deleteAllLocal();
    notify('Bibliothèque locale vidée.');
    await refresh();
  }
</script>

<section>
  <h1>Réglages</h1>

  <h2>Stockage</h2>
  <p>{usage}</p>
  <p>
    Stockage persistant :
    {persisted === null ? 'inconnu' : persisted ? 'oui' : 'non'}
    {#if persisted === false}<button class="btn small" onclick={askPersist}>Demander</button>{/if}
  </p>
  <button class="btn danger" disabled={!$library.some(t => t.source === 'local')} onclick={wipe}>Vider la bibliothèque locale</button>

  <h2>Bientôt</h2>
  <p class="muted">Proportion de l'aléatoire Drive / YouTube, comportement en arrière-plan, taille du cache, compte Google.</p>

  <h2>Diagnostic</h2>
  <p><a href={testUrl} target="_blank" rel="noopener">Page de test de lecture en arrière-plan</a></p>
  <p class="muted">Version {__APP_VERSION__}</p>
</section>

<style>
  h1 { font-size: 1.6rem; margin: 8px 0 12px; }
  h2 { font-size: 1rem; margin: 24px 0 6px; }
  p { margin: 6px 0; }
  .muted { color: var(--muted); font-size: 0.85rem; }
  a { color: var(--accent); }
  .small { padding: 4px 10px; margin-left: 8px; }
</style>
