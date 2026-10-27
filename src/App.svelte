<script lang="ts">
  import { player } from './queue/controller';
  import BottomNav from './ui/BottomNav.svelte';
  import FullPlayer from './ui/FullPlayer.svelte';
  import Home from './ui/Home.svelte';
  import Icon from './ui/Icon.svelte';
  import Library from './ui/Library.svelte';
  import MiniPlayer from './ui/MiniPlayer.svelte';
  import Queue from './ui/Queue.svelte';
  import { go, route } from './ui/router';
  import Settings from './ui/Settings.svelte';
  import { notify, toast } from './ui/stores';

  // Les messages du contrôleur (erreurs de lecture…) passent par le bandeau.
  $effect(() => {
    if ($player.message) {
      notify($player.message);
      player.dismissMessage();
    }
  });
</script>

<div class="shell">
  <header class="top">
    <button class="brand" onclick={() => go('accueil')}><span class="logo"><Icon name="note" size={18} /></span> Musique</button>
    <button class="icon" onclick={() => go('reglages')} aria-label="Réglages"><Icon name="settings" /></button>
  </header>

  <main>
    {#if $route === 'bibliotheque'}
      <Library />
    {:else if $route === 'file'}
      <Queue />
    {:else if $route === 'reglages'}
      <Settings />
    {:else}
      <Home />
    {/if}
  </main>

  <footer>
    {#if $toast}<div class="toast" role="status">{$toast}</div>{/if}
    <MiniPlayer />
    <BottomNav />
  </footer>
</div>

{#if $route === 'lecteur'}
  <FullPlayer />
{/if}

<style>
  .shell { display: flex; flex-direction: column; height: 100dvh; }
  .top {
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(4px + env(safe-area-inset-top)) 8px 4px 16px;
  }
  .brand { display: flex; align-items: center; gap: 8px; background: none; border: 0; color: var(--fg); font-size: 1.15rem; font-weight: 600; padding: 0; }
  .logo { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: #fff; }
  main { flex: 1; overflow-y: auto; padding: 0 16px 16px; }
  footer { position: relative; }
  .toast {
    position: absolute; left: 12px; right: 12px; bottom: calc(100% + 8px);
    background: #323232; color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
</style>
