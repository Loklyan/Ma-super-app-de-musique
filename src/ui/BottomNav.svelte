<script lang="ts">
  import Icon from './Icon.svelte';
  import { go, route, type Route } from './router';

  const items: { r: Route; label: string; icon: 'home' | 'library' | 'queue' }[] = [
    { r: 'accueil', label: 'Accueil', icon: 'home' },
    { r: 'bibliotheque', label: 'Bibliothèque', icon: 'library' },
    { r: 'file', label: "File d'attente", icon: 'queue' }
  ];
</script>

<nav>
  {#each items as it (it.r)}
    <button class:on={$route === it.r} onclick={() => go(it.r)} aria-current={$route === it.r ? 'page' : undefined}>
      <Icon name={it.icon} />
      <span>{it.label}</span>
    </button>
  {/each}
</nav>

<style>
  nav {
    display: flex; background: var(--surface); border-top: 1px solid var(--line);
    padding-bottom: env(safe-area-inset-bottom);
  }
  button {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 8px 0 6px; background: none; border: 0; color: var(--muted); font-size: 0.7rem;
  }
  .on { color: var(--fg); }
</style>
