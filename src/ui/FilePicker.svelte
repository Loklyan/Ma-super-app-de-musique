<script lang="ts">
  import Icon from './Icon.svelte';
  import { addFiles } from './stores';

  let { label = 'Ajouter des fichiers audio', primary = false }: { label?: string; primary?: boolean } = $props();
  let input: HTMLInputElement;

  async function onChange() {
    const files = Array.from(input.files ?? []);
    input.value = '';
    await addFiles(files);
  }
</script>

<button class="btn" class:primary onclick={() => input.click()}><Icon name="add" size={20} /> {label}</button>
<input bind:this={input} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.flac,.wav" multiple hidden onchange={onChange} />
