<script lang="ts">
  import Icon from './Icon.svelte';
  import { addFiles } from './stores';

  let { label = 'Ajouter des fichiers audio', primary = false }: { label?: string; primary?: boolean } = $props();
  let input: HTMLInputElement;

  // Sur iPhone/iPad, le filtre « accept » grise des MP3 valides selon leur provenance
  // (Fichiers, iCloud, Drive…) : on n'en met pas, et on trie nous-mêmes à l'import.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const accept = isIOS ? undefined : 'audio/*,.mp3,.m4a,.aac,.ogg,.opus,.flac,.wav';

  async function onChange() {
    const files = Array.from(input.files ?? []);
    input.value = '';
    await addFiles(files);
  }
</script>

<button class="btn" class:primary onclick={() => input.click()}><Icon name="add" size={20} /> {label}</button>
<input bind:this={input} type="file" {accept} multiple hidden onchange={onChange} />
