<script lang="ts">
  import type { Track } from '../types';
  import Icon from './Icon.svelte';

  let { track, size = 48 }: { track: Track | null; size?: number } = $props();

  // Teinte stable dérivée du titre, pour distinguer les morceaux sans pochette.
  const hue = $derived.by(() => {
    let h = 0;
    for (const c of track?.title ?? '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 360;
  });
  const art = $derived(track && 'artworkUrl' in track ? track.artworkUrl : undefined);
</script>

<div class="cover" style:width="{size}px" style:height="{size}px" style:--h={hue}>
  {#if art}
    <img src={art} alt="" />
  {:else}
    <Icon name="note" size={Math.round(size * 0.45)} />
  {/if}
</div>

<style>
  .cover {
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 6px;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.85);
    background: linear-gradient(135deg, hsl(var(--h) 45% 32%), hsl(calc(var(--h) + 40) 50% 18%));
  }
  img { width: 100%; height: 100%; object-fit: cover; }
</style>
